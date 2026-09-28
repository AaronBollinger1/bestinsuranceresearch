/**
 * BR-3 verification: resumable research runs and the honest run surface.
 *
 * The machine is a pure fold over recorded events, so the properties BR-3
 * requires are testable directly: idempotency (an event applied twice is a
 * no-op), resumability (a prefix fold continued equals the whole fold),
 * fail-closed transitions, the licensed gate, and honesty (counts must equal
 * the fixture's declared artifacts, and neither the module nor the rendered
 * page may contain a timer, a percentage, or a progress bar).
 *
 * The six fixtures under scripts/fixtures/research-runs/ are the required
 * BR-3 paths - success, conflict, no-source, provider outage with resume,
 * cancel, and licensed-review-required - and a completeness test asserts
 * that together they exercise every declared run state, so a state cannot
 * exist in the machine without a fixture that reaches it.
 *
 * The built-output half runs only when dist/ exists (npm run validate always
 * builds first) and checks the pages in whichever indexing posture the build
 * used: always noindex, out of the sitemap, polite status region, disclosure
 * that the run is synthetic, and a JSON companion per run.
 *
 *   node --experimental-strip-types --test scripts/verify-research-run.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	RUN_STATES,
	RUN_PIPELINE_STATES,
	RUN_INTERRUPT_STATES,
	RUN_STATE_MEANINGS,
	TERMINAL_STATES,
	RESUMABLE_STATES,
	RETRYABLE_STATES,
	emptyRun,
	applyEvent,
	reduceRun,
	honestStatus,
	evidenceAssertableOn,
	runIdFor,
	isRunId,
} from '../src/lib/research-run.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = path.join(ROOT, 'scripts/fixtures/research-runs');
const DIST = path.join(ROOT, 'dist');

const read = (file) => fs.readFileSync(file, 'utf8');

const fixtureNames = fs.readdirSync(FIXTURES).filter((f) => f.endsWith('.json')).sort();
const fixtures = fixtureNames.map((name) => ({ name, ...JSON.parse(read(path.join(FIXTURES, name))) }));

/* ------------------------------------------------------------------ */
/* The state inventory                                                 */
/* ------------------------------------------------------------------ */

test('the machine declares every required BR-3 state, and each explains itself', () => {
	const required = [
		'queued', 'birch-retrieval', 'evidence-gap', 'source-candidates',
		'authority-check', 'date-check', 'jurisdiction-check', 'claim-mapping',
		'conflict-found', 'paused', 'provider-unavailable', 'timeout',
		'cancelled', 'resumed', 'stale', 'human-review',
		'licensed-review-required', 'ready', 'approved', 'published',
		'refresh-due', 'blocked', 'failed',
	];
	assert.deepEqual([...RUN_STATES].sort(), [...required].sort());
	assert.equal(RUN_PIPELINE_STATES.length + RUN_INTERRUPT_STATES.length, RUN_STATES.length);
	for (const state of RUN_STATES) {
		const meaning = RUN_STATE_MEANINGS[state];
		assert.ok(meaning, `${state} has no meaning entry`);
		assert.ok(meaning.label.length > 2, `${state} has no label`);
		assert.ok(meaning.meaning.length > 40, `${state} does not explain itself`);
	}
	/* The waiting state must not read as a completed review. */
	assert.match(RUN_STATE_MEANINGS['licensed-review-required'].meaning, /No such review has happened/);
});

test('the six fixtures together reach every declared state', () => {
	assert.equal(fixtures.length, 6, `expected the six BR-3 paths, found ${fixtures.length}`);
	const reached = new Set(fixtures.flatMap((f) => f.events.map((e) => e.state)));
	const missing = RUN_STATES.filter((state) => !reached.has(state));
	assert.deepEqual(missing, [], `no fixture reaches: ${missing.join(', ')}`);
});

/* ------------------------------------------------------------------ */
/* Every fixture folds to its constructed outcome                       */
/* ------------------------------------------------------------------ */

