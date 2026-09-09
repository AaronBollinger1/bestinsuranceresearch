/**
 * Commons build verification.
 *
 * Runs against dist/ after `npm run build`, using only Node built-ins.
 *
 *   npm run build && npm run verify
 *
 * Most of these assert an ABSENCE, which is unusual for a test suite and is the
 * point of this one. `COMMONS.md` section 2 gives four reasons the Commons is a
 * separate origin, and the load-bearing one is that coverage discussion by
 * unlicensed people on a page headed "Operated by Bollinsure", under licence
 * 6013787, is a regulatory problem a disclaimer does not fix. The whole defence
 * is that none of that branding is here - so the defence has to be checked on
 * every build rather than remembered. A footer copied from the Record in a
 * hurry is exactly how it would arrive.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = path.join(ROOT, 'dist');

/*
 * With an adapter, Astro splits the output: prerendered files land in
 * dist/client and the server bundle in dist/server. Page assertions read the
 * static root, but the branding scan has to cover BOTH - a licence number in a
 * server-rendered page never appears in dist/client at all, and scanning only
 * the static half would quietly stop checking the account pages the moment they
 * became dynamic. Which is exactly what just happened.
 */
const DIST = fs.existsSync(path.join(BUILD, 'client')) ? path.join(BUILD, 'client') : BUILD;
const CONTENT = path.join(ROOT, 'src/content');

if (!fs.existsSync(DIST)) {
	console.error('dist/ not found. Run `npm run build` first.');
	process.exit(1);
}

function walk(dir, filter, out = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, filter, out);
		else if (filter(full)) out.push(full);
	}
	return out;
}

const read = (f) => fs.readFileSync(f, 'utf8');
const htmlFiles = walk(DIST, (f) => f.endsWith('.html'));
const cssFiles = walk(DIST, (f) => f.endsWith('.css'));
const textFiles = walk(BUILD, (f) => /\.(html|css|js|mjs|txt|json)$/.test(f) && !f.includes('node_modules'));

const reports = fs.existsSync(path.join(CONTENT, 'reports'))
	? fs
			.readdirSync(path.join(CONTENT, 'reports'))
			.filter((f) => f.endsWith('.json'))
			.map((f) => ({ id: f.replace(/\.json$/, ''), data: JSON.parse(read(path.join(CONTENT, 'reports', f))) }))
	: [];

/* ------------------------------------------------------------------ */
/* The absences                                                        */
/* ------------------------------------------------------------------ */

test('no agency branding reaches this origin', () => {
	/*
	 * The exact strings, because a near miss is the whole risk. The licence
	 * numbers are the estate split from DIRECTION.md - 6013787 the agency,
	 * 0D94699 Brian, 4345268 Aaron - and none of the three belongs on a page
	 * where unlicensed people describe coverage situations.
	 */
	const FORBIDDEN = [
		'Bollinsure',
		'WJB Services',
		'6013787',
		'0D94699',
		'4345268',
		'562-268-9355',
		'5622689355',
		'Thousand Oaks Blvd',
		'quotes@',
		'Operated by',
	];

	for (const file of textFiles) {
		const body = read(file);
		for (const term of FORBIDDEN) {
			assert.ok(
				!body.includes(term),
				`${path.relative(BUILD, file)} contains "${term}". This origin carries no agency branding and no licence number - that absence is why it is a separate origin.`,
			);
		}
	}

	/*
	 * And not in the source either, comments included. Comments survive into the
	 * server bundle, so a comment explaining why the operator is absent puts the
	 * operator's name into the shipped output - which is how this assertion first
	 * failed. The rule is therefore the strong one: this file is the only place in
	 * the Commons permitted to name them, because its job is to forbid them.
	 */
	const sources = walk(path.join(ROOT, 'src'), (f) => /\.(astro|ts|css|json)$/.test(f));
	for (const file of sources) {
		const body = read(file);
		for (const term of FORBIDDEN) {
			assert.ok(
				!body.includes(term),
				`${path.relative(ROOT, file)} names "${term}". Keep it out of the source, comments included: COMMONS.md carries the reasoning.`,
			);
		}
	}
});

test('no gold anywhere, because gold means the thing that resolved', () => {
	/*
	 * Not "less gold": none. In the Record's token system gold marks the
	 * resolved thing - the answer, the citation, the action taken. An
	 * attributed human account is precisely what has not resolved, so gold here
	 * would be a lie in the system's own terms. COMMONS.md section 11.
	 */
	const GOLD = ['#d9b44a', '#a8871f', '#7c641d', '#fbf1d9'];
	for (const file of [...cssFiles, ...htmlFiles]) {
		const body = read(file).toLowerCase();
		for (const hex of GOLD) {
			assert.ok(
				!body.includes(hex),
				`${path.relative(DIST, file)} uses ${hex}, which is a Record gold. There is no gold on this origin.`,
			);
		}
		assert.ok(
			!body.includes('--gold'),
			`${path.relative(DIST, file)} references a --gold token, which this origin does not define.`,
		);
	}
});

