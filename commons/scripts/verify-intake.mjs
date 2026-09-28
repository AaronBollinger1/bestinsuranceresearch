/**
 * Intake and moderation.
 *
 * The rules here are the ones that decide whether the Commons is worth reading:
 * what a submission has to carry before a moderator ever sees it, what the
 * verdict check does and deliberately does not do, and who can reach the queue.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	MIN_CANNOT_GENERALIZE,
	MIN_INFORMATION,
	draftReport,
	lines,
	newSubmissionId,
	reportSlug,
	validateSubmission,
	verdictFlags,
} from '../src/lib/submissions.ts';
import { isModerator, moderators } from '../src/lib/moderators.ts';
import { memoryStore } from '../src/lib/store-memory.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** A submission that should pass, so each test can break one thing. */
const good = () => ({
	title: 'A water loss where everything turned on how long the leak had run',
	whatHappened:
		'A stain appeared on a downstairs ceiling in March 2025. A plumber opened the ceiling and found a failed joint on a supply line, and the invoice described corrosion around the fitting. The carrier inspected the following week and the file turned on whether the joint had failed at once or had been weeping for months.',
	insuranceQuestion: 'Whether a gradual-seepage exclusion applies when the damage was found within a week',
	informationThatMattered: [
		'The plumber invoice wording, which described corrosion rather than a single failure',
		'The date the stain was first noticed, mentioned in passing on the first call',
		'Whether the policy was a named-peril or an open-peril form',
	].join('\n'),
	decidedBy: 'The carrier adjuster assigned to the file decided it. No court or department was involved at any point.',
	cannotGeneralize: [
		'Homeowners forms differ on seepage and a form saying weeks is not one saying months',
		'The treatment of the pipe against the water damage varies by form and endorsement',
		'State law differs on the burden of proof between named-peril and open-peril forms',
	].join('\n'),
	lines: 'homeowners',
	states: 'CA',
	occurredOn: 'March 2025',
});

/* ------------------------------------------------------------------ */
/* What a submission must carry                                        */
/* ------------------------------------------------------------------ */

test('a complete submission validates and keeps every field', () => {
	const { errors, draft } = validateSubmission(good());
	assert.deepEqual(errors, [], `unexpected errors: ${JSON.stringify(errors)}`);
	assert.ok(draft);
	assert.equal(draft.informationThatMattered.length, 3);
	assert.equal(draft.cannotGeneralize.length, 3);
	assert.deepEqual(draft.states, ['CA']);
	assert.deepEqual(draft.lines, ['homeowners']);
});

test('a submission without enough reasons it does not generalise is refused', () => {
	/*
	 * The floor of three is the single most important rule on this form. The
	 * likeliest harm from the whole site is a reader treating somebody else's
	 * outcome as their own rule, and this is the field that argues against that
	 * on every published page.
	 */
	const input = { ...good(), cannotGeneralize: 'Forms differ between carriers on this point' };
	const { errors, draft } = validateSubmission(input);
	assert.equal(draft, null);
	assert.ok(
		errors.some((e) => e.field === 'cannotGeneralize' && e.message.includes(String(MIN_CANNOT_GENERALIZE))),
		'a submission with one limitation was accepted',
	);
});

test('a submission without enough of what mattered is refused', () => {
	const input = { ...good(), informationThatMattered: 'The invoice wording mattered here' };
	const { draft, errors } = validateSubmission(input);
	assert.equal(draft, null);
	assert.ok(errors.some((e) => e.field === 'informationThatMattered' && e.message.includes(String(MIN_INFORMATION))));
});

test('every error names the field and what would fix it', () => {
	/* "Invalid input" on a form somebody spent twenty minutes on is how a real
	   account gets abandoned, and an abandoned account is one this site does
	   not get. */
	const { errors } = validateSubmission({ ...good(), title: 'Too short', whatHappened: 'Brief' });
	assert.ok(errors.length >= 2);
	for (const error of errors) {
		assert.ok(error.field, 'an error names no field');
		assert.ok(/\d/.test(error.message), `"${error.message}" does not say what would fix it`);
	}
});

test('a bad state code is caught, and a blank one is allowed', () => {
	assert.ok(validateSubmission({ ...good(), states: 'California' }).errors.some((e) => e.field === 'states'));
	assert.deepEqual(validateSubmission({ ...good(), states: '' }).draft?.states, []);
	/* Lower case is normalised rather than rejected. */
	assert.deepEqual(validateSubmission({ ...good(), states: 'ca' }).draft?.states, ['CA']);
});

