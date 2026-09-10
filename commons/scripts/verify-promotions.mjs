import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { draftReport, validateSubmission } from '../src/lib/submissions.ts';
import { promotionRequestFromPost } from '../src/lib/promotions.ts';
import { memoryStore } from '../src/lib/store-memory.ts';
import { SUBJECTS } from '../src/lib/threads.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const accountEmail = 'author@example.com';
const sourceDate = '2026-09-09T10:00:00.000Z';

const complete = () =>
	validateSubmission({
		title: 'A water loss where timing changed the review',
		whatHappened:
			'Water was found near the kitchen in March 2025. A contractor traced it to a supply line and the adjuster visited the following week. The file then moved to a supplemental review after a later inspection.',
		insuranceQuestion: 'Whether the timing and source of the leak changed which policy language was examined.',
		informationThatMattered:
			'The date the water was first noticed\nThe source identified by the contractor\nThe order of the inspections',
		decidedBy: 'The carrier claims department reviewed the account and communicated its position; no court or regulator decided it.',
		cannotGeneralize:
			'The policy wording may be different\nA different state may apply different rules\nThe timing and facts belong to this account',
		lines: 'homeowners',
		states: 'CA',
		occurredOn: 'March 2025',
	}).draft;

function sourceThreadDraft() {
	return {
		subjectId: SUBJECTS.find((item) => item.kind === 'company').id,
		title: 'How timing changed a water-loss review for one account',
		startedBy: accountEmail,
		body:
			'Water was found near the kitchen and the review changed after a contractor traced the source. I want to compare the sequence with other accounts without saying what the outcome should have been.',
	};
}

test('a moderator invitation becomes a separate author-confirmed submission', async () => {
	const store = memoryStore();
	await store.upsertAccount(accountEmail);
	await store.setDisplayName(accountEmail, 'A reader');
	const thread = await store.createThread(sourceThreadDraft(), { threadId: 'thread-1', postId: 'post-1' }, sourceDate);
	const post = await store.getPost('post-1');
	const request = promotionRequestFromPost(post, thread, 'promotion-1', sourceDate);

	await store.createPromotionRequest(request);
	assert.equal((await store.getPromotionRequest('promotion-1')).state, 'pending');
	assert.equal((await store.promotionRequestsBy(accountEmail)).length, 1);

	const submission = await store.submitPromotion(
		request.id,
		accountEmail,
		complete(),
		'submission-1',
		'2026-09-09T11:00:00.000Z',
	);
	assert.equal(submission.state, 'pending');
	assert.deepEqual(submission.promotedFrom, {
		requestId: 'promotion-1',
		threadId: 'thread-1',
		postId: 'post-1',
		subjectId: request.subjectId,
	});
	assert.equal((await store.getPost('post-1')).promotedToSubmission, 'submission-1');
	assert.equal((await store.getPromotionRequest('promotion-1')).state, 'submitted');
	assert.equal((await store.getPromotionRequest('promotion-1')).submissionId, 'submission-1');

	const record = draftReport(submission, await store.getAccount(accountEmail), {
		label: 'contributed-account',
		labelNote: 'It is a moderated account of one person’s experience, not a public record or determination.',
		provenance: 'The moderator read the author account and checked its structure for context before publication.',
		name: 'Moderator',
		publishedOn: '2026-09-10',
	});
	assert.deepEqual(record.promotedFrom, { threadId: 'thread-1', postId: 'post-1' });
	assert.deepEqual(record.citesRecord, []);
});

test('an invitation is private to the author and can be declined without a reason', async () => {
	const store = memoryStore();
	await store.upsertAccount(accountEmail);
	await store.upsertAccount('other@example.com');
	const thread = await store.createThread(sourceThreadDraft(), { threadId: 'thread-2', postId: 'post-2' }, sourceDate);
	const post = await store.getPost('post-2');
	await store.createPromotionRequest(promotionRequestFromPost(post, thread, 'promotion-2', sourceDate));

	await store.declinePromotionRequest('promotion-2', 'other@example.com', '2026-09-09T11:00:00.000Z');
	assert.equal((await store.getPromotionRequest('promotion-2')).state, 'pending');
	await store.declinePromotionRequest('promotion-2', accountEmail, '2026-09-09T11:00:00.000Z');
	assert.equal((await store.getPromotionRequest('promotion-2')).state, 'declined');
	assert.equal((await store.pendingPromotionRequests()).length, 0);

	await assert.rejects(
		() => store.submitPromotion('promotion-2', accountEmail, complete(), 'submission-2', '2026-09-09T12:00:00.000Z'),
		/no longer available/,
	);
});

test('one post cannot receive two active invitations', async () => {
	const store = memoryStore();
	await store.upsertAccount(accountEmail);
	const thread = await store.createThread(sourceThreadDraft(), { threadId: 'thread-3', postId: 'post-3' }, sourceDate);
	const post = await store.getPost('post-3');
	await store.createPromotionRequest(promotionRequestFromPost(post, thread, 'promotion-3', sourceDate));
	await assert.rejects(
		() => store.createPromotionRequest(promotionRequestFromPost(post, thread, 'promotion-4', '2026-09-09T11:00:00.000Z')),
		/active promotion request/,
	);
});

test('the UI and schema expose provenance without turning conversation into citation', () => {
	const moderatePosts = read('src/pages/moderate/posts.astro');
	const account = read('src/pages/account.astro');
	const sourcePage = read('src/pages/contribute/from-post/[id].astro');
	const report = read('src/pages/reports/[slug].astro');
	const schema = read('schema.sql');

	assert.match(moderatePosts, /name="intent" value="promote"/);
	assert.match(moderatePosts, /no email was sent/i);
	assert.match(account, /contribute\/from-post/);
	assert.match(sourcePage, /name="confirm"/);
	assert.match(sourcePage, /research citation/i);
	assert.match(sourcePage, /starting context only/i);
	assert.match(report, /Conversation origin/);
	assert.match(report, /context, not a citation/);
	assert.match(schema, /promotion_requests_one_active_post/);
	assert.match(schema, /promotion_request_id/);
});
