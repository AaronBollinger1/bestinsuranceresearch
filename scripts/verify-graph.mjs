/**
 * Knowledge-graph foundation verification.
 *
 * Two halves, deliberately:
 *
 *   1. The real corpus is run through the graph builder and must come out
 *      clean. That proves the contract is satisfiable by what Birch actually
 *      has, rather than by what a design document hoped it had.
 *   2. Synthetic fixtures carrying one deliberate defect each are run through
 *      the same checks, and each must fail with the specific code it was built
 *      to trigger. A checker that has only ever seen valid input is not a
 *      checker; the fixtures are what make the first half mean something.
 *
 * The fixtures are contract examples with invented ids. They are never loaded
 * by the site, never written to disk as content, and assert nothing about
 * insurance.
 *
 *   node --experimental-strip-types --test scripts/verify-graph.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { nodeId, parseNodeId, claimLocalId, parseClaimLocalId, claimChecksum, NODE_KINDS, isValidLocal } from '../src/lib/graph/ids.ts';
import { LAYERS, LAYER_RULES, layerAdmits, openLayers } from '../src/lib/graph/layers.ts';
import { EVIDENCE_CONTRACT, contractFields, unavailableFields } from '../src/lib/graph/contract.ts';
import { KIND_REGISTRY, REGISTRY_BY_KIND, materialisedKinds, unmaterialisedKinds, collectionFor } from '../src/lib/graph/registry.ts';
import { edgeProblems, supersessionCycles, canonicalEnds, edgeHoldsOn, edgeKey } from '../src/lib/graph/edges.ts';
import { buildGraph, graphProblems, conflictsPreserved } from '../src/lib/graph/build.ts';
import { CANONICAL_LINES } from '../src/lib/lines.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'src/content');

const read = (file) => fs.readFileSync(file, 'utf8');
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

function collection(name) {
	const dir = path.join(CONTENT, name);
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((f) => f.endsWith('.json'))
		.sort()
		.map((f) => ({ id: f.replace(/\.json$/, ''), data: JSON.parse(read(path.join(dir, f))) }));
}

/* Gates. Both are closed and both are asserted to be closed below. */
const GATES = {
	licensedReviewRecorded: false,
	commonsOpen: process.env.PUBLIC_COMMONS_READY === 'true',
};

const INPUT = {
	sources: collection('sources'),
	questions: collection('questions'),
	coverages: collection('coverages'),
	companies: collection('companies'),
	states: collection('states'),
	people: collection('people'),
	examples: collection('examples'),
	modules: collection('modules'),
	crossRules: collection('cross-rules'),
	figures: collection('figures'),
	tools: collection('tools'),
	canonicalLines: CANONICAL_LINES,
	...GATES,
};

const graph = buildGraph(INPUT);

/* ------------------------------------------------------------------ */
/* Identifiers                                                         */
/* ------------------------------------------------------------------ */

test('node ids round-trip, and a malformed one is refused rather than coerced', () => {
	for (const kind of NODE_KINDS) {
		const id = nodeId(kind, kind === 'claim' ? 'a-source#c1' : 'a-local-slug');
		const parsed = parseNodeId(id);
		assert.ok(parsed, `${id} did not parse`);
		assert.equal(parsed.kind, kind);
	}
	assert.equal(parseNodeId('birch:not-a-kind:x'), undefined);
	assert.equal(parseNodeId('birch:source:Not Valid'), undefined);
	assert.equal(parseNodeId('source:missing-prefix'), undefined);
	assert.throws(() => nodeId('source', 'Capitals'), /invalid local id/);
	assert.throws(() => nodeId('source', ''), /invalid local id/);
});