test('every fixture reduces cleanly to its expected final state', () => {
	for (const f of fixtures) {
		const snapshot = reduceRun(f.events);
		assert.deepEqual(snapshot.problems, [], `${f.name}: ${snapshot.problems.map((p) => p.problem).join('; ')}`);
		assert.equal(snapshot.state, f._expects.finalState, `${f.name} ended at ${snapshot.state}`);
		assert.equal(snapshot.terminal, f._expects.terminal, `${f.name} terminal flag`);
		if (f._expects.canRetry !== undefined) assert.equal(snapshot.canRetry, f._expects.canRetry, `${f.name} canRetry`);
		if (f._expects.awaitingLicensedReview !== undefined) {
			assert.equal(snapshot.awaitingLicensedReview, f._expects.awaitingLicensedReview, `${f.name} awaitingLicensedReview`);
		}
		assert.equal(snapshot.steps.length, f.events.length, `${f.name}: an event was silently dropped`);
	}
});

test('every fixture event is timestamped, explained, and declared synthetic', () => {
	for (const f of fixtures) {
		let previous = '';
		const ids = new Set();
		for (const event of f.events) {
			assert.match(event.at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, `${f.name}/${event.id} has no ISO instant`);
			assert.ok(event.at >= previous, `${f.name}/${event.id} moves time backwards`);
			previous = event.at;
			assert.ok(event.note.length > 20, `${f.name}/${event.id} has no plain-language note`);
			assert.equal(event.synthetic, true, `${f.name}/${event.id} does not declare itself synthetic`);
			assert.ok(!ids.has(event.id), `${f.name}/${event.id} repeats an event id`);
			ids.add(event.id);
		}
	}
});

test('every count an event reports equals the fixture artifacts it claims to count', () => {
	/*
	 * This is the honesty contract for the animation: a number on the page is
	 * a count of enumerated things, or it does not appear. Reporting a count
	 * with no artifacts behind it, or artifacts with no count, both fail.
	 */
	const keys = ['birchEvidence', 'gaps', 'candidates', 'claims', 'conflicts'];
	for (const f of fixtures) {
		const snapshot = reduceRun(f.events);
		for (const key of keys) {
			const declared = (f.artifacts[key] ?? []).length;
			const reported = snapshot.counts[key];
			if (reported !== undefined) {
				assert.equal(reported, declared, `${f.name} reports ${reported} ${key} but declares ${declared}`);
			} else {
				assert.equal(declared, 0, `${f.name} declares ${declared} ${key} and never reports them`);
			}
		}
	}
});

test('every fixture question link points at a published question record', () => {
	for (const f of fixtures) {
		const record = path.join(ROOT, 'src/content/questions', `${f.context.questionId}.json`);
		assert.ok(fs.existsSync(record), `${f.name} links question ${f.context.questionId}, which does not exist`);
	}
});

/* ------------------------------------------------------------------ */
/* Idempotency and resumability                                         */
/* ------------------------------------------------------------------ */

test('applying an event twice is a no-op, so replays are safe', () => {
	const success = fixtures.find((f) => f.name === 'success.json');
	const doubled = success.events.flatMap((event) => [event, event]);
	assert.deepEqual(reduceRun(doubled), reduceRun(success.events), 'duplicated events changed the fold');
});

test('a prefix fold continued equals the whole fold, at every split point', () => {
	for (const f of fixtures) {
		const whole = reduceRun(f.events);
		for (let split = 0; split <= f.events.length; split += 1) {
			const resumed = reduceRun(f.events.slice(split), reduceRun(f.events.slice(0, split)));
			assert.deepEqual(resumed, whole, `${f.name} split at ${split} folded differently`);
		}
	}
});

