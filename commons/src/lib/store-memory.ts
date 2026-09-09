import type { Account, Session, SignInToken, Store, Submission, SubmissionDraft } from './store';

/**
 * The in-memory store.
 *
 * This is not a mock. It is the implementation the whole sign-in flow is tested
 * against, which is what makes the auth logic verifiable without a database:
 * token single use, expiry, session lifecycle and rate limiting are properties
 * of `auth.ts`, not of Postgres, and they are all exercised here.
 *
 * It is also the development store. Running the Commons locally needs no
 * database at all - sign in, get a link on the console, and the flow works.
 * State dies with the process, which is correct for both uses.
 */
export function memoryStore(): Store {
	const accounts = new Map<string, Account>();
	const tokens = new Map<string, SignInToken>();
	const sessions = new Map<string, Session>();
	const submissions = new Map<string, Submission>();
	/** Issue times per email, for the rate limit. Trimmed in purgeExpired. */
	const issued = new Map<string, number[]>();

	return {
		async getAccount(email) {
			return accounts.get(email) ?? null;
		},

		async upsertAccount(email) {
			const existing = accounts.get(email);
			if (existing) return existing;
			const account: Account = {
				email,
				/* Nobody is published under an address. The display name is asked for
				   on first visit to /account and defaults to nothing usable until
				   then, deliberately - an account is not a byline. */
				displayName: '',
				kind: 'reader',
				createdAt: new Date().toISOString(),
			};
			accounts.set(email, account);
			return account;
		},

		async setDisplayName(email, displayName) {
			const account = accounts.get(email);
			if (account) accounts.set(email, { ...account, displayName });
		},

		async createSignInToken(token) {
			tokens.set(token.tokenHash, token);
			issued.set(token.email, [...(issued.get(token.email) ?? []), Date.now()]);
		},

		async consumeSignInToken(tokenHash) {
			const token = tokens.get(tokenHash);
			/* Delete before returning, and delete even when expired. A link is
			   spent by being followed, whatever the outcome. */
			tokens.delete(tokenHash);
			return token ?? null;
		},

		async countRecentTokens(email, since) {
			return (issued.get(email) ?? []).filter((t) => t >= since).length;
		},

		async createSession(session) {
			sessions.set(session.idHash, session);
		},

		async getSession(idHash) {
			return sessions.get(idHash) ?? null;
		},

		async deleteSession(idHash) {
			sessions.delete(idHash);
		},

		async createSubmission(draft: SubmissionDraft, id: string, submittedAt: string) {
			const submission: Submission = { ...draft, id, state: 'pending', submittedAt };
			submissions.set(id, submission);
			return submission;
		},

		async getSubmission(id) {
			return submissions.get(id) ?? null;
		},

		async pendingSubmissions() {
			/* Oldest first. Ordering a moderation queue by anything else is a
			   judgement about whose account matters more. */
			return [...submissions.values()]
				.filter((s) => s.state === 'pending')
				.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
		},

		async submissionsBy(email) {
			return [...submissions.values()]
				.filter((s) => s.email === email)
				.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
		},

		async decideSubmission(id, decision) {
			const submission = submissions.get(id);
			if (!submission) return;
			submissions.set(id, {
				...submission,
				state: decision.state,
				decidedAt: decision.decidedAt,
				decidedByModerator: decision.moderator,
				moderatorNote: decision.note,
			});
		},

		async purgeExpired(now) {
			for (const [hash, token] of tokens) if (token.expiresAt <= now) tokens.delete(hash);
			for (const [hash, session] of sessions) if (session.expiresAt <= now) sessions.delete(hash);
			const window = now - 24 * 60 * 60 * 1000;
			for (const [email, times] of issued) {
				const kept = times.filter((t) => t >= window);
				if (kept.length === 0) issued.delete(email);
				else issued.set(email, kept);
			}
		},
	};
}
