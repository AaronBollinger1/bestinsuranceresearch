/**
 * Regulatory change impact graph (BR-F1).
 *
 * Fixture bulletins become dated, source-linked review candidates across
 * state, regulator, company, coverage, question, and stale-page entities.
 * Nothing here fetches, spends, or publishes. A company link stays unverified,
 * and a stale page is a re-read request rather than a changed conclusion.
 */
import { LICENSED_PUBLICATION_OPEN, PROVIDER_DISCOVERY_OPEN } from './release-candidate.ts';

export const IMPACT_PUBLICATION_OPEN: boolean = false;
export const IMPACT_PROVIDER_ENABLED: boolean = false;

export type ImpactEntityKind = 'state' | 'regulator' | 'company' | 'coverage' | 'question' | 'page';
export type ImpactEdgeKind = 'candidate-effect' | 'conflicts-with' | 'supersedes' | 'stale-page';
export type ImpactReviewState = 'unreviewed' | 'corrected' | 'withdrawn';

export interface ImpactSource {
	id: string;
	canonicalUrl: string;
	authority: string;
	jurisdiction: string;
	topic: string;
	effectiveDate: string;
	retrievedAt: string;
	rights: 'link-only' | 'blocked' | 'unreviewed';
	robots: 'allow' | 'disallow' | 'unknown';
	checksum: string;
	refreshOwner: string;
	removedAt: string | null;
}

export interface ImpactCorrection {
	at: string;
	note: string;
	previousEvidence: string;
}

export interface ImpactEdge {
	id: string;
	sourceId: string;
	kind: ImpactEdgeKind;
	entityKind: ImpactEntityKind;
	entityId: string;
	since: string;
	until: string | null;
	evidence: string;
	uncertainty: string;
	nextAction: string;
	reviewState: ImpactReviewState;
	verifiedCompanyEffect: false;
	coverageAdvice: null;
	corrections: ImpactCorrection[];
}

interface EdgeSnapshot {
	id: string;
	until: string | null;
	reviewState: ImpactReviewState;
	evidence: string;
	corrections: ImpactCorrection[];
}

interface SourceSnapshot {
	id: string;
	removedAt: string | null;
}

interface ImpactSnapshot {
	id: string;
	sources: SourceSnapshot[];
	edges: EdgeSnapshot[];
}

export interface ImpactGraph {
	sources: ImpactSource[];
	edges: ImpactEdge[];
	seen: Array<{ sourceId: string; canonicalUrl: string; checksum: string }>;
	log: Array<{ at: string; action: string; detail: string }>;
	providerCalls: number;
	spend: number;
	snapshots: ImpactSnapshot[];
}

export interface ImpactEntityInput {
	kind: Exclude<ImpactEntityKind, 'page'>;
	id: string;
	evidence: string;
	uncertainty: string;
}

export interface ImpactPageInput {
	path: string;
	lastChecked: string;
}

export interface ImpactIngestInput {
	now: string;
	id: string;
	canonicalUrl: string;
	authority: string;
	jurisdiction: string;
	topic: string;
	effectiveDate: string;
	retrievedAt: string;
	rights: ImpactSource['rights'];
	robots: ImpactSource['robots'];
	refreshOwner: string;
	text: string;
	entities: ImpactEntityInput[];
	pages: ImpactPageInput[];
	supersedes?: string | null;
	credential?: string;
	providerRequested?: boolean;
}

export function impactChecksum(text: string): string {
	let hash = 5381;
	for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash, 33) ^ text.charCodeAt(i);
	return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createImpactGraph(): ImpactGraph {
	return { sources: [], edges: [], seen: [], log: [], providerCalls: 0, spend: 0, snapshots: [] };
}

function note(graph: ImpactGraph, at: string, action: string, detail: string, state: string) {
	graph.log.push({ at, action, detail });
	return { graph, state, created: [] as ImpactEdge[] };
}

function takeSnapshot(graph: ImpactGraph, id: string): ImpactSnapshot {
	return {
		id,
		sources: graph.sources.map((source) => ({ id: source.id, removedAt: source.removedAt })),
		edges: graph.edges.map((edge) => ({
			id: edge.id,
			until: edge.until,
			reviewState: edge.reviewState,
			evidence: edge.evidence,
			corrections: edge.corrections.map((item) => ({ ...item })),
		})),
	};
}

