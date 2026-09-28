/**
 * BR-F7: unanswered Ask stays local and explains the research handoff.
 *
 *   node --experimental-strip-types --test scripts/verify-ask-handoff.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeAnswer } from '../src/lib/answer-workflow.ts';
import { buildQuestionRegistry } from '../src/lib/question-registry.ts';
import { buildSourceStudies, reduceClaimStudy } from '../src/lib/source-study.ts';
import { ASK_RESEARCH_ROUTE, planUnansweredAskHandoff } from '../src/lib/ask-research-handoff.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const registry = buildQuestionRegistry(
	JSON.parse(read('scripts/fixtures/question-registry/synthetic-registry.json')).questions,
);
const failures = JSON.parse(read('scripts/fixtures/source-candidate-adapter/failures.json'));

function assemble(name) {
	const fixture = JSON.parse(read(`scripts/fixtures/answer-workflow/${name}`));
	const { studies, problems } = buildSourceStudies(fixture.sources);
	assert.deepEqual(problems, []);
	const claims = fixture.claimEventLogs.map((log) => reduceClaimStudy(log));
	return { ...fixture.assembly, claims, sources: studies };
}

const research = composeAnswer(assemble('research-required.json'), registry);

test('an unanswered question explains the route and does not call a provider', () => {
	for (const status of ['disabled', 'missing-credential', 'provider-failure', 'zero-provider-fallback']) {
		const plan = status === 'disabled'
			? planUnansweredAskHandoff({})
			: status === 'missing-credential'
				? planUnansweredAskHandoff({ enabled: true, credential: '   ' })
				: status === 'provider-failure'
					? planUnansweredAskHandoff({
						enabled: true,
						credential: 'present-but-unused',
						fixture: failures.outage,
						registry,
						birchOutcome: research,
						questionId: research.questionId,
						query: 'fixture gadget notice',
					})
					: planUnansweredAskHandoff({ enabled: true, credential: 'present-but-unused' });
		assert.equal(plan.status, status);
		assert.equal(plan.providerCalls, 0);
		assert.equal(plan.liveEndpointExposed, false);
		assert.equal(plan.indexable, false);
		assert.equal(plan.publicationEligible, false);
		assert.equal(plan.adapter.draft, null);
		assert.equal(plan.adapter.candidates.length, 0);
		assert.equal(JSON.stringify(plan).includes('present-but-unused'), false);
		assert.equal(JSON.stringify(plan).includes('api.perplexity.ai'), false);
		assert.equal(plan.route.length, ASK_RESEARCH_ROUTE.length);
	}
	const source = read('src/lib/ask-research-handoff.ts');
	assert.equal(/\bfetch\s*\(/.test(source), false);
	assert.equal(source.includes('runPerplexityScout'), false);
	assert.equal(/process\.env/.test(source), false);
});

test('Ask keeps the corpus first and the motion reduced-motion safe', () => {
	const page = read('src/pages/ask.astro');
	assert.match(page, /ASK_RESEARCH_ROUTE/);
	assert.match(page, /Search published records only/);
	assert.match(page, /class="btn btn-primary ask-motion"/);
	assert.match(page, /Checking the reviewed library/);
	assert.equal(page.includes('api.perplexity.ai'), false);
	assert.match(read('src/components/SiteHeader.astro'), /header-ask-cta ask-motion/);
	const css = read('src/styles/global.css');
	const motion = css.slice(css.indexOf('@media (prefers-reduced-motion: no-preference) {\n\t.ask-motion'));
	assert.match(motion, /ask-resolve-fade/);
	assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
	assert.match(read('src/config/site.ts'), /PUBLIC_COMMONS_READY === 'true'/);
	assert.match(read('src/config/public-indexing.mjs'), /PUBLIC_INDEXING_OPEN === 'true'/);
});
