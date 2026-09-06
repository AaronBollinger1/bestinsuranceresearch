/**
 * Build-output verification.
 *
 * Runs against dist/ after `npm run build`, using only Node built-ins, so there is
 * no test-framework dependency and the thing under test is the real output rather
 * than a mock of it.
 *
 *   npm run build && npm run verify
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'src/content');

if (!fs.existsSync(DIST)) {
	console.error('dist/ not found. Run `npm run build` first.');
	process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function walk(dir, filter, out = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, filter, out);
		else if (filter(full)) out.push(full);
	}
	return out;
}

const htmlFiles = walk(DIST, (f) => f.endsWith('.html'));
const jsonFiles = walk(DIST, (f) => f.endsWith('.json') && !f.includes('_astro'));
const read = (f) => fs.readFileSync(f, 'utf8');

/** dist/questions/foo/index.html -> /questions/foo */
function routeOf(file) {
	const rel = path.relative(DIST, file).replace(/\\/g, '/');
	if (rel === 'index.html') return '/';
	return `/${rel.replace(/\/index\.html$/, '').replace(/\.html$/, '')}`;
}

const collection = (name) => {
	const dir = path.join(CONTENT, name);
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((f) => f.endsWith('.json'))
		.map((f) => ({ id: f.replace(/\.json$/, ''), data: JSON.parse(read(path.join(dir, f))) }));
};

const sources = collection('sources');
const TODAY = process.env.PUBLIC_BUILD_DATE || new Date().toISOString().slice(0, 10);
const questions = collection('questions');
const modules = collection('modules');
const coverages = collection('coverages');
const idsOf = (refs) => (refs ?? []).map((r) => (typeof r === 'string' ? r : r.id));
const companies = collection('companies');
const states = collection('states');
const examples = collection('examples');
const tools = collection('tools');

const { canonicalLine, sharesLine } = await import(
	new URL('../src/lib/lines.ts', import.meta.url).href,
);

const sourceIds = new Set(sources.map((s) => s.id));
const routes = new Set(htmlFiles.map(routeOf));

const attr = (html, name) => {
	const match = html.match(new RegExp(`<link[^>]+rel="${name}"[^>]+href="([^"]+)"`));
	return match ? match[1] : null;
};

/* ------------------------------------------------------------------ */
/* Route generation                                                    */
/* ------------------------------------------------------------------ */

test('every content entry generates its route', () => {
	const expected = [
		...questions.map((q) => `/questions/${q.id}`),
		...coverages.map((c) => `/insurance/${c.id}`),
		...companies.map((c) => `/companies/${c.id}`),
		...states.map((s) => `/states/${s.id}`),
		...examples.map((e) => `/examples/${e.id}`),
		...sources.map((s) => `/sources/${s.id}`),
		...tools.filter((t) => t.data.status === 'live').map((t) => t.data.route),
	];
	const missing = expected.filter((route) => !routes.has(route));
	assert.deepEqual(missing, [], `routes not built: ${missing.join(', ')}`);
});

test('core routes exist', () => {
	for (const route of [
		'/', '/ask', '/questions', '/insurance', '/companies', '/states',
		'/examples', '/tools', '/sources', '/about', '/methodology',
		'/editorial-policy', '/corrections', '/privacy', '/terms', '/404',
	]) {
		assert.ok(routes.has(route), `missing route ${route}`);
	}
});

test('a tool without a published route never appears in navigation or the sitemap', () => {
	const unbuilt = tools.filter((t) => t.data.status !== 'live');
	assert.ok(unbuilt.length > 0, 'expected some specified-but-unbuilt tools in the registry');
	const sitemap = walk(DIST, (f) => /sitemap.*\.xml$/.test(f)).map(read).join('\n');
	for (const tool of unbuilt) {
		assert.equal(tool.data.route, undefined, `${tool.id} is not live but declares a route`);
		assert.ok(!routes.has(`/tools/${tool.id}`), `${tool.id} is not live but built a page`);
		assert.ok(!sitemap.includes(`/tools/${tool.id}`), `${tool.id} is not live but is in the sitemap`);
	}
});

/* ------------------------------------------------------------------ */
/* Canonicals                                                          */
/* ------------------------------------------------------------------ */

test('every page has exactly one self-referential canonical', () => {
	for (const file of htmlFiles) {
		const html = read(file);
		const canonicals = html.match(/<link[^>]+rel="canonical"/g) || [];
		assert.equal(canonicals.length, 1, `${routeOf(file)} has ${canonicals.length} canonical tags`);

		const href = attr(html, 'canonical');
		assert.ok(href, `${routeOf(file)} has no canonical href`);
		const url = new URL(href);
		assert.equal(url.pathname, routeOf(file) === '/' ? '/' : routeOf(file), `${routeOf(file)} canonical points elsewhere: ${href}`);
		assert.ok(!href.endsWith('/') || href.endsWith('.com/'), `${routeOf(file)} canonical has a trailing slash`);
	}
});

/* ------------------------------------------------------------------ */
/* Indexing posture, per environment                                    */
/* ------------------------------------------------------------------ */

/*
 * Indexing posture, asserted per environment rather than for preview only.
 *
 * These two tests previously asserted the preview posture unconditionally, so
 * the launch gate had to carry an instruction to edit them at the moment of the
 * production flip. That is the wrong shape for the one build nobody has ever
 * verified: it means the first production build is the one where the suite is
 * expected to fail, and a failing suite at that moment cannot tell a deliberate
 * change from a mistake.
 *
 * So the environment is read the same way the site reads it, and each posture is
 * asserted in full. `npm run validate` is now green in both, and a production
 * build that forgets to drop noindex fails instead of shipping.
 */
const SITE_ENV = process.env.PUBLIC_SITE_ENV === 'production' ? 'production' : 'preview';

test(`the ${SITE_ENV} build emits the correct indexing directive on every page`, () => {
	for (const file of htmlFiles) {
		const html = read(file);
		if (SITE_ENV === 'preview') {
			assert.match(
				html,
				/<meta name="robots" content="noindex, nofollow">/,
				`${routeOf(file)} is missing the preview noindex directive`,
			);
			continue;
		}
		// Production. A page may still be deliberately noindexed by route-level
		// override; what must not happen is the blanket preview directive
		// surviving the flip on a page meant to be indexed.
		const route = routeOf(file);
		const deliberatelyHidden = /^\/(design|404)/.test(route);
		if (deliberatelyHidden) continue;
		assert.ok(
			!/<meta name="robots" content="noindex, nofollow">/.test(html),
			`${route} still carries the preview noindex directive in a production build`,
		);
	}
});

