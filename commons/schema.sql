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
	state                     text not null default 'pending'
	                          check (state in ('pending', 'published', 'declined', 'needs-more')),

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
	moderator_note            text
);

create index if not exists submissions_queue on submissions (state, submitted_at);
create index if not exists submissions_by_author on submissions (email, submitted_at desc);