test('a resume returns to the exact interrupted step and nowhere else', () => {
	const outage = fixtures.find((f) => f.name === 'provider-outage.json');
	const upToOutage = outage.events.slice(0, 5);
	const interrupted = reduceRun(upToOutage);
	assert.equal(interrupted.state, 'provider-unavailable');
	assert.equal(interrupted.lastPipelineState, 'source-candidates');
	assert.equal(interrupted.canResume, true);

	const wrongResume = applyEvent(interrupted, {
		id: 'bad-resume', state: 'resumed', at: '2026-09-26T13:10:00.000Z', actor: 'system',
		note: 'Resume pointed somewhere the run never was.', resumeTo: 'claim-mapping', synthetic: true,
	});
	assert.ok(wrongResume.problems.some((p) => /interrupted at source-candidates/.test(p.problem)), 'a resume to the wrong step was accepted');
	assert.equal(wrongResume.state, 'provider-unavailable', 'a refused resume still moved the run');
});

/* ------------------------------------------------------------------ */
/* Fail-closed transitions and the terminal rule                        */
/* ------------------------------------------------------------------ */

test('an illegal transition is refused with a named problem, and changes nothing else', () => {
	const started = reduceRun([
		{ id: 'q', state: 'queued', at: '2026-09-26T09:00:00.000Z', actor: 'system', note: 'Run recorded for the transition checks.', synthetic: true },
	]);
	const skipped = applyEvent(started, { id: 'skip', state: 'published', at: '2026-09-26T09:01:00.000Z', actor: 'system', note: 'Skip straight to published.', synthetic: true });
	assert.equal(skipped.state, 'queued');
	assert.ok(skipped.problems.some((p) => /queued cannot move to published/.test(p.problem)));

	const notSynthetic = applyEvent(started, { id: 'live', state: 'birch-retrieval', at: '2026-09-26T09:01:00.000Z', actor: 'system', note: 'An event claiming to be a live run.', synthetic: false });
	assert.ok(notSynthetic.problems.some((p) => /declare itself synthetic/.test(p.problem)), 'a non-synthetic event was accepted while no live run exists');

	const backwards = applyEvent(started, { id: 'back', state: 'birch-retrieval', at: '2026-09-26T08:00:00.000Z', actor: 'system', note: 'A backdated event.', synthetic: true });
	assert.ok(backwards.problems.some((p) => /moves time backwards/.test(p.problem)));
});

test('a cancelled or failed run keeps its history and accepts nothing further', () => {
	const cancelled = reduceRun(fixtures.find((f) => f.name === 'cancelled.json').events);
	assert.equal(cancelled.terminal, true);
	assert.equal(cancelled.canResume, false);
	assert.equal(cancelled.canCancel, false);
	const after = applyEvent(cancelled, { id: 'more', state: 'queued', at: '2026-09-26T16:00:00.000Z', actor: 'system', note: 'An event after cancellation.', synthetic: true });
	assert.ok(after.problems.some((p) => /accepts no further events/.test(p.problem)));
	assert.equal(after.steps.length, cancelled.steps.length, 'a terminal run gained a step');
});

test('resume, cancel, and retry are offered exactly where they are true', () => {
	assert.deepEqual([...RESUMABLE_STATES].sort(), ['paused', 'provider-unavailable', 'timeout']);
	assert.deepEqual([...RETRYABLE_STATES].sort(), ['blocked', 'failed', 'stale']);
	for (const state of TERMINAL_STATES) {
		assert.ok(!RESUMABLE_STATES.has(state), `${state} is terminal and resumable at once`);
	}
	const noSource = reduceRun(fixtures.find((f) => f.name === 'no-source.json').events);
	assert.equal(noSource.canRetry, true, 'a failed run must offer an honest retry');
	assert.equal(noSource.canResume, false, 'a failed run is not resumable, it is retryable');
});

/* ------------------------------------------------------------------ */
/* The licensed gate                                                    */
/* ------------------------------------------------------------------ */