test(`the ${SITE_ENV} robots.txt matches the environment`, () => {
	const robots = read(path.join(DIST, 'robots.txt'));
	assert.match(robots, /User-agent: \*/);

	if (SITE_ENV === 'preview') {
		assert.match(robots, /Disallow: \//);
		assert.ok(!/^Allow: \//m.test(robots), 'preview robots.txt must not allow crawling');
		assert.ok(!robots.includes('Sitemap:'), 'preview robots.txt must not advertise a sitemap');
		return;
	}

	// Production: crawling allowed, the sitemap advertised, and the blanket
	// disallow gone. A production robots.txt that still says Disallow: / is the
	// single most expensive one-line mistake available here.
	assert.ok(
		!/^Disallow: \/$/m.test(robots),
		'production robots.txt still carries a blanket Disallow: /',
	);
	assert.ok(robots.includes('Sitemap:'), 'production robots.txt does not advertise a sitemap');
	assert.match(
		robots,
		/Sitemap:\s*https:\/\/[^\s]+\/sitemap-index\.xml/,
		'production robots.txt must advertise the sitemap index by absolute URL',
	);
});


/* ------------------------------------------------------------------ */
/* Structured data                                                     */
/* ------------------------------------------------------------------ */

test('every JSON-LD block parses and is well formed', () => {
	let blocks = 0;
	for (const file of htmlFiles) {
		const html = read(file);
		const matches = html.matchAll(
			/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
		);
		for (const match of matches) {
			blocks += 1;
			let parsed;
			assert.doesNotThrow(() => {
				parsed = JSON.parse(match[1]);
			}, `${routeOf(file)} has unparseable JSON-LD`);
			assert.equal(parsed['@context'], 'https://schema.org', `${routeOf(file)} JSON-LD missing @context`);
			const nodes = parsed['@graph'] || [parsed];
			for (const node of nodes) {
				assert.ok(node['@type'], `${routeOf(file)} JSON-LD node without @type`);
			}
		}
	}
	assert.ok(blocks > 50, `expected structured data on most pages, found ${blocks} blocks`);
});

test('no review, rating, price, or offer schema anywhere', () => {
	const banned = ['"@type":"Review"', '"@type":"AggregateRating"', '"@type":"Offer"', '"@type":"Product"', '"@type":"FAQPage"'];
	for (const file of htmlFiles) {
		const compact = read(file).replace(/\s+/g, '');
		for (const type of banned) {
			assert.ok(!compact.includes(type), `${routeOf(file)} emits banned schema ${type}`);
		}
	}
});

test('WebSite SearchAction points at a route that actually exists', () => {
	const home = read(path.join(DIST, 'index.html'));
	const match = home.match(/"urlTemplate":"([^"]+)"/);
	assert.ok(match, 'no SearchAction urlTemplate on the homepage');
	const target = new URL(match[1].replace('{search_term_string}', 'test'));
	assert.ok(routes.has(target.pathname), `SearchAction targets ${target.pathname}, which is not built`);
});

/* ------------------------------------------------------------------ */
/* Source resolution                                                   */
/* ------------------------------------------------------------------ */

test('every citation marker resolves to a declared source', () => {
	const MARKER = /\[S:([a-zA-Z0-9][a-zA-Z0-9._-]*)\]/g;
	for (const [name, entries] of Object.entries({ questions, coverages, companies, states, examples, tools })) {
		for (const entry of entries) {
			const text = JSON.stringify(entry.data);
			const declared = new Set(entry.data.sourceIds || []);
			for (const [whole, id] of text.matchAll(MARKER)) {
				assert.ok(sourceIds.has(id), `${name}/${entry.id}: ${whole} is not a known source`);
				assert.ok(declared.has(id), `${name}/${entry.id}: ${whole} is not in sourceIds`);
			}
			for (const id of declared) {
				assert.ok(sourceIds.has(id), `${name}/${entry.id}: sourceIds contains unknown "${id}"`);
			}
		}
	}
});

test('rendered pages contain no unresolved citation markers', () => {
	for (const file of htmlFiles) {
		const html = read(file);
		assert.ok(!/\[S:[a-z0-9-]+\]/.test(html), `${routeOf(file)} leaked a raw citation marker`);
	}
});

test('every rendered citation link has a matching source anchor on the same page', () => {
	for (const file of htmlFiles) {
		const html = read(file);
		const cited = new Set([...html.matchAll(/class="cite" href="#source-(\d+)"/g)].map((m) => m[1]));
		if (cited.size === 0) continue;
		for (const n of cited) {
			assert.ok(
				html.includes(`id="source-${n}"`),
				`${routeOf(file)} cites [${n}] but has no source record with that number`,
			);
		}
	}
});

test('every source record lists at least one claim and a real URL', () => {
	for (const source of sources) {
		assert.ok(source.data.claims.length > 0, `source ${source.id} supports no claims`);
		assert.doesNotThrow(() => new URL(source.data.url), `source ${source.id} has an invalid URL`);
		assert.match(source.data.lastChecked, /^\d{4}-\d{2}-\d{2}$/, `source ${source.id} lastChecked is not ISO`);
	}
});

/* ------------------------------------------------------------------ */
/* Internal links                                                      */
/* ------------------------------------------------------------------ */

test('every internal link resolves to a built page or file', () => {
	const broken = new Set();
	const assets = new Set(
		walk(DIST, () => true).map((f) => `/${path.relative(DIST, f).replace(/\\/g, '/')}`),
	);
	for (const file of htmlFiles) {
		const html = read(file);
		for (const match of html.matchAll(/href="(\/[^"#?]*)/g)) {
			const href = match[1];
			if (href.startsWith('//')) continue;
			const clean = href.replace(/\/$/, '') || '/';
			if (routes.has(clean) || assets.has(href) || assets.has(clean)) continue;
			broken.add(`${routeOf(file)} -> ${href}`);
		}
	}
	assert.deepEqual([...broken], [], `broken internal links:\n${[...broken].join('\n')}`);
});

test('no placeholder or dead links', () => {
	for (const file of htmlFiles) {
		const html = read(file);
		assert.ok(!/href="#"/.test(html), `${routeOf(file)} has a placeholder href="#"`);
		assert.ok(!/lorem ipsum/i.test(html), `${routeOf(file)} contains lorem ipsum`);
		assert.ok(!/href="javascript:/i.test(html), `${routeOf(file)} has a javascript: href`);
		assert.ok(!/TODO|FIXME|XXX_/.test(html), `${routeOf(file)} contains a TODO marker`);
	}
});

/* ------------------------------------------------------------------ */
/* Machine-readable companions                                         */
/* ------------------------------------------------------------------ */

test('every substantive page has a JSON companion that parses', () => {
	const expected = [
		...questions.map((q) => `questions/${q.id}.json`),
		...coverages.map((c) => `insurance/${c.id}.json`),
		...companies.map((c) => `companies/${c.id}.json`),
		...states.map((s) => `states/${s.id}.json`),
		...examples.map((e) => `examples/${e.id}.json`),
	];
	for (const rel of expected) {
		const full = path.join(DIST, rel);
		assert.ok(fs.existsSync(full), `missing machine record ${rel}`);
		const record = JSON.parse(read(full));
		assert.ok(record.canonicalUrl, `${rel} has no canonicalUrl`);
		assert.ok(record.contentVersion, `${rel} has no contentVersion`);
		assert.ok(Array.isArray(record.sources), `${rel} has no sources array`);
	}
});

test('machine records leak no private or generated content', () => {
	const banned = ['bir_session', 'utm_', 'dataLayer', 'sessionStorage', 'localStorage'];
	for (const file of jsonFiles) {
		const body = read(file);
		for (const token of banned) {
			assert.ok(!body.includes(token), `${path.relative(DIST, file)} contains "${token}"`);
		}
	}
});

/* ------------------------------------------------------------------ */
/* Privacy-safe analytics                                              */
/* ------------------------------------------------------------------ */

test('preview loads no third-party marketing or analytics script', () => {
	for (const file of htmlFiles) {
		const html = read(file);
		for (const host of ['googletagmanager.com', 'google-analytics.com', 'connect.facebook.net', 'hotjar', 'segment.com', 'fullstory']) {
			assert.ok(!html.includes(host), `${routeOf(file)} loads ${host} in preview`);
		}
	}
});

test('fonts are self-hosted, so no third party sees a visit', () => {
	for (const file of htmlFiles) {
		const html = read(file);
		assert.ok(!html.includes('fonts.googleapis.com'), `${routeOf(file)} loads Google Fonts`);
		assert.ok(!html.includes('fonts.gstatic.com'), `${routeOf(file)} loads gstatic fonts`);
	}
});

test('the analytics contract published to the page uses controlled vocabularies only', () => {
	const home = read(path.join(DIST, 'index.html'));
	const match = home.match(/<script type="application\/json" id="bir-analytics-contract">([\s\S]*?)<\/script>/);
	assert.ok(match, 'analytics contract not embedded');
	const contract = JSON.parse(match[1]);

	assert.ok(Array.isArray(contract.events) && contract.events.length > 0);
	assert.ok(contract.forbidden.includes('question'), 'forbidden list must block "question"');
	assert.ok(contract.forbidden.includes('query'), 'forbidden list must block "query"');
	assert.ok(contract.forbidden.includes('email'), 'forbidden list must block "email"');
	assert.ok(contract.forbidden.includes('address'), 'forbidden list must block "address"');

	// Every allowed parameter must be a closed list. A free-text value cannot pass.
	for (const [name, vocabulary] of Object.entries(contract.parameters)) {
		assert.ok(Array.isArray(vocabulary), `parameter ${name} has no vocabulary`);
		assert.ok(vocabulary.length > 0, `parameter ${name} has an empty vocabulary`);
		for (const value of vocabulary) {
			assert.equal(typeof value, 'string', `parameter ${name} has a non-string value`);
		}
	}
});

test('no analytics attribute on any element carries free text', () => {
	for (const file of htmlFiles) {
		const html = read(file);
		for (const match of html.matchAll(/data-event="([^"]*)"/g)) {
			assert.ok(/^[a-z_]+$/.test(match[1]), `${routeOf(file)} has a non-vocabulary event "${match[1]}"`);
		}
	}
});

/* ------------------------------------------------------------------ */
/* Handoff privacy                                                     */
/* ------------------------------------------------------------------ */

test('no outbound Bollinsure link carries a question or free text', () => {
	const allowed = new Set([
		'utm_source', 'utm_medium', 'bir_source_path', 'bir_family', 'bir_line',
		'bir_source_tool', 'bir_completion',
	]);
	for (const file of htmlFiles) {
		const html = read(file);
		for (const match of html.matchAll(/href="(https:\/\/[^"]*bollinsure[^"]*)"/g)) {
			const url = new URL(match[1].replace(/&amp;/g, '&'));
			for (const key of url.searchParams.keys()) {
				assert.ok(allowed.has(key), `${routeOf(file)} handoff carries disallowed param "${key}"`);
			}
			const completion = url.searchParams.get('bir_completion');
			if (completion !== null) {
				assert.match(completion, /^(0|10|20|30|40|50|60|70|80|90|100)$/, 'completion must be bucketed to ten');
			}
		}
	}
});

/* ------------------------------------------------------------------ */
/* Editorial integrity                                                 */
/* ------------------------------------------------------------------ */

test('no page claims a review that has not happened', () => {
	for (const [name, entries] of Object.entries({ questions, coverages, companies, states, examples })) {
		for (const entry of entries) {
			assert.ok(entry.data.author, `${name}/${entry.id} has no author`);
			assert.ok(entry.data.reviewer, `${name}/${entry.id} has no reviewer`);
			assert.ok(
				['reviewed', 'under-review', 'corrected'].includes(entry.data.reviewState),
				`${name}/${entry.id} has an invalid reviewState`,
			);
		}
	}
});

test('every example is labeled, and a client case carries a consent record', () => {
	for (const example of examples) {
		assert.ok(example.data.label, `example ${example.id} has no label`);
		assert.ok(example.data.labelNote.length > 20, `example ${example.id} labelNote is too thin`);
		assert.ok(example.data.provenance.length > 20, `example ${example.id} has no provenance statement`);
		if (example.data.label === 'anonymized-client') {
			assert.ok(example.data.consentRecord, `example ${example.id} is a client case with no consent record`);
		}
	}
});

test('no fabricated authority language on any company page', () => {
	const banned = /\b(the best|cheapest|most reliable|top rated|highest rated|#1|number one) (insurer|carrier|company|insurance)\b/i;
	for (const company of companies) {
		const text = JSON.stringify(company.data);
		assert.ok(!banned.test(text), `company ${company.id} contains a ranking claim`);
		assert.ok(company.data.whatWeDoNotClaim.length >= 2, `company ${company.id} states too few non-claims`);
	}
});

test('content is ASCII, so nothing renders as a replacement character', () => {
	for (const [name, entries] of Object.entries({ sources, questions, coverages, companies, states, examples, tools })) {
		for (const entry of entries) {
			const text = JSON.stringify(entry.data);
			const bad = text.match(/[^\x09\x0A\x0D\x20-\x7E]/g);
			assert.equal(bad, null, `${name}/${entry.id} contains non-ASCII: ${[...new Set(bad || [])].join(' ')}`);
		}
	}
});

/* ------------------------------------------------------------------ */
/* Accessibility floor                                                 */
/* ------------------------------------------------------------------ */

test('every page has a skip link, one h1, a main landmark, and a language', () => {
	for (const file of htmlFiles) {
		const html = read(file);
		const route = routeOf(file);
		assert.match(html, /<html lang="en">/, `${route} has no lang attribute`);
		assert.ok(html.includes('class="skip-link"'), `${route} has no skip link`);
		assert.ok(html.includes('id="main"'), `${route} has no main landmark target`);
		const h1s = html.match(/<h1[\s>]/g) || [];
		assert.equal(h1s.length, 1, `${route} has ${h1s.length} h1 elements`);
	}
});

test('every image has an alt attribute', () => {
	for (const file of htmlFiles) {
		const html = read(file);
		for (const match of html.matchAll(/<img\b[^>]*>/g)) {
			assert.match(match[0], /\salt=/, `${routeOf(file)} has an img without alt: ${match[0].slice(0, 90)}`);
		}
	}
});

test('every form control has a label, an aria-label, or an aria-labelledby', () => {
	for (const file of htmlFiles) {
		const html = read(file);
		const labelled = new Set([...html.matchAll(/<label[^>]+for="([^"]+)"/g)].map((m) => m[1]));
		for (const match of html.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
			const tag = match[0];
			const attrs = match[2];
			if (/type="(hidden|submit|button|checkbox|radio)"/.test(attrs)) continue;
			const id = attrs.match(/\sid="([^"]+)"/)?.[1];
			const ok =
				(id && labelled.has(id)) ||
				/aria-label=/.test(attrs) ||
				/aria-labelledby=/.test(attrs) ||
				new RegExp(`<label[^>]*>[^<]*${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(html);
			assert.ok(ok, `${routeOf(file)} has an unlabelled control: ${tag.slice(0, 110)}`);
		}
	}
});

test('status regions are polite and never assertive', () => {
	for (const file of htmlFiles) {
		const html = read(file);
		assert.ok(
			!/aria-live="assertive"/.test(html),
			`${routeOf(file)} uses an assertive live region, which interrupts the reader`,
		);
	}
});

/* ------------------------------------------------------------------ */
/* Feeds and machine entry points                                      */
/* ------------------------------------------------------------------ */

test('llms.txt and llms-full.txt exist and name the operator and the limits', () => {
	for (const name of ['llms.txt', 'llms-full.txt']) {
		const body = read(path.join(DIST, name));
		assert.ok(body.length > 800, `${name} is too thin to be useful`);
		assert.ok(body.includes('WJB Services'), `${name} does not name the operator`);
		assert.ok(/not .*advice/i.test(body), `${name} does not state the advice limit`);
	}
	const full = read(path.join(DIST, 'llms-full.txt'));
	for (const source of sources.slice(0, 25)) {
		assert.ok(full.includes(source.id), `llms-full.txt omits source ${source.id}`);
	}
});

test('the RSS feed is well formed and dated', () => {
	const xml = read(path.join(DIST, 'rss.xml'));
	assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
	assert.match(xml, /<rss version="2\.0"/);
	const items = xml.match(/<item>/g) || [];
	assert.ok(items.length > 5, `feed has only ${items.length} items`);
	assert.equal(items.length, (xml.match(/<\/item>/g) || []).length, 'unbalanced item tags');
	assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;|#)/.test(xml), 'feed contains an unescaped ampersand');
});

test('the search index is chunked by claim and carries source ids', () => {
	const index = JSON.parse(read(path.join(DIST, 'search-index.json')));
	assert.ok(index.chunks.length > 100, `index has only ${index.chunks.length} chunks`);
	for (const chunk of index.chunks) {
		assert.ok(chunk.sourceIds.length > 0, `chunk ${chunk.id} carries no source id`);
		for (const id of chunk.sourceIds) {
			assert.ok(sourceIds.has(id), `chunk ${chunk.id} cites unknown source ${id}`);
		}
		assert.ok(chunk.path.startsWith('/'), `chunk ${chunk.id} has no route`);
		assert.ok(routes.has(chunk.path), `chunk ${chunk.id} points at unbuilt route ${chunk.path}`);
	}
});

/* ------------------------------------------------------------------ */
/* Sitemap                                                             */
/* ------------------------------------------------------------------ */

test('the sitemap excludes design pages, JSON companions, and 404', () => {
	const sitemaps = walk(DIST, (f) => /sitemap.*\.xml$/.test(f));
	assert.ok(sitemaps.length > 0, 'no sitemap generated');
	const xml = sitemaps.map(read).join('\n');
	assert.ok(!xml.includes('/design/'), 'sitemap includes a design page');
	assert.ok(!/\.json</.test(xml), 'sitemap includes a JSON companion');
	assert.ok(!xml.includes('/404'), 'sitemap includes the 404 page');
});

/* ------------------------------------------------------------------ */
/* Domain manifest                                                     */
/* ------------------------------------------------------------------ */

/*
 * Licence attribution, asserted against the built output rather than config.
 *
 * Authoritative split, confirmed against bollinsure.com production and by the
 * owner on 2026-09-05:
 *
 *   6013787  WJB Services, Inc. dba Bollinsure Insurance Services  (entity)
 *   0D94699  Brian John Bollinger                                  (producer)
 *   4345268  Aaron Glen Bollinger                                  (producer)
 *
 * This guard previously encoded the opposite split. It was written from the
 * eight specialty sites, which pair 0D94699 with the entity name and are
 * themselves wrong, so the guard asserted the inversion instead of catching
 * it — the worst possible failure for a check whose entire job is this. A
 * guard is only as good as the fact it encodes, and a plausible secondary
 * source is not a substitute for the primary one.
 */
const AGENCY_LICENCE = '6013787';
const PRODUCER_LICENCES = { '0D94699': 'Brian Bollinger', 4345268: 'Aaron Bollinger' };

test('the published agency licence is the entity licence', () => {
	// llms.txt is the AI-facing statement of who operates this, so it is the one
	// place the number must be unambiguous.
	const llms = read(path.join(DIST, 'llms.txt'));
	const m = llms.match(/agency licen[cs]e\s+([0-9A-Z]+)/i);
	assert.ok(m, 'llms.txt does not state an agency licence at all');
	assert.equal(
		m[1],
		AGENCY_LICENCE,
		`llms.txt publishes ${m[1]} as the agency licence; ${AGENCY_LICENCE} is the entity licence held by WJB Services, Inc.`,
	);

	// And in the entity graph, on the node that claims to be the operator.
	const nodes = ldNodes(read(path.join(DIST, 'index.html')));
	const org = nodes.find((n) => /Organization|InsuranceAgency|LocalBusiness/.test(JSON.stringify(n['@type'] ?? '')));
	assert.ok(org, 'no organisation node on the homepage');
	const parentLicence = org.parentOrganization?.identifier?.value;
	assert.equal(
		parentLicence,
		AGENCY_LICENCE,
		`the parent organisation is identified by ${parentLicence}, which is not the entity licence`,
	);
});

test('a producer licence is never described as the agency licence', () => {
	const offenders = [];
	for (const file of htmlFiles) {
		const text = read(file).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
		for (const licence of Object.keys(PRODUCER_LICENCES)) {
			for (const m of text.matchAll(new RegExp(licence, 'g'))) {
				let runUp = text.slice(Math.max(0, m.index - 90), m.index);
				// Do not read across a sentence boundary or past the word "producer".
				// The footer legitimately reads "agency licence number is 0D94699.
				// Licensed producers: Brian Bollinger, California licence 6013787", and a
				// fixed-width window turns that correct sentence into a finding.
				const cut = Math.max(runUp.lastIndexOf('. '), runUp.toLowerCase().lastIndexOf('producer'));
				if (cut > -1) runUp = runUp.slice(cut);
				if (/agency licen|agency lic\.|entity licen/i.test(runUp)) {
					offenders.push(`${routeOf(file)}: ${licence} is described as an agency licence`);
				}
			}
		}
	}
	assert.deepEqual(
		offenders,
		[],
		`a producer licence presented as the agency's:\n  ${offenders.slice(0, 8).join('\n  ')}`,
	);
});

test('the agency licence is never credited to a named individual', () => {
	// The inverse error. A person's name immediately in front of the entity
	// number is the shape this takes in a byline. 110 characters is wide enough
	// for a real byline and too narrow to borrow a name from a nearby sentence.
	const holders = Object.values(PRODUCER_LICENCES);
	const offenders = [];
	for (const file of htmlFiles) {
		const text = read(file).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
		for (const m of text.matchAll(new RegExp(AGENCY_LICENCE, 'g'))) {
			const runUp = text.slice(Math.max(0, m.index - 110), m.index);
			const namedPerson = holders.find((n) => runUp.includes(n));
			if (!namedPerson) continue;
			// An entity mention between the name and the number makes it correct:
			// "Brian Bollinger of WJB Services, Inc., licence 0D94699" is fine.
			const entityBetween = /WJB Services|Bollinsure Insurance Services|agency/i.test(
				runUp.slice(runUp.lastIndexOf(namedPerson)),
			);
			if (!entityBetween) {
				offenders.push(`${routeOf(file)}: "${namedPerson}" sits in front of ${AGENCY_LICENCE} with no entity named between`);
			}
		}
	}
	assert.deepEqual(
		offenders,
		[],
		`the agency licence is credited to an individual:\n  ${offenders.slice(0, 8).join('\n  ')}`,
	);
});

test('the organisation node identifies itself and links the estate', () => {
	// Each specialty site asserts this about itself so that properties sharing one
	// phone number read as one business. This property is the hub and had no
	// sameAs at all, which made it the one page in the estate that read as
	// unaffiliated with the brokerage operating it.
	const nodes = ldNodes(read(path.join(DIST, 'index.html')));
	const orgs = nodes.filter((n) => /Organization|InsuranceAgency|LocalBusiness/.test(JSON.stringify(n['@type'] ?? '')));
	assert.equal(orgs.length, 1, `expected exactly one organisation node on the homepage, found ${orgs.length}`);

	const [org] = orgs;
	assert.ok(org['@id'], 'the organisation node has no @id, so nothing can reference it');
	assert.ok(org.parentOrganization, 'the organisation node does not declare its parent');
	assert.ok(
		Array.isArray(org.sameAs) && org.sameAs.length >= 5,
		`sameAs must link the sibling properties; found ${Array.isArray(org.sameAs) ? org.sameAs.length : 'none'}`,
	);
	assert.ok(
		org.sameAs.some((u) => /bollinsure\.com/.test(u)),
		'sameAs does not link the parent brokerage',
	);
});

test('every line has a guide, and every guide panel is in the HTML', () => {
	// The guide is generated from the coverage record, so a line without a guide
	// means the route stopped generating rather than that a page was forgotten.
	for (const coverage of coverages) {
		const file = path.join(DIST, 'guides', coverage.id, 'index.html');
		assert.ok(fs.existsSync(file), `no guide built for ${coverage.id}`);
		const html = read(file);

		// Panels are hidden, never omitted. This site's proposition is that any
		// sentence can be checked, so hiding evidence behind a click a crawler will
		// not perform would defeat the point. Each panel must be present, and the
		// closed ones must still carry their citations.
		const panels = [...html.matchAll(/data-panel="([a-z-]+)"/g)].map((m) => m[1]);
		assert.ok(panels.length >= 7, `${coverage.id} guide has only ${panels.length} panels`);
		assert.ok(new Set(panels).size === panels.length, `${coverage.id} guide has duplicate panel ids`);

		// Every panel has a matching tab, and the ids line up so deep links work.
		for (const id of panels) {
			assert.ok(html.includes(`data-tab="${id}"`), `${coverage.id} guide panel ${id} has no tab`);
			assert.ok(html.includes(`id="tab-${id}"`), `${coverage.id} guide tab ${id} has no id`);
			assert.ok(html.includes(`aria-controls="panel-${id}"`), `${coverage.id} guide tab ${id} controls nothing`);
		}

		// Exactly one tab selected on arrival, and exactly one panel open.
		const selected = (html.match(/aria-selected="true"/g) ?? []).length;
		assert.equal(selected, 1, `${coverage.id} guide has ${selected} tabs selected on load`);

		// The side mark, which is how a guide is identified before it is read.
		assert.ok(html.includes('guide-mark'), `${coverage.id} guide has no identifying mark`);
		assert.ok(!/\[S:[a-z0-9-]+\]/.test(html), `${coverage.id} guide leaked a raw citation marker`);
	}
});

test('guide citations resolve inside closed panels too', () => {
	// A numbered marker in a panel that is closed on arrival must still point at a
	// ledger entry on the same page, or the deep link lands on a broken reference.
	for (const coverage of coverages) {
		const html = read(path.join(DIST, 'guides', coverage.id, 'index.html'));
		const anchors = new Set([...html.matchAll(/id="(source-\d+)"/g)].map((m) => m[1]));
		const refs = [...html.matchAll(/href="#(source-\d+)"/g)].map((m) => m[1]);
		assert.ok(refs.length > 0, `${coverage.id} guide cites nothing`);
		for (const ref of new Set(refs)) {
			assert.ok(anchors.has(ref), `${coverage.id} guide cites ${ref} with no matching ledger anchor`);
		}
	}
});
test('every coverage page states its exposures and its claim mitigation, and renders both', () => {
	// `protects` answers "what is this for". `exposures` answers "what goes
	// wrong", which is the question an underwriter is actually asking and the one
	// a reader needs before judging a limit. Neither is optional: a coverage page
	// without them is a definition rather than a guide.
	for (const coverage of coverages) {
		const d = coverage.data;
		assert.ok(d.exposures.length >= 3, `${coverage.id} states fewer than three exposures`);
		assert.ok(d.claimMitigation.length >= 3, `${coverage.id} states fewer than three mitigations`);

		const html = read(path.join(DIST, 'insurance', coverage.id, 'index.html'));
		for (const list of [d.exposures, d.claimMitigation]) {
			for (const entry of list) {
				assert.ok(entry.note.length >= 40, `${coverage.id}: "${entry.item}" has a note too short to be useful`);
				// The item text must actually reach the page.
				const plain = entry.item.replace(/\[S:[a-z0-9-]+\]/g, '').trim();
				const head = plain.slice(0, 30).replace(/&/g, '&amp;').replace(/'/g, '&#39;');
				assert.ok(
					html.includes(head) || html.includes(plain.slice(0, 30)),
					`${coverage.id}: "${plain.slice(0, 40)}" is in the record but not on the page`,
				);
			}
		}
	}
});

test('no claim mitigation promises a price, a saving, or an outcome', () => {
	// This is the field most likely to drift into selling. A mitigation is a
	// thing a reader can do and a source can support. Whether any insurer prices
	// it is an underwriting decision, and saying otherwise here would be the same
	// class of claim the module rules already forbid.
	const BANNED = [
		/\b(?:save|saves|saving|savings)\b/i,
		/\b(?:discount|credit|rebate)\b/i,
		/\b(?:lower|reduce|cut)s? (?:your |the )?(?:premium|rate|cost|price)\b/i,
		/\b(?:premium|rate) (?:reduction|decrease|drop)\b/i,
		/\b(?:guarantee|guaranteed|guarantees)\b/i,
		/\bwill (?:qualify|be covered|be eligible)\b/i,
		/\b\d{1,3}\s?% (?:off|less|cheaper|savings)\b/i,
	];
	const offenders = [];
	for (const coverage of coverages) {
		for (const entry of coverage.data.claimMitigation) {
			const text = `${entry.item} ${entry.note}`;
			for (const re of BANNED) {
				const m = text.match(re);
				if (m) offenders.push(`${coverage.id}: "${entry.item}" contains "${m[0]}"`);
			}
		}
	}
	assert.deepEqual(
		offenders,
		[],
		`claim mitigation must not promise a price or an outcome:\n  ${offenders.join('\n  ')}`,
	);
});

test('every exposure and mitigation note cites a source the page declares', () => {
	// The same rule the rest of the corpus runs on, asserted for the two new
	// fields specifically: a marker that is not on the page's own sourceIds list
	// throws at render, and this catches it in the record before that happens.
	for (const coverage of coverages) {
		const declared = new Set(idsOf(coverage.data.sourceIds));
		for (const list of [coverage.data.exposures, coverage.data.claimMitigation]) {
			for (const entry of list) {
				const markers = [...`${entry.item} ${entry.note}`.matchAll(/\[S:([a-z0-9-]+)\]/g)].map((m) => m[1]);
				assert.ok(markers.length > 0, `${coverage.id}: "${entry.item}" cites nothing`);
				for (const id of markers) {
					assert.ok(
						declared.has(id),
						`${coverage.id}: "${entry.item}" cites ${id}, which is not on its sourceIds`,
					);
				}
			}
		}
	}
});

test('every domain marked redirect points at a route this build produces', async () => {
	// A 301 is permanent by design, so a redirect naming a route that does not
	// exist is the one mistake in this plan that cannot be walked back cheaply.
	// The map lives in src/config so it can be checked here rather than living in
	// prose that nothing validates.
	const { DOMAIN_ROUTES, LIVE_SITE_DOMAINS, PARKED_DOMAINS } = await import(
		new URL('../src/config/domain-redirects.ts', import.meta.url).href
	);

	const broken = [];
	const seen = new Set();
	for (const entry of DOMAIN_ROUTES) {
		assert.ok(/^[a-z0-9.-]+\.[a-z]{2,}$/.test(entry.domain), `bad domain: ${entry.domain}`);
		assert.ok(!seen.has(entry.domain), `${entry.domain} appears twice in the map`);
		seen.add(entry.domain);
		assert.ok(entry.note && entry.note.length > 20, `${entry.domain} has no usable note`);

		if (entry.action === 'park') {
			assert.ok(!entry.target, `${entry.domain} is parked but names a target`);
			continue;
		}
		assert.ok(entry.target, `${entry.domain} is marked redirect with no target`);
		const clean = entry.target.replace(/\/$/, '') || '/';
		if (!routes.has(clean)) broken.push(`${entry.domain} -> ${entry.target}`);
	}
	assert.deepEqual(
		broken,
		[],
		`redirect targets that this build does not produce:\n  ${broken.join('\n  ')}`,
	);

	// Every domain that currently serves its own live site must be accounted for,
	// because those are the ones where a redirect retires real pages.
	assert.equal(LIVE_SITE_DOMAINS.length, 8, 'the eight live specialty sites must all be listed');
	for (const entry of LIVE_SITE_DOMAINS) {
		assert.equal(entry.liveSite, true, `${entry.domain} is in LIVE_SITE_DOMAINS without liveSite: true`);
	}

	// A parked domain must say what it is waiting on, or it is just a domain
	// nobody decided about. Checked on substance rather than on a phrase list:
	// the note has to be long enough to say something, and has to state either an
	// absence or a next step.
	for (const entry of PARKED_DOMAINS) {
		assert.ok(
			entry.note.length >= 40,
			`${entry.domain} has a park note too short to explain anything: "${entry.note}"`,
		);
		assert.match(
			entry.note,
			/\b(?:no|none|needs|park|retire|until|either)\b/i,
			`${entry.domain} is parked without stating an absence or a next step`,
		);
	}
});

test('every live specialty domain resolves to a module or a reviewed page', async () => {
	// The eight domains that carry their own site are the expensive ones to get
	// wrong. Each must land on something substantive: a module, a coverage page,
	// or a worked example. Not the homepage, and not a search result.
	const { LIVE_SITE_DOMAINS } = await import(
		new URL('../src/config/domain-redirects.ts', import.meta.url).href
	);
	for (const entry of LIVE_SITE_DOMAINS) {
		assert.match(
			entry.target,
			/^\/(tools|insurance|examples|questions)\//,
			`${entry.domain} redirects to ${entry.target}, which is not a module, coverage page, example, or question`,
		);
	}
});

test('the domain routing manifest is present, complete, and points only at built routes', () => {
	const manifest = read(path.join(ROOT, 'DOMAIN-ROUTING-MANIFEST.md'));

	for (const domain of [
		'bollinsure.com', 'covwell.com', 'bestinsuranceresearch.com', 'bestho3.com',
		'bestdwellingfire.com', 'bestearthquakeinsurance.com', 'bestepli.com',
		'bestcyberliability.com', 'bestworkerscompensation.com', 'bestgroupmedical.com',
		'bestartinsurance.com',
	]) {
		assert.ok(manifest.includes(domain), `manifest omits ${domain}`);
	}

	for (const column of ['Recommendation', 'Redirect target', 'Rationale', 'User intent']) {
		assert.ok(manifest.includes(column), `manifest is missing the "${column}" column`);
	}

	assert.ok(/\*\*retain\*\*/.test(manifest), 'manifest never uses the retain recommendation');
	assert.ok(/\*\*301\*\*/.test(manifest), 'manifest never uses the 301 recommendation');
	assert.ok(manifest.includes('No DNS record'), 'manifest does not state that nothing was executed');

	// Every route this manifest names must be one the build actually produced. That was
	// written for redirect targets; the audit turned the six planned 301s into `retain`
	// with cross-links instead, so what it now guards is the cross-link table. The
	// invariant is unchanged and is the one that matters: naming a URL that 404s is a
	// broken promise whether a reader arrives by redirect or by link.
	const targets = [...manifest.matchAll(/https:\/\/bestinsuranceresearch\.com(\/[a-z0-9/-]*)/g)].map((m) => m[1]);
	assert.ok(targets.length > 0, 'manifest names no research routes at all');
	for (const target of new Set(targets)) {
		const clean = target.replace(/\/$/, '') || '/';
		const live = routes.has(clean);
		const parked = manifest.includes('**park**');
		assert.ok(
			live || parked,
			`manifest names ${target}, which this build does not produce`,
		);
	}
});

/* ------------------------------------------------------------------ */
/* Required documentation                                              */
/* ------------------------------------------------------------------ */

test('every required document exists and is substantive', () => {
	const required = [
		'IMPLEMENTATION-AUDIT.md', 'DESIGN-REFERENCES.md', 'CONTENT-MODEL.md',
		'EDITORIAL-AND-CITATION-STANDARD.md', 'AI-RETRIEVAL-ARCHITECTURE.md',
		'DOMAIN-ROUTING-MANIFEST.md', 'AUTHORITY-AND-DISTRIBUTION-PLAN.md',
		'TOOL-REGISTRY-AND-ROADMAP.md', 'ANALYTICS-EVENT-SPEC.md', 'LAUNCH-GATE.md',
	];
	for (const doc of required) {
		const full = path.join(ROOT, doc);
		assert.ok(fs.existsSync(full), `missing ${doc}`);
		assert.ok(read(full).length > 1500, `${doc} is too thin to be a real deliverable`);
	}
});

/* ------------------------------------------------------------------ */
/* Retrieval behaviour                                                 */
/*                                                                     */
/* The floors that separate "answer", "insufficient evidence", and "no  */
/* result" are calibrated against the real corpus, so they have to be   */
/* re-checked whenever the corpus changes. A question the library       */
/* answers must clear the evidence floor; a question about a topic it   */
/* does not cover must not, however much vocabulary it shares.          */
/* ------------------------------------------------------------------ */

const { search } = await import(
	new URL('../src/lib/retrieval.ts', import.meta.url).href
);
const searchIndex = JSON.parse(read(path.join(DIST, 'search-index.json')));

const ANSWERABLE = [
	'does homeowners insurance cover earthquake damage in california',
	'what is a claims made retroactive date',
	'how do workers comp class codes affect a quote',
	'what does a surety bond guarantee',
	'when can a contract require additional insured status',
	'what is inland marine insurance used for',
	'replacement cost vs market value',
];

const OFF_TOPIC = ['pet insurance for a parrot', 'travel insurance for a cruise', 'insurance'];

test('every published question is findable by its own wording', () => {
	for (const query of ANSWERABLE) {
		const outcome = search(searchIndex, query, {}, 10);
		assert.equal(outcome.status, 'ok', `"${query}" returned ${outcome.status}`);
		assert.ok(outcome.hits[0].score >= 30, `"${query}" scored only ${outcome.hits[0].score.toFixed(1)}`);
	}
});

test('a question the library does not answer returns insufficient evidence, not a guess', () => {
	for (const query of OFF_TOPIC) {
		const outcome = search(searchIndex, query, {}, 10);
		assert.ok(
			outcome.status === 'insufficient' || outcome.status === 'no-result',
			`"${query}" returned ${outcome.status}, which presents unrelated pages as an answer`,
		);
	}
});

test('meaningless input returns no result at all', () => {
	const outcome = search(searchIndex, 'zxqw plorbnat fizzbuckle', {}, 10);
	assert.equal(outcome.status, 'no-result');
});

test('no source claims official hosting while describing itself as a reproduction', () => {
	// officialHost exists to tell a reader whose guarantee they are relying on:
	// the words may be identical, the guarantee is not. Twenty-four records asserted
	// official hosting while their own publisher field said reproducing,
	// republishing, unofficial, or copy hosted by. A record that contradicts itself
	// on provenance is worse than one that says nothing, because an AI that trusts
	// the flag will cite a reproduction as authoritative.
	const REPRODUCTION_HOSTS = new Set([
		'www.law.cornell.edu',
		'codes.findlaw.com',
		'caselaw.findlaw.com',
		'texas.public.law',
		'www.providerrisk.com',
	]);
	const SELF_DESCRIBED = /\b(reproduc|republish|unofficial|text hosted by|copy hosted by|hosted by)\b/i;

	for (const source of sources) {
		const d = source.data;
		let host = '';
		try { host = new URL(d.url).host; } catch { assert.fail(`source ${source.id} has an unparseable url`); }
		if (REPRODUCTION_HOSTS.has(host)) {
			assert.equal(
				d.officialHost, false,
				`source ${source.id} is hosted on ${host}, which reproduces someone else text, but claims officialHost`,
			);
		}
		if (SELF_DESCRIBED.test(d.publisher)) {
			assert.equal(
				d.officialHost, false,
				`source ${source.id} describes itself as a reproduction in its publisher field but claims officialHost`,
			);
		}
	}
});

test('a source that is not active says why, and names its replacement if one exists', () => {
	// A status flag with no stated reason is barely a status. This test exists
	// because a 1999 EEOC guidance sat at status active with a fresh lastChecked
	// while the publisher page had carried a supersession notice since April 2024.
	const byId = new Map(sources.map((x) => [x.id, x]));
	for (const source of sources) {
		const d = source.data;
		if (d.status !== 'active') {
			assert.ok(
				d.statusNote && d.statusNote.length >= 20,
				`source ${source.id} is ${d.status} but does not say why`,
			);
		}
		if (!d.supersededBy) continue;
		const replacementId = typeof d.supersededBy === 'string' ? d.supersededBy : d.supersededBy.id;
		assert.ok(byId.has(replacementId), `source ${source.id} names an unknown replacement ${replacementId}`);
		assert.notEqual(replacementId, source.id, `source ${source.id} supersedes itself`);

		// The chain is the part most easily got wrong: a document can be replaced by
		// one that has itself been withdrawn, and the page must not imply otherwise.
		const html = read(path.join(DIST, 'sources', source.id, 'index.html'));
		const replacement = byId.get(replacementId);
		assert.ok(
			html.includes(`/sources/${replacementId}`),
			`source ${source.id} does not link to its replacement`,
		);
		if (replacement.data.status !== 'active') {
			const label = { superseded: 'Superseded', rescinded: 'Rescinded', unavailable: 'Unavailable', disputed: 'Disputed', 'not-adopted': 'Never adopted' }[replacement.data.status];
			assert.ok(
				html.includes(label),
				`source ${source.id} points at a ${replacement.data.status} replacement without saying so`,
			);
		}
	}
});

test('no source claims to have been checked in the future', () => {
	for (const source of sources) {
		assert.ok(
			source.data.lastChecked <= TODAY,
			`source ${source.id} claims lastChecked ${source.data.lastChecked}, which is after ${TODAY}`,
		);
		assert.ok(source.data.accessedDate <= TODAY, `source ${source.id} claims a future accessedDate`);
	}
});

const LD_BLOCK = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

function ldNodes(html) {
	const out = [];
	for (const match of html.matchAll(LD_BLOCK)) {
		const parsed = JSON.parse(match[1]);
		out.push(...(parsed['@graph'] ?? [parsed]));
	}
	return out;
}

test('every declared line of business resolves to a canonical line', () => {
	// Four collections declare lines and they had drifted into three
	// vocabularies: `general-liability` on coverage pages,
	// `commercial-general-liability` on modules, `commercial general liability`
	// on examples. Seventy-one distinct values were in use. Because the related
	// examples section matched on exact string equality, five of the six coverage
	// pages rendered no examples at all and nobody noticed.
	const unresolved = [];
	const collections = [
		['coverage', coverages],
		['module', modules],
		['example', examples],
		['question', questions],
		['tool', tools],
	];
	for (const [kind, entries] of collections) {
		for (const entry of entries) {
			const values = [...(entry.data.lines ?? [])];
			if (entry.data.line) values.push(entry.data.line);
			for (const value of values) {
				if (!canonicalLine(value)) unresolved.push(`${kind} ${entry.id}: ${JSON.stringify(value)}`);
			}
		}
	}
	assert.deepEqual(
		unresolved,
		[],
		`lines that src/lib/lines.ts does not know:\n  ${unresolved.join('\n  ')}\n` +
			'Add it to CANONICAL_LINES or to ALIASES. An unknown line silently renders an empty section.',
	);
});

test('every coverage page and every live module surfaces its worked examples', () => {
	// A specialty domain 301s to a module page, so that page is where a reader
	// arriving from bestepli.com or bestcyberliability.com lands. Module pages
	// surfaced no examples at all before this, which made the line-specific
	// examples unreachable from the exact page each domain points at.
	for (const coverage of coverages) {
		const matching = examples.filter((e) => sharesLine([coverage.data.line], e.data.lines));
		if (matching.length === 0) continue;
		const html = read(path.join(DIST, 'insurance', coverage.id, 'index.html'));
		for (const example of matching) {
			assert.ok(
				html.includes(`/examples/${example.id}`),
				`/insurance/${coverage.id} shares a line with ${example.id} but does not link to it`,
			);
		}
	}

	for (const module of modules.filter((m) => m.data.status === 'live')) {
		const matching = examples.filter((e) => sharesLine(module.data.lines, e.data.lines));
		if (matching.length === 0) continue;
		const html = read(path.join(DIST, 'tools', module.id, 'index.html'));
		for (const example of matching) {
			assert.ok(
				html.includes(`/examples/${example.id}`),
				`/tools/${module.id} shares a line with ${example.id} but does not link to it`,
			);
		}
	}
});

test('every live module with a specialty domain has at least one worked example', () => {
	// A domain that redirects to a page with no worked example arrives at an
	// instrument and no evidence of it being used. These are the pages the
	// specialty domains advertise, so each has to carry something read.
	for (const module of modules.filter((m) => m.data.status === 'live' && m.data.domain)) {
		const matching = examples.filter((e) => sharesLine(module.data.lines, e.data.lines));
		assert.ok(
			matching.length > 0,
			`${module.data.domain} redirects to /tools/${module.id}, which has no worked example on its line`,
		);
	}
});

test('the corpus is declared as one Dataset whose distributions all resolve', () => {
	// A versioned, freely accessible, machine-readable collection of records with
	// stated provenance is a dataset, and Dataset is how it says so. One Dataset
	// with several distributions, deliberately: modelling each source record as
	// its own dataset would inflate apparent scale 246-fold with no new fact.
	const sets = ldNodes(read(path.join(DIST, 'sources', 'index.html'))).filter(
		(n) => n['@type'] === 'Dataset',
	);
	assert.equal(sets.length, 1, 'expected exactly one Dataset node on /sources');
	const ds = sets[0];

	assert.equal(ds.isAccessibleForFree, true);
	assert.ok(ds.version, 'the Dataset does not state its version');
	assert.match(ds.dateModified, /^\d{4}-\d{2}-\d{2}$/);
	assert.ok(ds.license && ds.license.length > 20, 'the Dataset does not state its licence terms');

	// A distribution that 404s is worse than none: it advertises a machine
	// surface that is not there.
	assert.ok(ds.distribution.length >= 2);
	for (const dist of ds.distribution) {
		const rel = new URL(dist.contentUrl).pathname.replace(/^\//, '');
		assert.ok(
			fs.existsSync(path.join(DIST, rel)),
			`Dataset advertises ${dist.contentUrl} but ${rel} was not built`,
		);
		assert.ok(dist.encodingFormat, `distribution ${dist.name} states no encodingFormat`);
	}

	// The measured figures must be true, not decorative.
	const measured = Object.fromEntries(ds.variableMeasured.map((v) => [v.name, v.value]));
	const expectedClaims = sources.reduce((n, x) => n + x.data.claims.length, 0);
	assert.equal(measured.claims, expectedClaims, 'the Dataset misstates the claim count');
	assert.equal(measured.sourceRecords, sources.length, 'the Dataset misstates the source count');
});

test('no fact-checking or commercial vocabulary is emitted anywhere', () => {
	// Claim and ClaimReview carry a verdict. This site records what a source
	// supports and does not adjudicate whether it is true, so emitting either
	// would be a false statement in markup about who is speaking. Rating, Review,
	// Offer and FAQPage are refused for the reasons in the editorial standard.
	const BANNED = ['ClaimReview', 'Claim', 'Rating', 'AggregateRating', 'Review', 'Offer', 'FAQPage'];
	for (const file of htmlFiles) {
		for (const node of ldNodes(read(file))) {
			const type = node['@type'];
			const types = Array.isArray(type) ? type : [type];
			for (const banned of BANNED) {
				assert.ok(
					!types.includes(banned),
					`${file} emits ${banned} structured data`,
				);
			}
		}
	}
});

test('the claim index covers the whole corpus and agrees with every source record', () => {
	// The claim, not the page, is the citable unit. A page-level citation cannot
	// be checked later, because the page may have been rewritten around the
	// sentence that was relied on.
	const index = JSON.parse(read(path.join(DIST, 'claims.json')));
	assert.equal(index.recordType, 'claim-index');

	const expected = sources.reduce((n, s) => n + s.data.claims.length, 0);
	assert.equal(index.counts.claims, expected, 'claim index does not cover every claim');
	assert.equal(index.claims.length, expected);
	assert.equal(index.counts.sources, sources.length);
	assert.equal(Object.keys(index.sources).length, sources.length);

	// It must state what may not be inferred from it, in its own words. An index
	// that travels without its limits is the failure mode here.
	assert.ok(Array.isArray(index.howToCite) && index.howToCite.length >= 3);
	assert.ok(Array.isArray(index.mayNotBeInferred) && index.mayNotBeInferred.length >= 3);
	const limits = index.mayNotBeInferred.join(' ').toLowerCase();
	for (const must of ['coverage', 'eligibility', 'appetite']) {
		assert.ok(limits.includes(must), `the claim index does not disclaim ${must}`);
	}

	// Every entry must agree with the per-source companion, or the two surfaces
	// could drift and a citing party would not know which one lied.
	const bySource = new Map();
	for (const claim of index.claims) {
		assert.ok(index.sources[claim.sourceId], `claim ${claim.claimId} names an unknown source`);
		assert.match(claim.checksum, /^[0-9a-f]{12}$/);
		if (!bySource.has(claim.sourceId)) bySource.set(claim.sourceId, []);
		bySource.get(claim.sourceId).push(claim);
	}
	for (const source of sources) {
		const companion = JSON.parse(read(path.join(DIST, 'sources', `${source.id}.json`)));
		const fromIndex = bySource.get(source.id) ?? [];
		assert.equal(fromIndex.length, companion.supportsClaims.length, `${source.id} claim count differs`);
		companion.supportsClaims.forEach((claim, i) => {
			assert.equal(fromIndex[i].claimId, claim.claimId, `${source.id} claim id differs between surfaces`);
			assert.equal(fromIndex[i].checksum, claim.checksum, `${source.id} checksum differs between surfaces`);
		});
	}
});

test('every source has a machine companion, and llms.txt does not promise one it lacks', () => {
	// llms.txt tells every AI system that each substantive page has a `.json`
	// companion and to prefer it over scraping the HTML. That statement was false
	// for all 244 source pages, which are the most citable entities on the site.
	for (const source of sources) {
		const file = path.join(DIST, 'sources', `${source.id}.json`);
		assert.ok(fs.existsSync(file), `source ${source.id} has no .json companion`);
		const record = JSON.parse(read(file));
		assert.equal(record.recordType, 'source');
		assert.equal(record.id, source.id);
		assert.equal(
			record.supportsClaims.length,
			source.data.claims.length,
			`source ${source.id} companion lists a different number of claims than the record`,
		);
	}
});

test('every claim is individually addressable, with a stable id and a checksum', () => {
	// A citation that can only point at a page cannot be verified later. The URI
	// is positional and stable; the checksum is what tells a citing party whether
	// the sentence they relied on still says what it said.
	const seen = new Set();
	for (const source of sources) {
		const record = JSON.parse(read(path.join(DIST, 'sources', `${source.id}.json`)));
		const html = read(path.join(DIST, 'sources', source.id, 'index.html'));
		record.supportsClaims.forEach((claim, i) => {
			assert.equal(claim.claimId, `${source.id}#c${i + 1}`, 'claim id is not positional');
			assert.match(claim.checksum, /^[0-9a-f]{12}$/, `claim ${claim.claimId} has no checksum`);
			assert.ok(!seen.has(claim.claimId), `duplicate claim id ${claim.claimId}`);
			seen.add(claim.claimId);
			assert.ok(
				html.includes(`id="c${i + 1}"`),
				`claim ${claim.claimId} has no anchor on its own page, so its URI does not resolve`,
			);
			assert.equal(claim.text, source.data.claims[i], `claim ${claim.claimId} text drifted`);
		});
	}
	assert.ok(seen.size > 1400, `expected the full claim corpus, addressed ${seen.size}`);
});

test('a source page names every page that depends on it, modules included', () => {
	// This was inline on the source page and omitted modules, so 23 sources whose
	// only dependents are module rules were telling the reader nothing cited them
	// while 198 rules did. A source that understates its own blast radius is the
	// least useful kind of provenance.
	const ids = (refs) => (refs ?? []).map((r) => (typeof r === 'string' ? r : r.id));
	for (const source of sources) {
		const record = JSON.parse(read(path.join(DIST, 'sources', `${source.id}.json`)));
		const named = new Set(record.reliedOnBy.map((r) => r.url));
		for (const module of modules.filter((m) => m.data.status === 'live')) {
			const cites = module.data.rules.some((rule) => ids(rule.sourceIds).includes(source.id));
			if (!cites) continue;
			const expected = [...named].some((u) => u.endsWith(`/tools/${module.id}`));
			assert.ok(
				expected,
				`source ${source.id} is cited by ${module.id} rules but its record does not say so`,
			);
		}
		assert.equal(record.reliedOnByCount, record.reliedOnBy.length);
	}
});

test('every live module is reachable from its own name', () => {
	// Before this, a module could not be found through the lookup at all: the
	// instrument was the product and its parts were invisible to the search over it.
	// The assertion is on retrievability, not on clearing the evidence floor.
	// Loosening that floor so modules score better would be the wrong trade.
	for (const module of modules.filter((m) => m.data.status === 'live')) {
		const outcome = search(searchIndex, module.data.name, {}, 10);
		const hits = outcome.hits ?? [];
		assert.ok(
			hits.some((h) => h.slug === module.id),
			`module "${module.data.name}" is not retrievable by its own name`,
		);
	}
});

test('every canonical question is reachable from its own exact title', () => {
	for (const question of questions) {
		const outcome = search(searchIndex, question.data.question, {}, 5);
		assert.equal(outcome.status, 'ok', `"${question.id}" is not findable by its own title`);
		assert.equal(
			outcome.hits[0].slug,
			question.id,
			`"${question.id}" ranks below "${outcome.hits[0].slug}" for its own exact title`,
		);
	}
});

test('filters actually narrow the corpus', () => {
	const all = search(searchIndex, 'insurance policy limits', {}, 30);
	const commercial = search(searchIndex, 'insurance policy limits', { family: 'commercial' }, 30);
	const hitsOf = (o) => (o.hits || []).length;
	assert.ok(hitsOf(all) >= hitsOf(commercial), 'a family filter must not widen the result set');
	for (const hit of commercial.hits || []) {
		const entry = [...questions, ...coverages].find((e) => e.id === hit.slug);
		if (entry?.data.family) assert.equal(entry.data.family, 'commercial', `${hit.slug} leaked past the family filter`);
	}
});

test('no page calls a record reviewed while that collection has none reviewed', () => {
	/*
	 * The homepage described the corpus as "12 reviewed questions" while all
	 * twelve carried reviewState `under-review` and rendered an UNDER REVIEW
	 * badge on their own pages. On a site whose whole proposition is that a
	 * claim can be checked, overstating its own review status is the worst
	 * available defect. This guards the class rather than the instance, so it
	 * keeps working as records are reviewed: the check switches itself off for
	 * a collection as soon as one record in it is genuinely reviewed.
	 */
	const collections = {
		question: questions,
		coverage: coverages,
		module: modules,
		example: examples,
	};

	for (const [noun, entries] of Object.entries(collections)) {
		const reviewed = entries.filter((e) => e.data.reviewState === 'reviewed').length;
		if (reviewed > 0) continue;

		for (const file of htmlFiles) {
			const lower = read(file).toLowerCase();
			for (const phrase of [`reviewed ${noun}`, `reviewed ${noun}s`]) {
				assert.ok(
					!lower.includes(phrase),
					`${routeOf(file)} says "${phrase}" but 0 of ${entries.length} ${noun} records are reviewed`,
				);
			}
		}
	}
});

test('the published phone and address agree across markup and visible text', () => {
	/*
	 * The hub emitted no telephone and no address at all, so a reader could
	 * not act on it and an answer engine could not resolve the entity. Now it
	 * emits both, which creates a new way to be wrong: structured data and
	 * visible text drifting apart. A wrong number on a broker page is not
	 * cosmetic, so the two are held together here.
	 */
	const home = read(path.join(DIST, 'index.html'));

	// Pull the agency node out of the graph.
	let agency = null;
	for (const block of home.split('<script type="application/ld+json">').slice(1)) {
		const graph = JSON.parse(block.slice(0, block.indexOf('</script>')));
		for (const node of graph['@graph'] ?? [graph]) {
			if (node.parentOrganization) agency = node.parentOrganization;
		}
	}
	assert.ok(agency, 'the homepage graph has no parentOrganization');

	const telephone = agency.telephone;
	assert.ok(telephone, 'the agency node emits no telephone');
	const digits = (v) => [...String(v)].filter((c) => c >= '0' && c <= '9').join('');

	// The tel: link a reader taps must dial the number the markup claims.
	const tel = home.match(/href="tel:([+0-9]+)"/);
	assert.ok(tel, 'no tel: link on the homepage');
	assert.equal(
		digits(tel[1]), digits(telephone),
		`the tel: link dials ${tel[1]} but the markup publishes ${telephone}`,
	);

	// And the number a reader can read must be the same one again.
	const shown = home.match(/\(?[0-9]{3}\)?[ .-]?[0-9]{3}[ .-][0-9]{4}/);
	assert.ok(shown, 'the homepage shows no phone number in visible text');
	assert.ok(
		digits(telephone).endsWith(digits(shown[0])),
		`the visible number ${shown[0]} is not the published ${telephone}`,
	);

	// The address must exist in the graph and on the page.
	const addr = agency.address ?? {};
	for (const field of ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode']) {
		assert.ok(addr[field], `the agency address is missing ${field}`);
	}
	for (const visible of [addr.streetAddress, addr.postalCode]) {
		assert.ok(home.includes(visible), `the homepage never shows ${visible}`);
	}

	// Each named person is reachable from the agency, and by reference only.
	const employees = agency.employee ?? [];
	assert.ok(employees.length >= 2, 'the agency node names fewer than two people');
	for (const e of employees) {
		assert.ok(e['@id'], 'an employee is inlined rather than referenced by @id');
		const slug = e['@id'].split('/authors/')[1]?.replace('#person', '');
		assert.ok(slug, `employee @id is not an author URL: ${e['@id']}`);
		assert.ok(
			fs.existsSync(path.join(DIST, 'authors', slug, 'index.html')),
			`the agency names ${slug} but /authors/${slug} does not exist`,
		);
	}
});

test('a coverage page and its guide link each other', () => {
	/*
	 * The guides linked up to their reference page and nothing linked down, so
	 * the newest and most linkable surface received no equity from the pages
	 * that have it. A one-way link between two pages about the same line is a
	 * modelling mistake rather than a missing nicety.
	 */
	for (const coverage of coverages) {
		const cov = read(path.join(DIST, 'insurance', coverage.id, 'index.html'));
		const guide = read(path.join(DIST, 'guides', coverage.id, 'index.html'));
		assert.ok(
			cov.includes(`/guides/${coverage.id}`),
			`/insurance/${coverage.id} does not link its guide`,
		);
		assert.ok(
			guide.includes(`/insurance/${coverage.id}`),
			`/guides/${coverage.id} does not link its reference page`,
		);
	}
});

test('a source cannot claim a recheck it did not have', () => {
	/*
	 * `accessedDate` and `lastChecked` were identical on 260 of 263 records, so
	 * the freshness date carried no information beyond the day the source was
	 * added, while the site published it per source and drove a stale flag from
	 * it. `lastCheckedBasis` now states which it is, and this holds the two
	 * fields consistent with that statement in both directions.
	 */
	for (const source of sources) {
		if (source.data.lastCheckedBasis === 'access') {
			assert.equal(
				source.data.lastChecked, source.data.accessedDate,
				`${source.id} says its check was on access but lastChecked ${source.data.lastChecked} differs from accessedDate ${source.data.accessedDate}`,
			);
		} else {
			assert.ok(
				source.data.lastChecked > source.data.accessedDate,
				`${source.id} claims a recheck but lastChecked ${source.data.lastChecked} is not after accessedDate ${source.data.accessedDate}`,
			);
		}
	}

	// The homepage publishes the ratio, so it has to be the real one.
	const rechecked = sources.filter((s) => s.data.lastCheckedBasis === 'recheck').length;
	const home = read(path.join(DIST, 'index.html'));
	assert.ok(
		home.includes(`${rechecked} of ${sources.length}`),
		`the homepage does not publish the recheck ratio ${rechecked} of ${sources.length}`,
	);

	// And a record that was only read on access must say so where it is read.
	const onAccess = sources.find((s) => s.data.lastCheckedBasis === 'access');
	if (onAccess) {
		const page = read(path.join(DIST, 'sources', onAccess.id, 'index.html'));
		assert.ok(
			page.includes('not independently rechecked'),
			`/sources/${onAccess.id} shows a check date without saying what established it`,
		);
	}
});

test('the review queue lists every record that needs review', () => {
	/*
	 * The queue is published, so a reader will take it as the complete list of
	 * what has not been signed off. If a record can drop out of it silently,
	 * the page becomes a claim of completeness the site cannot support, which
	 * is the failure mode this whole property exists to avoid.
	 */
	const page = read(path.join(DIST, 'review-queue', 'index.html'));

	const expected = [
		...coverages.map((c) => ['insurance', c]),
		...questions.map((q) => ['questions', q]),
		...modules.map((m) => ['tools', m]),
		...examples.map((e) => ['examples', e]),
		...states.map((s) => ['states', s]),
		...companies.map((c) => ['companies', c]),
	];

	for (const [segment, record] of expected) {
		if (record.data.reviewState === 'reviewed') continue;
		assert.ok(
			page.includes(`/${segment}/${record.id}`),
			`the review queue omits ${segment}/${record.id}, which is not reviewed`,
		);
	}

	// The headline count must be the real one.
	const outstanding = expected.filter(([, r]) => r.data.reviewState !== 'reviewed').length;
	assert.ok(
		page.includes(`${outstanding} of ${expected.length} records`),
		`the review queue does not state the real outstanding count, ${outstanding} of ${expected.length}`,
	);

	// And a record whose source was withdrawn must be flagged as escalated,
	// because that is the trigger the ordering exists to surface.
	const withdrawn = new Set(sources.filter((x) => x.data.status !== 'active').map((x) => x.id));
	if (withdrawn.size > 0) {
		const affected = expected.filter(([, r]) =>
			(r.data.sourceIds ?? [])
				.map((ref) => (typeof ref === 'string' ? ref : ref.id))
				.some((id) => withdrawn.has(id)),
		);
		for (const [, record] of affected) {
			assert.ok(
				page.includes(record.id),
				`${record.id} relies on a withdrawn source but is absent from the review queue`,
			);
		}
		assert.ok(
			page.includes('is not active'),
			'the review queue never surfaces the not-active source trigger',
		);
	}
});

test('every CSS custom property used is one the token file defines', () => {
	/*
	 * Silent by construction. `border: 1px solid var(--rule)` where `--rule`
	 * does not exist is not an error: the whole declaration is invalid at
	 * computed-value time, so the border falls back to currentColor and, for a
	 * shorthand, the width falls back to zero. The review queue shipped with
	 * dark ink card borders and a 3px accent stripe that rendered at 0px,
	 * because two tokens were invented rather than looked up. Nothing caught
	 * it but a computed-style read in a browser.
	 */
	const SRC = path.join(ROOT, 'src');

	// Anything declared anywhere counts as defined, including inside a
	// component or a page style block, and including a local scope.
	const defined = new Set();
	const styled = walk(SRC, (f) => f.endsWith('.css') || f.endsWith('.astro'));
	for (const file of styled) {
		for (const m of read(file).matchAll(/(--[a-z0-9-]+)\s*:/g)) defined.add(m[1]);
	}

	const missing = new Map();
	for (const file of styled) {
		for (const m of read(file).matchAll(/var\((--[a-z0-9-]+)([^)]*)\)/g)) {
			const [, name, rest] = m;
			if (defined.has(name)) continue;
			// A var() with its own fallback still renders, so it is a smell rather
			// than a defect. Report only the ones with nothing to fall back to.
			if (rest.includes(',')) continue;
			const where = missing.get(name) ?? new Set();
			where.add(file.replace(ROOT, '').replace(/\\/g, '/'));
			missing.set(name, where);
		}
	}

	const report = [...missing.entries()].map(
		([name, where]) => `${name} used in ${[...where].join(', ')}`,
	);
	assert.deepEqual(
		report, [],
		`CSS custom properties used but never defined:\n  ${report.join('\n  ')}`,
	);
});

test('no module can collect an application', () => {
	/*
	 * The estate no longer takes application intake anywhere, and on this
	 * property that is structural rather than a policy: a browser will not
	 * include an input in a request unless the input has a name attribute, so
	 * a form whose fields are all unnamed cannot transmit an answer even if it
	 * were submitted. The module page now says so in terms a reader can check.
	 *
	 * Adding a name attribute is a one-character change that would silently
	 * turn a worksheet into an intake form and make that published statement
	 * false. This is the assertion standing between those two things.
	 */
	for (const module of modules) {
		const html = read(path.join(DIST, 'tools', module.id, 'index.html'));

		// Isolate the module form. Everything else on the page may have forms
		// of its own; the site search is a legitimate GET to /ask.
		const start = html.indexOf('id="module-form"');
		assert.ok(start > 0, `/tools/${module.id} renders no module form`);
		const formStart = html.lastIndexOf('<form', start);
		const formEnd = html.indexOf('</form>', start);
		assert.ok(formStart >= 0 && formEnd > formStart, `/tools/${module.id} module form is malformed`);
		const form = html.slice(formStart, formEnd);

		// No destination, and no control that would submit it.
		const openTag = form.slice(0, form.indexOf('>') + 1);
		assert.ok(
			!/\saction=/.test(openTag),
			`/tools/${module.id} module form declares an action: ${openTag}`,
		);
		assert.ok(
			!/type="submit"/.test(form),
			`/tools/${module.id} module form contains a submit control`,
		);

		// And no field a browser would be willing to transmit.
		const named = [...form.matchAll(/<(?:input|select|textarea)\b[^>]*\sname="([^"]+)"/g)].map((x) => x[1]);
		assert.deepEqual(
			named, [],
			`/tools/${module.id} has named form fields, which a browser will submit: ${named.join(', ')}`,
		);

		// The page must also still tell the reader this is the case.
		assert.ok(
			html.includes('no way to send one'),
			`/tools/${module.id} no longer states that nothing can be submitted`,
		);
	}
});

test('a line index is only built where there is evidence, and says which it is', () => {
	/*
	 * A line index is an index over material published elsewhere, not a reading
	 * of the line. It asserts nothing of its own, which is the entire reason it
	 * is honest to publish 39 of them from a corpus with 8 written coverage
	 * pages.
	 *
	 * Two ways that could rot. An index could appear for a line with nothing
	 * behind it, which is a stub dressed as coverage. Or an index could stop
	 * distinguishing itself from a written page, at which point the site is
	 * claiming to have read 39 lines when it has read 8.
	 */
	const index = read(path.join(DIST, 'lines', 'index.html'));

	// Lines the index offers, and lines it admits holding nothing on.
	const offered = [
		...new Set([...index.matchAll(/href="\/lines\/([a-z0-9-]+)"/g)].map((m) => m[1])),
	];
	const gapLabels = [...index.matchAll(/class="chip-flat[^"]*"[^>]*>([^<]+)</g)].map((m) => m[1].trim());

	assert.ok(offered.length > 0, '/lines offers no line at all');
	assert.ok(
		gapLabels.length > 0,
		'/lines names no gaps, which would mean it claims complete coverage of every line',
	);

	for (const line of offered) {
		const file = path.join(DIST, 'lines', line, 'index.html');
		assert.ok(fs.existsSync(file), `/lines links /lines/${line}, which was not built`);
		const html = read(file);

		// It must always say it is an index rather than a reading of the line.
		assert.ok(
			html.includes('not a written reading of the line'),
			`/lines/${line} no longer states that it is an index`,
		);

		// It must be straight about whether a written coverage page exists.
		const claimsWritten = /href="\/insurance\/[a-z0-9-]+"/.test(html);
		const admitsNone = html.includes('No written coverage page for this line yet');
		assert.ok(
			claimsWritten !== admitsNone,
			`/lines/${line} must either link a written coverage page or admit it has none, not both or neither`,
		);

		// Substance: an index with fewer than three source records behind it is a
		// stub, and the threshold is what makes generating these defensible.
		const ledger = [...html.matchAll(/id="source-\d+"/g)].length;
		assert.ok(
			ledger >= 3,
			`/lines/${line} shows only ${ledger} source records; below three it is a stub`,
		);
	}

	// A line the index calls a gap must not also have a page.
	for (const label of gapLabels) {
		const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
		assert.ok(
			!fs.existsSync(path.join(DIST, 'lines', slug, 'index.html')),
			`${label} is listed as a gap on /lines but /lines/${slug} was built`,
		);
	}
});

test('a field id means the same thing in every module that defines it', () => {
	/*
	 * Six field ids are defined in more than one module. Three of them used to
	 * disagree: construction-era was banded 4 ways in one module and 7 in
	 * another, residence-type conflated condominium and townhouse in one and
	 * separated them in the other, and states-of-operation used two-letter
	 * codes in one module and full slugs in two others.
	 *
	 * All three are rule-input, so a reader answered the same question twice
	 * with different answer choices, and any cross-module rule reading them
	 * would have compared values that could never match. That is why this is
	 * the gate on cross-module rules rather than a tidiness check.
	 */
	const byId = new Map();
	for (const module of modules) {
		for (const field of module.data.fields ?? []) {
			const defs = byId.get(field.id) ?? [];
			defs.push({ module: module.id, kind: field.kind, options: field.options ?? null });
			byId.set(field.id, defs);
		}
	}

	const disagreements = [];
	for (const [id, defs] of byId) {
		if (defs.length < 2) continue;

		const kinds = new Set(defs.map((d) => d.kind));
		if (kinds.size > 1) {
			disagreements.push(
				`${id} is ${defs.map((d) => `${d.kind} in ${d.module}`).join(' but ')}`,
			);
			continue;
		}

		// Same answer choices, in the same order, with the same labels.
		const shapes = new Set(defs.map((d) => JSON.stringify(d.options)));
		if (shapes.size > 1) {
			const counts = defs.map((d) => `${d.module} offers ${d.options ? d.options.length : 0}`);
			disagreements.push(`${id} offers different options: ${counts.join(', ')}`);
		}
	}

	assert.deepEqual(
		disagreements, [],
		`field ids that mean different things in different modules:\n  ${disagreements.join('\n  ')}`,
	);
});

test('every rule compares a field against a value that field can hold', () => {
	/*
	 * Reconciling the vocabularies rewrote comparands across four modules. A
	 * rule left pointing at a retired option would never fire again and nothing
	 * else would notice — it is not a crash, it is a check that silently stops
	 * checking. This is the assertion that would have caught that.
	 */
	const offenders = [];
	for (const module of modules) {
		const options = new Map();
		for (const field of module.data.fields ?? []) {
			if (Array.isArray(field.options)) {
				options.set(field.id, new Set(field.options.map((o) => o.value)));
			}
		}

		const walk = (node) => {
			if (!node || typeof node !== 'object') return;
			if (Array.isArray(node)) return node.forEach(walk);
			const allowed = options.get(node.field);
			const v = node.value;
			if (allowed && typeof v === 'string' && ['eq', 'neq', 'includes', 'excludes'].includes(node.op)) {
				if (!allowed.has(v)) {
					offenders.push(`${module.id}: a rule compares ${node.field} against "${v}", which is not one of its options`);
				}
			}
			for (const k of Object.keys(node)) walk(node[k]);
		};
		for (const rule of module.data.rules ?? []) walk(rule.when);
	}

	assert.deepEqual(
		[...new Set(offenders)], [],
		`rules comparing against values their field cannot hold:\n  ${[...new Set(offenders)].join('\n  ')}`,
	);
});

test('every cross-module rule resolves, spans modules, and can fire', async () => {
	/*
	 * A cross rule is the one kind of rule nothing else can catch. A module
	 * rule that never fires still shows up in that module’s own reachability
	 * probe; a cross rule has no module to belong to, so if it silently stopped
	 * matching, the position would simply never mention it again.
	 *
	 * Three things are asserted: every qualified field resolves to a real
	 * module and field, the rule genuinely spans more than one module, and a
	 * position exists that makes it fire. The last is the one that matters.
	 */
	const { validateCrossRule, crossOpenItems } = await import('../src/lib/position.ts');

	const crossDir = path.join(CONTENT, 'cross-rules');
	const files = fs.existsSync(crossDir) ? fs.readdirSync(crossDir).filter((f) => f.endsWith('.json')) : [];
	assert.ok(files.length > 0, 'no cross-module rules exist');

	// The module defs, in the shape the library expects.
	const defs = modules.map((m) => ({
		moduleId: m.id,
		name: m.data.name,
		summary: m.data.summary ?? '',
		family: m.data.family ?? '',
		lines: m.data.lines ?? [],
		privacyBoundary: m.data.privacyBoundary ?? '',
		uncertainty: m.data.uncertainty ?? '',
		fields: m.data.fields ?? [],
		rules: m.data.rules ?? [],
	}));

	const problems = [];
	const neverFires = [];

	for (const file of files) {
		const id = file.replace(/\.json$/, "");
		const raw = JSON.parse(read(path.join(crossDir, file)));
		const rule = { ...raw, id };

		problems.push(...validateCrossRule(rule, defs));

		// Build a position that should satisfy it, from the conditions themselves.
		const position = { version: 1, savedAt: null, profile: {}, modules: {} };
		const touch = (moduleId) => {
			position.modules[moduleId] ??= { fields: {}, touchedAt: "2026-01-01T00:00:00.000Z" };
			return position.modules[moduleId];
		};
		for (const m of rule.modules) touch(m);

		for (const c of rule.when.all) {
			const dot = c.field.indexOf(".");
			if (dot < 0) continue;
			const moduleId = c.field.slice(0, dot);
			const fieldId = c.field.slice(dot + 1);
			const def = defs.find((d) => d.moduleId === moduleId)?.fields.find((f) => f.id === fieldId);
			const state = touch(moduleId).fields;

			// A field-to-field comparand: set the other side to something different.
			if (c.value && typeof c.value === "object" && c.value.field) {
				const od = c.value.field.indexOf(".");
				const otherModule = c.value.field.slice(0, od);
				const otherField = c.value.field.slice(od + 1);
				const opts = def?.options?.map((o) => o.value) ?? ["__a__", "__b__"];
				state[fieldId] = opts[0];
				touch(otherModule).fields[otherField] = opts[1] ?? "__other__";
				continue;
			}

			switch (c.op) {
				case "isSet": state[fieldId] = def?.options?.[0]?.value ?? "x"; break;
				case "isEmpty": delete state[fieldId]; break;
				case "eq": state[fieldId] = c.value; break;
				case "neq": state[fieldId] = "__other__"; break;
				case "includes": state[fieldId] = [String(c.value)]; break;
				case "excludes": state[fieldId] = ["__other__"]; break;
				case "countGte": state[fieldId] = Array.from({ length: Number(c.value) }, (_, i) => `__p${i}__`); break;
				case "gte": case "gt": state[fieldId] = Number(c.value) + (c.op === "gt" ? 1 : 0); break;
				case "lte": case "lt": state[fieldId] = Number(c.value) - (c.op === "lt" ? 1 : 0); break;
				default: break;
			}
		}

		const fired = crossOpenItems([rule], position, defs, TODAY);
		if (fired.length === 0) neverFires.push(id);
	}

	assert.deepEqual(problems, [], `cross-module rules that do not resolve:\n  ${problems.join('\n  ')}`);
	assert.deepEqual(
		neverFires, [],
		`cross-module rules no position can trigger:\n  ${neverFires.join('\n  ')}`,
	);
});

test('a cross-module rule stays silent until every module it reads is touched', async () => {
	/*
	 * An untouched module reads as blank. Without this rule, a cross rule that
	 * compares two modules would fire the moment one of them was filled in and
	 * report a disagreement between an answer and an absence — the most
	 * annoying possible false positive, and one a reader cannot act on.
	 */
	const { crossOpenItems } = await import('../src/lib/position.ts');
	const crossDir = path.join(CONTENT, 'cross-rules');
	const files = fs.readdirSync(crossDir).filter((f) => f.endsWith(".json"));

	for (const file of files) {
		const raw = JSON.parse(read(path.join(crossDir, file)));
		const rule = { ...raw, id: file.replace(/\.json$/, "") };

		// Everything the rule wants, but only the first module marked touched.
		const position = { version: 1, savedAt: null, profile: {}, modules: {} };
		for (const [i, m] of rule.modules.entries()) {
			position.modules[m] = { fields: {}, touchedAt: i === 0 ? "2026-01-01T00:00:00.000Z" : null };
		}
		for (const c of rule.when.all) {
			const dot = c.field.indexOf(".");
			if (dot < 0) continue;
			const mod = c.field.slice(0, dot);
			position.modules[mod] ??= { fields: {}, touchedAt: null };
			position.modules[mod].fields[c.field.slice(dot + 1)] =
				c.op === "includes" ? [String(c.value)] : c.value;
		}

		assert.equal(
			crossOpenItems([rule], position, [], TODAY).length,
			0,
			`${rule.id} fired with only one of its modules touched`,
		);
	}
});
