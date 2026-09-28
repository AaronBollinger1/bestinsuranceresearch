/**
 * Threads: the conversation layer.
 *
 * The rules that matter here are the ones that differ from the case-report
 * layer, because that is where a careless "harmonisation" would break
 * something. A submission is read before it publishes, so a verdict phrase can
 * be a flag. A post publishes on write, so the same phrase has to be a block or
 * `COMMONS.md` section 3 holds on one half of this property and not the other.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	LIMITS,
	STANDING_LINE,
	SUBJECTS,
	byline,
	subject,
	validateNewThread,
	validateReply,
} from '../src/lib/threads.ts';
import { verdictFlags } from '../src/lib/submissions.ts';
import { memoryStore } from '../src/lib/store-memory.ts';
import { buildSubjects, serialise } from './sync-subjects.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const read = (f) => fs.readFileSync(f, 'utf8');

/** A thread that should post, so each test can break exactly one thing. */
const good = () => ({
	subjectId: SUBJECTS.find((s) => s.kind === 'company').id,
	title: 'How long did the CEA supplemental review take for anybody here',
	body:
		'We filed after the July shake and the structural engineer came out in the third week. '
		+ 'I want to know what other people saw on timing, and whether the supplemental was handled by the '
		+ 'same adjuster or by somebody new. Nothing has been decided on ours yet.',
});

/* ------------------------------------------------------------------ */
/* The subject registry                                                */
/* ------------------------------------------------------------------ */

test('the subject registry is not stale', () => {
	/*
	 * subjects.json is generated from the evidence layer's collections and
	 * checked in, which is the right trade - a diff when a carrier is renamed
	 * beats a silent re-point at request time - and it is also the classic way a
	 * generated file rots. Nothing else in this suite would notice.
	 */
	const onDisk = read(path.join(ROOT, 'src/lib/subjects.generated.ts'));
	const fresh = serialise(buildSubjects());
	assert.equal(
		onDisk,
		fresh,
		'src/lib/subjects.generated.ts does not match the evidence layer. Run: node scripts/sync-subjects.mjs',
	);
});

test('every subject resolves to a page the evidence layer actually publishes', () => {
	assert.ok(SUBJECTS.length > 50, `only ${SUBJECTS.length} subjects, so this check covers too little`);
	const recordContent = path.join(ROOT, '..', 'src', 'content');
	const DIR = { company: 'companies', coverage: 'coverages', question: 'questions' };

	const missing = [];
	for (const s of SUBJECTS) {
		const id = s.id.slice(s.id.indexOf(':') + 1);
		if (!fs.existsSync(path.join(recordContent, DIR[s.kind], `${id}.json`))) missing.push(s.id);
		if (!s.recordPath.startsWith('/')) missing.push(`${s.id} has a relative recordPath`);
		if (!s.name.trim()) missing.push(`${s.id} has no name`);
	}
	assert.deepEqual(missing, [], `subjects with no record behind them: ${missing.join(', ')}`);

	const ids = SUBJECTS.map((s) => s.id);
	assert.equal(new Set(ids).size, ids.length, 'two subjects share an id, so threads would merge');
});

/* ------------------------------------------------------------------ */
/* The rule that differs from the case-report layer                    */
/* ------------------------------------------------------------------ */

test('a verdict phrase blocks a post, where it only flags a submission', () => {
	/*
	 * This is the load-bearing difference between the two layers and the thing
	 * most likely to be "tidied" into consistency by somebody who has not read
	 * why. A submission is read by a moderator before anybody else sees it, so a
	 * flag is enough and a block would cost real accounts to false positives. A
	 * post is published the instant it is written, so a flag would mean the one
	 * rule that survives the crossing from the Record is enforced on one half of
	 * this property and not the other.
	 */
	const verdict = 'The adjuster denied it and it should have been paid, plainly, on any reading of the form here.';

	assert.ok(verdictFlags(verdict).length > 0, 'the shared verdict check no longer recognises the phrase');

	const thread = validateNewThread({ ...good(), body: verdict });
	assert.equal(thread.draft, null, 'a thread carrying a verdict was allowed to post');
	assert.ok(
		thread.errors.some((e) => e.message.includes('should have been paid')),
		'the writer is not shown the phrase that stopped it',
	);
	assert.ok(
		thread.errors.some((e) => e.message.includes('published as you write it')),
		'the writer is not told why a post is treated differently from a case report',
	);

	const reply = validateReply({ body: verdict });
	assert.equal(reply.body, null, 'a reply carrying a verdict was allowed to post');
});

