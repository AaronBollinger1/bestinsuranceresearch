/**
 * Durable-job contract for Birch's research desk.
 *
 * This module is intentionally provider-neutral and side-effect free. A future
 * worker can persist these records in a database or queue, call the bounded
 * provider scout, and hand the resulting packet to the existing researchGate.
 * The browser never receives a provider key, a private task, or an unapproved
 * draft.
 */
import { sanitizeResearchQuery } from './research-provider.ts';
import type { ResearchBrief, ResearchSourceClass } from './research-pipeline';

export type ResearchTaskKind = 'answer-gap' | 'source-recheck' | 'content-refresh';
export type ResearchTaskPriority = 'P0' | 'P1' | 'P2';
export type ResearchTaskState =
	| 'queued'
	| 'scouting'
	| 'source-review'
	| 'draft-review'
	| 'licensed-review'
	| 'approved'
	| 'published'
	| 'recheck-due'
	| 'blocked';

export interface ResearchTaskInput {
	question: string;
	topic: string;
	jurisdiction: string;
	asOf: string;
	requestedSourceClasses: ResearchSourceClass[];
	kind?: ResearchTaskKind;
	priority?: ResearchTaskPriority;
	candidateId?: string;
}

export interface ResearchTaskEvent {
	state: ResearchTaskState;
	actor: 'system' | 'editor' | 'licensed-reviewer' | 'compliance';
	createdOn: string;
	note: string;
}

export interface ResearchTask {
	id: string;
	kind: ResearchTaskKind;
	priority: ResearchTaskPriority;
	candidateId?: string;
	brief: ResearchBrief;
	state: ResearchTaskState;
	createdOn: string;
	updatedOn: string;
	candidateSourceIds: string[];
	claimIds: string[];
	publicRoute: null;
	events: ResearchTaskEvent[];
}

const TRANSITIONS: Record<ResearchTaskState, ResearchTaskState[]> = {
	queued: ['scouting', 'blocked'],
	scouting: ['source-review', 'blocked'],
	'source-review': ['draft-review', 'blocked'],
	'draft-review': ['licensed-review', 'blocked'],
	'licensed-review': ['approved', 'blocked'],
	approved: ['published', 'blocked'],
	published: ['recheck-due'],
	'recheck-due': ['scouting', 'blocked'],
	blocked: ['queued'],
};

function stableHash(value: string) {
	let hash = 2166136261;
	for (const character of value) {
		hash ^= character.charCodeAt(0);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(16);
}

function isoDate(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Research tasks need an ISO as-of date.');
	return value;
}

function requireText(value: string, label: string, maximum: number) {
	const cleaned = value.replace(/\s+/g, ' ').trim();
	if (!cleaned) throw new Error(`Research tasks need ${label}.`);
	if (cleaned.length > maximum) throw new Error(`Research task ${label} is limited to ${maximum} characters.`);
	return cleaned;
}

/** Create a privacy-screened, deduplicated task without persisting it. */
export function createResearchTask(input: ResearchTaskInput, createdOn = new Date().toISOString()): ResearchTask {
	const question = sanitizeResearchQuery(input.question);
	const topic = requireText(input.topic, 'a topic', 160);
	const jurisdiction = requireText(input.jurisdiction, 'a jurisdiction', 120);
	const asOf = isoDate(input.asOf);
	const sourceClasses = [...new Set(input.requestedSourceClasses)];
	if (sourceClasses.length === 0) throw new Error('Research tasks need at least one requested source class.');
	const kind = input.kind ?? 'answer-gap';
	const priority = input.priority ?? 'P1';
	const dedupeKey = `${kind}|${topic}|${jurisdiction}|${question}`.toLowerCase();
	const id = `research-${stableHash(dedupeKey)}`;
	const brief: ResearchBrief = {
		id: `brief-${stableHash(`${topic}|${jurisdiction}|${question}`)}`,
		topic,
		jurisdiction,
		asOf,
		requestedSourceClasses: sourceClasses,
		question,
	};
	return {
		id,
		kind,
		priority,
		...(input.candidateId ? { candidateId: input.candidateId } : {}),
		brief,
		state: 'queued',
		createdOn,
		updatedOn: createdOn,
		candidateSourceIds: [],
		claimIds: [],
		publicRoute: null,
		events: [{ state: 'queued', actor: 'system', createdOn, note: 'Task created from a privacy-screened research gap.' }],
	};
}

/** A bounded instruction for a source scout; it requests candidates, never an answer. */
export function buildResearchScoutPrompt(task: ResearchTask): string {
	return [
		'You are Birch Research Desk source discovery, not the publisher.',
		'Find candidate public sources for the bounded question below. Do not answer the question, infer coverage, estimate price, rank companies, or make an eligibility or claims determination.',
		'',
		`Question: ${task.brief.question}`,
		`Topic: ${task.brief.topic}`,
		`Jurisdiction: ${task.brief.jurisdiction}`,
		`As of: ${task.brief.asOf}`,
		`Requested source classes: ${task.brief.requestedSourceClasses.join(', ')}`,
		'',
		'Return only a JSON array of candidate sources. Each item must include url, title, publisher, sourceClass, jurisdiction, publishedOn or null, lastUpdatedOn or null, and whyRelevant. Use HTTPS URLs. Prefer primary law, regulator guidance, official forms, official filings, court decisions, and public program records. Do not include private facts, user identifiers, or provider-generated conclusions.',
		'Every candidate remains unverified until an editor opens the URL, confirms its status and scope, and attaches it to an explicit claim.',
	].join('\n');
}

export function canTransitionResearchTask(from: ResearchTaskState, to: ResearchTaskState) {
	return TRANSITIONS[from].includes(to);
}

/** Advance a task only through an allowed workflow transition. */
export function transitionResearchTask(
	task: ResearchTask,
	next: ResearchTaskState,
	actor: ResearchTaskEvent['actor'],
	note: string,
	createdOn = new Date().toISOString(),
): ResearchTask {
	if (!canTransitionResearchTask(task.state, next)) {
		throw new Error(`Research task ${task.id} cannot transition from ${task.state} to ${next}.`);
	}
	const cleanNote = requireText(note, 'a transition note', 500);
	return {
		...task,
		state: next,
		updatedOn: createdOn,
		events: [...task.events, { state: next, actor, createdOn, note: cleanNote }],
	};
}

/** Publication is deliberately stricter than a task reaching `approved`. */
export function taskPublicationBlockers(task: ResearchTask): string[] {
	const blockers: string[] = [];
	if (task.state !== 'approved') blockers.push('The research task is not approved.');
	if (task.candidateSourceIds.length === 0) blockers.push('The task has no source records attached.');
	if (task.claimIds.length === 0) blockers.push('The task has no claim IDs attached.');
	if (task.publicRoute !== null) blockers.push('A planning task cannot reserve a public route before publication.');
	if (!task.events.some((event) => event.state === 'licensed-review' && event.actor === 'licensed-reviewer')) {
		blockers.push('A licensed reviewer has not recorded a review event for this task.');
	}
	return blockers;
}
