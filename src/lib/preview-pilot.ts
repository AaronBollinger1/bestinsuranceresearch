/**
 * Persistent preview pilot (BR-R2).
 *
 * Accounts, sessions, and the one unanswered-question draft move through a
 * store adapter. Public signup, provider calls, publication, and indexing
 * stay closed. Authentication does not verify a licence, employment, a
 * policy, or company authority.
 */
import { escapeHtml } from './citations.ts';

export const PILOT_PUBLIC_SIGNUP_OPEN: boolean = false;
export const PILOT_PUBLICATION_OPEN: boolean = false;
export const PILOT_INDEXING_OPEN: boolean = false;
export const PILOT_PROVIDER_ENABLED: boolean = false;
export const PILOT_ABUSE_LIMIT = 5;
export const PILOT_GATES = ['citation', 'rights', 'freshness', 'moderation', 'privacy', 'editorial', 'licensed-review', 'owner'] as const;
export type PilotGate = (typeof PILOT_GATES)[number];
export const PILOT_ROLES = ['consumer', 'verified-professional', 'company-representative'] as const;
export type PilotRole = (typeof PILOT_ROLES)[number];

export interface PilotToken {
	id: string;
	expiresAt: string;
	used: boolean;
}

export interface PilotAccount {
	id: string;
	email: string;
	role: PilotRole;
	licenceVerified: boolean;
	authorityVerified: boolean;
	employmentVerified: boolean;
	policyVerified: boolean;
	organizationId: string | null;
	verifiedAt: string | null;
	deletedAt: string | null;
	session: { id: string; expiresAt: string } | null;
	signInToken: PilotToken | null;
	recoveryToken: PilotToken | null;
	failures: number;
	media: { id: string; byteLength: number; publicUrl: null } | null;
}

export interface PilotSource {
	id: string;
	title: string;
	url: string;
	removed: boolean;
}

export interface PilotVersion {
	version: number;
	summary: string;
	sourceIds: string[];
}

export interface PilotObservation {
	id: string;
	at: string;
	kind: string;
	result: string;
}

export interface PilotDraft {
	questionId: string;
	version: number;
	versions: PilotVersion[];
	sources: PilotSource[];
	summary: string;
	rights: 'recorded' | 'unrecorded';
	effectiveDate: string;
	stale: boolean;
	moderation: 'clear' | 'held';
	appeal: string | null;
	dispute: string | null;
	editorial: boolean;
	licensed: boolean;
	withdrawn: boolean;
	providerCalls: number;
	spend: number;
}

export interface PilotState {
	accounts: PilotAccount[];
	draft: PilotDraft | null;
	observations: PilotObservation[];
}

export interface PilotStore {
	kind: 'memory' | 'json';
	load(): PilotState;
	save(state: PilotState): void;
}

export interface PilotPermissions {
	ask: boolean;
	confirmOrDispute: boolean;
	professionalContribution: boolean;
	companyResponse: boolean;
	editorial: boolean;
	licensedReview: boolean;
}

const SESSION_MS = 60 * 60 * 1000;
const TOKEN_MS = 15 * 60 * 1000;

export function emptyPilot(): PilotState {
	return { accounts: [], draft: null, observations: [] };
}

export function memoryPilotStore(seed: PilotState = emptyPilot()): PilotStore {
	let state = clone(seed);
	return {
		kind: 'memory',
		load: () => clone(state),
		save(next) { state = clone(next); },
	};
}

export function jsonPilotStore(raw: string): PilotStore & { dump(): string } {
	let text = raw;
	return {
		kind: 'json',
		load: () => JSON.parse(text) as PilotState,
		save(next) { text = JSON.stringify(next); },
		dump: () => text,
	};
}

