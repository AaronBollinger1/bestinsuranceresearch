/**
 * Fixture-backed public-source-candidate adapter (BR-C4).
 *
 * Perplexity, or any later scout, is a lead generator. It is not a source of
 * truth and it cannot publish. This module defaults off, accepts only a
 * fixture payload the caller already holds, and never fetches, never reads a
 * credential, and never emits an indexable page.
 *
 * An unanswered canonical question — Birch's own composeAnswer returned
 * research-required — may become a versioned research draft. The draft is
 * conspicuously unvalidated. Contributor confirms do not erase dissent, and
 * citation, rights, freshness, editorial, and licensed-review gates all have
 * to pass before publication eligibility, which this module does not grant
 * while rights are unrecorded.
 */
import type { CompositionOutcome } from './answer-workflow.ts';
import type { QuestionRegistry } from './question-registry.ts';
import { normalizePerplexitySearchResponse, sanitizeResearchQuery, ResearchProviderError } from './research-provider.ts';
import type { ResearchBrief, ResearchSourceClass } from './research-pipeline.ts';
import { evaluateFreshness, quotationAllowed } from './source-study.ts';

/** Default off. A caller must pass `enabled: true`. The environment is not consulted. */
export const SOURCE_CANDIDATE_ADAPTER_ENABLED = false;

export const PUBLIC_SOURCE_DRAFT_LABEL =
	'public-source draft — not yet validated by a licensed professional.';

export const CANDIDATE_ATTRIBUTION =
	'Retrieved as a public-source candidate from a fixture. This is not a Birch source, not a citation, and not a fact.';

export const RESEARCH_DRAFT_GATES = ['citation', 'rights', 'freshness', 'editorial', 'licensed-review', 'conflict'] as const;
export type ResearchDraftGate = (typeof RESEARCH_DRAFT_GATES)[number];

export interface AdapterLimits {
	maxCostUnits: number;
	spentCostUnits: number;
	maxRequestsPerWindow: number;
	requestsInWindow: number;
}

export interface FixtureProviderPayload {
	fixtureId: string;
	kind: 'candidates' | 'outage' | 'malformed' | 'rate-limited' | 'over-budget';
	costUnits?: number;
	results?: unknown;
	conflicts?: Array<{ between: [string, string]; note: string }>;
	allowedDomains?: string[];
}

export interface SourceCandidate {
	id: string;
	url: string;
	title: string;
	publisher: string;
	accessedOn: string;
	effectiveDate: string | null;
	jurisdiction: string;
	status: 'candidate';
	attribution: string;
	sourceOfTruth: false;
	autoPublish: false;
}

export interface DraftProposition {
	id: string;
	text: string;
	url: string;
	effectiveDate: string | null;
	jurisdiction: string;
	status: 'unvalidated' | 'confirmed' | 'disputed' | 'rejected' | 'superseded';
	supersededBy: string | null;
	dissent: Array<{ at: string; name: string; note: string }>;
	annotations: Array<{ at: string; name: string; credentials: string; disclosures: string; note: string }>;
}

export interface ContributorIdentity {
	name: string;
	credentials: string;
	disclosures: string;
}

export interface ResearchDraftVersion {
	version: number;
	at: string;
	note: string;
	candidates: SourceCandidate[];
	propositions: DraftProposition[];
	conflicts: Array<{ between: [string, string]; note: string; resolution?: { note: string; at: string } }>;
}

export interface ResearchDraftEvent {
	id: string;
	at: string;
	action: 'opened' | 'confirm' | 'dispute' | 'annotate' | 'add-source' | 'reject' | 'supersede' | 'editorial-note' | 'licensed-review' | 'resolve-conflict' | 'rolled-back';
	actor: ContributorIdentity & { role: 'contributor' | 'editor' | 'licensed-reviewer' };
	propositionId?: string;
	note: string;
}

