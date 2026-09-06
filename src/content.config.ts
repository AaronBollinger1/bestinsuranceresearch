import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Typed content collections for BestInsurance Research.
 *
 * Every collection is a JSON data collection under src/content/<name>/.
 * The file basename is the collection entry id. Prose fields may contain
 * inline citation markers of the exact form [S:source-id]; src/lib/citations.ts
 * resolves them to numbered links into the page's visible source ledger and
 * throws at build time on any marker that does not resolve.
 *
 * See CONTENT-MODEL.md for the narrative version of this schema.
 */

const isoDate = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'expected an ISO date, for example 2026-08-31');

/**
 * Source dates come at the precision the publisher actually gives. A statute
 * enacted in 1872 has no day, a bulletin may give only a month, and some pages
 * state no date at all. Forcing a full ISO date here would mean inventing
 * precision, so partial dates are first-class and "unknown" is a real answer.
 */
const partialDate = z
	.string()
	.regex(
		/^(\d{4}|\d{4}-\d{2}|\d{4}-\d{2}-\d{2}|unknown|n\/a)$/,
		'expected YYYY, YYYY-MM, YYYY-MM-DD, "unknown", or "n/a"',
	);

const optionalIsoDate = partialDate;

const INSURANCE_FAMILY = ['personal', 'commercial', 'life', 'health'] as const;
const AUDIENCE = ['individual', 'business-owner', 'professional'] as const;
const CONFIDENCE = ['established', 'contextual', 'disputed', 'changing', 'insufficient'] as const;
const REVIEW_STATE = ['reviewed', 'under-review', 'corrected'] as const;

/* ------------------------------------------------------------------
   SOURCE
   ------------------------------------------------------------------ */
const sources = defineCollection({
	loader: glob({ pattern: '**/*.json', base: './src/content/sources' }),
	schema: z.object({
		title: z.string().min(4),
		publisher: z.string().min(2),
		url: z.string().url(),
		sourceType: z.enum([
			'statute',
			'regulation',
			'legislative-record',
			'regulator-guidance',
			'regulator-record',
			'policy-form',
			'government-data',
			'official-documentation',
			'court-decision',
			'secondary-analysis',
		]),
		jurisdiction: z.string().min(2),
		authorityLevel: z.enum([
			'primary-law',
			'regulator',
			'standards-body',
			'carrier-official',
			'secondary',
		]),
		/**
		 * False when the text is a reproduction on a third party's site rather than
		 * the publisher's own. The words may be identical; the guarantee is not, and
		 * a reader deserves to see which one they are relying on.
		 */
		officialHost: z.boolean().default(true),
		publishedDate: optionalIsoDate,
		effectiveDate: optionalIsoDate,
		accessedDate: isoDate,
		lastChecked: isoDate,
		/**
		 * What established `lastChecked`. Without this the date overstates
		 * itself: `accessedDate` and `lastChecked` were identical on 260 of 263
		 * records, so the field asserted a per-source re-verification that had
		 * not happened per source, and every source would have gone stale on the
		 * same day.
		 *
		 * 'access' means the only confirmation is that a person read the source
		 * when it was added, and `lastChecked` therefore says nothing more than
		 * `accessedDate`. 'recheck' means someone returned to it afterwards and
		 * confirmed it still says what this record claims. The distinction is
		 * enforced below, so a record cannot claim a recheck it did not have.
		 */
		lastCheckedBasis: z.enum(['access', 'recheck']),
		/** Primary sources carry the claim. Secondary sources may only explain one. */
		primary: z.boolean(),
		/** Exact claims this source supports, each a complete sentence. */
		claims: z.array(z.string().min(12)).min(1),
		updateCadence: z.string().min(3),
		/**
		 * 'not-adopted' covers a bill or proposal that never became law. It is kept
		 * as a distinct status because a reader who sees a bill cited and assumes it
		 * is in force has been actively misled.
		 */
		// 'rescinded' is not a synonym for 'superseded'. Superseded says a replacement
		// exists; rescinded says the issuer withdrew the document and put nothing in
		// its place. Telling a reader that a withdrawn guidance was "superseded"
		// implies there is a current version to consult, and there may not be. Same
		// reasoning that put 'not-adopted' on this list.
		status: z.enum(['active', 'superseded', 'rescinded', 'unavailable', 'disputed', 'not-adopted']),
		// Why the status is what it is, in the publisher's own terms where possible.
		// Required on anything that is not active.
		statusNote: z.string().min(20).optional(),
		// What replaced it, where a replacement exists. The chain matters: a document
		// can be superseded by one that has itself since been withdrawn, and that is
		// the state a reader most needs not to get wrong.
		supersededBy: z.union([reference('sources'), z.null()]).default(null),
		/**
		 * Archived snapshot, only where legally and technically appropriate.
		 * We record the archive URL, never a rehosted copy of the document.
		 */
		archive: z
			.object({ url: z.string().url(), capturedDate: isoDate })
			.optional(),
		notes: z.string().optional(),
	}),
});