export function pilotPermissions(account: PilotAccount | undefined, now: string): PilotPermissions {
	const signedIn = !!account && !account.deletedAt && !!account.session && account.session.expiresAt > now;
	return {
		ask: signedIn && account?.role === 'consumer',
		confirmOrDispute: signedIn && account?.role === 'consumer',
		professionalContribution: signedIn && account?.role === 'verified-professional' && account.licenceVerified === true,
		companyResponse: signedIn && account?.role === 'company-representative' && account.authorityVerified === true,
		editorial: false,
		licensedReview: false,
	};
}

function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function observe(state: PilotState, id: string, at: string, kind: string, result: string): PilotState {
	return { ...state, observations: [...state.observations, { id, at, kind, result }] };
}

function account(state: PilotState, id: string): PilotAccount | undefined {
	return state.accounts.find((item) => item.id === id && !item.deletedAt);
}

function replaceAccount(state: PilotState, next: PilotAccount): PilotState {
	return { ...state, accounts: state.accounts.map((item) => item.id === next.id ? next : item) };
}

export function requestSignup(store: PilotStore, input: { email: string; role: PilotRole; now: string; publicSignupOpen?: boolean }): { ok: boolean; state: string } {
	if ((input.publicSignupOpen ?? PILOT_PUBLIC_SIGNUP_OPEN) !== true) {
		store.save(observe(store.load(), 'signup', input.now, 'signup', 'signup-closed'));
		return { ok: false, state: 'signup-closed' };
	}
	return { ok: false, state: 'signup-closed' };
}

export function signIn(store: PilotStore, input: { accountId: string; token: string; now: string }): { ok: boolean; state: string } {
	const current = store.load();
	const found = account(current, input.accountId);
	if (!found?.signInToken || found.signInToken.used || found.signInToken.id !== input.token || found.signInToken.expiresAt <= input.now) {
		const failures = (found?.failures ?? 0) + 1;
		const next = found ? replaceAccount(current, { ...found, failures }) : current;
		const result = failures >= PILOT_ABUSE_LIMIT ? 'rate-limited' : 'sign-in-failed';
		store.save(observe(next, `sign-in-${failures}`, input.now, 'sign-in', result));
		return { ok: false, state: result };
	}
	const signed = replaceAccount(current, {
		...found,
		failures: 0,
		signInToken: { ...found.signInToken, used: true },
		session: { id: `pilot-session-${found.id}`, expiresAt: new Date(Date.parse(input.now) + SESSION_MS).toISOString() },
	});
	store.save(observe(signed, `sign-in-${found.id}`, input.now, 'sign-in', 'signed-in'));
	return { ok: true, state: 'signed-in' };
}

export function requestRecovery(store: PilotStore, input: { accountId: string; now: string }): { ok: boolean; state: string } {
	const current = store.load();
	const found = account(current, input.accountId);
	if (!found?.verifiedAt) {
		store.save(observe(current, `recovery-${input.accountId}`, input.now, 'recovery', 'recovery-requested'));
		return { ok: true, state: 'recovery-requested' };
	}
	const next = replaceAccount(current, {
		...found,
		recoveryToken: { id: `pilot-recovery-${found.id}`, expiresAt: new Date(Date.parse(input.now) + TOKEN_MS).toISOString(), used: false },
	});
	store.save(observe(next, `recovery-${found.id}`, input.now, 'recovery', 'recovery-requested'));
	return { ok: true, state: 'recovery-requested' };
}

export function completeRecovery(store: PilotStore, input: { accountId: string; token: string; now: string }): { ok: boolean; state: string } {
	const current = store.load();
	const found = account(current, input.accountId);
	if (!found?.recoveryToken || found.recoveryToken.used || found.recoveryToken.id !== input.token || found.recoveryToken.expiresAt <= input.now) {
		store.save(observe(current, `recovery-fail-${input.accountId}`, input.now, 'recovery', 'recovery-failed'));
		return { ok: false, state: 'recovery-failed' };
	}
	const next = replaceAccount(current, {
		...found,
		failures: 0,
		recoveryToken: { ...found.recoveryToken, used: true },
		session: { id: `pilot-session-${found.id}`, expiresAt: new Date(Date.parse(input.now) + SESSION_MS).toISOString() },
	});
	store.save(observe(next, `recovery-ok-${found.id}`, input.now, 'recovery', 'signed-in'));
	return { ok: true, state: 'signed-in' };
}