export interface ResearchDraft {
	id: string;
	questionId: string;
	questionText: string;
	query: string;
	label: typeof PUBLIC_SOURCE_DRAFT_LABEL;
	noindex: true;
	sitemapIncluded: false;
	robotsMeta: 'noindex, nofollow';
	indexable: false;
	served: false;
	jurisdiction: string;
	candidates: SourceCandidate[];
	propositions: DraftProposition[];
	conflicts: ResearchDraftVersion['conflicts'];
	versions: ResearchDraftVersion[];
	events: ResearchDraftEvent[];
	editor: { name: string; at: string; note: string } | null;
	licensedReview: { name: string; at: string; note: string } | null;
	currentVersion: number;
}

export interface GateResult {
	gate: ResearchDraftGate;
	ok: boolean;
	reasons: string[];
}

export type AdapterResult =
	| { status: 'disabled' | 'security' | 'privacy' | 'not-canonical' | 'question-mismatch' | 'answered' | 'review-required' | 'rate-limited' | 'over-budget' | 'outage' | 'malformed' | 'no-candidates'; candidates: []; draft: null; reasons: string[] }
	| { status: 'draft'; candidates: SourceCandidate[]; draft: ResearchDraft; reasons: string[] };

const UNRECORDED_RIGHTS = {
	status: 'unrecorded' as const,
	note: 'No rights field exists in the schema yet. Nothing may assume this candidate is quotable.',
};

function closed(status: Exclude<AdapterResult, { status: 'draft' }>['status'], reason: string): AdapterResult {
	return { status, candidates: [], draft: null, reasons: [reason] };
}

function canonicalUrl(raw: string): string | null {
	try {
		const url = new URL(raw);
		if (url.protocol !== 'https:') return null;
		url.hash = '';
		return url.toString();
	} catch {
		return null;
	}
}

