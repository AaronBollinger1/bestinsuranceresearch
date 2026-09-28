/**
 * BR-P1: separate release gates and one status surface.
 *
 *   node --experimental-strip-types --test scripts/verify-release-candidate.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	ADDED_SURFACE,
	AUDITED_SURFACES,
	CONTRIBUTION_INTAKE_OPEN,
	LICENSED_PUBLICATION_OPEN,
	PROVIDER_DISCOVERY_OPEN,
	authorizeFixture,
	closedAdapter,
	gatesFromEnv,
	health,
	presentStatus,
	providerDiscovery,
	publicationDecision,
	redactTelemetry,
	rollbackAdapter,
	validateAdapter,
} from '../src/lib/release-candidate.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reviewed = {
	reviewed: true,
	rightsCleared: true,
	fresh: true,
	editorial: true,
	licensedReview: true,
	withdrawn: false,
	superseded: false,
	draft: false,
};

test('commons does not open or hide the reviewed estate', () => {
	assert.equal(CONTRIBUTION_INTAKE_OPEN, false);
	assert.equal(LICENSED_PUBLICATION_OPEN, false);
	assert.equal(PROVIDER_DISCOVERY_OPEN, false);
	const closed = gatesFromEnv({ PUBLIC_SITE_ENV: 'production', PUBLIC_COMMONS_READY: 'false', PROVIDER_KEY: 'sk-secret' });
	const commonsOpen = gatesFromEnv({ PUBLIC_SITE_ENV: 'production', PUBLIC_COMMONS_READY: 'true' });
	const preview = gatesFromEnv({ PUBLIC_SITE_ENV: 'preview', PUBLIC_COMMONS_READY: 'true' });
	assert.equal(closed.commonsReady, false);
	assert.equal(closed.contributionIntake, false);
	assert.equal(closed.licensedPublication, false);
	assert.equal(closed.providerDiscovery, false);
	assert.equal(closed.readOnlySite, true);
	assert.equal(closed.publicIndexing, false);
	const indexingOpen = gatesFromEnv({ PUBLIC_SITE_ENV: 'production', PUBLIC_COMMONS_READY: 'false', PUBLIC_INDEXING_OPEN: 'true' });
	assert.equal(indexingOpen.publicIndexing, true);
	assert.equal(indexingOpen.commonsReady, false);
	assert.equal(gatesFromEnv({ PUBLIC_SITE_ENV: 'production', PUBLIC_COMMONS_READY: 'yes' }).publicIndexing, false);
	assert.equal(gatesFromEnv({ PUBLIC_SITE_ENV: 'preview', PUBLIC_INDEXING_OPEN: 'true', PUBLIC_COMMONS_READY: 'false' }).publicIndexing, false);
	const published = publicationDecision(indexingOpen, reviewed);
	const stillClosed = publicationDecision(commonsOpen, reviewed);
	assert.equal(published.indexable, true);
	assert.equal(stillClosed.indexable, false);
	assert.equal(publicationDecision(closed, reviewed).indexable, false);
	assert.equal(published.robots, 'index, follow');
	assert.equal(published.sitemap, true);
	assert.equal(published.schema, 'WebPage');
	assert.equal(published.exportable, true);
	assert.equal(publicationDecision(preview, reviewed).indexable, false);
	assert.equal(publicationDecision(commonsOpen, { ...reviewed, draft: true }).indexable, false);
	assert.equal(publicationDecision(closed, { ...reviewed, licensedReview: false }).reasons.includes('licensed review is missing'), true);
	assert.equal(publicationDecision(closed, { ...reviewed, withdrawn: true }).sitemap, false);
	assert.equal(publicationDecision(closed, { ...reviewed, superseded: true }).schema, null);
});

test('adapter health, rollback, sessions, and provider outage fail closed', () => {
	const ready = closedAdapter();
	assert.equal(validateAdapter(ready).ok, true);
	assert.equal(validateAdapter({ ...ready, secret: 'sk-live' }).ok, false);
	assert.equal(validateAdapter({ ...ready, liveUsers: true }).ok, false);
	assert.equal(validateAdapter({ ...ready, paidProvider: true }).ok, false);
	assert.equal(validateAdapter({ ...ready, automaticPublisher: true }).ok, false);
	assert.equal(validateAdapter({ ...ready, sessions: false }).ok, false);
	const rolled = rollbackAdapter(ready, { ...ready, secret: 'sk-live' });
	assert.equal(rolled.rolledBack, true);
	assert.equal(rolled.config.secret, null);
	const report = health(gatesFromEnv({}), ready);
	assert.equal(report.status, 'up');
	assert.equal(report.secrets, 0);
	assert.equal(report.adapterOk, true);
	const now = '2026-09-27T12:05:00.000Z';
	const session = { id: 's1', role: 'consumer', expiresAt: '2026-09-27T13:00:00.000Z', revoked: false, receiptUsed: false };
	assert.equal(authorizeFixture(undefined, now, 'consumer').state, 'session-missing');
	assert.equal(authorizeFixture({ ...session, expiresAt: '2026-09-27T12:00:00.000Z' }, now, 'consumer').state, 'session-expired');
	assert.equal(authorizeFixture({ ...session, receiptUsed: true }, now, 'consumer').state, 'replayed');
	assert.equal(authorizeFixture({ ...session, revoked: true }, now, 'consumer').state, 'revoked');
	assert.equal(authorizeFixture(session, now, 'owner').state, 'permission-denied');
	assert.equal(authorizeFixture(session, now, 'consumer').state, 'authorized');
	assert.equal(providerDiscovery(true).calls, 0);
	assert.equal(providerDiscovery(true).state, 'outage');
	assert.equal(providerDiscovery(false).state, 'closed');
	assert.equal(redactTelemetry('user@example.com bearer abc.def sk-livekey'), '[redacted] bearer [redacted] [redacted]');
	assert.equal(redactTelemetry('user@example.com bearer abc.def sk-livekey').includes('@'), false);
});

test('the status route is the only added surface and stays linked', () => {
	assert.equal(ADDED_SURFACE.path, '/status');
	assert.equal(AUDITED_SURFACES.some((item) => item.path === '/status'), false);
	for (const item of AUDITED_SURFACES) {
		assert.equal(fs.existsSync(path.join(ROOT, 'src/pages', `${item.path.slice(1)}.astro`)), true, item.path);
	}
	const page = fs.readFileSync(path.join(ROOT, 'src/pages/status.astro'), 'utf8');
	assert.match(page, /gatesFromEnv/);
	assert.match(page, /presentStatus/);
	assert.equal(page.includes('noindex'), false);
	const footer = fs.readFileSync(path.join(ROOT, 'src/config/site.ts'), 'utf8');
	assert.match(footer, /\/status/);
	const html = presentStatus(gatesFromEnv({ PUBLIC_COMMONS_READY: 'false' }), true);
	assert.match(html, /data-gate="commons-access"/);
	assert.match(html, /closed/);
	assert.match(html, /data-health="up"/);
	assert.equal((html.match(/<h1[\s>]/g) || []).length, 0);
});

function buildProduction(indexingOpen) {
	const env = { ...process.env, PUBLIC_SITE_ENV: 'production', PUBLIC_SITE_ORIGIN: 'https://birch.insure', PUBLIC_COMMONS_READY: 'false' };
	delete env.PUBLIC_INDEXING_OPEN;
	if (indexingOpen) env.PUBLIC_INDEXING_OPEN = 'true';
	const result = spawnSync('npx', ['astro', 'build'], { cwd: ROOT, env, encoding: 'utf8' });
	assert.equal(result.status, 0, result.stderr?.slice(-800) || result.stdout?.slice(-800));
}

function locs() {
	return fs.readdirSync(path.join(ROOT, 'dist'))
		.filter((name) => /^sitemap.*\.xml$/.test(name))
		.flatMap((name) => [...fs.readFileSync(path.join(ROOT, 'dist', name), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
}

test('built production output follows the indexing gate and keeps route exclusions', () => {
	buildProduction(true);
	const openHome = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
	const openStatus = fs.readFileSync(path.join(ROOT, 'dist/status/index.html'), 'utf8');
	const openRobots = fs.readFileSync(path.join(ROOT, 'dist/robots.txt'), 'utf8');
	const openLibrary = fs.readFileSync(path.join(ROOT, 'dist/library/state/fixture-state-ca/index.html'), 'utf8');
	const openDesign = fs.readFileSync(path.join(ROOT, 'dist/design/corpus-matrix/index.html'), 'utf8');
	const openLocs = locs();
	assert.match(openHome, /<meta name="robots" content="index, follow, max-image-preview:large">/);
	assert.match(openStatus, /data-gate="public-indexing">open/);
	assert.match(openStatus, /data-gate="commons-access">closed/);
	assert.match(openRobots, /^Allow: \//m);
	assert.match(openRobots, /Sitemap: https:\/\/birch\.insure\/sitemap-index\.xml/);
	assert.ok(openLocs.some((loc) => loc === 'https://birch.insure/' || loc === 'https://birch.insure'));
	assert.equal(openLocs.some((loc) => loc.includes('/design/')), false);
	assert.equal(openLocs.some((loc) => loc.includes('/library/')), false);
	assert.match(openLibrary, /<meta name="robots" content="noindex, nofollow">/);
	assert.match(openDesign, /<meta name="robots" content="noindex, nofollow">/);

	buildProduction(false);
	const closedHome = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
	const closedStatus = fs.readFileSync(path.join(ROOT, 'dist/status/index.html'), 'utf8');
	const closedRobots = fs.readFileSync(path.join(ROOT, 'dist/robots.txt'), 'utf8');
	assert.match(closedHome, /<link rel="canonical" href="https:\/\/birch\.insure\/">/);
	assert.match(closedHome, /<meta name="robots" content="noindex, nofollow">/);
	assert.match(closedStatus, /data-gate="read-only-site">open/);
	assert.match(closedStatus, /data-gate="public-indexing">closed/);
	assert.match(closedStatus, /data-gate="commons-access">closed/);
	assert.match(closedRobots, /^Disallow: \//m);
	assert.equal(closedRobots.includes('Sitemap:'), false);
	assert.equal(locs().length, 0);

	const preview = spawnSync('npx', ['astro', 'build'], {
		cwd: ROOT,
		env: { ...process.env, PUBLIC_SITE_ENV: 'preview', PUBLIC_SITE_ORIGIN: 'https://birch.insure', PUBLIC_COMMONS_READY: 'false', PUBLIC_INDEXING_OPEN: 'true' },
		encoding: 'utf8',
	});
	assert.equal(preview.status, 0, preview.stderr?.slice(-800) || preview.stdout?.slice(-800));
	const previewHome = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
	const previewStatus = fs.readFileSync(path.join(ROOT, 'dist/status/index.html'), 'utf8');
	const previewRobots = fs.readFileSync(path.join(ROOT, 'dist/robots.txt'), 'utf8');
	assert.match(previewHome, /<meta name="robots" content="noindex, nofollow">/);
	assert.match(previewStatus, /data-gate="public-indexing">closed/);
	assert.match(previewRobots, /^Disallow: \//m);
	assert.equal(previewRobots.includes('Sitemap:'), false);
	assert.equal(locs().length, 0);
	buildProduction(false);
}, { timeout: 240000 });