test('a submission is capped, so no field becomes a document', () => {
	const { errors, draft } = validateSubmission({ ...good(), whatHappened: 'x'.repeat(7000) });
	assert.equal(draft, null);
	assert.ok(errors.some((e) => e.field === 'whatHappened' && /limited to/.test(e.message)));
});

test('blank lines in a list field are dropped rather than counted', () => {
	assert.deepEqual(lines('one\n\n  \ntwo\n'), ['one', 'two']);
	/* And a list padded with blanks does not clear the floor. */
	const { draft } = validateSubmission({ ...good(), cannotGeneralize: 'A real reason that is long enough\n\n\n\n' });
	assert.equal(draft, null, 'blank lines were counted toward the minimum');
});

/* ------------------------------------------------------------------ */
/* The verdict check                                                   */
/* ------------------------------------------------------------------ */

test('verdict-shaped phrases are found and explained', () => {
	for (const phrase of [
		'the claim should have been paid',
		'it should not have been denied',
		'the adjuster was wrong',
		'this was clearly covered',
		'they acted in bad faith',
		'they owed me the full amount',
	]) {
		const flags = verdictFlags(phrase);
		assert.ok(flags.length > 0, `"${phrase}" was not flagged`);
		assert.ok(flags[0].why.length > 10, 'a flag does not say why it tripped');
	}
});

test('an ordinary account of what happened is not flagged', () => {
	const { draft } = validateSubmission(good());
	assert.deepEqual(draft.verdictFlags, [], 'a clean account tripped the verdict check');
});

test('the verdict check flags rather than blocks', () => {
	/*
	 * Deliberate, and the reason is a false positive nobody should lose their
	 * work to: "the adjuster told me it should have been covered" is a report of
	 * what somebody said, which is exactly the kind of fact this site wants, and
	 * the pattern cannot tell the difference. A person decides.
	 */
	const input = { ...good(), decidedBy: 'The adjuster told me on the phone that it should have been covered, then the file was reassigned.' };
	const { errors, draft } = validateSubmission(input);
	assert.deepEqual(errors, [], 'a verdict-shaped phrase blocked the submission instead of flagging it');
	assert.ok(draft.verdictFlags.length > 0, 'the phrase was not flagged for the moderator either');
});

test('the check reads every field, not just the narrative', () => {
	const input = { ...good(), title: 'A claim that should have been paid and was not' };
	assert.ok(validateSubmission(input).draft.verdictFlags.length > 0, 'the title was not checked');
});

/* ------------------------------------------------------------------ */
/* The queue                                                           */
/* ------------------------------------------------------------------ */

test('a submission goes into the queue and comes back out oldest first', async () => {
	const store = memoryStore();
	await store.upsertAccount('reader@example.com');
	const { draft } = validateSubmission(good());

	const older = await store.createSubmission({ ...draft, email: 'reader@example.com' }, newSubmissionId(), '2026-09-01T00:00:00.000Z');
	const newer = await store.createSubmission({ ...draft, email: 'reader@example.com' }, newSubmissionId(), '2026-09-08T00:00:00.000Z');

	const queue = await store.pendingSubmissions();
	assert.deepEqual(
		queue.map((s) => s.id),
		[older.id, newer.id],
		'the queue is not oldest first, which makes it a judgement about whose account matters more',
	);
});

test('a decided submission leaves the queue and keeps the reason', async () => {
	const store = memoryStore();
	await store.upsertAccount('reader@example.com');
	const { draft } = validateSubmission(good());
	const submission = await store.createSubmission({ ...draft, email: 'reader@example.com' }, newSubmissionId(), new Date().toISOString());

	await store.decideSubmission(submission.id, {
		state: 'needs-more',
		moderator: 'mod@example.com',
		note: 'Which state was the property in?',
		decidedAt: new Date().toISOString(),
	});

	assert.equal((await store.pendingSubmissions()).length, 0, 'a decided submission is still in the queue');
	const after = await store.getSubmission(submission.id);
	assert.equal(after.state, 'needs-more');
	assert.equal(after.moderatorNote, 'Which state was the property in?');

	/* And the contributor can see where it got to. */
	const mine = await store.submissionsBy('reader@example.com');
	assert.equal(mine[0].moderatorNote, 'Which state was the property in?');
});

test('a contributor sees only their own submissions', async () => {
	const store = memoryStore();
	const { draft } = validateSubmission(good());
	await store.createSubmission({ ...draft, email: 'a@example.com' }, newSubmissionId(), new Date().toISOString());
	await store.createSubmission({ ...draft, email: 'b@example.com' }, newSubmissionId(), new Date().toISOString());

	assert.equal((await store.submissionsBy('a@example.com')).length, 1);
	assert.equal((await store.submissionsBy('b@example.com')).length, 1);
});