export function exportAccount(store: PilotStore, input: { accountId: string; actorId: string }): { ok: boolean; state: string; body?: Record<string, unknown> } {
	const found = account(store.load(), input.accountId);
	if (!found || input.actorId !== input.accountId) return { ok: false, state: 'export-forbidden' };
	return {
		ok: true,
		state: 'exported',
		body: {
			id: found.id,
			email: found.email,
			role: found.role,
			licenceVerified: found.licenceVerified,
			authorityVerified: found.authorityVerified,
			media: found.media ? { byteLength: found.media.byteLength, publicUrl: null } : { byteLength: 0, publicUrl: null },
		},
	};
}

export function deleteAccount(store: PilotStore, input: { accountId: string; actorId: string; now: string }): { ok: boolean; state: string } {
	const current = store.load();
	const found = account(current, input.accountId);
	if (!found || input.actorId !== input.accountId) return { ok: false, state: 'permission-denied' };
	const next = replaceAccount(current, {
		...found,
		deletedAt: input.now,
		session: null,
		signInToken: null,
		recoveryToken: null,
		media: null,
	});
	store.save(observe(next, `delete-${found.id}`, input.now, 'deletion', 'deleted'));
	return { ok: true, state: 'deleted' };
}

export function setRole(store: PilotStore, input: { accountId: string; actorId: string; role: PilotRole; organizationId?: string | null }): { ok: boolean; state: string } {
	const current = store.load();
	const found = account(current, input.accountId);
	if (!found || input.actorId !== input.accountId || !(PILOT_ROLES as readonly string[]).includes(input.role)) {
		return { ok: false, state: 'permission-denied' };
	}
	const next = replaceAccount(current, {
		...found,
		role: input.role,
		organizationId: input.organizationId ?? found.organizationId,
		licenceVerified: false,
		authorityVerified: false,
		employmentVerified: false,
		policyVerified: false,
	});
	store.save(observe(next, `role-${found.id}`, '2026-09-27T12:00:00.000Z', 'role', 'role-set'));
	return { ok: true, state: 'role-set' };
}

export function verifyLicence(store: PilotStore, input: { accountId: string; reviewerId: string }): { ok: boolean; state: string } {
	const current = store.load();
	const found = account(current, input.accountId);
	if (!found || found.role !== 'verified-professional' || !input.reviewerId.startsWith('fixture-reviewer-')) {
		return { ok: false, state: 'permission-denied' };
	}
	store.save(replaceAccount(current, { ...found, licenceVerified: true }));
	return { ok: true, state: 'licence-verified' };
}

export function verifyCompanyAuthority(store: PilotStore, input: { accountId: string; reviewerId: string }): { ok: boolean; state: string } {
	const current = store.load();
	const found = account(current, input.accountId);
	if (!found || found.role !== 'company-representative' || !input.reviewerId.startsWith('fixture-reviewer-')) {
		return { ok: false, state: 'permission-denied' };
	}
	store.save(replaceAccount(current, { ...found, authorityVerified: true }));
	return { ok: true, state: 'authority-verified' };
}

export function storePrivateMedia(store: PilotStore, input: { accountId: string; actorId: string; byteLength: number }): { ok: boolean; state: string; publicUrl: null } {
	const current = store.load();
	const found = account(current, input.accountId);
	if (!found || input.actorId !== input.accountId || input.byteLength <= 0) return { ok: false, state: 'permission-denied', publicUrl: null };
	store.save(replaceAccount(current, { ...found, media: { id: `pilot-media-${found.id}`, byteLength: input.byteLength, publicUrl: null } }));
	return { ok: true, state: 'stored', publicUrl: null };
}

