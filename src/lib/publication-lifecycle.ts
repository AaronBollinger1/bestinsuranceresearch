/**
 * Draft, review, publish, version, correction, and refresh (BR-C3).
 *
 * A publication is a fold over an append-only event log. The answer inside
 * it is whatever BR-C2's composeAnswer returns for the assembly on that
 * event. This module does not write sentences, relax a gate, or mount a
 * route. `published` here is a recorded state. Whether that state may be
 * served, indexed, sitemapped, or redirected is a separate contract, and
 * the contract stays closed unless the caller passes both a production
 * posture and commonsReady. This file never reads PUBLIC_COMMONS_READY.
 *
 * Rollback restores an earlier version's evidence and sends the record
 * back through review when a later stakes ratchet would otherwise republish
 * wording the restored version did not carry. Nothing is deleted.
 */
import { composeAnswer, topicForcesHighStakes, type AnswerAssembly, type CompositionOutcome } from './answer-workflow.ts';
import type { QuestionRegistry } from './question-registry.ts';

export const PUBLICATION_STATES = [
	'draft',
	'under-review',
	'approved',
	'published',
	'corrected',
	'superseded',
	'stale',
	'withdrawn',
] as const;

export type PublicationState = (typeof PUBLICATION_STATES)[number];

export const PUBLICATION_EVENT_KINDS = [
	'opened',
	'submitted-for-review',
	'approved',
	'returned',
	'published',
	'corrected',
	'marked-stale',
	'refreshed',
	'superseded',
	'withdrawn',
	'rolled-back',
] as const;

export type PublicationEventKind = (typeof PUBLICATION_EVENT_KINDS)[number];

/** States an event may move. `opened` is the only entry, from an empty record. */
export const PUBLICATION_TRANSITIONS: Record<PublicationEventKind, readonly PublicationState[]> = {
	opened: [],
	'submitted-for-review': ['draft'],
	approved: ['under-review'],
	returned: ['under-review', 'approved'],
	published: ['approved'],
	corrected: ['published', 'corrected'],
	'marked-stale': ['published', 'corrected'],
	refreshed: ['stale'],
	superseded: ['published', 'corrected', 'stale'],
	withdrawn: ['draft', 'under-review', 'approved', 'published', 'corrected', 'stale', 'superseded'],
	'rolled-back': ['draft', 'under-review', 'approved', 'published', 'corrected', 'stale', 'superseded', 'withdrawn'],
};

export const FORBIDDEN_SCHEMA_TYPES = ['FAQPage', 'ClaimReview', 'Rating', 'Review', 'Offer'] as const;

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
const HUMAN = new Set(['editor', 'licensed-reviewer']);

export interface PublicationEvent {
	id: string;
	kind: PublicationEventKind;
	at: string;
	actor: 'editor' | 'licensed-reviewer' | 'system';
	note: string;
	synthetic: boolean;
	/** opened only: the stable id of this publication record. */
	publicationId?: string;
	/** Assembly BR-C2 will compose. Required on opened, corrected, and refreshed. */
	assembly?: AnswerAssembly;
	successorId?: string;
	restoreVersion?: number;
	/** YYYY-MM-DD. Required when a system marks the record stale. */
	asOf?: string;
}

export interface PublicationProblem {
	eventId: string;
	problem: string;
}

export interface RecordedPublicationEvent {
	id: string;
	kind: PublicationEventKind;
	at: string;
	actor: PublicationEvent['actor'];
	note: string;
	version: number;
}

export interface PublicationVersion {
	version: number;
	at: string;
	state: PublicationState;
	eventId: string;
	note: string;
	outcome: CompositionOutcome;
	assembly: AnswerAssembly;
	successorId: string | null;
	highStakes: boolean;
	scheduleAnchor: string | null;
	staleAfterDays: number | null;
}

export interface PublicationSnapshot {
	id: string | null;
	opened: boolean;
	state: PublicationState;
	highStakes: boolean;
	successorId: string | null;
	outcome: CompositionOutcome | null;
	assembly: AnswerAssembly | null;
	scheduleAnchor: string | null;
	staleAfterDays: number | null;
	versions: PublicationVersion[];
	events: RecordedPublicationEvent[];
	problems: PublicationProblem[];
	appliedEventIds: string[];
	updatedAt: string | null;
	currentVersion: number;
}

export function emptyPublication(): PublicationSnapshot {
	return {
		id: null,
		opened: false,
		state: 'draft',
		highStakes: false,
		successorId: null,
		outcome: null,
		assembly: null,
		scheduleAnchor: null,
		staleAfterDays: null,
		versions: [],
		events: [],
		problems: [],
		appliedEventIds: [],
		updatedAt: null,
		currentVersion: 0,
	};
}

