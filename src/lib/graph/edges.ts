/**
 * Versioned edges.
 *
 * An edge in an insurance graph is almost never timeless. An insurer is
 * admitted in a state until it withdraws; a statute governs until it is
 * amended; a subsidiary belongs to a parent until it is sold. Storing those as
 * plain pairs produces a graph that is confidently wrong about the past and
 * silently wrong about the present, which is the specific failure mode that
 * makes a knowledge graph worse than no graph.
 *
 * So every edge carries `since` and an open-ended `until`. "Currently true" is
 * a query against a date, not a property of the row. Nothing is ever deleted to
 * express that a relationship ended: `until` is set, and the row stays, because
 * a reader asking why a 2024 answer said something needs the edge that was true
 * then.
 *
 * SUPERSESSION AND CONFLICT ARE DIFFERENT THINGS
 *
 * `supersedes` means one document replaced another - an ordering, resolvable.
 * `conflicts-with` means two live sources disagree and Birch is not entitled to
 * pick a winner. The second must never be silently converted into the first.
 * Both edges therefore exist, and `verify-graph.mjs` asserts a conflict edge is
 * never dropped or rewritten into a supersession.
 */
import type { Layer } from './layers.ts';

export const EDGE_KINDS = [
	/** A record's assertion rests on a source or a specific claim. */
	'cites',
	/** Document A replaced document B. Directed A -> B. */
	'supersedes',
	/** Two live sources disagree. Symmetric in meaning; stored once, canonically ordered. */
	'conflicts-with',
	/** A regulator has authority over an organisation or jurisdiction. */
	'regulates',
	/** An organisation is authorised to operate in a jurisdiction. */
	'licensed-in',
	/** Corporate ownership. Directed parent -> subsidiary. */
	'parent-of',
	/** An organisation offers a product line. */
	'offers',
	/** A coverage or product addresses a hazard, peril or concept. */
	'addresses',
	/** A question is answered by, or concerns, another node. */
	'concerns',
	/** A source or rule applies within a jurisdiction. */
	'applies-in',
	/** A person authored a record. */
	'authored-by',
	/** A person is the accountable reviewer for a record. */
	'reviewed-by',
	/** Editorial relatedness between records. */
	'related-to',
] as const;

export type EdgeKind = (typeof EDGE_KINDS)[number];

const EDGE_SET: ReadonlySet<string> = new Set(EDGE_KINDS);

export function isEdgeKind(value: string): value is EdgeKind {
	return EDGE_SET.has(value);
}

/** Edges whose meaning does not depend on direction. Stored once, ordered canonically. */
export const SYMMETRIC_EDGES: ReadonlySet<EdgeKind> = new Set<EdgeKind>(['conflicts-with', 'related-to']);

/**
 * Edges that assert something about the world and therefore need evidence.
 *
 * The rest are navigational or organisational. "This question concerns the
 * homeowners line" and "these two questions are related" are editorial
 * decisions about arrangement - real, but not claims about insurance, and
 * demanding a source for them would dilute the requirement everywhere it does
 * matter. `reviewed-by` is deliberately outside this set too: it names an
 * assigned reviewer, and treating it as evidence-bearing would imply the
 * assignment was itself sourced.
 */
export const EVIDENCE_REQUIRED_EDGES: ReadonlySet<EdgeKind> = new Set<EdgeKind>([
	'cites',
	'supersedes',
	'conflicts-with',
	'regulates',
	'licensed-in',
	'parent-of',
	'offers',
	'addresses',
	'applies-in',
]);

export interface Edge {
	kind: EdgeKind;
	/** Node id, `birch:<kind>:<local>`. */
	from: string;
	/** Node id. */
	to: string;
	/**
	 * When this became true, as an ISO date, or 'unknown' where no source states
	 * it. 'unknown' is deliberately representable: guessing a start date for a
	 * corporate relationship in order to satisfy a schema would be inventing a
	 * source fact.
	 */
	since: string;
	/** When it stopped being true. null means still true as far as the evidence says. */
	until: string | null;
	/** Which layer asserts this edge. An edge is an assertion and carries the same separation as a node. */
	layer: Layer;
	/**
	 * Claim ids (`<source-id>#cN`) or source ids supporting the edge.
	 * Required for any edge in a layer whose rule requires citation.
	 */
	evidence: readonly string[];
	/** Free note, for edges whose basis needs explaining. */
	note?: string;
}