test('claim addressing reproduces the published release convention exactly', () => {
	/*
	 * scripts/cut-release.mjs is the authority: `${source.id}#c${i + 1}` and
	 * sha256(text).slice(0, 12). Those addresses and digests are frozen inside
	 * dataset releases, so this holds the graph's version against the release
	 * script's own source text rather than against a copy of the rule.
	 */
	const releaseScript = read(path.join(ROOT, 'scripts/cut-release.mjs'));
	assert.match(releaseScript, /\$\{source\.id\}#c\$\{i \+ 1\}/, 'the release script no longer builds claim ids the way this test assumes');
	assert.match(releaseScript, /digest\('hex'\)\.slice\(0, 12\)/, 'the release script no longer truncates the digest to 12 characters');

	assert.equal(claimLocalId('ca-ins-code-10091', 1), 'ca-ins-code-10091#c1');
	assert.deepEqual(parseClaimLocalId('ca-ins-code-10091#c3'), { sourceLocal: 'ca-ins-code-10091', index1: 3 });
	assert.equal(parseClaimLocalId('ca-ins-code-10091#c0'), undefined, 'claim positions are 1-based');
	assert.equal(parseClaimLocalId('ca-ins-code-10091'), undefined);

	const text = 'A sentence a source supports.';
	assert.equal(claimChecksum(text, sha256), sha256(text).slice(0, 12));
	assert.equal(claimChecksum(text, sha256).length, 12);

	assert.throws(() => claimLocalId('ca-ins-code-10091', 0), /positive integer/);
	assert.ok(isValidLocal('claim', 'x#c1'));
	assert.ok(!isValidLocal('claim', 'x'), 'a claim id without a position is not a claim id');
});

test('every real record produces a stable id, and no two records collide', () => {
	const collisions = graphProblems(graph, GATES).filter((p) => p.code === 'id-collision');
	assert.deepEqual(collisions, [], `id collisions: ${collisions.map((c) => c.detail).join('; ')}`);
	assert.ok(graph.nodes.length > 500, `only ${graph.nodes.length} nodes were derived, so this test has stopped covering the corpus`);

	/* Ids are a function of the record, so rebuilding must be byte-identical. */
	const again = buildGraph(INPUT);
	assert.deepEqual(
		again.nodes.map((n) => n.id),
		graph.nodes.map((n) => n.id),
		'rebuilding the graph produced different ids, so ids are not stable',
	);
});

/* ------------------------------------------------------------------ */
/* Layers                                                              */
/* ------------------------------------------------------------------ */

test('gated layers are empty while their gate is shut', () => {
	const open = openLayers(GATES);
	assert.ok(!open.includes('licensed-interpretation'), 'licensed-interpretation opened without a recorded licensed review');
	for (const layer of ['company-response', 'professional-contribution', 'user-experience']) {
		assert.ok(!open.includes(layer), `${layer} opened while Commons is closed`);
	}
	assert.deepEqual(open, ['official-fact', 'birch-analysis'], 'the set of open layers changed');

	const occupied = new Set(graph.nodes.map((n) => n.layer));
	for (const layer of occupied) {
		assert.ok(open.includes(layer), `nodes occupy ${layer}, which is gated shut`);
	}
});

test('layer admission fails closed on an unknown layer and on a gated one', () => {
	assert.equal(layerAdmits('official-fact', { hasCitation: true }, GATES).ok, true);

	const unknown = layerAdmits('made-up-layer', { hasCitation: true }, GATES);
	assert.equal(unknown.ok, false);
	assert.match(unknown.reason, /unknown layer/);

	const gated = layerAdmits('licensed-interpretation', { reviewState: 'reviewed', hasCitation: true }, GATES);
	assert.equal(gated.ok, false, 'licensed-interpretation admitted a node with no licensed review on file');
	assert.match(gated.reason, /licensed review/);

	const commons = layerAdmits('user-experience', { hasCitation: false }, { ...GATES, commonsOpen: false });
	assert.equal(commons.ok, false);
	assert.match(commons.reason, /Commons/);

	/* Even with its gate open, the layer still refuses a state it does not mean. */
	const wrongState = layerAdmits('licensed-interpretation', { reviewState: 'under-review', hasCitation: true }, { ...GATES, licensedReviewRecorded: true });
	assert.equal(wrongState.ok, false, 'licensed-interpretation admitted an under-review record');

	/* A citation-requiring layer refuses an uncited node. */
	const uncited = layerAdmits('birch-analysis', { hasCitation: false }, GATES);
	assert.equal(uncited.ok, false);
});

test('every layer states what it means and what it may assert', () => {
	for (const layer of LAYERS) {
		const rule = LAYER_RULES[layer];
		assert.ok(rule, `${layer} has no rule`);
		assert.ok(rule.meaning.length > 40, `${layer} does not explain itself`);
		assert.ok(rule.allowedReviewStates.length > 0, `${layer} admits no review state at all`);
	}
	/* Only two layers may state a fact in their own voice, and one of them is gated. */
	const asserting = LAYERS.filter((l) => LAYER_RULES[l].assertsFact);
	assert.deepEqual(asserting, ['official-fact', 'licensed-interpretation']);
	assert.equal(LAYER_RULES['user-experience'].assertsFact, false, 'an experience report must never assert what the rule is');
	assert.ok(!LAYER_RULES['user-experience'].allowedReviewStates.includes('reviewed'));
});

/* ------------------------------------------------------------------ */
/* Contract and registry                                               */
/* ------------------------------------------------------------------ */

test('the contract names every required field and is honest about the gaps', () => {
	const required = [
		'authority', 'publisher', 'jurisdiction', 'effectiveDate', 'accessDate', 'freshnessCadence',
		'rightsLicense', 'hash', 'exactPassage', 'passageRegion', 'claimLevelCitation',
		'conflictState', 'supersession', 'reviewState', 'reviewer',
	];
	const named = new Set(EVIDENCE_CONTRACT.map((f) => f.field));
	for (const field of required) assert.ok(named.has(field), `the contract does not mention ${field}`);

	/* A gap must say what is missing, so it cannot be mistaken for satisfied. */
	for (const entry of EVIDENCE_CONTRACT) {
		if (entry.status === 'satisfied') assert.ok(entry.backedBy, `${entry.field} claims to be satisfied but names no backing field`);
		else assert.ok(entry.shortfall && entry.shortfall.length > 40, `${entry.field} is not satisfied and does not say why`);
	}

	/* The known gaps, asserted explicitly so closing one is a deliberate edit. */
	assert.deepEqual(contractFields('gap').map((f) => f.field).sort(), ['passageRegion', 'rightsLicense']);
	assert.ok(unavailableFields().includes('rightsLicense'), 'rightsLicense must not be assumed present by a later unit');
});

test('a field the contract calls satisfied is actually present on the records that need it', () => {
	/*
	 * The point of the register is that a later unit can trust it. So each
	 * `satisfied` source field is checked against every source record rather
	 * than taken on the register's word.
	 */
	const requiredOnSources = ['authorityLevel', 'publisher', 'jurisdiction', 'accessedDate', 'lastChecked', 'lastCheckedBasis', 'updateCadence', 'status', 'claims'];
	let checked = 0;
	for (const source of INPUT.sources) {
		for (const field of requiredOnSources) {
			assert.ok(source.data[field] !== undefined && source.data[field] !== '', `sources/${source.id} is missing ${field}, which the contract calls satisfied`);
		}
		checked += 1;
	}
	assert.ok(checked > 250, `only ${checked} sources checked`);
});

test('the registry reuses existing structures and does not invent parallel ones', () => {
	for (const kind of NODE_KINDS) assert.ok(REGISTRY_BY_KIND.has(kind), `${kind} is not in the registry`);

	/* The four kinds that would have become duplicate collections. */
	assert.equal(collectionFor('source'), 'sources', 'statutes, bulletins, filings and policy forms must stay source records');
	assert.equal(collectionFor('organisation'), 'companies', 'regulators must stay company records discriminated by orgType');
	assert.equal(collectionFor('claim'), 'sources', 'claims must stay positions inside a source');
	assert.equal(REGISTRY_BY_KIND.get('product-line').backing.sort, 'module', 'product lines must stay the CANONICAL_LINES registry');

	/* Every collection a registry entry names must actually exist on disk. */
	for (const entry of KIND_REGISTRY) {
		const name = collectionFor(entry.kind);
		if (!name) continue;
		assert.ok(fs.existsSync(path.join(CONTENT, name)), `${entry.kind} points at collection ${name}, which does not exist`);
	}

	/* Unmaterialised kinds are declared, empty, and explained. */
	assert.deepEqual(unmaterialisedKinds().sort(), ['claims-concept', 'endorsement', 'exclusion', 'hazard']);
	for (const kind of unmaterialisedKinds()) {
		const backing = REGISTRY_BY_KIND.get(kind).backing;
		assert.ok(backing.reason.length > 60, `${kind} is unmaterialised without an explanation`);
		assert.ok(!graph.nodes.some((n) => n.kind === kind), `${kind} is unmaterialised but the graph produced nodes for it`);
	}
	assert.ok(materialisedKinds().length >= 13);
});

/* ------------------------------------------------------------------ */
/* Edges over the real corpus                                          */
/* ------------------------------------------------------------------ */

test('the real corpus produces a structurally sound graph', () => {
	const problems = graphProblems(graph, GATES);
	assert.deepEqual(problems, [], problems.map((p) => `${p.code}: ${p.detail}`).join('\n'));
	assert.ok(graph.edges.length > 1000, `only ${graph.edges.length} edges were derived`);
});

test('jurisdiction coverage is measured, not assumed', () => {
	/*
	 * Sources declare 14 distinct jurisdiction values and three of them have a
	 * record. That is a real gap, and the tempting fix - minting a jurisdiction
	 * node from any two-letter code a source happens to carry - would create
	 * nodes that exist only in the graph, which is precisely the duplicate source
	 * of truth this unit is supposed to prevent.
	 *
	 * So the gap is counted here instead. B7 must not scale jurisdiction pages on
	 * the assumption that every cited jurisdiction is modelled.
	 */
	const declared = new Set(INPUT.sources.map((s) => String(s.data.jurisdiction ?? '').toUpperCase()).filter(Boolean));
	const modelled = new Set(INPUT.states.map((s) => String(s.data.code ?? '').toUpperCase()).filter(Boolean));

	assert.ok(modelled.size > 0, 'no jurisdiction records exist at all');
	for (const code of modelled) {
		assert.ok(
			INPUT.states.some((s) => String(s.data.code).toUpperCase() === code),
			`jurisdiction ${code} is claimed as modelled but has no record`,
		);
	}

	/* `US` and `n/a` are not states and are never expected to be modelled. */
	const missing = [...declared].filter((code) => !modelled.has(code) && code !== 'US' && code !== 'N/A');
	assert.ok(
		missing.length > 0,
		'every declared jurisdiction now has a record; update this test, which exists to keep a known gap visible',
	);
	assert.ok(
		missing.length <= 20,
		`${missing.length} cited jurisdictions have no record: ${missing.sort().join(', ')}. The graph does not invent them.`,
	);
});

test('supersession recorded on sources becomes an ordering with no cycles', () => {
	assert.deepEqual(supersessionCycles(graph.edges), []);
	const superseded = graph.edges.filter((e) => e.kind === 'supersedes');
	for (const e of superseded) {
		assert.ok(graph.byId.has(e.from), `supersedes points at missing ${e.from}`);
		assert.ok(graph.byId.has(e.to), `supersedes points at missing ${e.to}`);
	}
});

test('an edge answers whether it held on a given date rather than only now', () => {
	const e = { kind: 'licensed-in', from: 'birch:organisation:a', to: 'birch:jurisdiction:ca', since: '2020-01-01', until: '2024-01-01', layer: 'official-fact', evidence: ['s'] };
	assert.equal(edgeHoldsOn(e, '2022-06-01'), true);
	assert.equal(edgeHoldsOn(e, '2019-12-31'), false);
	assert.equal(edgeHoldsOn(e, '2024-06-01'), false, 'an ended relationship must not read as current');
	const open = { ...e, until: null };
	assert.equal(edgeHoldsOn(open, '2099-01-01'), true);
	const unknownStart = { ...e, since: 'unknown', until: null };
	assert.equal(edgeHoldsOn(unknownStart, '1900-01-01'), true, 'an unknown start must not silently exclude early dates');
});

/* ------------------------------------------------------------------ */
/* Negative controls: each fixture must fail the way it was built to    */
/* ------------------------------------------------------------------ */

const fixture = (name) => JSON.parse(read(path.join(ROOT, 'scripts/fixtures/graph', name)));

function problemsFor(input) {
	const gates = { licensedReviewRecorded: input.licensedReviewRecorded ?? false, commonsOpen: input.commonsOpen ?? false };
	return graphProblems(buildGraph({ ...input, ...gates }), gates);
}

test('NEGATIVE: two records claiming one address are reported as a collision', () => {
	const problems = problemsFor(fixture('collision.json'));
	assert.ok(problems.some((p) => p.code === 'id-collision'), `expected id-collision, got: ${problems.map((p) => p.code).join(', ') || 'nothing'}`);
});

test('NEGATIVE: a citation to a source that does not exist is reported as dangling', () => {
	const problems = problemsFor(fixture('dangling.json'));
	assert.ok(problems.some((p) => p.code === 'dangling-edge'), `expected dangling-edge, got: ${problems.map((p) => p.code).join(', ') || 'nothing'}`);
});

test('NEGATIVE: a record connected to nothing is reported as an orphan', () => {
	const problems = problemsFor(fixture('orphan.json'));
	assert.ok(problems.some((p) => p.code === 'orphan-node'), `expected orphan-node, got: ${problems.map((p) => p.code).join(', ') || 'nothing'}`);
});

test('NEGATIVE: a supersession loop is reported rather than resolved', () => {
	const edges = [
		{ kind: 'supersedes', from: 'birch:source:a', to: 'birch:source:b', since: 'unknown', until: null, layer: 'official-fact', evidence: ['a'] },
		{ kind: 'supersedes', from: 'birch:source:b', to: 'birch:source:a', since: 'unknown', until: null, layer: 'official-fact', evidence: ['b'] },
	];
	const cycles = supersessionCycles(edges);
	assert.ok(cycles.length > 0, 'a supersession loop was not detected');
});

test('NEGATIVE: a malformed edge is reported rather than accepted', () => {
	const bad = [
		{ kind: 'cites', from: 'birch:source:a', to: 'birch:source:a', since: 'unknown', until: null, layer: 'official-fact', evidence: ['a'] },
		{ kind: 'licensed-in', from: 'birch:organisation:x', to: 'birch:jurisdiction:ca', since: '2024-01-01', until: '2020-01-01', layer: 'official-fact', evidence: ['s'] },
		{ kind: 'cites', from: 'birch:source:b', to: 'birch:source:c', since: 'not-a-date', until: null, layer: 'official-fact', evidence: ['b'] },
	];
	const problems = edgeProblems(bad);
	assert.ok(problems.some((p) => /points at itself/.test(p.problem)));
	assert.ok(problems.some((p) => /precedes since/.test(p.problem)));
	assert.ok(problems.some((p) => /invalid since/.test(p.problem)));
});

test('NEGATIVE: a duplicate edge is reported rather than silently deduplicated', () => {
	const one = { kind: 'cites', from: 'birch:question:q', to: 'birch:source:s', since: 'unknown', until: null, layer: 'official-fact', evidence: ['s'] };
	const problems = edgeProblems([one, { ...one }]);
	assert.ok(problems.some((p) => /duplicate edge/.test(p.problem)));
});

test('NEGATIVE: a node placed in a gated layer is refused', () => {
	const problems = problemsFor(fixture('gated-layer.json'));
	assert.ok(
		problems.some((p) => p.code === 'layer-violation') || problems.length === 0,
		'a fixture asserting a gated layer must either be refused or produce no nodes at all',
	);
	/* Asserted directly too, since the builder assigns layers by kind. */
	const verdict = layerAdmits('professional-contribution', { hasCitation: true }, { licensedReviewRecorded: false, commonsOpen: false });
	assert.equal(verdict.ok, false);
});

test('NEGATIVE: a conflict dropped or rewritten as supersession is reported as lost', () => {
	const before = [
		{ kind: 'conflicts-with', from: 'birch:source:b', to: 'birch:source:a', since: 'unknown', until: null, layer: 'official-fact', evidence: ['a', 'b'] },
	];
	/* Dropped entirely. */
	assert.deepEqual(conflictsPreserved(before, []), ['birch:source:a <-> birch:source:b']);
	/* Rewritten into an ordering, which is the dangerous version. */
	const rewritten = [{ ...before[0], kind: 'supersedes' }];
	assert.equal(conflictsPreserved(before, rewritten).length, 1, 'a conflict converted into a supersession was not reported as lost');
	/* Surviving with the ends given the other way round is still preserved. */
	const flipped = [{ ...before[0], from: 'birch:source:a', to: 'birch:source:b' }];
	assert.deepEqual(conflictsPreserved(before, flipped), []);
});

test('a symmetric edge has one canonical form, so the same conflict cannot be stored twice', () => {
	const a = canonicalEnds('conflicts-with', 'birch:source:z', 'birch:source:a');
	const b = canonicalEnds('conflicts-with', 'birch:source:a', 'birch:source:z');
	assert.deepEqual(a, b);
	const directed = canonicalEnds('supersedes', 'birch:source:z', 'birch:source:a');
	assert.deepEqual(directed, { from: 'birch:source:z', to: 'birch:source:a' }, 'a directed edge must not be reordered');
	assert.equal(
		edgeKey({ kind: 'conflicts-with', from: 'birch:source:z', to: 'birch:source:a', since: 'unknown' }),
		edgeKey({ kind: 'conflicts-with', from: 'birch:source:a', to: 'birch:source:z', since: 'unknown' }),
	);
});

/* ------------------------------------------------------------------ */
/* Fail-closed on review state                                         */
/* ------------------------------------------------------------------ */

test('the graph cannot report a licensed interpretation that no licensed person made', () => {
	/*
	 * The corpus has zero reviewed records and the licensed-review gate is shut,
	 * so both halves are asserted: nothing occupies the layer, and the layer
	 * would refuse it anyway.
	 */
	const reviewed = graph.nodes.filter((n) => n.reviewState === 'reviewed');
	assert.deepEqual(reviewed.map((n) => n.id), [], 'a record claims reviewed state; the licensed gate in scripts/verify.mjs owns that assertion');
	assert.ok(!graph.nodes.some((n) => n.layer === 'licensed-interpretation'));
	assert.equal(GATES.licensedReviewRecorded, false, 'no agent may open the licensed-review gate');
});

test('Commons-gated layers stay closed and PUBLIC_COMMONS_READY is not true', () => {
	assert.notEqual(process.env.PUBLIC_COMMONS_READY, 'true', 'Commons must remain closed for this unit');
	for (const layer of ['company-response', 'professional-contribution', 'user-experience']) {
		assert.ok(!graph.nodes.some((n) => n.layer === layer), `${layer} is occupied while Commons is closed`);
	}
});
