/**
 * The Commons, configured in one place.
 *
 * Layer 3 of `AMBITION.md`, specified end to end in `COMMONS.md`. This is the
 * second property in the estate and the whole design is the division between
 * the two: the Record holds what the rule is and cites a document for every
 * sentence; the Commons holds what happened to people, attributed and moderated
 * before publication.
 *
 * THE NAME, AND THE ONE RESERVATION ON IT
 *
 * Birch, at birch.insure. It clears the three constraints in `COMMONS.md`
 * section 10 - not the Record, no verb of selling, no implied official standing.
 *
 * The reservation, recorded so it is not rediscovered as a surprise: `.insure`
 * is a TLD that carriers and agencies buy, and this property's whole value is
 * being visibly independent of both. The mitigation is not the name, it is the
 * site: no agency branding anywhere, a footer that states plainly it is not an
 * insurer, an agency or a regulator, and a suite that fails the build if any of
 * that appears. A `.com` would carry the point without needing the mitigation,
 * and is worth taking if the word is obtainable.
 *
 * The name still lives here once, so changing it stays an edit to two lines and
 * a wordmark rather than a search and replace across a build.
 */
export const PLACEHOLDER_NAME = false;

export const commons = {
	/**
	 * Chosen 9 September 2026. Measured against the three constraints in
	 * `COMMONS.md` section 10 and it clears them: it is not the Record, it
	 * carries no verb of selling, and it claims no official standing the way
	 * Bureau, Institute or Authority would. It is a place, which is what a
	 * community has instead of a job title, and the paper birch is the tree the
	 * estate's visual system already comes from.
	 */
	name: 'Birch',
	origin: import.meta.env.PUBLIC_COMMONS_ORIGIN || 'https://birch.insure',

	tagline: 'What actually happened, from the people it happened to and the people who handle it.',
	description:
		'An independent forum for insurance experience. Moderated accounts of real situations, and ' +
		'notes from licence-verified brokers, adjusters and lawyers. Every account says what kind of ' +
		'evidence it is and where it came from. Nobody here publishes a view on whether a claim should ' +
		'have been paid.',

	/**
	 * The Record. The Commons links to it and cites it; it does not link back,
	 * because `COMMONS.md` section 1 holds that Layer 1 points at nothing above
	 * itself. That asymmetry is what lets the estate hold lived experience
	 * without contaminating the citable unit.
	 */
	record: {
		name: 'Birch Research',
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
	{ label: 'Discussion', href: '/threads' },
	{ label: 'Reports', href: '/reports' },
	{ label: 'Standards', href: '/standards' },
	{ label: 'Moderation', href: '/moderation' },
	{ label: 'Contribute', href: '/contribute' },
	{ label: 'Sign in', href: '/sign-in' },
] as const;
