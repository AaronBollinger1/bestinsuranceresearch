/**
 * The canonical question and thread registry (BR-2).
 *
 * WHAT THIS IS, AND WHAT IT DELIBERATELY IS NOT
 *
 * Birch already has canonical questions: the records in `src/content/questions`,
 * each with a slug that is also its route and its `birch:question:<slug>` node
 * in the B1 graph. This module does not create a second registry beside them.
 * Every entry here is derived from a question record that already exists, keyed
 * by the id it already has, and a test in scripts/verify-question-registry.mjs
 * holds this registry against the graph's own question nodes so the two can
 * never drift into disagreement.
 *
 * What did not exist before this module:
 *
 *   - a deterministic answer to "is this submission the same question we
 *     already answer?" - exact via normalized wording and declared aliases,
 *     near via reviewable token overlap, never via a model;
 *   - a thread: a typed, append-only discussion and revision container linked
 *     to exactly one canonical question, in which user wording, corrections,
 *     research requests and moderator events are separate records rather than
 *     edits to the canonical question itself;
 *   - the question lifecycle states BR-2 requires, as a fail-closed transition
 *     graph rather than prose.
 *
 * Nothing here writes to disk, calls a network, or mutates a content record.
 * This module has no `node:fs` import on purpose, and the verifier asserts
 * that absence: public question creation stays impossible from this code while
 * PUBLIC_COMMONS_READY is false, because there is no code path that persists.
 */
import { tokenize } from './retrieval.ts';
import { canonicalLine } from './lines.ts';
import { nodeId } from './graph/ids.ts';

/* ------------------------------------------------------------------ */
/* Lifecycle: the states a question record moves through               */
/* ------------------------------------------------------------------ */

/**
 * Record states. These describe the question itself, and only these are ever
 * persisted. `answered` means a published answer page exists for the record;
 * it says nothing about licensed review, which is carried by `reviewState`
 * and is a different fact - conflating them is the drift scripts/verify.mjs
 * exists to catch.
 */
export const QUESTION_LIFECYCLE_STATES = [
	'draft',
	'submitted',
	'duplicate-suggested',
	'screening',
	'answered',
	'corrected',
	'archived',
] as const;

export type QuestionLifecycleState = (typeof QUESTION_LIFECYCLE_STATES)[number];

/**
 * Fail-closed transition graph. A state not listed as a target is refused,
 * not coerced. `duplicate-suggested` can return to `submitted` (the reader
 * declines the merge and the submission proceeds on its own intent) or end in
 * `archived` (the reader accepts the merge; the duplicate is retired and the
 * canonical thread carries the history).
 */
const LIFECYCLE_TRANSITIONS: Record<QuestionLifecycleState, readonly QuestionLifecycleState[]> = {
	draft: ['submitted', 'archived'],
	submitted: ['duplicate-suggested', 'screening', 'archived'],
	'duplicate-suggested': ['submitted', 'screening', 'archived'],
	screening: ['answered', 'archived'],
	answered: ['corrected', 'archived'],
	corrected: ['answered', 'archived'],
	archived: [],
};

export function canTransitionQuestion(from: QuestionLifecycleState, to: QuestionLifecycleState): boolean {
	return LIFECYCLE_TRANSITIONS[from].includes(to);
}

export interface QuestionLifecycleEvent {
	state: QuestionLifecycleState;
	actor: 'reader' | 'editor' | 'moderator' | 'system';
	at: string;
	note: string;
}

export interface QuestionLifecycle {
	state: QuestionLifecycleState;
	events: QuestionLifecycleEvent[];
}

export function startQuestionLifecycle(at: string, note: string): QuestionLifecycle {
	return { state: 'draft', events: [{ state: 'draft', actor: 'reader', at, note }] };
}

export function transitionQuestion(
	lifecycle: QuestionLifecycle,
	next: QuestionLifecycleState,
	actor: QuestionLifecycleEvent['actor'],
	note: string,
	at: string,
): QuestionLifecycle {
	if (!canTransitionQuestion(lifecycle.state, next)) {
		throw new Error(`a question cannot move from ${lifecycle.state} to ${next}`);
	}
	if (!note.trim()) throw new Error('a lifecycle transition needs a note');
	return { state: next, events: [...lifecycle.events, { state: next, actor, at, note }] };
}