/* ------------------------------------------------------------------
   QUESTION
   ------------------------------------------------------------------ */
const questions = defineCollection({
	loader: glob({ pattern: '**/*.json', base: './src/content/questions' }),
	schema: z.object({
		question: z.string().min(10),
		aliases: z.array(z.string().min(6)).default([]),
		/** 2-5 sentences. The direct answer, stated first. */
		shortAnswer: z.string().min(80),
		assumes: z.array(z.string().min(10)).min(2),
		/** Paragraphs separated by a blank line. Citation markers required. */
		why: z.string().min(200),
		whatChanges: z.array(z.string().min(10)).min(2),
		variability: z.array(z.string().min(10)).min(1),
		nextActions: z.array(z.string().min(10)).min(2),
		confidence: z.enum(CONFIDENCE),
		reviewState: z.enum(REVIEW_STATE).default('reviewed'),
		/** Present only when reviewState is 'corrected'. */
		correction: z
			.object({ date: isoDate, was: z.string().min(10), now: z.string().min(10) })
			.optional(),
		family: z.enum(INSURANCE_FAMILY),
		lines: z.array(z.string()).min(1),
		states: z.array(z.string().length(2)).default([]),
		audience: z.enum(AUDIENCE),
		topics: z.array(z.string()).min(1),
		companies: z.array(reference('companies')).default([]),
		coverages: z.array(reference('coverages')).default([]),
		effectiveDate: isoDate,
		lastReviewed: isoDate,
		author: z.string().min(3),
		reviewer: z.string().min(3),
		related: z.array(reference('questions')).default([]),
		handoff: z.object({ recommended: z.boolean(), reason: z.string().min(20) }),
		sourceIds: z.array(reference('sources')).min(1),
		/** Gate structured data on visible content, never the other way round. */
		schemaEligible: z
			.object({ faqPage: z.boolean().default(false), techArticle: z.boolean().default(true) })
			.default({ faqPage: false, techArticle: true }),
	}),
});

/* ------------------------------------------------------------------
   COVERAGE
   ------------------------------------------------------------------ */
const noteItem = z.object({ item: z.string().min(3), note: z.string().min(15) });

const coverages = defineCollection({
	loader: glob({ pattern: '**/*.json', base: './src/content/coverages' }),
	schema: z.object({
		name: z.string().min(4),
		line: z.string().min(3),
		family: z.enum(INSURANCE_FAMILY),
		definition: z.string().min(80),
		protects: z.array(z.string().min(10)).min(1),
		commonlyCovers: z.array(noteItem).min(2),
		commonlyExcludes: z.array(noteItem).min(2),
		limitsAndDeductibles: z.array(z.string().min(15)).min(1),
		endorsements: z.array(noteItem).default([]),
		relatedPolicies: z.array(z.string().min(3)).default([]),
		underwritingInputs: z.array(z.string().min(4)).min(1),
		/**
		 * What actually causes loss on this line, as distinct from what the policy
		 * protects. `protects` answers "what is this for"; `exposures` answers "what
		 * goes wrong", which is the question an underwriter is really asking and the
		 * one a reader needs before they can judge a limit.
		 */
		exposures: z.array(noteItem).min(3),
		/**
		 * What reduces the frequency or the severity of those exposures.
		 *
		 * This is the field most likely to drift into selling, so the boundary is
		 * enforced rather than trusted: `scripts/verify.mjs` rejects any premium,
		 * savings, discount, or guarantee language here. A mitigation is a thing a
		 * reader can do and a source can support, not a promised outcome. Whether
		 * any insurer credits it is an underwriting decision and is not ours to state.
		 */
		claimMitigation: z.array(noteItem).min(3),
		stateVariations: z
			.array(z.object({ state: z.string().length(2), note: z.string().min(15) }))
			.default([]),
		lastReviewed: isoDate,
		effectiveDate: isoDate,
		author: z.string().min(3),
		reviewer: z.string().min(3),
		reviewState: z.enum(REVIEW_STATE).default('reviewed'),
		sourceIds: z.array(reference('sources')).min(1),
		relatedQuestions: z.array(reference('questions')).default([]),
	}),
});

