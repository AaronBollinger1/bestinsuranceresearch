/**
 * BR-2 verification: the canonical question and thread registry.
 *
 * Two halves, same shape as verify-graph.mjs:
 *
 *   1. The real corpus must come out clean: every published question is a
 *      canonical entry, maps to itself exactly, agrees with the B1 graph's
 *      question nodes, and coexists with its jurisdiction variants without an
 *      answer collision.
 *   2. Synthetic fixtures with known right answers exercise both sides of
 *      every boundary: the collisions the registry must report, the
 *      thresholds the duplicate mapper must not cross, the lifecycle
 *      transitions that must be refused, and the full BR-2 journey - create,
 *      map and decline a merge, request research through the existing desk,
 *      link an answer that states its review state, and keep a replayable
 *      versioned thread history.
 *
 *   node --experimental-strip-types --test scripts/verify-question-registry.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	QUESTION_LIFECYCLE_STATES,
	QUESTION_VIEW_STATES,
	SUBMISSION_MAX_LENGTH,
	NEAR_DUPLICATE_MIN_SHARED,
	NEAR_DUPLICATE_JACCARD,
	NEAR_DUPLICATE_CONTAINMENT,
	buildQuestionRegistry,
	mapSubmission,
	normalizeQuestion,
	answerRefs,
	answerCollisions,
	variantKey,
	canTransitionQuestion,
	startQuestionLifecycle,
	transitionQuestion,
	publicSubmissionOpen,
	createThread,
	appendThreadEvent,
	threadHistory,
	linkAnswer,
	toResearchTaskInput,
	registryAgreesWithGraph,
} from '../src/lib/question-registry.ts';
import { buildGraph } from '../src/lib/graph/build.ts';
import { CANONICAL_LINES } from '../src/lib/lines.ts';
import { createResearchTask, transitionResearchTask, taskPublicationBlockers } from '../src/lib/research-automation.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'src/content');

const read = (file) => fs.readFileSync(file, 'utf8');

function collection(name) {
	const dir = path.join(CONTENT, name);
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((f) => f.endsWith('.json'))
		.sort()
		.map((f) => ({ id: f.replace(/\.json$/, ''), data: JSON.parse(read(path.join(dir, f))) }));
}

const fixture = (name) => JSON.parse(read(path.join(ROOT, 'scripts/fixtures/question-registry', name)));

const questions = collection('questions');
const states = collection('states');
const registry = buildQuestionRegistry(questions);

/* Terms whose only job is to name a jurisdiction inside a question's wording. */
const JURISDICTION_TERMS = [
	...states.flatMap((s) => [String(s.data.name ?? ''), String(s.data.code ?? '')]),
	'georgia', 'ga', 'new york', 'ny',
].filter(Boolean);

/* ------------------------------------------------------------------ */
/* The real corpus                                                     */
/* ------------------------------------------------------------------ */

test('every published question is a canonical entry and the registry is clean', () => {
	assert.deepEqual(registry.problems, [], registry.problems.map((p) => `${p.code}: ${p.detail}`).join('\n'));
	assert.equal(registry.entries.length, questions.length, 'a question record failed to become a registry entry');
	assert.ok(registry.entries.length > 80, `only ${registry.entries.length} entries; the corpus check has stopped covering it`);
	for (const entry of registry.entries) {
		assert.ok(entry.lines.length > 0, `${entry.id} resolves no canonical line`);
		assert.ok(entry.freshness.effectiveDate && entry.freshness.lastReviewed, `${entry.id} is missing freshness dates`);
		assert.ok(['answered', 'corrected'].includes(entry.lifecycle), `${entry.id} derived lifecycle ${entry.lifecycle}`);
		for (const code of entry.jurisdictions) assert.match(code, /^[A-Z]{2}$/, `${entry.id} declares jurisdiction ${code}`);
	}
});

test('the registry is a view over the graph, not a second source of truth', () => {
	const graph = buildGraph({
		sources: collection('sources'),
		questions,
		coverages: collection('coverages'),
		companies: collection('companies'),
		states,
		people: collection('people'),
		examples: collection('examples'),
		modules: collection('modules'),
		crossRules: collection('cross-rules'),
		figures: collection('figures'),
		tools: collection('tools'),
		canonicalLines: CANONICAL_LINES,
		licensedReviewRecorded: false,
		commonsOpen: false,
	});
	const disagreements = registryAgreesWithGraph(registry, graph.nodes);
	assert.deepEqual(disagreements, [], disagreements.join('\n'));
});

