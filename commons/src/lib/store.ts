/**
 * What the Commons is allowed to remember about a person.
 *
 * This interface is the enforceable version of `COMMONS.md` section 6. That
 * section lists what is never collected - a document upload, a policy number, a
 * claim number, a date of birth, a government identifier, health information, a
 * payment method - and a promise in prose is worth nothing next to a schema
 * that has nowhere to put any of it.
 *
 * So the shape below is the whole permitted surface. Three things are stored
 * about an account: an email address to sign in with, a display name to publish
 * under, and, for practitioners only, a licence number that is checkable
 * against a public register. There is no field for anything else and adding one
 * fails the suite.
 *
 * WHY AN INTERFACE RATHER THAN A DATABASE CALL
 *
 * Two reasons, and the second is the load-bearing one.
 *
 * The obvious one is portability: an in-memory implementation runs the whole
 * sign-in flow in a test without a database, and the Postgres implementation
 * behind the same interface swaps in when one exists.
 *
 * The real one is that this file is auditable. "What does the Commons store
 * about me" has an answer that fits on a screen, and it is checkable rather
 * than promised. That is the difference this property is selling.
 */

/** A person with an account. Nothing here is sensitive and that is deliberate. */
export interface Account {
	/** Lower-cased, used only to sign in and to ask about a submission. */
	email: string;
	/** What appears on anything they contribute. */
	displayName: string;
	kind: 'reader' | 'broker' | 'adjuster' | 'attorney' | 'staff';
	/**
	 * Present only where a professional licence was checked against the
	 * regulator's own public register. A licence number is publicly checkable,
	 * which is exactly why verifying a practitioner needs no identity documents
	 * and stores nothing sensitive.
	 */
	license?: {
		number: string;
		authority: string;
		verifiedAgainst: string;
		verifiedOn: string;
	};
	createdAt: string;
}

export type ProfessionalKind = Exclude<Account['kind'], 'reader' | 'staff'>;

export type VerificationRequestState = 'pending' | 'approved' | 'declined';

/** A request to have a professional role checked against a public register. */
export interface VerificationRequest {
	id: string;
	email: string;
	kind: ProfessionalKind;
	licenseNumber: string;
	authority: string;
	registerUrl: string;
	state: VerificationRequestState;
	submittedAt: string;
	decidedAt?: string;
	decidedByModerator?: string;
	moderatorNote?: string;
}

export interface VerificationDecision {
	state: Exclude<VerificationRequestState, 'pending'>;
	moderator: string;
	note: string;
	decidedAt: string;
	/** Required when approving, because the badge must carry a check date. */
	verifiedOn?: string;
}

/** A pending magic link. The token itself is never stored - only its hash. */
export interface SignInToken {
	tokenHash: string;
	email: string;
	expiresAt: number;
}

/** A signed-in browser. The cookie value is never stored - only its hash. */
export interface Session {
	idHash: string;
	email: string;
	expiresAt: number;
}


/**
 * Where a submission has got to.
 *
 * `withdrawal-requested` exists because a published report is a file in the
 * repository, not a row here. A contributor withdrawing something unpublished
 * is done in one step - nobody has read it and nothing is live. Withdrawing
 * something published needs a moderator to edit the file and commit, so the
 * request has to be a state a queue can show rather than a flag nobody sees.
 *
 * `COMMONS.md` section 8 promises withdrawal "at any time, for any reason or
 * none", and the "or none" is load-bearing: nothing in this flow asks a
 * contributor to justify taking their own account back.
 */
export type SubmissionState =
	| 'pending'
	| 'published'
	| 'declined'
	| 'needs-more'
	| 'withdrawal-requested'
	| 'withdrawn';

/** Unpublished states a contributor can withdraw from in one step. */
export const WITHDRAWABLE_IMMEDIATELY: SubmissionState[] = ['pending', 'needs-more'];

/**
 * A moderator invitation is not publication and it is not an endorsement of
 * the post. It is a request to do the slower, structured work that can make an
 * account worth citing. The author has to submit the report themselves; a
 * moderator can never turn a post into a report by copying it silently.
 */
export type PromotionState = 'pending' | 'declined' | 'submitted';

export interface PromotionRequest {
	id: string;
	postId: string;
	threadId: string;
	subjectId: string;
	email: string;
	state: PromotionState;
	createdAt: string;
	decidedAt?: string;
	submissionId?: string;
}

/** The private join retained on a database submission; reports expose only the public ids. */
export interface PromotionSource {
	requestId: string;
	threadId: string;
	postId: string;
	subjectId: string;
}

/**
 * A submitted account, before anybody has read it.
 *
 * Submissions live in the database. **Published reports do not** - they are
 * JSON files in the repository, and the moderation queue emits one for commit
 * rather than flipping a row to visible.
 *
 * That looks like extra work and it is the right trade. Published content in
 * git gets version history, a reviewable diff, and corrections that keep their
 * prior wording, which is exactly the discipline the Record runs on and exactly
 * what `COMMONS.md` section 8 means by moderation being the product. It also
 * means a reader never depends on a database being up, and that there is one
 * source of truth for what is published rather than two that can disagree.
 *
 * The fields mirror the `reports` collection because the moderator's job is to
 * turn one into the other, not to retype it.
 */
