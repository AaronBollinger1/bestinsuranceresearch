/**
 * BR-C2 verification: the evidence-first answer, citation, and conflict
 * workflow.
 *
 * The properties that matter here are structural, so they are tested as
 * properties rather than examples where possible:
 *
 *   - NO INVENTION: every sentence a composed answer contains is
 *     byte-identical to an input claim's current wording. The composer can
 *     select and order; it cannot write.
 *   - TOTAL CONFLICT COPY: every conflict on every included claim appears in
 *     the composed output, resolutions attached.
 *   - CORRECTIONS STAY VISIBLE: every narrowing is copied with the wording it
 *     replaced and the wording that followed, and the replaced wording is
 *     not smuggled back in as a sentence.
 *   - DATES AND UNCERTAINTY: a missing effective date is labeled "no effective
 *     date stated"; unrecorded rights are named. Neither is filled in.
 *   - AUDIENCES: a consumer answer and a professional answer carry the same
 *     evidence and name who they are written for.
 *   - GATE INDEPENDENCE: for each of the seven gates there is an assembly
 *     that fails exactly that gate while the other six pass, so a verdict is
 *     never one lump nobody can route.
 *   - HONEST ABSENCE: no claims (or none with support) is research-required;
 *     everything else blocked is review-required; neither carries an answer.
 *   - THE RESOLVED P3 PAIR: the topic floor forces the licensed gate on a
 *     standard-declared claim and nothing can lower stakes below it; a
 *     licensed review pins its wording, so a claim narrowed after review is
 *     blocked until re-reviewed.
 *   - knownSourceIds is ALWAYS passed: structurally (the workflow builds it
 *     from the assembly's own studies) and by source scan (no eligibility
 *     call exists without it).
 *
 *   node --experimental-strip-types --test scripts/verify-answer-workflow.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	ANSWER_GATES,
	HIGH_STAKES_ANSWER_TOPICS,
	topicForcesHighStakes,
	answerGates,
	composeAnswer,
} from '../src/lib/answer-workflow.ts';
import { buildSourceStudies, reduceClaimStudy, applyClaimEvent, publicationEligibility } from '../src/lib/source-study.ts';
import { buildQuestionRegistry } from '../src/lib/question-registry.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = path.join(ROOT, 'scripts/fixtures/answer-workflow');

const read = (file) => fs.readFileSync(file, 'utf8');
const fixture = (name) => JSON.parse(read(path.join(FIXTURES, name)));

const registry = buildQuestionRegistry(
	JSON.parse(read(path.join(ROOT, 'scripts/fixtures/question-registry/synthetic-registry.json'))).questions,
);

/** Materialize a fixture file into a live assembly. */
function assemble(f) {
	const { studies, problems } = buildSourceStudies(f.sources);
	assert.deepEqual(problems, [], `fixture sources do not derive: ${problems.map((p) => p.problem).join('; ')}`);
	const claims = f.claimEventLogs.map((log) => {
		const snapshot = reduceClaimStudy(log);
		assert.deepEqual(snapshot.problems, [], `fixture claim log does not fold: ${snapshot.problems.map((p) => p.problem).join('; ')}`);
		return snapshot;
	});
	return { ...f.assembly, claims, sources: studies };
}

const fixtureNames = fs.readdirSync(FIXTURES).filter((f) => f.endsWith('.json')).sort();

/* ------------------------------------------------------------------ */
/* Fixture outcomes                                                    */
/* ------------------------------------------------------------------ */

test('every fixture assembly reaches its constructed outcome', () => {
	assert.equal(fixtureNames.length, 4, `expected the four BR-C2 paths, found ${fixtureNames.length}`);
	for (const name of fixtureNames) {
		const f = fixture(name);
		const outcome = composeAnswer(assemble(f), registry);
		assert.equal(outcome.status, f._expects.status, `${name} ended ${outcome.status}: ${outcome.status !== 'composed' ? outcome.reasons.join('; ') : ''}`);
		if (f._expects.failingGate) {
			const failed = outcome.gates.filter((g) => !g.ok).map((g) => g.gate);
			assert.ok(failed.includes(f._expects.failingGate), `${name} failed ${failed.join(', ')}, not ${f._expects.failingGate}`);
		}
		if (f._expects.failingGates) {
			const failed = outcome.gates.filter((g) => !g.ok).map((g) => g.gate).sort();
			assert.deepEqual(failed, [...f._expects.failingGates].sort(), `${name} failed ${failed.join(', ')}`);
		}
		if (f._expects.status === 'composed') {
			assert.equal(outcome.answer.sentences.length, f._expects.sentences);
			assert.equal(outcome.answer.conflicts.length, f._expects.conflictsCarried);
			if (f._expects.corrections != null) assert.equal(outcome.answer.corrections.length, f._expects.corrections);
		} else {
			assert.ok(!('answer' in outcome), `${name} is ${outcome.status} and still carries an answer`);
			assert.ok(outcome.reasons.length > 0, `${name} blocked without naming a reason`);
			assert.match(outcome.uncertainty.join(' '), /Nothing was filled in/);
		}
	}
});

