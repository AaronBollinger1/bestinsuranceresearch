import type { Pool } from 'pg';
import type { Account, Session, SignInToken, Store, Submission, SubmissionDraft } from './store';

/**
 * The Postgres store, for Neon.
 *
 * UNEXERCISED. The session that wrote this had no database and no network
 * egress to reach one, so every query below is unverified against a real
 * server. That is stated here rather than discovered later. What *is* verified
 * is everything above it: the sign-in logic is tested against `memoryStore`
 * through the same interface, so what remains to confirm is the SQL, not the
 * behaviour.
 *
 * Confirm it by running the suite with `COMMONS_DATABASE_URL` set - the store
 * conformance tests in `scripts/verify-auth.mjs` run against whichever store
 * they are given, so pointing them at a real database exercises exactly these
 * queries.
 *
 * The schema is in `schema.sql`. Apply it before first use.
 *
 * WHAT IS NOT HERE, AND WHY THAT IS THE POINT
 *
 * There is no column for a policy number, a claim number, a date of birth, a
 * government identifier, health information or a payment method, and no table
 * for an uploaded file. `COMMONS.md` section 6 promises none of that is
 * collected, and the only enforceable version of that promise is that the
 * database has nowhere to put it.
 */
export function postgresStore(pool: Pool): Store {
	/*
	 * Hoisted rather than reached through `this`. upsertAccount needs to read
	 * the row back, and `this` inside an object literal is both untyped and
	 * quietly wrong the moment a caller destructures the store.
	 */
	const getAccount = async (email: string): Promise<Account | null> => {
		const { rows } = await pool.query(
			`select email, display_name, kind, license_number, license_authority,
			        license_verified_against, license_verified_on, created_at
			   from accounts where email = $1`,
			[email],
		);
		const row = rows[0];
		if (!row) return null;
		const account: Account = {
			email: row.email,
			displayName: row.display_name ?? '',
			kind: row.kind,
			createdAt: new Date(row.created_at).toISOString(),
		};
		if (row.license_number) {
			account.license = {
				number: row.license_number,
				authority: row.license_authority,
				verifiedAgainst: row.license_verified_against,
				verifiedOn: row.license_verified_on,
			};
		}
		return account;
	};

	const rowToSubmission = (row: Record<string, unknown>): Submission => ({
		id: String(row.id),
		email: String(row.email),
		state: row.state as Submission['state'],
		title: String(row.title),
		whatHappened: String(row.what_happened),
		insuranceQuestion: String(row.insurance_question),
		informationThatMattered: row.information_that_mattered as string[],
		decidedBy: String(row.decided_by),
		cannotGeneralize: row.cannot_generalize as string[],
		lines: row.lines as string[],
		states: row.states as string[],
		occurredOn: String(row.occurred_on),
		verdictFlags: row.verdict_flags as string[],
		submittedAt: new Date(row.submitted_at as string).toISOString(),
		...(row.decided_at ? { decidedAt: new Date(row.decided_at as string).toISOString() } : {}),
		...(row.decided_by_moderator ? { decidedByModerator: String(row.decided_by_moderator) } : {}),
		...(row.moderator_note ? { moderatorNote: String(row.moderator_note) } : {}),
		...(row.published_slug ? { publishedSlug: String(row.published_slug) } : {}),
		...(row.withdrawn_at ? { withdrawnAt: new Date(row.withdrawn_at as string).toISOString() } : {}),
	});

	const getSubmission = async (id: string): Promise<Submission | null> => {
		const { rows } = await pool.query('select * from submissions where id = $1', [id]);
		return rows[0] ? rowToSubmission(rows[0]) : null;
	};

	return {
		getAccount,

		async upsertAccount(email) {
			/* Created on first sign-in. `do nothing` rather than `do update` so a
			   later sign-in never resets a display name or a verified licence. */
			await pool.query(
				`insert into accounts (email, display_name, kind)
				      values ($1, '', 'reader')
				 on conflict (email) do nothing`,
				[email],
			);
			const account = await getAccount(email);
			if (!account) throw new Error('account upsert did not produce a row');
			return account;
		},

		async setDisplayName(email, displayName) {
			await pool.query('update accounts set display_name = $2 where email = $1', [email, displayName]);
		},

		async createSignInToken(token: SignInToken) {
			/*
			 * Two writes, and they are not redundant. The token row is deleted the
			 * moment the link is followed, so counting token rows would reset the
			 * rate limit every time somebody signed in - the limit exists to stop
			 * the form being used to mail a stranger repeatedly, and a consumed
			 * link is still a message that was sent. The issue log therefore
			 * outlives the token and is trimmed on a day, not on use.
			 */
			/*
			 * On a CLIENT, not on the pool. `pool.query('begin')` checks out a
			 * connection, runs BEGIN and hands it straight back, so the insert
			 * that follows can land on a different connection entirely and the
			 * COMMIT can close a transaction that never contained it. It looks
			 * transactional and is not.
			 */
			const client = await pool.connect();
			try {
				await client.query('begin');
				await client.query(
					`insert into sign_in_tokens (token_hash, email, expires_at)
					      values ($1, $2, to_timestamp($3 / 1000.0))`,
					[token.tokenHash, token.email, token.expiresAt],
				);
				await client.query('insert into sign_in_issue_log (email) values ($1)', [token.email]);
				await client.query('commit');
			} catch (error) {
				await client.query('rollback');
				throw error;
			} finally {
				client.release();
			}
		},

		async consumeSignInToken(tokenHash) {
			/*
			 * Delete and return in ONE statement. Selecting and then deleting
			 * leaves a window in which two requests both see the token and both
			 * open a session, which is exactly the replay the single-use rule
			 * exists to stop. `delete ... returning` is atomic; do not split it.
			 *
			 * Expired rows are deleted here too and filtered by the caller: a link
			 * is spent by being followed, whatever the outcome.
			 */
			const { rows } = await pool.query(
				`delete from sign_in_tokens where token_hash = $1
				 returning token_hash, email, extract(epoch from expires_at) * 1000 as expires_at`,
				[tokenHash],
			);
			const row = rows[0];
			if (!row) return null;
			return { tokenHash: row.token_hash, email: row.email, expiresAt: Number(row.expires_at) };
		},

		async countRecentTokens(email, since) {
			const { rows } = await pool.query(
				`select count(*)::int as n from sign_in_issue_log
				  where email = $1 and issued_at >= to_timestamp($2 / 1000.0)`,
				[email, since],
			);
			return rows[0]?.n ?? 0;
		},

		async createSession(session: Session) {
			await pool.query(
				`insert into sessions (id_hash, email, expires_at)
				      values ($1, $2, to_timestamp($3 / 1000.0))`,
				[session.idHash, session.email, session.expiresAt],
			);
		},

		async getSession(idHash) {
			const { rows } = await pool.query(
				`select id_hash, email, extract(epoch from expires_at) * 1000 as expires_at
				   from sessions where id_hash = $1`,
				[idHash],
			);
			const row = rows[0];
			if (!row) return null;
			return { idHash: row.id_hash, email: row.email, expiresAt: Number(row.expires_at) };
		},

		async deleteSession(idHash) {
			await pool.query('delete from sessions where id_hash = $1', [idHash]);
		},

		async createSubmission(draft: SubmissionDraft, id: string, submittedAt: string) {
			/* Arrays go in as jsonb rather than as text[]: they are ordered lists a
			   reader sees in order, and jsonb round-trips them without the array
			   literal quoting that turns an apostrophe into a support ticket. */
			await pool.query(
				`insert into submissions
				   (id, email, state, title, what_happened, insurance_question,
				    information_that_mattered, decided_by, cannot_generalize,
				    lines, states, occurred_on, verdict_flags, submitted_at)
				 values ($1, $2, 'pending', $3, $4, $5, $6::jsonb, $7, $8::jsonb,
				         $9::jsonb, $10::jsonb, $11, $12::jsonb, $13)`,
				[
					id,
					draft.email,
					draft.title,
					draft.whatHappened,
					draft.insuranceQuestion,
					JSON.stringify(draft.informationThatMattered),
					draft.decidedBy,
					JSON.stringify(draft.cannotGeneralize),
					JSON.stringify(draft.lines),
					JSON.stringify(draft.states),
					draft.occurredOn,
					JSON.stringify(draft.verdictFlags),
					submittedAt,
				],
			);
			const created = await getSubmission(id);
			if (!created) throw new Error('submission insert did not produce a row');
			return created;
		},

		getSubmission,

		async pendingSubmissions() {
			const { rows } = await pool.query(
				`select * from submissions where state = 'pending' order by submitted_at asc`,
			);
			return rows.map(rowToSubmission);
		},

		async submissionsBy(email) {
			const { rows } = await pool.query(
				'select * from submissions where email = $1 order by submitted_at desc',
				[email],
			);
			return rows.map(rowToSubmission);
		},

		async decideSubmission(id, decision) {
			await pool.query(
				`update submissions
				    set state = $2, decided_at = $3, decided_by_moderator = $4, moderator_note = $5,
				        published_slug = coalesce($6, published_slug)
				  where id = $1`,
				[id, decision.state, decision.decidedAt, decision.moderator, decision.note, decision.publishedSlug ?? null],
			);
		},

		async withdrawSubmission(id, state, at) {
			/* Moderator fields deliberately untouched: a report its author withdrew
			   and one a moderator declined are different things. */
			await pool.query('update submissions set state = $2, withdrawn_at = $3 where id = $1', [id, state, at]);
		},

		async withdrawalRequests() {
			const { rows } = await pool.query(
				`select * from submissions where state = 'withdrawal-requested' order by withdrawn_at asc`,
			);
			return rows.map(rowToSubmission);
		},

		async purgeExpired(now) {
			const cutoff = [now];
			await pool.query('delete from sign_in_tokens where expires_at <= to_timestamp($1 / 1000.0)', cutoff);
			await pool.query('delete from sessions where expires_at <= to_timestamp($1 / 1000.0)', cutoff);
			/* The issue log exists only for the rate limit, so it keeps a day. */
			await pool.query(
				"delete from sign_in_issue_log where issued_at < now() - interval '1 day'",
			);
		},
	};
}
