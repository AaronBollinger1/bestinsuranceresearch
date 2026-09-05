import type { APIRoute } from 'astro';
import { siteConfig } from '../config/site';
import { stripMarkers } from '../lib/citations';
import { loadCorpus, recentlyReviewed } from '../lib/corpus';

export const prerender = true;

const abs = (path: string) => new URL(path, siteConfig.origin).toString();

const escape = (value: string) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

const rfc822 = (iso: string) => {
	const parsed = new Date(`${iso}T12:00:00Z`);
	return Number.isNaN(parsed.getTime()) ? new Date().toUTCString() : parsed.toUTCString();
};

/**
 * The feed carries newly reviewed and corrected research, not a publication
 * chronology. A page that was re-checked against its sources and re-dated is news
 * to anyone relying on it, which is exactly what this feed is for.
 */
export const GET: APIRoute = async () => {
	const corpus = await loadCorpus();
	const items = recentlyReviewed(corpus, 40);

	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
		'  <channel>',
		`    <title>${escape(siteConfig.name)}: newly reviewed research</title>`,
		`    <link>${abs('/')}</link>`,
		`    <description>${escape('Questions, coverage pages, entity records, and tools as they are reviewed, re-checked against their sources, or corrected.')}</description>`,
		'    <language>en-us</language>',
		`    <atom:link href="${abs('/rss.xml')}" rel="self" type="application/rss+xml" />`,
		`    <copyright>${escape(`${siteConfig.operator.legalName} dba ${siteConfig.operator.dba}`)}</copyright>`,
		`    <lastBuildDate>${items[0] ? rfc822(items[0].date) : new Date().toUTCString()}</lastBuildDate>`,
		...items.flatMap((item) => [
			'    <item>',
			`      <title>${escape(`${item.kind}: ${item.title}`)}</title>`,
			`      <link>${abs(item.path)}</link>`,
			`      <guid isPermaLink="false">${abs(item.path)}#reviewed-${item.date}</guid>`,
			`      <pubDate>${rfc822(item.date)}</pubDate>`,
			`      <dc:creator>${escape(siteConfig.name)}</dc:creator>`,
			`      <category>${escape(item.kind)}</category>`,
			`      <description>${escape(`${stripMarkers(item.summary).slice(0, 400)} (Reviewed ${item.date}. General information only, not advice and not a coverage determination.)`)}</description>`,
			'    </item>',
		]),
		'  </channel>',
		'</rss>',
		'',
	].join('\n');

	return new Response(body, {
		headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=1800' },
	});
};