export interface Submission {
	id: string;
	/** The account that submitted it. Attribution is not optional here. */
	email: string;
	state: SubmissionState;

	title: string;
	whatHappened: string;
	insuranceQuestion: string;
	informationThatMattered: string[];
	decidedBy: string;
	cannotGeneralize: string[];
	lines: string[];
	states: string[];
	occurredOn: string;

	/**
	 * Phrases that read as a verdict on whether a claim should have been paid,
	 * found at submission time. Not a block - a contributor phrasing something
	 * badly should be guided rather than silently rejected, and a false positive
	 * must not cost somebody their whole account. Stored so the moderator sees
	 * exactly what tripped and can judge it.
	 */
	verdictFlags: string[];

	submittedAt: string;
	/** Set when a moderator decides. Their note is for the contributor. */
	decidedAt?: string;
	decidedByModerator?: string;
	moderatorNote?: string;
	/**
	 * The report file this became, once published. Recorded because withdrawal
	 * needs it: a moderator handling a request has to be told which file to edit,
	 * and asking them to search for it by title is how the wrong one gets edited.
	 */
	publishedSlug?: string;
	withdrawnAt?: string;
	/** Present only for a report the author explicitly submitted from a thread. */
	promotedFrom?: PromotionSource;
}

export interface SubmissionDraft {
	email: string;
	title: string;
	whatHappened: string;
	insuranceQuestion: string;
	informationThatMattered: string[];
	decidedBy: string;
	cannotGeneralize: string[];
	lines: string[];
	states: string[];
	occurredOn: string;
	verdictFlags: string[];
}

/* ------------------------------------------------------------------ */
/* Threads                                                             */
/* ------------------------------------------------------------------ */

/**
 * A thread is conversation, and it is stored rather than committed.
 *
 * A published case report is a file in the repository, because it is a durable
 * artifact that deserves a diff. A thread is not - it is a conversation about a
 * subject, it changes constantly, and putting it in git would make the
 * repository a database with worse tooling.
 *
 * The trade is real and worth stating rather than glossing: a thread has no
 * version history, so a reader cannot see what a post said before it was
 * edited. The answer is that a post CANNOT be edited. It can be withdrawn by
 * its author, and it can be hidden by a moderator, and both leave a tombstone.
 * Immutable-and-removable is the honest shape for something with no diff.
 */
export type ThreadState =
	/** Anybody signed in can reply. */
	| 'open'
	/** Readable, no new replies. A moderator's decision, with a reason. */
	| 'locked'
	/** Removed from the index and from its subject. The page says why. */
	| 'hidden';

export interface Thread {
	id: string;
	/** `company:...`, `coverage:...` or `question:...`, resolving in SUBJECTS. */
	subjectId: string;
	title: string;
	/** The account that started it. Attribution is not optional here either. */
	startedBy: string;
	startedAt: string;
	state: ThreadState;
	/** Denormalised so an index page is one query rather than one per thread. */
	postCount: number;
	lastPostAt: string;
	lockedReason?: string;
	hiddenReason?: string;
}

export type PostState =
	| 'visible'
	/** A moderator removed it. The tombstone and the reason stay. */
	| 'hidden'
	/** The author took it back. The tombstone stays; the reason is nobody's business. */
	| 'withdrawn';

export interface Post {
	id: string;
	threadId: string;
	email: string;
	body: string;
	postedAt: string;
	state: PostState;
	hiddenAt?: string;
	hiddenBy?: string;
	hiddenReason?: string;
	withdrawnAt?: string;
	/**
	 * When a moderator last looked at it. Moderation here is after the fact, so
	 * "reviewed" means seen and left standing rather than approved before
	 * publication - and the difference is stated on /moderation rather than
	 * left for a reader to assume the stronger one.
	 */
	reviewedAt?: string;
	/**
	 * Set when a moderator asked for this post to be written up as a structured
	 * case report and the contributor did it. The promotion path is the reason
	 * the forum is worth having: it is where the corpus finds its material.
	 */
	promotedToSubmission?: string;
}

export interface ThreadDraft {
	subjectId: string;
	title: string;
	startedBy: string;
	body: string;
}

export interface Store {
	/** Confirms the backing store is reachable without reading any user data. */
	checkLiveness(): Promise<void>;

