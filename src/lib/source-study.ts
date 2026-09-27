/**
 * Source studies and atomic claims (BR-C1).
 *
 * TWO MODELS, ONE RULE: NOTHING HERE IS A SECOND SOURCE OF TRUTH.
 *
 * A source study is a DERIVED reading of a source record that already exists
 * in `src/content/sources` - its publisher, stable URL, title, dates,
 * jurisdiction, authority tier, extracted propositions (the record's own
 * claims, addressed `<source-id>#cN` exactly as the release script publishes
 * them), and its freshness rule. Nothing is stored, nothing is written back,
 * and where the schema genuinely lacks a field - rights, per the B1 evidence
 * contract - the study says `unrecorded` instead of defaulting to something
 * convenient. A study that guessed a rights status would be the exact failure
 * `unavailableFields()` exists to prevent.
 *
 * An atomic claim study is the reviewable unit BR-C2's answers will be
 * assembled from: one proposition, its supporting sources, its conflicting
 * sources, and a fail-closed state fold - review-required, confirmed,
 * disputed, stale - with the same event-sourcing discipline BR-3 proved:
 * pure fold, idempotent by event id, monotonic time, refusals recorded as
 * named problems rather than silent reinterpretation.
 *
 * THE LESSON FROM THE BR-B P1 IS APPLIED HERE FROM THE START. High stakes is
 * a fact about a claim's content, not about where its review happens to
 * stand, so it is carried as a never-cleared flag: no dispute, staleness,
 * refresh, or re-confirmation cycle can launder it away, and publication
 * eligibility for a high-stakes claim is refused until a real licensed
 * reviewer's own event exists. The corpus records zero licensed reviews, so
 * no real high-stakes claim can be eligible today - and this module has no
 * way to change that.
 */
import { claimLocalId, nodeId } from './graph/ids.ts';
import { unavailableFields } from './graph/contract.ts';

/* ------------------------------------------------------------------ */
/* Source studies                                                      */
/* ------------------------------------------------------------------ */

export interface SourceRecordInput {
	id: string;
	data: Record<string, unknown>;
}

/** The authority tiers the schema enforces, strongest claim to weakest. An
 * ordering for reading, never a score: no arithmetic may be done on it. */
export const AUTHORITY_TIERS = ['primary-law', 'regulator', 'standards-body', 'carrier-official', 'secondary'] as const;
export type AuthorityTier = (typeof AUTHORITY_TIERS)[number];

export interface ExtractedProposition {
	/** `<source-id>#cN`, positional and append-only - the published address. */
	address: string;
	text: string;
}

/**
 * Rights are a recorded gap, not a default. The schema carries no rights
 * field (see the B1 evidence contract), so every derived study says
 * `unrecorded` until a deliberate unit closes that gap. `quotationAllowed`
 * below fails closed on it.
 */
export interface RightsNote {
	status: 'recorded' | 'unrecorded';
	note: string;
}

export interface FreshnessRule {
	/** The record's own declared cadence, verbatim prose. Never parsed into a
	 * number, because inventing a threshold from prose would assert a policy
	 * the source never stated. */
	cadence: string;
	lastChecked: string;
	/** 'access' = read once when added; 'recheck' = genuinely returned to. */
	basis: string;
}

export interface SourceStudy {
	sourceId: string;
	/** `birch:source:<id>` - the same address the B1 graph derives. */
	nodeId: string;
	title: string;
	publisher: string;
	/** The stable URL that identifies the document. */
	url: string;
	sourceType: string;
	jurisdiction: string;
	authorityTier: AuthorityTier;
	/** False when the copy read is a reproduction, not the publisher's own. */
	officialHost: boolean;
	dates: {
		published: string | null;
		effective: string | null;
		accessed: string;
	};
	status: string;
	supersededBy: string | null;
	propositions: ExtractedProposition[];
	rights: RightsNote;
	freshness: FreshnessRule;
}