export function considerSourceCandidates(input: {
	enabled?: boolean;
	query: string;
	questionId: string;
	registry: QuestionRegistry;
	birchOutcome: CompositionOutcome;
	fixture: FixtureProviderPayload;
	limits: AdapterLimits;
	asOf: string;
	sourceClass?: ResearchSourceClass;
	credential?: string;
}): AdapterResult {
	const enabled = input.enabled ?? SOURCE_CANDIDATE_ADAPTER_ENABLED;
	if (enabled !== true) return closed('disabled', 'The public-source candidate adapter is off.');
	if (input.credential?.trim()) return closed('security', 'A credential was offered. This adapter stores none and contacts no provider.');

	let query: string;
	try {
		query = sanitizeResearchQuery(input.query);
	} catch (error) {
		const reason = error instanceof ResearchProviderError ? error.message : 'The query is not eligible.';
		return closed('privacy', reason);
	}

	const entry = input.registry.byId.get(input.questionId);
	if (!entry) return closed('not-canonical', `${input.questionId} is not a canonical question.`);
	/* Before any fixture is read or normalized. A research-required outcome
	   names the question Birch actually evaluated. */
	const outcomeQuestion = input.birchOutcome.questionId;
	const composedQuestion = input.birchOutcome.status === 'composed' ? input.birchOutcome.answer.questionId : outcomeQuestion;
	if (outcomeQuestion !== input.questionId || composedQuestion !== input.questionId) {
		return closed('question-mismatch', `${outcomeQuestion} is the question Birch evaluated. It is not ${input.questionId}.`);
	}
	if (input.birchOutcome.status === 'composed') return closed('answered', 'Birch already has a composed answer. A provider candidate cannot replace it.');
	if (input.birchOutcome.status === 'review-required') return closed('review-required', 'Birch has evidence that still needs review. The adapter does not fill that gap.');

	if (input.limits.requestsInWindow >= input.limits.maxRequestsPerWindow || input.fixture.kind === 'rate-limited') {
		return closed('rate-limited', 'The fixture rate limit refused this request. No provider was contacted.');
	}
	const cost = input.fixture.costUnits ?? 0;
	if (input.limits.spentCostUnits + cost > input.limits.maxCostUnits || input.fixture.kind === 'over-budget') {
		return closed('over-budget', 'The cost ceiling refused this request. No provider was contacted.');
	}
	if (input.fixture.kind === 'outage') return closed('outage', 'The fixture provider is unavailable. No candidates were invented.');
	if (input.fixture.kind === 'malformed' || !input.fixture.results || typeof input.fixture.results !== 'object') {
		return closed('malformed', 'The fixture response is malformed. No candidates were invented.');
	}

	const jurisdiction = entry.jurisdictions[0] ?? 'national';
	const brief: ResearchBrief = {
		id: input.fixture.fixtureId,
		topic: entry.text,
		jurisdiction,
		asOf: input.asOf,
		requestedSourceClasses: [input.sourceClass ?? 'regulator-guidance'],
		question: entry.text,
	};
	const normalized = normalizePerplexitySearchResponse(input.fixture.results, {
		brief,
		query,
		sourceClass: input.sourceClass ?? 'regulator-guidance',
		allowedDomains: input.fixture.allowedDomains,
	}, `${input.asOf}T00:00:00.000Z`);
	const rows = Array.isArray((input.fixture.results as { results?: unknown }).results)
		? (input.fixture.results as { results: unknown[] }).results
		: [];
	const propositionByUrl = new Map<string, { text: string; effectiveDate: string | null }>();
	for (const row of rows) {
		if (!row || typeof row !== 'object') continue;
		const record = row as Record<string, unknown>;
		const url = canonicalUrl(typeof record.url === 'string' ? record.url : '');
		const text = typeof record.proposition === 'string' ? record.proposition.trim() : '';
		if (!url || !text) continue;
		const effective = typeof record.effectiveDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.effectiveDate) ? record.effectiveDate : null;
		if (!propositionByUrl.has(url)) propositionByUrl.set(url, { text, effectiveDate: effective });
	}

	const candidates: SourceCandidate[] = normalized.sources.map((source) => ({
		id: source.id,
		url: source.url,
		title: source.title,
		publisher: source.publisher,
		accessedOn: source.accessedOn,
		effectiveDate: propositionByUrl.get(source.url)?.effectiveDate ?? null,
		jurisdiction,
		status: 'candidate',
		attribution: CANDIDATE_ATTRIBUTION,
		sourceOfTruth: false,
		autoPublish: false,
	}));
	if (candidates.length === 0) return closed('no-candidates', 'The fixture named no eligible public URL. Nothing was invented.');

	const propositions: DraftProposition[] = candidates.flatMap((candidate) => {
		const extracted = propositionByUrl.get(candidate.url);
		if (!extracted) return [];
		return [{
			id: `${candidate.id}-p1`,
			text: extracted.text,
			url: candidate.url,
			effectiveDate: extracted.effectiveDate,
			jurisdiction,
			status: 'unvalidated' as const,
			supersededBy: null,
			dissent: [],
			annotations: [],
		}];
	});
	const conflicts = (input.fixture.conflicts ?? [])
		.filter((conflict) => conflict.between[0] !== conflict.between[1] && conflict.note.trim())
		.map((conflict) => ({ between: conflict.between, note: conflict.note }));
	const version: ResearchDraftVersion = {
		version: 1,
		at: `${input.asOf}T00:00:00.000Z`,
		note: 'Opened from a fixture payload. No provider was contacted.',
		candidates,
		propositions,
		conflicts,
	};
	const draft: ResearchDraft = {
		id: `draft-${input.questionId}`,
		questionId: input.questionId,
		questionText: entry.text,
		query,
		label: PUBLIC_SOURCE_DRAFT_LABEL,
		noindex: true,
		sitemapIncluded: false,
		robotsMeta: 'noindex, nofollow',
		indexable: false,
		served: false,
		jurisdiction,
		candidates,
		propositions,
		conflicts,
		versions: [version],
		events: [{
			id: `opened-${input.fixture.fixtureId}`,
			at: version.at,
			action: 'opened',
			actor: { name: 'Fixture adapter', credentials: 'none', disclosures: 'Fixture only. No provider credential.', role: 'editor' },
			note: version.note,
		}],
		editor: null,
		licensedReview: null,
		currentVersion: 1,
	};
	return { status: 'draft', candidates, draft, reasons: [PUBLIC_SOURCE_DRAFT_LABEL] };
}

function refuse(draft: ResearchDraft, problem: string): ResearchDraft & { problem: string } {
	return { ...draft, problem };
}