test('only a licensed reviewer can approve a run that required licensed review', () => {
	const waiting = reduceRun(fixtures.find((f) => f.name === 'licensed-review-required.json').events);
	assert.equal(waiting.state, 'licensed-review-required');
	assert.equal(waiting.awaitingLicensedReview, true);

	const editorApproval = applyEvent(waiting, {
		id: 'ed-approve', state: 'approved', at: '2026-09-26T17:00:00.000Z', actor: 'editor',
		note: 'An editor attempting to stand in for a licensed reviewer.', synthetic: true,
	});
	assert.ok(editorApproval.problems.some((p) => /only a licensed reviewer/.test(p.problem)), 'an editor approved past the licensed gate');
	assert.equal(editorApproval.state, 'licensed-review-required', 'the refused approval still moved the run');

	const systemApproval = applyEvent(waiting, {
		id: 'sys-approve', state: 'approved', at: '2026-09-26T17:00:00.000Z', actor: 'system',
		note: 'A system attempting to approve automatically.', synthetic: true,
	});
	assert.ok(systemApproval.problems.some((p) => /only a licensed reviewer/.test(p.problem)), 'a system approved past the licensed gate');

	/* The gate opens only for the right actor - proven in-test, never in a
	   fixture a page renders, because no real licensed review exists. */
	const licensed = applyEvent(waiting, {
		id: 'lic-approve', state: 'approved', at: '2026-09-26T17:00:00.000Z', actor: 'licensed-reviewer',
		note: 'Synthetic licensed-reviewer event, in-test only, proving the gate opens for the right actor.', synthetic: true,
	});
	assert.deepEqual(licensed.problems, waiting.problems);
	assert.equal(licensed.state, 'approved');
});

test('the licensed requirement survives blocked, requeue, and reset - the reproduced P1 walk cannot approve', () => {
	/*
	 * The exact twelve-event sequence the independent Grok 4.7 review
	 * reproduced on 2026-09-26: a run enters licensed-review-required, leaves
	 * it through blocked, requeues, walks the pipeline again to ready, and an
	 * EDITOR approves. Before the correction this folded to state "approved"
	 * with zero problems. It must never do so again: the requirement is a
	 * fact about the run, and no path out of the waiting state clears it.
	 */
	const at = (m) => `2026-09-26T18:${String(m).padStart(2, '0')}:00.000Z`;
	const walk = (i, state, actor, note) => ({ id: `p1-${i}`, state, at: at(i), actor, note, synthetic: true });
	const events = [
		walk(1, 'queued', 'system', 'Run recorded for the reproduced P1 sequence.'),
		walk(2, 'birch-retrieval', 'system', 'Approved Birch evidence retrieved first.'),
		walk(3, 'claim-mapping', 'system', 'Claims mapped from sufficient Birch evidence.'),
		walk(4, 'human-review', 'editor', 'A fixture editor read the mapped claims.'),
		walk(5, 'licensed-review-required', 'editor', 'High-stakes language; only a licensed human may approve.'),
		walk(6, 'blocked', 'editor', 'Blocked while waiting; the requirement does not go away.'),
		walk(7, 'queued', 'system', 'Requeued with history kept.'),
		walk(8, 'birch-retrieval', 'system', 'Evidence retrieved again on the requeued pass.'),
		walk(9, 'claim-mapping', 'system', 'Claims mapped again.'),
		walk(10, 'human-review', 'editor', 'Editorial review on the requeued pass.'),
		walk(11, 'ready', 'editor', 'Staged as ready on the requeued pass.'),
		walk(12, 'approved', 'editor', 'An editor attempting to approve after the requeue laundered the waiting state.'),
	];
	const snapshot = reduceRun(events);
	assert.notEqual(snapshot.state, 'approved', 'the reproduced P1 walk still reaches approved');
	assert.equal(snapshot.state, 'ready', 'the refused approval moved the run somewhere unexpected');
	assert.equal(snapshot.licensedReviewEverRequired, true, 'the requirement was cleared by the blocked/requeue path');
	assert.ok(
		snapshot.problems.some((p) => p.eventId === 'p1-12' && /only a licensed reviewer/.test(p.problem)),
		'the editor approval after requeue was not refused by name',
	);

	/* The flag persists at every point after event 5, including through
	   blocked and the requeue, and a reset (re-folding from empty) recomputes
	   it from the log rather than trusting anything stored. */
	for (let upTo = 5; upTo <= events.length; upTo += 1) {
		const prefix = reduceRun(events.slice(0, upTo));
		assert.equal(prefix.licensedReviewEverRequired, true, `the requirement vanished after event ${upTo}`);
	}
	assert.equal(reduceRun(events.slice(0, 4)).licensedReviewEverRequired, false, 'the flag pre-dates the requirement, so it asserts nothing');

	/* The gate still opens for the right actor on the same walk - in-test
	   only, never in a rendered fixture. */
	const licensed = applyEvent(reduceRun(events.slice(0, 11)), {
		id: 'p1-12-licensed', state: 'approved', at: at(12), actor: 'licensed-reviewer',
		note: 'Synthetic licensed-reviewer event, in-test only, proving the persistent gate opens for the right actor.', synthetic: true,
	});
	assert.equal(licensed.state, 'approved');
	assert.deepEqual(licensed.problems, [], 'the licensed reviewer was refused on the requeued path');

	/* A run that never required licensed review is untouched by this guard. */
	const ordinary = reduceRun(fixtures.find((f) => f.name === 'success.json').events);
	assert.equal(ordinary.licensedReviewEverRequired, false);
	assert.equal(ordinary.state, 'refresh-due', 'the success path regressed');
});