test('a verdict in the title is reported against the title', () => {
	/* An error attached to the wrong field is an error somebody cannot find. */
	const { errors } = validateNewThread({ ...good(), title: 'The carrier was wrong about the roof here' });
	assert.ok(
		errors.some((e) => e.field === 'title'),
		'a verdict in the title was reported against the body',
	);
});

test('an ordinary account posts', () => {
	const { errors, draft } = validateNewThread(good());
	assert.deepEqual(errors, [], `a clean thread was refused: ${errors.map((e) => e.message).join(' | ')}`);
	assert.ok(draft, 'a clean thread produced no draft');
});

test('a thread cannot attach to a subject that has no page', () => {
	const { errors } = validateNewThread({ ...good(), subjectId: 'company:not-a-real-carrier' });
	assert.ok(
		errors.some((e) => e.field === 'subjectId' && e.message.includes('unreachable')),
		'a thread on an unknown subject was accepted, so it would be unreachable from the evidence layer',
	);
});

test('a post too long for a thread is pointed at the case-report route', () => {
	const { errors } = validateNewThread({ ...good(), body: 'x'.repeat(LIMITS.body.max + 1) });
	assert.ok(
		errors.some((e) => e.message.includes('Contribute')),
		'an over-long post is refused without naming the route that would take it',
	);
});

/* ------------------------------------------------------------------ */
/* What the store may and may not do                                   */
/* ------------------------------------------------------------------ */

test('nothing in the permitted surface can change what a post said', () => {
	/*
	 * A thread has no version history, unlike a published report, which is a
	 * file with a diff. The honest answer to that is that a post is immutable:
	 * it can be withdrawn by its author and hidden by a moderator, and both
	 * leave the row. An edit path would mean a reader could not trust that what
	 * they are reading is what was written, with nothing to check it against.
	 *
	 * So this reads the interface rather than the behaviour. Adding
	 * `editPost` would pass every other test in this file.
	 */
	const surface = read(path.join(ROOT, 'src/lib/store.ts'));
	const threadBlock = surface.slice(surface.indexOf('/* --- Threads --- */'));
	for (const forbidden of ['editPost', 'updatePost', 'setPostBody', 'rewritePost']) {
		assert.ok(
			!threadBlock.includes(forbidden),
			`the store exposes ${forbidden}, so a post is no longer immutable and a reader has nothing to check against`,
		);
	}
});

test('a post is withdrawn in one step and leaves a tombstone', async () => {
	const store = memoryStore();
	await store.upsertAccount('a@example.com');
	const thread = await store.createThread(
		{ ...good(), startedBy: 'a@example.com' },
		{ threadId: 't1', postId: 'p1' },
		'2026-09-09T10:00:00.000Z',
	);
	assert.equal(thread.postCount, 1, 'the opening post was not counted');

	await store.withdrawPost('p1', '2026-09-09T11:00:00.000Z');
	const [post] = await store.postsIn('t1');
	assert.equal(post.state, 'withdrawn');
	assert.equal(post.withdrawnAt, '2026-09-09T11:00:00.000Z');
	assert.ok(post.hiddenBy === undefined, 'a withdrawal recorded a moderator, which it is not');

	/* The row survives, because a conversation with replies to a deleted post is
	   unreadable and a silent removal is worse than a visible one. */
	assert.equal((await store.postsIn('t1')).length, 1, 'withdrawal deleted the row');
});

test('a moderator hiding a post is recorded differently from the author withdrawing it', async () => {
	const store = memoryStore();
	await store.upsertAccount('a@example.com');
	await store.createThread(
		{ ...good(), startedBy: 'a@example.com' },
		{ threadId: 't1', postId: 'p1' },
		'2026-09-09T10:00:00.000Z',
	);
	await store.hidePost('p1', 'mod@example.com', 'Named a private individual', '2026-09-09T12:00:00.000Z');

	const [post] = await store.postsIn('t1');
	assert.equal(post.state, 'hidden');
	assert.equal(post.hiddenBy, 'mod@example.com');
	assert.ok(post.hiddenReason, 'a moderator removed a post without a reason a reader can see');
	assert.equal(post.withdrawnAt, undefined, 'a moderator removal was recorded as an author withdrawal');
	/* Hiding is also a reading, so it leaves the queue. */
	assert.ok(post.reviewedAt, 'a hidden post is still queued as unread');
});