test('every canonical question and every alias maps back to its own record exactly', () => {
	for (const question of questions) {
		const own = mapSubmission(registry, question.data.question);
		assert.equal(own.disposition, 'exact-duplicate', `${question.id} did not map to anything: ${own.disposition}`);
		assert.equal(own.canonicalId, question.id, `${question.id} mapped to ${own.canonicalId}`);
		for (const alias of question.data.aliases ?? []) {
			const mapped = mapSubmission(registry, alias);
			assert.equal(mapped.disposition, 'exact-duplicate', `alias of ${question.id} mapped as ${mapped.disposition}`);
			assert.equal(mapped.canonicalId, question.id, `alias of ${question.id} mapped to ${mapped.canonicalId}`);
		}
	}
});

test('jurisdiction-specific answers coexist without URL or intent collisions', () => {
	const refs = answerRefs(registry);
	assert.ok(refs.length >= registry.entries.length, 'every entry must yield at least one answer reference');
	const collisions = answerCollisions(registry, refs, JURISDICTION_TERMS);
	assert.deepEqual(collisions, [], collisions.map((c) => c.detail).join('\n'));

	/* Where variants of one intent exist, each must claim a distinct
	   jurisdiction. Measured 2026-09-26: the corpus currently phrases its
	   state-specific questions differently enough that no two share a variant
	   key, so today this loop iterates zero groups here - the multi-variant
	   case is exercised by the CA/TX fixture test below, which cannot go
	   vacuous because the fixture is constructed to share one. Jurisdiction-
	   specific questions themselves must exist, or this whole check has
	   stopped covering what it was written for. */
	const byVariant = new Map();
	for (const entry of registry.entries) {
		const key = variantKey(entry, JURISDICTION_TERMS);
		byVariant.set(key, [...(byVariant.get(key) ?? []), entry]);
	}
	for (const group of [...byVariant.values()].filter((g) => g.length > 1)) {
		const claimed = group.flatMap((entry) => (entry.jurisdictions.length ? entry.jurisdictions : ['national']));
		assert.equal(new Set(claimed).size, claimed.length, `variants of one intent claim a jurisdiction twice: ${group.map((e) => e.id).join(', ')}`);
	}
	assert.ok(
		registry.entries.filter((e) => e.jurisdictions.length > 0).length > 20,
		'the corpus no longer carries jurisdiction-specific questions, so this check covers nothing',
	);
});

