/**
 * BR-D1: fixture national library. The matrix names its gaps and does not
 * call itself complete. No route is mounted.
 *
 *   node --experimental-strip-types --test scripts/verify-national-library.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CANONICAL_LINES } from '../src/lib/lines.ts';
import {
	CORE_COVERAGE_FAMILIES,
	PAGE_TEMPLATES,
	US_JURISDICTIONS,
	buildNationalLibrary,
	isMajorCompany,
	qualityGate,
	pageContract,
	schemaIsAllowed,
} from '../src/lib/national-library.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures/national-library/candidates.json'), 'utf8'));

test('registries, templates, and the state-plus-DC matrix are measurable', () => {
	assert.equal(US_JURISDICTIONS.length, 51);
	assert.ok(US_JURISDICTIONS.includes('DC'));
	assert.deepEqual(Object.keys(PAGE_TEMPLATES).sort(), ['company', 'coverage', 'regulator', 'relationship', 'state', 'type']);
	for (const coverage of CORE_COVERAGE_FAMILIES) assert.ok(CANONICAL_LINES.includes(coverage.id), coverage.id);
	const source = fs.readFileSync(path.join(ROOT, 'src/lib/national-library.ts'), 'utf8');
	assert.ok(!/\bfetch\s*\(/.test(source));
	assert.ok(!/process\.env/.test(source));
	assert.equal(fs.existsSync(path.join(ROOT, 'src/pages/library')), false);

	const library = buildNationalLibrary(fixture);
	assert.equal(library.criterionCurrent, true);
	assert.ok(library.acceptedCount >= 25 && library.acceptedCount <= 100, `accepted ${library.acceptedCount}`);
	assert.equal(library.withinCandidateBand, true);
	assert.ok(library.rejected.some((problem) => problem.id === 'fixture-ungated-company'));
	assert.ok(!library.accepted.some((record) => record.id === 'fixture-ungated-company'));
	assert.equal(library.matrix.jurisdictions, 51);
	assert.equal(library.matrix.includesDc, true);
	assert.equal(library.matrix.complete, false);
	assert.ok(library.matrix.gapCount > 0);
	assert.match(library.matrix.statement, /Completeness is not claimed/);
	assert.match(library.matrix.scope, /District of Columbia/);
	assert.equal(library.matrix.refreshOwner, 'fixture-library-editor');
	assert.ok(library.matrix.gaps.some((gap) => gap.code === 'availability' && gap.jurisdiction === 'AL' && gap.coverage === 'homeowners'));
	assert.ok(!library.matrix.gaps.some((gap) => gap.code === 'availability' && gap.jurisdiction === 'CA' && gap.coverage === 'homeowners'));
	assert.ok(library.matrix.gaps.some((gap) => gap.code === 'regulator' && gap.jurisdiction === 'NY'));
	assert.ok(!library.matrix.gaps.some((gap) => gap.code === 'regulator' && gap.jurisdiction === 'DC'));
});

test('a candidate with a name and no summary is rejected without throwing', () => {
	const malformed = {
		id: 'fixture-missing-summary',
		kind: 'company',
		name: 'Fixture Missing Summary',
		effectiveDate: '2026-01-01',
		refreshOwner: 'fixture-library-editor',
		sources: [{ id: 'src-missing-summary', title: 'Fixture source', publisher: 'Fixture Library', url: 'https://fixture.invalid/library/missing-summary' }],
		status: 'current',
	};
	const problems = qualityGate(malformed, new Set());
	assert.ok(problems.some((problem) => problem.id === 'fixture-missing-summary' && /summary/.test(problem.problem)));
	const library = buildNationalLibrary({ ...fixture, records: [...fixture.records, malformed] });
	assert.ok(library.rejected.some((problem) => problem.id === 'fixture-missing-summary'));
	assert.ok(!library.accepted.some((record) => record.id === 'fixture-missing-summary'));
});

test('major-company scope is the current criterion, and history stays linked', () => {
	const library = buildNationalLibrary(fixture);
	const byId = new Map(library.accepted.map((record) => [record.id, record]));
	assert.equal(isMajorCompany(byId.get('fixture-mutual-group'), fixture.criterion), true);
	assert.equal(isMajorCompany(byId.get('fixture-local-county-mutual'), fixture.criterion), false);
	assert.equal(isMajorCompany(byId.get('fixture-prior-criterion-carrier'), fixture.criterion), false);
	assert.equal(isMajorCompany(byId.get('fixture-harbor-fire'), fixture.criterion), false);
	assert.deepEqual(library.matrix.majorCompanyIds.sort(), ['fixture-harbor-exchange', 'fixture-mutual-group', 'fixture-mutual-pc']);
	assert.ok(library.matrix.historicalCompanyIds.includes('fixture-harbor-fire'));
	assert.ok(library.matrix.historicalCompanyIds.includes('fixture-harbor-fire-oldname'));
	assert.ok(library.relationships.some((record) => record.relation === 'merged-into' && record.from === 'fixture-harbor-fire' && record.to === 'fixture-harbor-exchange'));
	assert.ok(library.relationships.some((record) => record.relation === 'succeeded-by' && record.from === 'fixture-harbor-fire-oldname'));
	assert.ok(library.relationships.some((record) => record.relation === 'parent-of' && record.from === 'fixture-mutual-group'));
	assert.match(fixture.criterion.text, /does not mean the list of such companies is complete/);
	assert.equal(fixture.priorCriterion.supersededBy, fixture.criterion.id);
});

test('publication stays closed while Commons is closed, and citability is visible when opened', () => {
	const library = buildNationalLibrary(fixture);
	const current = library.accepted.find((record) => record.id === 'homeowners');
	const historical = library.accepted.find((record) => record.id === 'fixture-harbor-fire');
	const closed = pageContract(current, { commonsReady: false });
	assert.equal(closed.eligible, false);
	assert.equal(closed.indexable, false);
	assert.equal(closed.sitemapIncluded, false);
	assert.equal(closed.robotsMeta, 'noindex, nofollow');
	assert.equal(closed.schema, null);
	assert.match(closed.reasons.join(' '), /PUBLIC_COMMONS_READY is false/);
	assert.ok(closed.visibleSources.length >= 1);
	assert.equal(closed.visibleSources[0].url.startsWith('https://'), true);

	const open = pageContract(current, { commonsReady: true });
	assert.equal(open.eligible, true);
	assert.equal(open.indexable, true);
	assert.equal(open.sitemapIncluded, true);
	assert.equal(open.schema['@type'], 'WebPage');
	assert.equal(schemaIsAllowed(open.schema), true);
	assert.equal(open.canonicalPath, '/library/coverage/homeowners');

	const superseded = pageContract(historical, { commonsReady: true });
	assert.equal(superseded.eligible, false);
	assert.equal(superseded.indexable, false);
	assert.match(superseded.reasons.join(' '), /superseded/);
	assert.notEqual(process.env.PUBLIC_COMMONS_READY, 'true');
});