function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function refuse(snapshot: PublicationSnapshot, event: PublicationEvent, problem: string): PublicationSnapshot {
	return { ...snapshot, problems: [...snapshot.problems, { eventId: event.id, problem }] };
}

function dateOf(instant: string): string {
	return instant.slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
	const start = Date.parse(`${isoDate}T00:00:00.000Z`);
	return new Date(start + days * 86400000).toISOString().slice(0, 10);
}

function stakesOf(assembly: AnswerAssembly, previous: boolean): boolean {
	return previous || topicForcesHighStakes(assembly.topics) || assembly.claims.some((claim) => claim.highStakes);
}

function composed(outcome: CompositionOutcome): outcome is Extract<CompositionOutcome, { status: 'composed' }> {
	return outcome.status === 'composed' && outcome.gates.every((gate) => gate.ok);
}

function human(event: PublicationEvent): boolean {
	return HUMAN.has(event.actor);
}

function baseChecks(snapshot: PublicationSnapshot, event: PublicationEvent): string | null {
	if (snapshot.appliedEventIds.includes(event.id)) return null;
	if (!(PUBLICATION_EVENT_KINDS as readonly string[]).includes(event.kind)) return `unknown event kind ${JSON.stringify(event.kind)}`;
	if (!ISO_INSTANT.test(event.at)) return `event ${event.id} has no ISO timestamp`;
	if (!event.note.trim()) return `event ${event.id} has no plain-language note`;
	if (event.synthetic !== true) return `event ${event.id} does not declare itself synthetic; no live publication exists yet`;
	if (snapshot.updatedAt && event.at <= snapshot.updatedAt) return `event ${event.id} does not move time forward (${event.at} <= ${snapshot.updatedAt})`;
	return null;
}

function recompose(snapshot: PublicationSnapshot, event: PublicationEvent, registry: QuestionRegistry, assembly: AnswerAssembly | undefined): CompositionOutcome | PublicationSnapshot {
	const source = assembly ?? snapshot.assembly;
	if (!source) return refuse(snapshot, event, `${event.kind} needs the assembly BR-C2 composes`);
	return composeAnswer(source, registry);
}

