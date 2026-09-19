-- The Commons database.
--
-- Apply once against a fresh Neon database:
--   psql "$COMMONS_DATABASE_URL" -f schema.sql
--
-- READ THIS AS A LIST OF WHAT IS NOT HERE.
--
-- COMMONS.md section 6 promises that the Commons never collects a document
-- upload, a policy number, a claim number, a date of birth, a government
-- identifier, health information, or a payment method. A promise in prose is
-- worth nothing beside a schema with a column for it, so there is no column for
-- any of them and no table for a file. A field that was never built cannot be
-- quietly filled in by a well-meaning form later.
--
-- Three things are stored about a person: an address to sign in with, a name to
-- publish under, and - for practitioners only - a licence number that is
-- checkable against a public register. A licence number is publicly checkable,
-- which is exactly why verifying a practitioner needs no identity documents.

create table if not exists accounts (
	email                    text primary key,
	-- Empty until the person sets one. An account is not a byline.
	display_name             text not null default '',
	kind                     text not null default 'reader'
	                         check (kind in ('reader', 'broker', 'adjuster', 'attorney', 'staff')),

	-- All four move together or none of them are set. A licence claim with no
	-- record of where it was checked is an unverified licence claim, and the
	-- whole value of practitioner status is that it was checked.
	license_number           text,
	license_authority        text,
	license_verified_against text,
	license_verified_on      date,
	constraint license_is_whole_or_absent check (
		(license_number is null and license_authority is null
		 and license_verified_against is null and license_verified_on is null)
		or
		(license_number is not null and license_authority is not null
		 and license_verified_against is not null and license_verified_on is not null)
	),

	created_at               timestamptz not null default now()
);

-- Pending magic links. The token that was emailed is NOT here: only its
-- SHA-256. A dump of this table therefore lets nobody sign in as anybody.
create table if not exists sign_in_tokens (
	token_hash text primary key,
	email      text not null,
	expires_at timestamptz not null
);

create index if not exists sign_in_tokens_expiry on sign_in_tokens (expires_at);

-- Issued links, for the rate limit only.
--
-- Separate from sign_in_tokens because a token row is deleted the moment the
-- link is followed. Counting token rows would reset the limit every time
-- somebody signed in, and the limit exists to stop the form being used to mail
-- a stranger repeatedly - a consumed link is still a message that was sent.
--
-- It holds an address and a timestamp and is trimmed after a day. It is not an
-- audit log and must not become one.
create table if not exists sign_in_issue_log (
	id        bigserial primary key,
	email     text not null,
	issued_at timestamptz not null default now()
);

create index if not exists sign_in_issue_log_lookup on sign_in_issue_log (email, issued_at);

-- Signed-in browsers. Again, the hash only: the cookie value is never stored.
create table if not exists sessions (
	id_hash    text primary key,
	email      text not null references accounts (email) on delete cascade,
	expires_at timestamptz not null
);

create index if not exists sessions_expiry on sessions (expires_at);

-- Professional role requests. A contributor supplies only facts that a
-- moderator can check against a public register. The account remains a reader
-- until the request is approved; a self-described role is never a badge.
create table if not exists verification_requests (
	id                       uuid primary key,
	email                    text not null references accounts (email) on delete cascade,
	kind                     text not null check (kind in ('broker', 'adjuster', 'attorney')),
	license_number           text not null,
	authority                text not null,
	register_url              text not null check (register_url ~ '^https://'),
	state                    text not null default 'pending'
	                         check (state in ('pending', 'approved', 'declined')),
	submitted_at             timestamptz not null,
	decided_at               timestamptz,
	decided_by_moderator     text,
	moderator_note           text
);

create index if not exists verification_requests_queue on verification_requests (state, submitted_at);
create index if not exists verification_requests_by_author on verification_requests (email, submitted_at desc);

-- Submitted accounts, before anybody has read them.
--
-- Submissions live here. PUBLISHED REPORTS DO NOT: those are JSON files in the
-- repository, and the moderation queue emits one for commit rather than
-- flipping a row to visible. Published content in git gets version history, a
-- reviewable diff and a correction trail, which is the discipline the Record
-- runs on; it also means a reader never depends on this database being up, and
-- that there is one source of truth for what is published rather than two that
-- can disagree.
--
-- Note what is still absent. There is no attachment column and no blob: intake
-- asks people to describe, never to upload.
create table if not exists submissions (
	id                        uuid primary key,
	email                     text not null references accounts (email) on delete cascade,
	-- 'withdrawal-requested' is a state rather than a flag because a published
	-- report is a file in the repository, not a row here: withdrawing one needs
	-- a moderator to edit the file and commit, so the request has to be
	-- something a queue can show.
	state                     text not null default 'pending'
	                          check (state in ('pending', 'published', 'declined',
	                                           'needs-more', 'withdrawal-requested', 'withdrawn')),

	title                     text not null,
	what_happened             text not null,
	insurance_question        text not null,
	information_that_mattered jsonb not null,
	decided_by                text not null,
	cannot_generalize         jsonb not null,
	lines                     jsonb not null,
	states                    jsonb not null,
	occurred_on               text not null,

	-- Phrases that read as a verdict, found at submission time. A flag for the
	-- moderator, never a block: a false positive must not cost somebody the
	-- twenty minutes they just spent, and "the adjuster said it should have been
	-- covered" is a report of what somebody said, which is exactly the kind of
	-- fact this site wants.
	verdict_flags             jsonb not null default '[]'::jsonb,

	submitted_at              timestamptz not null,
	decided_at                timestamptz,
	decided_by_moderator      text,
	moderator_note            text,

	-- The report file this became. Recorded so a withdrawal request can tell the
	-- moderator which file to edit; asking them to find it by title is how the
	-- wrong one gets edited.
	published_slug            text,
	-- Separate from decided_at on purpose. A report a moderator declined and one
	-- its author withdrew are different things, and one timestamp cannot say
	-- which happened.
	withdrawn_at              timestamptz,

	-- Present only when the contributor explicitly completed a promotion invite
	-- from a Commons post. These are join keys, not a citation: the report page
	-- labels the thread as context and keeps the Record citation list separate.
	promotion_request_id      uuid,
	source_thread_id          text,
	source_post_id            text,
	source_subject_id         text
);

