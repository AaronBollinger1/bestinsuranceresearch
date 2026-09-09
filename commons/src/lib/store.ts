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
	state: 'pending' | 'published' | 'declined' | 'needs-more';

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

export interface Store {
	/* --- Accounts --- */
	getAccount(email: string): Promise<Account | null>;
	/** Creates on first sign-in. There is no separate signup step, by design. */
	upsertAccount(email: string): Promise<Account>;
	setDisplayName(email: string, displayName: string): Promise<void>;

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
		decision: { state: Submission['state']; moderator: string; note: string; decidedAt: string },
	): Promise<void>;

	/** Drops expired tokens and sessions. Nothing keeps what it does not need. */
	purgeExpired(now: number): Promise<void>;
}