export function applyPublicationEvent(snapshot: PublicationSnapshot, event: PublicationEvent, registry: QuestionRegistry): PublicationSnapshot {
	if (snapshot.appliedEventIds.includes(event.id)) return snapshot;
	const basic = baseChecks(snapshot, event);
	if (basic) return refuse(snapshot, event, basic);

	if (event.kind === 'opened') {
		if (snapshot.opened) return refuse(snapshot, event, 'the publication is already open');
		if (!event.publicationId || !SLUG.test(event.publicationId)) return refuse(snapshot, event, 'opening a publication needs a lowercase slug id');
		if (!human(event)) return refuse(snapshot, event, 'a system cannot open a publication');
		if (!event.assembly) return refuse(snapshot, event, 'opening a publication needs the assembly BR-C2 composes');
		const outcome = composeAnswer(event.assembly, registry);
		return commit(snapshot, event, {
			id: event.publicationId,
			opened: true,
			state: 'draft',
			outcome,
			assembly: event.assembly,
			highStakes: stakesOf(event.assembly, false),
			successorId: null,
			scheduleAnchor: null,
			staleAfterDays: null,
		});
	}

	if (!snapshot.opened || !snapshot.id) return refuse(snapshot, event, `${event.kind} arrived before the publication was opened`);
	if (event.kind !== 'rolled-back' && !PUBLICATION_TRANSITIONS[event.kind].includes(snapshot.state)) {
		return refuse(snapshot, event, `a publication cannot ${event.kind} from ${snapshot.state}`);
	}

	switch (event.kind) {
		case 'submitted-for-review':
		case 'approved':
		case 'published': {
			if (!human(event)) return refuse(snapshot, event, `a system cannot ${event.kind}`);
			const outcome = recompose(snapshot, event, registry, event.assembly);
			if ('problems' in outcome) return outcome;
			if (!composed(outcome)) return refuse(snapshot, event, `${event.kind} requires a composed answer; BR-C2 returned ${outcome.status}`);
			const assembly = event.assembly ?? snapshot.assembly;
			if (!assembly) return refuse(snapshot, event, `${event.kind} has no assembly`);
			const highStakes = stakesOf(assembly, snapshot.highStakes);
			if (event.kind === 'approved' && highStakes && event.actor !== 'licensed-reviewer') {
				return refuse(snapshot, event, 'high-stakes approval requires a licensed reviewer');
			}
			const nextState: PublicationState = event.kind === 'submitted-for-review' ? 'under-review' : event.kind === 'approved' ? 'approved' : 'published';
			const scheduling = nextState === 'published'
				? { scheduleAnchor: dateOf(event.at), staleAfterDays: assembly.freshnessPolicy?.staleAfterDays ?? null }
				: { scheduleAnchor: snapshot.scheduleAnchor, staleAfterDays: snapshot.staleAfterDays };
			if (nextState === 'published' && scheduling.staleAfterDays == null) {
				return refuse(snapshot, event, 'publication requires the assembly freshness policy');
			}
			return commit(snapshot, event, {
				state: nextState,
				outcome,
				assembly,
				highStakes,
				...scheduling,
			});
		}
		case 'returned': {
			if (!human(event)) return refuse(snapshot, event, 'a system cannot return a publication to draft');
			return commit(snapshot, event, { state: 'draft' });
		}
		case 'corrected':
		case 'refreshed': {
			if (!human(event)) return refuse(snapshot, event, `a system cannot ${event.kind}`);
			if (!event.assembly) return refuse(snapshot, event, `${event.kind} carries the assembly it moves to`);
			const outcome = composeAnswer(event.assembly, registry);
			if (!composed(outcome)) return refuse(snapshot, event, `${event.kind} requires a composed answer; BR-C2 returned ${outcome.status}`);
			const highStakes = stakesOf(event.assembly, snapshot.highStakes);
			if (highStakes && event.actor !== 'licensed-reviewer') {
				return refuse(snapshot, event, `high-stakes ${event.kind} requires a licensed reviewer`);
			}
			const nextState: PublicationState = event.kind === 'corrected' ? 'corrected' : 'under-review';
			return commit(snapshot, event, {
				state: nextState,
				outcome,
				assembly: event.assembly,
				highStakes,
				scheduleAnchor: nextState === 'corrected' ? dateOf(event.at) : null,
				staleAfterDays: nextState === 'corrected' ? event.assembly.freshnessPolicy?.staleAfterDays ?? null : null,
				successorId: null,
			});
		}
		case 'marked-stale': {
			if (event.actor === 'system') {
				if (!event.asOf || !ISO_DATE.test(event.asOf)) return refuse(snapshot, event, 'a system staleness mark needs an asOf date');
				const due = nextDue(snapshot);
				if (!due || event.asOf <= due) return refuse(snapshot, event, `the freshness schedule is not due on ${event.asOf}`);
			} else if (!human(event)) {
				return refuse(snapshot, event, 'staleness is marked by an editor or, once due, by the system');
			}
			return commit(snapshot, event, { state: 'stale' });
		}
		case 'superseded': {
			if (!human(event)) return refuse(snapshot, event, 'a system cannot supersede a publication');
			if (!event.successorId || !SLUG.test(event.successorId)) return refuse(snapshot, event, 'supersession names the successor slug');
			if (event.successorId === snapshot.id) return refuse(snapshot, event, 'a publication cannot succeed itself');
			return commit(snapshot, event, { state: 'superseded', successorId: event.successorId });
		}
		case 'withdrawn': {
			if (!human(event)) return refuse(snapshot, event, 'a system cannot withdraw a publication');
			return commit(snapshot, event, { state: 'withdrawn', successorId: null });
		}
		case 'rolled-back': {
			if (!human(event)) return refuse(snapshot, event, 'a system cannot roll a publication back');
			if (!Number.isInteger(event.restoreVersion)) return refuse(snapshot, event, 'rollback names the version it restores');
			const restored = snapshot.versions.find((version) => version.version === event.restoreVersion);
			if (!restored) return refuse(snapshot, event, `version ${event.restoreVersion} is not in the history`);
			if (restored.version === snapshot.currentVersion) return refuse(snapshot, event, 'rollback cannot target the current version');
			const outcome = composeAnswer(restored.assembly, registry);
			const publicState = restored.state === 'published' || restored.state === 'corrected';
			if (publicState && !composed(outcome)) {
				return refuse(snapshot, event, 'the restored evidence no longer passes the answer gates');
			}
			const highStakes = snapshot.highStakes || restored.highStakes;
			const stakesRose = highStakes && !restored.highStakes;
			const state: PublicationState = stakesRose && (publicState || restored.state === 'approved') ? 'under-review' : restored.state;
			return commit(snapshot, event, {
				state,
				outcome: composed(outcome) ? outcome : restored.outcome,
				assembly: restored.assembly,
				highStakes,
				successorId: state === 'superseded' ? restored.successorId : null,
				scheduleAnchor: state === 'published' || state === 'corrected' ? restored.scheduleAnchor : null,
				staleAfterDays: state === 'published' || state === 'corrected' ? restored.staleAfterDays : null,
			});
		}
		default:
			return refuse(snapshot, event, `unknown event kind ${JSON.stringify(event.kind)}`);
	}
}

