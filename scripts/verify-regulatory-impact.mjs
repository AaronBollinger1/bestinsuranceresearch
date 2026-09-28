/**
 * BR-F1: regulatory change impact graph. Publication and providers stay closed.
 *
 *   node --experimental-strip-types --test scripts/verify-regulatory-impact.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LICENSED_PUBLICATION_OPEN, PROVIDER_DISCOVERY_OPEN } from '../src/lib/release-candidate.ts';
import {
	IMPACT_PROVIDER_ENABLED,
	IMPACT_PUBLICATION_OPEN,
	correctImpactEdge,
	createImpactGraph,
	fixtureRegulatoryImpact,
	impactPublication,
	impactReviewQueue,
	ingestDevelopment,
	presentRegulatoryImpact,
	removeImpactSource,
	rollbackImpact,
} from '../src/lib/regulatory-impact.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const bulletin = {
	now: '2026-09-15T00:00:00.000Z',
	id: 'fixture-bulletin-ca-2026-09',
	canonicalUrl: 'https://www.insurance.ca.gov/fixture/bulletin-ca-2026-09',
	authority: 'California Department of Insurance',
	jurisdiction: 'CA',
	topic: 'earthquake-offer',
	effectiveDate: '2026-09-01',
	retrievedAt: '2026-09-15T00:00:00.000Z',
	rights: 'link-only',
	robots: 'allow',
	refreshOwner: 'fixture-regulator-editor',
	text: 'Fixture bulletin A says the earthquake offer wording changed on 2026-09-01.',
	entities: [
		{ kind: 'state', id: 'CA', evidence: 'Names California.', uncertainty: 'Unread.' },
		{ kind: 'company', id: 'fixture-harbor-exchange', evidence: 'Names a company without stating an effect.', uncertainty: 'Unread.' },
	],
	pages: [{ path: '/questions/homeowners-earthquake-california', lastChecked: '2026-08-01' }],
};

test('intake keeps the source fields and refuses a closed or duplicate filing', () => {
	assert.equal(IMPACT_PUBLICATION_OPEN, false);
	assert.equal(IMPACT_PROVIDER_ENABLED, false);
	assert.equal(LICENSED_PUBLICATION_OPEN, false);
	assert.equal(PROVIDER_DISCOVERY_OPEN, false);
	const graph = createImpactGraph();
	const filed = ingestDevelopment(graph, bulletin);
	assert.equal(filed.state, 'ingested');
	const source = graph.sources[0];
	assert.equal(source.canonicalUrl, bulletin.canonicalUrl);
	assert.equal(source.authority, bulletin.authority);
	assert.equal(source.jurisdiction, 'CA');
	assert.equal(source.effectiveDate, '2026-09-01');
	assert.equal(source.retrievedAt, bulletin.retrievedAt);
	assert.equal(source.rights, 'link-only');
	assert.equal(source.robots, 'allow');
	assert.equal(source.refreshOwner, 'fixture-regulator-editor');
	assert.match(source.checksum, /^[0-9a-f]{8}$/);
	assert.equal(ingestDevelopment(graph, { ...bulletin, now: '2026-09-15T01:00:00.000Z' }).state, 'duplicate');
	assert.equal(graph.sources.length, 1);
	assert.equal(ingestDevelopment(graph, { ...bulletin, id: 'blocked', canonicalUrl: 'https://example.test/blocked', text: 'other', rights: 'blocked', now: '2026-09-16T00:00:00.000Z' }).state, 'rights-or-robots-closed');
	assert.equal(graph.providerCalls, 0);
	assert.equal(graph.spend, 0);
});

test('edges stay reversible, source-linked, and free of coverage advice', () => {
	const graph = createImpactGraph();
	ingestDevelopment(graph, bulletin);
	const company = graph.edges.find((edge) => edge.entityKind === 'company');
	assert.equal(company.verifiedCompanyEffect, false);
	assert.equal(company.coverageAdvice, null);
	assert.equal(company.since, '2026-09-01');
	assert.equal(company.until, null);
	assert.equal(company.sourceId, bulletin.id);
	assert.match(company.nextAction, /Human review/);
	const stale = graph.edges.find((edge) => edge.kind === 'stale-page');
	assert.equal(stale.entityId, '/questions/homeowners-earthquake-california');
	assert.match(stale.uncertainty, /does not mean the published answer is wrong/);
	const fresh = createImpactGraph();
	ingestDevelopment(fresh, { ...bulletin, pages: [{ path: '/questions/homeowners-earthquake-california', lastChecked: '2026-09-02' }] });
	assert.equal(fresh.edges.some((edge) => edge.kind === 'stale-page'), false);

	const conflict = ingestDevelopment(graph, {
		...bulletin,
		now: '2026-09-20T00:00:00.000Z',
		id: 'fixture-bulletin-ca-2026-09-b',
		canonicalUrl: 'https://www.insurance.ca.gov/fixture/bulletin-ca-2026-09-b',
		effectiveDate: '2026-09-18',
		retrievedAt: '2026-09-20T00:00:00.000Z',
		text: 'Fixture bulletin B addresses the same earthquake offer and does not say it replaces bulletin A.',
		entities: [{ kind: 'state', id: 'CA', evidence: 'Also California.', uncertainty: 'Unresolved.' }],
		pages: [],
	});
	assert.equal(conflict.state, 'ingested');
	assert.equal(graph.edges.some((edge) => edge.kind === 'conflicts-with' && edge.entityId === bulletin.id), true);
	assert.equal(graph.edges.some((edge) => edge.kind === 'supersedes'), false);
	assert.equal(graph.edges.find((edge) => edge.id === company.id).until, null);

	const replacement = ingestDevelopment(graph, {
		...bulletin,
		now: '2026-10-01T00:00:00.000Z',
		id: 'fixture-bulletin-ca-2026-10',
		canonicalUrl: 'https://www.insurance.ca.gov/fixture/bulletin-ca-2026-10',
		effectiveDate: '2026-10-01',
		retrievedAt: '2026-10-01T00:00:00.000Z',
		text: 'Fixture bulletin C says it replaces bulletin A.',
		entities: [],
		pages: [],
		supersedes: bulletin.id,
	});
	assert.equal(replacement.state, 'ingested');
	assert.equal(graph.edges.find((edge) => edge.id === company.id).until, '2026-10-01');
	assert.equal(graph.edges.some((edge) => edge.kind === 'supersedes' && edge.entityId === bulletin.id), true);
	const snapshotId = `fixture-bulletin-ca-2026-10:${graph.sources.find((source) => source.id === 'fixture-bulletin-ca-2026-10').checksum}`;
	assert.equal(rollbackImpact(graph, snapshotId, '2026-10-02T00:00:00.000Z').state, 'rolled-back');
	assert.equal(graph.edges.find((edge) => edge.id === company.id).until, null);
	assert.equal(graph.sources.find((source) => source.id === 'fixture-bulletin-ca-2026-10').removedAt, '2026-10-02T00:00:00.000Z');
	assert.equal(graph.edges.find((edge) => edge.kind === 'supersedes').reviewState, 'withdrawn');
});

test('removal, correction, provider refusal, and publication stay deterministic', () => {
	const graph = createImpactGraph();
	ingestDevelopment(graph, bulletin);
	const edgeId = graph.edges.find((edge) => edge.entityKind === 'state').id;
	assert.equal(correctImpactEdge(graph, edgeId, '2026-09-16T00:00:00.000Z', 'The jurisdiction label was confirmed against the fixture URL.').state, 'corrected');
	const corrected = graph.edges.find((edge) => edge.id === edgeId);
	assert.equal(corrected.reviewState, 'corrected');
	assert.equal(corrected.coverageAdvice, null);
	assert.equal(corrected.corrections[0].previousEvidence, 'Names California.');
	assert.equal(removeImpactSource(graph, bulletin.id, '2026-09-17T00:00:00.000Z').state, 'removed');
	assert.equal(graph.sources[0].removedAt, '2026-09-17T00:00:00.000Z');
	assert.equal(graph.edges.find((edge) => edge.id === edgeId).until, '2026-09-17T00:00:00.000Z');
	assert.equal(impactReviewQueue(graph).some((edge) => edge.sourceId === bulletin.id && edge.until === null), false);
	assert.equal(rollbackImpact(graph, `remove:${bulletin.id}:2026-09-17T00:00:00.000Z`, '2026-09-18T00:00:00.000Z').state, 'rolled-back');
	assert.equal(graph.sources[0].removedAt, null);
	const before = graph.sources.length;
	assert.equal(ingestDevelopment(graph, { ...bulletin, id: 'live', canonicalUrl: 'https://example.test/live', text: 'live text', now: '2026-09-19T00:00:00.000Z', providerRequested: true }).state, 'provider-refused');
	assert.equal(ingestDevelopment(graph, { ...bulletin, id: 'live', canonicalUrl: 'https://example.test/live', text: 'live text', now: '2026-09-19T00:00:00.000Z', credential: 'secret' }).state, 'provider-refused');
	assert.equal(graph.sources.length, before);
	assert.equal(graph.providerCalls, 0);
	assert.equal(graph.spend, 0);
	const opened = impactPublication({ commonsReady: true, licensedOpen: true });
	assert.equal(opened.eligible, false);
	assert.equal(opened.indexable, false);
	assert.equal(opened.sitemap, false);
});

test('a reused source id is rejected before the graph changes', () => {
	const graph = createImpactGraph();
	assert.equal(ingestDevelopment(graph, bulletin).state, 'ingested');
	const before = JSON.stringify(graph);
	const reused = ingestDevelopment(graph, {
		...bulletin,
		now: '2026-09-21T00:00:00.000Z',
		canonicalUrl: 'https://www.insurance.ca.gov/fixture/bulletin-ca-reused-id',
		text: 'Different fixture text that reuses the same source id.',
		retrievedAt: '2026-09-21T00:00:00.000Z',
	});
	assert.equal(reused.state, 'duplicate-source-id');
	assert.equal(reused.created.length, 0);
	assert.equal(JSON.stringify(graph), before);
	const sourceIds = graph.sources.map((source) => source.id);
	const edgeIds = graph.edges.map((edge) => edge.id);
	assert.equal(new Set(sourceIds).size, sourceIds.length);
	assert.equal(new Set(edgeIds).size, edgeIds.length);
	assert.equal(graph.edges.some((edge) => edge.kind === 'conflicts-with' && edge.entityId === edge.sourceId), false);
});

test('the review route and json companion stay noindex drafts', () => {
	const fixture = fixtureRegulatoryImpact();
	assert.equal(fixture.duplicate, 'duplicate');
	assert.equal(fixture.conflict, 'ingested');
	const presented = presentRegulatoryImpact(fixture.graph);
	assert.equal(presented.indexable, false);
	assert.equal(presented.queue.some((item) => item.kind === 'conflicts-with'), true);
	assert.equal(presented.queue.some((item) => item.kind === 'stale-page'), true);
	assert.equal(presented.queue.every((item) => item.coverageAdvice === null && item.verifiedCompanyEffect === false), true);
	const page = read('src/pages/regulatory-impact.astro');
	const json = read('src/pages/regulatory-impact.json.ts');
	assert.match(page, /noindex/);
	assert.match(page, /Not coverage advice/);
	assert.match(page, /presentRegulatoryImpact/);
	assert.match(json, /presentRegulatoryImpact/);
	assert.match(read('astro.config.mjs'), /regulatory-impact\\\/\?\$/);
	assert.match(read('src/pages/review-queue.astro'), /\/regulatory-impact/);
	assert.equal(read('src/lib/release-candidate.ts').includes('LICENSED_PUBLICATION_OPEN: boolean = false'), true);
});