test('mapping is deterministic and never transmits or persists anything', () => {
	const text = 'Is the widget labeling rule in California enforced by anyone?';
	const first = mapSubmission(registry, text);
	const second = mapSubmission(registry, text);
	assert.deepEqual(first, second, 'the same submission mapped two different ways');

	/* No persistence path exists: while PUBLIC_COMMONS_READY is false there must
	   be no code in this module that could write a submission anywhere. */
	const source = read(path.join(ROOT, 'src/lib/question-registry.ts'));
	assert.ok(!/from\s+'node:fs'|require\(\s*'node:fs'/.test(source), 'the registry module imports the filesystem');
	assert.ok(!/\bfetch\s*\(/.test(source), 'the registry module makes a network call');
	assert.ok(!source.includes('localStorage') && !source.includes('sessionStorage'), 'the registry module touches browser storage');
});

test('public submission stays closed while Commons is closed', () => {
	assert.notEqual(process.env.PUBLIC_COMMONS_READY, 'true', 'Commons must remain closed for this unit');
	assert.equal(publicSubmissionOpen({ commonsOpen: process.env.PUBLIC_COMMONS_READY === 'true' }), false);
	assert.equal(publicSubmissionOpen({ commonsOpen: true }), true, 'the gate must open on the real flag, not stay closed unconditionally');
});

/* ------------------------------------------------------------------ */
/* View states                                                          */
/* ------------------------------------------------------------------ */

test('all six view states exist, explain themselves, and can never persist', () => {
	const names = QUESTION_VIEW_STATES.map((s) => s.state).sort();
	assert.deepEqual(names, ['empty', 'error', 'loading', 'logged-out', 'offline', 'permission']);
	for (const view of QUESTION_VIEW_STATES) {
		assert.equal(view.persistable, false, `${view.state} claims to be persistable`);
		assert.ok(view.meaning.length > 40, `${view.state} does not explain itself`);
		assert.ok(view.readerCopy.length > 40, `${view.state} has no reader copy`);
	}
	const loggedOut = QUESTION_VIEW_STATES.find((s) => s.state === 'logged-out');
	assert.match(loggedOut.readerCopy, /not open/i, 'the logged-out copy must say accounts and posting are not open');
	const offline = QUESTION_VIEW_STATES.find((s) => s.state === 'offline');
	assert.match(offline.meaning, /local/i, 'the offline state must say matching is local');
});

/* ------------------------------------------------------------------ */
/* Lifecycle                                                            */
/* ------------------------------------------------------------------ */

test('the lifecycle covers the seven required record states and fails closed', () => {
	assert.deepEqual(
		[...QUESTION_LIFECYCLE_STATES].sort(),
		['answered', 'archived', 'corrected', 'draft', 'duplicate-suggested', 'screening', 'submitted'],
	);

	let lifecycle = startQuestionLifecycle('2026-09-26T09:00:00.000Z', 'Reader typed a question.');
	assert.equal(lifecycle.state, 'draft');
	const chain = [
		['submitted', 'Reader submitted the draft.'],
		['duplicate-suggested', 'The mapper suggested an existing canonical question.'],
		['submitted', 'Reader declined the merge; the intent is distinct.'],
		['screening', 'An editor opened screening.'],
		['answered', 'A published answer exists for this question.'],
		['corrected', 'A correction was recorded against the answer.'],
		['archived', 'The record was retired.'],
	];
	for (const [next, note] of chain) {
		lifecycle = transitionQuestion(lifecycle, next, 'system', note, '2026-09-26T10:00:00.000Z');
	}
	assert.equal(lifecycle.state, 'archived');
	assert.equal(lifecycle.events.length, chain.length + 1);

	/* Every state is reachable in that one chain, so none is decorative. */
	const visited = new Set(lifecycle.events.map((e) => e.state));
	for (const state of QUESTION_LIFECYCLE_STATES) assert.ok(visited.has(state), `${state} was never reached`);

	/* Refusals, asserted individually rather than trusted. */
	assert.equal(canTransitionQuestion('draft', 'answered'), false, 'a draft cannot skip straight to answered');
	assert.equal(canTransitionQuestion('submitted', 'answered'), false, 'nothing is answered without screening');
	assert.equal(canTransitionQuestion('archived', 'submitted'), false, 'archived is terminal');
	assert.throws(() => transitionQuestion(lifecycle, 'submitted', 'system', 'Reopen.', '2026-09-26T11:00:00.000Z'), /cannot move/);
	const fresh = startQuestionLifecycle('2026-09-26T09:00:00.000Z', 'note');
	assert.throws(() => transitionQuestion(fresh, 'submitted', 'system', '   ', '2026-09-26T09:01:00.000Z'), /needs a note/);
});

/* ------------------------------------------------------------------ */
/* Negative controls over the fixtures                                  */
/* ------------------------------------------------------------------ */

test('NEGATIVE: the same wording twice is reported as an intent collision', () => {
	const built = buildQuestionRegistry(fixture('collision.json').intentCollision);
	assert.ok(built.problems.some((p) => p.code === 'intent-collision'), `got: ${built.problems.map((p) => p.code).join(', ') || 'nothing'}`);
});

test('NEGATIVE: an alias repeating another record is reported as an alias collision', () => {
	const built = buildQuestionRegistry(fixture('collision.json').aliasCollision);
	assert.ok(built.problems.some((p) => p.code === 'alias-collision'), `got: ${built.problems.map((p) => p.code).join(', ') || 'nothing'}`);
});

test('NEGATIVE: a line the canonical registry cannot resolve is reported, not minted', () => {
	const built = buildQuestionRegistry(fixture('collision.json').unresolvableLine);
	assert.ok(built.problems.some((p) => p.code === 'unresolvable-line'), `got: ${built.problems.map((p) => p.code).join(', ') || 'nothing'}`);
	assert.ok(!built.entries.some((e) => e.lines.includes('not-a-real-line-xyz')), 'an unresolvable line became a canonical line');
});

test('NEGATIVE: two records answering one intent for one jurisdiction collide', () => {
	const synthetic = fixture('synthetic-registry.json').questions;
	const extra = fixture('collision.json').jurisdictionCollision;
	const built = buildQuestionRegistry([...synthetic, ...extra]);
	assert.deepEqual(built.problems, [], 'the jurisdiction-collision fixture must not be an intent collision');
	const collisions = answerCollisions(built, answerRefs(built), ['california', 'ca', 'texas', 'tx']);
	assert.ok(collisions.length > 0, 'two answers claimed one intent-and-jurisdiction address and nothing noticed');

	/* And without the defective record the same inputs are clean, so the check is data-driven. */
	const clean = buildQuestionRegistry(synthetic);
	assert.deepEqual(answerCollisions(clean, answerRefs(clean), ['california', 'ca', 'texas', 'tx']), []);
});

test('jurisdiction variants of one intent group together and stay distinct records', () => {
	const built = buildQuestionRegistry(fixture('synthetic-registry.json').questions);
	assert.deepEqual(built.problems, []);
	const ca = built.byId.get('fixture-widget-rule-ca');
	const tx = built.byId.get('fixture-widget-rule-tx');
	const terms = ['california', 'ca', 'texas', 'tx'];
	assert.equal(variantKey(ca, terms), variantKey(tx, terms), 'the CA and TX variants no longer share an intent key');
	assert.notEqual(ca.normalized, tx.normalized, 'the variants must remain distinct canonical records');
});

/* ------------------------------------------------------------------ */
/* The duplicate mapper's boundaries                                    */
/* ------------------------------------------------------------------ */

test('every fixture submission maps to its constructed disposition', () => {
	const built = buildQuestionRegistry(fixture('synthetic-registry.json').questions);
	for (const item of fixture('submissions.json').cases) {
		const mapped = mapSubmission(built, item.text);
		assert.equal(mapped.disposition, item.expect, `${JSON.stringify(item.text)}: expected ${item.expect} (${item.why}), got ${mapped.disposition}`);
		if (item.expect === 'exact-duplicate') assert.equal(mapped.canonicalId, item.canonicalId);
		if (item.expect === 'duplicate-suggested') {
			assert.equal(mapped.suggestions[0].id, item.canonicalId, `top suggestion was ${mapped.suggestions[0].id}`);
			for (const suggestion of mapped.suggestions) {
				assert.ok(suggestion.overlap > 0 && suggestion.overlap <= 1);
				assert.ok(suggestion.containment > 0 && suggestion.containment <= 1);
			}
		}
	}
});

test('the thresholds are pinned, and an overlong submission is refused', () => {
	/* Moving a threshold must be a deliberate edit here, not a drive-by. */
	assert.equal(NEAR_DUPLICATE_MIN_SHARED, 3);
	assert.equal(NEAR_DUPLICATE_JACCARD, 0.5);
	assert.equal(NEAR_DUPLICATE_CONTAINMENT, 0.75);
	assert.equal(SUBMISSION_MAX_LENGTH, 500);

	const built = buildQuestionRegistry(fixture('synthetic-registry.json').questions);
	const long = mapSubmission(built, 'widget '.repeat(80));
	assert.equal(long.disposition, 'rejected');
	assert.match(long.reason, /500/);
});

test('nothing this module emits can be mistaken for a claim address', () => {
	const built = buildQuestionRegistry(fixture('synthetic-registry.json').questions);
	const thread = appendThreadEvent(
		createThread('fixture-widget-rule-ca', '2026-09-26T09:00:00.000Z', 'Opened.'),
		{ kind: 'submitted', actor: 'reader', at: '2026-09-26T09:01:00.000Z', note: 'Submitted.' },
	);
	const emitted = [
		...built.entries.map((e) => e.id),
		...built.entries.map((e) => e.nodeId),
		thread.id,
		...thread.events.map((e) => e.id),
	];
	for (const id of emitted) {
		assert.ok(!/#c\d/.test(id), `${id} matches the claim address shape; claims are owned by source records`);
	}
});

/* ------------------------------------------------------------------ */
/* Threads                                                              */
/* ------------------------------------------------------------------ */

test('a thread is append-only, replayable, and bound to one subject', () => {
	const at = '2026-09-26T09:00:00.000Z';
	const a = createThread('fixture-widget-rule-ca', at, 'Opened from a reader submission.');
	const b = createThread('fixture-widget-rule-ca', at, 'Opened from a reader submission.');
	assert.equal(a.id, b.id, 'the same subject produced two thread ids');
	assert.deepEqual(a.events, b.events, 'replaying creation produced different events');

	let thread = appendThreadEvent(a, { kind: 'submitted', actor: 'reader', at: '2026-09-26T09:01:00.000Z', note: 'Submitted.' });
	assert.equal(thread.version, 2);
	assert.equal(thread.events[1].seq, 2);
	assert.notEqual(thread.events[0].id, thread.events[1].id);

	/* Time cannot run backwards, an event needs a note, and closed threads stay closed. */
	assert.throws(() => appendThreadEvent(thread, { kind: 'archived', actor: 'moderator', at: '2026-09-26T08:00:00.000Z', note: 'Backdated.' }), /backwards/);
	assert.throws(() => appendThreadEvent(thread, { kind: 'archived', actor: 'moderator', at: '2026-09-26T09:02:00.000Z', note: '  ' }), /needs a note/);
	const archived = appendThreadEvent(thread, { kind: 'archived', actor: 'moderator', at: '2026-09-26T09:02:00.000Z', note: 'Retired.' });
	assert.throws(() => appendThreadEvent(archived, { kind: 'submitted', actor: 'reader', at: '2026-09-26T09:03:00.000Z', note: 'More.' }), /no further events/);
	const merged = appendThreadEvent(thread, { kind: 'merged-into-canonical', actor: 'editor', at: '2026-09-26T09:02:00.000Z', note: 'Merged into the canonical thread.', refs: ['fixture-widget-rule-ca'] });
	assert.throws(() => appendThreadEvent(merged, { kind: 'submitted', actor: 'reader', at: '2026-09-26T09:03:00.000Z', note: 'More.' }), /no further events/);
});

test('an answer link must state its review state and never edits the question', () => {
	const thread = createThread('fixture-widget-rule-ca', '2026-09-26T09:00:00.000Z', 'Opened.');
	assert.throws(
		() => linkAnswer(thread, { questionId: 'fixture-widget-rule-ca', jurisdiction: 'CA', route: '/questions/fixture-widget-rule-ca', reviewState: 'approved' }, 'editor', '2026-09-26T09:05:00.000Z'),
		/explicit review state/,
		'an unknown review state was accepted',
	);
	const linked = linkAnswer(thread, { questionId: 'fixture-widget-rule-ca', jurisdiction: 'CA', route: '/questions/fixture-widget-rule-ca', reviewState: 'under-review' }, 'editor', '2026-09-26T09:05:00.000Z');
	assert.match(linked.events[1].note, /under-review/, 'the review state must be visible in the event, not implied');
	assert.equal(linked.subjectId, thread.subjectId, 'linking an answer changed the thread subject');
});

/* ------------------------------------------------------------------ */
/* The end-to-end journey                                               */
/* ------------------------------------------------------------------ */

test('create, map, decline merge, request research, link answer, keep history', () => {
	const journey = fixture('journey.json');
	const built = buildQuestionRegistry(fixture('synthetic-registry.json').questions);
	const t = journey.timeline;

	/* 1. Create and map. The paraphrase is suggested as a duplicate. */
	const mapped = mapSubmission(built, journey.submission.question);
	assert.equal(mapped.disposition, 'duplicate-suggested');
	assert.equal(mapped.suggestions[0].id, 'fixture-widget-rule-ca');

	/* 2. The reader declines the merge; the draft proceeds as its own thread. */
	let lifecycle = startQuestionLifecycle(t.created, 'Reader typed a question.');
	lifecycle = transitionQuestion(lifecycle, 'submitted', 'reader', 'Submitted.', t.submitted);
	lifecycle = transitionQuestion(lifecycle, 'duplicate-suggested', 'system', `Suggested ${mapped.suggestions[0].id}.`, t.duplicateSuggested);
	lifecycle = transitionQuestion(lifecycle, 'submitted', 'reader', 'Merge declined; the intent is distinct.', t.mergeDeclined);
	lifecycle = transitionQuestion(lifecycle, 'screening', 'editor', 'Screening opened.', t.screening);

	let thread = createThread(journey.draftId, t.created, 'Opened from a reader submission.');
	thread = appendThreadEvent(thread, { kind: 'submitted', actor: 'reader', at: t.submitted, note: 'Submitted.' });
	thread = appendThreadEvent(thread, { kind: 'duplicate-suggested', actor: 'system', at: t.duplicateSuggested, note: 'An existing canonical question was suggested.', refs: [mapped.suggestions[0].id] });
	thread = appendThreadEvent(thread, { kind: 'screening-started', actor: 'editor', at: t.screening, note: 'Screening opened.' });

	/* 3. Research request, through the existing desk rather than a copy of it. */
	const input = toResearchTaskInput(journey.submission);
	const task = createResearchTask(input, t.researchRequested);
	const again = createResearchTask(input, t.answerLinked);
	assert.equal(task.id, again.id, 'the research task id is not deterministic');
	assert.equal(task.state, 'queued');
	thread = appendThreadEvent(thread, { kind: 'research-requested', actor: 'editor', at: t.researchRequested, note: 'Bounded research requested.', refs: [task.id] });

	/* 4. The publication gate bites before any licensed-review event exists. */
	assert.ok(taskPublicationBlockers(task).some((b) => /licensed reviewer/.test(b)), 'the licensed-review blocker is missing');
	let advanced = task;
	for (const next of ['scouting', 'source-review', 'draft-review', 'licensed-review', 'approved']) {
		advanced = transitionResearchTask(advanced, next, next === 'licensed-review' ? 'licensed-reviewer' : 'system', `Advance to ${next}. Synthetic fixture event; no real review occurred.`, t.answerLinked);
	}
	advanced = { ...advanced, candidateSourceIds: ['fixture-candidate-source'], claimIds: ['fixture-claim-ref'] };
	assert.deepEqual(taskPublicationBlockers(advanced), [], 'the synthetic journey cannot clear the gate');

	/* 5. The answer link carries its real review state - under-review, because
	      the corpus holds zero licensed sign-offs and the fixture must not
	      model one as normal. */
	thread = linkAnswer(thread, journey.answer, 'editor', t.answerLinked);
	lifecycle = transitionQuestion(lifecycle, 'answered', 'editor', 'Answer linked.', t.answerLinked);
	lifecycle = transitionQuestion(lifecycle, 'corrected', 'editor', 'Correction recorded.', t.correction);
	thread = appendThreadEvent(thread, { kind: 'correction-recorded', actor: 'editor', at: t.correction, note: 'A correction was recorded against the linked answer.' });
	lifecycle = transitionQuestion(lifecycle, 'archived', 'moderator', 'Journey fixture retired.', t.archived);
	thread = appendThreadEvent(thread, { kind: 'archived', actor: 'moderator', at: t.archived, note: 'Journey fixture retired.' });

	/* 6. The history is versioned, monotonic, and replayable byte for byte. */
	/* created, submitted, duplicate-suggested, screening-started,
	   research-requested, answer-linked, correction-recorded, archived. */
	const history = threadHistory(thread);
	assert.equal(history.length, 8);
	assert.deepEqual(history.map((h) => h.version), [1, 2, 3, 4, 5, 6, 7, 8]);
	for (let i = 1; i < history.length; i += 1) assert.ok(history[i].at >= history[i - 1].at, 'history moved backwards in time');
	assert.equal(new Set(history.map((h) => h.eventId)).size, history.length, 'event ids are not unique');

	let replay = createThread(journey.draftId, t.created, 'Opened from a reader submission.');
	for (const event of thread.events.slice(1)) {
		replay = appendThreadEvent(replay, { kind: event.kind, actor: event.actor, at: event.at, note: event.note, refs: event.refs });
	}
	assert.deepEqual(replay, thread, 'replaying the journey produced a different thread');
});

test('normalization strips nothing that changes identity and everything that does not', () => {
	assert.equal(normalizeQuestion('  Who ENFORCES the widget rule?  '), normalizeQuestion('who enforces the widget rule'));
	assert.notEqual(normalizeQuestion('widget rule in california'), normalizeQuestion('widget rule in texas'));
});
