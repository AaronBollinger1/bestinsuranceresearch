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
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
/* The excerpt helpers are plain TypeScript with no Astro imports, so the suite
   exercises the real implementation rather than a copy of its rules. */
import { excerpt, sentences } from '../src/lib/excerpt.ts';

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
const figures = collection('figures');
const byIdMap = new Map(sources.map((x) => [x.id, x]));
const idsOf = (refs) => (refs ?? []).map((r) => (typeof r === 'string' ? r : r.id));
const companies = collection('companies');
const states = collection('states');
const examples = collection('examples');
const tools = collection('tools');
const liveTools = tools.filter((t) => t.data.status === 'live');

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

test('no line the coverage index calls planned has already been published', async () => {
	/*
	 * /insurance tells the reader, in a callout, that the planned lines "have no
	 * route, no sitemap entry, and no navigation link until a reviewed page
	 * exists". That is a claim about this build, made from a hand-maintained
	 * literal that nothing pruned as pages were written. Twelve of its lines had
	 * all three - renters, personal auto, flood, cyber, EPL, D&O, inland marine,
	 * surety bonds among them - so the index of a library with a renters page
	 * told a reader looking for renters insurance that it was planned.
	 *
	 * The list now carries the slug each line would be published under, which is
	 * what makes this measurable rather than a fuzzy match between "Scheduled
	 * valuables" and "Scheduled personal property (California)".
	 */
	const { ROADMAP, roadmapLines } = await import('../src/lib/roadmap.ts');
	const published = new Set(coverages.map((c) => c.id));
	const sitemap = walk(DIST, (f) => /sitemap.*\.xml$/.test(f)).map(read).join('\n');

	const alreadyThere = roadmapLines()
		.filter((line) => published.has(line.id) || routes.has(`/insurance/${line.id}`))
		.map((line) => `${line.name} (/insurance/${line.id})`);
	assert.deepEqual(
		alreadyThere,
		[],
		'the coverage index calls these lines planned, and says they have no route, ' +
			`but they are published: ${alreadyThere.join(', ')}`,
	);

	/* And the other direction: a planned line must really be absent, not merely
	   unlisted in the coverages collection. */
	for (const line of roadmapLines()) {
		assert.ok(
			!sitemap.includes(`/insurance/${line.id}`),
			`${line.name} is called planned but is in the sitemap`,
		);
	}

	/*
	 * The list and the page cannot drift either. A line dropped from the render
	 * would leave the id checked above enforcing nothing, which is the vacuous
	 * check this suite keeps having to unlearn.
	 */
	const html = read(path.join(DIST, 'insurance', 'index.html'));
	assert.ok(roadmapLines().length >= 10, 'the roadmap is too short for this check to mean much');
	for (const line of roadmapLines()) {
		assert.ok(html.includes(`<li>${line.name}</li>`), `${line.name} is on the roadmap but not on the page`);
	}
	for (const group of ROADMAP) {
		assert.ok(html.includes(group.family), `the roadmap family "${group.family}" is not on the page`);
	}

	/* The callout is the claim the rest of this test enforces. If somebody
	   softens it, this check should stop pretending to hold them to it. */
	assert.ok(
		html.includes('They have no route, no sitemap entry, and no navigation link'),
		'/insurance no longer makes the claim this test exists to hold',
	);
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
		assert.ok(!href.endsWith('/') || url.pathname === '/', `${routeOf(file)} canonical has a trailing slash`);
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
const SITE_ORIGIN = (process.env.PUBLIC_SITE_ORIGIN || 'https://birch.insure').replace(/\/+$/, '');
const COMMONS_READY = process.env.PUBLIC_COMMONS_READY === 'true';
const COMMUNITY_ORIGIN = (process.env.PUBLIC_COMMONS_ORIGIN || 'https://commons.birch.insure').replace(/\/+$/, '');

test('research never advertises an unready Commons origin', () => {
	const advertised = htmlFiles.filter((file) => read(file).includes(`href="${COMMUNITY_ORIGIN}`));
	if (COMMONS_READY) {
		assert.ok(advertised.length > 0, 'Commons is marked ready but no Research CTA advertises it');
		return;
	}
	assert.equal(advertised.length, 0, 'Commons links are present before PUBLIC_COMMONS_READY=true');
});

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
		/* /review-queue/<source> are the verification sheets: public, linked, and
		   deliberately out of the index because they reproduce prose whose
		   canonical home is elsewhere on this origin. /review-queue itself is
		   indexed, so the pattern requires a segment after it. */
		const deliberatelyHidden = /^\/(design|404|lens)(?:\/|$)/.test(route) || /^\/review-queue\/./.test(route);
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

test('the checked-in Vercel config cannot turn review previews indexable', () => {
	const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
	const buildEnv = config.build?.env ?? {};
	assert.notEqual(
		buildEnv.PUBLIC_SITE_ENV,
		'production',
		'vercel.json must not force production indexing on every preview deployment',
	);
	assert.notEqual(
		buildEnv.PUBLIC_SITE_ORIGIN,
		'https://bestinsuranceresearch.com',
		'vercel.json still points builds at the retired Research origin',
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

test('company machine records expose only declared research relationships', () => {
	for (const company of companies) {
		const record = JSON.parse(read(path.join(DIST, 'companies', `${company.id}.json`)));
		assert.ok(record.relatedResearch, `${company.id} has no relatedResearch object`);
		assert.ok(Array.isArray(record.relatedResearch.questions), `${company.id} has no related question list`);
		assert.ok(Array.isArray(record.relatedResearch.coverages), `${company.id} has no related coverage list`);

		const explicit = idsOf(company.data.relatedQuestions);
		const mentioning = questions
			.filter((question) => idsOf(question.data.companies).includes(company.id))
			.filter((question) => !explicit.includes(question.id));
		const expectedQuestions = [...explicit, ...mentioning.map((question) => question.id)];
		assert.deepEqual(
			record.relatedResearch.questions.map((question) => question.id),
			expectedQuestions,
			`${company.id} machine question links drifted from the visible relationship set`,
		);

		const expectedCoverages = [...new Set(
			[...explicit.map((id) => questions.find((question) => question.id === id)).filter(Boolean), ...mentioning]
				.flatMap((question) => idsOf(question.data.coverages)),
		)];
		assert.deepEqual(
			record.relatedResearch.coverages.map((coverage) => coverage.id),
			expectedCoverages,
			`${company.id} machine coverage links are not derived from declared Research relationships`,
		);
		for (const link of [...record.relatedResearch.questions, ...record.relatedResearch.coverages]) {
			assert.ok(routes.has(new URL(link.url).pathname), `${company.id} has an unbuilt research relationship URL`);
		}
	}
});

test('filed company forms are source-linked policy-form records', () => {
	const sourceById = new Map(sources.map((source) => [source.id, source]));
	for (const company of companies) {
		const companySourceIds = idsOf(company.data.sourceIds);
		const forms = company.data.filedForms ?? [];
		const html = read(path.join(DIST, 'companies', company.id, 'index.html'));
		const machine = JSON.parse(read(path.join(DIST, 'companies', `${company.id}.json`)));
		assert.equal(machine.filedForms.length, forms.length, `${company.id} machine filed-form count drifted`);
		for (const form of forms) {
			const source = sourceById.get(form.sourceId.id);
			assert.ok(source, `${company.id} filed form ${form.label} has no source record`);
			assert.equal(source.data.sourceType, 'policy-form', `${company.id} filed form ${form.label} is not a policy-form source`);
			assert.ok(companySourceIds.includes(form.sourceId.id), `${company.id} filed form ${form.label} is not in the entity source ledger`);
			assert.ok(html.includes(form.label), `${company.id} does not render filed form ${form.label}`);
			assert.ok(html.includes(`/sources/${form.sourceId.id}`), `${company.id} does not link filed form ${form.label} to its source page`);
		}
		if (forms.length > 0) assert.match(html, /Filed forms in the source registry/);
	}
});

test('regulatory company identity snapshots are source-linked regulator records', () => {
	const sourceById = new Map(sources.map((source) => [source.id, source]));
	for (const company of companies) {
		const identity = company.data.regulatoryIdentity;
		const machine = JSON.parse(read(path.join(DIST, 'companies', `${company.id}.json`)));
		const html = read(path.join(DIST, 'companies', company.id, 'index.html'));
		if (!identity) {
			assert.equal(machine.regulatoryIdentity, undefined, `${company.id} machine identity snapshot drifted`);
			continue;
		}
		const identitySourceId = typeof identity.sourceId === 'string' ? identity.sourceId : identity.sourceId.id;
		const source = sourceById.get(identitySourceId);
		assert.ok(source, `${company.id} identity snapshot has no source record`);
		assert.equal(source.data.sourceType, 'regulator-record', `${company.id} identity snapshot is not a regulator record`);
		assert.ok(idsOf(company.data.sourceIds).includes(identitySourceId), `${company.id} identity source is not in the entity ledger`);
		assert.ok(machine.regulatoryIdentity, `${company.id} machine record omitted the identity snapshot`);
		assert.equal(machine.regulatoryIdentity.sourceId, identitySourceId, `${company.id} machine identity source drifted`);
		assert.ok(html.includes('Identity fields from the source record'), `${company.id} does not render the identity snapshot`);
		assert.ok(html.includes(`/sources/${identitySourceId}`), `${company.id} does not link the identity snapshot to its source page`);
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

/* ------------------------------------------------------------------ */
/* Motion and interaction budget                                      */
/* ------------------------------------------------------------------ */

test('the shared shell enforces Birch interaction and reduced-motion budgets', () => {
	const css = read(path.join(ROOT, 'src/styles/global.css'));
	const tokens = read(path.join(ROOT, 'src/styles/tokens.css'));
	const loadingMark = read(path.join(ROOT, 'src/components/BirchLoadingMark.astro'));
	const convergingMark = read(path.join(ROOT, 'src/components/MarkConverging.astro'));
	const budget = read(path.join(ROOT, 'MOTION-AND-A11Y-BUDGET.md'));

	assert.match(tokens, /--tap:\s*44px/, 'the shared tap target token moved below 44px');
	for (const token of ['--dur-1: 120ms', '--dur-2: 180ms', '--dur-3: 240ms', '--dur-4: 360ms']) {
		assert.ok(tokens.includes(token), `motion token is missing or changed: ${token}`);
	}

	/* These are the controls that were previously below the declared target on
	   desktop. Keep the assertion close to the source of truth instead of
	   relying on a single browser viewport to catch a CSS regression. */
	for (const [selector, pattern] of [
		['header navigation', /\.header-nav a, \.header-menu-trigger \{[\s\S]*?min-height:\s*var\(--tap\)/],
		['header search', /\.header-search input \{[\s\S]*?min-height:\s*var\(--tap\)/],
		['compact buttons', /\.btn-sm \{\s*min-height:\s*var\(--tap\)/],
		['segmented controls', /\.segmented button \{\s*\n?\s*min-height:\s*var\(--tap\)/],
		['tabs', /\.tablist \[role='tab'\] \{\s*\n?\s*min-height:\s*var\(--tap\)/],
	]) {
		assert.match(css, pattern, `${selector} no longer uses the shared tap target`);
	}

	const reduceStart = css.lastIndexOf('@media (prefers-reduced-motion: reduce)');
	assert.ok(reduceStart >= 0, 'global reduced-motion contract is missing');
	const reduced = css.slice(reduceStart);
	assert.match(reduced, /animation:\s*none\s*!important/, 'reduced motion only shortens animation instead of disabling it');
	assert.match(reduced, /transition:\s*none\s*!important/, 'reduced motion only shortens transitions instead of disabling them');
	assert.match(reduced, /\.header-menu\.is-open \.header-menu-panel \{\s*transform:\s*translate\(-50%, 0\) !important;/, 'reduced-motion menus do not preserve their open state');

	/* The loading marks may animate only inside an explicit no-preference media
	   query. The final mark remains available to readers who request less motion. */
	for (const [name, source] of [['BirchLoadingMark', loadingMark], ['MarkConverging', convergingMark]]) {
		const media = source.indexOf('@media (prefers-reduced-motion: no-preference)');
		const animation = source.indexOf('animation:');
		assert.ok(media >= 0 && animation > media, `${name} animation is not gated by no-preference`);
	}

	assert.match(budget, /minimum height for header navigation/, 'the interaction budget no longer documents the tap rule');
	assert.match(budget, /disables animation and transitions/, 'the motion budget no longer documents the reduced-motion rule');
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

test('Coverage Lens redaction preview stays local and states its limits', () => {
	const source = read(path.join(ROOT, 'src', 'pages', 'lens.astro'));
	const html = read(path.join(DIST, 'lens', 'index.html'));
	const privacySource = read(path.join(ROOT, 'src', 'pages', 'privacy.astro'));
	const privacyHtml = read(path.join(DIST, 'privacy', 'index.html'));
	assert.match(source, /id="lens-redaction"/);
	assert.match(source, /not a complete privacy filter/);
	assert.match(source, /coverage conclusion/);
	assert.match(source, /No upload before consent/);
	assert.match(source, /OCR, server storage, AI analysis/);
	assert.match(source, /redactedOutput\.textContent/);
	assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage)\b/);
	assert.doesNotMatch(source, /state\.innerHTML/);
	assert.ok(html.includes('Short excerpt for a local redaction preview'));
	assert.ok(html.includes('The text remains in this page only'));
	assert.ok(privacySource.includes('Coverage Lens is not document storage'));
	assert.ok(privacyHtml.includes('Lens selection stays local'));
});

test('company directory filtering is local and has an honest empty state', () => {
	const source = read(path.join(ROOT, 'src', 'pages', 'companies', 'index.astro'));
	const html = read(path.join(DIST, 'companies', 'index.html'));
	assert.match(source, /id="company-search"/);
	assert.match(source, /id="company-type"/);
	assert.match(source, /data-company-row/);
	assert.match(source, /id="company-filter-empty"/);
	assert.match(source, /coverageIdsByCompany/);
	assert.match(source, /company-row-signals/);
	assert.match(source, /Commons private preview/);
	assert.match(source, /row\.hidden =/);
	assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage)\b/);
	assert.ok(html.includes('Find an organization'));
	assert.ok(html.includes('No organization matches those filters'));
	assert.equal((html.match(/class="company-row-signals"/g) ?? []).length, companies.length, 'every organization row should expose record signals');
	assert.equal((html.match(/<span class="company-signal company-signal-community/g) ?? []).length, companies.length, 'every organization row should state community availability');
});

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

test('the about page keeps its accountless boundary true', () => {
	const about = read(path.join(DIST, 'about', 'index.html'));
	const formTags = [...about.matchAll(/<form\b[^>]*>/g)].map((match) => match[0]);

	/*
	 * /about says Birch Research collects nothing. The global header and the
	 * closed mobile panel both contain a search form, so "no form" would be the
	 * wrong check. What the page may contain is an explicit GET into /ask; no
	 * form may post, upload, or point at a third party.
	 */
	const accountless = (html) => {
		const forms = [...html.matchAll(/<form\b[^>]*>/g)].map((match) => match[0]);
		return (
			forms.length > 0 &&
			forms.every((tag) => /method="get"/i.test(tag) && /action="\/ask"/i.test(tag)) &&
			!/<form\b[^>]*method="post"/i.test(html) &&
			!/<input\b[^>]*type="file"/i.test(html)
		);
	};

	assert.equal(formTags.length, 2, `about changed its two accountless search controls: found ${formTags.length}`);
	assert.equal(accountless(about), true, 'about has a non-search submission or upload control');
	/* Prove the predicate is not vacuous by breaking a known-good tag. */
	assert.equal(accountless(about.replace('method="get"', 'method="post"')), false, 'boundary check would not catch a POST form');

	assert.match(about, /It collects nothing\./, 'about no longer states the collection boundary');
	assert.match(
		about,
		/Nothing on this site[\s\S]+reads from it, writes to it, or is trained on it\./,
		'about no longer states the BestAMS boundary',
	);
	assert.match(about, /research journey never requires a handoff\./, 'about no longer states the optional handoff boundary');
	assert.match(about, /does not mirror the feed/, 'about no longer states that the podcast feed is not mirrored');
	assert.match(about, /does not import transcripts as research pages/, 'about no longer states that transcripts are not imported');
	assert.ok(!about.includes('https://feeds.transistor.fm/'), 'about exposes the podcast feed as a fetched or embedded resource');
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

test('every company page keeps sourced, contextual, and community lanes separate', () => {
	const required = [
		'data-company-lane="coverage"',
		'data-company-lane="coverage-research"',
		'data-company-lane="financial"',
		'data-company-lane="community"',
		'id="forums"',
		'id="threads"',
		'id="experiences"',
		'id="official-responses"',
		'id="reviews"',
	];
	const hasCompanyShell = (html) => required.every((marker) => html.includes(marker));
	for (const company of companies) {
		const file = path.join(DIST, 'companies', company.id, 'index.html');
		assert.ok(fs.existsSync(file), `missing company page ${company.id}`);
		const html = read(file);
		assert.equal(hasCompanyShell(html), true, `${company.id} is missing a company-page lane`);
		assert.match(html, /No Birch financial score or conclusion/, `${company.id} exposes an unbounded financial lane`);
		assert.match(html, /Coverage research connected to this record/, `${company.id} does not expose its linked coverage lane`);
		assert.match(html, /not a current product catalog/, `${company.id} does not state the coverage-research boundary`);
		assert.match(html, /Reviews and ratings/, `${company.id} does not state the review boundary`);
		/* Prove the structural predicate can fail; a global footer or repeated heading
		   must not be enough to make this check pass. */
		assert.equal(hasCompanyShell(html.replace('id="forums"', 'id="forum"')), false, `${company.id} lane check is vacuous`);
		if (!COMMONS_READY) assert.ok(!html.includes(`href="${COMMUNITY_ORIGIN}`), `${company.id} links to closed Commons`);
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
		'BRAND-SYSTEM.md',
		'COMMONS.md',
		'COVERAGE-LENS-DATA-CONTRACT.md',
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

function ldNodes(html) {
	/*
	 * The pattern is built per call, and both reasons are real.
	 *
	 * It was a module-level `const` declared at this point in the file, which
	 * put it in the temporal dead zone for the tests above that call this
	 * helper: Node's runner starts a test body before module evaluation
	 * finishes, so "Cannot access 'LD_BLOCK' before initialization" was a race
	 * this machine won and CI lost. Every run on this branch failed on it and
	 * every local run passed.
	 *
	 * It also removes the footgun HANDOFF.md already records - a shared /g
	 * regex carries lastIndex between calls - so there is nothing to reuse and
	 * nothing to reset.
	 */
	const block = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
	const out = [];
	for (const match of html.matchAll(block)) {
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
	// The homepage also renders research cards, which may quote a source's
	// unrelated company telephone. Scope the visible-number check to the
	// agency's own tel link so adding a sourced company record cannot make this
	// estate-wide assertion compare two different organizations.
	const agencyTelLink = home.match(/<a href="tel:[^"]+"[^>]*>[\s\S]*?<\/a>/);
	const shown = agencyTelLink?.[0]?.match(/\(?[0-9]{3}\)?[ .-]?[0-9]{3}[ .-][0-9]{4}/) ?? null;
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

test('a coverage page and the tool on its line link each other', () => {
	/*
	 * Each specialty domain 301s to a module page, so that page is the front door
	 * for everyone arriving from bestcyberliability.com, bestepli.com and the rest.
	 * Seven of those front doors linked no reference page at all, and no reference
	 * page linked back, so the two halves of a line sat on the same site with
	 * nothing joining them: the tool that reads what you hold, and the sourced
	 * write-up of what the line is. A reader could exhaust one without learning
	 * the other existed, and the reference pages received no equity from the
	 * pages the domains actually point at.
	 *
	 * Asserted in both directions, on canonical line ids, because module lines and
	 * coverage lines are declared in different vocabularies and raw slug
	 * comparison reports written lines as unwritten.
	 */
	for (const module of modules.filter((m) => m.data.status === 'live')) {
		const matching = coverages.filter((c) => sharesLine(module.data.lines, [c.data.line]));
		if (matching.length === 0) continue;
		const tool = read(path.join(DIST, 'tools', module.id, 'index.html'));
		for (const coverage of matching) {
			assert.ok(
				tool.includes(`/insurance/${coverage.id}`),
				`/tools/${module.id} shares a line with ${coverage.id} but does not link it`,
			);
			const cov = read(path.join(DIST, 'insurance', coverage.id, 'index.html'));
			assert.ok(
				cov.includes(`/tools/${module.id}`),
				`/insurance/${coverage.id} shares a line with ${module.id} but does not link it`,
			);
		}
	}
});

test('every published figure is one a cited source actually states', () => {
	/*
	 * The figures page is the first surface of AMBITION.md layer 2, and its only
	 * claim to authority is that it introduces no numbers of its own. So the
	 * amount on each record must appear verbatim in a claim of one of that
	 * record's own sources, and that is checked rather than trusted.
	 *
	 * Matching is boundary-aware, because a plain substring test is wrong for
	 * currency in both directions. "$5,000" sits inside "$5,000,000", which
	 * grounded the household goods cargo minimum against the hazardous
	 * substance public liability minimum instead - a real mis-grounding this
	 * assertion was written after catching. But rejecting any adjacent comma is
	 * also wrong: the MICRA indexation claim reads "by 2 percent, beginning on
	 * January 1, 2034", where the comma is punctuation. So a comma or point
	 * counts as part of the number only when a digit sits on its far side.
	 */
	const groundedIn = (amount, claim) => {
		const numberish = (i, dir) => {
			if (i < 0 || i >= claim.length) return false;
			const c = claim[i];
			if (/\d/.test(c)) return true;
			const far = dir === 'before' ? claim[i - 1] : claim[i + 1];
			return /[,.]/.test(c) && /\d/.test(far ?? '');
		};
		for (let from = 0; ; ) {
			const i = claim.indexOf(amount, from);
			if (i === -1) return false;
			if (!numberish(i - 1, 'before') && !numberish(i + amount.length, 'after')) return true;
			from = i + 1;
		}
	};

	// Prove the matcher bites before trusting what it passes.
	assert.ok(groundedIn('$5,000', 'a limit of $5,000 per vehicle'), 'matcher rejects a real match');
	assert.ok(!groundedIn('$5,000', 'a limit of $5,000,000 per occurrence'), 'matcher accepts a truncated currency match');
	assert.ok(groundedIn('2 percent', 'adjusted by 2 percent, beginning on January 1, 2034'), 'matcher rejects a match followed by punctuation');

	const sourceById = new Map(sources.map((x) => [x.id, x]));
	const ungrounded = [];
	for (const figure of figures) {
		const d = figure.data;
		const claims = idsOf(d.sourceIds).flatMap((id) => sourceById.get(id)?.data.claims ?? []);
		if (!claims.some((c) => groundedIn(d.amount, c))) {
			ungrounded.push(`${figure.id}: "${d.amount}" appears in no claim of ${idsOf(d.sourceIds).join(', ')}`);
		}
	}
	assert.deepEqual(
		ungrounded,
		[],
		`a figure may not state an amount its own sources do not carry:\n  ${ungrounded.join('\n  ')}`,
	);
});

test('the figures page renders every figure, and its schedule is coherent', () => {
	/*
	 * A figure recorded but not rendered is worse than one not recorded: the
	 * corpus counts it and no reader can reach it.
	 */
	const html = read(path.join(DIST, 'figures', 'index.html'));
	for (const figure of figures) {
		assert.ok(
			html.includes(`id="${figure.id}"`),
			`/figures does not render ${figure.id}`,
		);
		assert.ok(
			html.includes(figure.data.amount.replace(/&/g, '&amp;')),
			`/figures does not show the amount for ${figure.id}`,
		);
	}

	const iso = /^\d{4}-\d{2}-\d{2}$/;
	for (const figure of figures) {
		const d = figure.data;

		// A scheduled figure that names no next move is not scheduled.
		if (d.basis === 'scheduled') {
			assert.ok(
				iso.test(d.nextMove),
				`${figure.id} is basis 'scheduled' but states no dated nextMove`,
			);
		}

		// A next move already in the past means the table is stale, which is the
		// one failure this page cannot survive.
		if (iso.test(d.nextMove)) {
			assert.ok(
				d.nextMove > TODAY,
				`${figure.id} says it next moves on ${d.nextMove}, which has passed: the figure needs re-reading`,
			);
		}

		if (iso.test(d.lastMoved) && iso.test(d.nextMove)) {
			assert.ok(
				d.lastMoved < d.nextMove,
				`${figure.id} last moved after it next moves`,
			);
		}
	}
});

test('the review queue names every source a record still rests on, and gets the arithmetic right', () => {
	/*
	 * The page states a saving - N source readings rather than M record-to-source
	 * dependencies - and a reader is entitled to have that be true. Both numbers
	 * are derived, so both are recomputed here from the records rather than
	 * trusted from the page.
	 *
	 * The load-bearing half is the disclosure: a source that is superseded,
	 * rescinded or never adopted, and that outstanding records still cite, has to
	 * be surfaced. A separate assertion already requires each such record to say
	 * so in its own text; this one requires the review surface to tell a reviewer
	 * where to look, which is a different failure.
	 */
	const html = read(path.join(DIST, 'review-queue', 'index.html'));

	const reviewable = [
		...questions.map((x) => ({ x, path: `/questions/${x.id}` })),
		...coverages.map((x) => ({ x, path: `/insurance/${x.id}` })),
		...examples.map((x) => ({ x, path: `/examples/${x.id}` })),
		...figures.map((x) => ({ x, path: `/figures#${x.id}` })),
		...states.map((x) => ({ x, path: `/states/${x.id}` })),
		...companies.map((x) => ({ x, path: `/companies/${x.id}` })),
	];

	// Which sources do records that are not signed off actually depend on?
	const dependents = new Map();
	const note = (sid, key) => {
		if (!dependents.has(sid)) dependents.set(sid, new Set());
		dependents.get(sid).add(key);
	};
	for (const { x, path: pth } of reviewable) {
		if (x.data.reviewState === 'reviewed') continue;
		for (const sid of idsOf(x.data.sourceIds)) note(sid, `${pth}#${x.id}`);
	}
	for (const m of modules.filter((m) => m.data.status === 'live')) {
		if (m.data.reviewState === 'reviewed') continue;
		const sids = new Set(idsOf(m.data.sourceIds));
		for (const r of m.data.rules) for (const sid of idsOf(r.sourceIds)) sids.add(sid);
		for (const sid of sids) note(sid, `/tools/${m.id}`);
	}

	assert.ok(dependents.size > 0, 'no outstanding record depends on any source, which cannot be right');

	// Every source that has moved and still carries an outstanding record must be
	// named on the page, by id.
	const movedAndDepended = [...dependents.keys()]
		.map((sid) => byIdMap.get(sid))
		.filter((src) => src && src.data.status !== 'active');

	const unnamed = movedAndDepended
		.filter((src) => !html.includes(src.id))
		.map((src) => `${src.id} [${src.data.status}]`);

	assert.deepEqual(
		unnamed,
		[],
		`/review-queue does not name sources that have moved and still carry outstanding records:\n  ${unnamed.join('\n  ')}`,
	);

	// And the stated saving has to be the real one.
	const totalDependencies = [...dependents.values()].reduce((n, set) => n + set.size, 0);
	assert.ok(
		html.includes(String(dependents.size)),
		`/review-queue does not state the source count (${dependents.size})`,
	);
	assert.ok(
		totalDependencies > dependents.size,
		'source-first ordering is only worth stating if it removes re-reading',
	);
});

test('no two source records describe the same document', () => {
	/*
	 * Six sections had been written up twice, each under two ids, because the
	 * same statute was added on two occasions and the two URLs differed only by
	 * a trailing dot. Both spellings resolve, so nothing looked broken. The
	 * damage was to the citation graph rather than to any page: two source
	 * pages for one law, a reverse dependency index split arbitrarily between
	 * them, and one sentence of statute holding two different claim addresses.
	 *
	 * Comparison is on the URL with trailing dots and case normalised away,
	 * because that is exactly the difference the duplicates hid behind. Query
	 * parameters are otherwise left alone: two genuinely different sections
	 * differ inside the query string, so normalising further would merge
	 * records that must stay apart.
	 */
	const normalise = (url) => url.trim().replace(/\.+$/, '').toLowerCase();
	const byUrl = new Map();
	for (const source of sources) {
		const key = normalise(source.data.url);
		if (!byUrl.has(key)) byUrl.set(key, []);
		byUrl.get(key).push(source.id);
	}

	const collisions = [...byUrl.entries()]
		.filter(([, ids]) => ids.length > 1)
		.map(([url, ids]) => `${ids.join(' and ')} both describe ${url}`);

	assert.deepEqual(
		collisions,
		[],
		`source records describing the same document:\n  ${collisions.join('\n  ')}`,
	);
});

test('no two source records carry the same title on the same host', () => {
	/*
	 * The URL comparison above deliberately leaves query strings alone, and says
	 * why: two genuinely different sections differ inside the query string. That
	 * left a hole and one pair sat in it. `usc-42-4012a` and `usc-42-4012a-2`
	 * were both 42 U.S.C. 4012a on uscode.house.gov, one addressed as
	 * `?req=(title:42 section:4012a edition:prelim)` and the other as
	 * `?req=granuleid:USC-prelim-title42-section4012a`. Same statute, same host,
	 * same access date, both primary law: two citable records for one law, and
	 * two published source pages with a byte-identical title.
	 *
	 * Title plus host closes the hole without touching the query string. Two
	 * records naming the same document on one publisher's host are the same
	 * document however they were addressed, and an identical title is the signal
	 * the URL comparison cannot see. It is also the signal a crawler sees, which
	 * is the second reason to hold it: duplicate titles on one origin.
	 *
	 * A genuinely distinct record must earn a distinct title. Where two records
	 * really do describe different things on one host, saying which in the title
	 * improves both rather than costing anything.
	 */
	const hostOf = (url) => {
		try {
			return new URL(url).host.toLowerCase();
		} catch {
			return url.trim().toLowerCase();
		}
	};
	const byTitleHost = new Map();
	for (const source of sources) {
		const key = `${hostOf(source.data.url)} ${source.data.title.trim().toLowerCase()}`;
		if (!byTitleHost.has(key)) byTitleHost.set(key, []);
		byTitleHost.get(key).push(source.id);
	}

	const sameTitle = [...byTitleHost.entries()]
		.filter(([, ids]) => ids.length > 1)
		.map(([key, ids]) => {
			const [host, title] = key.split(' ');
			return `${ids.join(' and ')} both publish "${title}" on ${host}`;
		});

	assert.deepEqual(
		sameTitle,
		[],
		`source records sharing a title on one host:\n  ${sameTitle.join('\n  ')}`,
	);
});

test('the manifest states the corpus jurisdictional scope, and states it truthfully', () => {
	/*
	 * The manifest said what this site is, what it refuses, and what it does not
	 * answer, and never once said where it applies. 54 of 79 questions are
	 * written for California and 132 of 286 source records are Californian, so a
	 * page about a line reads as national when it was written from one state's
	 * law. That is the inference this corpus most invites, and nothing was
	 * blocking it.
	 *
	 * The section is generated from the corpus rather than written in prose, and
	 * this holds it to that. A hand-edit that hard-codes a figure, or a corpus
	 * that grows past the numbers already published, fails here rather than
	 * quietly telling a reader something that stopped being true.
	 */
	const manifest = read(path.join(DIST, 'llms.txt'));
	assert.ok(
		manifest.includes('## Jurisdictional scope'),
		'llms.txt does not state the jurisdictional scope of the corpus',
	);

	const byState = {};
	for (const question of questions) {
		for (const state of question.data.states ?? []) byState[state] = (byState[state] ?? 0) + 1;
	}
	const ranked = Object.entries(byState).sort((a, b) => b[1] - a[1]);
	const notStateSpecific = questions.filter((q) => (q.data.states ?? []).length === 0).length;

	if (ranked.length > 0) {
		const [code, count] = ranked[0];
		assert.ok(
			manifest.includes(`Deepest jurisdiction: ${code}, with ${count} of ${questions.length} questions`),
			`llms.txt does not name the actual deepest jurisdiction. The corpus says ${code} with ${count} of ${questions.length}.`,
		);
	}

	assert.ok(
		manifest.includes(`Questions that are not state specific: ${notStateSpecific}.`),
		`llms.txt does not carry the real count of questions that are not state specific, which is ${notStateSpecific}.`,
	);

	// The sentence that does the actual work: absence is not equivalence.
	assert.ok(
		/holds no source for your state on that line\. It does not mean the rule is the same there\./.test(manifest),
		'llms.txt states the distribution without warning that a missing state is a gap rather than a match',
	);
});

test('a record citing a source that is no longer current says so', () => {
	/*
	 * Source records carry a status, and five of them are not `active`. Two
	 * published questions cited the EEOC 1999 vicarious liability guidance as
	 * current agency guidance while its own record said `superseded`, its page
	 * had carried a supersession notice since April 2024, and its replacement had
	 * been partly vacated and then rescinded. A walkthrough in this same corpus
	 * had set out that whole chain six days before those questions were written.
	 *
	 * So the failure was not that the facts were hard to find. They were already
	 * recorded here and nobody read them before citing. Nothing in the build
	 * noticed, because citing a source has never required reading its status.
	 *
	 * This makes it required. A record that cites a non-active source must name
	 * that status in its own text, in the vocabulary of the status itself: a
	 * superseded source needs the word, a rescinded one needs the word, a bill
	 * that never became law needs to say so. The point is disclosure to a reader
	 * rather than policing vocabulary, which is why each status accepts the
	 * phrasings a careful writer would actually reach for.
	 *
	 * A status with no disclosure pattern fails rather than passing quietly, so
	 * introducing a new status forces a decision about how it must be disclosed
	 * instead of silently exempting every record that cites it.
	 */
	const DISCLOSURE = {
		superseded: /supersed/i,
		rescinded: /rescind/i,
		withdrawn: /withdraw/i,
		repealed: /repeal/i,
		'not-adopted': /not adopted|never adopted|did not pass|was not enacted|not enacted|failed to pass/i,
	};

	const stale = new Map();
	for (const source of sources) {
		if (source.data.status && source.data.status !== 'active') stale.set(source.id, source.data.status);
	}

	const unknownStatus = [...new Set(stale.values())].filter((s) => !DISCLOSURE[s]);
	assert.deepEqual(
		unknownStatus,
		[],
		'source statuses with no disclosure pattern in this test. Add one, deciding how a citing record must disclose it:\n  ' +
			unknownStatus.join('\n  '),
	);

	const crossRules = collection('cross-rules');
	const citing = [
		['question', questions],
		['coverage', coverages],
		['module', modules],
		['cross-rule', crossRules],
		['example', examples],
		['tool', tools],
	];

	const silent = [];
	for (const [kind, records] of citing) {
		for (const record of records) {
			const text = JSON.stringify(record.data);
			for (const [id, status] of stale) {
				if (!text.includes(id)) continue;
				if (DISCLOSURE[status].test(text)) continue;
				silent.push(`${kind} ${record.id} cites ${id}, which is ${status}, without saying so`);
			}
		}
	}

	assert.deepEqual(
		silent,
		[],
		'records citing a source that is no longer current without disclosing it:\n  ' + silent.join('\n  '),
	);
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
		/* Figures share one route, so they are addressed by anchor. */
		...figures.map((f) => ['figures#', f]),
		/* Cross-rules were the third place this enumeration was written by hand
		   and the third place they were left out, so the assertion this test
		   makes was itself understating the backlog by fifteen records. They
		   evaluate on the position rather than on a page of their own, so they
		   are matched on their title rather than on a route. */
		...collection('cross-rules').map((r) => ['position', r]),
		/* Live worksheets, which had no review state at all until the tools
		   schema gained one. Matched on title: they route by their own
		   `route` field rather than by a collection segment. */
		...liveTools.map((t) => ['worksheet', t]),
	];

	for (const [segment, record] of expected) {
		if (record.data.reviewState === 'reviewed') continue;
		if (segment === 'position' || segment === 'worksheet') {
			const name = record.data.title || record.data.name;
			assert.ok(
				textOf(page).includes(name.replace(/\s+/g, ' ')),
				`the review queue omits ${segment} ${record.id}, which is not reviewed`,
			);
			continue;
		}
		const href = segment.endsWith('#') ? `/${segment}${record.id}` : `/${segment}/${record.id}`;
		assert.ok(
			page.includes(href),
			`the review queue omits ${segment}${record.id}, which is not reviewed`,
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

test('a field id shared across modules is one somebody decided to share', async () => {
	/*
	 * Agreeing on kind and options is necessary and it is not sufficient.
	 * `last-training-date` proved that: two modules declared it, both as `date`,
	 * both with no options, so the assertion above passed. The cyber module meant
	 * the last round of security awareness training, measured against the annual
	 * expectation in the CISA performance goals. The employment module meant the
	 * last harassment prevention session, measured against California's two-year
	 * interval and New York's one-year one. Two facts, two clocks, one id.
	 *
	 * Nothing rendered wrong, because every rule reading it lived inside one
	 * module. The hazard was the next cross-module rule: a finding that those two
	 * dates disagreed would have been nonsense, since they are supposed to
	 * differ, and it would have looked right to whoever wrote it.
	 *
	 * Comparing labels does not catch it. Four of the legitimate shares are
	 * worded differently in each module while asking for the same fact, and the
	 * two that collided were worded almost identically. So the check is not on
	 * the text: a shared id has to be a decision recorded in
	 * src/config/shared-fields.ts, saying what single fact it holds.
	 *
	 * The effect is that an id colliding with another module's fails here until
	 * somebody either renames it or states that the two really are one fact.
	 */
	const { SHARED_FIELDS, sharedField } = await import(
		new URL('../src/config/shared-fields.ts', import.meta.url).href
	);

	const byId = new Map();
	for (const module of modules) {
		for (const field of module.data.fields ?? []) {
			const defs = byId.get(field.id) ?? [];
			defs.push({ module: module.id, kind: field.kind });
			byId.set(field.id, defs);
		}
	}

	const undeclared = [];
	const wrongKind = [];
	for (const [id, defs] of byId) {
		if (defs.length < 2) continue;
		const declared = sharedField(id);
		if (!declared) {
			undeclared.push(`${id} is declared in ${defs.map((d) => d.module).join(' and ')}`);
			continue;
		}
		if (declared.kind !== defs[0].kind) {
			wrongKind.push(`${id} is registered as ${declared.kind} but declared as ${defs[0].kind}`);
		}
	}

	assert.deepEqual(
		undeclared, [],
		'field ids shared between modules without being registered in src/config/shared-fields.ts.\n' +
			'Either rename one of them, or add it there with a sentence saying what one fact it records:\n  ' +
			undeclared.join('\n  '),
	);
	assert.deepEqual(
		wrongKind, [],
		`shared fields whose registered kind does not match the modules:\n  ${wrongKind.join('\n  ')}`,
	);

	// A registration nobody uses is a claim about the corpus that is no longer true.
	const stale = SHARED_FIELDS.filter((f) => (byId.get(f.id) ?? []).length < 2).map(
		(f) => `${f.id} is registered as shared but is declared in fewer than two modules`,
	);
	assert.deepEqual(stale, [], `stale shared-field registrations:\n  ${stale.join('\n  ')}`);
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

test('every boundary the position page promises is a boundary the build enforces', async () => {
	/*
	 * /position prints what this instrument will not do and then says:
	 * "Enforced in code and in tests, not only in policy: every rule is
	 * validated at build time against this boundary."
	 *
	 * That sentence was two-thirds true. The promises were prose on the page and
	 * the guard was a flat phrase list in src/lib/position.ts, with nothing
	 * joining them, so two of the six promises were enforced by no phrase at all
	 * - "Assign a class code or any rating-bureau classification" and "Give you a
	 * risk score", the two DIRECTION.md treats as absolute. A seventh phrase
	 * group, refusing to tell somebody what to buy, was enforced with no promise
	 * printed anywhere: the same drift running the other way.
	 *
	 * This is the join. It fails if a promise appears on the page with no phrases
	 * behind it, or a phrase group exists with no promise in front of it.
	 */
	const { BOUNDARY } = await import('../src/lib/position.ts');
	const html = read(path.join(DIST, 'position', 'index.html'));

	const card = html.match(/It will not<\/h3>([\s\S]*?)<\/ul>/);
	assert.ok(card, '/position no longer prints an "It will not" card, so this check cannot run');
	const printed = [...card[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) =>
		m[1].replace(/<[^>]+>/g, '').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(),
	);
	assert.ok(printed.length >= 6, `the boundary card lists ${printed.length} promises, which is fewer than it had`);

	const unenforced = printed.filter(
		(line) => !BOUNDARY.some((entry) => line.startsWith(entry.promise)),
	);
	assert.deepEqual(
		unenforced,
		[],
		'/position promises these and no phrase in the guard enforces them, so a rule ' +
			`could say it and build: ${unenforced.join(' | ')}`,
	);

	const unpromised = BOUNDARY.filter(
		(entry) => !printed.some((line) => line.startsWith(entry.promise)),
	).map((entry) => entry.promise);
	assert.deepEqual(
		unpromised,
		[],
		`the build enforces these and /position never tells the reader: ${unpromised.join(' | ')}`,
	);

	for (const entry of BOUNDARY) {
		assert.ok(entry.phrases.length > 0, `"${entry.promise}" is promised and enforced by nothing`);
	}
});

test('every rule that reaches a reader is measured against the boundary, cross rules included', async () => {
	/*
	 * The fifteen cross-module rules render in the same open-item list as the 272
	 * module rules, through the same component and the same engine, and went
	 * through a validator that checked field resolution and module spanning and
	 * nothing else. None of them was over the line - this is a hole in the guard
	 * rather than a fault in the corpus - but the page's claim covers "every
	 * rule", so the check has to.
	 */
	const { boundaryBreaches, validateCrossRule } = await import('../src/lib/position.ts');

	const everyRule = [
		...modules.flatMap((m) => (m.data.rules ?? []).map((r) => [`${m.id}/${r.id}`, r])),
		...collection('cross-rules').map((r) => [`cross-rules/${r.id}`, r.data]),
	];
	assert.ok(everyRule.length > 250, `only ${everyRule.length} rules found, so this check covers too little`);

	const over = [];
	for (const [where, rule] of everyRule) {
		for (const phrase of boundaryBreaches(`${rule.title} ${rule.detail} ${rule.action}`)) {
			over.push(`${where}: "${phrase}"`);
		}
	}
	assert.deepEqual(over, [], `rules that state a verdict this instrument may not state:\n  ${over.join('\n  ')}`);

	/* And the cross-rule validator itself has to be the thing that catches it,
	   not this test standing in for it. */
	const breach = {
		id: 'probe',
		kind: 'gap',
		severity: 'high',
		modules: ['a', 'b'],
		title: 'Probe',
		detail: 'This is covered under the form you recorded.',
		action: 'Nothing.',
		when: { all: [] },
		sourceIds: [],
	};
	assert.ok(
		validateCrossRule(breach, []).some((x) => x.includes('crosses the boundary')),
		'validateCrossRule accepted a cross rule stating that a loss is covered',
	);
});

test('the position page ships every cross-module rule, cited', () => {
	/*
	 * The rules are validated and proven to fire elsewhere. This is the other
	 * half: that they actually reach the reader. A rule that resolves, spans
	 * modules and can fire but is never rendered does exactly nothing, and the
	 * payload is a separate wiring step that can be dropped without any test
	 * above noticing.
	 */
	const html = read(path.join(DIST, 'position', 'index.html'));
	const block = html.match(/id="position-cross-rules"[^>]*>([\s\S]*?)<\/script>/);
	assert.ok(block, '/position ships no cross-rule payload');

	const shipped = JSON.parse(block[1]);
	const onDisk = fs.readdirSync(path.join(CONTENT, 'cross-rules')).filter((f) => f.endsWith('.json'));
	assert.equal(
		shipped.length, onDisk.length,
		`${onDisk.length} cross rules exist but ${shipped.length} reach the page`,
	);

	for (const rule of shipped) {
		assert.ok(rule.modules.length >= 2, `${rule.id} reaches the page naming ${rule.modules.length} module(s)`);
		assert.ok(rule.sourceIds.length > 0, `${rule.id} reaches the page with no source`);
		assert.ok(
			!/\[S:/.test(rule.detail),
			`${rule.id} reaches the page with an unresolved citation marker`,
		);
	}
});

/* ------------------------------------------------------------------ */
/* Verification sheets                                                 */
/* ------------------------------------------------------------------ */

/*
 * The sheets are what makes sign-off tractable, so what is asserted here is
 * completeness rather than appearance. A sheet that omits a dependency is worse
 * than no sheet at all: a reviewer would sign a record off believing they had
 * seen everything resting on the document.
 *
 * Counted from the content files rather than from the library that renders the
 * sheets, so a bug in the extractor cannot agree with itself.
 */

const MARKER_G = /\[S:([a-z0-9][a-z0-9-]*)\]/g;

/** Collections whose records carry a reviewState, keyed as they are on disk. */
const REVIEWABLE = {
	questions,
	coverages,
	companies,
	states,
	examples,
	figures,
	modules,
	'cross-rules': collection('cross-rules'),
	/* Only live worksheets. An unbuilt entry carries no review fields by
	   schema refinement, publishes no items and cites nothing. */
	tools: liveTools,
};

/**
 * Every collection that publishes an assertion resting on a source, which is
 * wider than REVIEWABLE. The live worksheets declare sources and publish cited
 * sentences while carrying no reviewState at all, so they belong on the sheets
 * and cannot belong in the review count. Non-live tools declare no sources and
 * contribute nothing.
 */
const DEPENDENT = { ...REVIEWABLE, tools };

/** Whatever the record calls its title, in the order the site picks one. */
const titleOf = (data) =>
	data.question || data.name || data.title || data.label || data.shortName || data.legalName;

/** Rendered text with tags and entities removed, so a match is not a guess. */
const textOf = (html) =>
	html
		.replace(/<[^>]+>/g, ' ')
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
		.replace(/\s+/g, ' ');

const sheetPath = (id) => path.join(DIST, 'review-queue', id, 'index.html');

test('every source has a verification sheet that links the document', () => {
	for (const source of sources) {
		const file = sheetPath(source.id);
		assert.ok(fs.existsSync(file), 'no verification sheet for ' + source.id);
		const html = read(file);
		assert.ok(
			html.includes(source.data.url.replace(/&/g, '&amp;')),
			'the sheet for ' + source.id + ' does not link the document it exists to verify',
		);
		// Claim addresses are the first thing a reviewer confirms.
		assert.ok(
			html.includes(source.id + '#c1'),
			'the sheet for ' + source.id + ' shows no claim addresses',
		);
	}
});

test('the verification sheets are noindex, and out of the sitemap', () => {
	/*
	 * They reproduce prose whose canonical home is elsewhere on this origin.
	 * 299 sheets competing with the pages they quote for the same words would be
	 * the largest block of internal duplication here, and citability is the
	 * whole asset. Public, linked, and not indexed - the /design posture.
	 */
	for (const source of sources) {
		assert.match(
			read(sheetPath(source.id)),
			/<meta name="robots" content="noindex, nofollow">/,
			'the sheet for ' + source.id + ' is indexable',
		);
	}
	const xml = walk(DIST, (f) => /sitemap.*\.xml$/.test(f)).map(read).join('\n');
	assert.ok(!/\/review-queue\/[a-z0-9]/.test(xml), 'a verification sheet reached the sitemap');
	assert.ok(xml.includes('/review-queue<'), 'the review queue itself is missing from the sitemap');
});

test('every record-to-source dependency reaches the sheet for that source', () => {
	const expected = new Map();
	const note = (id, where) => {
		if (!expected.has(id)) expected.set(id, new Set());
		expected.get(id).add(where);
	};

	for (const [name, entries] of Object.entries(DEPENDENT)) {
		for (const entry of entries) {
			for (const [, id] of JSON.stringify(entry.data).matchAll(MARKER_G)) {
				note(id, name + '/' + entry.id);
			}
			for (const id of idsOf(entry.data.sourceIds)) note(id, name + '/' + entry.id);
			for (const rule of entry.data.rules ?? []) {
				for (const id of idsOf(rule.sourceIds)) note(id, name + '/' + entry.id);
			}
		}
	}

	const missing = [];
	for (const [id, wheres] of expected) {
		if (!fs.existsSync(sheetPath(id))) {
			missing.push(id + ': no sheet at all');
			continue;
		}
		const rendered = textOf(read(sheetPath(id)));
		for (const where of wheres) {
			const [name, record] = where.split('/');
			const entry = DEPENDENT[name].find((e) => e.id === record);
			const title = titleOf(entry.data).replace(/\s+/g, ' ');
			if (!rendered.includes(title)) missing.push(id + ' sheet omits ' + where);
		}
	}
	assert.deepEqual(missing, [], 'verification sheets are incomplete:\n' + missing.join('\n'));
});

test('the review queue counts every collection that carries a reviewState', () => {
	/*
	 * Two collections have now been added to this project and silently left out
	 * of everything that enumerates records - figures first, then cross-rules -
	 * so the queue understated the backlog and source pages reported no
	 * dependents. Both enumerations now read one list in review.ts. This is the
	 * check that makes the third omission fail loudly instead of quietly.
	 */
	const onDisk = fs
		.readdirSync(CONTENT, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name)
		.filter((name) => {
			/* `some`, not `every`. The tools collection is deliberately mixed:
			   live worksheets carry a review state and unbuilt specifications must
			   not. `every` silently excluded the whole collection from this check
			   the moment that became true. */
			const entries = collection(name);
			return entries.some((e) => typeof e.data.reviewState === 'string');
		});

	const queue = textOf(read(path.join(DIST, 'review-queue', 'index.html')));
	for (const name of onDisk) {
		assert.ok(
			Object.hasOwn(REVIEWABLE, name),
			name + ' carries a reviewState and is not in the list this suite checks',
		);
		for (const entry of collection(name)) {
			/* Only records that actually carry a state. The tools collection is
			   deliberately mixed: a live worksheet carries one, and an unbuilt
			   specification must not, so iterating the whole collection asserted
			   that thirteen roadmap entries should be in the review queue. */
			if (typeof entry.data.reviewState !== 'string') continue;
			const title = titleOf(entry.data).replace(/\s+/g, ' ');
			assert.ok(
				queue.includes(title),
				name + '/' + entry.id + ' carries a reviewState but does not reach /review-queue',
			);
		}
	}
});

test('a source cited in prose is filed as prose on that sheet, not as structural', () => {
	/*
	 * Record-level completeness is not enough, and this is why. On its first
	 * build the extractor tested each block with a global regex before
	 * matching each sentence, so lastIndex carried over and the earlier
	 * markers were lost - a question citing the MICRA statute three times in
	 * its own short answer was filed under "declared without a sentence
	 * pointing at it". The record still appeared on the sheet, so every test
	 * passed while the sheet told the reviewer the opposite of the truth.
	 *
	 * A dependency asserted in prose has to appear above the structural
	 * heading; one that is only declared has to appear below it.
	 */
	const STRUCTURAL_HEADING = 'Declared without a sentence pointing at it';
	const wrong = [];

	for (const [name, entries] of Object.entries(DEPENDENT)) {
		for (const entry of entries) {
			const json = JSON.stringify(entry.data);
			const inProse = new Set([...json.matchAll(MARKER_G)].map((m) => m[1]));
			const title = titleOf(entry.data).replace(/\s+/g, ' ');
			for (const id of inProse) {
				if (!fs.existsSync(sheetPath(id))) continue;
				const rendered = textOf(read(sheetPath(id)));
				const cut = rendered.indexOf(STRUCTURAL_HEADING);
				const prose = cut === -1 ? rendered : rendered.slice(0, cut);
				if (!prose.includes(title)) {
					wrong.push(id + ' sheet does not show ' + name + '/' + entry.id + ' as citing it in prose');
				}
			}
		}
	}
	assert.deepEqual(wrong, [], 'prose citations misfiled on a verification sheet:\n' + wrong.join('\n'));
});

/* ------------------------------------------------------------------ */
/* The /ask conversation thread                                        */
/* ------------------------------------------------------------------ */

/*
 * The thread keeps what a reader typed, so its storage choice is a privacy
 * property and not a preference. AI-RETRIEVAL-ARCHITECTURE.md states that
 * localStorage on this page holds a controlled vocabulary and never text, and
 * a durable record of what somebody asked in the middle of a denied claim -
 * possibly on a shared computer - is a real harm rather than a notional one.
 * So the thread lives in sessionStorage, and that is asserted against the
 * built bundle rather than trusted.
 */

const askScript = walk(
	path.join(DIST, '_astro'),
	(f) => /ask\.astro_astro_type_script.*\.js$/.test(f),
)[0];

test('the ask conversation is rendered, hidden until there is one, and says where it is kept', () => {
	const html = read(path.join(DIST, 'ask', 'index.html'));
	assert.match(html, /id="ask-thread-band"[^>]*hidden/, 'the thread band is not hidden by default');
	assert.ok(html.includes('id="ask-thread"'), '/ask has no thread list');
	assert.ok(html.includes('id="ask-thread-clear"'), '/ask offers no way to clear the conversation');

	// The reader is told the boundary in the same place the boundary applies.
	const text = textOf(html);
	assert.ok(text.includes('sessionStorage'), '/ask does not name where the conversation is kept');
	assert.ok(
		/gone when you close the tab/i.test(text),
		'/ask does not say the conversation is discarded with the tab',
	);
});

test('the ask conversation never reaches durable storage', () => {
	assert.ok(askScript, 'the ask client script was not emitted');
	const js = read(askScript);

	const bound = js.match(/(\w+)\s*=\s*[`'"]bir_ask_thread[`'"]/);
	assert.ok(bound, 'the thread storage key is not a bound literal, so this check cannot run');
	const v = bound[1];

	assert.ok(
		new RegExp(`sessionStorage\\.setItem\\(${v}\\b`).test(js),
		'the thread is not written to sessionStorage',
	);
	for (const op of ['setItem', 'getItem', 'removeItem']) {
		assert.ok(
			!new RegExp(`localStorage\\.${op}\\(${v}\\b`).test(js),
			`the thread reaches localStorage via ${op}, which would make what a reader asked durable`,
		);
	}

	/* And the one durable write on this page is still the controlled-vocabulary
	   context, not anything carrying text. */
	const ctx = js.match(/(\w+)\s*=\s*[`'"]bir_context[`'"]/);
	assert.ok(ctx, 'the context key is not a bound literal');
	assert.equal(
		(js.match(/localStorage\.setItem/g) || []).length,
		1,
		'/ask makes more than one durable write; only the filter context may be durable',
	);
	assert.ok(
		new RegExp(`localStorage\\.setItem\\(${ctx[1]}\\b`).test(js),
		'the single durable write on /ask is not the filter context',
	);
});

test('the ask conversation keeps a refusal a refusal', () => {
	/*
	 * The refusal path is the most important behaviour on this page and the
	 * easiest to lose when results start being kept: a history that records only
	 * successful turns reads as though the library answered everything. Every
	 * outcome the lookup can produce must be recordable as a turn.
	 */
	const js = read(askScript);
	for (const status of ['ok', 'insufficient', 'no-result']) {
		assert.ok(
			js.includes(`"${status}"`) || js.includes(`'${status}'`) || js.includes('`' + status + '`'),
			`the thread cannot record a ${status} turn`,
		);
	}
	assert.ok(
		/nothing in the library matched/i.test(js),
		'the thread has no wording for a turn that found nothing',
	);
	assert.ok(
		/related material only, not an answer/i.test(js),
		'the thread has no wording for a turn that found only background',
	);
});

test('every class the ask script renders at runtime has CSS that can actually reach it', () => {
	/*
	 * The bug this exists for is silent, which is the only reason it is worth a
	 * test. Astro scopes a component style block by appending its
	 * data-astro-cid to each selector, and elements built by a client script
	 * never carry that attribute - so a rule written as `.turn { ... }` compiles
	 * to `.turn[data-astro-cid-x]` and matches nothing. The first version of the
	 * conversation thread had a full style block that was entirely inert, the
	 * build was green, and only loading the page and reading a computed style
	 * showed it. The fix is to nest the rules under a server-rendered ancestor
	 * and mark the runtime classes :global(), which compiles to
	 * `.thread[data-astro-cid-x] .turn` - cid on the ancestor, not on the class.
	 *
	 * So: no class the script assigns may appear in this page's CSS with a cid
	 * attached to the class itself.
	 */
	const html = read(path.join(DIST, 'ask', 'index.html'));
	const js = read(askScript);

	/* The class names the script assigns, read out of the script rather than
	   listed here, so adding one to the renderer brings it under the check. */
	const rendered = new Set();
	for (const m of js.matchAll(/class="([a-z0-9 _-]+)"/g)) {
		for (const name of m[1].split(/\s+/)) if (name) rendered.add(name);
	}
	for (const m of js.matchAll(/`?turn-\$\{[^}]*\}`?/g)) void m; // template-built variants
	for (const variant of ['turn-ok', 'turn-insufficient', 'turn-no-result']) rendered.add(variant);

	assert.ok(rendered.size > 0, 'no runtime-rendered classes found in the ask script');

	const unreachable = [];
	for (const name of rendered) {
		const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		// A rule is reachable unless the cid is pinned to this class itself.
		if (new RegExp(`\\.${escaped}\\[data-astro-cid`).test(html)) unreachable.push(name);
	}
	assert.deepEqual(
		unreachable,
		[],
		`these /ask classes are rendered by the client but their CSS is scoped so it can never match them: ${unreachable.join(', ')}`,
	);

	/* And the thread rules must exist at all, or the check above passes vacuously. */
	assert.ok(
		/\.thread\[data-astro-cid-[a-z0-9]+\] \.turn\{/.test(html),
		'/ask has no reachable rule for a conversation turn',
	);
});

/* ------------------------------------------------------------------ */
/* The mark, and the assets that carry it                              */
/* ------------------------------------------------------------------ */

test('the supplied Birch assets are present and shared by both surfaces', () => {
	for (const rel of ['birch-bird-logo-transparent.png', 'birch-bird-transparent.png', 'birch-bird-32x32.png', 'favicon.ico']) {
		const file = path.join(DIST, rel);
		assert.ok(fs.existsSync(file), `${rel} is missing from the build`);
		assert.ok(fs.statSync(file).size > 64, `${rel} is unexpectedly empty`);
	}
	const home = read(path.join(DIST, 'index.html'));
	assert.ok(home.includes('src="/birch-bird-transparent.png"'), 'the home page does not use the supplied Birch mark');
});

test('the layout serves the accurate raster favicon package', () => {
	const html = read(path.join(DIST, 'ask', 'index.html'));
	assert.ok(
		html.includes('href="/birch-bird-32x32.png" type="image/png" sizes="32x32"'),
		'the layout does not serve the supplied 32px Birch favicon',
	);
	assert.ok(html.includes('href="/favicon.ico"'), 'the layout does not serve the supplied ICO fallback');
});

test('the loading state is the supplied mark and rests for a reader who asks', () => {
	const html = read(path.join(DIST, 'ask', 'index.html'));
	assert.match(html, /class="birch-loading-mark"[^>]*>\s*<img src="\/birch-bird-transparent\.png"/, '/ask does not render the supplied mark');
	assert.match(html, /@media\s*\(prefers-reduced-motion:\s*no-preference\)\{[^}]*birch-bird-breathe/, 'the mark animation is not behind prefers-reduced-motion');
	assert.ok(!html.includes('class="mc-dot"'), 'the retired traced-dot loading mark is still rendered');
});

test('no page animates behind a claim', () => {
	/*
	 * DIRECTION.md: nothing animates behind evidence. The loading mark belongs to
	 * /ask and nowhere else, so its presence on a page carrying a source ledger
	 * would be the rule being broken rather than bent.
	 */
	const offenders = [];
	for (const file of htmlFiles) {
		const route = routeOf(file);
		if (route === '/ask' || route.startsWith('/design')) continue;
		if (read(file).includes('class="mc-dot"')) offenders.push(route);
	}
	assert.deepEqual(offenders, [], `the loading animation appears outside /ask: ${offenders.join(', ')}`);
});

/* ------------------------------------------------------------------ */
/* The corrections log, and whether it is the whole log                */
/* ------------------------------------------------------------------ */

/*
 * /corrections calls itself the public log of every material correction. It
 * scanned corpus.questions alone, and the `correction` field existed only on
 * questions, so a correction made anywhere else could neither be recorded nor
 * displayed. That was invisible while every corrected record happened to be a
 * question, and became real the first time a source recheck corrected a module
 * rule. Both halves are fixed; these assert it stays fixed.
 */

test('every corrected record reaches the corrections log', () => {
	const page = textOf(read(path.join(DIST, 'corrections', 'index.html')));
	const missing = [];
	for (const [name, entries] of Object.entries(REVIEWABLE)) {
		for (const entry of entries) {
			if (entry.data.reviewState !== 'corrected') continue;
			const title = titleOf(entry.data).replace(/\s+/g, ' ');
			if (!page.includes(title)) missing.push(`${name}/${entry.id}`);
		}
	}
	assert.deepEqual(
		missing,
		[],
		`records are corrected but absent from the log that claims to hold every correction: ${missing.join(', ')}`,
	);
});

test('a corrected record says what changed, and an uncorrected one makes no such claim', () => {
	for (const [name, entries] of Object.entries(REVIEWABLE)) {
		for (const entry of entries) {
			const c = entry.data.correction;
			if (entry.data.reviewState === 'corrected') {
				assert.ok(c, `${name}/${entry.id} is corrected with no correction block`);
				assert.match(c.date, /^\d{4}-\d{2}-\d{2}$/, `${name}/${entry.id} correction has no ISO date`);
				assert.ok(c.was && c.was.length > 10, `${name}/${entry.id} does not say what it previously said`);
				assert.ok(c.now && c.now.length > 10, `${name}/${entry.id} does not say what it says now`);
				/* The prior wording has to survive, or the log is a rewrite. */
				assert.notEqual(c.was, c.now, `${name}/${entry.id} records an identical before and after`);
			} else {
				assert.ok(
					!c,
					`${name}/${entry.id} carries a correction block while its reviewState is ${entry.data.reviewState}`,
				);
			}
		}
	}
});

test('a rechecked source was returned to, not merely read once', () => {
	/*
	 * lastCheckedBasis is the field that stops the site overstating itself, so
	 * the two states are asserted in both directions: a recheck must carry a date
	 * later than the first read, and an access-basis source must not claim one.
	 * The five sources rechecked on 8 September were each re-read against the
	 * publisher's own page and every claim confirmed; one of them produced a
	 * correction, which is what the pass was for.
	 */
	let rechecked = 0;
	for (const source of sources) {
		const d = source.data;
		if (d.lastCheckedBasis === 'recheck') {
			rechecked++;
			assert.ok(
				d.lastChecked > d.accessedDate,
				`${source.id} claims a recheck dated ${d.lastChecked} but was first read ${d.accessedDate}`,
			);
			continue;
		}
		assert.equal(
			d.lastChecked,
			d.accessedDate,
			`${source.id} is access-basis but lastChecked (${d.lastChecked}) differs from accessedDate (${d.accessedDate}), which asserts a confirmation it does not have`,
		);
	}
	assert.ok(rechecked > 0, 'no source has ever been rechecked, so this check is vacuous');
});

test('nothing publishes citations without being reviewable', () => {
	/*
	 * The gap this closes: the tools collection had no reviewState and no
	 * reviewer, only a spec.reviewOwner, while three live worksheets published
	 * 85 citation markers on 29 source records. Fully published content that
	 * could not state whether anyone had checked it, and that no review queue
	 * could count. The inverse matters too - an unbuilt specification must not
	 * carry a review state, or the queue fills with records asserting nothing.
	 */
	for (const tool of tools) {
		const markers = (JSON.stringify(tool.data).match(/\[S:[a-z0-9-]+\]/g) || []).length;
		if (tool.data.status === 'live') {
			assert.ok(tool.data.reviewState, `live worksheet ${tool.id} states no reviewState`);
			assert.ok(tool.data.reviewer, `live worksheet ${tool.id} names no reviewer`);
			assert.ok(tool.data.author, `live worksheet ${tool.id} names no author`);
			continue;
		}
		assert.equal(
			markers,
			0,
			`${tool.id} is ${tool.data.status} but publishes ${markers} citations, so it needs a reviewer`,
		);
		assert.ok(
			!tool.data.reviewState,
			`${tool.id} is ${tool.data.status} and carries a reviewState, which puts a record asserting nothing into the queue`,
		);
	}

	/* And every citation-bearing collection is one the queue enumerates. */
	const cited = [];
	for (const name of fs.readdirSync(CONTENT, { withFileTypes: true })) {
		if (!name.isDirectory() || name.name === "sources") continue;
		const entries = collection(name.name);
		const markers = entries.reduce(
			(n, e) => n + (JSON.stringify(e.data).match(/\[S:[a-z0-9-]+\]/g) || []).length,
			0,
		);
		if (markers > 0) cited.push(name.name);
	}
	for (const name of cited) {
		assert.ok(
			Object.hasOwn(REVIEWABLE, name),
			`${name} publishes citations but is not a collection the review queue enumerates`,
		);
	}
});

/* ------------------------------------------------------------------ */
/* Dataset releases                                                    */
/* ------------------------------------------------------------------ */

/*
 * A release is frozen bytes committed to public/dataset, and the only thing
 * that makes it worth citing is that it stays that way. "Frozen" asserted in a
 * comment is a wish, so it is asserted here instead: the manifest must describe
 * the bytes actually on disk, and every checksum in the release must be
 * reproducible from the release's own claim text.
 *
 * The second assertion is the load-bearing one. cut-release.mjs computes claim
 * checksums with its own copy of the algorithm, because it runs outside Astro
 * and cannot import claimChecksum() from src/lib/machine.ts. Two copies of a
 * hash function is exactly the arrangement that drifts silently, and a drifted
 * checksum would invalidate every citation carrying one without failing
 * anything. This holds them to the same answer without requiring a frozen
 * release to track a corpus that has moved on.
 */
const DATASET = path.join(ROOT, 'public/dataset');
const releaseIds = fs.existsSync(DATASET)
	? fs
			.readdirSync(DATASET, { withFileTypes: true })
			.filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
			.map((e) => e.name)
			.sort()
	: [];

const releaseClaimChecksum = (text) =>
	createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 12);

test('a dataset release has been cut, and the index describes releases that exist', () => {
	assert.ok(releaseIds.length > 0, 'no dataset release exists in public/dataset');

	const indexFile = path.join(DATASET, 'releases.json');
	assert.ok(fs.existsSync(indexFile), 'public/dataset/releases.json is missing');
	const index = JSON.parse(read(indexFile));

	assert.equal(
		index.releases.length,
		releaseIds.length,
		'the release index and the release directories disagree on how many releases exist',
	);
	for (const entry of index.releases) {
		assert.ok(
			releaseIds.includes(entry.release),
			`the index lists release ${entry.release}, which has no directory`,
		);
	}
	assert.equal(
		index.latest,
		releaseIds[releaseIds.length - 1],
		'the index names a latest release that is not the newest one on disk',
	);
});

test('every dataset release is frozen: the manifest describes the bytes on disk', () => {
	for (const id of releaseIds) {
		const dir = path.join(DATASET, id);
		const manifest = JSON.parse(read(path.join(dir, 'manifest.json')));

		assert.equal(manifest.release, id, `manifest in ${id} names a different release`);
		assert.ok(manifest.schemaVersion >= 1, `release ${id} states no schema version`);
		assert.ok(manifest.files.length > 0, `release ${id} lists no files`);

		for (const entry of manifest.files) {
			const file = path.join(dir, entry.name);
			assert.ok(fs.existsSync(file), `release ${id} lists ${entry.name}, which is not there`);
			const bytes = fs.readFileSync(file);
			assert.equal(
				bytes.length,
				entry.bytes,
				`release ${id} file ${entry.name} is ${bytes.length} bytes, manifest says ${entry.bytes}`,
			);
			assert.equal(
				createHash('sha256').update(bytes).digest('hex'),
				entry.sha256,
				`release ${id} file ${entry.name} does not match its recorded digest, so the release has been edited after publication`,
			);
		}
	}
});

test('every claim checksum in a release is reproducible from that release', () => {
	for (const id of releaseIds) {
		const lines = read(path.join(DATASET, id, 'claims.jsonl'))
			.split('\n')
			.filter((l) => l.trim());
		assert.ok(lines.length > 0, `release ${id} publishes no claims`);

		const seen = new Set();
		for (const line of lines) {
			const row = JSON.parse(line);
			assert.equal(
				releaseClaimChecksum(row.text),
				row.checksum,
				`claim ${row.claimId} in release ${id} carries a checksum that does not match its own text`,
			);
			assert.ok(!seen.has(row.claimId), `claim ${row.claimId} appears twice in release ${id}`);
			seen.add(row.claimId);
			assert.match(
				row.claimId,
				/^[a-z0-9-]+#c\d+$/,
				`claim id ${row.claimId} in release ${id} is not a claim address`,
			);
		}
	}
});

test('the release checksum algorithm still agrees with the one the site publishes', () => {
	/*
	 * The site's own claim index is the reference. Only claims whose text is
	 * byte-identical in both are compared: a claim corrected since the release
	 * is supposed to differ, and asserting otherwise would forbid corrections.
	 */
	const live = JSON.parse(read(path.join(DIST, 'claims.json')));
	const liveById = new Map(live.claims.map((c) => [c.claimId, c]));

	let compared = 0;
	for (const id of releaseIds) {
		const lines = read(path.join(DATASET, id, 'claims.jsonl'))
			.split('\n')
			.filter((l) => l.trim());
		for (const line of lines) {
			const row = JSON.parse(line);
			const current = liveById.get(row.claimId);
			if (!current || current.text !== row.text) continue;
			compared += 1;
			assert.equal(
				current.checksum,
				row.checksum,
				`claim ${row.claimId} has identical text in release ${id} and on the site but a different checksum, so cut-release.mjs and claimChecksum() have drifted apart`,
			);
		}
	}
	assert.ok(compared > 0, 'no claim could be compared between a release and the live index');
});

test('a release states its review posture rather than reading as verified', () => {
	for (const id of releaseIds) {
		const manifest = JSON.parse(read(path.join(DATASET, id, 'manifest.json')));

		/* The counts a consumer needs to not over-trust the file. */
		assert.ok(manifest.reviewStatus, `release ${id} states no review posture`);
		assert.equal(
			typeof manifest.verification.sourcesRechecked,
			'number',
			`release ${id} does not say how many of its sources were re-read`,
		);
		assert.equal(
			manifest.verification.sourcesRechecked + manifest.verification.sourcesReadOnce,
			manifest.counts.sources,
			`release ${id} verification counts do not add up to its source count`,
		);
		assert.ok(
			manifest.mayNotBeInferred.length >= 5,
			`release ${id} carries fewer inference warnings than the live claim index does`,
		);
		assert.ok(
			manifest.immutability,
			`release ${id} does not tell a consumer that it is frozen`,
		);

		/* And the prohibited vocabulary never appears in a release header. */
		for (const word of ['rating', 'ranking', 'risk score']) {
			assert.ok(
				!manifest.description.toLowerCase().includes(`${word} of`),
				`release ${id} description reads as though it publishes a ${word}`,
			);
		}
	}
});

test('the old name survives only in the release that was frozen under it', () => {
	/*
	 * The property is Birch. The evidence layer is Birch Research, the community
	 * is Birch, and "BestInsurance Research" is what it was called before
	 * 9 September 2026.
	 *
	 * Exactly one thing keeps the old name, and it is not an oversight: the
	 * frozen dataset release. Its manifest promises immutability and its files
	 * are checksummed, so rewriting it to tidy a brand is precisely the thing
	 * that promise exists to prevent. A release is a historical artifact and
	 * reads as one - the suggested citation on /dataset names the publisher the
	 * release was actually published under, which is what a citation is for.
	 *
	 * Everything else carrying the old name is a leak, and there were 44 of them
	 * across 26 files at the rename, so the next one is likely to be missed the
	 * same way.
	 */
	const OLD = 'BestInsurance Research';

	/* Whatever the releases say is allowed to reach the reader through them. */
	const releaseText = walk(path.join(DIST, 'dataset'), (f) => f.endsWith('.json'))
		.map(read)
		.join('\n');
	assert.ok(
		releaseText.includes(OLD),
		'no frozen release carries the old name any more, so either a release was rewritten - ' +
			'which its own immutability promise forbids - or this check has stopped meaning anything',
	);

	let checked = 0;
	const leaks = [];
	for (const file of htmlFiles) {
		checked += 1;
		const html = read(file);
		if (!html.includes(OLD)) continue;
		/* On /dataset the old name is quoted from a release. Anywhere else, or in
		   any wording the releases do not contain, it is the rename leaking. */
		const route = routeOf(file);
		const quoted = route === '/dataset' || route.startsWith('/dataset/');
		if (!quoted) leaks.push(route);
	}
	assert.ok(checked > 800, `only ${checked} pages read, so this check covers less than the site`);
	assert.deepEqual(
		leaks,
		[],
		`these pages still carry the old name, which now belongs only to the frozen release: ${leaks.join(', ')}`,
	);

	/* And the new name is actually rendered, rather than the old one merely
	   deleted. A wordmark reading nothing would pass everything above. */
	const home = read(path.join(DIST, 'index.html'));
	assert.ok(home.includes('<strong>Birch</strong>'), 'the wordmark does not render the new name');
	assert.ok(
		/<title>[^<]*Birch Research/.test(home),
		'the home page title never names the property',
	);
});

test('the dataset page and the release files are in the build', () => {
	const page = path.join(DIST, 'dataset/index.html');
	assert.ok(fs.existsSync(page), '/dataset did not build');
	const html = read(page);

	const latest = releaseIds[releaseIds.length - 1];
	assert.ok(
		html.includes(`/dataset/${latest}/claims.jsonl`),
		'/dataset does not link the newest release claim file',
	);
	assert.ok(
		html.includes('"@type":"Dataset"') || html.includes('"@type": "Dataset"'),
		'/dataset publishes no Dataset node',
	);

	/* The frozen files have to survive the build, or the page links nothing. */
	for (const id of releaseIds) {
		for (const name of ['claims.jsonl', 'sources.json', 'manifest.json']) {
			assert.ok(
				fs.existsSync(path.join(DIST, 'dataset', id, name)),
				`release file ${id}/${name} is not in the build output`,
			);
		}
	}
	assert.ok(
		fs.existsSync(path.join(DIST, 'dataset/releases.json')),
		'the release index is not in the build output',
	);
});

test('the Dataset node points at frozen distributions, not at the live index', () => {
	/*
	 * /sources also carries a Dataset node, and its distributions are the live
	 * endpoints - which is correct there, because that node describes the corpus
	 * as it stands. The one on /dataset describes a release, so pointing it at a
	 * file that changes under the reader would be the exact failure this page was
	 * built to fix.
	 */
	const html = read(path.join(DIST, 'dataset/index.html'));
	const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
	assert.ok(match, '/dataset emits no JSON-LD');
	const parsed = JSON.parse(match[1]);
	const nodes = parsed['@graph'] || [parsed];
	const node = nodes.find((n) => n['@type'] === 'Dataset');
	assert.ok(node, '/dataset emits no Dataset node');

	const latest = releaseIds[releaseIds.length - 1];
	assert.equal(node.version, latest, 'the Dataset node names a version that is not the newest release');
	assert.ok(node.distribution.length > 0, 'the Dataset node offers no distribution');
	for (const dist of node.distribution) {
		assert.ok(
			dist.contentUrl.includes(`/dataset/${latest}/`),
			`the Dataset node offers ${dist.contentUrl}, which is not a frozen release file`,
		);
	}
});

test('a release is immutable at the HTTP layer too, not only in prose', () => {
	/*
	 * /dataset says a release is frozen and never changes. That is a promise
	 * about bytes, and the response headers are where a consumer or a CDN
	 * actually learns it. An immutable cache directive would be a lie on the
	 * live endpoints and is simply true here, which is the whole difference
	 * between the two surfaces.
	 */
	const vercel = JSON.parse(read(path.join(ROOT, 'vercel.json')));
	const rules = vercel.headers.filter((h) => h.source.startsWith('/dataset/'));
	assert.ok(rules.length >= 2, 'vercel.json carries no header rules for dataset releases');

	const values = rules.flatMap((r) => r.headers.map((h) => `${h.key}: ${h.value}`));
	assert.ok(
		values.some((v) => v.startsWith('Cache-Control') && v.includes('immutable')),
		'release files are not served immutable, so the freeze is only a claim on the page',
	);
	assert.ok(
		values.some((v) => v === 'Content-Type: application/x-ndjson; charset=utf-8'),
		'claims.jsonl is not served as ndjson, and nosniff means a consumer gets a download of unknown type',
	);

	/* The index is not frozen - it gains a row every time a release is cut. */
	for (const rule of rules) {
		assert.ok(
			!'/dataset/releases.json'.startsWith(rule.source.split(':')[0]) ||
				rule.source.includes(':version'),
			'the release index is covered by an immutable rule, but it changes with every release',
		);
	}
});

/* ------------------------------------------------------------------ */
/* The change feed                                                     */
/* ------------------------------------------------------------------ */

/*
 * /changed is assembled from fields on records rather than written, which is
 * the property worth protecting: there is no prose to fall out of date, but
 * there is a filter, and a filter is how a change silently stops appearing.
 * Every source that is not active, every source returned to, and every
 * published correction must reach the feed. A feed that quietly drops one is
 * worse than no feed, because it reads as an assertion that nothing moved.
 */
const changeFeed = JSON.parse(read(path.join(DIST, 'changed.json')));

test('every recorded change reaches the feed, and nothing else does', () => {
	const inFeed = new Set(changeFeed.recorded.map((c) => `${c.kind}:${c.url}`));

	for (const source of sources) {
		const url = `${SITE_ORIGIN}/sources/${source.id}`;
		if (source.data.status !== 'active') {
			const kind = source.data.status === 'not-adopted' ? 'not-adopted' : source.data.status;
			assert.ok(
				inFeed.has(`${kind}:${url}`),
				`${source.id} is ${source.data.status} but does not appear in the change feed`,
			);
		}
		if (source.data.lastCheckedBasis === 'recheck') {
			assert.ok(
				inFeed.has(`rechecked:${url}`),
				`${source.id} was rechecked but does not appear in the change feed`,
			);
		}
	}

	/* And the feed invents nothing: every entry resolves to a page in the build. */
	for (const entry of changeFeed.recorded) {
		const route = entry.url.replace(SITE_ORIGIN, '').split('#')[0];
		assert.ok(
			fs.existsSync(path.join(DIST, route.slice(1), 'index.html')) ||
				fs.existsSync(path.join(DIST, `${route.slice(1)}.html`)),
			`the change feed points at ${route}, which is not in the build`,
		);
	}
});

test('every published correction is in the change feed as well as the log', () => {
	/*
	 * /corrections and /changed read the same records through different
	 * functions, and the corrections page has already been wrong once by
	 * enumerating a subset. Two readers of one truth is fine; two readers that
	 * disagree is the bug.
	 */
	const corrected = [];
	for (const name of Object.keys(REVIEWABLE)) {
		for (const entry of collection(name)) {
			if (entry.data.reviewState === 'corrected' && entry.data.correction) corrected.push(entry);
		}
	}
	const feedCorrections = changeFeed.recorded.filter((c) => c.kind === 'corrected');
	assert.equal(
		feedCorrections.length,
		corrected.length,
		`${corrected.length} records are corrected but the change feed carries ${feedCorrections.length}`,
	);
});

test('the change feed keeps its two date bases apart', () => {
	/*
	 * The misreading this endpoint invites is treating our filing date as the
	 * date an event occurred. Every entry therefore carries dateBasis, and the
	 * two vocabularies are disjoint by construction.
	 */
	for (const entry of changeFeed.recorded) {
		assert.equal(entry.dateBasis, 'recorded', `recorded change ${entry.url} claims a different date basis`);
		assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/, `recorded change ${entry.url} has no ISO date`);
	}
	for (const entry of changeFeed.scheduled) {
		assert.equal(entry.dateBasis, 'instrument', `scheduled change ${entry.label} claims a different date basis`);
		assert.ok(
			entry.date > TODAY,
			`${entry.label} is listed as scheduled but its date ${entry.date} has passed; it belongs in scheduledMovesAlreadyPassed`,
		);
	}
	assert.ok(
		changeFeed.mayNotBeInferred.some((line) => /dateBasis/.test(line)),
		'the feed does not warn against reading the recorded date as the event date',
	);
});

test('the change feed publishes no amount its figure record does not state', () => {
	/*
	 * A scheduled increase is the most tempting place on this site to compute a
	 * number: the instrument gives a start, a step and a count, so the operative
	 * amount is one multiplication away. DIRECTION.md forbids publishing a figure
	 * the source did not state, and several of these are exactly that case - the
	 * figure records carry the arithmetic in a hedged note precisely because the
	 * statute does not print it. So the feed may only echo `amount` verbatim.
	 */
	const amountById = new Map(figures.map((f) => [f.id, f.data.amount]));
	for (const entry of changeFeed.scheduled) {
		const id = entry.url.split('#')[1];
		assert.ok(amountById.has(id), `scheduled change points at figure ${id}, which does not exist`);
		assert.equal(
			entry.amountToday,
			amountById.get(id),
			`the feed states ${entry.amountToday} for ${id} but the figure record says ${amountById.get(id)}`,
		);
	}

	/* Nothing on the page may present a computed future amount as published. */
	const html = read(path.join(DIST, 'changed/index.html'));
	assert.ok(
		html.includes('We do not compute what the new amount will be'),
		'/changed does not state that it declines to compute a scheduled amount',
	);
});

test('every figure with a scheduled move is either ahead of us or flagged overdue', () => {
	/* The filter that keeps a past date out of the scheduled list is the same
	   filter that could hide a stale figure entirely. Each one lands in exactly
	   one of the two buckets, and the page shows the second. */
	const scheduled = new Set(changeFeed.scheduled.map((s) => s.url.split('#')[1]));
	const overdue = new Set(changeFeed.scheduledMovesAlreadyPassed.map((s) => s.url.split('#')[1]));
	for (const figure of figures) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(figure.data.nextMove || '')) continue;
		const inOne = scheduled.has(figure.id) !== overdue.has(figure.id);
		assert.ok(
			inOne,
			`figure ${figure.id} names a move date and is in ${scheduled.has(figure.id) ? 1 : 0} + ${overdue.has(figure.id) ? 1 : 0} buckets, not exactly one`,
		);
	}
});

test('/changed says it is a record of what we recorded, not of what happened', () => {
	const html = read(path.join(DIST, 'changed/index.html'));
	assert.ok(
		html.includes('This is what we have recorded, not what has happened'),
		'/changed does not disclaim the completeness a change feed implies',
	);
	assert.ok(
		/A recorded change is dated by when we recorded it/.test(html),
		'/changed does not explain that its recorded dates are filing dates',
	);
	/* The page is a feed of movement, not a verdict on any of it. */
	for (const banned of ['should have been paid', 'we recommend', 'best carrier']) {
		assert.ok(!html.toLowerCase().includes(banned), `/changed contains prohibited language: ${banned}`);
	}
});

/* ------------------------------------------------------------------ */
/* Machine companions                                                  */
/* ------------------------------------------------------------------ */

/*
 * llms.txt tells every AI system reading this site: "Every substantive page has
 * a machine-readable JSON companion at the same path plus .json. Prefer it over
 * scraping the HTML."
 *
 * That sentence has now been false twice. It was false for 244 source pages
 * until source companions were built, and it was false again for 88 pages -
 * every guide, every line hub, every module, every worksheet and the figures
 * table - because those page types were added afterwards and the promise was
 * never re-read against them. `toolRecord()` sat in machine.ts the whole time,
 * written and never routed.
 *
 * Twice is a pattern, and the fix for a pattern is not a third careful pass. It
 * is this: enumerate the record pages in the build and require a companion for
 * each. A new page type now fails here on the day it is added, which is the
 * only moment the omission is cheap.
 */

/**
 * Route segments whose child pages are RECORD pages - one page, one record,
 * citing sources. Their index pages are hubs and are correctly companion-less;
 * llms.txt lists those separately as entry points rather than as citable units.
 */
const RECORD_SECTIONS = [
	'questions',
	'insurance',
	'guides',
	'lines',
	'companies',
	'states',
	'examples',
	'sources',
	'tools',
];

/** Single pages that are records in their own right. */
const RECORD_PAGES = ['figures'];

test('every record page has the JSON companion llms.txt promises', () => {
	const missing = [];

	for (const section of RECORD_SECTIONS) {
		const dir = path.join(DIST, section);
		if (!fs.existsSync(dir)) continue;
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			/* dist/<section>/<slug>/index.html is a record page; the section's own
			   index.html is the hub and is excluded by being a file, not a dir. */
			if (!entry.isDirectory()) continue;
			if (!fs.existsSync(path.join(dir, entry.name, 'index.html'))) continue;
			if (!fs.existsSync(path.join(dir, `${entry.name}.json`))) {
				missing.push(`/${section}/${entry.name}`);
			}
		}
	}

	for (const page of RECORD_PAGES) {
		if (fs.existsSync(path.join(DIST, page, 'index.html')) && !fs.existsSync(path.join(DIST, `${page}.json`))) {
			missing.push(`/${page}`);
		}
	}

	assert.deepEqual(
		missing,
		[],
		`${missing.length} record pages have no JSON companion, so llms.txt overstates what this site offers: ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ', …' : ''}`,
	);
});

test('every companion is valid JSON and says what kind of record it is', () => {
	const companions = [];
	for (const section of [...RECORD_SECTIONS]) {
		const dir = path.join(DIST, section);
		if (!fs.existsSync(dir)) continue;
		for (const file of fs.readdirSync(dir)) {
			if (file.endsWith('.json')) companions.push(path.join(dir, file));
		}
	}
	companions.push(path.join(DIST, 'figures.json'));

	assert.ok(companions.length > 300, `only ${companions.length} companions found, which is fewer than the corpus has record pages`);

	for (const file of companions) {
		const body = JSON.parse(read(file));
		const where = path.relative(DIST, file);
		assert.ok(body.recordType, `${where} does not say what kind of record it is`);
		assert.ok(body.canonicalUrl, `${where} carries no canonical URL`);
		assert.ok(body.contentVersion, `${where} carries no content version`);

		/* A companion must point at the page it belongs to, not at a neighbour.
		   A copy-pasted route that keeps the wrong path is the failure this
		   catches, and nothing else would. */
		const expected = `/${where.replace(/\.json$/, '')}`;
		if (body.recordType !== 'claim-index' && body.recordType !== 'change-feed') {
			assert.ok(
				body.canonicalUrl.endsWith(expected),
				`${where} claims to be ${body.canonicalUrl}, which is not the page it sits beside`,
			);
		}
	}
});

test('a guide says it is the same evidence as its coverage page', () => {
	/*
	 * A guide is generated one-for-one from a coverage record: same sources, same
	 * claims. A system that read both and counted them as two would be
	 * double-counting one reading of one set of documents, which is the
	 * corroboration error this corpus most invites. Saying so in the record is
	 * the only defence; it cannot be inferred from an identical source list.
	 */
	const dir = path.join(DIST, 'guides');
	const guides = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
	assert.ok(guides.length > 0, 'no guide companions were built');

	for (const file of guides) {
		const body = JSON.parse(read(path.join(dir, file)));
		const slug = file.replace(/\.json$/, '');
		assert.ok(
			body.sameEvidenceAs?.endsWith(`/insurance/${slug}`),
			`${file} does not name the coverage page it duplicates`,
		);
		assert.match(body.doNotDoubleCount, /count one reading twice/i, `${file} does not warn against double counting`);
	}
});

test('a module companion publishes its rules and states that nothing is submitted', () => {
	const dir = path.join(DIST, 'tools');
	const modules = fs
		.readdirSync(dir)
		.filter((f) => f.endsWith('.json'))
		.map((f) => JSON.parse(read(path.join(dir, f))))
		.filter((body) => body.recordType === 'module');

	assert.ok(modules.length > 0, 'no module companions were built');
	for (const body of modules) {
		assert.ok(body.ruleCount > 0, `${body.id} publishes no rules`);
		assert.equal(body.rules.length, body.ruleCount, `${body.id} states a rule count it does not publish`);
		assert.match(
			body.privacy,
			/no server copy/i,
			`${body.id} does not state that nothing a reader enters is transmitted`,
		);
		/* Citation markers are stripped from prose in a companion, as everywhere. */
		assert.ok(
			!JSON.stringify(body.rules).includes('[S:'),
			`${body.id} leaks raw citation markers into its machine record`,
		);
	}
});

test('the figures companion quotes amounts and computes none', () => {
	const body = JSON.parse(read(path.join(DIST, 'figures.json')));
	const source = collection('figures');
	assert.equal(body.count, source.length);

	const byId = new Map(source.map((f) => [f.id, f.data]));
	for (const row of body.figures) {
		assert.equal(
			row.amount,
			byId.get(row.id)?.amount,
			`${row.id} publishes an amount its figure record does not state`,
		);
		/* The hedge travels with the number. Several of these are stepped
		   schedules whose operative value is arithmetic rather than printed. */
		assert.ok(row.note, `${row.id} publishes an amount with no note`);
	}
	assert.ok(
		body.mayNotBeInferred.some((line) => /did not state/.test(line)),
		'the figures companion does not warn against calculating an amount from a schedule',
	);
});

/* ------------------------------------------------------------------ */
/* Excerpts                                                            */
/* ------------------------------------------------------------------ */

/*
 * Prose severed mid-word is the single most recognisable tell of a page
 * assembled by a program that never read it, and this site shipped six of them
 * above the fold on the homepage plus one in every meta description. On a
 * property whose whole argument is that a person checked this, that texture
 * costs more than it looks like it should.
 *
 * It is also an editorial fault rather than a cosmetic one. DIRECTION.md holds
 * that a hedge is the finding - often, may, commonly, depends on the policy
 * form - and a cut at an arbitrary character strips hedges silently and at
 * scale. "Generally covered, unless the form excludes earth movement" cut at
 * the comma is not a shorter version of that sentence.
 */

test('no page cuts prose at an arbitrary character', () => {
	/*
	 * The rule, not the instance. Twenty-one call sites did this and fixing them
	 * one by one fixes nothing durable, because the next card added does it
	 * again - it is the obvious thing to write. `excerpt()` and
	 * `metaDescription()` are the only sanctioned way to shorten a passage.
	 */
	const pages = walk(path.join(ROOT, 'src'), (f) => /\.(astro|ts)$/.test(f));
	const offenders = [];

	for (const file of pages) {
		if (file.endsWith('lib/excerpt.ts')) continue;
		const body = read(file)
			.replace(/\/\*[\s\S]*?\*\//g, '')
			.replace(/^\s*\/\/.*$/gm, '');

		for (const match of body.matchAll(/\.slice\(0,\s*(\d+)\)(\s*\.\w+\()?/g)) {
			const budget = Number(match[1]);
			/* Short slices are dates (10), checksums (12) and years (4). A slice of
			   40 or more is being applied to a sentence - unless what follows is an
			   array method, in which case it is taking the first N of a list, which
			   is fine and common. Strings have none of these. */
			const follows = match[2] ?? '';
			if (/\.(map|filter|forEach|join|reverse|sort|flatMap|some|every|reduce)\($/.test(follows)) continue;
			if (budget >= 40) offenders.push(`${path.relative(ROOT, file)} slice(0, ${budget})`);
		}
	}

	assert.deepEqual(
		offenders,
		[],
		`prose is being cut at a character count, which severs words and can strip a hedge. Use excerpt() or metaDescription(): ${offenders.join(', ')}`,
	);
});

test('an excerpt never ends mid-word', () => {
	const corpus = [
		...questions.map((q) => q.data.shortAnswer),
		...collection('coverages').map((c) => c.data.definition),
		...collection('states').map((s) => s.data.summary),
		...collection('examples').map((e) => e.data.whatHappened),
	].filter(Boolean);

	assert.ok(corpus.length > 50, 'not enough real prose to test against');

	for (const budget of [155, 170, 190, 210, 230]) {
		for (const raw of corpus) {
			const text = raw.replace(/\[S:[a-z0-9-]+\]/g, '').replace(/\s+/g, ' ').trim();
			const short = excerpt(text, budget);
			if (short === text) continue;

			/* Either it ends a sentence, or it ends with an ellipsis after a whole
			   word. Nothing else is allowed. */
			const endsCleanly = /[.!?][")\]”]?$/.test(short) || short.endsWith('…');
			assert.ok(endsCleanly, `excerpt at ${budget} ended badly: "…${short.slice(-60)}"`);

			if (short.endsWith('…')) {
				const stem = short.slice(0, -1);
				/*
				 * A whole word was taken if the next character in the original is not
				 * itself a word character. Whitespace is the usual case; punctuation
				 * is the other, because a trailing comma is deliberately stripped -
				 * "the policy,…" reads as a transcription error rather than an
				 * abridgement, and the word before it is still whole.
				 */
				const next = text[stem.length] ?? ' ';
				assert.ok(
					!text.startsWith(stem) || !/[A-Za-z0-9]/.test(next),
					`excerpt at ${budget} cut inside a word: "…${short.slice(-40)}"`,
				);
			}
		}
	}
});

test('an excerpt is a prefix of what it shortens, so it invents nothing', () => {
	for (const q of questions.slice(0, 40)) {
		const text = q.data.shortAnswer.replace(/\[S:[a-z0-9-]+\]/g, '').replace(/\s+/g, ' ').trim();
		const short = excerpt(text, 170).replace(/…$/, '');
		assert.ok(
			text.startsWith(short),
			`the excerpt for ${q.id} is not a prefix of the answer, so it has changed the words`,
		);
	}
});

test('a legal citation is not mistaken for the end of a sentence', () => {
	const cases = [
		['For flood, 42 U.S.C. 4012a requires it.', 1],
		['Amended by Stats. 2022, Ch. 17, Sec. 3 (AB 35).', 1],
		['See 26 C.F.R. 54.4980H-5(e)(2) for the denominator.', 1],
		['Civil Code section 1798.82 is the section. It was amended.', 2],
		['It took effect January 1, 2023. That replaced the flat limit.', 2],
	];
	for (const [text, expected] of cases) {
		assert.equal(
			sentences(text).length,
			expected,
			`"${text}" split into ${sentences(text).length} sentences, expected ${expected}`,
		);
	}
});

test('every meta description is whole and within what a search engine shows', () => {
	/*
	 * The description is the first thing anybody sees of this site, often before
	 * they see the site at all. One that stops mid-clause reads as a broken page
	 * from the search results.
	 */
	let checked = 0;
	for (const file of htmlFiles) {
		const html = read(file);
		const match = html.match(/<meta name="description" content="([^"]*)"/);
		if (!match) continue;
		const description = match[1]
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&amp;/g, '&');
		if (!description) continue;

		const where = routeOf(file);
		/*
		 * By route, not by the robots meta. A preview build stamps noindex on
		 * every page, so skipping noindex pages would make this assert nothing at
		 * all in the preview job - the vacuous-test failure this codebase keeps
		 * finding. These three are never search results in either posture: /404,
		 * the noindex verification sheets, and the internal design references.
		 */
		if (where === '/404' || where.startsWith('/review-queue/') || where.startsWith('/design/')) continue;
		checked += 1;

		assert.ok(
			/[.!?][")\]”]?$/.test(description) || description.endsWith('…'),
			`${where} has a description that stops mid-sentence: "…${description.slice(-70)}"`,
		);
		assert.ok(
			description.length <= 320,
			`${where} has a ${description.length}-character description, which is well past what any engine shows`,
		);
		/*
		 * And a floor. The sentence rule returns the first sentence, and several
		 * answers here open with the whole answer in two words - "Very little.",
		 * "Generally no." That is exactly right on a card and useless as a search
		 * result, and twelve pages shipped one before audit:onpage caught it. The
		 * suite should not have needed the audit to find that.
		 */
		assert.ok(
			description.length >= 50,
			`${where} has a ${description.length}-character description: "${description}". Too short to tell anybody anything in a search result.`,
		);
	}

	assert.ok(checked > 400, `only ${checked} descriptions were checked, so this test has quietly stopped covering the site`);
});

test('a written page names both its author and its reviewer, and an assembled one says it has neither', () => {
	/*
	 * /methodology claims drafting and review are separate functions and both are
	 * named. That was false in two different ways at once, which is why it needed
	 * measuring rather than reading: guides named a reviewer and no author,
	 * although the coverage record they are generated from carries both; and
	 * /changed, /figures, /dataset and the line indexes named neither.
	 *
	 * The two are not the same fault. The guides were a gap with the answer in
	 * hand. The assembled pages are correct to name nobody - attributing a feed
	 * built from record fields to a person would be the opposite lie - so the
	 * sentence was made precise instead, and this holds both halves of it.
	 */
	const ASSEMBLED = ['/changed', '/figures', '/dataset'];
	const visible = (html) =>
		html
			.replace(/<script[\s\S]*?<\/script>/g, '')
			.replace(/<style[\s\S]*?<\/style>/g, '')
			.replace(/<[^>]+>/g, ' ')
			.replace(/\s+/g, ' ');

	/* Every written record page names both roles. */
	for (const section of ['insurance', 'questions', 'guides', 'examples', 'states', 'companies']) {
		const dir = path.join(DIST, section);
		if (!fs.existsSync(dir)) continue;
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			const file = path.join(dir, entry.name, 'index.html');
			if (!fs.existsSync(file)) continue;
			const text = visible(read(file));
			/* \b on both sides: a loose /Author/ matches "California Earthquake
			   Authority" and reported a byline that was not there. */
			assert.match(text, /\bAuthor\b/, `/${section}/${entry.name} names no author`);
			assert.match(text, /\bReviewer\b/, `/${section}/${entry.name} names no reviewer`);
		}
	}

	/* And an assembled page names none, so the claim stays true by being narrow
	   rather than by being unchecked. */
	for (const route of ASSEMBLED) {
		const file = path.join(DIST, route.slice(1), 'index.html');
		if (!fs.existsSync(file)) continue;
		const text = visible(read(file));
		assert.ok(
			!/\bAuthor\b/.test(text),
			`${route} names an author, but it is assembled from records rather than written by anybody`,
		);
	}

	/* The page making the claim says which kind is which. */
	const methodology = visible(read(path.join(DIST, 'methodology/index.html')));
	assert.match(
		methodology,
		/assembled rather than written/,
		'/methodology claims both are named on every page without excepting the pages nobody wrote',
	);
});
