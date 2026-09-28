/**
 * Where each node kind is backed, and which ones are not backed yet.
 *
 * The instruction this unit exists under says "reuse existing Birch structures
 * where they already satisfy the contract; do not create duplicate sources of
 * truth." Most of the work of obeying that is discovering that Birch already
 * models more than it looks like it does:
 *
 *   - statutes, bulletins, filings and policy forms are not four collections.
 *     They are `sources` records separated by `sourceType`, which already has
 *     ten values covering all four.
 *   - regulators are not a collection. They are `companies` records with
 *     `orgType: 'regulator'`, alongside insurers, groups, residual markets,
 *     standards organisations and public entities.
 *   - products are not a collection. `CANONICAL_LINES` in src/lib/lines.ts is
 *     the canonical line registry and is already used for routing.
 *   - claims are not a collection. They are positions within a source's
 *     `claims` array, addressed `<source-id>#cN` and published in releases.
 *
 * Four kinds genuinely have no backing: hazard, exclusion, endorsement and
 * claims-concept. Those are recorded as `unmaterialised` with the reason,
 * rather than given an empty directory that would imply they exist. An empty
 * collection is worse than an absent one: it reads as a modelled thing with no
 * data, and later units would write into it without asking whether it should
 * exist at all.
 */
import type { NodeKind } from './ids.ts';
import type { Layer } from './layers.ts';

export type Backing =
	/** A content collection on disk, one record per file. */
	| { sort: 'collection'; collection: string; note?: string }
	/** A subset of a collection selected by a discriminator field. */
	| { sort: 'collection-subset'; collection: string; discriminator: string; values: readonly string[]; note?: string }
	/** A checked-in TypeScript registry rather than content files. */
	| { sort: 'module'; module: string; exportName: string; note?: string }
	/** Positions inside another record's array. */
	| { sort: 'embedded'; collection: string; field: string; addressing: string; note?: string }
	/** Declared by the contract; nothing backs it yet. */
	| { sort: 'unmaterialised'; reason: string };

export interface KindEntry {
	kind: NodeKind;
	backing: Backing;
	/** The layer a node of this kind occupies unless it declares otherwise. */
	defaultLayer: Layer;
}