function draftOf(state: PilotState): PilotDraft {
	if (state.draft) return state.draft;
	return {
		questionId: 'fixture-unanswered-wind-deductible',
		version: 0,
		versions: [],
		sources: [],
		summary: '',
		rights: 'unrecorded',
		effectiveDate: '',
		stale: false,
		moderation: 'clear',
		appeal: null,
		dispute: null,
		editorial: false,
		licensed: false,
		withdrawn: false,
		providerCalls: 0,
		spend: 0,
	};
}

function withDraft(state: PilotState, draft: PilotDraft, id: string, at: string, kind: string, result: string): PilotState {
	return observe({ ...state, draft }, id, at, kind, result);
}

export function retrieveEvidence(store: PilotStore, now: string): { ok: boolean; state: string } {
	const current = store.load();
	const draft = draftOf(current);
	const source: PilotSource = {
		id: 'src-fixture-wind',
		title: 'Fixture wind-deductible bulletin',
		url: 'https://fixture.invalid/pilot/wind-deductible',
		removed: false,
	};
	const summary = 'Fixture evidence for an unanswered wind-deductible question. Citation src-fixture-wind. It is not a statement about a real policy.';
	const next: PilotDraft = {
		...draft,
		questionId: 'fixture-unanswered-wind-deductible',
		version: 1,
		sources: [source],
		summary,
		rights: 'recorded',
		effectiveDate: '2026-09-27',
		versions: [{ version: 1, summary, sourceIds: [source.id] }],
	};
	store.save(withDraft(current, next, 'retrieve', now, 'retrieval', 'retrieved'));
	return { ok: true, state: 'retrieved' };
}

export function requestSourceCandidate(store: PilotStore, input: { now: string; credential?: string; outage?: boolean }): { ok: boolean; state: string; providerCalls: number; spend: number } {
	const current = store.load();
	const draft = draftOf(current);
	const refused = PILOT_PROVIDER_ENABLED !== true || !!input.credential?.trim() || input.outage === true;
	const next = { ...draft, providerCalls: 0, spend: 0 };
	store.save(withDraft(current, next, 'provider', input.now, 'provider', refused ? 'outage' : 'disabled'));
	return { ok: false, state: 'outage', providerCalls: 0, spend: 0 };
}

export function disputeDraft(store: PilotStore, input: { accountId: string; now: string; note: string }): { ok: boolean; state: string } {
	const current = store.load();
	const actor = account(current, input.accountId);
	if (!pilotPermissions(actor, input.now).confirmOrDispute || !current.draft) return { ok: false, state: 'permission-denied' };
	store.save(withDraft(current, { ...current.draft, dispute: input.note }, 'dispute', input.now, 'dispute', 'disputed'));
	return { ok: true, state: 'disputed' };
}

export function holdAndAppeal(store: PilotStore, input: { now: string; note: string }): { ok: boolean; state: string } {
	const current = store.load();
	if (!current.draft) return { ok: false, state: 'missing-draft' };
	const held = { ...current.draft, moderation: 'held' as const, appeal: input.note };
	store.save(withDraft(current, held, 'appeal', input.now, 'appeal', 'appeal-open'));
	return { ok: true, state: 'appeal-open' };
}

export function removeSource(store: PilotStore, input: { sourceId: string; now: string }): { ok: boolean; state: string } {
	const current = store.load();
	if (!current.draft) return { ok: false, state: 'missing-draft' };
	const sources = current.draft.sources.map((source) => source.id === input.sourceId ? { ...source, removed: true } : source);
	store.save(withDraft(current, { ...current.draft, sources }, 'remove-source', input.now, 'source-removal', 'removed'));
	return { ok: true, state: 'removed' };
}

