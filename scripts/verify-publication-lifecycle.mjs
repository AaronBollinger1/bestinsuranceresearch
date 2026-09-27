/**
 * BR-C3: draft, review, publish, version, correction, refresh, and the
 * noindex contract. Answer text still comes only from composeAnswer.
 *
 *   node --experimental-strip-types --test scripts/verify-publication-lifecycle.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { composeAnswer } from '../src/lib/answer-workflow.ts';
import { applyClaimEvent, buildSourceStudies, reduceClaimStudy } from '../src/lib/source-study.ts';
import { buildQuestionRegistry } from '../src/lib/question-registry.ts';
import {
	FORBIDDEN_SCHEMA_TYPES,
	PUBLICATION_STATES,
	addDays,
	applyPublicationEvent,
	emptyPublication,
	publicationContract,
	reducePublication,
} from '../src/lib/publication-lifecycle.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(file, 'utf8');
const registry = buildQuestionRegistry(
	JSON.parse(read(path.join(ROOT, 'scripts/fixtures/question-registry/synthetic-registry.json'))).questions,
);
const states = JSON.parse(read(path.join(ROOT, 'scripts/fixtures/publication-lifecycle/states.json')));

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

const baseAssembly = { ...assemble('composed.json'), freshnessPolicy: { staleAfterDays: 30 } };
const origin = 'https://birch.insure';
const at = (minute) => `2026-09-27T15:${String(minute).padStart(2, '0')}:00.000Z`;

function open(assembly, minute = 0, id = 'fixture-widget-answer') {
	return applyPublicationEvent(emptyPublication(), {
		id: `open-${id}-${minute}`,
		kind: 'opened',
		at: at(minute),
		actor: 'editor',
		note: 'Opened a fixture publication over the composed answer.',
		synthetic: true,
		publicationId: id,
		assembly,
	}, registry);
}

function move(snapshot, kind, minute, extra = {}) {
	const event = {
		id: `${kind}-${minute}`,
		kind,
		at: at(minute),
		actor: 'editor',
		note: `Fixture ${kind} at minute ${minute}.`,
		synthetic: true,
		...extra,
	};
	return { snapshot: applyPublicationEvent(snapshot, event, registry), event };
}

function contract(snapshot, options = {}) {
	return publicationContract(snapshot, {
		commonsReady: false,
		posture: 'production',
		origin,
		asOf: '2026-09-27',
		...options,
	});
}

function assertClean(snapshot, state) {
	assert.equal(snapshot.problems.length, 0, snapshot.problems.map((problem) => problem.problem).join('; '));
	assert.equal(snapshot.state, state);
}

test('the state list is the lifecycle, and this module mounts no route', () => {
	assert.deepEqual([...PUBLICATION_STATES], states.states);
	assert.equal(fs.existsSync(path.join(ROOT, 'src/pages/answers')), false);
	assert.ok(!read(path.join(ROOT, 'astro.config.mjs')).includes('/answers'));
	const source = read(path.join(ROOT, 'src/lib/publication-lifecycle.ts'));
	assert.ok(!/from\s+'node:fs'|require\(\s*'node:fs'/.test(source));
	assert.ok(!/\bfetch\s*\(/.test(source));
	assert.ok(!/process\.env/.test(source));
	assert.deepEqual([...FORBIDDEN_SCHEMA_TYPES], ['FAQPage', 'ClaimReview', 'Rating', 'Review', 'Offer']);
});

test('a composed answer walks the lifecycle without losing evidence or history', () => {
	const direct = composeAnswer(baseAssembly, registry);
	assert.equal(direct.status, 'composed');

	let snapshot = open(baseAssembly);
	assertClean(snapshot, 'draft');
	assert.equal(contract(snapshot, { commonsReady: true }).indexable, false, 'a draft is public while unreviewed');

	snapshot = move(snapshot, 'submitted-for-review', 1).snapshot;
	assertClean(snapshot, 'under-review');
	snapshot = move(snapshot, 'approved', 2).snapshot;
	assertClean(snapshot, 'approved');
	assert.equal(contract(snapshot, { commonsReady: true }).sitemapIncluded, false);

	snapshot = move(snapshot, 'published', 3).snapshot;
	assertClean(snapshot, 'published');
	const closed = contract(snapshot);
	assert.equal(closed.indexable, false);
	assert.equal(closed.sitemapIncluded, false);
	assert.equal(closed.served, false);
	assert.equal(closed.robotsMeta, 'noindex, nofollow');
	assert.match(closed.reasons.join(' '), /PUBLIC_COMMONS_READY is false/);

	const preview = contract(snapshot, { commonsReady: true, posture: 'preview' });
	assert.equal(preview.indexable, false);
	assert.match(preview.reasons.join(' '), /preview posture is noindex/);

	const live = contract(snapshot, { commonsReady: true, asOf: '2026-10-01' });
	assert.equal(live.indexable, true);
	assert.equal(live.sitemapIncluded, true);
	assert.equal(live.robotsMeta, 'index, follow');
	assert.equal(live.canonical, `${origin}/answers/fixture-widget-answer`);
	assert.equal(live.schema['@type'], 'QAPage');
	assert.equal(live.schema.mainEntity, direct.answer.questionId);
	assert.equal(live.refresh.status, 'not-due');
	assert.equal(live.refresh.nextDue, addDays('2026-09-27', 30));
	assert.deepEqual(live.provenance.sentences.map((sentence) => sentence.text), direct.answer.sentences.map((sentence) => sentence.text));
	assert.deepEqual(live.provenance.corrections, direct.answer.corrections);
	assert.deepEqual(live.provenance.conflicts, direct.answer.conflicts);
	assert.deepEqual(live.provenance.uncertainty, direct.answer.uncertainty);
	for (const forbidden of FORBIDDEN_SCHEMA_TYPES) assert.notEqual(live.schema['@type'], forbidden);

	const overdue = contract(snapshot, { commonsReady: true, asOf: '2026-10-28' });
	assert.equal(overdue.refresh.status, 'due');
	assert.equal(overdue.indexable, false);
	assert.equal(overdue.sitemapIncluded, false);
	assert.equal(snapshot.state, 'published', 'the schedule stops indexing before the stale event is recorded');

	const early = move(snapshot, 'marked-stale', 4, { actor: 'system', asOf: '2026-10-01' });
	assert.equal(early.snapshot.state, 'published');
	assert.match(early.snapshot.problems.at(-1).problem, /not due/);

	snapshot = move(snapshot, 'marked-stale', 5, { actor: 'system', asOf: '2026-10-28' }).snapshot;
	assertClean(snapshot, 'stale');
	const stale = contract(snapshot, { commonsReady: true, asOf: '2026-10-28' });
	assert.equal(stale.indexable, false);
	assert.equal(stale.served, true);
	assert.equal(stale.httpStatus, 200);
	assert.equal(stale.schema, null);

	const correctedAssembly = correctFirstClaim(baseAssembly);
	const refreshed = move(snapshot, 'refreshed', 6, { assembly: correctedAssembly }).snapshot;
	assertClean(refreshed, 'under-review');
	assert.equal(contract(refreshed, { commonsReady: true }).indexable, false);
	assert.ok(refreshed.versions.length > snapshot.versions.length - 1);
	assert.equal(refreshed.versions[0].state, 'draft');
	assert.equal(refreshed.events.length, refreshed.versions.length);
	assert.deepEqual(reducePublication(replayable(refreshed), registry).state, refreshed.state);
});

test('correction keeps the previous version, and rollback can restore it', () => {
	let snapshot = open(baseAssembly);
	snapshot = move(snapshot, 'submitted-for-review', 1).snapshot;
	snapshot = move(snapshot, 'approved', 2).snapshot;
	snapshot = move(snapshot, 'published', 3).snapshot;
	const publishedSentences = contract(snapshot, { commonsReady: true }).provenance.sentences.map((sentence) => sentence.text);
	const correctedAssembly = correctFirstClaim(baseAssembly);
	snapshot = move(snapshot, 'corrected', 7, { assembly: correctedAssembly }).snapshot;
	assertClean(snapshot, 'corrected');
	const corrected = contract(snapshot, { commonsReady: true, asOf: '2026-09-27' });
	assert.equal(corrected.indexable, true);
	assert.notDeepEqual(corrected.provenance.sentences.map((sentence) => sentence.text), publishedSentences);
	assert.ok(snapshot.versions.some((version) => version.state === 'published'));
	assert.ok(snapshot.versions.some((version) => version.state === 'corrected'));

	const publishedVersion = snapshot.versions.find((version) => version.state === 'published').version;
	snapshot = move(snapshot, 'rolled-back', 8, { restoreVersion: publishedVersion }).snapshot;
	assertClean(snapshot, 'published');
	assert.deepEqual(
		contract(snapshot, { commonsReady: true }).provenance.sentences.map((sentence) => sentence.text),
		publishedSentences,
	);
	assert.ok(snapshot.events.some((event) => event.kind === 'corrected'), 'rollback left the correction in the log');
	assert.ok(snapshot.events.some((event) => event.kind === 'rolled-back'));
});

test('supersession redirects, withdrawal is gone, and neither is indexed', () => {
	let snapshot = publishStandard();
	snapshot = move(snapshot, 'superseded', 9, { successorId: 'fixture-widget-successor' }).snapshot;
	assertClean(snapshot, 'superseded');
	const redirected = contract(snapshot, { commonsReady: true });
	assert.equal(redirected.indexable, false);
	assert.equal(redirected.sitemapIncluded, false);
	assert.equal(redirected.httpStatus, 301);
	assert.deepEqual(redirected.redirect, { to: `${origin}/answers/fixture-widget-successor`, status: 301 });
	assert.equal(redirected.canonical, redirected.redirect.to);
	assert.equal(contract(snapshot).emitRedirect, false, 'a closed commons flag does not emit the redirect');

	let withdrawn = publishStandard();
	withdrawn = move(withdrawn, 'withdrawn', 10).snapshot;
	assertClean(withdrawn, 'withdrawn');
	const gone = contract(withdrawn, { commonsReady: true });
	assert.equal(gone.httpStatus, 410);
	assert.equal(gone.redirect, null);
	assert.equal(gone.indexable, false);
	assert.equal(gone.sitemapIncluded, false);
});

test('missing evidence and a failed gate never become a public answer', () => {
	const research = open(assemble('research-required.json'), 20, 'fixture-gadget-answer');
	assertClean(research, 'draft');
	const submitted = move(research, 'submitted-for-review', 21);
	assert.equal(submitted.snapshot.state, 'draft');
	assert.match(submitted.snapshot.problems.at(-1).problem, /research-required/);
	assert.equal(contract(research, { commonsReady: true }).indexable, false);

	const published = publishStandard();
	const blocked = move(published, 'corrected', 22, { assembly: assemble('blocked-licensed-floor.json') });
	assert.equal(blocked.snapshot.state, 'published');
	assert.match(blocked.snapshot.problems.at(-1).problem, /review-required/);
});

test('high stakes cannot be approved or corrected by an editor, and a later floor forces review on rollback', () => {
	const high = highStakesAssembly(baseAssembly);
	let snapshot = open(high, 30, 'fixture-widget-high');
	assert.equal(snapshot.highStakes, true);
	snapshot = move(snapshot, 'submitted-for-review', 31).snapshot;
	assertClean(snapshot, 'under-review');
	const editorApproval = move(snapshot, 'approved', 32);
	assert.equal(editorApproval.snapshot.state, 'under-review');
	assert.match(editorApproval.snapshot.problems.at(-1).problem, /licensed reviewer/);
	snapshot = move(snapshot, 'approved', 33, { actor: 'licensed-reviewer' }).snapshot;
	assertClean(snapshot, 'approved');
	snapshot = move(snapshot, 'published', 34).snapshot;
	assertClean(snapshot, 'published');
	const editorCorrection = move(snapshot, 'corrected', 35, { assembly: high });
	assert.equal(editorCorrection.snapshot.state, 'published');
	assert.match(editorCorrection.snapshot.problems.at(-1).problem, /licensed reviewer/);

	let standard = publishStandard();
	const raised = move(standard, 'corrected', 36, { actor: 'licensed-reviewer', assembly: highStakesAssembly(correctFirstClaim(baseAssembly)) });
	assertClean(raised.snapshot, 'corrected');
	assert.equal(raised.snapshot.highStakes, true);
	const publishedVersion = raised.snapshot.versions.find((version) => version.state === 'published');
	assert.equal(publishedVersion.highStakes, false);
	const rolled = move(raised.snapshot, 'rolled-back', 37, { actor: 'licensed-reviewer', restoreVersion: publishedVersion.version });
	assertClean(rolled.snapshot, 'under-review');
	assert.equal(contract(rolled.snapshot, { commonsReady: true }).indexable, false);
	assert.equal(rolled.snapshot.highStakes, true);
});

test('the fold refuses illegal, replayed, backdated, and non-synthetic events', () => {
	const snapshot = open(baseAssembly, 40, 'fixture-widget-refusals');
	const skipped = move(snapshot, 'published', 41);
	assert.equal(skipped.snapshot.state, 'draft');
	assert.match(skipped.snapshot.problems.at(-1).problem, /cannot published/);
	const again = applyPublicationEvent(snapshot, {
		id: snapshot.events[0].id,
		kind: 'opened',
		at: at(42),
		actor: 'editor',
		note: 'Replaying the open.',
		synthetic: true,
		publicationId: 'fixture-widget-refusals',
		assembly: baseAssembly,
	}, registry);
	assert.equal(again.currentVersion, snapshot.currentVersion);
	const backdated = applyPublicationEvent(snapshot, {
		id: 'backdated',
		kind: 'submitted-for-review',
		at: '2026-09-27T14:00:00.000Z',
		actor: 'editor',
		note: 'This event moves time backwards.',
		synthetic: true,
	}, registry);
	assert.match(backdated.problems.at(-1).problem, /does not move time forward/);
	const live = applyPublicationEvent(emptyPublication(), {
		id: 'live-open',
		kind: 'opened',
		at: at(43),
		actor: 'editor',
		note: 'A real publication, which this unit cannot record.',
		synthetic: false,
		publicationId: 'fixture-live',
		assembly: baseAssembly,
	}, registry);
	assert.equal(live.opened, false);
	assert.match(live.problems.at(-1).problem, /synthetic/);
	const self = move(publishStandard(), 'superseded', 44, { successorId: 'fixture-widget-answer' });
	assert.match(self.snapshot.problems.at(-1).problem, /cannot succeed itself/);
});

test('the commons flag is an argument, and an environment value cannot open the contract', () => {
	const snapshot = publishStandard();
	const prior = process.env.PUBLIC_COMMONS_READY;
	process.env.PUBLIC_COMMONS_READY = 'true';
	try {
		const closed = contract(snapshot, { commonsReady: false, posture: 'production' });
		assert.equal(closed.indexable, false);
		assert.equal(closed.sitemapIncluded, false);
		assert.notEqual(process.env.PUBLIC_COMMONS_READY, undefined);
	} finally {
		if (prior === undefined) delete process.env.PUBLIC_COMMONS_READY;
		else process.env.PUBLIC_COMMONS_READY = prior;
	}
	assert.notEqual(process.env.PUBLIC_COMMONS_READY, 'true');
});

test('every state occurs, and noindex never agrees with a sitemap entry', () => {
	const seen = new Set();
	let snapshot = open(baseAssembly, 50, 'fixture-widget-states');
	seen.add(snapshot.state);
	for (const [kind, minute, extra] of [
		['submitted-for-review', 51, {}],
		['approved', 52, {}],
		['published', 53, {}],
		['corrected', 54, { assembly: correctFirstClaim(baseAssembly) }],
		['marked-stale', 55, { actor: 'editor' }],
		['refreshed', 56, { assembly: baseAssembly }],
	]) {
		snapshot = move(snapshot, kind, minute, extra).snapshot;
		assert.equal(snapshot.problems.length, 0, snapshot.problems.map((problem) => problem.problem).join('; '));
		seen.add(snapshot.state);
	}
	const superseded = move(publishStandard(), 'superseded', 57, { successorId: 'fixture-widget-successor' }).snapshot;
	const withdrawn = move(open(baseAssembly, 58, 'fixture-widget-withdrawn'), 'withdrawn', 59).snapshot;
	seen.add(superseded.state);
	seen.add(withdrawn.state);
	assert.deepEqual([...seen].sort(), [...states.states].sort());

	for (const record of [snapshot, superseded, withdrawn]) {
		for (const commonsReady of [false, true]) {
			for (const posture of ['preview', 'production']) {
				const view = contract(record, { commonsReady, posture, asOf: '2026-09-27' });
				if (view.robotsMeta.includes('noindex')) assert.equal(view.sitemapIncluded, false);
				assert.equal(view.sitemapIncluded, view.indexable);
				if (!states.indexableStates.includes(record.state) || !commonsReady || posture !== 'production') {
					assert.equal(view.indexable, false);
				}
			}
		}
	}
});

function publishStandard() {
	let snapshot = open(baseAssembly, 0, 'fixture-widget-answer');
	snapshot = move(snapshot, 'submitted-for-review', 1).snapshot;
	snapshot = move(snapshot, 'approved', 2).snapshot;
	snapshot = move(snapshot, 'published', 3).snapshot;
	assertClean(snapshot, 'published');
	return snapshot;
}

function correctFirstClaim(assembly) {
	let claim = applyClaimEvent(assembly.claims[0], {
		id: 'corr-narrow',
		kind: 'narrowed',
		at: '2026-09-27T11:00:00.000Z',
		actor: 'editor',
		note: 'Narrowed the renewal proposition to the filing office after publication.',
		text: 'The fixture widget filing must be renewed each year for each filing office.',
		synthetic: true,
	});
	claim = applyClaimEvent(claim, {
		id: 'corr-confirm',
		kind: 'confirmed',
		at: '2026-09-27T11:01:00.000Z',
		actor: 'editor',
		note: 'Re-confirmed the narrowed renewal proposition.',
		synthetic: true,
	});
	assert.equal(claim.problems.length, 0, claim.problems.map((problem) => problem.problem).join('; '));
	return { ...assembly, claims: [claim, ...assembly.claims.slice(1)] };
}

function highStakesAssembly(assembly) {
	const claims = assembly.claims.map((claim, index) => applyClaimEvent(claim, {
		id: `lic-${index}`,
		kind: 'licensed-review-recorded',
		at: `2026-09-27T11:1${index}:00.000Z`,
		actor: 'licensed-reviewer',
		note: 'Synthetic licensed-reviewer event, in-test only, pinning the current wording.',
		synthetic: true,
	}));
	for (const claim of claims) assert.equal(claim.problems.length, 0, claim.problems.map((problem) => problem.problem).join('; '));
	return { ...assembly, topics: ['coverage-determination'], claims };
}

function replayable(snapshot) {
	return snapshot.events.map((event) => ({
		id: event.id,
		kind: event.kind,
		at: event.at,
		actor: event.actor,
		note: event.note,
		synthetic: true,
		publicationId: event.kind === 'opened' ? snapshot.id : undefined,
		assembly: snapshot.versions.find((version) => version.eventId === event.id)?.assembly,
		successorId: event.kind === 'superseded' ? snapshot.successorId : undefined,
		asOf: event.kind === 'marked-stale' && event.actor === 'system' ? '2026-10-28' : undefined,
	}));
}
