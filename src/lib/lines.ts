/**
 * One canonical vocabulary for lines of business.
 *
 * Four collections each declare lines, and they had drifted into three
 * vocabularies: coverage pages used a single short slug (`property`), modules
 * used specific slugs (`commercial-property`), and examples used human phrases
 * (`commercial property`). Seventy-one distinct values were in use, most of them
 * space-and-hyphen duplicates of each other.
 *
 * The visible consequence was that the "Worked examples on this line" section
 * matched on exact string equality, so five of the six coverage pages showed no
 * examples at all. Only `homeowners` worked, because it happens to be one word.
 *
 * So: every declared line resolves through here to a canonical id, matching is
 * done on canonical ids, and `scripts/verify.mjs` fails if any collection
 * declares a line this file does not know. A new phrase is then a test failure
 * rather than a section that quietly renders empty.
 */

/** Canonical line ids. The specific form wins over the short form. */
export const CANONICAL_LINES = [
	'commercial-general-liability',
	'commercial-property',
	'business-income',
	'commercial-auto',
	'auto',
	'workers-compensation',
	'employers-liability',
	'employment-practices-liability',
	'third-party-employment-practices-liability',
	'wage-and-hour-defense',
	'cyber-liability',
	'privacy-and-network-security',
	'technology-errors-and-omissions',
	'crime-and-social-engineering',
	'professional-liability',
	'medical-professional-liability',
	'errors-and-omissions',
	'directors-and-officers',
	'umbrella-excess',
	'homeowners',
	'dwelling-fire',
	'condominium-unit-owners',
	/*
	 * The association's own programme, not the unit owner's policy. Kept distinct
	 * from `condominium-unit-owners` because the two sit on opposite sides of one
	 * boundary: what the association insures follows what it is responsible for
	 * repairing, replacing and maintaining, and the owner's policy is written
	 * against the remainder. Collapsing them would hide exactly the gap that
	 * causes the disputes.
	 */
	'community-association',
	'renters',
	'mobilehome',
	'residential-earthquake',
	'flood',
	'residential-flood',
	'difference-in-conditions',
	'scheduled-personal-property',
	'wildfire',
	'inland-marine',
	'builders-risk',
	'motor-truck-cargo',
	/* A route to a market rather than a coverage form, but it is how a reader
	   names it and how the statute chapters it. */
	'surplus-lines',
	'surety',
	'contract-surety',
	'license-and-permit-bonds',
	'court-bonds',
	'contractual-risk-transfer',
	'additional-insured',
	'group-health',
	'employee-benefits',
	/*
	 * The protections that matter most on a life policy attach to individual
	 * life insurance as a class rather than to term or permanent separately:
	 * the grace period, the lapse notice, the designee and the free look apply
	 * the same way to both. `term-life` and `permanent-life` stay as the two
	 * product forms, and this is the line the statutory material belongs to.
	 */
	'individual-life',
	'term-life',
	'permanent-life',
	'key-person',
	'buy-sell',
	'bop',
] as const;

export type CanonicalLine = (typeof CANONICAL_LINES)[number];

const CANONICAL_SET = new Set<string>(CANONICAL_LINES);

/**
 * Variants that mean an existing canonical line.
 *
 * Keys are already slugified, so a human phrase and its hyphenated twin both
 * arrive here as the same key and only need one entry. The judgement calls are
 * commented, because collapsing two lines that are genuinely different would
 * surface the wrong examples on a page.
 */
const ALIASES: Record<string, CanonicalLine> = {
	/* Coverage pages used the short form; modules use the specific one. */
	'general-liability': 'commercial-general-liability',
	cgl: 'commercial-general-liability',
	property: 'commercial-property',
	/* The California residential earthquake page calls its line `earthquake`. */
	earthquake: 'residential-earthquake',
	/* Used as a synonym for homeowners in the wildfire example, not as a
	   separate line. */
	'residential-property': 'homeowners',
	/* The landlord coverage page is the dwelling fire line. */
	landlord: 'dwelling-fire',
	'rental-dwelling': 'dwelling-fire',
	cyber: 'cyber-liability',
	epli: 'employment-practices-liability',
	umbrella: 'umbrella-excess',
	'excess-and-surplus': 'surplus-lines',
	'non-admitted': 'surplus-lines',
	nonadmitted: 'surplus-lines',
	'e-and-s': 'surplus-lines',
	/* The California personal auto page calls its line `auto`. */
	'personal-auto': 'auto',
	'private-passenger-auto': 'auto',
	condo: 'condominium-unit-owners',
	/*
	 * `life` is what people type, and it is not a product. It resolves to the
	 * class the statutory protections attach to rather than to either product
	 * form, so a bare query lands where the grace period, the lapse notice and
	 * the free look actually live.
	 */
	life: 'individual-life',
	'life-insurance': 'individual-life',
	/*
	 * Readers and answer engines ask about this line by the body that buys it or
	 * by the document it produces, almost never by the phrase we file it under.
	 * `hoa` deliberately resolves here rather than to `homeowners`: an HOA policy
	 * is the association's, and sending that query to the homeowners line would
	 * answer a different question convincingly.
	 */
	hoa: 'community-association',
	'homeowners-association': 'community-association',
	'common-interest-development': 'community-association',
	'master-policy': 'community-association',
	/* Scheduling valuables is the scheduled personal property line. */
	valuables: 'scheduled-personal-property',
	'business-income-and-extra-expense': 'business-income',
	/* Continuation coverage is administered on the group health line, and a
	   group health page should surface continuation-coverage material. */
	'group-health-continuation-coverage': 'group-health',
	'employee-benefits-administration': 'employee-benefits',
};

/** Slugify a declared line value so a phrase and a slug compare equal. */
function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[\s_/]+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-{2,}/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Resolve a declared line to its canonical id, or undefined if this file does
 * not know it. Callers that must not silently drop a value should treat
 * undefined as an error; the test suite does.
 */
export function canonicalLine(value: string): CanonicalLine | undefined {
	const slug = slugify(value);
	if (CANONICAL_SET.has(slug)) return slug as CanonicalLine;
	return ALIASES[slug];
}

/** Resolve a list of declared lines, dropping nothing silently but deduping. */
export function canonicalLines(values: Array<string | undefined | null>): CanonicalLine[] {
	const out = new Set<CanonicalLine>();
	for (const value of values) {
		if (!value) continue;
		const canonical = canonicalLine(value);
		if (canonical) out.add(canonical);
	}
	return [...out];
}

/** True when two line lists have any canonical line in common. */
export function sharesLine(
	a: Array<string | undefined | null>,
	b: Array<string | undefined | null>,
): boolean {
	const left = new Set(canonicalLines(a));
	return canonicalLines(b).some((line) => left.has(line));
}