function commit(
	snapshot: PublicationSnapshot,
	event: PublicationEvent,
	patch: Partial<PublicationSnapshot> & { state: PublicationState },
): PublicationSnapshot {
	const versionNumber = snapshot.currentVersion + 1;
	const assembly = patch.assembly ?? snapshot.assembly;
	const outcome = patch.outcome ?? snapshot.outcome;
	if (!assembly || !outcome) return refuse(snapshot, event, 'the publication has no assembly to version');
	const version: PublicationVersion = {
		version: versionNumber,
		at: event.at,
		state: patch.state,
		eventId: event.id,
		note: event.note,
		outcome: clone(outcome),
		assembly: clone(assembly),
		successorId: patch.successorId === undefined ? snapshot.successorId : patch.successorId,
		highStakes: patch.highStakes ?? snapshot.highStakes,
		scheduleAnchor: patch.scheduleAnchor === undefined ? snapshot.scheduleAnchor : patch.scheduleAnchor,
		staleAfterDays: patch.staleAfterDays === undefined ? snapshot.staleAfterDays : patch.staleAfterDays,
	};
	return {
		...snapshot,
		id: patch.id ?? snapshot.id,
		opened: patch.opened ?? snapshot.opened,
		state: version.state,
		highStakes: version.highStakes,
		successorId: version.successorId,
		outcome: version.outcome,
		assembly: version.assembly,
		scheduleAnchor: version.scheduleAnchor,
		staleAfterDays: version.staleAfterDays,
		versions: [...snapshot.versions, version],
		events: [...snapshot.events, { id: event.id, kind: event.kind, at: event.at, actor: event.actor, note: event.note, version: versionNumber }],
		appliedEventIds: [...snapshot.appliedEventIds, event.id],
		updatedAt: event.at,
		currentVersion: versionNumber,
	};
}

export function reducePublication(events: readonly PublicationEvent[], registry: QuestionRegistry): PublicationSnapshot {
	let snapshot = emptyPublication();
	for (const event of events) snapshot = applyPublicationEvent(snapshot, event, registry);
	return snapshot;
}

function nextDue(snapshot: Pick<PublicationSnapshot, 'scheduleAnchor' | 'staleAfterDays'>): string | null {
	if (!snapshot.scheduleAnchor || snapshot.staleAfterDays == null) return null;
	if (!ISO_DATE.test(snapshot.scheduleAnchor) || !Number.isFinite(snapshot.staleAfterDays) || snapshot.staleAfterDays <= 0) return null;
	return addDays(snapshot.scheduleAnchor, snapshot.staleAfterDays);
}

export interface PublicationContract {
	state: PublicationState | 'unopened';
	indexable: boolean;
	sitemapIncluded: boolean;
	robotsMeta: 'index, follow' | 'noindex, nofollow';
	canonical: string | null;
	redirect: { to: string; status: 301 } | null;
	emitRedirect: boolean;
	httpStatus: 200 | 301 | 410 | null;
	served: boolean;
	schema: { '@type': 'QAPage'; mainEntity: string; citationCount: number; version: number; dateModified: string } | null;
	provenance: {
		publicationId: string | null;
		state: PublicationState | 'unopened';
		version: number;
		questionId: string | null;
		jurisdiction: string | null;
		audience: string | null;
		sentences: Array<{ text: string; claimRef: string; sourceIds: string[] }>;
		corrections: Array<{ claimRef: string; at: string; note: string; was: string; now: string }>;
		conflicts: Array<{ claimRef: string; between: [string, string]; note: string; resolution?: { how: string; note: string; at: string } }>;
		uncertainty: string[];
		versions: Array<{ version: number; at: string; state: PublicationState; eventId: string; note: string }>;
		events: RecordedPublicationEvent[];
	};
	refresh: { status: 'unscheduled' | 'not-due' | 'due'; nextDue: string | null };
	reasons: string[];
}