function addEdge(graph: ImpactGraph, edge: Omit<ImpactEdge, 'id' | 'verifiedCompanyEffect' | 'coverageAdvice' | 'corrections'>): ImpactEdge {
	const created: ImpactEdge = {
		...edge,
		id: `edge-${edge.sourceId}-${edge.kind}-${edge.entityKind}-${edge.entityId}`,
		verifiedCompanyEffect: false,
		coverageAdvice: null,
		corrections: [],
	};
	graph.edges.push(created);
	return created;
}

export function ingestDevelopment(graph: ImpactGraph, input: ImpactIngestInput): { graph: ImpactGraph; state: string; created: ImpactEdge[] } {
	if (input.providerRequested || input.credential?.trim() || IMPACT_PROVIDER_ENABLED || PROVIDER_DISCOVERY_OPEN) {
		return note(graph, input.now, 'provider-refused', 'No provider was called. The fixture graph was left unchanged.', 'provider-refused');
	}
	const text = input.text.trim();
	const fields = [input.id, input.canonicalUrl, input.authority, input.jurisdiction, input.topic, input.effectiveDate, input.retrievedAt, input.refreshOwner, text];
	if (fields.some((value) => !value.trim()) || !input.canonicalUrl.startsWith('https://')) {
		return note(graph, input.now, 'incomplete', `${input.id || 'source'} is missing a required intake field.`, 'incomplete');
	}
	if (input.rights !== 'link-only' || input.robots !== 'allow') {
		return note(graph, input.now, 'rights-or-robots-closed', `${input.id} stored no edges.`, 'rights-or-robots-closed');
	}
	const checksum = impactChecksum(text);
	if (graph.seen.some((item) => item.canonicalUrl === input.canonicalUrl && item.checksum === checksum)) {
		return note(graph, input.now, 'duplicate', `${input.canonicalUrl} was already filed and was not overwritten.`, 'duplicate');
	}
	if (input.supersedes && !graph.sources.some((source) => source.id === input.supersedes && !source.removedAt)) {
		return note(graph, input.now, 'missing-predecessor', `${input.supersedes} is not a live source.`, 'missing-predecessor');
	}
	const peers = graph.sources.filter((source) => !source.removedAt && source.jurisdiction === input.jurisdiction && source.topic === input.topic && source.checksum !== checksum && source.id !== input.supersedes);
	graph.snapshots.push(takeSnapshot(graph, `${input.id}:${checksum}`));
	const source: ImpactSource = {
		id: input.id,
		canonicalUrl: input.canonicalUrl,
		authority: input.authority,
		jurisdiction: input.jurisdiction,
		topic: input.topic,
		effectiveDate: input.effectiveDate,
		retrievedAt: input.retrievedAt,
		rights: input.rights,
		robots: input.robots,
		checksum,
		refreshOwner: input.refreshOwner,
		removedAt: null,
	};
	graph.sources.push(source);
	graph.seen.push({ sourceId: source.id, canonicalUrl: source.canonicalUrl, checksum });
	const created: ImpactEdge[] = [];
	for (const entity of input.entities) {
		const company = entity.kind === 'company';
		created.push(addEdge(graph, {
			sourceId: source.id,
			kind: 'candidate-effect',
			entityKind: entity.kind,
			entityId: entity.id,
			since: source.effectiveDate,
			until: null,
			evidence: entity.evidence,
			uncertainty: company ? 'A company link is a candidate only. It is not a verified effect on that company.' : entity.uncertainty,
			nextAction: company ? 'Human review before any company-specific effect is recorded.' : 'Read the source and decide whether this candidate stays in the queue.',
			reviewState: 'unreviewed',
		}));
	}
	for (const page of input.pages) {
		if (page.lastChecked >= source.effectiveDate) continue;
		created.push(addEdge(graph, {
			sourceId: source.id,
			kind: 'stale-page',
			entityKind: 'page',
			entityId: page.path,
			since: source.effectiveDate,
			until: null,
			evidence: `${page.path} was last checked ${page.lastChecked}, before the bulletin effective date ${source.effectiveDate}.`,
			uncertainty: 'Stale means the page needs a re-read. It does not mean the published answer is wrong.',
			nextAction: 'Re-read the page against the bulletin. Leave the published answer unchanged until a person records a correction.',
			reviewState: 'unreviewed',
		}));
	}
	if (input.supersedes) {
		for (const edge of graph.edges) {
			if (edge.sourceId === input.supersedes && edge.until === null && edge.kind === 'candidate-effect') edge.until = source.effectiveDate;
		}
		created.push(addEdge(graph, {
			sourceId: source.id,
			kind: 'supersedes',
			entityKind: 'regulator',
			entityId: input.supersedes,
			since: source.effectiveDate,
			until: null,
			evidence: `${source.id} identifies ${input.supersedes} as the document it replaces.`,
			uncertainty: 'Supersession records the bulletin’s own claim. It is not a coverage conclusion.',
			nextAction: 'Confirm the replacement language in both documents before closing the older queue items.',
			reviewState: 'unreviewed',
		}));
	}
	for (const peer of peers) {
		created.push(addEdge(graph, {
			sourceId: source.id,
			kind: 'conflicts-with',
			entityKind: 'regulator',
			entityId: peer.id,
			since: source.retrievedAt.slice(0, 10),
			until: null,
			evidence: `${source.id} and ${peer.id} both address ${source.topic} in ${source.jurisdiction} and neither replaces the other.`,
			uncertainty: 'Both bulletins stay visible. The queue does not pick a winner.',
			nextAction: 'A person compares the two documents. Do not convert this conflict into a supersession.',
			reviewState: 'unreviewed',
		}));
	}
	graph.log.push({ at: input.now, action: 'ingested', detail: source.id });
	return { graph, state: 'ingested', created };
}

