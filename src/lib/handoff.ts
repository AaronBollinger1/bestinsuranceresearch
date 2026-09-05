import { siteConfig } from '../config/site';

/**
 * Bollinsure handoff attribution.
 *
 * Only anonymous, controlled-vocabulary fields cross the boundary. The user's
 * free-form question, any tool-entered fact, and anything resembling personal
 * data must never reach this URL. See BOLLINSURE-INTEGRATION.md.
 */

export type InsuranceFamily = 'personal' | 'commercial' | 'life' | 'health' | 'general';

export interface HandoffAttribution {
	/** Route the person came from, for example /questions/claims-made-retroactive-date. */
	sourcePath: string;
	family?: InsuranceFamily;
	line?: string;
	/** Tool identifier, when the handoff comes from a tool. */
	sourceTool?: string;
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,48}$/;
const PATH = /^\/[a-zA-Z0-9\-/._]{0,120}$/;

function safeSlug(value: string | undefined): string | undefined {
	if (!value) return undefined;
	return SLUG.test(value) ? value : undefined;
}

/**
 * Build the outbound Bollinsure URL. Returns a plain string so the anchor is a
 * real link with a real href before any JavaScript runs.
 */
export function bollinsureUrl(path: string, attribution: HandoffAttribution): string {
	const url = new URL(path, siteConfig.bollinsureOrigin);
	url.searchParams.set('utm_source', 'bestinsuranceresearch');
	url.searchParams.set('utm_medium', 'referral');

	if (PATH.test(attribution.sourcePath)) {
		url.searchParams.set('bir_source_path', attribution.sourcePath);
	}
	const family = safeSlug(attribution.family);
	if (family) url.searchParams.set('bir_family', family);
	const line = safeSlug(attribution.line);
	if (line) url.searchParams.set('bir_line', line);
	const tool = safeSlug(attribution.sourceTool);
	if (tool) url.searchParams.set('bir_source_tool', tool);

	/*
	 * There is deliberately no completion parameter. One existed, rounded to
	 * the nearest ten so it could not fingerprint, and it was never passed by
	 * any caller. It is removed rather than left dormant because its only
	 * purpose is to tell the brokerage how far someone got, which is lead
	 * scoring, and this property offers a reading with no pitch attached. The
	 * tool name still crosses, so a broker knows what the person was reading;
	 * how far they got through it is not the brokerage business.
	 */

	return url.toString();
}

export const handoffActions = (attribution: HandoffAttribution) => {
	const subject = attribution.family && attribution.family !== 'general'
		? `Licensed review request (${attribution.family} lines)`
		: 'Licensed review request';
	return {
		/*
		 * There is deliberately no `book` action. It used to point at
		 * bollinsure.com/contact, which returns 404, and that site has no
		 * scheduling page at any path, so the button was dead everywhere a
		 * handoff rendered. A person reaches a broker here by calling. If a
		 * booking page is ever published, add it back and label it for what it
		 * is; do not point a "book a time" button at a quote form.
		 */
		quote: bollinsureUrl('/quote', attribution),
		email: `mailto:${siteConfig.contact.email}?subject=${encodeURIComponent(subject)}`,
		call: siteConfig.contact.phoneHref,
	};
};
