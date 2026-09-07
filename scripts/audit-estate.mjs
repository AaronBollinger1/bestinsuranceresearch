/**
 * Audit the live estate.
 *
 * This audit had been run by hand at least three times, in three sessions, and
 * left nothing behind each time: the findings lived in a transcript and the
 * next session re-derived them from scratch. `verify.mjs` cannot cover this,
 * because it asserts against a freshly built `dist/` and everything here is a
 * property of what is actually being served right now, over the network, by
 * nine separately deployed sites.
 *
 * So this is the audit, checked in. One command, repeatable, diffable.
 *
 * What it checks, per property:
 *
 *   canonical host   Exactly one of apex and www may answer 200. The other must
 *                    redirect to it. Two hosts both answering 200 is duplicate
 *                    content served twice under different names.
 *   canonical tag    The rel=canonical the page emits must name the host that
 *                    actually answers, or the page is voting against itself.
 *   robots           Present, and its Sitemap: line must name a URL that
 *                    resolves, on the canonical host rather than the other one.
 *   sitemap          Reachable. Astro emits sitemap-index.xml rather than
 *                    sitemap.xml, so both spellings are tried before failing.
 *   llms.txt         Present. The whole point of the estate is being citable by
 *                    answer engines; a property without one is opted out of the
 *                    strategy the other eight are executing.
 *   headers          The response security headers, reported per property so
 *                    that drift between siblings is visible rather than assumed.
 *   reciprocal       A link back to the research hub, which is what makes the
 *                    estate a graph instead of nine unconnected sites.
 *
 * Exits non-zero when any property has a defect, so it can gate a release.
 * Network failures are reported as failures rather than swallowed: an audit
 * that passes because it could not reach anything is worse than no audit.
 *
 * Usage:
 *   npm run audit:estate
 *   npm run audit:estate -- --json
 *   npm run audit:estate -- --only bestho3.com
 */
import { LIVE_SITE_DOMAINS } from '../src/config/domain-redirects.ts';

const HUB = 'bestinsuranceresearch.com';
const TIMEOUT_MS = 25_000;

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const onlyIndex = args.indexOf('--only');
const only = onlyIndex === -1 ? null : args[onlyIndex + 1];

/** Headers that ought to be present. Reported, and only some are enforced. */
const SECURITY_HEADERS = [
	'strict-transport-security',
	'x-content-type-options',
	'referrer-policy',
	'content-security-policy',
];

/** Missing these is a defect. The rest are reported as drift, not failed. */
const REQUIRED_HEADERS = new Set(['strict-transport-security', 'x-content-type-options']);

async function fetchOnce(url, { redirect = 'follow', method = 'GET' } = {}) {
	const control = new AbortController();
	const timer = setTimeout(() => control.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(url, { redirect, method, signal: control.signal });
		const body = method === 'GET' && redirect === 'follow' ? await res.text() : '';
		return { ok: true, status: res.status, url: res.url, headers: res.headers, body };
	} catch (error) {
		return { ok: false, status: 0, url, headers: new Headers(), body: '', error: String(error) };
	} finally {
		clearTimeout(timer);
	}
}

const attr = (html, re) => (html.match(re) || [])[1] || null;