export function removeImpactSource(graph: ImpactGraph, sourceId: string, now: string): { graph: ImpactGraph; state: string } {
	const source = graph.sources.find((item) => item.id === sourceId);
	if (!source || source.removedAt) return { graph, state: 'absent' };
	graph.snapshots.push(takeSnapshot(graph, `remove:${sourceId}:${now}`));
	source.removedAt = now;
	for (const edge of graph.edges) {
		if (edge.sourceId === sourceId && edge.until === null) {
			edge.until = now;
			edge.reviewState = 'withdrawn';
		}
	}
	graph.log.push({ at: now, action: 'source-removed', detail: sourceId });
	return { graph, state: 'removed' };
}

export function correctImpactEdge(graph: ImpactGraph, edgeId: string, now: string, noteText: string): { graph: ImpactGraph; state: string } {
	const edge = graph.edges.find((item) => item.id === edgeId);
	if (!edge || edge.until !== null || !noteText.trim()) return { graph, state: 'absent' };
	graph.snapshots.push(takeSnapshot(graph, `correct:${edgeId}:${now}`));
	edge.corrections.push({ at: now, note: noteText.trim(), previousEvidence: edge.evidence });
	edge.evidence = noteText.trim();
	edge.reviewState = 'corrected';
	edge.verifiedCompanyEffect = false;
	edge.coverageAdvice = null;
	graph.log.push({ at: now, action: 'corrected', detail: edgeId });
	return { graph, state: 'corrected' };
}

export function rollbackImpact(graph: ImpactGraph, snapshotId: string, now: string): { graph: ImpactGraph; state: string } {
	const snapshot = graph.snapshots.find((item) => item.id === snapshotId);
	if (!snapshot) return { graph, state: 'absent' };
	const sourceIds = new Set(snapshot.sources.map((item) => item.id));
	const edgeIds = new Set(snapshot.edges.map((item) => item.id));
	for (const source of graph.sources) {
		const prior = snapshot.sources.find((item) => item.id === source.id);
		source.removedAt = prior ? prior.removedAt : source.removedAt ?? now;
		if (!sourceIds.has(source.id)) source.removedAt = now;
	}
	for (const edge of graph.edges) {
		const prior = snapshot.edges.find((item) => item.id === edge.id);
		if (prior) {
			edge.until = prior.until;
			edge.reviewState = prior.reviewState;
			edge.evidence = prior.evidence;
			edge.corrections = prior.corrections.map((item) => ({ ...item }));
		} else if (!edgeIds.has(edge.id)) {
			edge.until = now;
			edge.reviewState = 'withdrawn';
		}
	}
	graph.log.push({ at: now, action: 'rolled-back', detail: snapshotId });
	return { graph, state: 'rolled-back' };
}

