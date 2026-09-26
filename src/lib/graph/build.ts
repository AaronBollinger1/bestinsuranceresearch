/**
 * Deriving the graph from records that already exist.
 *
 * This module owns no data. Every node and edge it returns is computed from a
 * record that is already on disk and already the source of truth for itself, so
 * there is exactly one place to correct a fact and the graph cannot drift away
 * from the corpus. Nothing here writes, caches, or persists.
 *
 * Collections are passed in rather than read from the filesystem, for two
 * reasons: it keeps this file free of node built-ins so an Astro page could use
 * it later, and it lets the verifier feed it synthetic fixtures to prove the
 * integrity checks actually fire. A checker that has only ever seen valid input
 * has not been tested.
 */
import { nodeId, claimLocalId, type NodeKind } from './ids.ts';
import { LAYER_RULES, layerAdmits, type Layer } from './layers.ts';
import { REGISTRY_BY_KIND, requiresCitation } from './registry.ts';
import {
	canonicalEnds,
	edgeKey,
	edgeProblems,
	supersessionCycles,
	EVIDENCE_REQUIRED_EDGES,
	type Edge,
	type EdgeKind,
	UNKNOWN_DATE,
} from './edges.ts';
/*
 * The line registry resolves declared values to canonical ids. Records declare
 * lines as phrases and aliases - "commercial general liability", "cgl",
 * "epli" - and src/lib/lines.ts already owns the mapping from those to the
 * canonical slug. Re-slugifying here would be a second, quietly divergent copy
 * of that logic, which is the exact duplication this unit is meant to avoid.
 */
import { canonicalLine } from '../lines.ts';

export interface Record_ {
	id: string;
	data: Record<string, unknown>;
}

export interface GraphInput {
	sources?: Record_[];
	questions?: Record_[];
	coverages?: Record_[];
	companies?: Record_[];
	states?: Record_[];
	people?: Record_[];
	examples?: Record_[];
	modules?: Record_[];
	crossRules?: Record_[];
	figures?: Record_[];
	tools?: Record_[];
	canonicalLines?: readonly string[];
	/** Gates. Both default closed, which is the safe direction. */
	licensedReviewRecorded?: boolean;
	commonsOpen?: boolean;
}

export interface Node {
	id: string;
	kind: NodeKind;
	local: string;
	layer: Layer;
	label: string;
	reviewState?: string;
	/** Whether this node's record carries at least one citation. */
	hasCitation: boolean;
}

export interface Graph {
	nodes: Node[];
	edges: Edge[];
	byId: Map<string, Node>;
}

const str = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** Astro `reference()` fields arrive as either a bare id or `{ id }`. */
const refId = (value: unknown): string | undefined =>
	typeof value === 'string' ? value : typeof value === 'object' && value !== null ? str((value as { id?: unknown }).id) : undefined;

const refIds = (value: unknown): string[] => arr(value).map(refId).filter((id): id is string => Boolean(id));

function layerFor(kind: NodeKind): Layer {
	return REGISTRY_BY_KIND.get(kind)?.defaultLayer ?? 'birch-analysis';
}

function makeNode(kind: NodeKind, local: string, label: string, options: { reviewState?: string; hasCitation: boolean }): Node {
	return {
		id: nodeId(kind, local),
		kind,
		local,
		layer: layerFor(kind),
		label,
		reviewState: options.reviewState,
		hasCitation: options.hasCitation,
	};
}

function edge(
	kind: EdgeKind,
	from: string,
	to: string,
	options: { since?: string; until?: string | null; layer?: Layer; evidence?: readonly string[]; note?: string } = {},
): Edge {
	const ends = canonicalEnds(kind, from, to);
	return {
		kind,
		from: ends.from,
		to: ends.to,
		since: options.since ?? UNKNOWN_DATE,
		until: options.until ?? null,
		layer: options.layer ?? 'official-fact',
		evidence: options.evidence ?? [],
		note: options.note,
	};
}