/* ------------------------------------------------------------------
   COMPANY / ORGANIZATION
   ------------------------------------------------------------------ */
const linkItem = z.object({
	label: z.string().min(3),
	url: z.string().url(),
	note: z.string().min(10).optional(),
});

const companies = defineCollection({
	loader: glob({ pattern: '**/*.json', base: './src/content/companies' }),
	schema: z.object({
		legalName: z.string().min(4),
		shortName: z.string().min(2),
		orgType: z.enum([
			'regulator',
			'standards-organization',
			'public-entity',
			'insurer',
			'insurance-group',
			'residual-market',
		]),
		/** Only when sourced. Never inferred. */
		naic: z
			.object({ companyCode: z.string().optional(), groupCode: z.string().optional() })
			.optional(),
		summary: z.string().min(80),
		officialUrls: z.array(linkItem).min(1),
		contactChannels: z
			.array(z.object({ label: z.string().min(3), value: z.string().min(3), note: z.string().optional() }))
			.default([]),
		regulatorRecords: z.array(linkItem).default([]),
		publications: z.array(linkItem).default([]),
		statutoryBasis: z.array(linkItem).default([]),
		jurisdictions: z.array(z.string()).min(1),
		/** Explicit non-claims. Keeps the page honest about its own limits. */
		whatWeDoNotClaim: z.array(z.string().min(15)).min(2),
		lastReviewed: isoDate,
		author: z.string().min(3),
		reviewer: z.string().min(3),
		reviewState: z.enum(REVIEW_STATE).default('reviewed'),
		sourceIds: z.array(reference('sources')).min(1),
		relatedQuestions: z.array(reference('questions')).default([]),
	}),
});

/* ------------------------------------------------------------------
   STATE
   ------------------------------------------------------------------ */
const states = defineCollection({
	loader: glob({ pattern: '**/*.json', base: './src/content/states' }),
	schema: z.object({
		code: z.string().length(2),
		name: z.string().min(4),
		regulator: z.object({
			name: z.string().min(4),
			url: z.string().url(),
			consumerPhone: z.string().optional(),
		}),
		summary: z.string().min(120),
		keyMechanisms: z.array(z.object({ title: z.string().min(4), detail: z.string().min(30) })).min(1),
		residualMarket: z
			.object({ name: z.string().min(4), url: z.string().url(), note: z.string().min(20) })
			.optional(),
		autoRequirements: z
			.array(z.object({ item: z.string().min(3), detail: z.string().min(15) }))
			.default([]),
		wcMechanism: z.object({ detail: z.string().min(30) }).optional(),
		consumerTools: z.array(linkItem).default([]),
		lastReviewed: isoDate,
		effectiveDate: isoDate,
		author: z.string().min(3),
		reviewer: z.string().min(3),
		reviewState: z.enum(REVIEW_STATE).default('reviewed'),
		sourceIds: z.array(reference('sources')).min(1),
		relatedQuestions: z.array(reference('questions')).default([]),
	}),
});

/* ------------------------------------------------------------------
   EXAMPLE
   ------------------------------------------------------------------ */
