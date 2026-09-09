/**
 * The Commons, configured in one place.
 *
 * Layer 3 of `AMBITION.md`, specified end to end in `COMMONS.md`. This is the
 * second property in the estate and the whole design is the division between
 * the two: the Record holds what the rule is and cites a document for every
 * sentence; the Commons holds what happened to people, attributed and moderated
 * before publication.
 *
 * THE NAME IS NOT CHOSEN YET, AND THAT IS DELIBERATE
 *
 * `COMMONS.md` section 10 fixes the constraints and leaves the choice to the
 * owner: it must not read as the Record, as a carrier or agency (no verb of
 * selling; `.insure` is a TLD carriers buy), or as a regulator - `Bureau`,
 * `Institute`, `Authority` imply standing this estate does not have, and that
 * is the worse error because the pull toward it is strongest.
 *
 * So the name lives here, once, and nothing else in this project hardcodes it.
 * Naming the property is an edit to two lines and a wordmark, not a search and
 * replace across a build.
 */
export const PLACEHOLDER_NAME = true;

export const commons = {
	/** Placeholder. Replace together with `origin` when the name is chosen. */
	name: 'The Commons',
	/** Placeholder. A brandable word on .com is the recommendation in COMMONS.md. */
	origin: import.meta.env.PUBLIC_COMMONS_ORIGIN || 'https://commons.example',

	tagline: 'What actually happened, said by the person it happened to, checked before it publishes.',
	description:
		'Moderated accounts of real insurance situations, and notes from licence-verified practitioners. ' +
		'Every account says what kind of evidence it is and where it came from. Nobody here publishes a ' +
		'view on whether a claim should have been paid.',

	/**
	 * The Record. The Commons links to it and cites it; it does not link back,
	 * because `COMMONS.md` section 1 holds that Layer 1 points at nothing above
	 * itself. That asymmetry is what lets the estate hold lived experience
	 * without contaminating the citable unit.
	 */
	record: {
		name: 'BestInsurance Research',
		origin: import.meta.env.PUBLIC_RECORD_ORIGIN || 'https://bestinsuranceresearch.com',
	},

	/**
	 * NOT PRESENT, AND ASSERTED BY THE SUITE
	 *
	 * No agency name, no licence number, no phone number, no address, no
	 * handoff to a brokerage. `COMMONS.md` section 2 has the reasoning and calls
	 * this the load-bearing reason for a separate origin; the short version is
	 * that unlicensed people discussing coverage under a brokerage's masthead
	 * and licence is a regulatory problem a disclaimer does not fix.
	 *
	 * The operator is deliberately not named anywhere in this codebase, not even
	 * in a comment explaining its absence - `scripts/verify-commons.mjs` scans
	 * the build for the literal strings, and comments survive into the server
	 * bundle. The one file allowed to name them is the test that forbids them.
	 */
	operatorBranding: null,

	/** The one rule that survives the crossing from the Record. */
	verdictProhibition:
		'Nobody publishes a view on whether a claim should have been paid. Not staff, not a reader, ' +
		'not a licence-verified broker or lawyer. On the Record that is enforced by the build; here it ' +
		'is enforced by moderation, and it is the reason this is worth reading.',
} as const;

/** What a published account is, and what each label commits the publisher to. */
export const LABELS = {
	'public-record': 'Drawn from a public record such as a filed case, an order, or a regulator action.',
	'published-industry': 'Drawn from published industry material, named and dated.',
	'carrier-authored': 'Written by a carrier, in its own words.',
	'contributed-account': "A reader's own account of what happened to them, moderated before publication.",
	'practitioner-note': 'A note from a contributor whose professional licence was verified against a public register.',
	composite: 'Assembled from more than one situation. No single person or claim is described.',
	hypothetical: 'Constructed to illustrate a mechanism. It did not happen.',
} as const;

export type Label = keyof typeof LABELS;

export const nav = [
	{ label: 'Reports', href: '/reports' },
	{ label: 'Standards', href: '/standards' },
	{ label: 'Moderation', href: '/moderation' },
	{ label: 'Contribute', href: '/contribute' },
	{ label: 'Sign in', href: '/sign-in' },
] as const;