test('there is no way to upload anything, because there is no mechanism to accept one', () => {
	/*
	 * COMMONS.md section 5.1: no document uploads, ever. A declarations page is
	 * the densest packet of personal information a person owns, and accepting
	 * one converts a research property into a data-breach liability. The only
	 * enforceable version of that promise is that the mechanism does not exist.
	 */
	for (const file of htmlFiles) {
		const body = read(file);
		assert.ok(!/type=["']file["']/i.test(body), `${path.relative(DIST, file)} contains a file input`);
		assert.ok(!/multipart\/form-data/i.test(body), `${path.relative(DIST, file)} accepts a multipart form`);
	}
});

test('no field exists for anything the Commons promises never to collect', () => {
	/* A field that was never built cannot be quietly filled in by a later form,
	   which is why /contribute states the promise as a fact about the schema. */
	const schema = read(path.join(ROOT, 'src/content.config.ts'));
	for (const banned of ['dateOfBirth', 'ssn', 'policyNumber', 'claimNumber', 'upload', 'attachment', 'payment']) {
		assert.ok(
			!new RegExp(`\\b${banned}\\b`, 'i').test(schema.replace(/\/\*[\s\S]*?\*\//g, '')),
			`the content schema defines "${banned}", which section 6 says is never collected`,
		);
	}
});

/* ------------------------------------------------------------------ */
/* What every published report must carry                              */
/* ------------------------------------------------------------------ */

test('every report carries the structure that makes an account citable', () => {
	assert.ok(reports.length > 0, 'no reports at all, so nothing proves the format renders');

	for (const { id, data } of reports) {
		assert.ok(data.label, `${id} has no label, and the label is the first thing a reader needs`);
		assert.ok(data.labelNote?.length >= 30, `${id} does not say why it carries its label`);
		assert.ok(data.provenance?.length >= 40, `${id} does not say where it came from`);
		assert.ok(data.decidedBy?.length >= 20, `${id} does not record who decided, or that nobody did`);
		assert.ok(
			Array.isArray(data.cannotGeneralize) && data.cannotGeneralize.length >= 3,
			`${id} carries ${data.cannotGeneralize?.length ?? 0} reasons it does not generalise; three is the floor, because the likeliest harm here is a reader treating somebody else's outcome as their own rule`,
		);
		assert.ok(data.contributor?.displayName, `${id} is unattributed, and an anonymous account is not citable`);

		/* A constructed record may never read as something that happened. */
		if (data.label === 'hypothetical' || data.label === 'composite') {
			assert.match(
				`${data.labelNote} ${data.provenance}`.toLowerCase(),
				/did not happen|constructed|no single person|illustrat/,
				`${id} is ${data.label} but never says so in plain words`,
			);
		}
	}
});

test('no report publishes a verdict on whether a claim should have been paid', () => {
	/*
	 * The one rule that survives the crossing from the Record. On that origin
	 * the build enforces it; here it is moderation, and this is the backstop
	 * under the moderation rather than a substitute for it.
	 */
	const VERDICT = [
		/should have been (paid|covered|approved)/i,
		/should not have been (paid|covered|denied)/i,
		/was wrongly (denied|paid)/i,
		/the carrier was (right|wrong)/i,
		/clearly covered/i,
		/obviously covered/i,
	];
	for (const { id, data } of reports) {
		const body = JSON.stringify(data);
		for (const pattern of VERDICT) {
			assert.ok(
				!pattern.test(body),
				`${id} reads as a verdict on a claim (${pattern}). Record who decided; never whether they were right.`,
			);
		}
	}
});

test('a withdrawn report keeps its address and says what happened to it', () => {
	/* A citation that silently 404s is worse for the person who relied on it
	   than one that explains itself, so withdrawal renders rather than deletes. */
	for (const { id, data } of reports) {
		const page = path.join(DIST, 'reports', id, 'index.html');
		assert.ok(fs.existsSync(page), `${id} has no page`);
		if (data.moderation === 'withdrawn') {
			assert.match(read(page), /withdrawn/i, `${id} is withdrawn but its page does not say so`);
		}
	}
});

test('every report has a machine companion that states its truth model', () => {
	/*
	 * An engine that can tell the difference between a statute record and a
	 * moderated human account will cite both correctly. One that cannot will
	 * cite neither, so the difference travels in the payload rather than being
	 * left to be inferred from the domain.
	 */
	for (const { id } of reports) {
		const file = path.join(DIST, 'reports', `${id}.json`);
		assert.ok(fs.existsSync(file), `${id} has no JSON companion`);
		const body = JSON.parse(read(file));
		assert.equal(body.recordType, 'commons-report');
		assert.match(body.truthModel, /not adjudicated/i, `${id}.json does not say it is unadjudicated`);
		assert.ok(body.mayNotBeInferred.length >= 4, `${id}.json carries too few inference warnings`);
	}
});

/* ------------------------------------------------------------------ */
/* The relationship to the Record                                      */
/* ------------------------------------------------------------------ */

test('the Commons cites the Record, and says the Record does not cite back', () => {
	const standards = read(path.join(DIST, 'standards/index.html'));
	assert.match(
		standards,
		/does not cite back/i,
		'/standards does not state the one-way relationship, which is the rule that keeps the Record citable',
	);
	const home = read(path.join(DIST, 'index.html'));
	assert.ok(home.includes('bestinsuranceresearch.com'), 'the home page does not link to the Record');
});

test('the prohibition is stated on the pages a contributor actually reads', () => {
	for (const route of ['index.html', 'standards/index.html', 'moderation/index.html']) {
		const body = read(path.join(DIST, route));
		assert.match(
			body,
			/should have been paid/i,
			`${route} does not state the verdict prohibition, and it is the rule everything else rests on`,
		);
	}
});

test('indexing matches whether the property is actually named', () => {
	/*
	 * Both directions, because the interesting one changed. While the origin was
	 * a placeholder every canonical URL pointed at a host that did not resolve,
	 * and indexing that is worse than not existing. Now that it is named, the
	 * risk inverts: a property that stays noindex after launch is one nobody
	 * finds, and the flag is easy to leave set because nothing complains.
	 */
	const config = read(path.join(ROOT, 'src/config/commons.ts'));
	const unnamed = /commons\.example/.test(config);
	const robots = read(path.join(DIST, 'robots.txt'));

	if (unnamed) {
		assert.match(robots, /Disallow: \//, 'robots.txt does not close an unlaunched origin');
		for (const file of htmlFiles) {
			assert.match(read(file), /noindex/, `${path.relative(DIST, file)} is indexable while the origin is a placeholder`);
		}
		return;
	}

	assert.doesNotMatch(robots, /Disallow: \/\s*$/m, 'the property is named but robots.txt still closes it');
	assert.match(robots, /Sitemap:/, 'a named property advertises no sitemap');
	for (const file of htmlFiles) {
		assert.doesNotMatch(
			read(file),
			/noindex/,
			`${path.relative(DIST, file)} is still noindex although the property is named`,
		);
	}
});

test('nothing behind a session reaches the sitemap', () => {
	/* A crawler finding a moderation queue listed is a bad look even when it
	   correctly 404s, and an intake form in an index is a page nobody signed in
	   can use. */
	const file = path.join(DIST, 'sitemap-0.xml');
	if (!fs.existsSync(file)) return;
	const xml = read(file);
	for (const route of ['/sign-in', '/account', '/moderate', '/contribute/new']) {
		assert.ok(!xml.includes(`${route}<`), `${route} is in the sitemap`);
	}
});

test('the build config and the site config agree on the origin', () => {
	/*
	 * Two files carry the origin - src/config/commons.ts, which every page and
	 * robots.txt read, and astro.config.mjs, which the sitemap reads. They
	 * disagreed the moment the property was named: robots.txt advertised a
	 * sitemap at birch.insure listing URLs at commons.example. Nothing failed,
	 * because nothing compared them. Now something does.
	 */
	const fromConfig = read(path.join(ROOT, 'src/config/commons.ts')).match(/origin:[^|]*\|\|\s*'([^']+)'/)?.[1];
	const fromBuild = read(path.join(ROOT, 'astro.config.mjs')).match(/site:[^|]*\|\|\s*'([^']+)'/)?.[1];

	assert.ok(fromConfig, 'no default origin found in src/config/commons.ts');
	assert.ok(fromBuild, 'no default site found in astro.config.mjs');
	assert.equal(
		fromBuild,
		fromConfig,
		'astro.config.mjs and src/config/commons.ts name different origins, so the sitemap and every canonical URL disagree',
	);

	/* And the sitemap actually carries it. */
	const sitemap = path.join(DIST, 'sitemap-0.xml');
	if (fs.existsSync(sitemap)) {
		assert.ok(
			read(sitemap).includes(fromConfig),
			`the sitemap lists URLs that are not on ${fromConfig}`,
		);
	}
});

test('the name and origin are declared in exactly one place', () => {
	/* Naming the property should be an edit to two lines and a wordmark, not a
	   search and replace across a build. */
	/* astro.config.mjs is outside src/ and is covered by the agreement test
	   above, which is the right check for it: it legitimately needs the value. */
	const sources = walk(path.join(ROOT, 'src'), (f) => /\.(astro|ts|css)$/.test(f));
	for (const file of sources) {
		if (file.endsWith('config/commons.ts')) continue;
		const body = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
		assert.ok(
			!body.includes('commons.example'),
			`${path.relative(ROOT, file)} hardcodes the placeholder origin instead of reading it from config/commons.ts`,
		);
	}
});