const examples = defineCollection({
	loader: glob({ pattern: '**/*.json', base: './src/content/examples' }),
	schema: z.object({
		title: z.string().min(10),
		/**
		 * The label is load-bearing. A composite or hypothetical may never be
		 * presented as a real client result, and no example may describe a
		 * Bollinsure client without a documented consent record.
		 */
		label: z.enum(['public-record', 'carrier-authored', 'published-industry', 'anonymized-client', 'composite', 'hypothetical']),
		labelNote: z.string().min(30),
		family: z.enum(INSURANCE_FAMILY),
		lines: z.array(z.string()).min(1),
		whatHappened: z.string().min(80),
		informationThatMattered: z.array(z.string().min(10)).min(3),
		insuranceQuestion: z.string().min(15),
		reasoningPath: z.string().min(200),
		decidedBy: z.string().min(20),
		cannotGeneralize: z.array(z.string().min(15)).min(3),
		provenance: z.string().min(40),
		/** Required for label 'anonymized-client'. Enforced in scripts/verify.mjs. */
		consentRecord: z.string().optional(),
		lastReviewed: isoDate,
		author: z.string().min(3),
		reviewer: z.string().min(3),
		reviewState: z.enum(REVIEW_STATE).default('reviewed'),
		sourceIds: z.array(reference('sources')).min(1),
		relatedQuestions: z.array(reference('questions')).default([]),
	}),
});

/* ------------------------------------------------------------------
   TOOL REGISTRY
   Built and unbuilt tools live in one registry. Only status 'live'
   tools get a route, sitemap entry, or navigation link.
   ------------------------------------------------------------------ */
const tools = defineCollection({
	loader: glob({ pattern: '**/*.json', base: './src/content/tools' }),
	schema: z.object({
		name: z.string().min(4),
		status: z.enum(['live', 'specified', 'roadmap']),
		order: z.number().int(),
		family: z.array(z.enum(INSURANCE_FAMILY)).min(1),
		lines: z.array(z.string()).min(1),
		summary: z.string().min(60),
		/** Every future tool must name all of the following. */
		spec: z.object({
			user: z.string().min(20),
			inputData: z.array(z.string().min(4)).min(1),
			authoritativeSources: z.array(z.string().min(6)).min(1),
			privacyBoundary: z.string().min(30),
			decisionRules: z.array(z.string().min(15)).min(1),
			uncertainty: z.string().min(25),
			output: z.string().min(20),
			exportFormat: z.array(z.string().min(3)).min(1),
			accessibilityStates: z.array(z.string().min(4)).min(1),
			schemaEligibility: z.string().min(10),
			reviewOwner: z.string().min(3),
			updateCadence: z.string().min(4),
		}),
		/** Only live tools carry a route. */
		route: z.string().startsWith('/tools/').optional(),
		/**
		 * The tool's substantive checklist content. Live tools render these rows;
		 * a specified-but-unbuilt tool leaves this empty rather than shipping a stub.
		 */
		items: z
			.array(
				z.object({
					group: z.string().min(3),
					label: z.string().min(3),
					detail: z.string().min(20),
					kind: z.enum(['document', 'schedule', 'limit', 'endorsement', 'evidence', 'question', 'trigger']),
					appliesTo: z.array(z.enum(['personal', 'commercial'])).min(1),
					lines: z.array(z.string()).default([]),
				}),
			)
			.default([]),
		sourceIds: z.array(reference('sources')).default([]),
		relatedQuestions: z.array(reference('questions')).default([]),
		lastReviewed: isoDate,
	}),
});

/* ------------------------------------------------------------------
   AUTHOR / REVIEWER
   ------------------------------------------------------------------ */
const people = defineCollection({
	loader: glob({ pattern: '**/*.json', base: './src/content/people' }),
	schema: z.object({
		name: z.string().min(4),
		role: z.string().min(4),
		licensed: z.boolean(),
		license: z.object({ authority: z.string(), number: z.string() }).optional(),
		bio: z.string().min(60),
		scope: z.array(z.string().min(10)).min(1),
		url: z.string().url().optional(),
	}),
});


/* ------------------------------------------------------------------
   ADVISORY MODULE
   One line-specific assessment. Writes into the shared Coverage
   Position; see POSITIONING.md and src/lib/position.ts.
   ------------------------------------------------------------------ */
const FIELD_KINDS = ['select', 'multiselect', 'boolean', 'number', 'date', 'text', 'band'] as const;
const RULE_KINDS = ['gap', 'inconsistency', 'timing', 'documentation', 'question'] as const;
const OPERATORS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'includes', 'excludes', 'isSet', 'isEmpty', 'countGte'] as const;

