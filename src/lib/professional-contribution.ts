/**
 * Professional contributions and company responses (BR-D3).
 *
 * A contribution is a draft until editorial and licensed gates pass, and
 * even then it stays unpublished while Commons is closed. Company responses
 * sit beside the draft. They do not replace it. Referral counts are counts.
 */
export const CONTRIBUTION_PUBLICATION_OPEN: boolean = false;

export interface ContributionSource {
	id: string;
	title: string;
	url: string;
}

export interface ContributionActor {
	name: string;
	credentials: string;
	disclosures: string;
	role: 'contributor' | 'editor' | 'licensed-reviewer' | 'company-representative';
}

export interface ContributionClaim {
	id: string;
	text: string;
	sourceIds: string[];
	status: 'draft' | 'validated' | 'disputed' | 'narrowed' | 'superseded';
	supersededBy: string | null;
	dissent: Array<{ at: string; name: string; note: string }>;
	history: Array<{ at: string; action: string; text: string; note: string }>;
}

export interface ContributionDraft {
	id: string;
	questionId: string;
	author: ContributionActor;
	sources: ContributionSource[];
	claims: ContributionClaim[];
	events: Array<{ id: string; at: string; action: string; claimId?: string; note: string; actor: string }>;
	editorial: { name: string; at: string; note: string } | null;
	licensedReview: { name: string; at: string; note: string } | null;
	indexable: false;
	label: 'contribution draft — not published';
}

export interface CompanyResponse {
	id: string;
	companyId: string;
	questionId: string;
	label: 'Company response';
	author: ContributionActor;
	versions: Array<{ version: number; at: string; text: string; sourceIds: string[] }>;
	contests: Array<{ at: string; by: string; note: string }>;
}

export interface VisibilitySignal {
	contributionId: string;
	referrals: number;
	impressions: number;
	guaranteedRank: null;
	guaranteedCitation: false;
	statement: 'Referrals and impressions are counts. They do not guarantee placement or citation.';
}

const HTTPS = /^https:\/\//;

function actorOk(actor: ContributionActor): boolean {
	return !!actor.name.trim() && !!actor.credentials.trim() && !!actor.disclosures.trim();
}

export function openContribution(input: {
	id: string;
	questionId: string;
	author: ContributionActor;
	sources: ContributionSource[];
	claims: Array<{ id: string; text: string; sourceIds: string[]; dissent?: ContributionClaim['dissent'] }>;
	at: string;
}): { ok: true; draft: ContributionDraft } | { ok: false; problem: string } {
	if (input.author.role !== 'contributor' || !actorOk(input.author)) return { ok: false, problem: 'A contribution names credentials and disclosures.' };
	if (input.claims.length === 0) return { ok: false, problem: 'A contribution needs at least one claim.' };
	const sourceIds = new Set(input.sources.filter((source) => source.title.trim() && HTTPS.test(source.url)).map((source) => source.id));
	if (sourceIds.size === 0) return { ok: false, problem: 'A contribution needs a visible https source.' };
	for (const claim of input.claims) {
		if (!claim.text.trim() || claim.sourceIds.length === 0 || claim.sourceIds.some((id) => !sourceIds.has(id))) {
			return { ok: false, problem: `${claim.id} is not linked to a source on this draft.` };
		}
	}
	const claims: ContributionClaim[] = input.claims.map((claim) => ({
		id: claim.id,
		text: claim.text.trim(),
		sourceIds: [...claim.sourceIds],
		status: 'draft',
		supersededBy: null,
		dissent: [...(claim.dissent ?? [])],
		history: [{ at: input.at, action: 'opened', text: claim.text.trim(), note: 'Opened from the contributor draft.' }],
	}));
	return {
		ok: true,
		draft: {
			id: input.id,
			questionId: input.questionId,
			author: input.author,
			sources: input.sources.map((source) => ({ ...source })),
			claims,
			events: [{ id: `opened-${input.id}`, at: input.at, action: 'opened', note: 'Contribution draft opened. Not published.', actor: input.author.name }],
			editorial: null,
			licensedReview: null,
			indexable: false,
			label: 'contribution draft — not published',
		},
	};
}

export function reviewClaim(draft: ContributionDraft, input: {
	id: string;
	at: string;
	action: 'validate' | 'dispute' | 'narrow' | 'supersede';
	claimId: string;
	actor: ContributionActor;
	note: string;
	text?: string;
	supersededBy?: string;
}): ContributionDraft & { problem?: string } {
	if (!actorOk(input.actor) || !input.note.trim()) return { ...draft, problem: 'A review records the actor and a note.' };
	if (draft.events.some((event) => event.id === input.id)) return draft;
	const claims = draft.claims.map((claim) => ({ ...claim, dissent: [...claim.dissent], history: [...claim.history], sourceIds: [...claim.sourceIds] }));
	const claim = claims.find((item) => item.id === input.claimId);
	if (!claim) return { ...draft, problem: 'That claim is not on this draft.' };
	if (input.action === 'validate') {
		claim.status = claim.dissent.length > 0 ? 'disputed' : 'validated';
		claim.history.push({ at: input.at, action: 'validate', text: claim.text, note: input.note });
	} else if (input.action === 'dispute') {
		claim.dissent.push({ at: input.at, name: input.actor.name, note: input.note });
		claim.status = 'disputed';
		claim.history.push({ at: input.at, action: 'dispute', text: claim.text, note: input.note });
	} else if (input.action === 'narrow') {
		if (!input.text?.trim() || input.text.trim() === claim.text) return { ...draft, problem: 'A narrowing supplies the narrower wording.' };
		claim.history.push({ at: input.at, action: 'narrow', text: claim.text, note: input.note });
		claim.text = input.text.trim();
		claim.status = 'narrowed';
	} else if (input.action === 'supersede') {
		if (!input.supersededBy || input.supersededBy === claim.id || !claims.some((item) => item.id === input.supersededBy)) {
			return { ...draft, problem: 'Supersession names another claim on this draft.' };
		}
		claim.status = 'superseded';
		claim.supersededBy = input.supersededBy;
		claim.history.push({ at: input.at, action: 'supersede', text: claim.text, note: input.note });
	}
	return {
		...draft,
		claims,
		events: [...draft.events, { id: input.id, at: input.at, action: input.action, claimId: claim.id, note: input.note, actor: input.actor.name }],
		indexable: false,
		label: 'contribution draft — not published',
	};
}

