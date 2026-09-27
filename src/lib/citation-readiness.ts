/**
 * Technical AI-citability and discovery audit (BR-D5).
 *
 * Checks a local fixture site. It does not fetch, does not start a preview,
 * and does not promise a ranking or a citation. Commons stays closed.
 */
export const CITATION_AUDIT_PUBLISHES: boolean = false;

const FORBIDDEN_SCHEMA = ['FAQPage', 'ClaimReview', 'Rating', 'Review', 'Offer'];

export interface FixturePage {
	path: string;
	html: string;
	indexable: boolean;
}

export interface FixtureSite {
	origin: string;
	robots: string;
	sitemap: string[];
	redirects: Array<{ from: string; to: string; status: number }>;
	pages: FixturePage[];
	rollbackTo: string;
}

export interface CitationCheck {
	id: 'retrievability' | 'evidence-clarity' | 'freshness' | 'canonical-consistency' | 'source-visibility';
	ok: boolean;
	detail: string;
}

export interface AuditFinding {
	code: string;
	path?: string;
	detail: string;
}

export function citationReadiness(page: FixturePage, origin: string): {
	checks: CitationCheck[];
	ready: boolean;
	rank: null;
	statement: string;
} {
	const canonical = linkHref(page.html, 'canonical');
	const expected = `${origin}${page.path}`;
	const summary = evidenceSummary(page.html);
	const refresh = metaContent(page.html, 'revised') || timeDatetime(page.html);
	const sources = visibleSources(page.html);
	const checks: CitationCheck[] = [
		{
			id: 'retrievability',
			ok: page.indexable ? canonical === expected && !/noindex/i.test(robotsMeta(page.html)) : /noindex/i.test(robotsMeta(page.html)),
			detail: page.indexable ? 'An indexable page is reachable at its own canonical URL.' : 'An unapproved page stays noindex.',
		},
		{
			id: 'evidence-clarity',
			ok: summary.length >= 40,
			detail: 'The data-evidence-summary element is server-rendered and long enough to cite.',
		},
		{
			id: 'freshness',
			ok: /^\d{4}-\d{2}-\d{2}$/.test(refresh),
			detail: 'A refresh date is present.',
		},
		{
			id: 'canonical-consistency',
			ok: canonical === expected && canonicalCount(page.html) === 1,
			detail: 'Exactly one canonical matches the origin and path.',
		},
		{
			id: 'source-visibility',
			ok: sources.length > 0 && sources.every((source) => source.title && source.url.startsWith('https://')),
			detail: 'At least one source is visible, with a title and an https URL.',
		},
	];
	return {
		checks,
		ready: checks.every((check) => check.ok),
		rank: null,
		statement: 'Citation readiness is a checklist. It does not guarantee ranking or citation.',
	};
}