function snapshot(draft: ResearchDraft, at: string, note: string, patch: Partial<ResearchDraft>): ResearchDraft {
	const next: ResearchDraft = {
		...draft,
		...patch,
		noindex: true,
		sitemapIncluded: false,
		robotsMeta: 'noindex, nofollow',
		indexable: false,
		served: false,
		label: PUBLIC_SOURCE_DRAFT_LABEL,
	};
	const version: ResearchDraftVersion = {
		version: draft.currentVersion + 1,
		at,
		note,
		candidates: JSON.parse(JSON.stringify(next.candidates)),
		propositions: JSON.parse(JSON.stringify(next.propositions)),
		conflicts: JSON.parse(JSON.stringify(next.conflicts)),
	};
	return { ...next, versions: [...draft.versions, version], currentVersion: version.version };
}

export function applyDraftAction(draft: ResearchDraft, event: ResearchDraftEvent & { source?: { url: string; title: string; publisher: string; proposition: string; effectiveDate?: string | null } }): ResearchDraft & { problem?: string } {
	if (!event.note.trim()) return refuse(draft, 'A contributor action needs a note.');
	if (!event.actor.name.trim() || !event.actor.credentials.trim() || !event.actor.disclosures.trim()) {
		return refuse(draft, 'A contributor action records identity, credentials, and disclosures.');
	}
	if (draft.events.some((existing) => existing.id === event.id)) return draft;
	const propositions = draft.propositions.map((proposition) => ({ ...proposition, dissent: [...proposition.dissent], annotations: [...proposition.annotations] }));
	const target = propositions.find((proposition) => proposition.id === event.propositionId);

	if (event.action === 'confirm' || event.action === 'dispute' || event.action === 'annotate' || event.action === 'reject' || event.action === 'supersede') {
		if (!target) return refuse(draft, `${event.action} names a proposition on this draft.`);
		if (event.action === 'dispute') {
			target.dissent.push({ at: event.at, name: event.actor.name, note: event.note });
			target.status = 'disputed';
		} else if (event.action === 'annotate') {
			target.annotations.push({ at: event.at, name: event.actor.name, credentials: event.actor.credentials, disclosures: event.actor.disclosures, note: event.note });
		} else if (event.action === 'confirm') {
			target.status = target.dissent.length > 0 ? 'disputed' : 'confirmed';
		} else if (event.action === 'reject') {
			target.status = 'rejected';
		} else if (event.action === 'supersede') {
			target.status = 'superseded';
			target.supersededBy = event.note;
		}
		return snapshot(draft, event.at, event.note, {
			propositions,
			events: [...draft.events, event],
		});
	}

	if (event.action === 'add-source') {
		const url = event.source ? canonicalUrl(event.source.url) : null;
		if (!url || !event.source?.proposition.trim()) return refuse(draft, 'Adding a source needs an https URL and an extracted proposition.');
		if (draft.candidates.some((candidate) => candidate.url === url)) return refuse(draft, 'That URL is already a candidate.');
		const candidate: SourceCandidate = {
			id: `added-${draft.candidates.length + 1}`,
			url,
			title: event.source.title,
			publisher: event.source.publisher,
			accessedOn: event.at.slice(0, 10),
			effectiveDate: event.source.effectiveDate ?? null,
			jurisdiction: draft.jurisdiction,
			status: 'candidate',
			attribution: CANDIDATE_ATTRIBUTION,
			sourceOfTruth: false,
			autoPublish: false,
		};
		propositions.push({
			id: `${candidate.id}-p1`,
			text: event.source.proposition.trim(),
			url,
			effectiveDate: candidate.effectiveDate,
			jurisdiction: draft.jurisdiction,
			status: 'unvalidated',
			supersededBy: null,
			dissent: [],
			annotations: [],
		});
		return snapshot(draft, event.at, event.note, {
			candidates: [...draft.candidates, candidate],
			propositions,
			events: [...draft.events, event],
		});
	}

	if (event.action === 'editorial-note') {
		if (event.actor.role !== 'editor') return refuse(draft, 'An editorial note is an editor action.');
		return snapshot(draft, event.at, event.note, {
			editor: { name: event.actor.name, at: event.at, note: event.note },
			events: [...draft.events, event],
		});
	}
	if (event.action === 'licensed-review') {
		if (event.actor.role !== 'licensed-reviewer') return refuse(draft, 'Licensed review requires a licensed reviewer.');
		return snapshot(draft, event.at, event.note, {
			licensedReview: { name: event.actor.name, at: event.at, note: event.note },
			events: [...draft.events, event],
		});
	}
	if (event.action === 'resolve-conflict') {
		if (event.actor.role !== 'editor') return refuse(draft, 'Resolving a conflict is an editor action.');
		const conflicts = draft.conflicts.map((conflict, index) => index === 0 && !conflict.resolution ? { ...conflict, resolution: { note: event.note, at: event.at } } : conflict);
		return snapshot(draft, event.at, event.note, { conflicts, events: [...draft.events, event] });
	}
	if (event.action === 'rolled-back') return refuse(draft, 'Rollback uses rollbackResearchDraft.');
	return refuse(draft, `Unknown draft action ${event.action}.`);
}