/* ------------------------------------------------------------------ */
/* View states: what a surface may show, never what a record stores    */
/* ------------------------------------------------------------------ */

export interface QuestionViewState {
	state: 'logged-out' | 'empty' | 'loading' | 'error' | 'offline' | 'permission';
	/** What is true when this state shows. */
	meaning: string;
	/** What a truthful surface says to the reader. */
	readerCopy: string;
	/** View states describe a moment in a session. None may be written to a record. */
	persistable: false;
}

export const QUESTION_VIEW_STATES: readonly QuestionViewState[] = [
	{
		state: 'logged-out',
		meaning: 'No account exists and none can be created while Commons is closed. Reading, matching and duplicate suggestions still work.',
		readerCopy: 'You can read and search every published question without an account. Accounts and public posting are not open yet.',
		persistable: false,
	},
	{
		state: 'empty',
		meaning: 'The reader has not typed anything, or the filter in effect matches no canonical question.',
		readerCopy: 'No question matches yet. Type a question, or clear the filters to browse everything published.',
		persistable: false,
	},
	{
		state: 'loading',
		meaning: 'The local index is still being read. Nothing has been transmitted anywhere.',
		readerCopy: 'Checking the published questions. Your text stays on this device.',
		persistable: false,
	},
	{
		state: 'error',
		meaning: 'The local match failed in a way the page can name. The submission is not lost; nothing was sent.',
		readerCopy: 'Something went wrong reading the question index. Your text is still in the box. Try again, or browse the questions directly.',
		persistable: false,
	},
	{
		state: 'offline',
		meaning: 'The browser reports no connection. Matching is local, so reading and matching still work; anything that would need a network does not.',
		readerCopy: 'You appear to be offline. Published questions already on this page remain readable, and matching runs on this device.',
		persistable: false,
	},
	{
		state: 'permission',
		meaning: 'The action needs a capability the reader does not have: submission while Commons is closed, or a moderator action without the role.',
		readerCopy: 'This action is not available. Public submission is closed until Birch Community opens, and moderation actions need a moderator.',
		persistable: false,
	},
];

/** Public question creation is gated on the same flag that opens Commons. */
export function publicSubmissionOpen(gates: { commonsOpen: boolean }): boolean {
	return gates.commonsOpen === true;
}

/* ------------------------------------------------------------------ */
/* The registry: a view over the question records that already exist   */
/* ------------------------------------------------------------------ */

export interface QuestionRecordInput {
	id: string;
	data: Record<string, unknown>;
}

export interface CanonicalQuestionEntry {
	/** The record's existing slug; also its route and its graph local id. */
	id: string;
	/** `birch:question:<id>`, the same address the B1 graph derives. */
	nodeId: string;
	text: string;
	/** Normalized wording: the exact-duplicate key. */
	normalized: string;
	/** Normalized declared aliases, each an exact-duplicate key too. */
	aliasNormalized: string[];
	/** Two-letter state codes the record declares. Empty means national scope. */
	jurisdictions: string[];
	/** Canonical product lines, resolved through the existing line registry. */
	lines: string[];
	family: string;
	audience: string;
	topics: string[];
	/**
	 * Where the record stands in the lifecycle above. A published record is
	 * `answered` or `corrected`; neither implies licensed review, which stays
	 * in `reviewState`.
	 */
	lifecycle: QuestionLifecycleState;
	reviewState: string;
	freshness: { effectiveDate: string; lastReviewed: string };
}

export interface RegistryProblem {
	code: 'intent-collision' | 'alias-collision' | 'unresolvable-line' | 'bad-record';
	detail: string;
}

