/**
 * On-page authority audit over the built site.
 *
 * `verify.mjs` asserts the corpus is coherent. This asks a different question:
 * whether every page the build produces carries the signals that let a crawler
 * or an answer engine treat it as the authority on its subject. A correct
 * absolute canonical, a unique title, a real meta description, valid structured
 * data, and at least one internal link pointing at it.
 *
 * It is checked in because the first hand-written version of it reported four
 * problems and three of them were its own fault:
 *
 *   apostrophes   Extracting the description with a regex whose closing
 *                 delimiter was the class ["'] truncated every description at
 *                 the first apostrophe in the prose. A 300-character
 *                 description on the contractor bond question was reported as
 *                 31 characters, and sixteen pages were reported thin when
 *                 none were. Attribute values are now read delimiter-aware.
 *
 *   noindex       Two /design/* pages were reported as missing structured data
 *                 and as orphans. Both carry `noindex, nofollow` and both are
 *                 excluded from the sitemap by explicit config, which is the
 *                 correct handling for an internal gallery. Pages that opt out
 *                 of indexing are now skipped rather than flagged.
 *
 *   the root      `dist/index.html` has no directory segment before it, so
 *                 stripping `/index.html` left the home page addressed as
 *                 `/index.html` and permanently orphaned. Normalised.
 *
 * The one real finding survived all three: two source records publishing a
 * byte-identical title on one host, which turned out to be two citable records
 * for one section of the U.S. Code. `verify.mjs` now holds that as an assertion
 * so it cannot recur, which is the right home for it. This script stays for the
 * signals that can only be seen once the HTML exists.
 *
 * Usage:
 *   npm run audit:onpage
 *   npm run audit:onpage -- --json
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'dist';
const ORIGIN = (process.env.PUBLIC_SITE_ORIGIN || 'https://bestinsuranceresearch.com').replace(/\/$/, '');
const MIN_DESCRIPTION = 50;
const asJson = process.argv.includes('--json');

if (!existsSync(ROOT)) {
	console.error(`no ${ROOT}/ to audit. Run npm run build first.`);
	process.exit(2);
}

function walk(dir, out = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, entry.name);
		if (entry.isDirectory()) walk(p, out);
		else if (entry.name === 'index.html') out.push(p);
	}
	return out;
}

/** Read one attribute off a tag, respecting whichever quote style it used. */
function attr(tag, name) {
	const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'))
		|| tag.match(new RegExp(`${name}\\s*=\\s*'([^']*)'`, 'i'));
	return m ? m[1] : null;
}

function metaByName(html, name) {
	for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
		const tag = m[0];
		if ((attr(tag, 'name') || '').toLowerCase() === name) return attr(tag, 'content');
	}
	return null;
}

function linkByRel(html, rel) {
	for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
		const tag = m[0];
		if ((attr(tag, 'rel') || '').toLowerCase() === rel) return attr(tag, 'href');
	}
	return null;
}

const route = (f) => {
	const rel = f.replace(/^dist[\\/]/, '').replace(/\\/g, '/');
	const r = '/' + rel.replace(/(^|\/)index\.html$/, '');
	return r.length > 1 ? r.replace(/\/$/, '') : '/';
};

const pages = [];
for (const file of walk(ROOT)) {
	const html = readFileSync(file, 'utf8');
	const robots = (metaByName(html, 'robots') || '').toLowerCase();
	pages.push({
		route: route(file),
		html,
		noindex: robots.includes('noindex'),
		canonical: linkByRel(html, 'canonical'),
		title: (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || null,
		description: metaByName(html, 'description'),
		ld: [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]),
	});
}

// Pages that deliberately opt out of indexing are not judged on index signals,
// but they still count as link targets so they are not reported as orphans.
const indexable = pages.filter((p) => !p.noindex);

// A plain `npm run build` is a preview build and stamps noindex on every page,
// so auditing it reports nine clean checks over zero pages. Production sets
// PUBLIC_SITE_ENV in vercel.json; this audit has to see the same build.
if (pages.length > 0 && indexable.length === 0) {
	console.error(
		'every page carries noindex, so this is a preview build and there is nothing to audit.\n' +
			'Rebuild as production first:\n' +
			'  PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://bestinsuranceresearch.com npx astro build',
	);
	process.exit(2);
}
const inbound = new Map(pages.map((p) => [p.route, 0]));
for (const p of pages) {
	for (const l of p.html.matchAll(/href\s*=\s*["'](\/[^"'#?]*)["']/g)) {
		let t = l[1].replace(/\/index\.html$/, '') || '/';
		if (t.length > 1) t = t.replace(/\/$/, '');
		if (inbound.has(t) && t !== p.route) inbound.set(t, inbound.get(t) + 1);
	}
}

const findings = {
	noCanonical: [], canonicalOffOrigin: [], noTitle: [], duplicateTitle: [],
	noDescription: [], thinDescription: [], noStructuredData: [], invalidStructuredData: [], orphan: [],
};

const byTitle = new Map();
for (const p of indexable) {
	if (!p.canonical) findings.noCanonical.push(p.route);
	else if (!p.canonical.startsWith(ORIGIN)) findings.canonicalOffOrigin.push(`${p.route} -> ${p.canonical}`);

	if (!p.title) findings.noTitle.push(p.route);
	else {
		if (!byTitle.has(p.title)) byTitle.set(p.title, []);
		byTitle.get(p.title).push(p.route);
	}

	if (!p.description) findings.noDescription.push(p.route);
	else if (p.description.trim().length < MIN_DESCRIPTION) findings.thinDescription.push(`${p.route} (${p.description.trim().length} chars)`);

	if (p.ld.length === 0) findings.noStructuredData.push(p.route);
	for (const block of p.ld) {
		try { JSON.parse(block); } catch { findings.invalidStructuredData.push(p.route); }
	}

	if (p.route !== '/' && inbound.get(p.route) === 0) findings.orphan.push(p.route);
}

for (const [title, routes] of byTitle) {
	if (routes.length > 1) findings.duplicateTitle.push(`"${title.slice(0, 70)}" on ${routes.length}: ${routes.slice(0, 3).join(', ')}`);
}

const failed = Object.values(findings).reduce((n, l) => n + l.length, 0);

if (asJson) {
	console.log(JSON.stringify({ checkedAt: new Date().toISOString(), pages: pages.length, indexable: indexable.length, findings }, null, 2));
} else {
	console.log(`pages built: ${pages.length}   indexable: ${indexable.length}   noindex (skipped): ${pages.length - indexable.length}\n`);
	const labels = {
		noCanonical: 'no rel=canonical',
		canonicalOffOrigin: 'canonical not on the live origin',
		noTitle: 'no <title>',
		duplicateTitle: 'duplicate titles',
		noDescription: 'no meta description',
		thinDescription: `meta description under ${MIN_DESCRIPTION} chars`,
		noStructuredData: 'no JSON-LD',
		invalidStructuredData: 'invalid JSON-LD',
		orphan: 'orphan (no internal inbound link)',
	};
	for (const [key, label] of Object.entries(labels)) {
		const list = findings[key];
		console.log(`${list.length === 0 ? ' ok ' : 'FAIL'}  ${label.padEnd(40)} ${list.length}`);
		for (const x of list.slice(0, 10)) console.log(`        ${x}`);
		if (list.length > 10) console.log(`        ... and ${list.length - 10} more`);
	}
	console.log(`\n${failed} finding(s) across ${indexable.length} indexable pages.`);
}

process.exit(failed ? 1 : 0);