export function rollbackResearchDraft(draft: ResearchDraft, event: ResearchDraftEvent & { restoreVersion: number }): ResearchDraft & { problem?: string } {
	if (event.actor.role === 'contributor') return refuse(draft, 'Rollback is an editor action.');
	const restored = draft.versions.find((version) => version.version === event.restoreVersion);
	if (!restored) return refuse(draft, `Version ${event.restoreVersion} is not in the draft history.`);
	if (restored.version === draft.currentVersion) return refuse(draft, 'Rollback cannot target the current version.');
	return snapshot(draft, event.at, event.note, {
		candidates: JSON.parse(JSON.stringify(restored.candidates)),
		propositions: JSON.parse(JSON.stringify(restored.propositions)),
		conflicts: JSON.parse(JSON.stringify(restored.conflicts)),
		events: [...draft.events, event],
	});
}

export function researchDraftGates(draft: ResearchDraft, asOf: string, policy: { staleAfterDays: number } | null): GateResult[] {
	const active = draft.propositions.filter((proposition) => proposition.status !== 'rejected' && proposition.status !== 'superseded');
	const citation: string[] = [];
	if (active.length === 0) citation.push('No extracted proposition remains.');
	for (const proposition of active) {
		if (!draft.candidates.some((candidate) => candidate.url === proposition.url)) citation.push(`${proposition.id} cites no candidate URL.`);
	}
	const rights = quotationAllowed({ rights: UNRECORDED_RIGHTS });
	const freshnessReasons: string[] = [];
	if (!policy) freshnessReasons.push('No freshness policy is declared.');
	for (const candidate of draft.candidates) {
		const verdict = evaluateFreshness({ freshness: { cadence: 'fixture', lastChecked: candidate.accessedOn, basis: 'access' } }, asOf, policy ?? undefined);
		if (verdict !== 'fresh') freshnessReasons.push(`${candidate.url} is ${verdict}.`);
	}
	const editorial = draft.editor ? [] : ['The draft names no editor.'];
	const licensed = draft.licensedReview ? [] : ['No licensed reviewer has validated this public-source draft.'];
	const conflictReasons = draft.conflicts.filter((conflict) => !conflict.resolution).map((conflict) => `Unresolved conflict between ${conflict.between[0]} and ${conflict.between[1]}.`);
	return [
		{ gate: 'citation', ok: citation.length === 0, reasons: citation },
		{ gate: 'rights', ok: rights.allowed, reasons: rights.allowed ? [] : [rights.reason] },
		{ gate: 'freshness', ok: freshnessReasons.length === 0, reasons: freshnessReasons },
		{ gate: 'editorial', ok: editorial.length === 0, reasons: editorial },
		{ gate: 'licensed-review', ok: licensed.length === 0, reasons: licensed },
		{ gate: 'conflict', ok: conflictReasons.length === 0, reasons: conflictReasons },
	];
}

export function researchDraftPublication(draft: ResearchDraft, asOf: string, policy: { staleAfterDays: number } | null): { eligible: boolean; gates: GateResult[]; label: typeof PUBLIC_SOURCE_DRAFT_LABEL } {
	const gates = researchDraftGates(draft, asOf, policy);
	return { eligible: gates.every((gate) => gate.ok), gates, label: draft.label };
}
