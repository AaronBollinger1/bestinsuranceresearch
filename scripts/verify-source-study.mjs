/**
 * BR-C1 verification: source studies and atomic claims.
 *
 * Two halves, same shape as the graph and registry suites:
 *
 *   1. The real corpus must derive cleanly: every source record becomes a
 *      study carrying publisher, stable URL, title, dates, jurisdiction,
 *      authority tier, its extracted propositions at their published
 *      `<source-id>#cN` addresses, an HONEST rights note (unrecorded,
 *      because the schema has no rights field yet), and its freshness rule -
 *      and the study set agrees with the B1 graph's source nodes in both
 *      directions, so no second source registry can appear.
 *   2. Synthetic fixtures with known outcomes exercise both sides of every
 *      boundary in the claim fold: confirmed, disputed-and-resolved with the
 *      conflict kept visible, stale-refresh-reconfirm, and the high-stakes
 *      study that honestly ends ineligible because no licensed review
 *      exists. Negative controls prove each refusal fires, including the
 *      BR-B-P1-shaped laundering walk: high stakes survives every dispute,
 *      staleness, refresh, and re-confirmation cycle.
 *
 *   node --experimental-strip-types --test scripts/verify-source-study.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	AUTHORITY_TIERS,
	CLAIM_STATES,
	CLAIM_EVENT_KINDS,
	buildSourceStudies,
	evaluateFreshness,
	quotationAllowed,
	emptyClaimStudy,
	applyClaimEvent,
	reduceClaimStudy,
	publicationEligibility,
} from '../src/lib/source-study.ts';
import { buildGraph } from '../src/lib/graph/build.ts';
import { unavailableFields } from '../src/lib/graph/contract.ts';
import { CANONICAL_LINES } from '../src/lib/lines.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'src/content');
const FIXTURES = path.join(ROOT, 'scripts/fixtures/claim-studies');

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

const sources = collection('sources');
const { studies, problems } = buildSourceStudies(sources);
const studiesById = new Map(studies.map((s) => [s.sourceId, s]));

const fixtureNames = fs.readdirSync(FIXTURES).filter((f) => f.endsWith('.json')).sort();
const fixtures = fixtureNames.map((name) => ({ name, ...JSON.parse(read(path.join(FIXTURES, name))) }));

/* ------------------------------------------------------------------ */
/* The real corpus derives cleanly                                     */
/* ------------------------------------------------------------------ */