export function auditDiscovery(site: FixtureSite): { ok: boolean; findings: AuditFinding[]; rollbackTo: string } {
	const findings: AuditFinding[] = [];
	let origin: URL;
	try {
		origin = new URL(site.origin);
	} catch {
		return { ok: false, findings: [{ code: 'host', detail: 'The origin is not a URL.' }], rollbackTo: site.rollbackTo };
	}
	if (origin.protocol !== 'https:') findings.push({ code: 'host', detail: 'The origin is not https.' });
	const seen = new Set<string>();
	for (const redirect of site.redirects) {
		if (redirect.status !== 301) findings.push({ code: 'redirect', path: redirect.from, detail: 'A canonical redirect is not 301.' });
		if (seen.has(redirect.from)) findings.push({ code: 'redirect', path: redirect.from, detail: 'A redirect loops.' });
		seen.add(redirect.from);
		if (redirect.to === redirect.from) findings.push({ code: 'redirect', path: redirect.from, detail: 'A redirect points at itself.' });
		try {
			if (new URL(redirect.to).host !== origin.host) findings.push({ code: 'redirect', path: redirect.from, detail: 'A redirect leaves the host.' });
		} catch {
			findings.push({ code: 'redirect', path: redirect.from, detail: 'A redirect target is not a URL.' });
		}
	}
	const sitemapLine = (site.robots.match(/^Sitemap:\s*(\S+)/m) || [])[1];
	if (!sitemapLine || !sitemapLine.startsWith(`${origin.origin}/`)) {
		findings.push({ code: 'robots', detail: 'robots.txt does not name a sitemap on this host.' });
	}
	if (/^\s*Disallow:\s*\/\s*$/m.test(site.robots) && site.pages.some((page) => page.indexable)) {
		findings.push({ code: 'robots', detail: 'robots.txt disallows the whole host while an indexable page exists.' });
	}
	const indexable = new Set(site.pages.filter((page) => page.indexable).map((page) => `${origin.origin}${page.path}`));
	for (const url of site.sitemap) {
		if (!indexable.has(url)) findings.push({ code: 'sitemap', detail: `${url} is in the sitemap but is not an indexable page.` });
	}
	for (const url of indexable) {
		if (!site.sitemap.includes(url)) findings.push({ code: 'sitemap', detail: `${url} is indexable and missing from the sitemap.` });
	}
	for (const page of site.pages) {
		const readiness = citationReadiness(page, origin.origin);
		if (page.indexable && !readiness.ready) {
			findings.push({ code: 'citation', path: page.path, detail: readiness.checks.filter((check) => !check.ok).map((check) => check.id).join(', ') });
		}
		for (const type of schemaTypes(page.html)) {
			if (FORBIDDEN_SCHEMA.includes(type)) findings.push({ code: 'schema', path: page.path, detail: `${type} is not allowed.` });
		}
		if (!/<html[^>]*\blang=/.test(page.html) || !/<main[\s>]/.test(page.html) || (page.html.match(/<h1[\s>]/g) || []).length !== 1) {
			findings.push({ code: 'a11y', path: page.path, detail: 'The page needs a language, one h1, and a main landmark.' });
		}
		const ids = [...page.html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
		if (new Set(ids).size !== ids.length) findings.push({ code: 'anchor', path: page.path, detail: 'An anchor id is repeated.' });
		if (!/name="viewport"[^>]*width=device-width/.test(page.html)) {
			findings.push({ code: 'mobile', path: page.path, detail: 'The viewport does not set device width.' });
		}
		if (page.html.length > 100_000 || (page.html.match(/<script(?![^>]*type="application\/ld\+json")/g) || []).length > 2) {
			findings.push({ code: 'performance', path: page.path, detail: 'The HTML is over the local byte budget or has too many scripts.' });
		}
		if (/noindex/i.test(robotsMeta(page.html)) && site.sitemap.includes(`${origin.origin}${page.path}`)) {
			findings.push({ code: 'sitemap', path: page.path, detail: 'A noindex page is in the sitemap.' });
		}
	}
	return { ok: findings.length === 0, findings, rollbackTo: site.rollbackTo };
}

export function rollbackFixture(site: FixtureSite, path: string, html: string): FixtureSite {
	return { ...site, pages: site.pages.map((page) => page.path === path ? { ...page, html } : page) };
}

function robotsMeta(html: string): string {
	return metaContent(html, 'robots');
}

function metaContent(html: string, name: string): string {
	const match = html.match(new RegExp(`<meta[^>]*name="${name}"[^>]*content="([^"]*)"`, 'i'))
		|| html.match(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*name="${name}"`, 'i'));
	return match?.[1] ?? '';
}

function linkHref(html: string, rel: string): string {
	const match = html.match(new RegExp(`<link[^>]*rel="${rel}"[^>]*href="([^"]*)"`, 'i'))
		|| html.match(new RegExp(`<link[^>]*href="([^"]*)"[^>]*rel="${rel}"`, 'i'));
	return match?.[1] ?? '';
}

function timeDatetime(html: string): string {
	return html.match(/<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"/)?.[1] ?? '';
}

function canonicalCount(html: string): number {
	return (html.match(/rel="canonical"/g) || []).length;
}

/** The only evidence summary this audit measures. A long body is not a summary. */
function evidenceSummary(html: string): string {
	const rendered = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
	const match = rendered.match(/<([a-z0-9]+)[^>]*\bdata-evidence-summary\b[^>]*>([\s\S]*?)<\/\1>/i);
	if (!match) return '';
	return match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function visibleSources(html: string): Array<{ title: string; url: string }> {
	const sources: Array<{ title: string; url: string }> = [];
	for (const match of html.matchAll(/<a[^>]*href="(https:\/\/[^"]+)"[^>]*>([^<]+)<\/a>/g)) {
		sources.push({ url: match[1], title: match[2].trim() });
	}
	return sources;
}

function schemaTypes(html: string): string[] {
	const types: string[] = [];
	for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
		try {
			const data = JSON.parse(match[1]);
			const list = Array.isArray(data) ? data : [data];
			for (const item of list) if (typeof item?.['@type'] === 'string') types.push(item['@type']);
		} catch {
			types.push('invalid');
		}
	}
	return types;
}