	/* --- Accounts --- */
	getAccount(email: string): Promise<Account | null>;
	/** Creates on first sign-in. There is no separate signup step, by design. */
	upsertAccount(email: string): Promise<Account>;
	setDisplayName(email: string, displayName: string): Promise<void>;
	createVerificationRequest(request: VerificationRequest): Promise<void>;
	getVerificationRequest(id: string): Promise<VerificationRequest | null>;
	verificationRequestsBy(email: string): Promise<VerificationRequest[]>;
	/** Pending requests are oldest first so the queue does not rank people. */
	pendingVerificationRequests(): Promise<VerificationRequest[]>;
	/** Approval changes the account and request together; decline changes only the request. */
	decideVerificationRequest(id: string, decision: VerificationDecision): Promise<void>;

	/* --- Sign-in tokens --- */
	createSignInToken(token: SignInToken): Promise<void>;
	/**
	 * Single use. Returns the token and deletes it in the same operation, so a
	 * link that is replayed - out of a forwarded email, a shared screenshot, a
	 * mail scanner that follows links - finds nothing. Returning it and deleting
	 * it separately would leave a window; implementations must not do that.
	 */
	consumeSignInToken(tokenHash: string): Promise<SignInToken | null>;
	/** How many links were issued to this address since a given time. */
	countRecentTokens(email: string, since: number): Promise<number>;

	/* --- Sessions --- */
	createSession(session: Session): Promise<void>;
	getSession(idHash: string): Promise<Session | null>;
	deleteSession(idHash: string): Promise<void>;

	/* --- Submissions --- */
	createSubmission(draft: SubmissionDraft, id: string, submittedAt: string): Promise<Submission>;
	getSubmission(id: string): Promise<Submission | null>;
	/** Everything awaiting a decision, oldest first. The queue is FIFO on purpose:
	    ordering by anything else is a judgement about whose account matters more. */
	pendingSubmissions(): Promise<Submission[]>;
	/** What one person has sent, so they can see where it got to. */
	submissionsBy(email: string): Promise<Submission[]>;
	decideSubmission(
		id: string,
		decision: {
			state: Submission['state'];
			moderator: string;
			note: string;
			decidedAt: string;
			/** Set only when publishing, so withdrawal can find the file later. */
			publishedSlug?: string;
		},
	): Promise<void>;
	/**
	 * The contributor taking their own account back. Separate from
	 * `decideSubmission` so the two are distinguishable afterwards: a report that
	 * a moderator declined and one that its author withdrew are different things,
	 * and collapsing them into one state field with one timestamp would lose
	 * which happened.
	 */
	withdrawSubmission(
		id: string,
		state: Extract<Submission['state'], 'withdrawn' | 'withdrawal-requested'>,
		at: string,
	): Promise<void>;
	/** Published reports whose author has asked for them to be taken down. */
	withdrawalRequests(): Promise<Submission[]>;
	/** Moderator invitation; the request itself does not make anything public. */
	createPromotionRequest(request: PromotionRequest): Promise<PromotionRequest>;
	getPromotionRequest(id: string): Promise<PromotionRequest | null>;
	/** The most recent invitation for a post, including declined requests. */
	promotionByPost(postId: string): Promise<PromotionRequest | null>;
	/** What one person has been invited to write up, newest first. */
	promotionRequestsBy(email: string): Promise<PromotionRequest[]>;
	/** Pending invitations are oldest first so the author is not ranked. */
	pendingPromotionRequests(): Promise<PromotionRequest[]>;
	/** The author can decline without explaining why. */
	declinePromotionRequest(id: string, email: string, at: string): Promise<void>;
	/** Atomically creates the report and marks the source post as promoted. */
	submitPromotion(
		requestId: string,
		email: string,
		draft: Omit<SubmissionDraft, 'email'>,
		id: string,
		submittedAt: string,
	): Promise<Submission>;

	/* --- Threads --- */
	createThread(draft: ThreadDraft, ids: { threadId: string; postId: string }, at: string): Promise<Thread>;
	getThread(id: string): Promise<Thread | null>;
	/** Newest activity first, which is what a forum index is for. */
	listThreads(options?: { subjectId?: string; limit?: number }): Promise<Thread[]>;
	/** In the order they were written. A conversation read backwards is not one. */
	postsIn(threadId: string): Promise<Post[]>;
	addPost(post: Post): Promise<void>;
	getPost(id: string): Promise<Post | null>;
	/**
	 * Author or moderator removing a post. Separate arguments rather than one
	 * `state` field with an optional reason, because the two are different acts:
	 * a moderator owes a reason and an author owes nobody one, and a schema that
	 * cannot tell them apart afterwards has lost the thing worth recording.
	 */
	withdrawPost(id: string, at: string): Promise<void>;
	hidePost(id: string, by: string, reason: string, at: string): Promise<void>;
	setThreadState(id: string, state: ThreadState, reason: string): Promise<void>;
	/** Posts a moderator has not yet looked at, oldest first. */
	unreviewedPosts(): Promise<Post[]>;
	markPostReviewed(id: string): Promise<void>;
	/** What one person has written, so their account page can show it. */
	postsBy(email: string): Promise<Post[]>;

	/** Drops expired tokens and sessions. Nothing keeps what it does not need. */
	purgeExpired(now: number): Promise<void>;
}