-- Keep an already-provisioned database compatible with the current model.
alter table submissions add column if not exists promotion_request_id uuid;
alter table submissions add column if not exists source_thread_id text;
alter table submissions add column if not exists source_post_id text;
alter table submissions add column if not exists source_subject_id text;

create index if not exists submissions_queue on submissions (state, submitted_at);
create index if not exists submissions_by_author on submissions (email, submitted_at desc);


-- ---------------------------------------------------------------------------
-- Threads: the conversation layer
-- ---------------------------------------------------------------------------
--
-- A published case report is a file in the repository, because it is a durable
-- artifact that deserves a diff. A thread is not: it is a conversation, it
-- changes constantly, and putting it in git would make the repository a
-- database with worse tooling.
--
-- The trade is that a thread has no version history. The answer is that a post
-- CANNOT BE EDITED - there is no update path for `body` anywhere in the store,
-- and that is deliberate rather than unfinished. A post can be withdrawn by its
-- author and hidden by a moderator, and both leave the row and its timestamp
-- behind. Immutable-and-removable is the honest shape for something with no
-- diff, and it is the only shape where "what did that say before?" has an
-- answer a reader can trust.
--
-- Still nowhere to put a policy number, a claim number, a date of birth, a
-- government identifier, health information, a payment method or a file. The
-- promise in COMMONS.md section 6 is enforceable only because the database has
-- no column for any of it.

create table if not exists threads (
	id                text primary key,
	-- 'company:...', 'coverage:...' or 'question:...'. Deliberately not a foreign
	-- key: the subjects live in the evidence layer's content collections, not in
	-- this database, and scripts/sync-subjects.mjs is what keeps them honest.
	subject_id        text not null,
	title             text not null,
	started_by        text not null references accounts (email) on delete cascade,
	started_at        timestamptz not null,
	state             text not null default 'open'
	                    check (state in ('open', 'locked', 'hidden')),
	-- Denormalised so a forum index is one query rather than one per thread.
	-- Moved inside the same transaction as the insert that changes it, or a
	-- count can show replies that never happened.
	post_count        integer not null default 0,
	last_post_at      timestamptz not null,
	locked_reason     text,
	hidden_reason     text
);

create index if not exists threads_recent on threads (state, last_post_at desc);
create index if not exists threads_by_subject on threads (subject_id, last_post_at desc);

create table if not exists posts (
	id                     text primary key,
	thread_id              text not null references threads (id) on delete cascade,
	email                  text not null references accounts (email) on delete cascade,
	body                   text not null,
	posted_at              timestamptz not null,
	state                  text not null default 'visible'
	                         check (state in ('visible', 'hidden', 'withdrawn')),

	-- A moderator removed it, and owes a reason.
	hidden_at              timestamptz,
	hidden_by              text,
	hidden_reason          text,
	-- The author took it back, and owes nobody one. Separate columns rather than
	-- one nullable reason, because the two acts must stay distinguishable
	-- afterwards.
	withdrawn_at           timestamptz,

	-- Seen by a moderator and left standing. Moderation here is AFTER the fact,
	-- so this is not approval before publication, and /moderation says so rather
	-- than letting a reader assume the stronger thing.
	reviewed_at            timestamptz,

	-- Set when this post was written up as a structured case report. The
	-- promotion path is why the forum is worth having: it is where the corpus
	-- finds its material.
	promoted_to_submission text references submissions (id) on delete set null
);

create index if not exists posts_in_thread on posts (thread_id, posted_at);
create index if not exists posts_unreviewed on posts (reviewed_at, posted_at)
	where reviewed_at is null;
create index if not exists posts_by_author on posts (email, posted_at desc);

-- A moderator invitation is an inbox item, not an email and not publication.
-- The author must sign in, review the prefilled report, and submit it. The
-- source post remains a conversation row and is never copied into the report
-- as a claim or a Record citation.
create table if not exists promotion_requests (
	id             uuid primary key,
	post_id        text not null references posts (id) on delete cascade,
	thread_id      text not null references threads (id) on delete cascade,
	subject_id     text not null,
	email          text not null references accounts (email) on delete cascade,
	state          text not null default 'pending'
	               check (state in ('pending', 'declined', 'submitted')),
	created_at     timestamptz not null,
	decided_at     timestamptz,
	submission_id  uuid references submissions (id) on delete set null
);

-- A post may be invited again after declining, but cannot have two live
-- invitations or two separate report submissions at once.
create unique index if not exists promotion_requests_one_active_post
	on promotion_requests (post_id)
	where state in ('pending', 'submitted');
create index if not exists promotion_requests_queue on promotion_requests (state, created_at);
create index if not exists promotion_requests_by_author on promotion_requests (email, created_at desc);