test('no rendered fixture carries an approval past the licensed gate', () => {
	/* The in-test control above is the only place a licensed approval may
	   exist. A fixture is rendered on a page, so a licensed-reviewer approval
	   there would put a review that never happened in front of a reader. */
	for (const f of fixtures) {
		for (const event of f.events) {
			assert.ok(
				!(event.state === 'approved' && event.actor === 'licensed-reviewer'),
				`${f.name}/${event.id} renders a licensed approval no licensed human made`,
			);
		}
	}
});

/* ------------------------------------------------------------------ */
/* Honesty: no invented progress anywhere                               */
/* ------------------------------------------------------------------ */

test('the machine and the page contain no timer, no percentage, and no progress bar', () => {
	/* Comments may state the rule ("no percentage"); code may not break it. So
	   the scan runs over comment-stripped source, the same way the prose-slice
	   guard in verify.mjs reads code rather than its commentary. */
	const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/^\s*\*.*$/gm, '');
	const moduleSource = stripComments(read(path.join(ROOT, 'src/lib/research-run.ts')));
	/* The page's <style> block is layout, where 100% widths are ordinary; a
	   fake progress display would need markup or script, which stay scanned. */
	const pageSource = stripComments(read(path.join(ROOT, 'src/pages/research/runs/[id].astro')).replace(/<style>[\s\S]*?<\/style>/g, ''));
	for (const [name, source] of [['research-run.ts', moduleSource], ['[id].astro', pageSource]]) {
		assert.ok(!/setInterval|setTimeout|requestAnimationFrame/.test(source), `${name} contains a timer; progress must be event-driven`);
		assert.ok(!/<progress/i.test(source), `${name} renders a progress element with nothing truthful to fill it`);
		/* The page may SAY it never shows a percentage - that sentence is the
		   boundary. What may not exist is a percentage next to a number, a
		   "N% complete" phrase, or the arithmetic to produce one. */
		assert.ok(!/\d\s*%|%\s*\d|% complete|\bpercentComplete\b|\btoFixed\(/i.test(source), `${name} computes or renders a numeric percentage`);
		assert.ok(!/Math\.random/.test(source), `${name} uses randomness`);
	}
});

test('the honest status line carries only recorded facts', () => {
	const success = reduceRun(fixtures.find((f) => f.name === 'success.json').events);
	const status = honestStatus(success);
	assert.match(status, /Refresh due/);
	assert.match(status, /as of 2026-09-26T10:30:00\.000Z/);
	assert.match(status, /2 source candidates/);
	assert.match(status, /3 claims mapped/);
	assert.ok(!/%/.test(status), 'the status line contains a percentage');

	const fresh = honestStatus(emptyRun());
	assert.ok(!/as of/.test(fresh), 'an empty run claims a timestamp it does not have');
});

/* ------------------------------------------------------------------ */
/* The B1 P2-4 rule: unknown-since is never positive evidence           */
/* ------------------------------------------------------------------ */

