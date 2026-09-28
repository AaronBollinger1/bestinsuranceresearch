import test from 'node:test';
import assert from 'node:assert/strict';

const {
	buildResearchScoutPrompt,
	createResearchTask,
	canTransitionResearchTask,
	transitionResearchTask,
	taskPublicationBlockers,
} = await import('../src/lib/research-automation.ts');

const input = {
	question: 'What primary sources should I read about California wildfire insurance notices?',
	topic: 'California wildfire insurance notices',
	jurisdiction: 'California',
	asOf: '2026-09-11',
	requestedSourceClasses: ['regulator-guidance', 'regulation'],
	candidateId: 'candidate-jurisdiction-sources-wildfire-ca',
};

test('research tasks are deterministic and privacy-screened', () => {
	const first = createResearchTask(input, '2026-09-11T12:00:00.000Z');
	const second = createResearchTask(input, '2026-09-12T12:00:00.000Z');
	assert.equal(first.id, second.id);
	assert.equal(first.brief.question, input.question);
	assert.equal(first.publicRoute, null);
	assert.equal(first.state, 'queued');
	assert.throws(() => createResearchTask({ ...input, question: 'Review policy number ABC-123 and my diagnosis.' }), /private, local review path/);
});

test('scout prompt requests source candidates and forbids publication claims', () => {
	const task = createResearchTask(input, '2026-09-11T12:00:00.000Z');
	const prompt = buildResearchScoutPrompt(task);
	assert.match(prompt, /Return only a JSON array/);
	assert.match(prompt, /Do not answer the question/);
	assert.match(prompt, /Every candidate remains unverified/);
	assert.doesNotMatch(prompt, /Bearer|PERPLEXITY_API_KEY/);
});

test('research tasks use a fixed transition graph', () => {
	assert.equal(canTransitionResearchTask('queued', 'scouting'), true);
	assert.equal(canTransitionResearchTask('queued', 'published'), false);
	let task = createResearchTask(input, '2026-09-11T12:00:00.000Z');
	task = transitionResearchTask(task, 'scouting', 'system', 'Bounded source discovery started.', '2026-09-11T12:01:00.000Z');
	assert.equal(task.state, 'scouting');
	assert.throws(() => transitionResearchTask(task, 'published', 'system', 'Skip ahead.'), /cannot transition/);
});

test('publication blockers require sources, claims, and a licensed review event', () => {
	let task = createResearchTask(input, '2026-09-11T12:00:00.000Z');
	assert.ok(taskPublicationBlockers(task).length >= 4);
	for (const next of ['scouting', 'source-review', 'draft-review', 'licensed-review', 'approved']) {
		task = transitionResearchTask(task, next, next === 'licensed-review' ? 'licensed-reviewer' : 'system', `Advance to ${next}.`, '2026-09-11T12:0' + (task.events.length + 1) + ':00.000Z');
	}
	task = { ...task, candidateSourceIds: ['candidate-source-1'], claimIds: ['claim-1'] };
	assert.deepEqual(taskPublicationBlockers(task), []);
});
