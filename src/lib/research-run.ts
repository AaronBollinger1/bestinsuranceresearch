/**
 * Resumable research runs (BR-3).
 *
 * A run is a fold over an append-only event log, and nothing else. There is
 * no clock in this module, no timer, no percentage, and no invented progress:
 * a snapshot can only say what the recorded events say, with their recorded
 * timestamps and their recorded counts. That is what makes the research
 * animation honest by construction - the surface renders the fold, so it
 * cannot show a state that has no event behind it.
 *
 * This completes the existing research pipeline rather than duplicating it.
 * `src/lib/research-automation.ts` owns the durable editorial task and its
 * privacy screen; this module owns the finer-grained, resumable run a reader
 * watches: which retrieval and verification steps actually happened, in what
 * order, with what counts, and where the run is now waiting. The states here
 * are a superset of the task states for the same reason the verification
 * sheets are finer than the review queue - a reader is owed the step, not
 * the phase.
 *
 * Resumability and idempotency are properties of the fold: reducing a prefix
 * of the log and then the rest gives byte-for-byte the same snapshot as
 * reducing the whole log, and an event applied twice is a no-op keyed on its
 * id. "Resume" is therefore not a recovery mechanism bolted on - it is what
 * reading the log from the top already does.
 *
 * Nothing here writes, fetches, or touches a provider. Live provider calls
 * remain behind src/lib/research-provider.ts and its server-only gate, and
 * no run can mark a real record reviewed: the licensed gate below refuses an
 * approval that no licensed reviewer stands behind.
 */

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

/** Pipeline states: the work a run actually performs, in its honest order. */
export const RUN_PIPELINE_STATES = [
	'queued',
	/** Approved Birch evidence is retrieved first, before any external idea. */
	'birch-retrieval',
	/** The named gap that alone can justify external research. */
	'evidence-gap',
	/** Candidate sources are sought. The only provider-facing state. */
	'source-candidates',
	'authority-check',
	'date-check',
	'jurisdiction-check',
	'claim-mapping',
	/** Two live sources disagree. Both are preserved; nobody averages them. */
	'conflict-found',
	'human-review',
	/** High-stakes language waits here until a real licensed human acts. */
	'licensed-review-required',
	'ready',
	'approved',
	'published',
	'refresh-due',
] as const;

/** Interrupt states: how a run stops, waits, or ends without finishing. */
export const RUN_INTERRUPT_STATES = [
	'paused',
	'provider-unavailable',
	'timeout',
	'cancelled',
	'resumed',
	'stale',
	'blocked',
	'failed',
] as const;

export const RUN_STATES = [...RUN_PIPELINE_STATES, ...RUN_INTERRUPT_STATES] as const;

export type RunState = (typeof RUN_STATES)[number];

const PIPELINE_SET: ReadonlySet<string> = new Set(RUN_PIPELINE_STATES);

export function isRunState(value: string): value is RunState {
	return (RUN_STATES as readonly string[]).includes(value);
}

/** Nothing after these. A cancelled or failed run keeps its history and stops. */
export const TERMINAL_STATES: ReadonlySet<RunState> = new Set<RunState>(['cancelled', 'failed']);

/** Interrupts a run can come back from, via a `resumed` event. */
export const RESUMABLE_STATES: ReadonlySet<RunState> = new Set<RunState>(['paused', 'provider-unavailable', 'timeout']);

/** States in which cancelling is meaningful. */
export const CANCELLABLE_STATES: ReadonlySet<RunState> = new Set<RunState>([
	...RUN_PIPELINE_STATES.filter((s) => s !== 'published' && s !== 'refresh-due'),
	'paused',
	'provider-unavailable',
	'timeout',
	'stale',
	'blocked',
]);

/** States a reader may retry from, by requeueing with history kept. */
export const RETRYABLE_STATES: ReadonlySet<RunState> = new Set<RunState>(['failed', 'blocked', 'stale']);

/**
 * The transition graph, fail-closed. An arrival not listed here is refused
 * with a named problem rather than coerced. Interrupt arrivals are validated
 * separately because they are legal from many states; this table carries the
 * pipeline's own order.
 */
