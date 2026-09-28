// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { publicIndexingOpen } from './src/config/public-indexing.mjs';

import fs from 'node:fs';
import path from 'node:path';

/**
 * Real lastmod dates, read straight off the content records.
 *
 * The sitemap carried changefreq and priority and no lastmod. Those two are
 * hints crawlers largely disregard; lastmod is the one a crawler acts on. It is
 * only worth emitting if it is true, so it is taken from the entry's own
 * recorded date - lastReviewed for editorial entries, lastChecked for sources -
 * and omitted entirely where there is no such date rather than guessed.
 */
const CONTENT = path.resolve('src/content');
/** @type {Record<string, string>} */
const DATE_FIELD = { sources: 'lastChecked' };
const ROUTE = {
	questions: 'questions',
	coverages: 'insurance',
	companies: 'companies',
	states: 'states',
	examples: 'examples',
	sources: 'sources',
	modules: 'tools',
};

function readLastmod() {
	const bySlug = new Map();
	const byCollection = new Map();
	for (const [collection, segment] of Object.entries(ROUTE)) {
		const dir = path.join(CONTENT, collection);
		if (!fs.existsSync(dir)) continue;
		const field = DATE_FIELD[collection] || 'lastReviewed';
		let newest = '';
		for (const file of fs.readdirSync(dir)) {
			if (!file.endsWith('.json')) continue;
			let data;
			try { data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); } catch { continue; }
			const date = data[field];
			if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) continue;
			bySlug.set(`/${segment}/${file.replace(/\.json$/, '')}`, date);
			if (date > newest) newest = date;
		}
		if (newest) byCollection.set(`/${segment}`, newest);
	}
	// A hub page is as fresh as the freshest thing it lists.
	const newestOverall = [...bySlug.values()].sort().pop();
	return { bySlug, byCollection, newestOverall };
}

const LASTMOD = readLastmod();

function lastmodFor(/** @type {string} */ url) {
	const pathname = new URL(url).pathname.replace(/\/$/, '');
	if (LASTMOD.bySlug.has(pathname)) return LASTMOD.bySlug.get(pathname);
	if (LASTMOD.byCollection.has(pathname)) return LASTMOD.byCollection.get(pathname);
	if (pathname === '' || pathname === '/') return LASTMOD.newestOverall;
	return undefined;
}


const site = process.env.PUBLIC_SITE_ORIGIN || 'https://birch.insure';

/**
 * Commons is closed unless a deployment opens it deliberately. The sitemap has
 * to read the environment directly: this file runs in the Vite config context,
 * not in the Astro component context, so `siteConfig.communityReady` is not
 * reachable here. Both derive from the same variable and must agree.
 */
const commonsReady = process.env.PUBLIC_COMMONS_READY === 'true';
const indexingOpen = publicIndexingOpen();

/**
 * Routes that must never enter the sitemap:
 *  - /design/*  labeled design alternatives and the component state gallery. They
 *               are noindex and are not part of the public library.
 *  - *.json     machine-readable companions. They are discovered through the
 *               rel=alternate link on their own page, which is the correct path.
 *  - /404       error page.
 *  - /review-queue/<source>  the per-source verification sheets. They reproduce
 *               prose that is already published on its own canonical page, so
 *               299 of them would be the largest block of internal duplication
 *               on the origin, competing with the pages they quote. Public, and
 *               noindex, for the same reason /design is. The index page
 *               /review-queue itself stays in the sitemap.
 *  - /lens      the Coverage Lens private preview. It sets noindex on itself and
 *               its own title calls it a private preview, and yet a production
 *               build listed it in the sitemap: the file said "private" and the
 *               sitemap invited every crawler to come and look. Measured
 *               2026-09-24 against a production-posture build.
 *  - /shelf     same contradiction, same build. noindex in the head, advertised
 *               in the sitemap.
 *  - /contribute while Commons is closed. Contribution is not open, no account
 *               can be created and nothing can be submitted, so the page is
 *               noindex until PUBLIC_COMMONS_READY is opened deliberately - and
 *               a noindex page must not be advertised, which is the whole point
 *               of the two entries above it.
 *  - /research/* the fixture-driven research-run previews. They replay
 *               synthetic recordings, set noindex on themselves in every
 *               posture, and say so on the page; advertising them would invite
 *               crawlers to a surface that is by construction not the library.
 *  - /library/* fixture corpus pages. CORPUS_PUBLICATION_OPEN is false, so
 *               every page is noindex even when a fixture review is recorded.
 *               A noindex page stays out of the sitemap.
 *
 * The rule these three share: a route that tells crawlers not to index it must
 * not also be listed in the document whose only purpose is to ask them to. The
 * sitemap-vs-noindex agreement is held by a test in scripts/verify.mjs so this
 * list cannot drift out of step with the pages again.
 */
const EXCLUDED = [
	/\/design\//,
	/\.json$/,
	/\/404\/?$/,
	/\/review-queue\/[^/]/,
	/\/lens\/?$/,
	/\/shelf\/?$/,
	/\/research\//,
	/\/library\//,
	...(commonsReady ? [] : [/\/contribute\/?$/]),
];

export default defineConfig({
	site,
	trailingSlash: 'never',
	build: { format: 'directory' },
	integrations: [
		sitemap({
			filter: (page) => indexingOpen && !EXCLUDED.some((pattern) => pattern.test(page)),
			changefreq: 'monthly',
			serialize(item) {
				const lastmod = lastmodFor(item.url);
				if (lastmod) item.lastmod = lastmod;

				// Questions and coverage pages are the substance. Everything else supports them.
				if (/\/(questions|insurance)\/[^/]+$/.test(item.url)) item.priority = 0.9;
				else if (/\/(companies|states|examples|tools|sources)\/[^/]+$/.test(item.url)) item.priority = 0.7;
				else if (/\/(ask|questions|insurance|companies|states|examples|tools|sources)\/?$/.test(item.url)) item.priority = 0.8;
				else item.priority = 0.5;
				return item;
			},
		}),
	],
});