export function recordEditorial(draft: ContributionDraft, input: { at: string; actor: ContributionActor; note: string }): ContributionDraft & { problem?: string } {
	if (input.actor.role !== 'editor' || !actorOk(input.actor) || !input.note.trim()) return { ...draft, problem: 'Editorial review is an editor action with a note.' };
	return {
		...draft,
		editorial: { name: input.actor.name, at: input.at, note: input.note },
		events: [...draft.events, { id: `editorial-${input.at}`, at: input.at, action: 'editorial', note: input.note, actor: input.actor.name }],
		indexable: false,
	};
}

export function recordLicensedReview(draft: ContributionDraft, input: { at: string; actor: ContributionActor; note: string }): ContributionDraft & { problem?: string } {
	if (input.actor.role !== 'licensed-reviewer' || !actorOk(input.actor) || !input.note.trim()) {
		return { ...draft, problem: 'Licensed review requires a licensed reviewer.' };
	}
	return {
		...draft,
		licensedReview: { name: input.actor.name, at: input.at, note: input.note },
		events: [...draft.events, { id: `licensed-${input.at}`, at: input.at, action: 'licensed-review', note: input.note, actor: input.actor.name }],
		indexable: false,
	};
}

export function contributionPublication(draft: ContributionDraft, options: { commonsReady: boolean }): { eligible: boolean; indexable: false; sitemapIncluded: false; reasons: string[] } {
	const reasons: string[] = [];
	if (!draft.author.credentials.trim() || !draft.author.disclosures.trim()) reasons.push('credentials or disclosures are missing');
	const active = draft.claims.filter((claim) => claim.status !== 'superseded');
	if (active.length === 0 || active.some((claim) => claim.sourceIds.length === 0)) reasons.push('a claim is missing its source');
	if (draft.claims.some((claim) => claim.status === 'disputed')) reasons.push('a dissent is still open');
	if (!draft.editorial) reasons.push('editorial review is missing');
	if (!draft.licensedReview) reasons.push('licensed review is missing');
	if (options.commonsReady !== true || CONTRIBUTION_PUBLICATION_OPEN !== true) reasons.push('PUBLIC_COMMONS_READY is false');
	return { eligible: false, indexable: false, sitemapIncluded: false, reasons };
}

export function addCompanyResponse(input: {
	id: string;
	companyId: string;
	questionId: string;
	author: ContributionActor;
	text: string;
	sourceIds: string[];
	at: string;
	independentClaimIds: string[];
	claims: ContributionClaim[];
}): { ok: true; response: CompanyResponse; claims: ContributionClaim[] } | { ok: false; problem: string } {
	if (input.author.role !== 'company-representative' || !actorOk(input.author)) return { ok: false, problem: 'A company response names the representative and the disclosures.' };
	if (!input.text.trim() || input.sourceIds.length === 0) return { ok: false, problem: 'A company response is sourced.' };
	const before = input.claims.map((claim) => claim.text);
	const response: CompanyResponse = {
		id: input.id,
		companyId: input.companyId,
		questionId: input.questionId,
		label: 'Company response',
		author: input.author,
		versions: [{ version: 1, at: input.at, text: input.text.trim(), sourceIds: [...input.sourceIds] }],
		contests: [],
	};
	const after = input.claims.map((claim) => claim.text);
	if (before.join('\n') !== after.join('\n')) return { ok: false, problem: 'A company response must not change independent claims.' };
	return { ok: true, response, claims: input.claims };
}

export function reviseCompanyResponse(response: CompanyResponse, input: { at: string; text: string; sourceIds: string[]; actor: ContributionActor }): CompanyResponse & { problem?: string } {
	if (input.actor.name !== response.author.name || !input.text.trim()) return { ...response, problem: 'Only the named representative can version this response.' };
	return {
		...response,
		versions: [...response.versions, { version: response.versions.length + 1, at: input.at, text: input.text.trim(), sourceIds: [...input.sourceIds] }],
	};
}

export function contestCompanyResponse(response: CompanyResponse, input: { at: string; by: string; note: string }): CompanyResponse & { problem?: string } {
	if (!input.note.trim() || !input.by.trim()) return { ...response, problem: 'A contest names who raised it and why.' };
	return { ...response, contests: [...response.contests, { at: input.at, by: input.by, note: input.note }], versions: response.versions };
}

export function visibilitySignal(contributionId: string): VisibilitySignal {
	return {
		contributionId,
		referrals: 0,
		impressions: 0,
		guaranteedRank: null,
		guaranteedCitation: false,
		statement: 'Referrals and impressions are counts. They do not guarantee placement or citation.',
	};
}

export function recordSignal(signal: VisibilitySignal, kind: 'referral' | 'impression'): VisibilitySignal {
	return {
		...signal,
		referrals: signal.referrals + (kind === 'referral' ? 1 : 0),
		impressions: signal.impressions + (kind === 'impression' ? 1 : 0),
		guaranteedRank: null,
		guaranteedCitation: false,
	};
}