const PIPELINE_TRANSITIONS: Record<string, readonly RunState[]> = {
	queued: ['birch-retrieval'],
	/* Birch evidence may already be sufficient, in which case the run maps
	   claims from it directly and never opens an external phase. */
	'birch-retrieval': ['evidence-gap', 'claim-mapping'],
	'evidence-gap': ['source-candidates'],
	'source-candidates': ['authority-check'],
	'authority-check': ['date-check'],
	'date-check': ['jurisdiction-check'],
	'jurisdiction-check': ['claim-mapping'],
	'claim-mapping': ['conflict-found', 'human-review'],
	'conflict-found': ['human-review'],
	'human-review': ['licensed-review-required', 'ready'],
	'licensed-review-required': ['approved'],
	ready: ['approved'],
	approved: ['published'],
	published: ['refresh-due'],
	'refresh-due': ['queued'],
	/* Recovery arrivals back into the pipeline. */
	stale: ['queued'],
	blocked: ['queued'],
};

/* Where interrupts may arrive from. */
const INTERRUPT_ARRIVALS: Record<string, (from: RunState) => boolean> = {
	paused: (from) => PIPELINE_SET.has(from) && !TERMINAL_STATES.has(from),
	/* Only the provider-facing phase can lose its provider or time out. */
	'provider-unavailable': (from) => from === 'source-candidates' || from === 'evidence-gap',
	timeout: (from) => from === 'source-candidates',
	cancelled: (from) => CANCELLABLE_STATES.has(from),
	resumed: (from) => RESUMABLE_STATES.has(from),
	/* Sources are found stale where dates are actually examined. */
	stale: (from) => from === 'date-check' || from === 'jurisdiction-check',
	blocked: (from) => from === 'human-review' || from === 'conflict-found' || from === 'source-candidates' || from === 'licensed-review-required',
	failed: (from) => PIPELINE_SET.has(from) || RESUMABLE_STATES.has(from),
};

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export interface RunCounts {
	/** Approved Birch evidence passages retrieved. */
	birchEvidence?: number;
	/** Named evidence gaps justifying external research. */
	gaps?: number;
	/** Candidate sources found. Candidates, never verified facts. */
	candidates?: number;
	/** Atomic claims mapped to exact source passages. */
	claims?: number;
	/** Live disagreements preserved, never averaged. */
	conflicts?: number;
}

export interface RunEvent {
	/** Unique within the run. Applying the same id twice is a no-op. */
	id: string;
	state: RunState;
	/** ISO instant. Recorded, never invented by the surface. */
	at: string;
	actor: 'system' | 'editor' | 'licensed-reviewer' | 'reader';
	/** Plain language: what actually happened at this step. */
	note: string;
	counts?: RunCounts;
	/** For `resumed` events: the pipeline state the run returns to. */
	resumeTo?: RunState;
	/** Every fixture event must say so. A surface must disclose it. */
	synthetic: boolean;
}

export interface RunStep {
	state: RunState;
	at: string;
	actor: RunEvent['actor'];
	note: string;
	counts?: RunCounts;
	seq: number;
}

export interface RunProblem {
	eventId: string;
	problem: string;
}

export interface RunSnapshot {
	state: RunState;
	/** The last pipeline state reached, which is where a resume returns to. */
	lastPipelineState: RunState | null;
	steps: RunStep[];
	/** Last known real counts. Absent keys were never reported. */
	counts: RunCounts;
	startedAt: string | null;
	updatedAt: string | null;
	terminal: boolean;
	/** True while the run waits on a human decision no system may take. */
	awaitingHuman: boolean;
	/** True while the run waits on a real licensed reviewer specifically. */
	awaitingLicensedReview: boolean;
	/**
	 * True once the run has EVER entered licensed-review-required, and never
	 * cleared afterwards - not by blocked, not by failure, not by a requeue.
	 * The requirement is a fact about the run's content, not about where the
	 * run happens to be standing, so leaving the waiting state through an
	 * interruption cannot launder it away. Every later approval is held
	 * against this flag (independent Grok 4.7 review, 2026-09-26, P1).
	 */
	licensedReviewEverRequired: boolean;
	canResume: boolean;
	canCancel: boolean;
	canRetry: boolean;
	problems: RunProblem[];
	appliedEventIds: string[];
}

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export function emptyRun(): RunSnapshot {
	return {
		state: 'queued',
		lastPipelineState: null,
		steps: [],
		counts: {},
		startedAt: null,
		updatedAt: null,
		terminal: false,
		awaitingHuman: false,
		awaitingLicensedReview: false,
		licensedReviewEverRequired: false,
		canResume: false,
		canCancel: false,
		canRetry: false,
		problems: [],
		appliedEventIds: [],
	};
}