export const UNKNOWN_DATE = 'unknown';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isEdgeDate(value: string): boolean {
	return value === UNKNOWN_DATE || ISO_DATE.test(value);
}

/**
 * Canonical ordering for a symmetric edge, so `A conflicts-with B` and
 * `B conflicts-with A` are one row rather than two that can drift apart.
 */
export function canonicalEnds(kind: EdgeKind, from: string, to: string): { from: string; to: string } {
	if (!SYMMETRIC_EDGES.has(kind)) return { from, to };
	return from <= to ? { from, to } : { from: to, to: from };
}

/** Stable identity of an edge, for collision and duplicate detection. */
export function edgeKey(edge: Pick<Edge, 'kind' | 'from' | 'to' | 'since'>): string {
	const ends = canonicalEnds(edge.kind, edge.from, edge.to);
	return `${edge.kind}|${ends.from}|${ends.to}|${edge.since}`;
}

/** True when the edge holds on the given ISO date. */
export function edgeHoldsOn(edge: Edge, isoDate: string): boolean {
	if (edge.since !== UNKNOWN_DATE && edge.since > isoDate) return false;
	if (edge.until !== null && edge.until <= isoDate) return false;
	return true;
}

export interface EdgeProblem {
	key: string;
	problem: string;
}

/**
 * Structural checks that do not need the node set.
 *
 * Kept separate from integrity-against-nodes (which lives in build.ts) so that
 * a caller holding edges from a future source - a provider adapter, say - can
 * validate their shape before deciding whether to look anything up.
 */
export function edgeProblems(edges: readonly Edge[]): EdgeProblem[] {
	const problems: EdgeProblem[] = [];
	const seen = new Map<string, Edge>();

	for (const edge of edges) {
		const key = edgeKey(edge);

		if (!isEdgeKind(edge.kind)) problems.push({ key, problem: `unknown edge kind ${JSON.stringify(edge.kind)}` });
		if (!isEdgeDate(edge.since)) problems.push({ key, problem: `invalid since ${JSON.stringify(edge.since)}` });
		if (edge.until !== null && !ISO_DATE.test(edge.until)) {
			problems.push({ key, problem: `invalid until ${JSON.stringify(edge.until)}` });
		}
		if (edge.until !== null && edge.since !== UNKNOWN_DATE && edge.until < edge.since) {
			problems.push({ key, problem: `until ${edge.until} precedes since ${edge.since}` });
		}
		if (edge.from === edge.to) problems.push({ key, problem: 'edge points at itself' });

		const previous = seen.get(key);
		if (previous) problems.push({ key, problem: 'duplicate edge with the same kind, ends and since' });
		else seen.set(key, edge);
	}

	return problems;
}

/**
 * Supersession chains, and the cycles that must not exist in them.
 *
 * A cycle here means the corpus claims A replaced B and B replaced A, which
 * cannot both be true and would make "what is current?" unanswerable.
 */
export function supersessionCycles(edges: readonly Edge[]): string[][] {
	const next = new Map<string, string[]>();
	for (const edge of edges) {
		if (edge.kind !== 'supersedes') continue;
		next.set(edge.from, [...(next.get(edge.from) ?? []), edge.to]);
	}

	const cycles: string[][] = [];
	const state = new Map<string, 'visiting' | 'done'>();

	const walk = (node: string, path: string[]): void => {
		const current = state.get(node);
		if (current === 'done') return;
		if (current === 'visiting') {
			const start = path.indexOf(node);
			cycles.push(path.slice(start === -1 ? 0 : start).concat(node));
			return;
		}
		state.set(node, 'visiting');
		for (const target of next.get(node) ?? []) walk(target, [...path, node]);
		state.set(node, 'done');
	};

	for (const node of next.keys()) walk(node, []);
	return cycles;
}
