/**
 * BR-C4: a disabled-by-default fixture adapter. It returns source candidates
 * and an unvalidated noindex draft. It does not call a provider.
 *
 *   node --experimental-strip-types --test scripts/verify-source-candidate-adapter.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { composeAnswer } from '../src/lib/answer-workflow.ts';
import { buildSourceStudies, reduceClaimStudy } from '../src/lib/source-study.ts';
import { buildQuestionRegistry } from '../src/lib/question-registry.ts';
import {
	PUBLIC_SOURCE_DRAFT_LABEL,
	RESEARCH_DRAFT_GATES,
	SOURCE_CANDIDATE_ADAPTER_ENABLED,
	applyDraftAction,
	considerSourceCandidates,
	researchDraftPublication,
	rollbackResearchDraft,
} from '../src/lib/source-candidate-adapter.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(file, 'utf8');
const registry = buildQuestionRegistry(
	JSON.parse(read(path.join(ROOT, 'scripts/fixtures/question-registry/synthetic-registry.json'))).questions,
);
const candidates = JSON.parse(read(path.join(ROOT, 'scripts/fixtures/source-candidate-adapter/candidates.json')));
const failures = JSON.parse(read(path.join(ROOT, 'scripts/fixtures/source-candidate-adapter/failures.json')));
const limits = { maxCostUnits: 10, spentCostUnits: 0, maxRequestsPerWindow: 5, requestsInWindow: 0 };

function assemble(name) {
	const fixture = JSON.parse(read(path.join(ROOT, 'scripts/fixtures/answer-workflow', name)));
	const { studies, problems } = buildSourceStudies(fixture.sources);
	assert.deepEqual(problems, []);
	const claims = fixture.claimEventLogs.map((log) => {
		const snapshot = reduceClaimStudy(log);
		assert.deepEqual(snapshot.problems, []);
		return snapshot;
	});
	return { ...fixture.assembly, claims, sources: studies };
}

const research = composeAnswer(assemble('research-required.json'), registry);
const answered = composeAnswer(assemble('composed.json'), registry);
const review = composeAnswer(assemble('blocked-licensed-floor.json'), registry);
const question = registry.byId.get('fixture-gadget-notice');

function run(extra = {}) {
	return considerSourceCandidates({
		enabled: true,
		query: question.text,
		questionId: 'fixture-gadget-notice',
		registry,
		birchOutcome: research,
		fixture: candidates,
		limits,
		asOf: '2026-09-27',
		...extra,
	});
}

test('the adapter is off unless a caller opts in, and it has no network path', () => {
	assert.equal(SOURCE_CANDIDATE_ADAPTER_ENABLED, false);
	assert.deepEqual([...RESEARCH_DRAFT_GATES], ['citation', 'rights', 'freshness', 'editorial', 'licensed-review', 'conflict']);
	assert.equal(research.status, 'research-required');
	assert.equal(research.questionId, 'fixture-gadget-notice');
	const dormant = run({ enabled: undefined, credential: 'super-secret-key' });
	assert.equal(dormant.status, 'disabled');
	assert.equal(dormant.draft, null);
	assert.equal(dormant.candidates.length, 0);
	assert.ok(!JSON.stringify(dormant).includes('super-secret-key'));
	const source = read(path.join(ROOT, 'src/lib/source-candidate-adapter.ts'));
	assert.ok(!/\bfetch\s*\(/.test(source));
	assert.ok(!source.includes('runPerplexityScout'));
	assert.ok(!/process\.env/.test(source));
	assert.equal(fs.existsSync(path.join(ROOT, 'src/pages/answers')), false);
});

test('privacy, security, cost, rate, outage, and malformed fixtures invent nothing', () => {
	const secret = run({ credential: 'super-secret-key' });
	assert.equal(secret.status, 'security');
	assert.ok(!JSON.stringify(secret).includes('super-secret-key'));

	const privateQuery = run({ query: 'Please check policy number ABC-123' });
	assert.equal(privateQuery.status, 'privacy');
	assert.equal(privateQuery.candidates.length, 0);

	const ceiling = run({ limits: { ...limits, spentCostUnits: 10 } });
	assert.equal(ceiling.status, 'over-budget');
	assert.ok(!JSON.stringify(ceiling).includes('$50'));

	const budgetShape = run({ fixture: failures.overBudget });
	assert.equal(budgetShape.status, 'over-budget');

	const rate = run({ limits: { ...limits, requestsInWindow: 5 } });
	assert.equal(rate.status, 'rate-limited');
	assert.equal(run({ fixture: failures.rateLimited }).status, 'rate-limited');
	assert.equal(run({ fixture: failures.outage }).status, 'outage');
	assert.equal(run({ fixture: failures.malformed }).status, 'malformed');
	for (const result of [secret, privateQuery, ceiling, rate]) assert.equal(result.draft, null);
});

test('an unanswered question becomes a noindex candidate draft, and an answered one does not', () => {
	assert.equal(run({ birchOutcome: answered, questionId: answered.questionId }).status, 'answered');
	assert.equal(run({ birchOutcome: review, questionId: review.questionId }).status, 'review-required');
	assert.equal(run({ questionId: 'missing-question' }).status, 'not-canonical');

	const result = run();
	assert.equal(result.status, 'draft');
	assert.equal(result.draft.questionId, research.questionId);
	const mismatch = run({ questionId: 'fixture-widget-rule-ca' });
	assert.equal(mismatch.status, 'question-mismatch');
	assert.equal(mismatch.draft, null);
	assert.equal(mismatch.candidates.length, 0);
	assert.ok(!JSON.stringify(mismatch).includes('$50'));
	assert.ok(!JSON.stringify(mismatch).includes('fixture.invalid'));
	assert.equal(result.candidates.length, 2, 'duplicate and off-allowlist URLs were not both dropped');
	assert.deepEqual(result.candidates.map((candidate) => candidate.url).sort(), [
		'https://fixture.invalid/bulletin',
		'https://fixture.invalid/notice',
	]);
	assert.ok(result.candidates.every((candidate) => candidate.sourceOfTruth === false && candidate.autoPublish === false));
	assert.equal(result.draft.questionText, question.text);
	assert.equal(result.draft.label, PUBLIC_SOURCE_DRAFT_LABEL);
	assert.equal(result.draft.noindex, true);
	assert.equal(result.draft.sitemapIncluded, false);
	assert.equal(result.draft.robotsMeta, 'noindex, nofollow');
	assert.equal(result.draft.indexable, false);
	assert.equal(result.draft.jurisdiction, 'national');
	assert.equal(result.draft.propositions[0].effectiveDate, '2026-01-01');
	assert.equal(result.draft.propositions.find((proposition) => proposition.url.endsWith('/bulletin')).effectiveDate, null);
	assert.equal(result.draft.conflicts.length, 1);
	assert.ok(!JSON.stringify(result).includes('$50'));
	assert.ok(!JSON.stringify(result).includes('premium'));
});

test('contributors record claim-level review without erasing dissent or making the draft publishable', () => {
	const opened = run().draft;
	const actor = { name: 'Fixture Contributor', credentials: 'No licence is claimed.', disclosures: 'Fixture identity only.', role: 'contributor' };
	const propositionId = opened.propositions[0].id;
	let draft = applyDraftAction(opened, {
		id: 'dispute-1', at: '2026-09-27T01:00:00.000Z', action: 'dispute', actor, propositionId, note: 'The deadline in the notice is narrower than the bulletin.',
	});
	draft = applyDraftAction(draft, {
		id: 'confirm-1', at: '2026-09-27T02:00:00.000Z', action: 'confirm', actor, propositionId, note: 'Confirmed against the notice, with the dispute still attached.',
	});
	draft = applyDraftAction(draft, {
		id: 'note-1', at: '2026-09-27T03:00:00.000Z', action: 'annotate', actor, propositionId, note: 'Annotation kept beside the proposition.',
	});
	draft = applyDraftAction(draft, {
		id: 'add-1', at: '2026-09-27T04:00:00.000Z', action: 'add-source', actor,
		note: 'Added a third public fixture URL.',
		source: { url: 'https://fixture.invalid/faq', title: 'Fixture FAQ', publisher: 'fixture.invalid', proposition: 'The fixture FAQ restates the notice deadline.', effectiveDate: '2026-03-01' },
	});
	const disputed = draft.propositions.find((proposition) => proposition.id === propositionId);
	assert.equal(disputed.status, 'disputed');
	assert.equal(disputed.dissent.length, 1);
	assert.equal(disputed.annotations.length, 1);
	assert.equal(disputed.annotations[0].disclosures, actor.disclosures);
	assert.equal(draft.candidates.length, 3);

	const second = draft.propositions[1].id;
	draft = applyDraftAction(draft, { id: 'reject-1', at: '2026-09-27T05:00:00.000Z', action: 'reject', actor, propositionId: second, note: 'Rejected. The proposition stays in the history.' });
	assert.equal(draft.propositions.find((proposition) => proposition.id === second).status, 'rejected');
	assert.ok(draft.propositions.some((proposition) => proposition.id === second));

	const editor = { name: 'Fixture Editor', credentials: 'Editor, not a licensed reviewer.', disclosures: 'Fixture editor.', role: 'editor' };
	draft = applyDraftAction(draft, { id: 'edit-1', at: '2026-09-27T06:00:00.000Z', action: 'editorial-note', actor: editor, note: 'Editorial note recorded. This is still not validation.' });
	draft = applyDraftAction(draft, { id: 'resolve-1', at: '2026-09-27T07:00:00.000Z', action: 'resolve-conflict', actor: editor, note: 'Both deadlines stay visible. The notice is the narrower one.' });
	const reviewer = { name: 'Fixture Reviewer', credentials: 'Synthetic licensed-reviewer, in-test only.', disclosures: 'Not a real licence.', role: 'licensed-reviewer' };
	draft = applyDraftAction(draft, { id: 'lic-1', at: '2026-09-27T08:00:00.000Z', action: 'licensed-review', actor: reviewer, note: 'Synthetic licensed review of the draft label, in-test only.' });

	const verdict = researchDraftPublication(draft, '2026-09-27', { staleAfterDays: 30 });
	assert.equal(verdict.eligible, false);
	assert.equal(verdict.label, PUBLIC_SOURCE_DRAFT_LABEL);
	assert.equal(draft.noindex, true);
	assert.equal(draft.sitemapIncluded, false);
	const failed = verdict.gates.filter((gate) => !gate.ok).map((gate) => gate.gate);
	assert.deepEqual(failed, ['rights']);
	assert.match(verdict.gates.find((gate) => gate.gate === 'rights').reasons.join(' '), /unrecorded/);

	const missing = applyDraftAction(opened, { id: 'bare', at: '2026-09-27T01:00:00.000Z', action: 'confirm', actor: { ...actor, disclosures: ' ' }, propositionId, note: 'Missing disclosures.' });
	assert.match(missing.problem, /disclosures/);
});

test('rollback restores an earlier draft and keeps the later review in the log', () => {
	const opened = run().draft;
	const actor = { name: 'Fixture Contributor', credentials: 'No licence is claimed.', disclosures: 'Fixture identity only.', role: 'contributor' };
	const confirmed = applyDraftAction(opened, {
		id: 'confirm-only', at: '2026-09-27T01:00:00.000Z', action: 'confirm', actor, propositionId: opened.propositions[0].id, note: 'Confirmed the notice proposition.',
	});
	assert.equal(confirmed.propositions[0].status, 'confirmed');
	const editor = { name: 'Fixture Editor', credentials: 'Editor.', disclosures: 'Fixture editor.', role: 'editor' };
	const rolled = rollbackResearchDraft(confirmed, {
		id: 'rollback-1', at: '2026-09-27T02:00:00.000Z', action: 'rolled-back', actor: editor, note: 'Restored the opening version.', restoreVersion: 1,
	});
	assert.equal(rolled.propositions[0].status, 'unvalidated');
	assert.ok(rolled.events.some((event) => event.action === 'confirm'));
	assert.ok(rolled.events.some((event) => event.action === 'rolled-back'));
	assert.equal(rolled.versions.length, 3);
	assert.equal(researchDraftPublication(rolled, '2026-09-27', { staleAfterDays: 30 }).eligible, false);
	assert.equal(rolled.label, PUBLIC_SOURCE_DRAFT_LABEL);
});