function refuse(snapshot: RunSnapshot, event: RunEvent, problem: string): RunSnapshot {
	return { ...snapshot, problems: [...snapshot.problems, { eventId: event.id, problem }] };
}

/**
 * Apply one event. Pure, and fail-closed: a refused event changes nothing
 * except the problem list, so a defective log is visible rather than
 * silently reinterpreted.
 */
export function applyEvent(snapshot: RunSnapshot, event: RunEvent): RunSnapshot {
	/* Idempotency: the same event id is a no-op, which is what makes replaying
	   an already-applied prefix safe. */
	if (snapshot.appliedEventIds.includes(event.id)) return snapshot;

	if (!isRunState(event.state)) return refuse(snapshot, event, `unknown state ${JSON.stringify(event.state)}`);
	if (!ISO_INSTANT.test(event.at)) return refuse(snapshot, event, `event ${event.id} has no ISO timestamp`);
	if (!event.note.trim()) return refuse(snapshot, event, `event ${event.id} has no plain-language note`);
	if (event.synthetic !== true) return refuse(snapshot, event, `event ${event.id} does not declare itself synthetic; no live run exists yet`);
	if (snapshot.updatedAt && event.at < snapshot.updatedAt) {
		return refuse(snapshot, event, `event ${event.id} moves time backwards (${event.at} < ${snapshot.updatedAt})`);
	}
	if (snapshot.terminal) return refuse(snapshot, event, `the run is ${snapshot.state} and accepts no further events`);

	const from = snapshot.steps.length === 0 ? null : snapshot.state;

	/* A resumed event immediately re-enters its named pipeline state below, so
	   `from` here is always a real state, never 'resumed'. */
	if (from === null) {
		if (event.state !== 'queued') return refuse(snapshot, event, `a run starts at queued, not ${event.state}`);
	} else if (PIPELINE_SET.has(event.state)) {
		const allowed = PIPELINE_TRANSITIONS[from] ?? [];
		if (!allowed.includes(event.state)) return refuse(snapshot, event, `${from} cannot move to ${event.state}`);
	} else {
		const arrival = INTERRUPT_ARRIVALS[event.state];
		if (!arrival || !arrival(from)) return refuse(snapshot, event, `${event.state} is not a legal interruption of ${from}`);
	}

	if (event.state === 'resumed') {
		if (!event.resumeTo || !PIPELINE_SET.has(event.resumeTo)) {
			return refuse(snapshot, event, `a resumed event must name the pipeline state it returns to`);
		}
		if (snapshot.lastPipelineState && event.resumeTo !== snapshot.lastPipelineState) {
			return refuse(snapshot, event, `resume points at ${event.resumeTo}, but the run was interrupted at ${snapshot.lastPipelineState}`);
		}
	}

	/*
	 * The licensed gate. Once a run has EVER required licensed review, only a
	 * licensed reviewer's own event may approve it - on any later path, not
	 * only the direct one. The first version of this guard checked the
	 * immediate predecessor state, so a run could leave the waiting state
	 * through `blocked`, requeue, and be approved by an editor; the
	 * independent review reproduced exactly that walk (P1, 2026-09-26). The
	 * requirement is therefore carried as a never-cleared fact on the
	 * snapshot, which the fold recomputes from the whole log on every replay
	 * and reset - the same rule the layer model enforces on records, restated
	 * for runs.
	 */
	if (event.state === 'approved' && snapshot.licensedReviewEverRequired && event.actor !== 'licensed-reviewer') {
		return refuse(snapshot, event, `only a licensed reviewer may approve a run that required licensed review; got actor ${event.actor}`);
	}

	const step: RunStep = {
		state: event.state,
		at: event.at,
		actor: event.actor,
		note: event.note,
		counts: event.counts,
		seq: snapshot.steps.length + 1,
	};

	const state = event.state === 'resumed' && event.resumeTo ? event.resumeTo : event.state;

	return {
		state,
		lastPipelineState: PIPELINE_SET.has(state) ? (state as RunState) : snapshot.lastPipelineState,
		steps: [...snapshot.steps, step],
		counts: { ...snapshot.counts, ...(event.counts ?? {}) },
		startedAt: snapshot.startedAt ?? event.at,
		updatedAt: event.at,
		terminal: TERMINAL_STATES.has(event.state),
		awaitingHuman: state === 'human-review' || state === 'licensed-review-required' || state === 'conflict-found',
		awaitingLicensedReview: state === 'licensed-review-required',
		/* Set once, never cleared: blocked, failed and requeued paths all keep it. */
		licensedReviewEverRequired: snapshot.licensedReviewEverRequired || event.state === 'licensed-review-required',
		canResume: RESUMABLE_STATES.has(event.state),
		canCancel: CANCELLABLE_STATES.has(state) && !TERMINAL_STATES.has(event.state),
		canRetry: RETRYABLE_STATES.has(event.state),
		problems: snapshot.problems,
		appliedEventIds: [...snapshot.appliedEventIds, event.id],
	};
}

