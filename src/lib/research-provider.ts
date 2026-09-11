/**
 * Server-only boundary for Birch's future Perplexity research scout.
 *
 * This module deliberately does not answer a reader's question. It accepts a
 * privacy-screened research brief, retrieves candidate sources, and returns
 * source records that are still `candidate`. A reviewer must verify each URL
 * and claim before anything can enter the published corpus.
 *
 * Keep this module out of browser imports. The static preview has no live
 * endpoint yet; the first server route should call `runPerplexityScout` from a
 * durable job, not from `/ask`.
 */

import type {
	ResearchBrief,
	ResearchProviderTrace,
	ResearchSourceClass,
	ResearchSourceRecord,
} from './research-pipeline';

export const PERPLEXITY_SEARCH_ENDPOINT = 'https://api.perplexity.ai/search';
export const DEFAULT_MAX_RESULTS = 8;

/** Domains appropriate for the first California research desk. */
export const CALIFORNIA_PRIMARY_DOMAINS = [
	'insurance.ca.gov',
	'leginfo.legislature.ca.gov',
	'legislature.ca.gov',
	'courts.ca.gov',
	'gov.ca.gov',
	'oag.ca.gov',
] as const;

const PRIVATE_INPUT = /\b(?:social\s*security|ssn|policy\s*(?:number|#)|claim\s*(?:number|#)|account\s*(?:number|#)|date\s+of\s+birth|dob|email\s+address|phone\s+number|street\s+address|medical|health\s+(?:record|condition)|diagnos(?:is|ed)|prescription)\b/i;

export interface ResearchScoutInput {
	brief: ResearchBrief;
	/** A normalized query, never an unreviewed raw transcript. */
	query: string;
	sourceClass: ResearchSourceClass;
	allowedDomains?: readonly string[];
	country?: string;
}

export interface PerplexitySearchOptions {
	apiKey: string;
	maxResults?: number;
	maxTokens?: number;
	maxTokensPerPage?: number;
	endpoint?: string;
}

export interface PerplexitySearchRequest {
	endpoint: string;
	init: RequestInit;
	query: string;
	allowedDomains: string[];
}

export interface PerplexityCandidateSource extends ResearchSourceRecord {
	snippet: string;
	publishedOn?: string;
	lastUpdatedOn?: string;
}

export interface PerplexityScoutResult {
	provider: ResearchProviderTrace;
	sources: PerplexityCandidateSource[];
}

export class ResearchProviderError extends Error {
	readonly code: 'server-only' | 'privacy-screen' | 'invalid-brief' | 'provider-response';

	constructor(code: ResearchProviderError['code'], message: string) {
		super(message);
		this.name = 'ResearchProviderError';
		this.code = code;
	}
}

function requireServerExecution() {
	if (typeof window !== 'undefined') {
		throw new ResearchProviderError('server-only', 'Research scouting is server-only.');
	}
}

function clamp(value: number | undefined, minimum: number, maximum: number, fallback: number) {
	return Math.min(maximum, Math.max(minimum, Math.round(value ?? fallback)));
}

function cleanDomains(domains: readonly string[] | undefined) {
	return [...new Set((domains ?? CALIFORNIA_PRIMARY_DOMAINS).map((domain) => domain.trim().toLowerCase()).filter(Boolean))].slice(0, 20);
}

/** Refuse sensitive or identifying text before it can reach a provider. */
export function sanitizeResearchQuery(query: string) {
	const cleaned = query.replace(/\s+/g, ' ').trim();
	if (!cleaned) throw new ResearchProviderError('privacy-screen', 'A research query is required.');
	if (cleaned.length > 240) throw new ResearchProviderError('privacy-screen', 'Research queries are limited to 240 characters.');
	if (PRIVATE_INPUT.test(cleaned)) {
		throw new ResearchProviderError('privacy-screen', 'This query needs a private, local review path before research scouting.');
	}
	return cleaned;
}

function assertBrief(brief: ResearchBrief) {
	if (!brief.id.trim() || !brief.topic.trim() || !brief.jurisdiction.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(brief.asOf)) {
		throw new ResearchProviderError('invalid-brief', 'A research brief needs an id, topic, jurisdiction, and ISO as-of date.');
	}
}

/**
 * Build the exact request without making a network call. The API key is held
 * only in the Authorization header so it cannot become part of a URL or body.
 */
export function buildPerplexitySearchRequest(input: ResearchScoutInput, options: PerplexitySearchOptions): PerplexitySearchRequest {
	requireServerExecution();
	assertBrief(input.brief);
	const query = sanitizeResearchQuery(input.query);
	if (!options.apiKey.trim()) throw new ResearchProviderError('server-only', 'PERPLEXITY_API_KEY is not configured.');
	const allowedDomains = cleanDomains(input.allowedDomains);
	const maxResults = clamp(options.maxResults, 1, 20, DEFAULT_MAX_RESULTS);
	const maxTokens = clamp(options.maxTokens, 1000, 10000, 6000);
	const maxTokensPerPage = clamp(options.maxTokensPerPage, 400, 2500, 1200);
	const body = {
		query: `${query} (${input.brief.jurisdiction}; as of ${input.brief.asOf})`,
		max_results: maxResults,
		max_tokens: maxTokens,
		max_tokens_per_page: maxTokensPerPage,
		search_domain_filter: allowedDomains,
		country: input.country ?? 'US',
	};
	return {
		endpoint: options.endpoint ?? PERPLEXITY_SEARCH_ENDPOINT,
		allowedDomains,
		query,
		init: {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${options.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		},
	};
}

function stableId(url: string) {
	let hash = 2166136261;
	for (const character of url) {
		hash ^= character.charCodeAt(0);
		hash = Math.imul(hash, 16777619);
	}
	return `candidate-${(hash >>> 0).toString(16)}`;
}

function isAllowedHost(hostname: string, domains: readonly string[]) {
	const host = hostname.toLowerCase().replace(/^www\./, '');
	return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function asString(value: unknown) {
	return typeof value === 'string' ? value.trim() : '';
}

function asDate(value: unknown) {
	const date = asString(value);
	return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
}

/** Convert raw Search API results into candidate source records, never claims. */
export function normalizePerplexitySearchResponse(
	payload: unknown,
	input: ResearchScoutInput,
	requestedAt = new Date().toISOString(),
): PerplexityScoutResult {
	const body = payload && typeof payload === 'object' ? payload as { results?: unknown; id?: unknown } : {};
	const rows = Array.isArray(body.results) ? body.results : [];
	const domains = cleanDomains(input.allowedDomains);
	const seen = new Set<string>();
	const sources: PerplexityCandidateSource[] = [];
	for (const row of rows) {
		if (!row || typeof row !== 'object') continue;
		const result = row as Record<string, unknown>;
		const rawUrl = asString(result.url);
		let url: URL;
		try { url = new URL(rawUrl); } catch { continue; }
		if (url.protocol !== 'https:' || !isAllowedHost(url.hostname, domains)) continue;
		url.hash = '';
		const canonicalUrl = url.toString();
		if (seen.has(canonicalUrl)) continue;
		seen.add(canonicalUrl);
		const title = asString(result.title) || canonicalUrl;
		sources.push({
			id: stableId(canonicalUrl),
			url: canonicalUrl,
			title,
			publisher: url.hostname.replace(/^www\./, ''),
			jurisdiction: input.brief.jurisdiction,
			sourceClass: input.sourceClass,
			officialHost: true,
			accessedOn: requestedAt.slice(0, 10),
			status: 'candidate',
			snippet: asString(result.snippet),
			publishedOn: asDate(result.date),
			lastUpdatedOn: asDate(result.last_updated),
		});
	}
	return {
		provider: {
			name: 'perplexity',
			outputMode: 'search-results',
			requestedAt,
			modelId: 'search-api',
			requestId: asString(body.id) || undefined,
		},
		sources,
	};
}

/** Execute one bounded scout request from a server runtime or worker. */
export async function runPerplexityScout(input: ResearchScoutInput, options: PerplexitySearchOptions): Promise<PerplexityScoutResult> {
	const request = buildPerplexitySearchRequest(input, options);
	const response = await fetch(request.endpoint, request.init);
	if (!response.ok) throw new ResearchProviderError('provider-response', `Research provider returned HTTP ${response.status}.`);
	let payload: unknown;
	try { payload = await response.json(); } catch {
		throw new ResearchProviderError('provider-response', 'Research provider returned invalid JSON.');
	}
	return normalizePerplexitySearchResponse(payload, input, new Date().toISOString());
}
