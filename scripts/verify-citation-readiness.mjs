/**
 * BR-D5: local citation-readiness and discovery checks. No preview server.
 *
 *   node --experimental-strip-types --test scripts/verify-citation-readiness.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CITATION_AUDIT_PUBLISHES, auditDiscovery, citationReadiness, rollbackFixture } from '../src/lib/citation-readiness.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://birch.insure';
const PARENT = '321682ad5827ce7d1c957c90d5f48cd6b25192dc';

function page({ path: pagePath, indexable, summary, canonical, robots, schema = 'WebPage', source = true, viewport = true, extra = '' }) {
	return {
		path: pagePath,
		indexable,
		html: `<!doctype html><html lang="en"><head>
<meta name="viewport" content="${viewport ? 'width=device-width, initial-scale=1' : 'width=1200'}">
<meta name="robots" content="${robots}">
<meta name="revised" content="2026-09-27">
<link rel="canonical" href="${canonical}">
<title>Fixture notice</title>
</head><body><main>
<h1 id="fixture-notice">Fixture notice</h1>
<p data-evidence-summary>${summary}</p>
${source ? '<p>Source: <a href="https://fixture.invalid/notice">Fixture notice</a></p>' : ''}
<script type="application/ld+json">{"@type":"${schema}"}</script>
${extra}
</main></body></html>`,
	};
}

function site(pages, extra = {}) {
	return {
		origin: ORIGIN,
		robots: 'User-agent: *\nAllow: /\nSitemap: https://birch.insure/sitemap-index.xml\n',
		sitemap: [`${ORIGIN}/guides/fixture-notice`],
		redirects: [{ from: 'https://www.birch.insure/guides/fixture-notice', to: `${ORIGIN}/guides/fixture-notice`, status: 301 }],
		rollbackTo: PARENT,
		pages,
		...extra,
	};
}

const good = page({
	path: '/guides/fixture-notice',
	indexable: true,
	robots: 'index, follow',
	canonical: `${ORIGIN}/guides/fixture-notice`,
	summary: 'The fixture notice is delivered before the named work begins, and this summary is long enough to cite.',
});
const draft = page({
	path: '/contributions/fixture',
	indexable: false,
	robots: 'noindex, nofollow',
	canonical: `${ORIGIN}/contributions/fixture`,
	summary: 'This contribution draft is not published, and the summary stays on the page for a reviewer.',
});

test('the audit is local, publishes nothing, and does not promise a rank', () => {
	assert.equal(CITATION_AUDIT_PUBLISHES, false);
	const source = fs.readFileSync(path.join(ROOT, 'src/lib/citation-readiness.ts'), 'utf8');
	assert.ok(!/\bfetch\s*\(/.test(source));
	assert.ok(!/process\.env/.test(source));
	const readiness = citationReadiness(good, ORIGIN);
	assert.equal(readiness.ready, true);
	assert.equal(readiness.rank, null);
	assert.match(readiness.statement, /does not guarantee ranking or citation/);
	assert.deepEqual(readiness.checks.map((check) => check.id), [
		'retrievability', 'evidence-clarity', 'freshness', 'canonical-consistency', 'source-visibility',
	]);
});

test('evidence clarity measures the summary element, not a long body', () => {
	const summary = 'The fixture notice is delivered before the named work begins, and this summary is long enough to cite.';
	const positive = page({
		path: '/guides/fixture-notice',
		indexable: true,
		robots: 'index, follow',
		canonical: `${ORIGIN}/guides/fixture-notice`,
		summary,
	});
	const ready = citationReadiness(positive, ORIGIN);
	assert.equal(ready.checks.find((check) => check.id === 'evidence-clarity').ok, true);
	assert.equal(ready.ready, true);
	const negative = {
		...positive,
		html: positive.html.replace(`<p data-evidence-summary>${summary}</p>`, `<p>${summary} This body is longer than forty characters and is still not an evidence summary.</p>`),
	};
	const unread = citationReadiness(negative, ORIGIN);
	assert.equal(unread.checks.find((check) => check.id === 'evidence-clarity').ok, false);
	assert.equal(unread.ready, false);
	const lookalike = {
		...positive,
		html: positive.html.replace(
			`<p data-evidence-summary>${summary}</p>`,
			`<p class="data-evidence-summary">${summary}</p>`,
		),
	};
	const disguised = citationReadiness(lookalike, ORIGIN);
	assert.equal(disguised.checks.find((check) => check.id === 'evidence-clarity').ok, false);
	assert.equal(disguised.ready, false);
});

test('host, redirect, robots, sitemap, schema, accessibility, mobile, and performance pass on the fixture', () => {
	const result = auditDiscovery(site([good, draft]));
	assert.equal(result.ok, true, result.findings.map((finding) => `${finding.code} ${finding.detail}`).join('; '));
	assert.equal(result.rollbackTo, PARENT);
	const closed = auditDiscovery(site([good, draft], { sitemap: [`${ORIGIN}/guides/fixture-notice`, `${ORIGIN}/contributions/fixture`] }));
	assert.equal(closed.ok, false);
	assert.ok(closed.findings.some((finding) => finding.code === 'sitemap'));
	const forbidden = auditDiscovery(site([
		good,
		page({
			path: '/guides/bad-schema',
			indexable: false,
			robots: 'noindex, nofollow',
			canonical: `${ORIGIN}/guides/bad-schema`,
			summary: 'A draft page that carries a forbidden schema type and must fail the local audit.',
			schema: 'FAQPage',
		}),
	]));
	assert.ok(forbidden.findings.some((finding) => finding.code === 'schema' && /FAQPage/.test(finding.detail)));
});

test('a failed fixture page rolls back to the previous HTML and the audit passes again', () => {
	const broken = page({
		path: '/guides/fixture-notice',
		indexable: true,
		robots: 'index, follow',
		canonical: 'https://example.invalid/guides/fixture-notice',
		summary: 'The fixture notice is delivered before the named work begins, and this summary is long enough to cite.',
		source: false,
	});
	const failed = auditDiscovery(site([broken]));
	assert.equal(failed.ok, false);
	assert.ok(failed.findings.some((finding) => finding.code === 'citation'));
	const restored = rollbackFixture(site([broken]), '/guides/fixture-notice', good.html);
	const passed = auditDiscovery(restored);
	assert.equal(passed.ok, true, passed.findings.map((finding) => finding.detail).join('; '));
	assert.equal(passed.rollbackTo, PARENT);
});