export function reviewDraft(store: PilotStore, input: { now: string; reviewerId: string; kind: 'editorial' | 'licensed-review' }): { ok: boolean; state: string } {
	const current = store.load();
	if (!current.draft) return { ok: false, state: 'missing-draft' };
	if (!input.reviewerId.startsWith('fixture-reviewer-')) return { ok: false, state: 'permission-denied' };
	const draft = input.kind === 'editorial'
		? { ...current.draft, editorial: true }
		: { ...current.draft, licensed: true };
	store.save(withDraft(current, draft, input.kind, input.now, input.kind, 'recorded'));
	return { ok: true, state: 'recorded' };
}

export function correctDraft(store: PilotStore, input: { now: string; summary: string }): { ok: boolean; state: string } {
	const current = store.load();
	if (!current.draft) return { ok: false, state: 'missing-draft' };
	const version = current.draft.version + 1;
	const next: PilotDraft = {
		...current.draft,
		version,
		summary: input.summary,
		versions: [...current.draft.versions, { version, summary: input.summary, sourceIds: current.draft.sources.filter((source) => !source.removed).map((source) => source.id) }],
	};
	store.save(withDraft(current, next, `correct-${version}`, input.now, 'correction', 'corrected'));
	return { ok: true, state: 'corrected' };
}

export function rollbackDraft(store: PilotStore, input: { now: string; version: number }): { ok: boolean; state: string } {
	const current = store.load();
	const prior = current.draft?.versions.find((item) => item.version === input.version);
	if (!current.draft || !prior) return { ok: false, state: 'rollback-refused' };
	const next: PilotDraft = { ...current.draft, version: prior.version, summary: prior.summary };
	store.save(withDraft(current, next, `rollback-${prior.version}`, input.now, 'rollback', 'restored'));
	return { ok: true, state: 'restored' };
}

export function withdrawDraft(store: PilotStore, now: string): { ok: boolean; state: string } {
	const current = store.load();
	if (!current.draft) return { ok: false, state: 'missing-draft' };
	store.save(withDraft(current, { ...current.draft, withdrawn: true }, 'withdraw', now, 'withdrawal', 'withdrawn'));
	return { ok: true, state: 'withdrawn' };
}

export function refreshDraft(store: PilotStore, input: { now: string; effectiveDate: string }): { ok: boolean; state: string } {
	const current = store.load();
	if (!current.draft || input.effectiveDate <= current.draft.effectiveDate) return { ok: false, state: 'refresh-refused' };
	const version = current.draft.version + 1;
	const summary = `${current.draft.summary} Refreshed ${input.effectiveDate}.`;
	const next: PilotDraft = {
		...current.draft,
		version,
		effectiveDate: input.effectiveDate,
		stale: false,
		summary,
		versions: [...current.draft.versions, { version, summary, sourceIds: current.draft.sources.filter((source) => !source.removed).map((source) => source.id) }],
	};
	store.save(withDraft(current, next, `refresh-${version}`, input.now, 'refresh', 'refreshed'));
	return { ok: true, state: 'refreshed' };
}

export function recordOwnerGate(): { ok: false; state: 'owner-withheld' } {
	return { ok: false, state: 'owner-withheld' };
}

export function pilotGates(draft: PilotDraft | null): Array<{ gate: PilotGate; ok: boolean }> {
	const live = draft?.sources.filter((source) => !source.removed && source.url.startsWith('https://')) ?? [];
	const summary = draft?.summary ?? '';
	return [
		{ gate: 'citation', ok: !!draft && live.length > 0 && live.every((source) => summary.includes(source.id)) },
		{ gate: 'rights', ok: draft?.rights === 'recorded' },
		{ gate: 'freshness', ok: !!draft && /^\d{4}-\d{2}-\d{2}$/.test(draft.effectiveDate) && draft.stale === false },
		{ gate: 'moderation', ok: draft?.moderation === 'clear' },
		{ gate: 'privacy', ok: !!draft && !/policy\s*number|password|ssn/i.test(summary) },
		{ gate: 'editorial', ok: draft?.editorial === true },
		{ gate: 'licensed-review', ok: draft?.licensed === true },
		{ gate: 'owner', ok: false },
	];
}

