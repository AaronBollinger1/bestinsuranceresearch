/**
 * Turn the redirect map into an executable plan, and refuse to produce an
 * executable one while the destination cannot serve it.
 *
 *   node --experimental-strip-types scripts/plan-redirects.mjs
 *
 * Writes `redirect-plan.json` next to the repo root and prints a table.
 *
 * Why a plan rather than a script that just does it: every one of these is a
 * permanent redirect on a domain that currently serves a live site. The
 * expensive mistake is not a typo in a target, it is firing the whole set before
 * the destination can serve them. So the preflight is part of the tool: unless the
 * destination is observed serving the real site, the plan is marked BLOCKED and
 * every operation is marked `hold`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DESTINATION_HOST = 'bestinsuranceresearch.com';

const { DOMAIN_ROUTES, OUT_OF_SCOPE } = await import(
	new URL('../src/config/domain-redirects.ts', import.meta.url).href
);

/* ---------- preflight ---------- */

/**
 * The destination has to SERVE THE RESEARCH SITE, not merely resolve.
 *
 * The first version of this check asked DNS whether the host resolved. That was
 * the wrong question and it would have passed on a registered-but-parked domain:
 * a freshly registered Porkbun domain resolves immediately, to a placeholder,
 * and a 301 from eight live sites onto a placeholder is the exact accident this
 * script exists to prevent.
 *
 * So the check is an HTTP one and it looks for something only the real site
 * emits. `/position` is the instrument's own route; a parking page will not have
 * it, and neither will a half-configured host pointing somewhere else.
 *
 * A control host is probed first. If the control is unreachable then this
 * environment has no outbound network, and the correct verdict is INCONCLUSIVE
 * rather than "not ready" - a tool that reports a blocker it cannot actually
 * observe teaches you to ignore it.
 */
const CONTROL_HOST = 'www.bestepli.com';
const MARKERS = [
	{ path: '/position', needle: 'Coverage position' },
	{ path: '/', needle: 'BestInsurance Research' },
];

async function probe(url) {
	try {
		const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
		const body = await res.text();
		return { reachable: true, ok: res.ok, status: res.status, finalUrl: res.url, body };
	} catch (err) {
		return { reachable: false, ok: false, status: 0, finalUrl: url, body: '', error: String(err.message || err) };
	}
}

const control = await probe(`https://${CONTROL_HOST}/`);
const networkAvailable = control.reachable;

const checks = [];
if (networkAvailable) {
	for (const m of MARKERS) {
		const url = `https://${DESTINATION_HOST}${m.path}`;
		const r = await probe(url);
		checks.push({
			url,
			expected: m.needle,
			status: r.status,
			finalUrl: r.finalUrl,
			served: r.ok && r.body.includes(m.needle),
			...(r.error ? { error: r.error } : {}),
		});
	}
}

const destinationServesSite = networkAvailable && checks.length > 0 && checks.every((c) => c.served);
const blockers = [];

if (!networkAvailable) {
	blockers.push(
		`Preflight INCONCLUSIVE: no outbound network from this environment (control host ${CONTROL_HOST} unreachable: ${control.error}). ` +
			'Re-run this on a machine with network access before creating any forward. The plan is held rather than marked ready, ' +
			'because an unverified destination is not a verified one.',
	);
} else if (!destinationServesSite) {
	const detail = checks
		.map((c) => `${c.url} -> ${c.status || 'no response'}${c.finalUrl !== c.url ? ` (landed on ${c.finalUrl})` : ''}`)
		.join('; ');
	blockers.push(
		`${DESTINATION_HOST} is not serving the research site yet. ${detail}. ` +
			'The domain is registered, but until it serves the built site a 301 from a live property ' +
			'points visitors and crawlers at whatever is there instead.',
	);
}

/* ---------- the plan ---------- */

const redirects = DOMAIN_ROUTES.filter((r) => r.action === 'redirect');
const parked = DOMAIN_ROUTES.filter((r) => r.action === 'park');

const operations = redirects.map((r) => ({
	op: 'create_url_forward',
	domain: r.domain,
	/* Apex. `www` needs the same forward, created as a second operation with
	   subdomain 'www', or handled at the host if the domain is on Vercel. */
	subdomain: '',
	location: `https://${DESTINATION_HOST}${r.target}`,
	/* Permanent, because that is what transfers the equity. Porkbun calls this
	   type 'permanent'; the wire value is 301. */
	type: 'permanent',
	/* includePath false, deliberately. A wildcard path forward would send
	   /class-codes/8810 to /tools/workers-comp-classification/class-codes/8810,
	   which does not exist. Deep pages need their own per-URL mapping, which is
	   the export step in the manifest. */
	includePath: 'no',
	wildcard: 'yes',
	status: destinationServesSite ? 'ready' : 'hold',
	servesLiveSiteToday: Boolean(r.liveSite),
	note: r.note,
}));

const plan = {
	generatedAt: new Date().toISOString().slice(0, 10),
	destination: DESTINATION_HOST,
	destinationServesSite,
	networkAvailable,
	destinationChecks: checks,
	executable: blockers.length === 0,
	blockers,
	counts: {
		domainsInMap: DOMAIN_ROUTES.length,
		redirects: redirects.length,
		parked: parked.length,
		redirectsOverLiveSites: operations.filter((o) => o.servesLiveSiteToday).length,
		outOfScope: OUT_OF_SCOPE.length,
	},
	/* Before any of these run, and only for the domains that serve a live site. */
	prerequisites: [
		'Export the indexed URL list for each live site from Search Console. A single apex forward discards deep pages; those need per-URL mapping.',
		'Decide what replaces each application funnel. The research property publishes no price and takes no application, so the conversion path ends at the switch.',
		'Opt each domain into Porkbun API access if tooling will create the forward, or create it in the Porkbun UI.',
		'Add www as a second forward per domain, or handle apex-to-www at the host.',
	],
	operations,
	parked: parked.map((p) => ({ domain: p.domain, needs: p.note })),
	outOfScope: [...OUT_OF_SCOPE],
};

fs.writeFileSync(path.join(ROOT, 'redirect-plan.json'), JSON.stringify(plan, null, '\t') + '\n');

/* ---------- report ---------- */

const w = (s, n) => String(s).padEnd(n);
console.log(`destination: ${DESTINATION_HOST}  serving the site: ${destinationServesSite ? 'yes' : 'NO'}`);
if (!networkAvailable) console.log(`  (no outbound network from this environment; verdict inconclusive)`);
for (const c of checks) {
	console.log(`  ${c.served ? 'ok  ' : 'FAIL'} ${c.url} -> ${c.status || c.error || 'no response'}${c.finalUrl !== c.url ? ` (landed on ${c.finalUrl})` : ''}`);
}
console.log(`executable:  ${plan.executable ? 'yes' : 'NO'}`);
if (blockers.length) blockers.forEach((b) => console.log(`  BLOCKED: ${b}`));
console.log(
	`\n${plan.counts.redirects} redirect(s), ${plan.counts.redirectsOverLiveSites} of them over a domain that serves a live site today; ${plan.counts.parked} parked\n`,
);
console.log(`${w('domain', 38)}${w('target', 44)}status`);
for (const o of operations) {
	console.log(
		`${w(o.domain, 38)}${w(o.location.replace(`https://${DESTINATION_HOST}`, ''), 44)}${o.status}${o.servesLiveSiteToday ? '  (live site)' : ''}`,
	);
}
console.log(`\nparked, with what each needs:`);
for (const p of plan.parked) console.log(`  ${w(p.domain, 38)}${p.needs}`);
console.log(`\nwrote redirect-plan.json`);
