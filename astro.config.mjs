// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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


const site = process.env.PUBLIC_SITE_ORIGIN || 'https://bestinsuranceresearch.com';

/**
 * Routes that must never enter the sitemap:
 *  - /design/*  labeled design alternatives and the component state gallery. They
 *               are noindex and are not part of the public library.
 *  - *.json     machine-readable companions. They are discovered through the
 *               rel=alternate link on their own page, which is the correct path.
 *  - /404       error page.
 */
const EXCLUDED = [/\/design\//, /\.json$/, /\/404\/?$/];

export default defineConfig({
	site,
	trailingSlash: 'never',
	build: { format: 'directory' },
	integrations: [
		sitemap({
			filter: (page) => !EXCLUDED.some((pattern) => pattern.test(page)),
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
