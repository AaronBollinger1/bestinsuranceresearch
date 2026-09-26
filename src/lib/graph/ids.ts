/**
 * Canonical node addressing for the Birch knowledge graph.
 *
 * WHY THIS EXISTS AT ALL
 *
 * Birch already addresses things. A source is `/sources/<id>`, a question is
 * `/questions/<id>`, and a claim is `<source-id>#c<N>` - positional, append
 * only, cut into frozen dataset releases and therefore not negotiable. What did
 * not exist was one address space spanning all of them, so nothing could say
 * "this regulator regulates this insurer in this jurisdiction" without inventing
 * a second naming scheme alongside the routes.
 *
 * So this is deliberately not a new identifier. A node id is the pair that
 * already identifies the record - its kind and its existing slug - written in
 * one form: `birch:<kind>:<local>`. The local part is the slug the record
 * already has on disk and in its URL. Nothing here mints an id, and nothing
 * here may be used to rename an existing record; if the two ever disagree, the
 * record on disk is right and this is wrong.
 *
 * CLAIM IDS ARE NOT REDEFINED HERE
 *
 * `scripts/cut-release.mjs` established `<source-id>#c<N>` and
 * `sha256(text).slice(0,12)`. Those addresses are published in frozen releases.
 * This module re-expresses them and must never diverge: `claimLocalId` and
 * `claimChecksum` reproduce that convention exactly, and a test in
 * scripts/verify-graph.mjs holds them against the release script's own output
 * so a future edit to either one fails loudly rather than silently renumbering
 * published claims.
 */

/**
 * Node kinds in the graph.
 *
 * Several of these are not separate collections on disk and must not become
 * ones: a statute, a bulletin, a filing and a policy form are all `source`
 * records distinguished by `sourceType`, and a regulator is a `companies`
 * record distinguished by `orgType`. Splitting them into their own directories
 * would create a second source of truth for the same document. See
 * `registry.ts`, which records exactly where each kind is backed.
 */
export const NODE_KINDS = [
	'jurisdiction',
	'organisation',
	'source',
	'claim',
	'product-line',
	'coverage',
	'question',
	'person',
	'module',
	'cross-rule',
	'figure',
	'example',
	'tool',
	'hazard',
	'exclusion',
	'endorsement',
	'claims-concept',
	'underwriting-topic',
] as const;

export type NodeKind = (typeof NODE_KINDS)[number];

const KIND_SET: ReadonlySet<string> = new Set(NODE_KINDS);

/**
 * The local part of an id.
 *
 * Lowercase, digits, hyphens, and - for claims only - the `#cN` suffix the
 * release format already publishes. Deliberately narrow: anything an existing
 * route cannot contain must not appear in an id, because the id is supposed to
 * be the route's identity rather than a parallel encoding of it.
 */
const LOCAL = /^[a-z0-9][a-z0-9-]*$/;
const CLAIM_LOCAL = /^([a-z0-9][a-z0-9-]*)#c([1-9][0-9]*)$/;

export interface NodeId {
	kind: NodeKind;
	local: string;
}

export function isNodeKind(value: string): value is NodeKind {
	return KIND_SET.has(value);
}

/** True when `local` is well formed for the given kind. */
export function isValidLocal(kind: NodeKind, local: string): boolean {
	return kind === 'claim' ? CLAIM_LOCAL.test(local) : LOCAL.test(local);
}

/**
 * `birch:<kind>:<local>`.
 *
 * Throws rather than returning a sentinel. An id that is silently wrong
 * propagates into edges and is then very hard to trace back, whereas a throw
 * names the offending value at the point it was introduced.
 */
export function nodeId(kind: NodeKind, local: string): string {
	if (!isNodeKind(kind)) throw new Error(`unknown node kind: ${kind}`);
	if (!isValidLocal(kind, local)) throw new Error(`invalid local id for ${kind}: ${JSON.stringify(local)}`);
	return `birch:${kind}:${local}`;
}

/** Inverse of `nodeId`. Returns undefined rather than throwing, for parsing input. */
export function parseNodeId(value: string): NodeId | undefined {
	const match = /^birch:([a-z-]+):(.+)$/.exec(value);
	if (!match) return undefined;
	const [, kind, local] = match;
	if (!isNodeKind(kind)) return undefined;
	if (!isValidLocal(kind, local)) return undefined;
	return { kind, local };
}

export function isNodeId(value: string): boolean {
	return parseNodeId(value) !== undefined;
}

/**
 * The claim address published by `scripts/cut-release.mjs`: 1-based, positional,
 * append-only. Inserting a claim into the middle of a source's array silently
 * repoints every later address, including ones already frozen into a release,
 * which is why `verify-graph.mjs` checks ordering rather than trusting it.
 */
export function claimLocalId(sourceLocal: string, index1: number): string {
	if (!LOCAL.test(sourceLocal)) throw new Error(`invalid source id: ${JSON.stringify(sourceLocal)}`);
	if (!Number.isInteger(index1) || index1 < 1) throw new Error(`claim index must be a positive integer: ${index1}`);
	return `${sourceLocal}#c${index1}`;
}

/** The source and 1-based position a claim id refers to. */
export function parseClaimLocalId(local: string): { sourceLocal: string; index1: number } | undefined {
	const match = CLAIM_LOCAL.exec(local);
	if (!match) return undefined;
	return { sourceLocal: match[1], index1: Number(match[2]) };
}

/**
 * The 12-character content digest `cut-release.mjs` publishes for claim text.
 *
 * Kept as an injected hasher rather than importing node:crypto, so this module
 * stays usable from an Astro page (which has no node built-ins available in
 * every adapter) and so a test can prove this function and the release script
 * agree without either importing the other.
 */
export type Hasher = (text: string) => string;

export function claimChecksum(text: string, sha256Hex: Hasher): string {
	return sha256Hex(text).slice(0, 12);
}
