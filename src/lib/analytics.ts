/**
 * Privacy-minimal analytics event specification.
 *
 * This module defines the contract only. Nothing here sends a request unless a
 * production deployment supplies a container id, and the runtime helper in
 * BaseLayout.astro filters every payload against the allow-lists below before
 * it can be pushed. Free-form text can never become a parameter value.
 *
 * See ANALYTICS-EVENT-SPEC.md.
 */

export const ANALYTICS_EVENTS = [
	'research_search_started',
	'research_answer_viewed',
	'source_opened',
	'related_question_opened',
	'tool_started',
	'tool_completed',
	'correction_started',
	'bollinsure_handoff_clicked',
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** Every allowed parameter, with its controlled vocabulary. */
export const ANALYTICS_PARAMETERS = {
	insurance_family: ['personal', 'commercial', 'life', 'health', 'general'],
	line: [
		'homeowners',
		'earthquake',
		'landlord',
		'renters',
		'condo',
		'auto',
		'umbrella',
		'flood',
		'general-liability',
		'commercial-property',
		'workers-compensation',
		'commercial-auto',
		'professional-liability',
		'inland-marine',
		'surety',
		'cyber',
		'epli',
		'multiple',
		'none',
	],
	state: ['CA', 'TX', 'FL', 'other', 'none'],
	source_type: [
		'statute',
		'regulation',
		'regulator-guidance',
		'regulator-record',
		'policy-form',
		'government-data',
		'official-documentation',
		'court-decision',
		'secondary-analysis',
	],
	page_type: [
		'home',
		'ask',
		'question',
		'coverage',
		'company',
		'state',
		'example',
		'source',
		'tool',
		'editorial',
	],
	tool_name: ['requirement-mapper', 'renewal-readiness', 'policy-comparison'],
	answer_status: ['established', 'contextual', 'disputed', 'changing', 'insufficient', 'no-result'],
	/** Bucketed to the nearest ten so it cannot act as a fingerprint. */
	completion_bucket: ['0', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100'],
} as const;

export type AnalyticsParameter = keyof typeof ANALYTICS_PARAMETERS;

/**
 * Fields that must never appear in a payload. Enforced at runtime by the
 * filter in BaseLayout.astro and asserted by scripts/verify.mjs.
 */
export const FORBIDDEN_ANALYTICS_FIELDS = [
	'q',
	'query',
	'question',
	'search',
	'text',
	'name',
	'email',
	'phone',
	'address',
	'street',
	'city',
	'zip',
	'postal',
	'policy',
	'policy_number',
	'claim',
	'claim_number',
	'dob',
	'ssn',
	'document',
	'answer',
	'notes',
	'value',
	'input',
	'user_id',
	'client_id',
] as const;

/** Serialized into the page so the runtime filter and the tests share one list. */
export const analyticsContract = {
	events: ANALYTICS_EVENTS,
	parameters: ANALYTICS_PARAMETERS,
	forbidden: FORBIDDEN_ANALYTICS_FIELDS,
};