export function pilotPublication(draft: PilotDraft | null): { eligible: false; indexable: false; sitemap: false; robots: 'noindex, nofollow'; gates: Array<{ gate: PilotGate; ok: boolean }> } {
	const gates = pilotGates(draft);
	const open = PILOT_PUBLICATION_OPEN === true && PILOT_INDEXING_OPEN === true && gates.every((gate) => gate.ok) && draft?.withdrawn !== true;
	void open;
	return { eligible: false, indexable: false, sitemap: false, robots: 'noindex, nofollow', gates };
}

export function presentPilot(state: PilotState, now: string): string {
	const publication = pilotPublication(state.draft);
	const rows = state.accounts.map((item) => {
		const rights = pilotPermissions(item, now);
		return `<tr><td>${escapeHtml(item.email)}</td><td>${escapeHtml(item.role)}</td><td>${item.licenceVerified ? 'yes' : 'no'}</td><td>${item.authorityVerified ? 'yes' : 'no'}</td><td>${rights.professionalContribution ? 'yes' : 'no'}</td><td>${rights.companyResponse ? 'yes' : 'no'}</td></tr>`;
	}).join('');
	const gates = publication.gates.map((gate) => `<li data-gate="${gate.gate}" data-ok="${gate.ok ? 'yes' : 'no'}">${escapeHtml(gate.gate)} ${gate.ok ? 'open' : 'closed'}</li>`).join('');
	const draft = state.draft;
	const dispute = draft?.dispute ? `<p data-dispute="open">${escapeHtml(draft.dispute)}</p>` : '';
	const appeal = draft?.appeal ? `<p data-appeal="open">${escapeHtml(draft.appeal)}</p>` : '';
	const removed = draft?.sources.filter((source) => source.removed).map((source) => `<p data-source-removed="${escapeHtml(source.id)}">Source removed.</p>`).join('') ?? '';
	return `<article class="pilot-record" data-preview-pilot="fixture">
		<p data-signup="closed">Public signup is closed.</p>
		<table><thead><tr><th>Account</th><th>Role</th><th>Licence</th><th>Authority</th><th>Professional contribution</th><th>Company response</th></tr></thead><tbody>${rows}</tbody></table>
		<p data-question="${escapeHtml(draft?.questionId ?? 'fixture-unanswered-wind-deductible')}">Unanswered question.</p>
		<p data-research-draft="true">Research draft. This record is not published.</p>
		${draft ? `<p>${escapeHtml(draft.summary)}</p><p>Effective date ${escapeHtml(draft.effectiveDate)}. Version ${draft.version}.</p>` : ''}
		${dispute}${appeal}${removed}
		<ul>${gates}</ul>
		<p data-publication="closed">Publication is closed. Eligible no. Indexable no.</p>
		<p data-provider-calls="${draft?.providerCalls ?? 0}" data-spend="${draft?.spend ?? 0}">Provider calls ${draft?.providerCalls ?? 0}. Spend ${draft?.spend ?? 0}.</p>
		<p data-observations="${state.observations.length}">Observations ${state.observations.length}.</p>
	</article>`;
}

