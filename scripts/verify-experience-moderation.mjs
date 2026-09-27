/**
 * BR-D4: experiences stay unreviewed records. Facts, opinions, and disputes
 * are separate, and the safety controls refuse the bad cases.
 *
 *   node --experimental-strip-types --test scripts/verify-experience-moderation.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	EXPERIENCE_PUBLICATION_OPEN,
	addCompanyExperienceResponse,
	appealExperience,
	attachEvidence,
	correctExperience,
	createExperienceBook,
	experiencePublication,
	moderateExperience,
	presentExperience,
	submitExperience,
	withdrawExperience,
} from '../src/lib/experience-moderation.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AT = '2026-09-27T12:00:00.000Z';

function submit(book, extra = {}) {
	return submitExperience(book, {
		id: 'exp-1',
		authorName: 'Fixture Reader',
		companyId: 'fixture-mutual-group',
		companyName: 'Fixture Mutual',
		disclosures: 'Policyholder. No employment at the company.',
		at: AT,
		statements: [
			{ id: 's-fact', kind: 'fact', text: 'The fixture notice arrived after the work started.', sourceIds: ['fixture-src-notice'] },
			{ id: 's-opinion', kind: 'opinion', text: 'I found the fixture process slow.', sourceIds: [] },
			{ id: 's-dispute', kind: 'unresolved-dispute', text: 'The fixture deadline is still unresolved.', sourceIds: ['fixture-src-notice'] },
		],
		...extra,
	});
}

test('submission, redaction, response, moderation, appeal, correction, and retention stay unpublished', () => {
	assert.equal(EXPERIENCE_PUBLICATION_OPEN, false);
	const book = createExperienceBook();
	const opened = submit(book);
	assert.equal(opened.state, 'submitted');
	const texts = opened.record.statements.map((statement) => statement.text);
	let record = attachEvidence(opened.record, { id: 'ev-1', title: 'Fixture notice', url: 'https://fixture.invalid/notice', at: AT });
	assert.equal(record.state, 'in-moderation');
	record = addCompanyExperienceResponse(record, { author: 'Fixture Representative', text: 'Fixture Mutual disagrees with the timing.', at: AT });
	assert.equal(record.state, 'company-responded');
	assert.deepEqual(record.statements.map((statement) => statement.text), texts);
	record = moderateExperience(record, { at: AT, decision: 'reject', note: 'Held for an unsupported allegation.' });
	assert.equal(record.state, 'rejected');
	record = appealExperience(record, { at: AT, note: 'The notice is attached.' });
	assert.equal(record.state, 'appealed');
	record = correctExperience(record, { statementId: 's-fact', text: 'The fixture notice arrived the day after the work started.', at: AT, note: 'Date narrowed.' });
	assert.equal(record.state, 'corrected');
	assert.ok(record.events.some((event) => event.action === 'submitted'));
	record = withdrawExperience(record, { at: AT, retainUntil: '2027-09-27' });
	assert.equal(record.state, 'withdrawn');
	assert.equal(record.retainedUntil, '2027-09-27');
	assert.ok(record.statements.every((statement) => statement.text === '[withdrawn]'));
	assert.ok(record.events.length >= 5);
	const verdict = experiencePublication(record, { commonsReady: true });
	assert.equal(verdict.eligible, false);
	assert.equal(verdict.indexable, false);
	assert.equal(verdict.sitemapIncluded, false);
	const source = fs.readFileSync(path.join(ROOT, 'src/lib/experience-moderation.ts'), 'utf8');
	assert.ok(!/\bfetch\s*\(/.test(source));
	assert.ok(!/process\.env/.test(source));
	assert.equal(fs.existsSync(path.join(ROOT, 'src/pages/experiences')), false);
});

test('facts, opinions, and unresolved disputes stay in separate presented fields', () => {
	const book = createExperienceBook();
	const opened = submit(book);
	const view = presentExperience(opened.record);
	assert.deepEqual(view.facts.map((item) => item.label), ['Factual claim']);
	assert.deepEqual(view.opinions.map((item) => item.label), ['Personal opinion']);
	assert.deepEqual(view.disputes.map((item) => item.label), ['Unresolved dispute']);
	assert.equal(view.indexable, false);
	assert.ok(view.facts.every((item) => !view.opinions.includes(item) && !view.disputes.some((dispute) => dispute.text === item.text)));
});

test('abuse, impersonation, defamation, sensitive data, duplicate, and conflict of interest fail closed', () => {
	const book = createExperienceBook();
	const sensitive = submit(book, {
		id: 'exp-sensitive',
		statements: [{ id: 's1', kind: 'fact', text: 'My policy number ABC-123 was ignored.', sourceIds: ['fixture-src-notice'] }],
	});
	assert.equal(sensitive.state, 'redacted');
	assert.ok(!JSON.stringify(sensitive.record).includes('ABC-123'));
	const named = submit(book, {
		id: 'exp-defame',
		authorName: 'Another Reader',
		statements: [{ id: 's1', kind: 'fact', text: 'The adjuster committed fraud.', sourceIds: [] }],
	});
	assert.equal(named.record.statements[0].kind, 'unresolved-dispute');
	const impersonated = submit(book, {
		id: 'exp-impersonation',
		authorName: 'Fixture Mutual',
		statements: [{ id: 's1', kind: 'fact', text: 'I am the CEO and this is official.', sourceIds: ['fixture-src-notice'] }],
	});
	assert.equal(impersonated.state, 'impersonation');
	assert.equal(book.records.some((record) => record.id === 'exp-impersonation'), false);
	const first = submit(book, { id: 'exp-dup', authorName: 'Dup Reader' });
	const second = submit(book, { id: 'exp-dup-2', authorName: 'Dup Reader' });
	assert.equal(first.ok, true);
	assert.equal(second.state, 'duplicate');
	const conflicted = submit(book, {
		id: 'exp-coi',
		authorName: 'Employee Reader',
		disclosures: 'I work for Fixture Mutual.',
		statements: [{ id: 's1', kind: 'fact', text: 'The fixture filing was complete.', sourceIds: ['fixture-src-notice'] }],
	});
	assert.equal(conflicted.record.conflictOfInterest, true);
	assert.equal(conflicted.record.statements[0].kind, 'opinion');
	const abuse = createExperienceBook();
	for (let attempt = 0; attempt < 5; attempt += 1) {
		submit(abuse, { id: `exp-a-${attempt}`, authorName: 'Repeat Reader', statements: [{ id: 's1', kind: 'opinion', text: `Attempt ${attempt} was slow.`, sourceIds: [] }] });
	}
	assert.equal(submit(abuse, { id: 'exp-a-6', authorName: 'Repeat Reader', statements: [{ id: 's1', kind: 'opinion', text: 'Attempt 6 was slow.', sourceIds: [] }] }).state, 'abuse-limited');
});