/** Fold a whole log. reduceRun(a) then the rest of b equals reduceRun(b). */
export function reduceRun(events: readonly RunEvent[], from: RunSnapshot = emptyRun()): RunSnapshot {
	let snapshot = from;
	for (const event of events) snapshot = applyEvent(snapshot, event);
	return snapshot;
}

/* ------------------------------------------------------------------ */
/* What each state means, for the surface                              */
/* ------------------------------------------------------------------ */

export interface RunStateMeaning {
	state: RunState;
	label: string;
	/** What is true when a run is here. Never implies more than the events say. */
	meaning: string;
}

export const RUN_STATE_MEANINGS: Readonly<Record<RunState, RunStateMeaning>> = {
	queued: { state: 'queued', label: 'Queued', meaning: 'The run is recorded and waiting. Nothing has been retrieved yet.' },
	'birch-retrieval': { state: 'birch-retrieval', label: 'Checking Birch evidence', meaning: 'Approved Birch evidence is retrieved first. External research is not considered until a gap is named.' },
	'evidence-gap': { state: 'evidence-gap', label: 'Naming the evidence gap', meaning: 'The run records exactly what the existing evidence does not answer. Only a named gap can justify external research.' },
	'source-candidates': { state: 'source-candidates', label: 'Seeking source candidates', meaning: 'Candidate public sources are sought. A candidate is a lead to read, never a fact.' },
	'authority-check': { state: 'authority-check', label: 'Classifying authority', meaning: 'Each candidate is classified by who published it and how much weight that carries.' },
	'date-check': { state: 'date-check', label: 'Checking dates', meaning: 'Publication and effective dates are checked so an old document cannot read as current.' },
	'jurisdiction-check': { state: 'jurisdiction-check', label: 'Checking jurisdiction', meaning: 'Each candidate is checked against the jurisdiction the question is about, so the rule of one state is not presented as the rule of another.' },
	'claim-mapping': { state: 'claim-mapping', label: 'Mapping claims', meaning: 'Atomic claims are mapped to exact source passages. A claim without a passage stays unsupported and cannot advance.' },
	'conflict-found': { state: 'conflict-found', label: 'Conflict found', meaning: 'Two live sources disagree. Both are preserved and shown; the run cannot pick a winner or average them.' },
	'human-review': { state: 'human-review', label: 'Waiting for human review', meaning: 'A person must read and decide. The run waits; it cannot decide for them.' },
	'licensed-review-required': { state: 'licensed-review-required', label: 'Licensed review required', meaning: 'This run touches language only a licensed human may approve. No such review has happened; the run waits for a real one.' },
	ready: { state: 'ready', label: 'Ready for approval', meaning: 'Review is complete and the result is staged. Nothing is published yet.' },
	approved: { state: 'approved', label: 'Approved', meaning: 'A named reviewer approved the result. Publication is a separate recorded step.' },
	published: { state: 'published', label: 'Published', meaning: 'An immutable version exists at a canonical address, with its history kept.' },
	'refresh-due': { state: 'refresh-due', label: 'Refresh due', meaning: 'A source cadence or effective date says this should be re-read. The published version stands until a review changes it.' },
	paused: { state: 'paused', label: 'Paused', meaning: 'The run is intentionally stopped and can resume exactly where it left off. Nothing is lost by waiting.' },
	'provider-unavailable': { state: 'provider-unavailable', label: 'Provider unavailable', meaning: 'An external research provider could not be reached. The run keeps its history and can resume; no result was invented to fill the gap.' },
	timeout: { state: 'timeout', label: 'Timed out', meaning: 'A step exceeded its time budget and stopped. The run can resume; partial work is recorded, not guessed at.' },
	cancelled: { state: 'cancelled', label: 'Cancelled', meaning: 'A person stopped this run. Its history stays readable; nothing further will happen.' },
	resumed: { state: 'resumed', label: 'Resumed', meaning: 'The run picked up at the exact step it was interrupted, from its recorded history.' },
	stale: { state: 'stale', label: 'Results stale', meaning: 'Earlier results are too old to rely on. The run must requeue and re-check rather than reuse them.' },
	blocked: { state: 'blocked', label: 'Blocked', meaning: 'The run cannot proceed without a decision or a source it does not have. It says so instead of guessing.' },
	failed: { state: 'failed', label: 'Failed', meaning: 'The run could not complete. What was found is recorded; what was not found is stated, not filled in.' },
};