export function seedPilot(): PilotState {
	const session = { id: 'pilot-session-seed', expiresAt: '2026-09-27T18:00:00.000Z' };
	return {
		accounts: [
			{
				id: 'pilot-consumer',
				email: 'consumer@fixture.invalid',
				role: 'consumer',
				licenceVerified: false,
				authorityVerified: false,
				employmentVerified: false,
				policyVerified: false,
				organizationId: null,
				verifiedAt: '2026-09-27T12:00:00.000Z',
				deletedAt: null,
				session: null,
				signInToken: { id: 'pilot-signin-consumer', expiresAt: '2026-09-27T12:15:00.000Z', used: false },
				recoveryToken: null,
				failures: 0,
				media: null,
			},
			{
				id: 'pilot-professional',
				email: 'professional@fixture.invalid',
				role: 'verified-professional',
				licenceVerified: false,
				authorityVerified: false,
				employmentVerified: false,
				policyVerified: false,
				organizationId: null,
				verifiedAt: '2026-09-27T12:00:00.000Z',
				deletedAt: null,
				session,
				signInToken: null,
				recoveryToken: null,
				failures: 0,
				media: null,
			},
			{
				id: 'pilot-company',
				email: 'company@fixture.invalid',
				role: 'company-representative',
				licenceVerified: false,
				authorityVerified: false,
				employmentVerified: false,
				policyVerified: false,
				organizationId: 'fixture-org',
				verifiedAt: '2026-09-27T12:00:00.000Z',
				deletedAt: null,
				session,
				signInToken: null,
				recoveryToken: null,
				failures: 0,
				media: null,
			},
		],
		draft: null,
		observations: [],
	};
}

export function fixturePilotBoard(): string {
	const now = '2026-09-27T12:05:00.000Z';
	const main = fixturePilotWalk();
	const appeal = memoryPilotStore(seedPilot());
	retrieveEvidence(appeal, now);
	holdAndAppeal(appeal, { now, note: 'Fixture appeal of a held contribution.' });
	const removed = memoryPilotStore(seedPilot());
	retrieveEvidence(removed, now);
	removeSource(removed, { sourceId: 'src-fixture-wind', now });
	const withdrawn = memoryPilotStore(seedPilot());
	retrieveEvidence(withdrawn, now);
	withdrawDraft(withdrawn, now);
	const failure = main.state.observations.some((item) => item.result === 'rate-limited');
	return `${main.html}
		<section data-account-failure="${failure ? 'rate-limited' : 'missing'}"><h2>Account failure and recovery</h2><p>Rate limit recorded. Recovery restored the consumer session.</p></section>
		<section data-appeal-board="open"><h2>Moderation appeal</h2>${presentPilot(appeal.load(), now)}</section>
		<section data-source-removal="src-fixture-wind"><h2>Source removal</h2>${presentPilot(removed.load(), now)}</section>
		<section data-withdrawal="withdrawn"><h2>Withdrawal</h2><p>${withdrawn.load().draft?.withdrawn ? 'Withdrawn.' : ''}</p></section>`;
}

export function fixturePilotWalk(): { state: PilotState; html: string } {
	const store = memoryPilotStore(seedPilot());
	const now = '2026-09-27T12:05:00.000Z';
	requestSignup(store, { email: 'new@fixture.invalid', role: 'consumer', now });
	for (let i = 0; i < PILOT_ABUSE_LIMIT; i += 1) signIn(store, { accountId: 'pilot-consumer', token: 'wrong', now });
	requestRecovery(store, { accountId: 'pilot-consumer', now });
	completeRecovery(store, { accountId: 'pilot-consumer', token: 'pilot-recovery-pilot-consumer', now });
	storePrivateMedia(store, { accountId: 'pilot-consumer', actorId: 'pilot-consumer', byteLength: 32 });
	retrieveEvidence(store, now);
	requestSourceCandidate(store, { now, outage: true });
	disputeDraft(store, { accountId: 'pilot-consumer', now, note: 'The fixture deductible wording is disputed.' });
	reviewDraft(store, { now, reviewerId: 'fixture-reviewer-editor', kind: 'editorial' });
	reviewDraft(store, { now, reviewerId: 'fixture-reviewer-licensed', kind: 'licensed-review' });
	correctDraft(store, { now, summary: 'Corrected fixture summary. Citation src-fixture-wind. It is not a real policy.' });
	rollbackDraft(store, { now, version: 1 });
	refreshDraft(store, { now, effectiveDate: '2026-09-28' });
	const state = store.load();
	return { state, html: presentPilot(state, now) };
}