test('a composed answer is nothing but its inputs: sentences verbatim, conflicts total, citations from studies', () => {
	const f = fixture('composed.json');
	const assembly = assemble(f);
	const outcome = composeAnswer(assembly, registry);
	assert.equal(outcome.status, 'composed');
	const answer = outcome.answer;

	/* NO INVENTION: every output sentence is byte-identical to an input
	   claim's current wording, and there is exactly one per claim. */
	const claimTexts = assembly.claims.map((c) => c.text);
	assert.deepEqual(answer.sentences.map((s) => s.text), claimTexts, 'a sentence exists that is not a claim wording');

	/* TOTAL CONFLICT COPY: every conflict on every claim, resolution attached. */
	const inputConflicts = assembly.claims.flatMap((c) => c.conflicts);
	assert.equal(answer.conflicts.length, inputConflicts.length, 'a conflict was dropped on the way to the answer');
	for (const conflict of answer.conflicts) {
		assert.ok(conflict.resolution, 'a resolved conflict lost its resolution in the copy');
		assert.ok(conflict.note.length > 10, 'a conflict lost its note');
	}

	/* Claim-level citations carry the display fields BR-C2 requires. */
	for (const sentence of answer.sentences) {
		assert.ok(sentence.citations.length >= 1, `${sentence.claimRef} has no citation`);
		for (const citation of sentence.citations) {
			assert.ok(citation.title && citation.publisher && citation.url, `${citation.sourceId} citation is missing identity`);
			assert.ok(citation.authorityTier, `${citation.sourceId} citation has no authority tier`);
			assert.ok(citation.accessedDate, `${citation.sourceId} citation has no access date`);
			assert.ok('effectiveDate' in citation, `${citation.sourceId} citation hides its effective date field`);
			assert.equal(
				citation.effectiveDateLabel,
				citation.effectiveDate ?? 'no effective date stated',
				`${citation.sourceId} effective date is not shown honestly`,
			);
			assert.match(citation.rightsNote, /rights/i, `${citation.sourceId} citation does not carry the rights note`);
		}
	}
	const statute = answer.sentences[0].citations[0];
	const bulletin = answer.sentences[1].citations[0];
	assert.equal(statute.effectiveDate, '2025-07-01');
	assert.equal(statute.effectiveDateLabel, '2025-07-01');
	assert.equal(bulletin.sourceId, 'fixture-src-widget-bulletin');
	assert.equal(bulletin.effectiveDate, null);
	assert.equal(bulletin.effectiveDateLabel, 'no effective date stated');

	/* The replaced wording is a correction, not a second sentence. */
	assert.equal(answer.corrections.length, assembly.claims.reduce((n, claim) => n + claim.wordingHistory.length, 0));
	assert.equal(answer.corrections.length, 1);
	assert.equal(answer.corrections[0].was, 'The fixture regulator enforces the widget labeling rule.');
	assert.equal(answer.corrections[0].now, answer.sentences[1].text);
	assert.ok(!answer.sentences.some((sentence) => sentence.text === answer.corrections[0].was), 'a corrected wording was republished as a current sentence');

	/* Residual uncertainty names the real gaps and does not invent a date. */
	assert.ok(answer.uncertainty.some((note) => /fixture-src-widget-bulletin states no effective date/.test(note)));
	assert.ok(answer.uncertainty.some((note) => /Rights for fixture-src-widget-statute are unrecorded/.test(note)));
	assert.ok(answer.uncertainty.some((note) => /Rights for fixture-src-widget-bulletin are unrecorded/.test(note)));
	assert.ok(!answer.uncertainty.some((note) => /2025-07-01/.test(note)), 'uncertainty invented an effective date the statute already states');

	/* Scope and jurisdiction limits are explicit and truthful. */
	assert.equal(answer.scope.jurisdiction, 'CA');
	assert.equal(answer.scope.audience, 'consumer');
	assert.ok(answer.scope.limits.some((l) => /Written for a consumer reader/.test(l)));
	assert.ok(answer.scope.limits.some((l) => /not a statement about any other jurisdiction/.test(l)));
	assert.ok(
		answer.scope.limits.some((l) => /nothing here is individualized advice or a coverage determination/.test(l)),
		'the scope limits do not disclaim individualized advice and coverage determinations',
	);
	assert.equal(answer.editor.name, 'Fixture Editor');
});