export function buildGraph(input: GraphInput): Graph {
	const nodes: Node[] = [];
	const edges: Edge[] = [];

	/*
	 * Jurisdiction records are keyed by name ("california") and carry the code
	 * ("CA") as a field, while sources declare the code. The mapping is built
	 * from the records rather than assumed, because deriving `ca` from `CA` would
	 * mint an address for a record that does not exist.
	 *
	 * And most declared jurisdictions have no record: sources span 14 values -
	 * including `US` and `n/a`, which are not states at all - against three state
	 * records. An edge is emitted only where the jurisdiction is genuinely
	 * modelled. The rest is a real coverage gap, counted by a test in
	 * scripts/verify-graph.mjs rather than hidden by inventing the missing nodes.
	 */
	const jurisdictionByCode = new Map<string, string>();
	for (const state of input.states ?? []) {
		const code = str(state.data.code);
		if (code) jurisdictionByCode.set(code.toUpperCase(), state.id);
	}

	/* ---- sources, and the claims addressed inside them ---- */
	for (const source of input.sources ?? []) {
		const sourceCited = arr(source.data.claims).length > 0;
		nodes.push(makeNode('source', source.id, str(source.data.title) ?? source.id, { hasCitation: sourceCited }));

		arr(source.data.claims).forEach((text, index) => {
			const local = claimLocalId(source.id, index + 1);
			nodes.push(makeNode('claim', local, str(text) ?? '', { hasCitation: true }));
			edges.push(edge('cites', nodeId('claim', local), nodeId('source', source.id), { evidence: [source.id] }));
		});

		/*
		 * Supersession is already recorded on the source. It becomes an edge here
		 * rather than a second field, so the chain stays queryable without the
		 * corpus gaining a competing record of it.
		 */
		const supersededBy = refId(source.data.supersededBy);
		if (supersededBy) {
			edges.push(
				edge('supersedes', nodeId('source', supersededBy), nodeId('source', source.id), {
					evidence: [source.id],
					note: str(source.data.statusNote),
				}),
			);
		}

		const stateId = jurisdictionByCode.get((str(source.data.jurisdiction) ?? '').toUpperCase());
		if (stateId) {
			edges.push(edge('applies-in', nodeId('source', source.id), nodeId('jurisdiction', stateId), { evidence: [source.id] }));
		}
	}

	/* ---- jurisdictions ---- */
	for (const state of input.states ?? []) {
		nodes.push(
			makeNode('jurisdiction', state.id, str(state.data.name) ?? state.id, {
				reviewState: str(state.data.reviewState),
				hasCitation: refIds(state.data.sourceIds).length > 0,
			}),
		);
	}

	/* ---- organisations: insurers, regulators, groups, residual markets ---- */
	for (const org of input.companies ?? []) {
		const sourceIds = refIds(org.data.sourceIds);
		nodes.push(
			makeNode('organisation', org.id, str(org.data.legalName) ?? org.id, {
				reviewState: str(org.data.reviewState),
				hasCitation: sourceIds.length > 0,
			}),
		);
		for (const sourceId of sourceIds) {
			edges.push(edge('cites', nodeId('organisation', org.id), nodeId('source', sourceId), { evidence: [sourceId] }));
		}
		for (const code of arr(org.data.jurisdictions)) {
			const jurisdictionId = jurisdictionByCode.get((str(code) ?? '').toUpperCase());
			if (!jurisdictionId) continue;
			const kind: EdgeKind = str(org.data.orgType) === 'regulator' ? 'regulates' : 'licensed-in';
			edges.push(
				edge(kind, nodeId('organisation', org.id), nodeId('jurisdiction', jurisdictionId), {
					evidence: sourceIds,
					note: 'Derived from the record’s stated jurisdictions. Not a live licence lookup.',
				}),
			);
		}
	}

	/* ---- product lines ---- */
	for (const line of input.canonicalLines ?? []) {
		nodes.push(makeNode('product-line', line, line, { hasCitation: false }));
	}

	/* ---- editorial records ---- */
	const editorial: Array<[NodeKind, Record_[] | undefined, (data: Record<string, unknown>) => string]> = [
		['question', input.questions, (d) => str(d.question) ?? ''],
		['coverage', input.coverages, (d) => str(d.title) ?? str(d.name) ?? ''],
		['example', input.examples, (d) => str(d.title) ?? ''],
		['module', input.modules, (d) => str(d.name) ?? str(d.title) ?? ''],
		['cross-rule', input.crossRules, (d) => str(d.title) ?? str(d.name) ?? ''],
		['figure', input.figures, (d) => str(d.label) ?? str(d.title) ?? ''],
		['tool', input.tools, (d) => str(d.name) ?? ''],
	];

	for (const [kind, records, label] of editorial) {
		for (const record of records ?? []) {
			const sourceIds = refIds(record.data.sourceIds);
			nodes.push(
				makeNode(kind, record.id, label(record.data) || record.id, {
					reviewState: str(record.data.reviewState),
					hasCitation: sourceIds.length > 0,
				}),
			);
			for (const sourceId of sourceIds) {
				edges.push(edge('cites', nodeId(kind, record.id), nodeId('source', sourceId), { layer: 'birch-analysis', evidence: [sourceId] }));
			}
			for (const lineName of arr(record.data.lines)) {
				const declared = str(lineName);
				if (!declared) continue;
				/*
				 * An unresolvable line is skipped here rather than turned into a node,
				 * because minting `birch:product-line:<whatever-was-typed>` would create
				 * a line that exists only in the graph. That every declared line does
				 * resolve is already asserted by the line-registry tests in
				 * scripts/verify.mjs, which is the right place for it.
				 */
				const line = canonicalLine(declared);
				if (line) edges.push(edge('concerns', nodeId(kind, record.id), nodeId('product-line', line), { layer: 'birch-analysis', evidence: sourceIds }));
			}
			for (const related of refIds(record.data.related)) {
				edges.push(edge('related-to', nodeId(kind, record.id), nodeId(kind, related), { layer: 'birch-analysis', evidence: [] }));
			}
		}
	}

	/* ---- people, and the accountability edges that point at them ---- */
	const peopleByName = new Map<string, string>();
	for (const person of input.people ?? []) {
		const name = str(person.data.name) ?? person.id;
		peopleByName.set(name, person.id);
		nodes.push(makeNode('person', person.id, name, { hasCitation: false }));
	}

	const attributable = [
		...(input.questions ?? []).map((r) => ['question', r] as const),
		...(input.coverages ?? []).map((r) => ['coverage', r] as const),
		...(input.companies ?? []).map((r) => ['organisation', r] as const),
		...(input.states ?? []).map((r) => ['jurisdiction', r] as const),
		...(input.examples ?? []).map((r) => ['example', r] as const),
	];
	for (const [kind, record] of attributable) {
		const author = peopleByName.get(str(record.data.author) ?? '');
		const reviewer = peopleByName.get(str(record.data.reviewer) ?? '');
		if (author) edges.push(edge('authored-by', nodeId(kind as NodeKind, record.id), nodeId('person', author), { evidence: [] }));
		/*
		 * `reviewed-by` names the accountable reviewer. It is emphatically not
		 * evidence that a review happened: every record in the corpus names a
		 * reviewer while almost none has been reviewed. The distinction is carried
		 * by reviewState, not by the presence of this edge.
		 */
		if (reviewer) {
			edges.push(
				edge('reviewed-by', nodeId(kind as NodeKind, record.id), nodeId('person', reviewer), {
					evidence: [],
					note: 'Assigned reviewer. Not evidence that a review occurred.',
				}),
			);
		}
	}

	/*
	 * The edge list is a set, so it is deduplicated here rather than reported as
	 * a fault. Two genuine cases produce the same edge twice from correct data:
	 * a symmetric `related-to` where both records name each other, and a
	 * `concerns` where a record declares two aliases of one line ("landlord" and
	 * "dwelling-fire" both resolve to dwelling-fire). Neither is an error in the
	 * corpus, and flagging them would train a reader to ignore the check.
	 *
	 * Duplicate detection stays in edgeProblems, where it catches a caller
	 * merging two edge sets - which is what a future import step will do.
	 */
	const deduped = new Map<string, Edge>();
	for (const e of edges) if (!deduped.has(edgeKey(e))) deduped.set(edgeKey(e), e);

	const byId = new Map(nodes.map((node) => [node.id, node]));
	return { nodes, edges: [...deduped.values()], byId };
}