export const KIND_REGISTRY: readonly KindEntry[] = [
	{
		kind: 'jurisdiction',
		backing: { sort: 'collection', collection: 'states', note: 'US states. Federal and territorial jurisdictions are not modelled yet.' },
		defaultLayer: 'official-fact',
	},
	{
		kind: 'organisation',
		backing: {
			sort: 'collection',
			collection: 'companies',
			note: 'orgType separates regulator, standards-organization, public-entity, insurer, insurance-group and residual-market. Parent/subsidiary is expressed as an edge, not by nesting records.',
		},
		defaultLayer: 'official-fact',
	},
	{
		kind: 'source',
		backing: {
			sort: 'collection',
			collection: 'sources',
			note: 'sourceType carries statute, regulation, legislative-record, regulator-guidance, regulator-record, policy-form, government-data, official-documentation, court-decision and secondary-analysis.',
		},
		defaultLayer: 'official-fact',
	},
	{
		kind: 'claim',
		backing: {
			sort: 'embedded',
			collection: 'sources',
			field: 'claims',
			addressing: '<source-id>#cN, 1-based and append-only',
			note: 'Published in frozen dataset releases. Positions must never be reordered or inserted into.',
		},
		defaultLayer: 'official-fact',
	},
	{
		kind: 'product-line',
		backing: { sort: 'module', module: 'src/lib/lines.ts', exportName: 'CANONICAL_LINES' },
		defaultLayer: 'official-fact',
	},
	{ kind: 'coverage', backing: { sort: 'collection', collection: 'coverages' }, defaultLayer: 'birch-analysis' },
	{ kind: 'question', backing: { sort: 'collection', collection: 'questions' }, defaultLayer: 'birch-analysis' },
	{
		kind: 'person',
		backing: { sort: 'collection', collection: 'people', note: 'Carries licensed status and licence number; the reviewer gate resolves against this.' },
		defaultLayer: 'official-fact',
	},
	{ kind: 'module', backing: { sort: 'collection', collection: 'modules' }, defaultLayer: 'birch-analysis' },
	{ kind: 'cross-rule', backing: { sort: 'collection', collection: 'cross-rules' }, defaultLayer: 'birch-analysis' },
	{ kind: 'figure', backing: { sort: 'collection', collection: 'figures' }, defaultLayer: 'official-fact' },
	{ kind: 'example', backing: { sort: 'collection', collection: 'examples' }, defaultLayer: 'birch-analysis' },
	{ kind: 'tool', backing: { sort: 'collection', collection: 'tools' }, defaultLayer: 'birch-analysis' },
	{
		kind: 'underwriting-topic',
		backing: {
			sort: 'collection-subset',
			collection: 'modules',
			discriminator: 'kind',
			values: [],
			note: 'Underwriting and eligibility topics are currently expressed as advisory modules and their rules. Treated as a view over modules rather than a separate kind until a record needs to exist that is not a module.',
		},
		defaultLayer: 'birch-analysis',
	},
	{
		kind: 'hazard',
		backing: {
			sort: 'unmaterialised',
			reason:
				'Hazards (wildfire, earthquake, flood, debris flow) appear today as question topics and coverage prose. Giving them records is worthwhile but is a content-modelling decision with editorial consequences, because a hazard page asserts what a peril is - not a foundation decision to take unilaterally here.',
		},
		defaultLayer: 'official-fact',
	},
	{
		kind: 'exclusion',
		backing: {
			sort: 'unmaterialised',
			reason:
				'Exclusions currently live as quoted passages inside source claims and coverage prose. Promoting them to nodes would let Birch state "this policy excludes X" as a structured fact, which is close to a coverage determination and must not be built before the licensed-review gate is settled.',
		},
		defaultLayer: 'official-fact',
	},
	{
		kind: 'endorsement',
		backing: { sort: 'unmaterialised', reason: 'No endorsement records exist. Same editorial caution as exclusions: an endorsement node asserts what modifies a policy.' },
		defaultLayer: 'official-fact',
	},
	{
		kind: 'claims-concept',
		backing: { sort: 'unmaterialised', reason: 'Claims-handling concepts appear inside question prose. No separate records exist.' },
		defaultLayer: 'birch-analysis',
	},
];

export const REGISTRY_BY_KIND: ReadonlyMap<NodeKind, KindEntry> = new Map(
	KIND_REGISTRY.map((entry) => [entry.kind, entry]),
);

/**
 * Kinds whose records must cite a source.
 *
 * Not every node is an assertion. `product-line` is a taxonomy term and
 * `person` is an identity; neither states anything about insurance, so
 * demanding a citation of them would be a category error - and, worse, one that
 * makes the citation requirement look enforced while it is really just noisy.
 *
 * This list is the set whose schema in content.config.ts already requires
 * `sourceIds` with at least one entry. It is deliberately derived from what the
 * corpus genuinely guarantees rather than from what would be nice: a kind added
 * here that the schema does not enforce would fail on the first record that is
 * within its rights not to cite anything.
 */
export const CITATION_REQUIRED_KINDS: ReadonlySet<NodeKind> = new Set<NodeKind>([
	'question',
	'coverage',
	'organisation',
	'jurisdiction',
	'example',
	'claim',
]);

export function requiresCitation(kind: NodeKind): boolean {
	return CITATION_REQUIRED_KINDS.has(kind);
}

/** Kinds that can actually be populated from the repository today. */
export function materialisedKinds(): NodeKind[] {
	return KIND_REGISTRY.filter((entry) => entry.backing.sort !== 'unmaterialised').map((entry) => entry.kind);
}

/** Kinds a later unit must create records for before using. */
export function unmaterialisedKinds(): NodeKind[] {
	return KIND_REGISTRY.filter((entry) => entry.backing.sort === 'unmaterialised').map((entry) => entry.kind);
}

/** The collection a kind reads from, where it reads from one. */
export function collectionFor(kind: NodeKind): string | undefined {
	const backing = REGISTRY_BY_KIND.get(kind)?.backing;
	if (!backing) return undefined;
	if (backing.sort === 'collection' || backing.sort === 'collection-subset' || backing.sort === 'embedded') {
		return backing.collection;
	}
	return undefined;
}
