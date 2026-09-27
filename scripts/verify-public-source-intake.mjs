/**
 * BR-D6: fixture public-source intake. No fetch and no paid provider.
 *
 *   node --experimental-strip-types --test scripts/verify-public-source-intake.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	INTAKE_PUBLICATION_OPEN,
	PAID_DISCOVERY_ENABLED,
	createIntakeBook,
	draftPublication,
	pauseIntake,
	pollIntake,
	recordHumanReview,
	removeSource,
	resumeIntake,
	reviewDraft,
	withdrawDraft,
} from '../src/lib/public-source-intake.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOW = '2026-09-27T12:00:00.000Z';
const LATER = '2026-09-27T12:05:00.000Z';
const catalog = {
	companies: ['fixture-mutual-group'],
	states: ['CA'],
	regulators: ['fixture-regulator-ca'],
	coverages: ['homeowners'],
	claims: ['fixture-claim-1'],
	questions: ['fixture-gadget-notice'],
};
const sourceText = 'The fixture regulator bulletin repeats this sentence about delivery deadlines in full so a copy is obvious.';

function source(extra = {}) {
	return {
		id: 'src-bulletin',
		publisher: 'Fixture Regulator',
		canonicalUrl: 'https://fixture.invalid/bulletin',
		kind: 'regulator-bulletin',
		permittedUse: 'allowed',
		robots: 'allow',
		termsReviewed: 'reviewed-allow',
		refreshOwner: 'fixture-library-editor',
		removed: false,
		...extra,
	};
}

function item(extra = {}) {
	return {
		sourceId: 'src-bulletin',
		canonicalUrl: 'https://fixture.invalid/bulletin/2026-09',
		retrievedAt: NOW,
		title: 'Fixture bulletin',
		text: sourceText,
		effectiveDate: '2026-09-01',
		uncertainty: 'The bulletin states no later amendment.',
		reportedFact: 'The fixture bulletin sets a delivery deadline.',
		analysis: 'Birch reads that deadline as applying to the named filing, not to every notice.',
		entities: { company: 'fixture-mutual-group', state: 'CA', regulator: 'fixture-regulator-ca', coverage: 'homeowners', question: 'fixture-gadget-notice' },
		...extra,
	};
}

function poll(book, extra = {}, items = [item()]) {
	return pollIntake(book, { now: NOW, items, catalog, requestsInWindow: 0, maxRequests: 2, backoffMs: 60_000, ...extra });
}

test('allowlist, robots, and terms fail closed and a lawful item becomes a noindex draft', () => {
	assert.equal(PAID_DISCOVERY_ENABLED, false);
	assert.equal(INTAKE_PUBLICATION_OPEN, false);
	const closed = createIntakeBook([
		source({ id: 'src-blocked', permittedUse: 'blocked', robots: 'disallow', termsReviewed: 'unreviewed' }),
	]);
	const refused = poll(closed, {}, [item({ sourceId: 'src-blocked' })]);
	assert.equal(refused.drafts.length, 0);
	assert.equal(closed.snapshots.length, 0);
	assert.ok(closed.events.some((event) => event.action === 'robots-or-terms-closed' && /0 bytes/.test(event.detail)));
	const missing = poll(createIntakeBook([]), {}, [item({ sourceId: 'src-other' })]);
	assert.equal(missing.state, 'no-new-drafts');
	const book = createIntakeBook([source()]);
	const opened = poll(book, {}, [item({ entities: { company: 'not-a-company', state: 'CA' } })]);
	assert.equal(opened.drafts.length, 1);
	assert.equal(opened.drafts[0].indexable, false);
	assert.equal(opened.drafts[0].status, 'noindex-draft');
	assert.equal(opened.drafts[0].modelVersion, 'none');
	assert.ok(opened.drafts[0].gaps.includes('company:not-a-company'));
	assert.equal(opened.drafts[0].provenance.publisher, 'Fixture Regulator');
	assert.notEqual(opened.drafts[0].reportedFact, opened.drafts[0].analysis);
	const again = poll(book);
	assert.equal(again.drafts.length, 0);
	assert.ok(book.events.some((event) => event.action === 'duplicate'));
	assert.equal(book.drafts.length, 1);
	const sourceFile = fs.readFileSync(path.join(ROOT, 'src/lib/public-source-intake.ts'), 'utf8');
	assert.ok(!/\bfetch\s*\(/.test(sourceFile));
	assert.ok(!/process\.env/.test(sourceFile));
});

test('rate limit, backoff, pause, removal, verbatim refusal, and paid discovery stay at zero spend', () => {
	const book = createIntakeBook([source()]);
	assert.equal(poll(book, { requestsInWindow: 2 }).state, 'rate-limited');
	assert.equal(poll(book, { now: '2026-09-27T12:00:30.000Z' }).state, 'backoff');
	resumeIntake(book, LATER);
	const copied = poll(book, { now: LATER }, [item({ reportedFact: sourceText })]);
	assert.equal(copied.drafts.length, 0);
	assert.ok(book.events.some((event) => event.action === 'verbatim-refused'));
	pauseIntake(book, LATER);
	assert.equal(poll(book, { now: LATER }).state, 'paused');
	const paid = poll(createIntakeBook([source()]), { credential: 'paid-key' });
	assert.equal(paid.state, 'paid-discovery-refused');
	assert.equal(paid.drafts.length, 0);
	assert.equal(book.providerCalls, 0);
	assert.equal(book.spend, 0);
	const live = createIntakeBook([source()]);
	poll(live);
	assert.ok(live.snapshots[0].bytesRetained > 0);
	removeSource(live, 'src-bulletin', LATER);
	assert.equal(live.snapshots[0].bytesRetained, 0);
	assert.equal(poll(live, { now: LATER }).drafts.length, 0);
});

test('contradictions stay visible, review does not publish, and withdrawal keeps the record', () => {
	const book = createIntakeBook([source()]);
	poll(book);
	const first = book.drafts[0];
	poll(book, { now: LATER }, [item({
		retrievedAt: LATER,
		text: 'A later fixture bulletin uses different wording about the same deadline.',
		reportedFact: 'The later bulletin moves the deadline.',
		canonicalUrl: first.canonicalUrl,
	})]);
	assert.ok(first.conflicts.length > 0);
	assert.equal(first.reportedFact, 'The fixture bulletin sets a delivery deadline.');
	assert.equal(reviewDraft(book, { draftId: first.id, at: LATER, action: 'dispute', name: 'Fixture Contributor', note: 'The deadline reading is contested.' }).ok, true);
	assert.equal(reviewDraft(book, { draftId: first.id, at: LATER, action: 'validate', name: 'Fixture Contributor', note: 'Validated with the dispute still attached.' }).ok, true);
	assert.equal(first.reviews.length, 2);
	recordHumanReview(book, { draftId: first.id, at: LATER, kind: 'editorial', name: 'Fixture Editor', note: 'Editorial note only.' });
	recordHumanReview(book, { draftId: first.id, at: LATER, kind: 'licensed', name: 'Fixture Reviewer', note: 'Synthetic licensed review, in-test only.' });
	const verdict = draftPublication(first, { commonsReady: true });
	assert.equal(verdict.eligible, false);
	assert.equal(verdict.indexable, false);
	assert.match(verdict.reasons.join(' '), /PUBLIC_COMMONS_READY is false/);
	withdrawDraft(book, first.id, LATER);
	assert.equal(first.status, 'withdrawn');
	assert.ok(book.drafts.some((draft) => draft.id === first.id));
});
