/**
 * The evidence contract: what every sourced assertion in Birch must carry.
 *
 * This file is a register, not an implementation. Its job is to say which
 * contract fields the existing schema already satisfies, which existing field
 * satisfies them, and - the part that matters - which are declared but not yet
 * carried by any record.
 *
 * The temptation in a foundation unit is to define the full contract and let
 * the gaps read as though they were met. That would be the most expensive kind
 * of wrong here, because later units (B2's provider adapter, B3's answer
 * engine, B7's scaling) are supposed to be able to trust this register when
 * they decide whether a field is available. So a gap is recorded as a gap, with
 * what it would take to close it, and `verify-graph.mjs` asserts that no field
 * marked `satisfied` is absent from the records that claim it.
 *
 * Nothing here adds a field to any record or changes any existing value.
 */

export type FieldStatus =
	/** Every record that needs it carries it today, in the named existing field. */
	| 'satisfied'
	/** Carried by some records or some pipelines, but not guaranteed corpus-wide. */
	| 'partial'
	/** Declared by the contract, carried by nothing yet. Must not be assumed present. */
	| 'gap';

export interface ContractField {
	field: string;
	requirement: string;
	status: FieldStatus;
	/** Where it already lives, for `satisfied` and `partial`. */
	backedBy?: string;
	/** For `partial` and `gap`: what is missing, and what closing it would take. */
	shortfall?: string;
}

export const EVIDENCE_CONTRACT: readonly ContractField[] = [
	{
		field: 'authority',
		requirement: 'Every source states how much weight it carries: primary law, regulator, standards body, carrier-official, or secondary.',
		status: 'satisfied',
		backedBy: 'sources.authorityLevel',
	},
	{
		field: 'publisher',
		requirement: 'Who published the document, distinct from who hosts it.',
		status: 'satisfied',
		backedBy: 'sources.publisher, with sources.officialHost recording whether the copy read is the publisher’s own',
	},
	{
		field: 'jurisdiction',
		requirement: 'Which jurisdiction the source governs or describes.',
		status: 'satisfied',
		backedBy: 'sources.jurisdiction; companies.jurisdictions; states.code',
	},
	{
		field: 'effectiveDate',
		requirement: 'When the document took effect, where the publisher states one.',
		status: 'satisfied',
		backedBy: 'sources.effectiveDate (optional, and recorded as unknown rather than guessed)',
	},
	{
		field: 'accessDate',
		requirement: 'When a person actually read the source.',
		status: 'satisfied',
		backedBy: 'sources.accessedDate',
	},
	{
		field: 'freshnessCadence',
		requirement: 'How often the source must be re-read, and when it last was - distinguishing a first read from a genuine recheck.',
		status: 'satisfied',
		backedBy: 'sources.updateCadence, sources.lastChecked, sources.lastCheckedBasis',
	},
	{
		field: 'supersession',
		requirement: 'Whether the document is still operative, and what replaced it, including chains where the replacement was itself withdrawn.',
		status: 'satisfied',
		backedBy: 'sources.status, sources.supersededBy, sources.statusNote',
	},
	{
		field: 'exactPassage',
		requirement: 'The exact sentence a claim rests on, stored so it can be compared against the live source later.',
		status: 'satisfied',
		backedBy: 'sources.claims[] - each a complete sentence, addressed positionally as <source-id>#cN',
	},
	{
		field: 'claimLevelCitation',
		requirement: 'Every published assertion points at the specific claim supporting it, not merely at the document.',
		status: 'partial',
		backedBy: 'inline [S:source-id] markers resolved by src/lib/citations.ts',
		shortfall:
			'Markers resolve to a source, not to a claim within it. A reader is shown which document supports a sentence but not which sentence of that document. Closing this means a marker form that can address <source-id>#cN, which changes published prose and therefore belongs in its own unit with editorial review - not here.',
	},
	{
		field: 'hash',
		requirement: 'A content digest over the exact passage, so a silent edit at the publisher or in our own records is detectable.',
		status: 'partial',
		backedBy: 'scripts/cut-release.mjs computes sha256(text).slice(0,12) per claim at release time',
		shortfall:
			'The digest exists only inside frozen dataset releases. Between releases nothing stores it, so a claim edited today is not detectable until the next release is cut. Closing this means persisting the digest on the record.',
	},
	{
		field: 'passageRegion',
		requirement: 'Where in the document the passage sits: page, section, or anchor, so a reader can find it without reading the whole thing.',
		status: 'gap',
		shortfall:
			'No locator field exists. It matters most for long PDFs - a 17-page policy form currently gives a reader a quoted exclusion and no way to find it except by reading. Closing this means an optional locator on each claim.',
	},
	{
		field: 'rightsLicense',
		requirement: 'What Birch is permitted to do with the text: quote, excerpt, reproduce, or link only.',
		status: 'gap',
		shortfall:
			'No rights field exists anywhere in the schema. Today the corpus is almost entirely government and regulator material where quotation is safe, plus carrier-official pages quoted briefly - but the policy form record already notes it "includes copyrighted material of Insurance Services Office, Inc.", so the question is live rather than theoretical. Closing this is a prerequisite for B6 company material and for any bulk quotation.',
	},
	{
		field: 'conflictState',
		requirement: 'Where two sources disagree, both are preserved and the disagreement is visible rather than resolved silently.',
		status: 'partial',
		backedBy: 'cross-rules records interactions; questions.variability records where a position is unsettled',
		shortfall:
			'Both are prose, so a conflict is readable but not queryable: nothing can enumerate every live disagreement in the corpus. This module supplies a typed `conflicts-with` edge so a future unit can record them structurally without a second source of truth.',
	},
	{
		field: 'reviewState',
		requirement: 'Every record states whether it has been reviewed, and never inherits that answer from a default.',
		status: 'satisfied',
		backedBy: 'reviewState, required explicitly on the five collections that can be reviewed (hardened at 1802867)',
	},
	{
		field: 'reviewer',
		requirement: 'The named person accountable for a review, resolvable to a licensed person where the record claims licensed review.',
		status: 'satisfied',
		backedBy: 'record.reviewer, resolved against the people collection by scripts/verify.mjs',
	},
];

export const CONTRACT_BY_FIELD: ReadonlyMap<string, ContractField> = new Map(
	EVIDENCE_CONTRACT.map((entry) => [entry.field, entry]),
);

export function contractFields(status: FieldStatus): ContractField[] {
	return EVIDENCE_CONTRACT.filter((entry) => entry.status === status);
}

/**
 * Fields a later unit must not assume are present.
 *
 * B2, B3 and B7 should call this rather than reading the table by eye. A
 * provider adapter that assumes `rightsLicense` exists will silently treat
 * every source as quotable.
 */
export function unavailableFields(): string[] {
	return EVIDENCE_CONTRACT.filter((entry) => entry.status !== 'satisfied').map((entry) => entry.field);
}
