/**
 * BR-D3: contribution drafts, claim review, and company responses.
 * Nothing here is published.
 *
 *   node --experimental-strip-types --test scripts/verify-professional-contribution.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	CONTRIBUTION_PUBLICATION_OPEN,
	addCompanyResponse,
	contestCompanyResponse,
	contributionPublication,
	openContribution,
	recordEditorial,
	recordLicensedReview,
	recordSignal,
	reviewClaim,
	reviseCompanyResponse,
	visibilitySignal,
} from '../src/lib/professional-contribution.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contributor = { name: 'Fixture Contributor', credentials: 'No licence is claimed.', disclosures: 'Fixture identity only.', role: 'contributor' };
const editor = { name: 'Fixture Editor', credentials: 'Editor.', disclosures: 'Fixture editor.', role: 'editor' };
const reviewer = { name: 'Fixture Reviewer', credentials: 'Synthetic licensed-reviewer, in-test only.', disclosures: 'Not a real licence.', role: 'licensed-reviewer' };
const company = { name: 'Fixture Representative', credentials: 'Speaks for Fixture Mutual only.', disclosures: 'Company representative. Not independent evidence.', role: 'company-representative' };

function draft() {
	const opened = openContribution({
		id: 'fixture-contribution-1',
		questionId: 'fixture-gadget-notice',
		author: contributor,
		at: '2026-09-27T12:00:00.000Z',
		sources: [{ id: 'fixture-src-notice', title: 'Fixture notice', url: 'https://fixture.invalid/notice' }],
		claims: [
			{ id: 'c1', text: 'The fixture notice is delivered before the work begins.', sourceIds: ['fixture-src-notice'], dissent: [{ at: '2026-09-27T11:00:00.000Z', name: 'Earlier reader', note: 'The bulletin names a different deadline.' }] },
			{ id: 'c2', text: 'The fixture bulletin counts delivery from the mailing date.', sourceIds: ['fixture-src-notice'] },
		],
	});
	assert.equal(opened.ok, true);
	return opened.draft;
}

test('a contribution without credentials or a source does not open, and publication stays closed', () => {
	assert.equal(CONTRIBUTION_PUBLICATION_OPEN, false);
	const bare = openContribution({
		id: 'bare', questionId: 'fixture-gadget-notice', at: '2026-09-27T12:00:00.000Z',
		author: { ...contributor, disclosures: ' ' },
		sources: [{ id: 'fixture-src-notice', title: 'Fixture notice', url: 'https://fixture.invalid/notice' }],
		claims: [{ id: 'c1', text: 'A claim.', sourceIds: ['fixture-src-notice'] }],
	});
	assert.equal(bare.ok, false);
	const unsourced = openContribution({
		id: 'unsourced', questionId: 'fixture-gadget-notice', at: '2026-09-27T12:00:00.000Z', author: contributor,
		sources: [{ id: 'fixture-src-notice', title: 'Fixture notice', url: 'https://fixture.invalid/notice' }],
		claims: [{ id: 'c1', text: 'A claim with no source link.', sourceIds: [] }],
	});
	assert.equal(unsourced.ok, false);
	const opened = draft();
	assert.equal(opened.indexable, false);
	assert.equal(opened.label, 'contribution draft — not published');
	assert.match(contributionPublication(opened, { commonsReady: true }).reasons.join(' '), /editorial review is missing/);
	const source = fs.readFileSync(path.join(ROOT, 'src/lib/professional-contribution.ts'), 'utf8');
	assert.ok(!/\bfetch\s*\(/.test(source));
	assert.ok(!/process\.env/.test(source));
	assert.equal(fs.existsSync(path.join(ROOT, 'src/pages/contributions')), false);
});

test('validate, dispute, narrow, and supersede keep dissent and history', () => {
	let record = draft();
	const original = record.claims[1].text;
	record = reviewClaim(record, { id: 'd1', at: '2026-09-27T12:01:00.000Z', action: 'dispute', claimId: 'c2', actor: contributor, note: 'The mailing-date reading is contested.' });
	record = reviewClaim(record, { id: 'v1', at: '2026-09-27T12:02:00.000Z', action: 'validate', claimId: 'c2', actor: contributor, note: 'Validated with the dispute still attached.' });
	const disputed = record.claims.find((claim) => claim.id === 'c2');
	assert.equal(disputed.status, 'disputed');
	assert.equal(disputed.dissent.length, 1);
	record = reviewClaim(record, { id: 'n1', at: '2026-09-27T12:03:00.000Z', action: 'narrow', claimId: 'c1', actor: contributor, note: 'Narrowed to work that the notice names.', text: 'The fixture notice is delivered before the named work begins.' });
	const narrowed = record.claims.find((claim) => claim.id === 'c1');
	assert.equal(narrowed.status, 'narrowed');
	assert.ok(narrowed.history.some((entry) => entry.text === 'The fixture notice is delivered before the work begins.'));
	assert.equal(narrowed.dissent.length, 1);
	record = reviewClaim(record, { id: 's1', at: '2026-09-27T12:04:00.000Z', action: 'supersede', claimId: 'c2', actor: contributor, note: 'Superseded by the narrowed notice claim.', supersededBy: 'c1' });
	assert.equal(record.claims.find((claim) => claim.id === 'c2').status, 'superseded');
	assert.ok(record.claims.some((claim) => claim.id === 'c2' && claim.text === original));
	assert.equal(record.events.length, 5);
	record = recordEditorial(record, { at: '2026-09-27T12:05:00.000Z', actor: editor, note: 'Editorial note recorded. This is still not publication.' });
	record = recordLicensedReview(record, { at: '2026-09-27T12:06:00.000Z', actor: reviewer, note: 'Synthetic licensed review, in-test only.' });
	const verdict = contributionPublication(record, { commonsReady: true });
	assert.equal(verdict.eligible, false);
	assert.equal(verdict.indexable, false);
	assert.equal(verdict.sitemapIncluded, false);
	assert.match(verdict.reasons.join(' '), /PUBLIC_COMMONS_READY is false/);
});

test('company responses are labeled, versioned, and contestable, and signals do not rank', () => {
	const record = draft();
	const before = record.claims.map((claim) => claim.text);
	const added = addCompanyResponse({
		id: 'fixture-response-1', companyId: 'fixture-mutual-group', questionId: record.questionId,
		author: company, text: 'Fixture Mutual reads the notice as applying to its own filings.', sourceIds: ['fixture-src-notice'],
		at: '2026-09-27T13:00:00.000Z', independentClaimIds: ['c1', 'c2'], claims: record.claims,
	});
	assert.equal(added.ok, true);
	assert.equal(added.response.label, 'Company response');
	assert.deepEqual(added.claims.map((claim) => claim.text), before);
	const revised = reviseCompanyResponse(added.response, { at: '2026-09-27T13:30:00.000Z', text: 'Fixture Mutual narrows that reading to filings it receives.', sourceIds: ['fixture-src-notice'], actor: company });
	assert.equal(revised.versions.length, 2);
	assert.equal(revised.versions[0].text.includes('own filings'), true);
	const contested = contestCompanyResponse(revised, { at: '2026-09-27T14:00:00.000Z', by: 'Fixture Contributor', note: 'The company reading is narrower than the notice.' });
	assert.equal(contested.contests.length, 1);
	assert.equal(contested.versions.length, 2);
	let signal = visibilitySignal(record.id);
	signal = recordSignal(signal, 'referral');
	signal = recordSignal(signal, 'impression');
	assert.equal(signal.referrals, 1);
	assert.equal(signal.impressions, 1);
	assert.equal(signal.guaranteedRank, null);
	assert.equal(signal.guaranteedCitation, false);
	assert.match(signal.statement, /do not guarantee placement or citation/);
	assert.equal('rank' in signal, false);
});