/* ------------------------------------------------------------------ */
/* Who moderates                                                       */
/* ------------------------------------------------------------------ */

test('moderator status comes from the environment and from nowhere else', () => {
	const env = { COMMONS_MODERATORS: 'mod@example.com, Second@Example.com' };
	assert.equal(isModerator('mod@example.com', env), true);
	assert.equal(isModerator('second@example.com', env), true, 'the list is not case insensitive');
	assert.equal(isModerator('reader@example.com', env), false);
	assert.equal(isModerator(undefined, env), false);
	assert.equal(isModerator('mod@example.com', {}), false, 'an unset list granted access');
	assert.equal(isModerator('', { COMMONS_MODERATORS: '' }), false, 'an empty entry matched an empty email');
	assert.deepEqual(moderators({ COMMONS_MODERATORS: ' , a@b.com , ' }), ['a@b.com']);
});

test('no page can grant moderator status', () => {
	/*
	 * The whole privilege-escalation surface of this application is a deployment
	 * setting. If a page ever writes COMMONS_MODERATORS or sets `kind` to staff,
	 * that stops being true.
	 */
	const pages = [];
	const walk = (dir) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (/\.(astro|ts)$/.test(full)) pages.push(full);
		}
	};
	walk(path.join(ROOT, 'src/pages'));

	for (const file of pages) {
		const body = fs.readFileSync(file, 'utf8');
		assert.ok(!/COMMONS_MODERATORS\s*=/.test(body), `${path.relative(ROOT, file)} assigns COMMONS_MODERATORS`);
		assert.ok(
			!/kind:\s*['"]staff['"]/.test(body),
			`${path.relative(ROOT, file)} sets an account to staff, which is a privilege the UI must not grant`,
		);
	}
});

/* ------------------------------------------------------------------ */
/* Publication                                                         */
/* ------------------------------------------------------------------ */

test('an approved submission becomes a report the content schema accepts', () => {
	const { draft } = validateSubmission(good());
	const submission = { ...draft, id: 'x', email: 'reader@example.com', state: 'pending', submittedAt: '2026-09-09T00:00:00.000Z' };
	const account = { email: 'reader@example.com', displayName: 'A Reader', kind: 'reader', createdAt: '2026-09-09T00:00:00.000Z' };

	const record = draftReport(submission, account, {
		label: 'contributed-account',
		labelNote: 'A reader account of their own claim, moderated before publication and checked for identifying detail.',
		provenance: 'Submitted through intake, identifying detail removed, and the sequence of dates checked against itself. Nothing was corroborated against a document.',
		name: 'Brian Bollinger',
		publishedOn: '2026-09-09',
	});

	/* Every field the reports collection requires, at the lengths it requires. */
	assert.ok(record.title.length >= 10);
	assert.ok(record.labelNote.length >= 30);
	assert.ok(record.provenance.length >= 40);
	assert.ok(record.whatHappened.length >= 80);
	assert.ok(record.informationThatMattered.length >= 3);
	assert.ok(record.decidedBy.length >= 20);
	assert.ok(record.cannotGeneralize.length >= 3);
	assert.ok(record.lines.length >= 1);
	assert.equal(record.moderation, 'published');
	assert.equal(record.contributor.displayName, 'A Reader');
	assert.equal(record.moderatedBy, 'Brian Bollinger');

	/* The account's own words are carried through unedited. Editing somebody
	   else's account of what happened to them is not moderation. */
	assert.equal(record.whatHappened, submission.whatHappened);
	assert.deepEqual(record.cannotGeneralize, submission.cannotGeneralize);
});

test('the report slug is a filename and stays short', () => {
	assert.equal(reportSlug('A water loss where everything turned on how long the leak had run'), 'a-water-loss-where-everything-turned-on-how');
	assert.match(reportSlug("An adjuster's visit, in March (2025)"), /^[a-z0-9-]+$/);
	assert.ok(!reportSlug('-- Leading and trailing --').startsWith('-'));
});

/* ------------------------------------------------------------------ */
/* Withdrawal                                                          */
/* ------------------------------------------------------------------ */

/*
 * The Commons promises withdrawal on four pages: "at any time, before or after
 * it publishes, for any reason or none". These assert the promise rather than
 * the implementation, because the promise is the thing that was made.
 */

const withStore = async () => {
	const store = memoryStore();
	await store.upsertAccount('reader@example.com');
	const { draft } = validateSubmission(good());
	const submission = await store.createSubmission(
		{ ...draft, email: 'reader@example.com' },
		newSubmissionId(),
		new Date().toISOString(),
	);
	return { store, submission };
};