test('every source record becomes a study carrying every required field', () => {
	assert.deepEqual(problems, [], problems.map((p) => `${p.sourceId}: ${p.problem}`).join('\n'));
	assert.equal(studies.length, sources.length, 'a source record failed to derive a study');
	assert.ok(studies.length > 250, `only ${studies.length} studies; the corpus check has stopped covering it`);
	for (const study of studies) {
		assert.ok(study.title && study.publisher && study.jurisdiction, `${study.sourceId} is missing identity fields`);
		assert.match(study.url, /^https?:\/\//, `${study.sourceId} has no stable URL`);
		assert.ok(AUTHORITY_TIERS.includes(study.authorityTier), `${study.sourceId} tier ${study.authorityTier}`);
		assert.match(study.dates.accessed, /^\d{4}-\d{2}-\d{2}$/, `${study.sourceId} has no access date`);
		assert.ok(study.freshness.cadence.length >= 3, `${study.sourceId} has no freshness cadence`);
		assert.match(study.freshness.lastChecked, /^\d{4}-\d{2}-\d{2}$/, `${study.sourceId} has no lastChecked`);
		assert.ok(['access', 'recheck'].includes(study.freshness.basis), `${study.sourceId} basis ${study.freshness.basis}`);
		assert.ok(study.propositions.length >= 1, `${study.sourceId} extracted no proposition`);
	}
});

test('extracted propositions carry the published claim addresses, in order', () => {
	for (const source of sources) {
		const study = studiesById.get(source.id);
		assert.ok(study, `${source.id} has no study`);
		assert.equal(study.propositions.length, source.data.claims.length, `${source.id} proposition count drifted`);
		study.propositions.forEach((proposition, index) => {
			assert.equal(proposition.address, `${source.id}#c${index + 1}`, `${source.id} proposition ${index + 1} address drifted`);
			assert.equal(proposition.text, source.data.claims[index], `${source.id} proposition ${index + 1} text drifted`);
		});
	}
});

test('the study set is a view over the graph, not a second source registry', () => {
	const graph = buildGraph({
		sources,
		questions: collection('questions'),
		coverages: collection('coverages'),
		companies: collection('companies'),
		states: collection('states'),
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
	const graphSourceIds = new Set(graph.nodes.filter((n) => n.kind === 'source').map((n) => n.id));
	for (const study of studies) {
		assert.ok(graphSourceIds.has(study.nodeId), `${study.sourceId} is a study but not a graph source node`);
	}
	const studyNodeIds = new Set(studies.map((s) => s.nodeId));
	for (const id of graphSourceIds) {
		assert.ok(studyNodeIds.has(id), `${id} is a graph source node but derived no study`);
	}
});

test('rights are honestly unrecorded corpus-wide, held against the contract register', () => {
	/* If a later unit closes the rightsLicense gap, unavailableFields() stops
	   listing it, the derivation flips, and this test demands a deliberate
	   update instead of letting the two drift apart. */
	assert.ok(unavailableFields().includes('rightsLicense'), 'the contract closed the rights gap; update the study derivation deliberately');
	for (const study of studies) {
		assert.equal(study.rights.status, 'unrecorded', `${study.sourceId} claims recorded rights the schema cannot hold`);
		assert.ok(study.rights.note.length > 40, `${study.sourceId} rights note does not explain itself`);
		const quote = quotationAllowed(study);
		assert.equal(quote.allowed, false, `${study.sourceId} would allow bulk quotation on unrecorded rights`);
	}
	assert.equal(quotationAllowed({ rights: { status: 'recorded', note: 'recorded' } }).allowed, true, 'the quotation gate never opens, so it asserts nothing');
});

test('freshness is a policy decision: unknown without one, boundary-exact with one', () => {
	const study = { freshness: { cadence: 'Recheck each cycle.', lastChecked: '2026-06-01', basis: 'access' } };
	assert.equal(evaluateFreshness(study, '2026-09-26'), 'unknown', 'staleness was asserted with no policy');
	assert.equal(evaluateFreshness(study, '2026-09-26', { staleAfterDays: 30 }), 'stale');
	assert.equal(evaluateFreshness(study, '2026-09-26', { staleAfterDays: 365 }), 'fresh');
	/* Boundary: exactly at the policy edge is fresh; one day past is stale. */
	assert.equal(evaluateFreshness(study, '2026-07-01', { staleAfterDays: 30 }), 'fresh');
	assert.equal(evaluateFreshness(study, '2026-07-02', { staleAfterDays: 30 }), 'stale');
	assert.equal(evaluateFreshness(study, '2026-05-01', { staleAfterDays: 30 }), 'unknown', 'a check date after the as-of date is not evidence of freshness');
	assert.equal(evaluateFreshness(study, '2026-09-26', { staleAfterDays: 0 }), 'unknown', 'a degenerate policy must not assert staleness');
});

/* ------------------------------------------------------------------ */
/* The claim fold over the fixtures                                    */
/* ------------------------------------------------------------------ */

test('the model declares the four required claim states and every event kind explains itself', () => {
	assert.deepEqual([...CLAIM_STATES].sort(), ['confirmed', 'disputed', 'review-required', 'stale']);
	assert.ok(CLAIM_EVENT_KINDS.includes('licensed-review-recorded'));
	assert.equal(fixtures.length, 4, `expected the four BR-C1 paths, found ${fixtures.length}`);
});

test('every fixture folds cleanly to its constructed outcome', () => {
	for (const f of fixtures) {
		const built = buildSourceStudies(f.sources);
		assert.deepEqual(built.problems, [], `${f.name} fixture sources do not derive: ${built.problems.map((p) => p.problem).join('; ')}`);
		const known = new Set(built.studies.map((s) => s.sourceId));
		const snapshot = reduceClaimStudy(f.events);
		assert.deepEqual(snapshot.problems, [], `${f.name}: ${snapshot.problems.map((p) => p.problem).join('; ')}`);
		assert.equal(snapshot.state, f._expects.finalState, `${f.name} ended ${snapshot.state}`);
		if (f._expects.highStakes !== undefined) assert.equal(snapshot.highStakes, f._expects.highStakes, `${f.name} highStakes`);
		const verdict = publicationEligibility(snapshot, { knownSourceIds: known });
		assert.equal(verdict.eligible, f._expects.eligible, `${f.name} eligibility: ${verdict.blockers.join('; ')}`);
		if (f._expects.licensedBlocker) {
			assert.ok(verdict.blockers.some((b) => /licensed review/.test(b)), `${f.name} is missing the licensed blocker`);
		}
		if (f._expects.conflictsRetained !== undefined) {
			assert.equal(snapshot.conflicts.length, f._expects.conflictsRetained, `${f.name} lost a conflict record`);
			assert.ok(snapshot.conflicts.every((c) => c.resolution), `${f.name} is eligible with an unresolved conflict`);
		}
	}
});

test('every fixture event is timestamped, explained, synthetic, and never a licensed review', () => {
	for (const f of fixtures) {
		let previous = '';
		for (const event of f.events) {
			assert.match(event.at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, `${f.name}/${event.id} has no ISO instant`);
			assert.ok(event.at >= previous, `${f.name}/${event.id} moves time backwards`);
			previous = event.at;
			assert.ok(event.note.length > 20, `${f.name}/${event.id} has no plain-language note`);
			assert.equal(event.synthetic, true, `${f.name}/${event.id} does not declare itself synthetic`);
			/* The clearing event is in-test only. A fixture recording one would
			   model a licensed review that never happened as normal data. */
			assert.notEqual(event.kind, 'licensed-review-recorded', `${f.name}/${event.id} records a licensed review no licensed human made`);
			assert.notEqual(event.actor, 'licensed-reviewer', `${f.name}/${event.id} carries a licensed-reviewer actor`);
		}
	}
});

test('the fold is idempotent and resumable at every split point', () => {
	for (const f of fixtures) {
		const whole = reduceClaimStudy(f.events);
		const doubled = reduceClaimStudy(f.events.flatMap((e) => [e, e]));
		assert.deepEqual(doubled, whole, `${f.name}: duplicated events changed the fold`);
		for (let split = 0; split <= f.events.length; split += 1) {
			const resumed = reduceClaimStudy(f.events.slice(split), reduceClaimStudy(f.events.slice(0, split)));
			assert.deepEqual(resumed, whole, `${f.name} split at ${split} folded differently`);
		}
	}
});

/* ------------------------------------------------------------------ */
/* Refusals, each proven to fire                                       */
/* ------------------------------------------------------------------ */

const at = (m) => `2026-09-27T09:${String(m).padStart(2, '0')}:00.000Z`;
const open = (stakes) =>
	reduceClaimStudy([
		{ id: 'o1', kind: 'opened', at: at(0), actor: 'editor', note: 'Opened for the refusal controls below.', claimRef: 'fixture-src-x#c1', text: 'A fixture proposition for the controls.', stakes, synthetic: true },
	]);

test('NEGATIVE: a claim cannot be confirmed without support, over a conflict, by a system, or while stale', () => {
	const bare = open('standard');
	const noSupport = applyClaimEvent(bare, { id: 'n1', kind: 'confirmed', at: at(1), actor: 'editor', note: 'Confirm with nothing behind it.', synthetic: true });
	assert.ok(noSupport.problems.some((p) => /no supporting source/.test(p.problem)));
	assert.equal(noSupport.state, 'review-required');

	let supported = applyClaimEvent(bare, { id: 'n2', kind: 'support-added', at: at(1), actor: 'editor', note: 'One supporting source attached.', sourceId: 'fixture-src-x', synthetic: true });
	const bySystem = applyClaimEvent(supported, { id: 'n3', kind: 'confirmed', at: at(2), actor: 'system', note: 'A system attempting to confirm.', synthetic: true });
	assert.ok(bySystem.problems.some((p) => /system cannot confirm/.test(p.problem)));

	const conflicted = applyClaimEvent(supported, { id: 'n4', kind: 'conflict-recorded', at: at(2), actor: 'editor', note: 'A second source disagrees about the proposition.', between: ['fixture-src-x', 'fixture-src-y'], synthetic: true });
	assert.equal(conflicted.state, 'disputed');
	const overConflict = applyClaimEvent(conflicted, { id: 'n5', kind: 'confirmed', at: at(3), actor: 'editor', note: 'Confirm over the open disagreement.', synthetic: true });
	assert.ok(overConflict.problems.some((p) => /average a disagreement/.test(p.problem)), 'a confirmation over an open conflict was accepted');
	assert.equal(overConflict.state, 'disputed');

	const stale = applyClaimEvent(supported, { id: 'n6', kind: 'stale-marked', at: at(3), actor: 'system', note: 'The fixture policy says the reading is too old.', synthetic: true });
	const confirmStale = applyClaimEvent(stale, { id: 'n7', kind: 'confirmed', at: at(4), actor: 'editor', note: 'Confirm without re-reading.', synthetic: true });
	assert.ok(confirmStale.problems.some((p) => /refreshed and re-read/.test(p.problem)), 'a stale claim was confirmed without a refresh');
});

test('NEGATIVE: a conflict cannot be resolved by deletion, twice, or without saying how', () => {
	let study = open('standard');
	study = applyClaimEvent(study, { id: 'c1', kind: 'support-added', at: at(1), actor: 'editor', note: 'Support attached for the conflict controls.', sourceId: 'fixture-src-x', synthetic: true });
	study = applyClaimEvent(study, { id: 'c2', kind: 'conflict-recorded', at: at(2), actor: 'editor', note: 'Two fixture sources disagree.', between: ['fixture-src-x', 'fixture-src-y'], synthetic: true });

	const noHow = applyClaimEvent(study, { id: 'c3', kind: 'conflict-resolved', at: at(3), actor: 'editor', note: 'Resolved, without saying how.', between: ['fixture-src-x', 'fixture-src-y'], synthetic: true });
	assert.ok(noHow.problems.some((p) => /Dropping a side is not a resolution/.test(p.problem)));

	const wrongPair = applyClaimEvent(study, { id: 'c4', kind: 'conflict-resolved', at: at(3), actor: 'editor', note: 'Resolving a conflict that was never recorded.', between: ['fixture-src-x', 'fixture-src-z'], resolutionHow: 'superseded', synthetic: true });
	assert.ok(wrongPair.problems.some((p) => /no recorded conflict/.test(p.problem)));

	const resolved = applyClaimEvent(study, { id: 'c5', kind: 'conflict-resolved', at: at(3), actor: 'editor', note: 'The second source supersedes the first by its own terms.', between: ['fixture-src-y', 'fixture-src-x'], resolutionHow: 'superseded', synthetic: true });
	assert.equal(resolved.conflicts.length, 1, 'resolution removed the conflict record');
	assert.ok(resolved.conflicts[0].resolution, 'resolution was not recorded on the conflict');
	assert.equal(resolved.state, 'review-required', 'resolving a conflict confirmed the claim by itself');

	const again = applyClaimEvent(resolved, { id: 'c6', kind: 'conflict-resolved', at: at(4), actor: 'editor', note: 'Resolving the same conflict a second way.', between: ['fixture-src-x', 'fixture-src-y'], resolutionHow: 'narrowed', synthetic: true });
	assert.ok(again.problems.some((p) => /already resolved/.test(p.problem)), 'a recorded resolution was overwritten');
});

test('high stakes is declared at opening, never inferred, and never laundered away', () => {
	/* The BR-B-P1-shaped walk, restated for claims: a high-stakes claim runs
	   through dispute, resolution, staleness, refresh, narrowing, and
	   re-confirmation. The flag must hold at every fold point, and
	   eligibility must still name the licensed blocker at the end. */
	const walk = [
		{ id: 'h1', kind: 'opened', at: at(0), actor: 'editor', note: 'Opened as high stakes: the proposition concerns what a coverage must include.', claimRef: 'fixture-src-x#c1', text: 'A fixture coverage-requirement proposition.', stakes: 'high', synthetic: true },
		{ id: 'h2', kind: 'support-added', at: at(1), actor: 'editor', note: 'Support attached.', sourceId: 'fixture-src-x', synthetic: true },
		{ id: 'h3', kind: 'conflict-recorded', at: at(2), actor: 'editor', note: 'A second source disagrees.', between: ['fixture-src-x', 'fixture-src-y'], synthetic: true },
		{ id: 'h4', kind: 'conflict-resolved', at: at(3), actor: 'editor', note: 'The first source supersedes the second by its own terms.', between: ['fixture-src-x', 'fixture-src-y'], resolutionHow: 'superseded', synthetic: true },
		{ id: 'h5', kind: 'stale-marked', at: at(4), actor: 'system', note: 'The fixture policy marks the reading stale.', synthetic: true },
		{ id: 'h6', kind: 'refreshed', at: at(5), actor: 'editor', note: 'Re-read; review reopens.', synthetic: true },
		{ id: 'h7', kind: 'narrowed', at: at(6), actor: 'editor', note: 'Narrowed to the renewal case only.', text: 'A narrowed fixture coverage-requirement proposition.', synthetic: true },
		{ id: 'h8', kind: 'confirmed', at: at(7), actor: 'editor', note: 'Re-confirmed against the passage after narrowing.', synthetic: true },
	];
	for (let upTo = 1; upTo <= walk.length; upTo += 1) {
		assert.equal(reduceClaimStudy(walk.slice(0, upTo)).highStakes, true, `high stakes vanished after event ${upTo}`);
	}
	const end = reduceClaimStudy(walk);
	assert.deepEqual(end.problems, []);
	assert.equal(end.state, 'confirmed');
	const verdict = publicationEligibility(end, { knownSourceIds: new Set(['fixture-src-x', 'fixture-src-y']) });
	assert.equal(verdict.eligible, false, 'a high-stakes claim became eligible with no licensed review on file');
	assert.deepEqual(verdict.blockers, ['high-stakes claims require a recorded licensed review, and none exists']);

	/* Only a licensed reviewer's own event clears it - proven in-test only. */
	const editorAttempt = applyClaimEvent(end, { id: 'h9', kind: 'licensed-review-recorded', at: at(8), actor: 'editor', note: 'An editor attempting to record a licensed review.', synthetic: true });
	assert.ok(editorAttempt.problems.some((p) => /only a licensed reviewer/.test(p.problem)));
	assert.equal(editorAttempt.licensedReviewRecorded, false);

	const cleared = applyClaimEvent(end, { id: 'h10', kind: 'licensed-review-recorded', at: at(8), actor: 'licensed-reviewer', note: 'Synthetic licensed-reviewer event, in-test only, proving the gate opens for the right actor.', synthetic: true });
	assert.equal(cleared.licensedReviewRecorded, true);
	assert.equal(publicationEligibility(cleared, { knownSourceIds: new Set(['fixture-src-x', 'fixture-src-y']) }).eligible, true);

	/* And stakes cannot be smuggled in as anything but a declaration. */
	const inferred = applyClaimEvent(emptyClaimStudy(), { id: 'h11', kind: 'opened', at: at(0), actor: 'editor', note: 'Opened without declaring stakes.', claimRef: 'x#c1', text: 'A proposition with no declared stakes.', synthetic: true });
	assert.ok(inferred.problems.some((p) => /never inferred/.test(p.problem)));
});

test('eligibility names every blocker and validates supporting sources against known records', () => {
	const never = publicationEligibility(emptyClaimStudy());
	assert.equal(never.eligible, false);
	assert.ok(never.blockers.some((b) => /never opened/.test(b)));

	let study = open('standard');
	study = applyClaimEvent(study, { id: 'e1', kind: 'support-added', at: at(1), actor: 'editor', note: 'Support pointing at a source that does not exist.', sourceId: 'fixture-src-ghost', synthetic: true });
	study = applyClaimEvent(study, { id: 'e2', kind: 'confirmed', at: at(2), actor: 'editor', note: 'Confirmed against the ghost source.', synthetic: true });
	const verdict = publicationEligibility(study, { knownSourceIds: new Set(['fixture-src-x']) });
	assert.equal(verdict.eligible, false);
	assert.ok(verdict.blockers.some((b) => /not a known source record/.test(b)), 'a ghost supporting source went unnoticed');

	const superseded = applyClaimEvent(study, { id: 'e3', kind: 'superseded', at: at(3), actor: 'editor', note: 'Superseded by a later study.', synthetic: true });
	assert.ok(publicationEligibility(superseded).blockers.some((b) => /superseded/.test(b)));
	const after = applyClaimEvent(superseded, { id: 'e4', kind: 'confirmed', at: at(4), actor: 'editor', note: 'An event after supersession.', synthetic: true });
	assert.ok(after.problems.some((p) => /accepts no further events/.test(p.problem)), 'a superseded study accepted an event');
});

test('the fold refuses backdated, unopened, non-synthetic, and note-free events', () => {
	const study = open('standard');
	const backdated = applyClaimEvent(study, { id: 'b1', kind: 'support-added', at: '2026-09-26T00:00:00.000Z', actor: 'editor', note: 'A backdated support event.', sourceId: 'fixture-src-x', synthetic: true });
	assert.ok(backdated.problems.some((p) => /moves time backwards/.test(p.problem)));

	const unopened = applyClaimEvent(emptyClaimStudy(), { id: 'b2', kind: 'confirmed', at: at(1), actor: 'editor', note: 'Confirming a study that was never opened.', synthetic: true });
	assert.ok(unopened.problems.some((p) => /before the study was opened/.test(p.problem)));

	const live = applyClaimEvent(study, { id: 'b3', kind: 'support-added', at: at(1), actor: 'editor', note: 'An event claiming to be live.', sourceId: 'fixture-src-x', synthetic: false });
	assert.ok(live.problems.some((p) => /declare itself synthetic/.test(p.problem)));

	const mute = applyClaimEvent(study, { id: 'b4', kind: 'support-added', at: at(1), actor: 'editor', note: '  ', sourceId: 'fixture-src-x', synthetic: true });
	assert.ok(mute.problems.some((p) => /no plain-language note/.test(p.problem)));
});

test('the module writes nothing, fetches nothing, and reads no gate flag of its own', () => {
	const source = read(path.join(ROOT, 'src/lib/source-study.ts'));
	assert.ok(!/from\s+'node:fs'|require\(\s*'node:fs'/.test(source), 'the module imports the filesystem');
	assert.ok(!/\bfetch\s*\(/.test(source), 'the module makes a network call');
	assert.ok(!/PUBLIC_COMMONS_READY|process\.env/.test(source), 'the module reads environment gates it has no business deciding');
	assert.notEqual(process.env.PUBLIC_COMMONS_READY, 'true', 'Commons must remain closed for this unit');
});