test('composition is deterministic', () => {
	const f = fixture('composed.json');
	assert.deepEqual(composeAnswer(assemble(f), registry), composeAnswer(assemble(f), registry));
});

/* ------------------------------------------------------------------ */
/* Gate independence: each gate fails alone                            */
/* ------------------------------------------------------------------ */

test('each of the seven gates can fail alone while the other six pass', () => {
	assert.deepEqual([...ANSWER_GATES].sort(), ['canonical-intent', 'claim-source', 'conflict', 'editorial', 'freshness', 'licensed-review', 'rights'].sort());

	const clean = () => assemble(fixture('composed.json'));
	const at = (m) => `2026-09-27T11:${String(m).padStart(2, '0')}:00.000Z`;

	/* A confirmed claim over a ghost source, for the claim-source case. */
	const ghostClaim = reduceClaimStudy([
		{ id: 'gh1', kind: 'opened', at: at(0), actor: 'editor', note: 'Opened for the ghost-source control.', claimRef: 'fixture-src-ghost#c1', text: 'A proposition resting on a source no study backs.', stakes: 'standard', synthetic: true },
		{ id: 'gh2', kind: 'support-added', at: at(1), actor: 'editor', note: 'Support pointing at a study-less source.', sourceId: 'fixture-src-ghost', synthetic: true },
		{ id: 'gh3', kind: 'confirmed', at: at(2), actor: 'editor', note: 'Confirmed against the ghost.', synthetic: true },
	]);

	/* A supported claim with an unresolved conflict, both sources known. */
	const conflictedClaim = reduceClaimStudy([
		{ id: 'uc1', kind: 'opened', at: at(0), actor: 'editor', note: 'Opened for the unresolved-conflict control.', claimRef: 'fixture-src-widget-statute#c1', text: 'The fixture widget filing must be renewed each year.', stakes: 'standard', synthetic: true },
		{ id: 'uc2', kind: 'support-added', at: at(1), actor: 'editor', note: 'The statute supports it.', sourceId: 'fixture-src-widget-statute', synthetic: true },
		{ id: 'uc3', kind: 'conflict-recorded', at: at(2), actor: 'editor', note: 'The bulletin disagrees with the statute about renewal.', between: ['fixture-src-widget-statute', 'fixture-src-widget-bulletin'], synthetic: true },
	]);

	const cases = [
		['canonical-intent', (a) => ({ ...a, questionId: 'not-a-canonical-question' })],
		['claim-source', (a) => ({ ...a, claims: [...a.claims, ghostClaim] })],
		['conflict', (a) => ({ ...a, claims: [a.claims[0], conflictedClaim] })],
		['freshness', (a) => ({ ...a, freshnessPolicy: null })],
		['rights', (a) => ({ ...a, verbatimExcerpts: [{ sourceId: 'fixture-src-widget-statute', text: 'A verbatim excerpt of the source itself.' }] })],
		['editorial', (a) => ({ ...a, editor: null })],
		['licensed-review', (a) => ({ ...a, topics: ['coverage-determination'] })],
	];

	for (const [gate, mutate] of cases) {
		const gates = answerGates(mutate(clean()), registry);
		const failed = gates.filter((g) => !g.ok).map((g) => g.gate);
		assert.deepEqual(failed, [gate], `the ${gate} case failed ${failed.join(', ') || 'nothing'}`);
		const outcome = composeAnswer(mutate(clean()), registry);
		assert.notEqual(outcome.status, 'composed', `the ${gate} case still composed`);
	}
});

/* ------------------------------------------------------------------ */
/* Honest absence                                                      */
/* ------------------------------------------------------------------ */

test('consumer and professional answers expose the same evidence and name their audience', () => {
	const base = assemble(fixture('composed.json'));
	const consumer = composeAnswer({ ...base, audience: 'consumer' }, registry);
	const professional = composeAnswer({ ...base, audience: 'professional' }, registry);
	assert.equal(consumer.status, 'composed');
	assert.equal(professional.status, 'composed');
	assert.deepEqual(consumer.answer.sentences, professional.answer.sentences);
	assert.deepEqual(consumer.answer.conflicts, professional.answer.conflicts);
	assert.deepEqual(consumer.answer.corrections, professional.answer.corrections);
	assert.deepEqual(consumer.answer.uncertainty, professional.answer.uncertainty);
	assert.equal(consumer.answer.scope.jurisdiction, 'CA');
	assert.equal(professional.answer.scope.jurisdiction, 'CA');
	assert.equal(consumer.answer.scope.audience, 'consumer');
	assert.equal(professional.answer.scope.audience, 'professional');
	assert.ok(professional.answer.scope.limits.some((l) => /Written for a professional reader/.test(l)));
});