export interface StudyProblem {
	sourceId: string;
	problem: string;
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const refId = (value: unknown): string | null =>
	typeof value === 'string' ? value : typeof value === 'object' && value !== null ? str((value as { id?: unknown }).id) || null : null;

function isAuthorityTier(value: string): value is AuthorityTier {
	return (AUTHORITY_TIERS as readonly string[]).includes(value);
}

export function buildSourceStudies(records: readonly SourceRecordInput[]): { studies: SourceStudy[]; problems: StudyProblem[] } {
	const studies: SourceStudy[] = [];
	const problems: StudyProblem[] = [];

	/* The register is consulted, not assumed: if a later unit closes the
	   rights gap, this constant flips and the test that pins `unrecorded`
	   corpus-wide fails, forcing a deliberate update here. */
	const rightsStillUnavailable = unavailableFields().includes('rightsLicense');

	for (const record of records) {
		const tier = str(record.data.authorityLevel);
		if (!isAuthorityTier(tier)) {
			problems.push({ sourceId: record.id, problem: `authority tier ${JSON.stringify(tier)} is not one the schema enforces` });
			continue;
		}
		const claims = Array.isArray(record.data.claims) ? record.data.claims : [];
		if (!str(record.data.title) || !str(record.data.publisher) || !str(record.data.url) || !str(record.data.jurisdiction)) {
			problems.push({ sourceId: record.id, problem: 'missing title, publisher, url, or jurisdiction' });
			continue;
		}
		studies.push({
			sourceId: record.id,
			nodeId: nodeId('source', record.id),
			title: str(record.data.title),
			publisher: str(record.data.publisher),
			url: str(record.data.url),
			sourceType: str(record.data.sourceType),
			jurisdiction: str(record.data.jurisdiction),
			authorityTier: tier,
			officialHost: record.data.officialHost !== false,
			dates: {
				published: str(record.data.publishedDate) || null,
				effective: str(record.data.effectiveDate) || null,
				accessed: str(record.data.accessedDate),
			},
			status: str(record.data.status),
			supersededBy: refId(record.data.supersededBy),
			propositions: claims.map((text, index) => ({ address: claimLocalId(record.id, index + 1), text: str(text) })),
			rights: rightsStillUnavailable
				? { status: 'unrecorded', note: 'No rights field exists in the schema yet (B1 evidence contract, rightsLicense: gap). Nothing may assume this source is quotable in bulk.' }
				: { status: 'recorded', note: 'The schema now carries rights; update this derivation to read the real field before trusting it.' },
			freshness: {
				cadence: str(record.data.updateCadence),
				lastChecked: str(record.data.lastChecked),
				basis: str(record.data.lastCheckedBasis),
			},
		});
	}

	return { studies, problems };
}

/**
 * Staleness is a policy decision, so the policy must arrive explicitly. With
 * no policy the honest answer is `unknown` - the same non-assertable posture
 * `since: 'unknown'` gets - never a guess parsed out of cadence prose.
 */
export function evaluateFreshness(
	study: Pick<SourceStudy, 'freshness'>,
	asOfIso: string,
	policy?: { staleAfterDays: number },
): 'fresh' | 'stale' | 'unknown' {
	if (!policy || !Number.isFinite(policy.staleAfterDays) || policy.staleAfterDays <= 0) return 'unknown';
	if (!/^\d{4}-\d{2}-\d{2}$/.test(study.freshness.lastChecked) || !/^\d{4}-\d{2}-\d{2}$/.test(asOfIso)) return 'unknown';
	const checked = Date.parse(`${study.freshness.lastChecked}T00:00:00.000Z`);
	const asOf = Date.parse(`${asOfIso}T00:00:00.000Z`);
	if (asOf < checked) return 'unknown';
	const days = (asOf - checked) / 86400000;
	return days > policy.staleAfterDays ? 'stale' : 'fresh';
}

/** Fails closed while rights are unrecorded. Linking and short quotation of
 * government material stay editorial decisions elsewhere; BULK quotation may
 * never be assumed from silence. */
export function quotationAllowed(study: Pick<SourceStudy, 'rights'>): { allowed: boolean; reason: string } {
	if (study.rights.status !== 'recorded') {
		return { allowed: false, reason: 'rights are unrecorded for this source, and silence is not permission' };
	}
	return { allowed: true, reason: 'rights are recorded on the source' };
}

/* ------------------------------------------------------------------ */
/* Atomic claim studies                                                */
/* ------------------------------------------------------------------ */

export const CLAIM_STATES = ['review-required', 'confirmed', 'disputed', 'stale'] as const;
export type ClaimState = (typeof CLAIM_STATES)[number];

export const CLAIM_EVENT_KINDS = [
	/** The study opens: the proposition text, its declared stakes, nothing decided. */
	'opened',
	/** A supporting source is attached, by id. */
	'support-added',
	/** Two sources disagree about this claim. Both stay visible forever. */
	'conflict-recorded',
	/** A person resolved one recorded conflict, naming how. Never a deletion. */
	'conflict-resolved',
	/** A person confirmed the claim against its supporting passages. */
	'confirmed',
	/** A person disputed the claim itself. */
	'disputed',
	/** A person narrowed the claim's wording; the study stays open for re-confirmation. */
	'narrowed',
	/** Freshness policy says the supporting reading is too old to rely on. */
	'stale-marked',
	/** The sources were re-read; the claim must be re-confirmed, never auto-confirmed. */
	'refreshed',
	/** A named licensed reviewer recorded a review. Only they may. */
	'licensed-review-recorded',
	/** The claim was superseded by another study. Terminal. */
	'superseded',
] as const;

export type ClaimEventKind = (typeof CLAIM_EVENT_KINDS)[number];

export interface ClaimConflict {
	/** Canonically ordered source pair, so one disagreement is one record. */
	between: [string, string];
	note: string;
	/** Set by conflict-resolved; the conflict itself is never removed. */
	resolution?: { how: 'superseded' | 'narrowed'; note: string; at: string };
}

export interface ClaimEvent {
	/** Unique within the study; applying the same id twice is a no-op. */
	id: string;
	kind: ClaimEventKind;
	at: string;
	actor: 'editor' | 'licensed-reviewer' | 'system';
	note: string;
	/** support-added: the source id. conflict-recorded/resolved: the pair. */
	sourceId?: string;
	between?: [string, string];
	resolutionHow?: 'superseded' | 'narrowed';
	/** opened only: the proposition and its stakes, declared - never inferred. */
	claimRef?: string;
	text?: string;
	stakes?: 'standard' | 'high';
	/** Every fixture event must say so; no live study exists yet. */
	synthetic: boolean;
}

export interface ClaimProblem {
	eventId: string;
	problem: string;
}

export interface ClaimStudySnapshot {
	claimRef: string | null;
	text: string | null;
	state: ClaimState;
	/**
	 * Never cleared once true - the BR-B P1 rule, applied here from the
	 * start: high stakes is a fact about the claim's content, and no
	 * dispute, staleness, refresh, or re-confirmation cycle launders it.
	 */
	highStakes: boolean;
	/** True only when a licensed-reviewer actor recorded a review event. */
	licensedReviewRecorded: boolean;
	supporting: string[];
	conflicts: ClaimConflict[];
	superseded: boolean;
	startedAt: string | null;
	updatedAt: string | null;
	problems: ClaimProblem[];
	appliedEventIds: string[];
}

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export function emptyClaimStudy(): ClaimStudySnapshot {
	return {
		claimRef: null,
		text: null,
		state: 'review-required',
		highStakes: false,
		licensedReviewRecorded: false,
		supporting: [],
		conflicts: [],
		superseded: false,
		startedAt: null,
		updatedAt: null,
		problems: [],
		appliedEventIds: [],
	};
}

function refuse(snapshot: ClaimStudySnapshot, event: ClaimEvent, problem: string): ClaimStudySnapshot {
	return { ...snapshot, problems: [...snapshot.problems, { eventId: event.id, problem }] };
}

function orderedPair(a: string, b: string): [string, string] {
	return a <= b ? [a, b] : [b, a];
}

const conflictKey = (pair: [string, string]) => `${pair[0]}|${pair[1]}`;

/**
 * Apply one event. Pure and fail-closed, like the run machine: a refused
 * event adds a named problem and changes nothing else.
 */
export function applyClaimEvent(snapshot: ClaimStudySnapshot, event: ClaimEvent): ClaimStudySnapshot {
	if (snapshot.appliedEventIds.includes(event.id)) return snapshot;

	if (!(CLAIM_EVENT_KINDS as readonly string[]).includes(event.kind)) {
		return refuse(snapshot, event, `unknown event kind ${JSON.stringify(event.kind)}`);
	}
	if (!ISO_INSTANT.test(event.at)) return refuse(snapshot, event, `event ${event.id} has no ISO timestamp`);
	if (!event.note.trim()) return refuse(snapshot, event, `event ${event.id} has no plain-language note`);
	if (event.synthetic !== true) return refuse(snapshot, event, `event ${event.id} does not declare itself synthetic; no live claim study exists yet`);
	if (snapshot.updatedAt && event.at < snapshot.updatedAt) {
		return refuse(snapshot, event, `event ${event.id} moves time backwards (${event.at} < ${snapshot.updatedAt})`);
	}
	if (snapshot.superseded) return refuse(snapshot, event, 'a superseded claim study accepts no further events');

	if (event.kind === 'opened') {
		if (snapshot.claimRef !== null) return refuse(snapshot, event, 'the study is already open');
		if (!event.claimRef?.trim() || !event.text?.trim()) return refuse(snapshot, event, 'opening a study needs a claim reference and its text');
		if (event.stakes !== 'standard' && event.stakes !== 'high') {
			return refuse(snapshot, event, 'stakes must be declared standard or high at opening; they are never inferred');
		}
	} else if (snapshot.claimRef === null) {
		return refuse(snapshot, event, `${event.kind} arrived before the study was opened`);
	}

	const next: ClaimStudySnapshot = {
		...snapshot,
		supporting: [...snapshot.supporting],
		conflicts: snapshot.conflicts.map((c) => ({ ...c })),
		problems: snapshot.problems,
		appliedEventIds: [...snapshot.appliedEventIds, event.id],
		startedAt: snapshot.startedAt ?? event.at,
		updatedAt: event.at,
	};

	switch (event.kind) {
		case 'opened': {
			next.claimRef = event.claimRef ?? null;
			next.text = event.text ?? null;
			next.highStakes = event.stakes === 'high';
			next.state = 'review-required';
			break;
		}
		case 'support-added': {
			if (!event.sourceId?.trim()) return refuse(snapshot, event, 'support-added needs a source id');
			if (!next.supporting.includes(event.sourceId)) next.supporting.push(event.sourceId);
			break;
		}
		case 'conflict-recorded': {
			if (!event.between || event.between.length !== 2 || event.between[0] === event.between[1]) {
				return refuse(snapshot, event, 'a conflict names two distinct sources');
			}
			const pair = orderedPair(event.between[0], event.between[1]);
			if (!next.conflicts.some((c) => conflictKey(c.between) === conflictKey(pair))) {
				next.conflicts.push({ between: pair, note: event.note });
			}
			next.state = 'disputed';
			break;
		}
		case 'conflict-resolved': {
			if (!event.between) return refuse(snapshot, event, 'conflict-resolved must name the pair it resolves');
			const pair = orderedPair(event.between[0], event.between[1]);
			const found = next.conflicts.find((c) => conflictKey(c.between) === conflictKey(pair));
			if (!found) return refuse(snapshot, event, `no recorded conflict between ${pair[0]} and ${pair[1]}`);
			if (found.resolution) return refuse(snapshot, event, 'that conflict is already resolved; resolutions are not overwritten');
			if (event.resolutionHow !== 'superseded' && event.resolutionHow !== 'narrowed') {
				return refuse(snapshot, event, 'a resolution says how: superseded or narrowed. Dropping a side is not a resolution');
			}
			found.resolution = { how: event.resolutionHow, note: event.note, at: event.at };
			/* Resolving conflicts does not confirm anything: the claim returns
			   to review-required only when every conflict is resolved, and a
			   person must still confirm it. */
			next.state = next.conflicts.every((c) => c.resolution) ? 'review-required' : 'disputed';
			break;
		}
		case 'confirmed': {
			if (event.actor === 'system') return refuse(snapshot, event, 'a system cannot confirm a claim; confirmation is a human reading');
			if (next.supporting.length === 0) return refuse(snapshot, event, 'a claim with no supporting source cannot be confirmed');
			if (next.conflicts.some((c) => !c.resolution)) {
				return refuse(snapshot, event, 'unresolved conflicts stand; confirming over them would average a disagreement away');
			}
			if (next.state === 'stale') return refuse(snapshot, event, 'a stale claim must be refreshed and re-read before re-confirmation');
			next.state = 'confirmed';
			break;
		}
		case 'disputed': {
			if (event.actor === 'system') return refuse(snapshot, event, 'a system cannot dispute a claim; disputes are human readings');
			next.state = 'disputed';
			break;
		}
		case 'narrowed': {
			if (!event.text?.trim()) return refuse(snapshot, event, 'narrowing needs the narrowed wording');
			next.text = event.text;
			next.state = 'review-required';
			break;
		}
		case 'stale-marked': {
			next.state = 'stale';
			break;
		}
		case 'refreshed': {
			if (next.state !== 'stale') return refuse(snapshot, event, 'only a stale claim is refreshed');
			/* Re-reading reopens review; it never restores confirmed. */
			next.state = 'review-required';
			break;
		}
		case 'licensed-review-recorded': {
			if (event.actor !== 'licensed-reviewer') {
				return refuse(snapshot, event, `only a licensed reviewer may record a licensed review; got actor ${event.actor}`);
			}
			next.licensedReviewRecorded = true;
			break;
		}
		case 'superseded': {
			next.superseded = true;
			break;
		}
	}

	/* Set once, never cleared - no later event kind touches it. */
	next.highStakes = snapshot.highStakes || next.highStakes;
	return next;
}

export function reduceClaimStudy(events: readonly ClaimEvent[], from: ClaimStudySnapshot = emptyClaimStudy()): ClaimStudySnapshot {
	let snapshot = from;
	for (const event of events) snapshot = applyClaimEvent(snapshot, event);
	return snapshot;
}

/* ------------------------------------------------------------------ */
/* Publication eligibility                                             */
/* ------------------------------------------------------------------ */

/**
 * Whether a claim study may feed a publishable answer. Fail-closed and
 * enumerated: every blocker is named, so a queue can route it. This is
 * ELIGIBILITY only - publication itself, versioning, and the noindex
 * lifecycle are BR-C3. Rights being unrecorded deliberately does not appear
 * here: the corpus already publishes claims quoting government material, and
 * inventing a new rights blocker in a derivation layer would silently
 * contradict accepted behavior. `quotationAllowed` is where rights fail
 * closed, for the bulk-quotation decision that actually needs them.
 */
export function publicationEligibility(
	snapshot: ClaimStudySnapshot,
	options: { knownSourceIds?: ReadonlySet<string> } = {},
): { eligible: boolean; blockers: string[] } {
	const blockers: string[] = [];
	if (snapshot.claimRef === null) blockers.push('the study was never opened');
	if (snapshot.superseded) blockers.push('the claim is superseded');
	if (snapshot.supporting.length === 0) blockers.push('no supporting source is attached');
	if (options.knownSourceIds) {
		for (const id of snapshot.supporting) {
			if (!options.knownSourceIds.has(id)) blockers.push(`supporting source ${id} is not a known source record`);
		}
	}
	for (const conflict of snapshot.conflicts) {
		if (!conflict.resolution) blockers.push(`unresolved conflict between ${conflict.between[0]} and ${conflict.between[1]}`);
	}
	if (snapshot.state === 'stale') blockers.push('the supporting reading is stale and must be refreshed and re-confirmed');
	if (snapshot.state !== 'confirmed') blockers.push(`the claim is ${snapshot.state}, not confirmed`);
	if (snapshot.highStakes && !snapshot.licensedReviewRecorded) {
		blockers.push('high-stakes claims require a recorded licensed review, and none exists');
	}
	return { eligible: blockers.length === 0, blockers };
}