// A date comparand must say whether it rolls with the reader's clock or is
// anchored to a calendar date, because those are different claims and only one
// of them can be written as a literal. See Comparand in src/lib/position.ts.
const comparand = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.null(),
	z.object({ field: z.string() }),
	z.object({ daysFromToday: z.number().int() }),
	z.object({ monthsFromToday: z.number().int() }),
	z.object({ fixedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), why: z.string().min(15) }),
	z.object({ yearsSince: z.number().int().gte(1800).lte(2200) }),
]);

const modules = defineCollection({
	loader: glob({ pattern: '**/*.json', base: './src/content/modules' }),
	schema: z.object({
		name: z.string().min(4),
		summary: z.string().min(30),
		family: z.enum(INSURANCE_FAMILY),
		lines: z.array(z.string()).min(1),
		order: z.number().int().default(50),
		status: z.enum(['live', 'specified']).default('live'),
		/** Names specifically what this module refuses to collect. */
		privacyBoundary: z.string().min(30),
		/** What it cannot determine, and who decides instead. */
		uncertainty: z.string().min(30),
		/** The vanity domain that redirects here, when there is one. */
		domain: z.string().nullable().default(null),
		fields: z
			.array(
				z.object({
					id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
					label: z.string().min(4),
					help: z.string().optional(),
					kind: z.enum(FIELD_KINDS),
					options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
					unit: z.string().optional(),
					group: z.string().min(3),
					required: z.boolean().default(false),
					// A field either feeds a rule or belongs on the printed brief.
					// Leaving that implicit is how twelve fields ended up being asked
					// for and never read by anything.
					purpose: z.enum(['rule-input', 'brief-only']).default('rule-input'),
					privacyNote: z.string().optional(),
				}),
			)
			.min(6),
		rules: z
			.array(
				z.object({
					id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
					kind: z.enum(RULE_KINDS),
					severity: z.enum(['high', 'medium', 'low']),
					title: z.string().min(10),
					detail: z.string().min(30),
					action: z.string().min(15),
					when: z.object({
						all: z
							.array(z.object({ field: z.string(), op: z.enum(OPERATORS), value: comparand.optional() }))
							.min(1),
					}),
					sourceIds: z.array(reference('sources')).default([]),
					relatedQuestion: z.union([reference('questions'), z.null()]).default(null),
					routeToProfessional: z
						.union([z.enum(['broker', 'insurer', 'lawyer', 'accountant']), z.null()])
						.default(null),
				}),
			)
			.min(4),
		lastReviewed: isoDate,
		author: z.string().min(3),
		reviewer: z.string().min(3),
		reviewState: z.enum(REVIEW_STATE).default('under-review'),
	}),
});

const crossRules = defineCollection({
	loader: glob({ pattern: '**/*.json', base: './src/content/cross-rules' }),
	/*
	 * A finding that spans two modules is owned by the position, not by
	 * either module, which is why these live apart. Fields are addressed
	 * '<moduleId>.<fieldId>' and every one is resolved at build time.
	 */
	schema: z.object({
		kind: z.enum(RULE_KINDS),
		severity: z.enum(['high', 'medium', 'low']),
		modules: z.array(z.string()).min(2),
		title: z.string().min(10),
		detail: z.string().min(30),
		action: z.string().min(15),
		when: z.object({
			all: z
				.array(z.object({ field: z.string(), op: z.enum(OPERATORS), value: comparand.optional() }))
				.min(2),
		}),
		sourceIds: z.array(reference('sources')).min(1),
		relatedQuestion: z.union([reference('questions'), z.null()]).default(null),
		routeToProfessional: z
			.union([z.enum(['broker', 'insurer', 'lawyer', 'accountant']), z.null()])
			.default(null),
		lastReviewed: isoDate,
		author: z.string().min(3),
		reviewer: z.string().min(3),
		reviewState: z.enum(REVIEW_STATE).default('under-review'),
	}),
});

export const collections = { crossRules, sources, questions, coverages, companies, states, examples, tools, modules, people };
