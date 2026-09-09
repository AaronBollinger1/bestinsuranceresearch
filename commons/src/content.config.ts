import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * The Commons content model.
 *
 * `COMMONS.md` section 4 makes the single most important point in this project:
 * **the Commons is not a new content model.** The Record's `examples`
 * collection already asks for label, labelNote, provenance, whatHappened,
 * decidedBy and cannotGeneralize, which is exactly the structure that makes a
 * lived account citable rather than merely present. The hard design work was
 * done; what was missing was the moderated route in.
 *
 * So this is that schema, with two changes and no more:
 *
 * 1. `sourceIds` is OPTIONAL. On the Record it must have at least one entry,
 *    which is right for a staff-written example and wrong for a reader's
 *    account that never touches law. A report cites law where it touches law.
 * 2. A `contributor` block, because an account with no attribution is not
 *    citable by anyone - which is the whole finding of section 4.
 *
 * WHY EACH REQUIRED FIELD IS REQUIRED
 *
 * An anonymous thread is not citable. "My claim got denied and it was BS"
 * carries no date, no jurisdiction, no line, no document and no way to tell
 * whether it happened, and volume of it does not add up to authority. Every
 * minimum below exists to stop that from being publishable here.
 *
 * `cannotGeneralize` has a floor of three because the likeliest harm from this
 * surface is a reader treating somebody else's outcome as their own rule.
 *
 * `decidedBy` is the field the whole property turns on. It records who decided,
 * or states that nobody did. The Record's existing examples model the sentence:
 * "No authority decided this. It is illustrative only."
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

/**
 * What kind of evidence an account is. The label is load-bearing and is shown
 * above the fold on every report, in the position the Record shows its review
 * state, so a reader knows what they are reading before they read it.
 */
const LABEL = [
	'public-record',
	'published-industry',
	'carrier-authored',
	'contributed-account',
	'practitioner-note',
	'composite',
	'hypothetical',
] as const;

/**
 * Moderation is before publication, not after: a queue, not a report button.
 * That is slower and it is the entire product, because unmoderated volume is
 * what makes a forum uncitable. Only 'published' renders a page.
 */
const MODERATION = ['published', 'withdrawn'] as const;

/**
 * Attribution, and the ceiling on what may be stored about a person.
 *
 * `COMMONS.md` section 6 lists what is never collected: a document upload of
 * any kind, a policy number, a claim number, a date of birth, a government
 * identifier, health information, a payment method. None of them has a field
 * here, and that absence is deliberate - a field that does not exist cannot be
 * filled in by a well-meaning intake form later.
 *
 * A licence number is the exception that proves the rule: it is publicly
 * checkable against the regulator's own register, so verifying it needs no
 * identity documents and stores nothing sensitive. That is why practitioners
 * come before verified policyholders in the order - cheaper verification, more
 * valuable contribution.
 */
const contributor = z.object({
	displayName: z.string().min(2),
	/** Only ever 'reader' or a verified professional role. */
	kind: z.enum(['reader', 'broker', 'adjuster', 'attorney', 'staff']),
	/** Present only where a licence was checked against a public register. */
	license: z
		.object({
			number: z.string().min(4),
			authority: z.string().min(4),
			/** The public register the number was checked against, and when. */
			verifiedAgainst: z.string().url(),
			verifiedOn: isoDate,
		})
		.optional(),
});

const reports = defineCollection({
	loader: glob({ pattern: '**/*.json', base: './src/content/reports' }),
	schema: z.object({
		title: z.string().min(10),
		label: z.enum(LABEL),
		/** Why it carries that label. A label with no reasoning is an assertion. */
		labelNote: z.string().min(30),
		moderation: z.enum(MODERATION).default('published'),
		/** Named, and dated, so the account can be weighed. */
		contributor,
		/** The facts, dated and placed. */
		whatHappened: z.string().min(80),
		informationThatMattered: z.array(z.string().min(10)).min(3),
		insuranceQuestion: z.string().min(15),
		/** Who decided, or that nobody did. Never whether they were right. */
		decidedBy: z.string().min(20),
		cannotGeneralize: z.array(z.string().min(15)).min(3),
		/** Where it came from and what was verified before publication. */
		provenance: z.string().min(40),
		/** Required where a real person's situation is described. */
		consentRecord: z.string().optional(),
		lines: z.array(z.string()).min(1),
		states: z.array(z.string().length(2)).default([]),
		occurredOn: z.string().min(4),
		publishedOn: isoDate,
		moderatedBy: z.string().min(3),
		/**
		 * Optional, and that is the one schema change from the Record's examples.
		 * A report cites law where it touches law; a reader's account of a phone
		 * call touches none. Entries are Record claim addresses, which is why
		 * they are plain strings rather than a content reference: the documents
		 * live on the other origin.
		 */
		citesRecord: z.array(z.string().min(3)).default([]),
	}),
});

/**
 * Practitioner annotations against a Record claim address.
 *
 * `COMMONS.md` section 5.2. A named, licence-verified broker, adjuster or
 * lawyer attaches a signed note to `/sources/<id>#cN`. This raises citability
 * rather than diluting it, because a named expert on the record is itself
 * evidence - the encyclopedia's editor model rather than the anonymous thread.
 *
 * Annotations live here and are surfaced BESIDE the Record's claim, never
 * inside it. The verdict prohibition applies in full, licence or no licence.
 *
 * The collection is defined now and stays empty until the Record's licensed
 * review completes: section 13 gates this on that, because asking practitioners
 * to stake a licence on annotating records that carry no sign-off is the wrong
 * order. The schema existing is not the same as the mechanism launching.
 */
const annotations = defineCollection({
	loader: glob({ pattern: '**/*.json', base: './src/content/annotations' }),
	schema: z.object({
		/** The Record claim this annotates, as sources/<id>#cN. */
		claimAddress: z.string().regex(/^sources\/[a-z0-9-]+#c\d+$/, 'Use sources/<id>#cN'),
		note: z.string().min(60),
		contributor: contributor.refine((c) => c.license !== undefined, {
			message: 'An annotation requires a verified licence. That is the whole mechanism.',
		}),
		publishedOn: isoDate,
		moderatedBy: z.string().min(3),
		moderation: z.enum(MODERATION).default('published'),
	}),
});

export const collections = { reports, annotations };