test('the reply counter and the queue stay honest', async () => {
	const store = memoryStore();
	await store.upsertAccount('a@example.com');
	await store.createThread(
		{ ...good(), startedBy: 'a@example.com' },
		{ threadId: 't1', postId: 'p1' },
		'2026-09-09T10:00:00.000Z',
	);
	await store.addPost({
		id: 'p2',
		threadId: 't1',
		email: 'a@example.com',
		body: 'A reply that says something ordinary about timing.',
		postedAt: '2026-09-09T13:00:00.000Z',
		state: 'visible',
	});

	const thread = await store.getThread('t1');
	assert.equal(thread.postCount, 2, 'the counter did not move with the reply');
	assert.equal(thread.lastPostAt, '2026-09-09T13:00:00.000Z', 'last activity did not move');

	assert.equal((await store.unreviewedPosts()).length, 2, 'posts are not reaching the moderation queue');
	await store.markPostReviewed('p1');
	assert.equal((await store.unreviewedPosts()).length, 1, 'marking a post read did not drain the queue');
});

test('a hidden thread leaves the index', async () => {
	const store = memoryStore();
	await store.upsertAccount('a@example.com');
	await store.createThread(
		{ ...good(), startedBy: 'a@example.com' },
		{ threadId: 't1', postId: 'p1' },
		'2026-09-09T10:00:00.000Z',
	);
	assert.equal((await store.listThreads()).length, 1);
	await store.setThreadState('t1', 'hidden', 'Duplicated an existing thread');
	assert.equal((await store.listThreads()).length, 0, 'a hidden thread is still on the index');
	/* But it is still readable by anybody holding the link, with the reason. */
	const thread = await store.getThread('t1');
	assert.equal(thread.state, 'hidden');
	assert.ok(thread.hiddenReason);
});

/* ------------------------------------------------------------------ */
/* Attribution                                                         */
/* ------------------------------------------------------------------ */

test('an account is not a byline, and a licence badge names its register', () => {
	assert.equal(
		byline({ displayName: '', kind: 'reader' }).name,
		'A reader, unnamed',
		'somebody who never set a display name would be shown as something else - check it is not their email',
	);
	assert.ok(
		!byline({ displayName: '', kind: 'reader' }).name.includes('@'),
		'an email address is being used as a byline',
	);
	assert.equal(byline({ displayName: 'Dana', kind: 'reader' }).role, null, 'a reader was given a role');

	const pro = byline({
		displayName: 'Dana',
		kind: 'broker',
		license: { number: '0D94699', authority: 'California Department of Insurance' },
	});
	assert.ok(pro.role.includes('0D94699'), 'a verified badge does not carry the licence number');
	assert.ok(
		pro.role.includes('California Department of Insurance'),
		'a verified badge names a role without naming the register it was checked against, so a reader cannot check it',
	);
});

/* ------------------------------------------------------------------ */
/* The built pages                                                     */
/* ------------------------------------------------------------------ */

test('the discussion pages are in the build and say what they are', () => {
	/*
	 * The adapter splits the output, and the server half is where a rendered
	 * page lives. Vercel places that half in `.vercel/output/_functions`, while
	 * the local Node adapter places it in `dist/server`. Reading only the client
	 * half silently narrowed a scan once before.
	 */
	const server = [path.join(DIST, 'server'), path.join(ROOT, '.vercel', 'output', '_functions')].find((candidate) =>
		fs.existsSync(candidate),
	);
	assert.ok(server, 'no server build, so the rendered pages cannot be checked');

	const bundle = [];
	const walk = (dir) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (entry.name.endsWith('.mjs') || entry.name.endsWith('.js')) bundle.push(read(full));
		}
	};
	walk(server);
	const all = bundle.join('\n');

	assert.ok(all.includes(STANDING_LINE), 'no page carries the standing line every post is published under');
	assert.ok(
		all.includes('never cited by the research library'),
		'the discussion index does not tell a reader that nothing here is cited',
	);
});