export function publicationContract(
	snapshot: PublicationSnapshot,
	options: { commonsReady: boolean; posture: 'preview' | 'production'; origin: string; asOf: string },
): PublicationContract {
	const origin = options.origin.replace(/\/$/, '');
	const path = snapshot.id ? `${origin}/answers/${snapshot.id}` : null;
	const due = nextDue(snapshot);
	const refreshStatus = snapshot.state === 'stale'
		? 'due'
		: due == null
			? 'unscheduled'
			: options.asOf > due
				? 'due'
				: 'not-due';
	const provenance = provenanceOf(snapshot);
	const closed: PublicationContract = {
		state: snapshot.opened ? snapshot.state : 'unopened',
		indexable: false,
		sitemapIncluded: false,
		robotsMeta: 'noindex, nofollow',
		canonical: null,
		redirect: null,
		emitRedirect: false,
		httpStatus: null,
		served: false,
		schema: null,
		provenance,
		refresh: { status: snapshot.opened ? refreshStatus : 'unscheduled', nextDue: due },
		reasons: [],
	};
	if (!snapshot.opened || !snapshot.id || !path) {
		closed.reasons.push('the publication has not been opened');
		return closed;
	}
	if (!options.commonsReady) closed.reasons.push('PUBLIC_COMMONS_READY is false; this answer lifecycle is not served or indexed');
	if (options.posture !== 'production') closed.reasons.push('preview posture is noindex');
	const eligible = options.commonsReady === true && options.posture === 'production';
	if (!eligible) return closed;

	if (snapshot.state === 'superseded' && snapshot.successorId) {
		const to = `${origin}/answers/${snapshot.successorId}`;
		return {
			...closed,
			reasons: ['superseded answers redirect and stay out of the index'],
			served: true,
			httpStatus: 301,
			redirect: { to, status: 301 },
			emitRedirect: true,
			canonical: to,
		};
	}
	if (snapshot.state === 'withdrawn') {
		return { ...closed, reasons: ['a withdrawn answer is gone and stays out of the index'], served: true, httpStatus: 410 };
	}
	if (snapshot.state === 'stale') {
		return { ...closed, reasons: ['a stale answer stays readable and noindex until it is refreshed and reviewed'], served: true, httpStatus: 200 };
	}
	if ((snapshot.state === 'published' || snapshot.state === 'corrected') && refreshStatus === 'due') {
		return {
			...closed,
			reasons: ['the freshness schedule is due; the answer stays noindex until it is refreshed and reviewed'],
			served: true,
			httpStatus: 200,
		};
	}
	if (snapshot.state === 'published' || snapshot.state === 'corrected') {
		const answer = snapshot.outcome && snapshot.outcome.status === 'composed' ? snapshot.outcome.answer : null;
		if (!answer) {
			closed.reasons.push('the recorded outcome is not a composed answer');
			return closed;
		}
		const citationCount = answer.sentences.reduce((sum, sentence) => sum + sentence.citations.length, 0);
		return {
			...closed,
			reasons: [],
			indexable: true,
			sitemapIncluded: true,
			robotsMeta: 'index, follow',
			canonical: path,
			served: true,
			httpStatus: 200,
			schema: {
				'@type': 'QAPage',
				mainEntity: answer.questionId,
				citationCount,
				version: snapshot.currentVersion,
				dateModified: dateOf(snapshot.updatedAt ?? snapshot.versions.at(-1)?.at ?? options.asOf),
			},
		};
	}
	closed.reasons.push(`${snapshot.state} is not a public answer`);
	return closed;
}

function provenanceOf(snapshot: PublicationSnapshot): PublicationContract['provenance'] {
	const answer = snapshot.outcome && snapshot.outcome.status === 'composed' ? snapshot.outcome.answer : null;
	const blocked = snapshot.outcome && snapshot.outcome.status !== 'composed' ? snapshot.outcome : null;
	return {
		publicationId: snapshot.id,
		state: snapshot.opened ? snapshot.state : 'unopened',
		version: snapshot.currentVersion,
		questionId: answer?.questionId ?? snapshot.assembly?.questionId ?? null,
		jurisdiction: answer?.jurisdiction ?? snapshot.assembly?.jurisdiction ?? null,
		audience: answer?.audience ?? snapshot.assembly?.audience ?? null,
		sentences: answer
			? answer.sentences.map((sentence) => ({
				text: sentence.text,
				claimRef: sentence.claimRef,
				sourceIds: sentence.citations.map((citation) => citation.sourceId),
			}))
			: [],
		corrections: answer?.corrections ?? [],
		conflicts: answer?.conflicts ?? [],
		uncertainty: answer?.uncertainty ?? blocked?.uncertainty ?? [],
		versions: snapshot.versions.map((version) => ({
			version: version.version,
			at: version.at,
			state: version.state,
			eventId: version.eventId,
			note: version.note,
		})),
		events: snapshot.events.map((event) => ({ ...event })),
	};
}
