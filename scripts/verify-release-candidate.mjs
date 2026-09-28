/**
 * BR-P1: separate release gates and one status surface.
 *
 *   node --experimental-strip-types --test scripts/verify-release-candidate.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
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
	assert.equal(closed.publicIndexing, true);
	const published = publicationDecision(closed, reviewed);
	const stillPublished = publicationDecision(commonsOpen, reviewed);
	assert.equal(published.indexable, true);
	assert.equal(stillPublished.indexable, true);
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
