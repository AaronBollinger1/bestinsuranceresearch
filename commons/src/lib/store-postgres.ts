import type { Pool } from 'pg';
import type {
	Account,
	Post,
	PromotionRequest,
	Session,
	SignInToken,
	Store,
	Submission,
	SubmissionDraft,
	Thread,
	ThreadDraft,
	ThreadState,
	VerificationRequest,
	VerificationDecision,
} from './store';

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

	const rowToVerificationRequest = (row: Record<string, unknown>): VerificationRequest => ({
		id: String(row.id),
		email: String(row.email),
		kind: row.kind as VerificationRequest['kind'],
		licenseNumber: String(row.license_number),
		authority: String(row.authority),
		registerUrl: String(row.register_url),
		state: row.state as VerificationRequest['state'],
		submittedAt: new Date(row.submitted_at as string).toISOString(),
		...(row.decided_at ? { decidedAt: new Date(row.decided_at as string).toISOString() } : {}),
		...(row.decided_by_moderator ? { decidedByModerator: String(row.decided_by_moderator) } : {}),
		...(row.moderator_note ? { moderatorNote: String(row.moderator_note) } : {}),
	});

	const getVerificationRequest = async (id: string): Promise<VerificationRequest | null> => {
		const { rows } = await pool.query('select * from verification_requests where id = $1', [id]);
		return rows[0] ? rowToVerificationRequest(rows[0]) : null;
	};

	const rowToThread = (row: Record<string, unknown>): Thread => ({
		id: row.id as string,
		subjectId: row.subject_id as string,
		title: row.title as string,
		startedBy: row.started_by as string,
		startedAt: new Date(row.started_at as string).toISOString(),
		state: row.state as ThreadState,
		postCount: Number(row.post_count),
		lastPostAt: new Date(row.last_post_at as string).toISOString(),
		...(row.locked_reason ? { lockedReason: row.locked_reason as string } : {}),
		...(row.hidden_reason ? { hiddenReason: row.hidden_reason as string } : {}),
	});

	const rowToPost = (row: Record<string, unknown>): Post => ({
		id: row.id as string,
		threadId: row.thread_id as string,
		email: row.email as string,
		body: row.body as string,
		postedAt: new Date(row.posted_at as string).toISOString(),
		state: row.state as Post['state'],
		...(row.hidden_at ? { hiddenAt: new Date(row.hidden_at as string).toISOString() } : {}),
		...(row.hidden_by ? { hiddenBy: row.hidden_by as string } : {}),
		...(row.hidden_reason ? { hiddenReason: row.hidden_reason as string } : {}),
		...(row.withdrawn_at ? { withdrawnAt: new Date(row.withdrawn_at as string).toISOString() } : {}),
		...(row.reviewed_at ? { reviewedAt: new Date(row.reviewed_at as string).toISOString() } : {}),
		...(row.promoted_to_submission ? { promotedToSubmission: row.promoted_to_submission as string } : {}),
	});

	/*
	 * Hoisted for the same reason as getAccount: createThread reads the row back,
	 * and `this` inside an object literal breaks the moment a caller destructures
	 * the store. That exact bug was already found and fixed once in this file.
	 */
	const getThread = async (id: string): Promise<Thread | null> => {
		const { rows } = await pool.query('select * from threads where id = $1', [id]);
		return rows[0] ? rowToThread(rows[0]) : null;
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
		...(row.promotion_request_id && row.source_thread_id && row.source_post_id && row.source_subject_id
			? {
					promotedFrom: {
						requestId: String(row.promotion_request_id),
						threadId: String(row.source_thread_id),
						postId: String(row.source_post_id),
						subjectId: String(row.source_subject_id),
					},
				}
			: {}),
	});

	const rowToPromotionRequest = (row: Record<string, unknown>): PromotionRequest => ({
		id: String(row.id),
		postId: String(row.post_id),
		threadId: String(row.thread_id),
		subjectId: String(row.subject_id),
		email: String(row.email),
		state: row.state as PromotionRequest['state'],
		createdAt: new Date(row.created_at as string).toISOString(),
		...(row.decided_at ? { decidedAt: new Date(row.decided_at as string).toISOString() } : {}),
		...(row.submission_id ? { submissionId: String(row.submission_id) } : {}),
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

		async createVerificationRequest(request) {
			await pool.query(
				`insert into verification_requests
				   (id, email, kind, license_number, authority, register_url, state, submitted_at)
				 values ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
				[
					request.id,
					request.email,
					request.kind,
					request.licenseNumber,
					request.authority,
					request.registerUrl,
					request.submittedAt,
				],
			);
		},

		getVerificationRequest,

		async verificationRequestsBy(email) {
			const { rows } = await pool.query(
				'select * from verification_requests where email = $1 order by submitted_at desc',
				[email],
			);
			return rows.map(rowToVerificationRequest);
		},

		async pendingVerificationRequests() {
			const { rows } = await pool.query(
				`select * from verification_requests where state = 'pending' order by submitted_at asc`,
			);
			return rows.map(rowToVerificationRequest);
		},

		async decideVerificationRequest(id, decision: VerificationDecision) {
			if (decision.state === 'approved' && !decision.verifiedOn) {
				throw new Error('An approved verification needs the date the public register was checked.');
			}
			const client = await pool.connect();
			try {
				await client.query('begin');
				const { rows } = await client.query(
					`select * from verification_requests where id = $1 and state = 'pending' for update`,
					[id],
				);
				const request = rows[0] ? rowToVerificationRequest(rows[0]) : null;
				if (!request) {
					await client.query('commit');
					return;
				}

				await client.query(
					`update verification_requests
					    set state = $2, decided_at = $3, decided_by_moderator = $4, moderator_note = $5
					  where id = $1`,
					[id, decision.state, decision.decidedAt, decision.moderator, decision.note],
				);

				if (decision.state === 'approved') {
					await client.query(
						`update accounts
						    set kind = $2, license_number = $3, license_authority = $4,
						        license_verified_against = $5, license_verified_on = $6
						  where email = $1`,
						[
							request.email,
							request.kind,
							request.licenseNumber,
							request.authority,
							request.registerUrl,
							decision.verifiedOn,
						],
					);
				}
				await client.query('commit');
			} catch (error) {
				await client.query('rollback');
				throw error;
			} finally {
				client.release();
			}
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

		async createPromotionRequest(request: PromotionRequest) {
			await pool.query(
				`insert into promotion_requests
				   (id, post_id, thread_id, subject_id, email, state, created_at)
				 values ($1, $2, $3, $4, $5, 'pending', $6)`,
				[request.id, request.postId, request.threadId, request.subjectId, request.email, request.createdAt],
			);
			const created = await pool.query('select * from promotion_requests where id = $1', [request.id]);
			if (!created.rows[0]) throw new Error('promotion request insert did not produce a row');
			return rowToPromotionRequest(created.rows[0]);
		},

		async getPromotionRequest(id) {
			const { rows } = await pool.query('select * from promotion_requests where id = $1', [id]);
			return rows[0] ? rowToPromotionRequest(rows[0]) : null;
		},

		async promotionByPost(postId) {
			const { rows } = await pool.query(
				'select * from promotion_requests where post_id = $1 order by created_at desc limit 1',
				[postId],
			);
			return rows[0] ? rowToPromotionRequest(rows[0]) : null;
		},

		async promotionRequestsBy(email) {
			const { rows } = await pool.query(
				'select * from promotion_requests where email = $1 order by created_at desc',
				[email],
			);
			return rows.map(rowToPromotionRequest);
		},

		async pendingPromotionRequests() {
			const { rows } = await pool.query(
			`select * from promotion_requests where state = 'pending' order by created_at asc`,
			);
			return rows.map(rowToPromotionRequest);
		},

		async declinePromotionRequest(id, email, at) {
			await pool.query(
				`update promotion_requests
				    set state = 'declined', decided_at = $3
				  where id = $1 and email = $2 and state = 'pending'`,
				[id, email, at],
			);
		},

		async submitPromotion(requestId, email, draft, id, submittedAt) {
			const client = await pool.connect();
			try {
				await client.query('begin');
				const { rows } = await client.query(
					`select p.*, po.email as post_email, po.state as post_state,
					        po.promoted_to_submission, t.state as thread_state
					   from promotion_requests p
					   join posts po on po.id = p.post_id
					   join threads t on t.id = p.thread_id
					  where p.id = $1 and p.email = $2
					  for update`,
					[requestId, email],
				);
				const request = rows[0];
				if (!request || request.state !== 'pending') {
					throw new Error('That promotion invitation is no longer available to this account.');
				}
				if (request.post_email !== email || request.post_state !== 'visible' || request.thread_state === 'hidden') {
					throw new Error('The conversation source is no longer available.');
				}
				if (request.promoted_to_submission) throw new Error('That post already has a case report.');

				await client.query(
					`insert into submissions
					   (id, email, state, title, what_happened, insurance_question,
					    information_that_mattered, decided_by, cannot_generalize,
					    lines, states, occurred_on, verdict_flags, submitted_at,
					    promotion_request_id, source_thread_id, source_post_id, source_subject_id)
					 values ($1, $2, 'pending', $3, $4, $5, $6::jsonb, $7, $8::jsonb,
					         $9::jsonb, $10::jsonb, $11, $12::jsonb, $13,
					         $14, $15, $16, $17)`,
					[
						id,
						email,
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
						requestId,
						request.thread_id,
						request.post_id,
						request.subject_id,
					],
				);
				const post = await client.query(
					`update posts set promoted_to_submission = $2
					  where id = $1 and promoted_to_submission is null`,
					[request.post_id, id],
				);
				if (post.rowCount !== 1) throw new Error('The source post was already promoted.');
				const completed = await client.query(
					`update promotion_requests
					    set state = 'submitted', decided_at = $2, submission_id = $3
					  where id = $1 and state = 'pending'`,
					[requestId, submittedAt, id],
				);
				if (completed.rowCount !== 1) throw new Error('The promotion invitation was already completed.');
				await client.query('commit');
			} catch (error) {
				await client.query('rollback');
				throw error;
			} finally {
				client.release();
			}
			const created = await getSubmission(id);
			if (!created) throw new Error('promoted submission insert did not produce a row');
			return created;
		},

		/* --- Threads --- */

		async createThread(draft: ThreadDraft, ids, at) {
			/*
			 * A CLIENT, not the pool, for the same reason the token insert uses one:
			 * pool.query('begin') checks out a connection, runs BEGIN and hands it
			 * straight back, so the following statements can land on a different
			 * connection outside the transaction. A thread row with no opening post
			 * is a page that renders empty forever.
			 */
			const client = await pool.connect();
			try {
				await client.query('begin');
				await client.query(
					`insert into threads (id, subject_id, title, started_by, started_at, state, post_count, last_post_at)
					      values ($1, $2, $3, $4, $5, 'open', 1, $5)`,
					[ids.threadId, draft.subjectId, draft.title, draft.startedBy, at],
				);
				await client.query(
					`insert into posts (id, thread_id, email, body, posted_at, state)
					      values ($1, $2, $3, $4, $5, 'visible')`,
					[ids.postId, ids.threadId, draft.startedBy, draft.body, at],
				);
				await client.query('commit');
			} catch (error) {
				await client.query('rollback');
				throw error;
			} finally {
				client.release();
			}
			const thread = await getThread(ids.threadId);
			if (!thread) throw new Error('thread insert did not produce a row');
			return thread;
		},

		getThread,

		async listThreads(options = {}) {
			const { rows } = options.subjectId
				? await pool.query(
						`select * from threads where state <> 'hidden' and subject_id = $1
						  order by last_post_at desc limit $2`,
						[options.subjectId, options.limit ?? 200],
					)
				: await pool.query(
						`select * from threads where state <> 'hidden'
						  order by last_post_at desc limit $1`,
						[options.limit ?? 200],
					);
			return rows.map(rowToThread);
		},

		async postsIn(threadId) {
			const { rows } = await pool.query(
				'select * from posts where thread_id = $1 order by posted_at asc',
				[threadId],
			);
			return rows.map(rowToPost);
		},

		async addPost(post) {
			const client = await pool.connect();
			try {
				await client.query('begin');
				await client.query(
					`insert into posts (id, thread_id, email, body, posted_at, state)
					      values ($1, $2, $3, $4, $5, 'visible')`,
					[post.id, post.threadId, post.email, post.body, post.postedAt],
				);
				/* The counter is denormalised, so it has to move inside the same
				   transaction as the insert or an index page can show a count that
				   never happened. */
				await client.query(
					'update threads set post_count = post_count + 1, last_post_at = $2 where id = $1',
					[post.threadId, post.postedAt],
				);
				await client.query('commit');
			} catch (error) {
				await client.query('rollback');
				throw error;
			} finally {
				client.release();
			}
		},

		async getPost(id) {
			const { rows } = await pool.query('select * from posts where id = $1', [id]);
			return rows[0] ? rowToPost(rows[0]) : null;
		},

		async withdrawPost(id, at) {
			await pool.query(
				"update posts set state = 'withdrawn', withdrawn_at = $2 where id = $1",
				[id, at],
			);
		},

		async hidePost(id, by, reason, at) {
			await pool.query(
				`update posts set state = 'hidden', hidden_by = $2, hidden_reason = $3,
				        hidden_at = $4, reviewed_at = $4
				  where id = $1`,
				[id, by, reason, at],
			);
		},

		async setThreadState(id, state, reason) {
			await pool.query(
				`update threads set state = $2,
				        locked_reason = case when $2 = 'locked' then $3 else null end,
				        hidden_reason = case when $2 = 'hidden' then $3 else null end
				  where id = $1`,
				[id, state, reason],
			);
		},

		async unreviewedPosts() {
			const { rows } = await pool.query(
				"select * from posts where reviewed_at is null and state = 'visible' order by posted_at asc",
			);
			return rows.map(rowToPost);
		},

		async markPostReviewed(id) {
			await pool.query('update posts set reviewed_at = now() where id = $1', [id]);
		},

		async postsBy(email) {
			const { rows } = await pool.query(
				'select * from posts where email = $1 order by posted_at desc',
				[email],
			);
			return rows.map(rowToPost);
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