test('an unknown edge start is non-assertable, never proof of standing', () => {
	assert.equal(evidenceAssertableOn({ since: 'unknown', until: null }, '2026-09-26'), 'non-assertable');
	assert.equal(evidenceAssertableOn({ since: '2020-01-01', until: null }, '2026-09-26'), 'assertable');
	assert.equal(evidenceAssertableOn({ since: '2020-01-01', until: '2024-01-01' }, '2026-09-26'), 'non-assertable');
	assert.equal(evidenceAssertableOn({ since: '2027-01-01', until: null }, '2026-09-26'), 'non-assertable');
	/* The boundary agrees with edgeHoldsOn: since-inclusive, until-exclusive. */
	assert.equal(evidenceAssertableOn({ since: '2026-09-26', until: null }, '2026-09-26'), 'assertable');
	assert.equal(evidenceAssertableOn({ since: '2020-01-01', until: '2026-09-26' }, '2026-09-26'), 'non-assertable');
});

/* ------------------------------------------------------------------ */
/* Run identity                                                         */
/* ------------------------------------------------------------------ */

test('run ids are deterministic, addressable, and collision-free across fixtures', () => {
	const ids = fixtureNames.map((name) => runIdFor(name));
	assert.deepEqual(ids, fixtureNames.map((name) => runIdFor(name)), 'run ids are not deterministic');
	assert.equal(new Set(ids).size, ids.length, 'two fixtures derived one run id');
	for (const id of ids) assert.ok(isRunId(id), `${id} is not an addressable run id`);
});

/* ------------------------------------------------------------------ */
/* Built output, in whichever posture the build used                    */
/* ------------------------------------------------------------------ */

const built = fs.existsSync(path.join(DIST, 'research'));

test('every fixture run page is built, noindex, out of the sitemap, and disclosed as synthetic', { skip: !built && 'dist/ not built; npm run validate covers this half' }, () => {
	const sitemaps = fs.readdirSync(DIST).filter((f) => /^sitemap.*\.xml$/.test(f)).map((f) => read(path.join(DIST, f))).join('\n');
	assert.ok(!sitemaps.includes('/research/'), 'a research-run preview is advertised in the sitemap');

	for (const name of fixtureNames) {
		const id = runIdFor(name);
		const page = path.join(DIST, 'research/runs', id, 'index.html');
		assert.ok(fs.existsSync(page), `run page for ${name} was not built`);
		const html = read(page);
		assert.match(html, /<meta name="robots" content="noindex, nofollow">/, `${id} is indexable; run previews must be noindex in every posture`);
		assert.match(html, /Synthetic research-run preview/, `${id} does not disclose that it is synthetic`);
		assert.match(html, /No provider was called/, `${id} does not disclose that no provider was called`);
		assert.ok(html.includes('role="status"'), `${id} has no status region`);
		assert.ok(!html.includes('aria-live="assertive"'), `${id} interrupts the reader`);
		assert.ok(html.includes(id), `${id} does not display its own addressable run id`);

		const companion = path.join(DIST, 'research/runs', `${id}.json`);
		assert.ok(fs.existsSync(companion), `${id} has no JSON companion`);
		const record = JSON.parse(read(companion));
		assert.equal(record.synthetic, true, `${id} companion does not declare itself synthetic`);
		assert.equal(record.recordType, 'research-run-fixture');
		assert.ok(Array.isArray(record.events) && record.events.length > 0, `${id} companion carries no events`);
	}
});

test('the run page renders every recorded event with its timestamp, and no invented ones', { skip: !built && 'dist/ not built; npm run validate covers this half' }, () => {
	for (const f of fixtures) {
		const html = read(path.join(DIST, 'research/runs', runIdFor(f.name), 'index.html'));
		for (const event of f.events) {
			assert.ok(html.includes(event.at), `${f.name}: recorded timestamp ${event.at} is not on the page`);
		}
		const rendered = (html.match(/data-run-step=/g) ?? []).length;
		assert.equal(rendered, f.events.length, `${f.name}: page renders ${rendered} steps for ${f.events.length} recorded events`);
	}
});