async function auditProperty(domain, { expectReciprocal }) {
	const findings = [];
	const note = (severity, message) => findings.push({ severity, message });

	// Which host actually answers, and does the other defer to it?
	const apex = await fetchOnce(`https://${domain}/`, { redirect: 'manual' });
	const www = await fetchOnce(`https://www.${domain}/`, { redirect: 'manual' });

	if (!apex.ok && !www.ok) {
		note('fail', `neither host reachable (${apex.error || www.error})`);
		return { domain, canonicalHost: null, findings };
	}

	const apexServes = apex.status === 200;
	const wwwServes = www.status === 200;
	let canonicalHost = null;

	if (apexServes && wwwServes) {
		note('fail', 'apex and www both answer 200 with no redirect between them, so the site is served twice under two names');
		canonicalHost = domain;
	} else if (apexServes) {
		canonicalHost = domain;
	} else if (wwwServes) {
		canonicalHost = `www.${domain}`;
	} else {
		const landing = await fetchOnce(`https://${domain}/`);
		if (!landing.ok || landing.status !== 200) {
			note('fail', `no host answers 200 (apex ${apex.status}, www ${www.status})`);
			return { domain, canonicalHost: null, findings };
		}
		canonicalHost = new URL(landing.url).host;
	}

	const home = await fetchOnce(`https://${canonicalHost}/`);
	if (!home.ok || home.status !== 200) {
		note('fail', `canonical host ${canonicalHost} did not answer 200`);
		return { domain, canonicalHost, findings };
	}

	// The page's own vote on where it lives.
	const canonicalTag = attr(home.body, /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
		|| attr(home.body, /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
	if (!canonicalTag) {
		note('fail', 'no rel=canonical on the home page');
	} else if (new URL(canonicalTag).host !== canonicalHost) {
		note('fail', `rel=canonical names ${new URL(canonicalTag).host} but ${canonicalHost} is the host that answers`);
	}

	// robots, and whether the sitemap it advertises actually resolves.
	const robots = await fetchOnce(`https://${canonicalHost}/robots.txt`);
	if (!robots.ok || robots.status !== 200) {
		note('fail', `robots.txt returned ${robots.status}`);
	} else {
		const declared = (robots.body.match(/^\s*Sitemap:\s*(\S+)/gim) || [])
			.map((line) => line.replace(/^\s*Sitemap:\s*/i, '').trim());
		if (declared.length === 0) {
			note('warn', 'robots.txt declares no Sitemap');
		}
		for (const sitemapUrl of declared) {
			if (new URL(sitemapUrl).host !== canonicalHost) {
				note('fail', `robots.txt points at a sitemap on ${new URL(sitemapUrl).host}, not the canonical host ${canonicalHost}`);
			}
			const probe = await fetchOnce(sitemapUrl);
			if (!probe.ok || probe.status !== 200) {
				note('fail', `sitemap declared in robots.txt returned ${probe.status}: ${sitemapUrl}`);
			}
		}
	}

	// Astro emits sitemap-index.xml; a bare sitemap.xml 404 is not by itself a fault.
	let sitemapFound = false;
	for (const path of ['sitemap-index.xml', 'sitemap.xml']) {
		const probe = await fetchOnce(`https://${canonicalHost}/${path}`, { method: 'HEAD', redirect: 'follow' });
		if (probe.ok && probe.status === 200) { sitemapFound = true; break; }
	}
	if (!sitemapFound) note('fail', 'no sitemap at sitemap-index.xml or sitemap.xml');

	const llms = await fetchOnce(`https://${canonicalHost}/llms.txt`, { method: 'HEAD', redirect: 'follow' });
	if (!llms.ok || llms.status !== 200) {
		note('fail', `llms.txt returned ${llms.status}, so this property is opted out of the citability the rest of the estate is built for`);
	}

	const presentHeaders = SECURITY_HEADERS.filter((h) => home.headers.get(h));
	for (const h of SECURITY_HEADERS) {
		if (home.headers.get(h)) continue;
		note(REQUIRED_HEADERS.has(h) ? 'fail' : 'warn', `no ${h} header`);
	}

	if (expectReciprocal && !home.body.includes(HUB)) {
		note('fail', `no link back to ${HUB}, so the estate is a set of islands rather than a graph`);
	}

	return { domain, canonicalHost, canonicalTag, headers: presentHeaders, findings };
}

const targets = LIVE_SITE_DOMAINS.map((d) => d.domain).filter((d) => !only || d === only);
const properties = [
	...targets.map((domain) => ({ domain, expectReciprocal: true })),
	...(!only || only === HUB ? [{ domain: HUB, expectReciprocal: false }] : []),
];

const results = [];
for (const p of properties) results.push(await auditProperty(p.domain, p));

const failed = results.filter((r) => r.findings.some((f) => f.severity === 'fail'));

if (asJson) {
	console.log(JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
} else {
	for (const r of results) {
		const fails = r.findings.filter((f) => f.severity === 'fail');
		const warns = r.findings.filter((f) => f.severity === 'warn');
		const mark = fails.length ? 'FAIL' : warns.length ? 'warn' : ' ok ';
		console.log(`[${mark}] ${r.domain}${r.canonicalHost ? `  serving: ${r.canonicalHost}` : ''}`);
		for (const f of r.findings) console.log(`         ${f.severity === 'fail' ? 'x' : '-'} ${f.message}`);
	}
	console.log(`\n${results.length} properties, ${failed.length} with defects.`);
}

process.exit(failed.length ? 1 : 0);