/**
 * The honest status line: the recorded state, its recorded time, and the
 * recorded counts. Deliberately no percentage, no estimate, and no remaining
 * time - the module has nothing truthful to compute them from.
 */
export function honestStatus(snapshot: RunSnapshot): string {
	const meaning = RUN_STATE_MEANINGS[snapshot.state];
	const parts: string[] = [meaning.label];
	if (snapshot.updatedAt) parts.push(`as of ${snapshot.updatedAt}`);
	const counts: string[] = [];
	if (snapshot.counts.birchEvidence !== undefined) counts.push(`${snapshot.counts.birchEvidence} Birch evidence passages`);
	if (snapshot.counts.gaps !== undefined) counts.push(`${snapshot.counts.gaps} named gaps`);
	if (snapshot.counts.candidates !== undefined) counts.push(`${snapshot.counts.candidates} source candidates`);
	if (snapshot.counts.claims !== undefined) counts.push(`${snapshot.counts.claims} claims mapped`);
	if (snapshot.counts.conflicts !== undefined) counts.push(`${snapshot.counts.conflicts} conflicts preserved`);
	if (counts.length > 0) parts.push(counts.join(', '));
	return parts.join(' - ');
}

/* ------------------------------------------------------------------ */
/* Evidence dating: the B1 P2-4 rule, stated where B3 consumes it      */
/* ------------------------------------------------------------------ */

/**
 * Whether an edge supports an as-of assertion on a date.
 *
 * B1's `edgeHoldsOn` deliberately lets `since: 'unknown'` hold on every date,
 * because guessing a start date would invent a source fact. The recorded
 * consequence (B1 review, P2-4) is that a consumer must treat unknown-since
 * as "cannot assert it did not hold", never as positive evidence it held.
 * This is that rule, in the module that consumes it: an unknown start is
 * `non-assertable`, and claim mapping may not cite it as proof of standing
 * on a date.
 */
export function evidenceAssertableOn(
	edge: { since: string; until: string | null },
	isoDate: string,
): 'assertable' | 'non-assertable' {
	if (edge.since === 'unknown') return 'non-assertable';
	if (edge.since > isoDate) return 'non-assertable';
	if (edge.until !== null && edge.until <= isoDate) return 'non-assertable';
	return 'assertable';
}

/* ------------------------------------------------------------------ */
/* Run identity                                                        */
/* ------------------------------------------------------------------ */

/** FNV-1a. Internal run addressing only; never a published checksum. */
function stableHash(value: string): string {
	let hash = 2166136261;
	for (const character of value) {
		hash ^= character.charCodeAt(0);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(16);
}

const RUN_ID = /^run-[a-z0-9][a-z0-9-]*$/;

/** Addressable, deterministic: the same fixture always has the same id. */
export function runIdFor(fixtureName: string): string {
	const slug = fixtureName.replace(/\.json$/, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
	const id = `run-${slug}-${stableHash(slug)}`;
	if (!RUN_ID.test(id)) throw new Error(`derived run id ${id} is not addressable`);
	return id;
}

export function isRunId(value: string): boolean {
	return RUN_ID.test(value);
}