test('an unpublished submission is withdrawn on the spot', async () => {
	const { store, submission } = await withStore();
	await store.withdrawSubmission(submission.id, 'withdrawn', new Date().toISOString());

	const after = await store.getSubmission(submission.id);
	assert.equal(after.state, 'withdrawn');
	assert.ok(after.withdrawnAt, 'the withdrawal was not dated');
	assert.equal((await store.pendingSubmissions()).length, 0, 'a withdrawn submission is still in the queue');
});

test('withdrawing asks for no reason', async () => {
	/*
	 * "For any reason or none" is the promise, and the shape of the API is what
	 * keeps it: there is nowhere to put a justification, so no later page can
	 * start requiring one without changing this signature.
	 */
	const { store, submission } = await withStore();
	assert.equal(
		store.withdrawSubmission.length,
		3,
		'withdrawSubmission takes something other than (id, state, at) - if that is a reason, the promise is broken',
	);
	await store.withdrawSubmission(submission.id, 'withdrawn', new Date().toISOString());
	assert.equal((await store.getSubmission(submission.id)).state, 'withdrawn');
});

test('a published report is requested rather than pulled, and stays up until the file changes', async () => {
	const { store, submission } = await withStore();
	await store.decideSubmission(submission.id, {
		state: 'published',
		moderator: 'mod@example.com',
		note: 'Published.',
		decidedAt: new Date().toISOString(),
		publishedSlug: 'a-water-loss-where-everything-turned-on-how',
	});

	await store.withdrawSubmission(submission.id, 'withdrawal-requested', new Date().toISOString());
	const after = await store.getSubmission(submission.id);
	assert.equal(after.state, 'withdrawal-requested', 'a published report was marked withdrawn before the file changed');

	/* And it reaches the moderator with the filename, because "find it by title"
	   is how the wrong file gets edited. */
	const queue = await store.withdrawalRequests();
	assert.equal(queue.length, 1);
	assert.equal(queue[0].publishedSlug, 'a-water-loss-where-everything-turned-on-how');
});

test('withdrawal does not overwrite what the moderator decided', async () => {
	/* A report a moderator declined and one its author withdrew are different
	   things. One state field with one timestamp cannot say which happened, so
	   the two are recorded separately. */
	const { store, submission } = await withStore();
	const decidedAt = new Date('2026-09-01T00:00:00.000Z').toISOString();
	await store.decideSubmission(submission.id, {
		state: 'published',
		moderator: 'mod@example.com',
		note: 'Published with the label contributed-account.',
		decidedAt,
		publishedSlug: 'slug',
	});
	await store.withdrawSubmission(submission.id, 'withdrawal-requested', new Date().toISOString());

	const after = await store.getSubmission(submission.id);
	assert.equal(after.decidedByModerator, 'mod@example.com', 'the moderator record was overwritten by the withdrawal');
	assert.equal(after.decidedAt, decidedAt);
	assert.equal(after.moderatorNote, 'Published with the label contributed-account.');
	assert.notEqual(after.withdrawnAt, after.decidedAt, 'the two events share a timestamp, so neither can be told from the other');
});

test('the moderator completing a withdrawal clears it from the queue', async () => {
	const { store, submission } = await withStore();
	await store.decideSubmission(submission.id, {
		state: 'published', moderator: 'mod@example.com', note: 'ok', decidedAt: new Date().toISOString(), publishedSlug: 'slug',
	});
	await store.withdrawSubmission(submission.id, 'withdrawal-requested', new Date().toISOString());
	await store.withdrawSubmission(submission.id, 'withdrawn', new Date().toISOString());

	assert.equal((await store.withdrawalRequests()).length, 0);
	assert.equal((await store.getSubmission(submission.id)).state, 'withdrawn');
});

test('the promise of withdrawal is made on pages that can deliver it', () => {
	/*
	 * This is the assertion that would have caught the gap. Four pages promised
	 * withdrawal "at any time" and nothing on the site could do it. A promise
	 * with no mechanism behind it is the defect this project treats most
	 * seriously, so the promise and the route are now checked together.
	 */
	const route = path.join(ROOT, 'src/pages/contribute/withdraw.ts');
	assert.ok(fs.existsSync(route), 'the withdrawal route does not exist');

	const account = fs.readFileSync(path.join(ROOT, 'src/pages/account.astro'), 'utf8');
	assert.match(
		account,
		/action="\/contribute\/withdraw"/,
		'the account page never offers withdrawal, so the promise has no path a contributor can take',
	);

	/* And the route never asks why. */
	const body = fs.readFileSync(route, 'utf8');
	assert.ok(!/reason/i.test(body.replace(/\/\*[\s\S]*?\*\//g, '')), 'the withdrawal route reads a reason from the request');
});