/* ------------------------------------------------------------------ */
/* Integrity                                                           */
/* ------------------------------------------------------------------ */

export interface Problem {
	code:
		| 'id-collision'
		| 'dangling-edge'
		| 'orphan-node'
		| 'layer-violation'
		| 'edge-shape'
		| 'supersession-cycle'
		| 'conflict-lost';
	detail: string;
}

/**
 * Every structural failure this foundation is meant to catch.
 *
 * Returned as a list rather than thrown, so the verifier can assert on the
 * whole set and print all of them at once. A checker that stops at the first
 * problem turns one bad record into several rounds of fixing.
 */
export function graphProblems(
	graph: Graph,
	options: {
		licensedReviewRecorded: boolean;
		commonsOpen: boolean;
		/** Kinds exempt from the orphan rule because standing alone is valid for them. */
		orphanExempt?: readonly NodeKind[];
	},
): Problem[] {
	const problems: Problem[] = [];
	const exempt = new Set<NodeKind>(options.orphanExempt ?? ['product-line', 'person', 'jurisdiction', 'tool', 'figure']);

	/* Collisions: two records claiming the same address. */
	const seen = new Map<string, Node>();
	for (const node of graph.nodes) {
		const previous = seen.get(node.id);
		if (previous) {
			problems.push({ code: 'id-collision', detail: `${node.id} is claimed by both ${JSON.stringify(previous.label)} and ${JSON.stringify(node.label)}` });
		} else seen.set(node.id, node);
	}

	/*
	 * Layer separation, evaluated against the real gates.
	 *
	 * The citation clause is only applied to kinds that actually assert
	 * something. Passing `hasCitation: undefined` for a taxonomy or identity node
	 * tells layerAdmits the question does not arise, which is different from
	 * telling it the answer is yes.
	 */
	for (const node of graph.nodes) {
		const verdict = layerAdmits(
			node.layer,
			{ reviewState: node.reviewState, hasCitation: requiresCitation(node.kind) ? node.hasCitation : undefined },
			options,
		);
		if (!verdict.ok) problems.push({ code: 'layer-violation', detail: `${node.id}: ${verdict.reason}` });
	}

	/* Edge shape, before any lookup. */
	for (const problem of edgeProblems(graph.edges)) {
		problems.push({ code: 'edge-shape', detail: `${problem.key}: ${problem.problem}` });
	}

	/* Dangling ends. */
	const connected = new Set<string>();
	for (const e of graph.edges) {
		for (const end of [e.from, e.to]) {
			if (!graph.byId.has(end)) problems.push({ code: 'dangling-edge', detail: `${e.kind} edge points at ${end}, which is not a node` });
			connected.add(end);
		}
		const rule = LAYER_RULES[e.layer];
		if (rule?.requiresCitation && EVIDENCE_REQUIRED_EDGES.has(e.kind) && e.evidence.length === 0) {
			problems.push({ code: 'edge-shape', detail: `${e.kind} ${e.from} -> ${e.to} sits in ${e.layer}, which requires evidence, and has none` });
		}
	}

	/* Orphans: a record nothing cites and that cites nothing. */
	for (const node of graph.nodes) {
		if (exempt.has(node.kind)) continue;
		if (!connected.has(node.id)) problems.push({ code: 'orphan-node', detail: `${node.id} (${node.kind}) is connected to nothing` });
	}

	/* Supersession must be an ordering, not a loop. */
	for (const cycle of supersessionCycles(graph.edges)) {
		problems.push({ code: 'supersession-cycle', detail: cycle.join(' -> ') });
	}

	return problems;
}

/**
 * Conflicts must survive a round trip.
 *
 * The failure this guards against is a pipeline that "tidies" a disagreement by
 * turning it into a supersession, or by dropping the weaker side. Given the
 * conflict edges that went in, every one must still be present, still be a
 * conflict, and still name both ends.
 */
export function conflictsPreserved(before: readonly Edge[], after: readonly Edge[]): string[] {
	const lost: string[] = [];
	const afterKeys = new Set(
		after.filter((e) => e.kind === 'conflicts-with').map((e) => {
			const ends = canonicalEnds(e.kind, e.from, e.to);
			return `${ends.from}|${ends.to}`;
		}),
	);
	for (const e of before) {
		if (e.kind !== 'conflicts-with') continue;
		const ends = canonicalEnds(e.kind, e.from, e.to);
		if (!afterKeys.has(`${ends.from}|${ends.to}`)) lost.push(`${ends.from} <-> ${ends.to}`);
	}
	return lost;
}