test('a dispute of the claim itself cannot compose, and an uncorrected wording mismatch fails only claim-source', () => {
	const assembly = assemble(fixture('composed.json'));
	const disputed = applyClaimEvent(assembly.claims[0], {
		id: 'dispute-1',
		kind: 'disputed',
		at: '2026-09-27T10:00:00.000Z',
		actor: 'editor',
		note: 'A reader disputes the renewal proposition itself.',
		synthetic: true,
	});
	assert.equal(disputed.problems.length, 0, disputed.problems.map((p) => p.problem).join('; '));
	const disputedGates = answerGates({ ...assembly, claims: [disputed] }, registry).filter((g) => !g.ok).map((g) => g.gate);
	assert.deepEqual(disputedGates, ['claim-source']);
	const disputedOutcome = composeAnswer({ ...assembly, claims: [disputed] }, registry);
	assert.equal(disputedOutcome.status, 'review-required');
	assert.ok(!('answer' in disputedOutcome));

	const mismatched = { ...assembly.claims[0], text: 'A different sentence nobody extracted.' };
	const mismatchGates = answerGates({ ...assembly, claims: [mismatched] }, registry).filter((g) => !g.ok).map((g) => g.gate);
	assert.deepEqual(mismatchGates, ['claim-source'], `a wording mismatch failed ${mismatchGates.join(', ') || 'nothing'}`);
	const mismatchOutcome = composeAnswer({ ...assembly, claims: [mismatched] }, registry);
	assert.equal(mismatchOutcome.status, 'review-required');
	assert.ok(!('answer' in mismatchOutcome));
});

test('no evidence routes to research; blocked evidence routes to review; neither invents an answer', () => {
	const empty = composeAnswer(assemble(fixture('research-required.json')), registry);
	assert.equal(empty.status, 'research-required');
	assert.ok(!('answer' in empty));
	assert.match(empty.uncertainty.join(' '), /Nothing was filled in/);

	const blocked = composeAnswer(assemble(fixture('blocked-licensed-floor.json')), registry);
	assert.equal(blocked.status, 'review-required', 'confirmed evidence behind a gate is a review queue, not a research gap');
	assert.ok(!('answer' in blocked));
	assert.ok(blocked.reasons.some((r) => /licensed review/.test(r)), 'the blocked outcome does not name the licensed gate');
});

/* ------------------------------------------------------------------ */
/* The resolved P3 pair                                                */
/* ------------------------------------------------------------------ */

test('the stakes floor is a pinned registry, ratchets upward, and cannot be lowered', () => {
	/* Moving the floor is a deliberate reviewed edit here, not a drive-by. */
	assert.deepEqual(
		[...HIGH_STAKES_ANSWER_TOPICS].sort(),
		['claims-outcome', 'coverage-determination', 'eligibility', 'legal-interpretation', 'tax-consequence'],
	);
	assert.equal(topicForcesHighStakes(['general-explanation']), false);
	assert.equal(topicForcesHighStakes(['general-explanation', 'eligibility']), true);

	/* The floor reaches eligibility through treatAsHighStakes, and there is
	   no counterpart to lower: a claim DECLARED high stays high even in a
	   standard-topic assembly. */
	const f = fixture('blocked-licensed-floor.json');
	const declaredHighLog = f.claimEventLogs[0].map((e) => (e.kind === 'opened' ? { ...e, stakes: 'high' } : e));
	const declaredHigh = reduceClaimStudy(declaredHighLog);
	const known = new Set(['fixture-src-widget-statute']);
	assert.equal(publicationEligibility(declaredHigh, { knownSourceIds: known }).eligible, false, 'a declared-high claim was eligible without licensed review');
	assert.equal(
		publicationEligibility(declaredHigh, { knownSourceIds: known, treatAsHighStakes: false }).eligible,
		false,
		'treatAsHighStakes: false lowered declared stakes - the ratchet broke',
	);
});