export interface QuestionRegistry {
	entries: CanonicalQuestionEntry[];
	byId: Map<string, CanonicalQuestionEntry>;
	problems: RegistryProblem[];
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const strArr = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

export function normalizeQuestion(text: string): string {
	return tokenize(text).join(' ');
}

export function buildQuestionRegistry(records: readonly QuestionRecordInput[]): QuestionRegistry {
	const entries: CanonicalQuestionEntry[] = [];
	const problems: RegistryProblem[] = [];

	for (const record of records) {
		const text = str(record.data.question);
		if (!text) {
			problems.push({ code: 'bad-record', detail: `questions/${record.id} has no question text` });
			continue;
		}
		const lines: string[] = [];
		for (const declared of strArr(record.data.lines)) {
			const line = canonicalLine(declared);
			if (line) {
				if (!lines.includes(line)) lines.push(line);
			} else {
				problems.push({ code: 'unresolvable-line', detail: `questions/${record.id} declares line ${JSON.stringify(declared)}, which does not resolve` });
			}
		}
		const reviewState = str(record.data.reviewState);
		entries.push({
			id: record.id,
			nodeId: nodeId('question', record.id),
			text,
			normalized: normalizeQuestion(text),
			aliasNormalized: strArr(record.data.aliases).map(normalizeQuestion).filter(Boolean),
			jurisdictions: strArr(record.data.states).map((s) => s.toUpperCase()),
			lines,
			family: str(record.data.family),
			audience: str(record.data.audience),
			topics: strArr(record.data.topics),
			lifecycle: reviewState === 'corrected' ? 'corrected' : 'answered',
			reviewState,
			freshness: { effectiveDate: str(record.data.effectiveDate), lastReviewed: str(record.data.lastReviewed) },
		});
	}

	/*
	 * Two records normalizing to the same wording would make exact-duplicate
	 * mapping ambiguous, which is a data defect and is reported rather than
	 * resolved by picking one. Aliases are held to the same rule: an alias may
	 * repeat its own question's wording, never another record's.
	 */
	const byNormalized = new Map<string, string>();
	for (const entry of entries) {
		const previous = byNormalized.get(entry.normalized);
		if (previous && previous !== entry.id) {
			problems.push({ code: 'intent-collision', detail: `${previous} and ${entry.id} normalize to the same wording` });
		} else {
			byNormalized.set(entry.normalized, entry.id);
		}
	}
	for (const entry of entries) {
		for (const alias of entry.aliasNormalized) {
			const owner = byNormalized.get(alias);
			if (owner && owner !== entry.id) {
				problems.push({ code: 'alias-collision', detail: `alias of ${entry.id} collides with the wording of ${owner}` });
			}
		}
	}

	return { entries, byId: new Map(entries.map((e) => [e.id, e])), problems };
}

/* ------------------------------------------------------------------ */
/* Jurisdiction variants and answer references                         */
/* ------------------------------------------------------------------ */

export interface AnswerRef {
	questionId: string;
	/** 'national' where the record declares no state. */
	jurisdiction: string;
	route: string;
}

/**
 * One canonical question per jurisdiction, without URL or claim collisions.
 *
 * The corpus already expresses jurisdiction-specific answers as separate
 * records with distinct slugs, so the route can never collide; what could
 * collide is two records claiming the same jurisdiction for the same intent.
 * The intent key strips the supplied jurisdiction terms from the normalized
 * wording so "who regulates insurance in california" and "... in texas"
 * group together; everything else keeps the full wording.
 */
export function variantKey(entry: CanonicalQuestionEntry, jurisdictionTerms: readonly string[]): string {
	const drop = new Set(jurisdictionTerms.flatMap((term) => tokenize(term)));
	return entry.normalized
		.split(' ')
		.filter((token) => !drop.has(token))
		.join(' ');
}

export function answerRefs(registry: QuestionRegistry): AnswerRef[] {
	const refs: AnswerRef[] = [];
	for (const entry of registry.entries) {
		const jurisdictions = entry.jurisdictions.length > 0 ? entry.jurisdictions : ['national'];
		for (const jurisdiction of jurisdictions) {
			refs.push({ questionId: entry.id, jurisdiction, route: `/questions/${entry.id}` });
		}
	}
	return refs;
}

export interface AnswerCollision {
	key: string;
	detail: string;
}

/**
 * Detects two answers claiming one (intent, jurisdiction) address, and two
 * answer refs claiming one route for different questions. This module never
 * mints claim ids at all - claims stay `<source-id>#cN` positions owned by the
 * source records - so claim collisions cannot originate here, and a test
 * asserts no output of this module matches the claim address shape.
 */
export function answerCollisions(
	registry: QuestionRegistry,
	refs: readonly AnswerRef[],
	jurisdictionTerms: readonly string[],
): AnswerCollision[] {
	const collisions: AnswerCollision[] = [];
	const byIntentAndJurisdiction = new Map<string, string>();
	for (const ref of refs) {
		const entry = registry.byId.get(ref.questionId);
		if (!entry) {
			collisions.push({ key: ref.questionId, detail: `answer ref points at ${ref.questionId}, which is not a canonical question` });
			continue;
		}
		const key = `${variantKey(entry, jurisdictionTerms)}|${ref.jurisdiction}`;
		const previous = byIntentAndJurisdiction.get(key);
		if (previous && previous !== ref.questionId) {
			collisions.push({ key, detail: `${previous} and ${ref.questionId} both answer this intent for ${ref.jurisdiction}` });
		} else {
			byIntentAndJurisdiction.set(key, ref.questionId);
		}
	}
	const byRoute = new Map<string, string>();
	for (const ref of refs) {
		const previous = byRoute.get(ref.route);
		if (previous && previous !== ref.questionId) {
			collisions.push({ key: ref.route, detail: `${previous} and ${ref.questionId} both claim route ${ref.route}` });
		} else {
			byRoute.set(ref.route, ref.questionId);
		}
	}
	return collisions;
}

/* ------------------------------------------------------------------ */
/* Duplicate mapping: exact, then near, then genuinely new             */
/* ------------------------------------------------------------------ */

export interface DuplicateSuggestion {
	id: string;
	text: string;
	/** Jaccard overlap of normalized token sets, 0..1, rounded to 3 places. */
	overlap: number;
	/** Share of the submission's tokens the canonical question contains, 0..1. */
	containment: number;
}

export type SubmissionMapping =
	| { disposition: 'empty' }
	| { disposition: 'rejected'; reason: string }
	| { disposition: 'exact-duplicate'; canonicalId: string; normalized: string }
	| { disposition: 'duplicate-suggested'; suggestions: DuplicateSuggestion[]; normalized: string }
	| { disposition: 'new-intent'; normalized: string };

export const SUBMISSION_MAX_LENGTH = 500;

/**
 * Suggestion thresholds. Deliberately conservative and stated once: a
 * suggestion needs at least three shared informative tokens, and either half
 * the union shared (Jaccard) or three quarters of the submission contained.
 * Below that, claiming "this may be a duplicate" would train readers to
 * ignore the suggestion. The values are pinned by a boundary test.
 */
export const NEAR_DUPLICATE_MIN_SHARED = 3;
export const NEAR_DUPLICATE_JACCARD = 0.5;
export const NEAR_DUPLICATE_CONTAINMENT = 0.75;

export function mapSubmission(
	registry: QuestionRegistry,
	rawText: string,
	options: { maxSuggestions?: number } = {},
): SubmissionMapping {
	const raw = rawText.replace(/\s+/g, ' ').trim();
	if (!raw) return { disposition: 'empty' };
	if (raw.length > SUBMISSION_MAX_LENGTH) {
		return { disposition: 'rejected', reason: `a submission is limited to ${SUBMISSION_MAX_LENGTH} characters` };
	}
	const tokens = tokenize(raw);
	if (tokens.length === 0) return { disposition: 'empty' };
	const normalized = tokens.join(' ');

	for (const entry of registry.entries) {
		if (entry.normalized === normalized || entry.aliasNormalized.includes(normalized)) {
			return { disposition: 'exact-duplicate', canonicalId: entry.id, normalized };
		}
	}

	const submitted = new Set(tokens);
	const suggestions: DuplicateSuggestion[] = [];
	for (const entry of registry.entries) {
		const candidate = new Set(entry.normalized.split(' '));
		let shared = 0;
		for (const token of submitted) if (candidate.has(token)) shared += 1;
		if (shared < NEAR_DUPLICATE_MIN_SHARED) continue;
		const union = submitted.size + candidate.size - shared;
		const jaccard = union === 0 ? 0 : shared / union;
		const containment = submitted.size === 0 ? 0 : shared / submitted.size;
		if (jaccard >= NEAR_DUPLICATE_JACCARD || containment >= NEAR_DUPLICATE_CONTAINMENT) {
			suggestions.push({
				id: entry.id,
				text: entry.text,
				overlap: Math.round(jaccard * 1000) / 1000,
				containment: Math.round(containment * 1000) / 1000,
			});
		}
	}

	if (suggestions.length > 0) {
		/* Deterministic order: strongest overlap first, ties by id, so the same
		   submission always sees the same suggestion list. */
		suggestions.sort((a, b) => b.overlap - a.overlap || (a.id < b.id ? -1 : 1));
		return {
			disposition: 'duplicate-suggested',
			suggestions: suggestions.slice(0, options.maxSuggestions ?? 3),
			normalized,
		};
	}
	return { disposition: 'new-intent', normalized };
}

/* ------------------------------------------------------------------ */
/* Threads: append-only history linked to one canonical question       */
/* ------------------------------------------------------------------ */

export const THREAD_EVENT_KINDS = [
	/** The thread opened, carrying the reader's own wording as a record of its own. */
	'question-created',
	'submitted',
	'duplicate-suggested',
	/** The reader accepted a merge; this thread's history continues on the canonical thread. */
	'merged-into-canonical',
	'screening-started',
	/** A bounded research task was requested; the ref names its deterministic id. */
	'research-requested',
	/** An answer reference was attached. Attaching never edits the canonical question. */
	'answer-linked',
	'correction-recorded',
	'moderator-action',
	'archived',
] as const;

export type ThreadEventKind = (typeof THREAD_EVENT_KINDS)[number];

export interface ThreadEvent {
	/** Deterministic, position-bound: hash of thread id, sequence, kind and time. */
	id: string;
	seq: number;
	kind: ThreadEventKind;
	actor: 'reader' | 'editor' | 'moderator' | 'system' | 'licensed-reviewer';
	at: string;
	note: string;
	/** Ids this event points at: a canonical question, a research task, an answer route. */
	refs: string[];
}

export interface QuestionThread {
	id: string;
	/** Exactly one canonical question or draft id. A thread never spans two. */
	subjectId: string;
	events: ThreadEvent[];
	/** The version is the event count: history is append-only and replayable. */
	version: number;
}

/** FNV-1a, for internal thread and event ids only. Never a published checksum. */
function stableHash(value: string): string {
	let hash = 2166136261;
	for (const character of value) {
		hash ^= character.charCodeAt(0);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(16);
}

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export function createThread(subjectId: string, at: string, note: string): QuestionThread {
	if (!subjectId.trim()) throw new Error('a thread needs a subject');
	if (!ISO_INSTANT.test(at)) throw new Error('a thread event needs an ISO timestamp');
	const id = `thread-${stableHash(subjectId)}`;
	const first: ThreadEvent = {
		id: `evt-${stableHash(`${id}|1|question-created|${at}`)}`,
		seq: 1,
		kind: 'question-created',
		actor: 'reader',
		at,
		note,
		refs: [subjectId],
	};
	return { id, subjectId, events: [first], version: 1 };
}

export function appendThreadEvent(
	thread: QuestionThread,
	event: { kind: ThreadEventKind; actor: ThreadEvent['actor']; at: string; note: string; refs?: string[] },
): QuestionThread {
	if (!THREAD_EVENT_KINDS.includes(event.kind)) throw new Error(`unknown thread event kind ${JSON.stringify(event.kind)}`);
	if (!ISO_INSTANT.test(event.at)) throw new Error('a thread event needs an ISO timestamp');
	if (!event.note.trim()) throw new Error('a thread event needs a note');
	const last = thread.events[thread.events.length - 1];
	if (last && event.at < last.at) throw new Error(`thread events must not move backwards in time (${event.at} < ${last.at})`);
	if (last && (last.kind === 'archived' || last.kind === 'merged-into-canonical')) {
		throw new Error(`a ${last.kind} thread accepts no further events`);
	}
	const seq = thread.events.length + 1;
	const next: ThreadEvent = {
		id: `evt-${stableHash(`${thread.id}|${seq}|${event.kind}|${event.at}`)}`,
		seq,
		kind: event.kind,
		actor: event.actor,
		at: event.at,
		note: event.note,
		refs: event.refs ?? [],
	};
	return { ...thread, events: [...thread.events, next], version: seq };
}

export function threadHistory(thread: QuestionThread): Array<{ version: number; eventId: string; kind: ThreadEventKind; at: string }> {
	return thread.events.map((event) => ({ version: event.seq, eventId: event.id, kind: event.kind, at: event.at }));
}

/* ------------------------------------------------------------------ */
/* Answer linking, and the research-request seam                       */
/* ------------------------------------------------------------------ */

export interface AnswerLink {
	questionId: string;
	jurisdiction: string;
	route: string;
	/** The answer's own review state, carried verbatim. Never defaulted. */
	reviewState: 'reviewed' | 'under-review' | 'corrected';
}

/**
 * Attaching an answer to a thread requires the answer to state its own review
 * state explicitly. An answer without one is refused: silence here is exactly
 * how an unreviewed answer would come to read as reviewed.
 */
export function linkAnswer(thread: QuestionThread, answer: AnswerLink, actor: ThreadEvent['actor'], at: string): QuestionThread {
	if (!['reviewed', 'under-review', 'corrected'].includes(answer.reviewState)) {
		throw new Error('an answer link must carry an explicit review state');
	}
	return appendThreadEvent(thread, {
		kind: 'answer-linked',
		actor,
		at,
		note: `Answer linked for ${answer.jurisdiction}; review state ${answer.reviewState}.`,
		refs: [answer.questionId, answer.route],
	});
}

/**
 * The seam to the existing research desk. This adapts a draft into the input
 * shape `createResearchTask` in src/lib/research-automation.ts already
 * accepts; it does not reimplement the task, its privacy screen, or its
 * transition graph. Requested source classes default to the public-record
 * classes the corpus is built from.
 */
export function toResearchTaskInput(draft: {
	question: string;
	topic: string;
	jurisdiction: string;
	asOf: string;
	candidateId?: string;
}): {
	question: string;
	topic: string;
	jurisdiction: string;
	asOf: string;
	requestedSourceClasses: ('statute' | 'regulation' | 'regulator-guidance' | 'regulator-record')[];
	kind: 'answer-gap';
	candidateId?: string;
} {
	return {
		question: draft.question,
		topic: draft.topic,
		jurisdiction: draft.jurisdiction,
		asOf: draft.asOf,
		requestedSourceClasses: ['statute', 'regulation', 'regulator-guidance', 'regulator-record'],
		kind: 'answer-gap',
		...(draft.candidateId ? { candidateId: draft.candidateId } : {}),
	};
}

/* ------------------------------------------------------------------ */
/* Agreement with the B1 graph                                         */
/* ------------------------------------------------------------------ */

/**
 * The registry must be a view over the same records the graph derives its
 * question nodes from - the two enumerate one set. A question in either that
 * is missing from the other means a second source of truth has appeared,
 * which is the one thing BR-2 was told not to build.
 */
export function registryAgreesWithGraph(
	registry: QuestionRegistry,
	graphNodes: ReadonlyArray<{ id: string; kind: string }>,
): string[] {
	const problems: string[] = [];
	const graphQuestionIds = new Set(graphNodes.filter((n) => n.kind === 'question').map((n) => n.id));
	for (const entry of registry.entries) {
		if (!graphQuestionIds.has(entry.nodeId)) {
			problems.push(`${entry.id} is in the registry but has no ${entry.nodeId} node in the graph`);
		}
	}
	const registryNodeIds = new Set(registry.entries.map((e) => e.nodeId));
	for (const id of graphQuestionIds) {
		if (!registryNodeIds.has(id)) problems.push(`${id} is in the graph but not in the registry`);
	}
	return problems;
}
