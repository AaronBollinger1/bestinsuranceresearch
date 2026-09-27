/**
 * BR-R1: exact gap arithmetic and noindex page generation.
 *
 *   node --experimental-strip-types --test scripts/verify-corpus-pages.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildNationalLibrary } from '../src/lib/national-library.ts';
import { CORPUS_PUBLICATION_OPEN, expandLibrary, generateCorpusPages, presentCorpusPage, proposeIntakeAddition, publishedCorpusPages } from '../src/lib/corpus-pages.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures/national-library', name), 'utf8'));
const base = read('candidates.json');
const expansion = read('expansion.json');
const origin = 'https://birch.insure';

test('the matrix publishes denominators and an expansion reduces those gaps', () => {
	assert.equal(CORPUS_PUBLICATION_OPEN, false);
	const before = buildNationalLibrary(base);
	const expanded = expandLibrary(base, expansion.records);
	assert.equal(expanded.ok, true);
	const after = buildNationalLibrary(expanded.fixture);
	assert.equal(after.matrix.completion.states.denominator, 51);
	assert.equal(after.matrix.completion.regulators.denominator, 51);
	assert.equal(after.matrix.completion.coverageCells.denominator, 51 * 8);
	assert.equal(after.matrix.completion.states.filled, before.matrix.completion.states.filled + 8);
	assert.equal(after.matrix.completion.regulators.filled, before.matrix.completion.regulators.filled + 8);
	assert.equal(after.matrix.completion.coverageCells.filled, before.matrix.completion.coverageCells.filled + 8);
	assert.equal(after.matrix.gapCount, before.matrix.gapCount - 16);
	assert.equal(after.matrix.complete, false);
	assert.match(after.matrix.statement, /Completeness is not claimed/);
	for (const row of Object.values(after.matrix.completion)) {
		assert.equal(row.percent, row.denominator === 0 ? 0 : Math.round((1000 * row.filled) / row.denominator) / 10);
	}
	assert.equal(before.matrix.gapCount, buildNationalLibrary(base).matrix.gapCount);
	const paid = expandLibrary(base, expansion.records, { credential: 'paid-key' });
	assert.equal(paid.ok, false);
	assert.equal(buildNationalLibrary(paid.fixture).matrix.gapCount, before.matrix.gapCount);
});

test('only a reviewed record can carry schema, and intake cannot overwrite history', () => {
	const pages = generateCorpusPages(base, {
		'fixture-state-ca': { editorial: true, licensed: true, rights: 'recorded', corrections: [{ at: '2026-09-27', note: 'Named the fixture state page.' }], withdrawn: false, aliasOf: null },
		'fixture-harbor-fire': { editorial: false, licensed: false, rights: 'unrecorded', corrections: [], withdrawn: true, aliasOf: null },
	}, { origin, commonsReady: true });
	const reviewed = pages.find((page) => page.id === 'fixture-state-ca');
	const draft = pages.find((page) => page.id === 'homeowners');
	const historical = pages.find((page) => page.id === 'fixture-harbor-fire');
	assert.equal(reviewed.draft, false);
	assert.equal(reviewed.indexable, false);
	assert.equal(reviewed.sitemap, false);
	assert.equal(reviewed.robots, 'noindex, nofollow');
	assert.equal(reviewed.schema['@type'], 'WebPage');
	assert.equal(reviewed.canonical, `${origin}/library/state/fixture-state-ca`);
	assert.ok(reviewed.sources[0].url.startsWith('https://'));
	assert.equal(reviewed.corrections.length, 1);
	assert.equal(draft.draft, true);
	assert.equal(draft.schema, null);
	assert.equal(draft.sitemap, false);
	assert.equal(historical.redirectTo, '/library/company/fixture-harbor-exchange');
	assert.equal(historical.sitemap, false);
	assert.equal(historical.draft, true);
	assert.equal(historical.schema, null);
	const kinds = new Set(pages.map((page) => page.kind));
	for (const kind of ['company', 'type', 'coverage', 'state', 'regulator', 'relationship']) assert.equal(kinds.has(kind), true);
	assert.equal(pages.some((page) => page.id === 'fixture-ungated-company'), false);
	const withdrawn = generateCorpusPages(base, {
		'fixture-mutual-group': { editorial: true, licensed: true, rights: 'recorded', corrections: [{ at: '2026-09-27', note: 'Withdrawn after review.' }], withdrawn: true, aliasOf: null },
	}, { origin, commonsReady: true }).find((page) => page.id === 'fixture-mutual-group');
	assert.equal(withdrawn.draft, true);
	assert.equal(withdrawn.schema, null);
	assert.equal(withdrawn.sitemap, false);
	assert.equal(withdrawn.robots, 'noindex, nofollow');
	assert.equal(withdrawn.redirectTo, null);
	const alias = generateCorpusPages(base, {
		'fixture-mutual-group': { editorial: true, licensed: true, rights: 'recorded', corrections: [], withdrawn: false, aliasOf: 'fixture-mutual-pc' },
	}, { origin, commonsReady: true }).find((page) => page.id === 'fixture-mutual-group');
	assert.equal(alias.redirectTo, '/library/company/fixture-mutual-pc');
	assert.equal(alias.sitemap, false);
	assert.equal(alias.canonical, `${origin}/library/company/fixture-mutual-group`);
	const overwrite = proposeIntakeAddition(base, {
		supersedeId: 'fixture-harbor-fire',
		record: base.records.find((record) => record.id === 'fixture-harbor-exchange'),
	}, origin);
	assert.equal(overwrite.ok, false);
	assert.equal(base.records.find((record) => record.id === 'fixture-harbor-fire').supersededBy, 'fixture-harbor-exchange');
	const proposal = proposeIntakeAddition(base, {
		record: {
			id: 'fixture-intake-candidate',
			kind: 'company',
			name: 'Fixture Intake Candidate',
			summary: 'Fixture company proposed by intake. It is not reviewed and it is not a real insurer.',
			effectiveDate: '2026-09-27',
			refreshOwner: 'fixture-library-editor',
			sources: [{ id: 'src-intake', title: 'Fixture intake source', publisher: 'Fixture Library', url: 'https://fixture.invalid/library/intake' }],
			status: 'current',
		},
	}, origin);
	assert.equal(proposal.ok, true);
	assert.equal(proposal.page.draft, true);
	assert.equal(proposal.page.robots, 'noindex, nofollow');
	assert.equal(proposal.page.sitemap, false);
	assert.equal(base.records.some((record) => record.id === 'fixture-intake-candidate'), false);
	const stored = base.records.find((record) => record.id === 'fixture-mutual-group');
	const storedDate = stored.effectiveDate;
	const refresh = proposeIntakeAddition(base, {
		refreshOf: 'fixture-mutual-group',
		record: {
			...stored,
			id: 'fixture-mutual-group-refresh',
			effectiveDate: '2026-09-27',
			summary: 'Later fixture summary for Fixture Mutual Group. The stored record is unchanged and this draft is not reviewed.',
		},
	}, origin);
	assert.equal(refresh.ok, true);
	assert.equal(refresh.page.draft, true);
	assert.equal(refresh.page.sitemap, false);
	assert.equal(refresh.page.robots, 'noindex, nofollow');
	assert.equal(refresh.page.effectiveDate, '2026-09-27');
	assert.equal(stored.effectiveDate, storedDate);
	assert.equal(base.records.some((record) => record.id === 'fixture-mutual-group-refresh'), false);
	const stale = proposeIntakeAddition(base, {
		refreshOf: 'fixture-mutual-group',
		record: { ...stored, id: 'fixture-mutual-group-stale', effectiveDate: storedDate },
	}, origin);
	assert.equal(stale.ok, false);
	assert.equal(stored.effectiveDate, storedDate);
});

test('fixture library routes render drafts, redirects, schema, and stay out of the sitemap', () => {
	const reviews = read('reviews.json');
	const pages = publishedCorpusPages(base, expansion.records, reviews, origin);
	assert.equal(pages.length, 70);
	assert.equal(buildNationalLibrary(expandLibrary(base, expansion.records).fixture).matrix.gapCount, 436);
	const kinds = new Set(pages.map((page) => page.kind));
	for (const kind of ['company', 'type', 'coverage', 'state', 'regulator', 'relationship']) assert.equal(kinds.has(kind), true);
	for (const page of pages) {
		assert.equal(page.robots, 'noindex, nofollow');
		assert.equal(page.sitemap, false);
		assert.equal(page.indexable, false);
		assert.equal(page.canonical, `${origin}${page.path}`);
		assert.equal(page.path, `/library/${page.kind}/${page.id}`);
	}
	const routes = new Set(pages.map((page) => `${page.kind}/${page.id}`));
	assert.equal(routes.size, pages.length);
	const reviewed = pages.find((page) => page.id === 'fixture-state-ca');
	const presented = presentCorpusPage(reviewed);
	assert.equal(presented.jsonLd['@context'], 'https://schema.org');
	assert.equal(presented.jsonLd['@type'], 'WebPage');
	assert.equal(presented.jsonLd.name, reviewed.title);
	assert.equal(presented.jsonLd.dateModified, reviewed.effectiveDate);
	assert.match(presented.html, /data-research-state="fixture-review"/);
	assert.match(presented.html, /https:\/\/fixture\.invalid\/library\/fixture-state-ca/);
	assert.match(presented.html, /datetime="2026-01-01"/);
	assert.match(presented.html, /fixture-library-editor/);
	assert.match(presented.html, /Named the fixture state page\./);
	assert.match(presented.html, /class="cite" href="#source-src-fixture-state-ca"/);
	assert.match(presented.html, /id="source-src-fixture-state-ca"/);
	assert.equal((presented.html.match(/<h1[\s>]/g) || []).length, 1);
	const draft = presentCorpusPage(pages.find((page) => page.id === 'homeowners'));
	assert.equal(draft.jsonLd, null);
	assert.match(draft.html, /data-research-state="draft"/);
	assert.match(draft.html, /Research draft\./);
	const withdrawn = presentCorpusPage(pages.find((page) => page.id === 'fixture-local-county-mutual'));
	assert.equal(withdrawn.jsonLd, null);
	assert.match(withdrawn.html, /data-research-state="withdrawn"/);
	assert.match(withdrawn.html, /Withdrawn\./);
	assert.doesNotMatch(withdrawn.html, /data-redirect=/);
	const historical = presentCorpusPage(pages.find((page) => page.id === 'fixture-harbor-fire'));
	assert.match(historical.html, /data-redirect="\/library\/company\/fixture-harbor-exchange"/);
	assert.match(historical.html, /href="\/library\/company\/fixture-harbor-exchange"/);
	assert.equal(routes.has('company/fixture-harbor-exchange'), true);
	const alias = presentCorpusPage(pages.find((page) => page.id === 'fixture-mutual-group'));
	assert.match(alias.html, /data-redirect="\/library\/company\/fixture-mutual-pc"/);
	const hostile = presentCorpusPage({ ...reviewed, title: '<script>', summary: '"quoted"' });
	assert.match(hostile.html, /&lt;script&gt;/);
	assert.match(hostile.html, /&quot;quoted&quot;/);
	const config = fs.readFileSync(path.join(ROOT, 'astro.config.mjs'), 'utf8');
	assert.match(config, /\\\/library\\\//);
	const route = fs.readFileSync(path.join(ROOT, 'src/pages/library/[kind]/[id].astro'), 'utf8');
	assert.match(route, /publishedCorpusPages/);
	assert.match(route, /presentCorpusPage/);
	assert.match(route, /\bnoindex\b/);
	assert.equal(route.includes('index, follow'), false);
});