test('a licensed review pins its wording: narrowing afterwards blocks until re-review', () => {
	const at = (m) => `2026-09-27T12:${String(m).padStart(2, '0')}:00.000Z`;
	const known = new Set(['fixture-src-x']);
	const base = reduceClaimStudy([
		{ id: 'p1', kind: 'opened', at: at(0), actor: 'editor', note: 'Opened as high stakes for the wording-pin control.', claimRef: 'fixture-src-x#c1', text: 'The original high-stakes wording.', stakes: 'high', synthetic: true },
		{ id: 'p2', kind: 'support-added', at: at(1), actor: 'editor', note: 'One supporting source attached.', sourceId: 'fixture-src-x', synthetic: true },
		{ id: 'p3', kind: 'confirmed', at: at(2), actor: 'editor', note: 'Editorially confirmed.', synthetic: true },
	]);

	/* In-test licensed review; fixtures never carry one. */
	const reviewed = applyClaimEvent(base, { id: 'p4', kind: 'licensed-review-recorded', at: at(3), actor: 'licensed-reviewer', note: 'Synthetic licensed-reviewer event, in-test only, pinning the current wording.', synthetic: true });
	assert.equal(reviewed.licensedReviewedText, 'The original high-stakes wording.', 'the review did not pin the wording it covered');
	assert.equal(publicationEligibility(reviewed, { knownSourceIds: known }).eligible, true);

	/* Reworded after the review: blocked by name until re-reviewed. */
	let reworded = applyClaimEvent(reviewed, { id: 'p5', kind: 'narrowed', at: at(4), actor: 'editor', note: 'Narrowed to the renewal case after the review.', text: 'The narrowed high-stakes wording.', synthetic: true });
	reworded = applyClaimEvent(reworded, { id: 'p6', kind: 'confirmed', at: at(5), actor: 'editor', note: 'Re-confirmed after narrowing.', synthetic: true });
	const verdict = publicationEligibility(reworded, { knownSourceIds: known });
	assert.equal(verdict.eligible, false, 'a claim reworded after its licensed review stayed eligible');
	assert.ok(verdict.blockers.some((b) => /covered different wording/.test(b)), 'the wording-pin blocker is not named');
	assert.equal(reworded.wordingHistory.length, 1, 'the narrowing left no visible wording history');
	assert.equal(reworded.wordingHistory[0].was, 'The original high-stakes wording.');

	/* A fresh licensed review of the NEW wording clears it - in-test only. */
	const rereviewed = applyClaimEvent(reworded, { id: 'p7', kind: 'licensed-review-recorded', at: at(6), actor: 'licensed-reviewer', note: 'Synthetic licensed-reviewer event, in-test only, re-pinning the narrowed wording.', synthetic: true });
	assert.equal(publicationEligibility(rereviewed, { knownSourceIds: known }).eligible, true);
});

/* ------------------------------------------------------------------ */
/* Structural guarantees                                               */
/* ------------------------------------------------------------------ */

test('knownSourceIds is always passed, structurally and by source scan', () => {
	const source = read(path.join(ROOT, 'src/lib/answer-workflow.ts'));
	const calls = [...source.matchAll(/publicationEligibility\s*\(([^)]*)\)/g)];
	assert.ok(calls.length >= 2, 'the workflow no longer routes through publicationEligibility');
	for (const call of calls) {
		assert.match(call[1], /knownSourceIds/, `an eligibility call omits knownSourceIds: ${call[0]}`);
	}
	/* And the set is the assembly's own studies, so it cannot be forgotten by
	   a caller: composing with a ghost-supported claim is blocked. */
	const f = fixture('composed.json');
	const assembly = assemble(f);
	const ghost = { ...assembly, claims: [assembly.claims[0]], sources: [] };
	const gates = answerGates(ghost, registry);
	assert.equal(gates.find((g) => g.gate === 'claim-source').ok, false, 'an assembly with no studies passed the claim-source gate');
});

test('the workflow writes nothing, fetches nothing, and decides no gate flag of its own', () => {
	const source = read(path.join(ROOT, 'src/lib/answer-workflow.ts'));
	assert.ok(!/from\s+'node:fs'|require\(\s*'node:fs'/.test(source), 'the workflow imports the filesystem');
	assert.ok(!/\bfetch\s*\(/.test(source), 'the workflow makes a network call');
	assert.ok(!/PUBLIC_COMMONS_READY|process\.env/.test(source), 'the workflow reads environment gates it has no business deciding');
	assert.notEqual(process.env.PUBLIC_COMMONS_READY, 'true', 'Commons must remain closed for this unit');

	/* No fixture carries a licensed event or actor - rendered or not, the
	   answer fixtures model the world where zero licensed reviews exist. */
	for (const name of fixtureNames) {
		const text = read(path.join(FIXTURES, name));
		assert.ok(!text.includes('licensed-review-recorded'), `${name} records a licensed review no licensed human made`);
		assert.ok(!text.includes('licensed-reviewer'), `${name} carries a licensed-reviewer actor`);
	}
});