export function impactPublication(options: { commonsReady: boolean; licensedOpen: boolean }): { eligible: false; indexable: false; sitemap: false; reasons: string[] } {
	const reasons = ['candidate-draft'];
	if (options.commonsReady) reasons.push('commons-does-not-publish-a-draft');
	if (!options.licensedOpen || !LICENSED_PUBLICATION_OPEN) reasons.push('licensed-publication-closed');
	if (!IMPACT_PUBLICATION_OPEN) reasons.push('impact-publication-closed');
	return { eligible: false, indexable: false, sitemap: false, reasons };
}

export function impactReviewQueue(graph: ImpactGraph): ImpactEdge[] {
	return graph.edges.filter((edge) => edge.until === null && edge.reviewState !== 'withdrawn');
}

const FIXTURE_ENTITIES: ImpactEntityInput[] = [
	{ kind: 'state', id: 'CA', evidence: 'The fixture bulletin names California.', uncertainty: 'The jurisdiction link is unread by a reviewer.' },
	{ kind: 'regulator', id: 'fixture-cdi', evidence: 'The fixture names the California Department of Insurance as the publisher.', uncertainty: 'Authority is copied from the fixture label, not from a new reading.' },
	{ kind: 'company', id: 'fixture-harbor-exchange', evidence: 'The fixture names one company as potentially interested. No effect is stated.', uncertainty: 'Unverified candidate.' },
	{ kind: 'coverage', id: 'earthquake', evidence: 'The fixture discusses earthquake-offer wording.', uncertainty: 'A coverage label is not a determination of what a policy pays.' },
	{ kind: 'question', id: 'homeowners-earthquake-california', evidence: 'The open question page is the research record a reviewer would re-read.', uncertainty: 'The question’s published answer is unchanged by this queue.' },
];

export function fixtureRegulatoryImpact(): { graph: ImpactGraph; duplicate: string; conflict: string } {
	const graph = createImpactGraph();
	const first: ImpactIngestInput = {
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
		entities: FIXTURE_ENTITIES,
		pages: [{ path: '/questions/homeowners-earthquake-california', lastChecked: '2026-08-01' }],
	};
	ingestDevelopment(graph, first);
	const duplicate = ingestDevelopment(graph, { ...first, now: '2026-09-15T01:00:00.000Z' }).state;
	const conflict = ingestDevelopment(graph, {
		...first,
		now: '2026-09-20T00:00:00.000Z',
		id: 'fixture-bulletin-ca-2026-09-b',
		canonicalUrl: 'https://www.insurance.ca.gov/fixture/bulletin-ca-2026-09-b',
		effectiveDate: '2026-09-18',
		retrievedAt: '2026-09-20T00:00:00.000Z',
		text: 'Fixture bulletin B addresses the same earthquake offer and does not say it replaces bulletin A.',
		entities: [{ kind: 'state', id: 'CA', evidence: 'Bulletin B also names California.', uncertainty: 'The second bulletin is unresolved against the first.' }],
		pages: [],
	}).state;
	return { graph, duplicate, conflict };
}

export function presentRegulatoryImpact(graph: ImpactGraph = fixtureRegulatoryImpact().graph) {
	const publication = impactPublication({ commonsReady: false, licensedOpen: LICENSED_PUBLICATION_OPEN });
	return {
		recordType: 'regulatory-impact-review',
		indexable: false as const,
		sitemap: false as const,
		providerCalls: graph.providerCalls,
		spend: graph.spend,
		providerEnabled: IMPACT_PROVIDER_ENABLED,
		disclaimer: 'This queue does not decide coverage and does not verify a company-specific effect.',
		publication,
		sources: graph.sources,
		queue: impactReviewQueue(graph).map((edge) => ({
			edgeId: edge.id,
			sourceId: edge.sourceId,
			kind: edge.kind,
			entityKind: edge.entityKind,
			entityId: edge.entityId,
			since: edge.since,
			until: edge.until,
			evidence: edge.evidence,
			uncertainty: edge.uncertainty,
			nextAction: edge.nextAction,
			reviewState: edge.reviewState,
			verifiedCompanyEffect: edge.verifiedCompanyEffect,
			coverageAdvice: edge.coverageAdvice,
		})),
	};
}
