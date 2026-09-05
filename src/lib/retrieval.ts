/**
 * Deterministic retrieval over the published corpus.
 *
 * This module is the working implementation of the retrieval layer described in
 * AI-RETRIEVAL-ARCHITECTURE.md. It is intentionally model-free:
 *
 *  - the corpus is chunked by claim and section, never by arbitrary token window;
 *  - every chunk carries the source ids that support it;
 *  - filters for family, line, state, audience, and effective date are exact;
 *  - ranking is hybrid: BM25 over lexical tokens plus a bigram-overlap term that
 *    stands in for the semantic pass until a versioned embedding index exists;
 *  - a result below the evidence floor returns `insufficient`, never a guess.
 *
 * It has no Astro or Node dependency so the same code runs at build time and in
 * the browser. Nothing in here transmits the query anywhere.
 */

export type ChunkKind = 'answer' | 'assumption' | 'reasoning' | 'change' | 'variability' | 'action' | 'definition' | 'coverage-detail' | 'entity' | 'jurisdiction' | 'example' | 'tool';

export interface Chunk {
	/** Stable id: <entryType>:<slug>#<kind>-<n> */
	id: string;
	entryType: 'question' | 'coverage' | 'company' | 'state' | 'example' | 'tool';
	slug: string;
	title: string;
	path: string;
	kind: ChunkKind;
	text: string;
	sourceIds: string[];
	family: string;
	lines: string[];
	states: string[];
	audience: string;
	topics: string[];
	effectiveDate: string;
	lastReviewed: string;
	confidence: string;
}

export interface SearchIndex {
	version: string;
	builtFor: string;
	chunks: Chunk[];
	/** document frequency by token */
	df: Record<string, number>;
	avgLength: number;
	/** entry-level alias and title text, for exact-intent boosting */
	aliases: Array<{ slug: string; entryType: Chunk['entryType']; text: string }>;
}

export interface SearchFilters {
	family?: string;
	line?: string;
	state?: string;
	audience?: string;
	/** Exclude content whose effective date is after this ISO date. */
	asOf?: string;
}

export interface SearchHit {
	entryType: Chunk['entryType'];
	slug: string;
	title: string;
	path: string;
	score: number;
	confidence: string;
	lastReviewed: string;
	/** The strongest matching chunk, and the source ids behind it. */
	bestChunk: { id: string; kind: ChunkKind; text: string; sourceIds: string[] };
	matchedTerms: string[];
}

export type SearchOutcome =
	| { status: 'ok'; hits: SearchHit[]; interpretedAs: string[] }
	| { status: 'insufficient'; hits: SearchHit[]; interpretedAs: string[]; reason: string }
	| { status: 'no-result'; interpretedAs: string[]; reason: string }
	| { status: 'empty' };

/* ------------------------------------------------------------------ */
/* Tokenisation                                                        */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set([
	'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'did', 'do', 'does', 'for',
	'from', 'had', 'has', 'have', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'me', 'my',
	'no', 'not', 'of', 'on', 'or', 'so', 'that', 'the', 'their', 'them', 'then', 'there', 'these',
	'they', 'this', 'to', 'up', 'was', 'we', 'were', 'what', 'when', 'which', 'who', 'why',
	'will', 'with', 'would', 'you', 'your',
]);

/** Light suffix folding. Deliberately conservative: no aggressive stemming. */
function fold(token: string): string {
	if (token.length > 5 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
	if (token.length > 4 && token.endsWith('es') && !token.endsWith('ses')) return token.slice(0, -2);
	if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
	return token;
}

export function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/\[s:[a-z0-9-]+\]/g, ' ')
		.replace(/[^a-z0-9]+/g, ' ')
		.split(' ')
		.filter((t) => t.length > 1 && !STOPWORDS.has(t))
		.map(fold);
}

function bigrams(tokens: string[]): string[] {
	const out: string[] = [];
	for (let i = 0; i < tokens.length - 1; i += 1) out.push(`${tokens[i]}_${tokens[i + 1]}`);
	return out;
}

/* ------------------------------------------------------------------ */
/* Index construction                                                  */
/* ------------------------------------------------------------------ */

export function buildIndex(
	chunks: Chunk[],
	aliases: SearchIndex['aliases'],
	version: string,
): SearchIndex {
	const df: Record<string, number> = {};
	let total = 0;
	for (const chunk of chunks) {
		const tokens = tokenize(`${chunk.title} ${chunk.text}`);
		total += tokens.length;
		for (const token of new Set(tokens)) df[token] = (df[token] || 0) + 1;
	}
	return {
		version,
		builtFor: 'deterministic library lookup',
		chunks,
		df,
		avgLength: chunks.length ? total / chunks.length : 0,
		aliases,
	};
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

const K1 = 1.4;
const B = 0.72;

/**
 * A term appearing in more than this share of chunks carries no topical signal.
 * "Insurance" is in nearly every chunk; "earthquake" is not.
 */
export const COMMON_TERM_RATIO = 0.25;

/** Credit each additional matching chunk contributes, relative to its own score. */
const SUPPORT_CREDIT = 0.35;
/** Total supporting credit is capped at this multiple of the best chunk's score. */
const SUPPORT_CAP = 2;

/**
 * Floors calibrated against the published corpus, measured rather than guessed.
 * A question the library genuinely answers scores 49 or above. A query about a
 * topic it does not cover, but which shares vocabulary with it, scores 5 to 9.
 * The gap between those two populations is where the evidence floor belongs.
 *
 * Between the floors the answer is "related material, but not an answer", which
 * is more useful than an empty page and more honest than a confident hit.
 */
export const EVIDENCE_FLOOR = 30;
/** Below this there is nothing worth showing at all. */
export const NO_RESULT_FLOOR = 4;

function passesFilters(chunk: Chunk, filters: SearchFilters): boolean {
	if (filters.family && filters.family !== 'any' && chunk.family !== filters.family) return false;
	if (filters.line && filters.line !== 'any' && !chunk.lines.includes(filters.line)) return false;
	if (filters.state && filters.state !== 'any') {
		// A chunk with no state applies everywhere; a state-specific chunk must match.
		if (chunk.states.length > 0 && !chunk.states.includes(filters.state)) return false;
	}
	if (filters.audience && filters.audience !== 'any' && chunk.audience !== filters.audience) return false;
	if (filters.asOf && chunk.effectiveDate > filters.asOf) return false;
	return true;
}

export function search(
	index: SearchIndex,
	query: string,
	filters: SearchFilters = {},
	limit = 8,
): SearchOutcome {
	const queryTokens = tokenize(query);
	if (queryTokens.length === 0) return { status: 'empty' };

	const queryBigrams = new Set(bigrams(queryTokens));
	const n = index.chunks.length || 1;

	// Exact alias or title intent gets a bounded boost, so a person who types the
	// canonical question verbatim always lands on the canonical answer.
	const normalizedQuery = queryTokens.join(' ');
	const aliasBoost = new Map<string, number>();
	for (const alias of index.aliases) {
		const aliasTokens = tokenize(alias.text).join(' ');
		if (!aliasTokens) continue;
		const key = `${alias.entryType}:${alias.slug}`;
		if (aliasTokens === normalizedQuery) aliasBoost.set(key, Math.max(aliasBoost.get(key) || 0, 6));
		else if (aliasTokens.includes(normalizedQuery) || normalizedQuery.includes(aliasTokens)) {
			aliasBoost.set(key, Math.max(aliasBoost.get(key) || 0, 2.5));
		}
	}

	type Tally = SearchHit & { best: number; support: number };
	const perEntry = new Map<string, Tally>();
	const matchedGlobally = new Set<string>();

	for (const chunk of index.chunks) {
		if (!passesFilters(chunk, filters)) continue;

		const haystack = tokenize(`${chunk.title} ${chunk.text}`);
		if (haystack.length === 0) continue;
		const counts = new Map<string, number>();
		for (const token of haystack) counts.set(token, (counts.get(token) || 0) + 1);

		let lexical = 0;
		const matched: string[] = [];
		for (const token of new Set(queryTokens)) {
			const tf = counts.get(token);
			if (!tf) continue;
			matched.push(token);
			const dfv = index.df[token] || 1;
			const idf = Math.log(1 + (n - dfv + 0.5) / (dfv + 0.5));
			const norm = tf * (K1 + 1) / (tf + K1 * (1 - B + B * (haystack.length / (index.avgLength || 1))));
			lexical += idf * norm;
		}
		if (matched.length === 0) continue;

		// Bigram overlap: cheap proxy for phrase-level similarity.
		const chunkBigrams = new Set(bigrams(haystack));
		let phrase = 0;
		for (const bg of queryBigrams) if (chunkBigrams.has(bg)) phrase += 1;

		// Coverage of the query: how much of what was asked is actually present.
		const coverage = matched.length / new Set(queryTokens).size;

		/*
		 * A match on nothing but common vocabulary is not a match. "Insurance"
		 * appears in almost every chunk, so a question about a topic the library
		 * does not cover would otherwise come back with a page of confident hits
		 * that all matched on that one word. At least one matched term has to be
		 * distinctive before a hit is allowed to clear the evidence floor.
		 */
		const distinctive = matched.some((token) => (index.df[token] || 0) / n < COMMON_TERM_RATIO);
		const distinctiveFactor = distinctive ? 1 : 0.3;

		const kindWeight =
			chunk.kind === 'answer' || chunk.kind === 'definition' ? 1.25 :
			chunk.kind === 'reasoning' || chunk.kind === 'coverage-detail' ? 1.0 : 0.85;

		const score =
			(lexical * kindWeight + phrase * 1.6) *
				(0.3 + 0.7 * coverage ** 1.3) *
				distinctiveFactor +
			(aliasBoost.get(`${chunk.entryType}:${chunk.slug}`) || 0);

		matched.forEach((t) => matchedGlobally.add(t));

		/*
		 * An entry is scored by its single best chunk, plus bounded credit for the
		 * rest. Unbounded accumulation would rank a long entry above a short one
		 * that answers the question exactly, purely because it has more chunks to
		 * add up, and it would make the evidence floor drift with corpus size.
		 */
		const key = `${chunk.entryType}:${chunk.slug}`;
		const existing = perEntry.get(key);
		if (!existing) {
			perEntry.set(key, {
				entryType: chunk.entryType,
				slug: chunk.slug,
				title: chunk.title,
				path: chunk.path,
				score,
				best: score,
				support: 0,
				confidence: chunk.confidence,
				lastReviewed: chunk.lastReviewed,
				bestChunk: { id: chunk.id, kind: chunk.kind, text: chunk.text, sourceIds: chunk.sourceIds },
				matchedTerms: matched,
			});
		} else {
			if (score > existing.best) {
				// The previous best becomes supporting evidence for this entry.
				existing.support += existing.best * SUPPORT_CREDIT;
				existing.best = score;
				existing.bestChunk = { id: chunk.id, kind: chunk.kind, text: chunk.text, sourceIds: chunk.sourceIds };
				existing.matchedTerms = matched;
			} else {
				existing.support += score * SUPPORT_CREDIT;
			}
			existing.score = existing.best + Math.min(existing.support, existing.best * SUPPORT_CAP);
		}
	}

	const hits = [...perEntry.values()]
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map(({ best, support, ...hit }) => hit);
	const interpretedAs = queryTokens;

	if (hits.length === 0 || hits[0].score < NO_RESULT_FLOOR) {
		return {
			status: 'no-result',
			interpretedAs,
			reason: 'No published question, coverage page, or entity record matched these terms under the filters in effect.',
		};
	}
	if (hits[0].score < EVIDENCE_FLOOR) {
		return {
			status: 'insufficient',
			hits,
			interpretedAs,
			reason: 'The library holds related material, but nothing that answers this question directly enough to publish as an answer.',
		};
	}
	return { status: 'ok', hits, interpretedAs };
}

/* ------------------------------------------------------------------ */
/* Claim-to-source validator                                           */
/* ------------------------------------------------------------------ */

export interface ValidationIssue {
	chunkId: string;
	problem: 'no-source' | 'unknown-source' | 'inactive-source' | 'stale-source';
	detail: string;
}

/**
 * Every chunk must map to at least one known, active source. Run at build time;
 * see scripts/verify.mjs for the assertion that wraps it.
 */
export function validateChunks(
	chunks: Chunk[],
	sources: Map<string, { status: string; lastChecked: string }>,
	staleBefore: string,
): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	for (const chunk of chunks) {
		if (chunk.sourceIds.length === 0) {
			issues.push({ chunkId: chunk.id, problem: 'no-source', detail: 'Chunk carries no source id.' });
			continue;
		}
		for (const id of chunk.sourceIds) {
			const source = sources.get(id);
			if (!source) {
				issues.push({ chunkId: chunk.id, problem: 'unknown-source', detail: `Source "${id}" is not in the registry.` });
				continue;
			}
			if (source.status === 'unavailable' || source.status === 'superseded') {
				issues.push({ chunkId: chunk.id, problem: 'inactive-source', detail: `Source "${id}" is ${source.status}.` });
			}
			if (source.lastChecked < staleBefore) {
				issues.push({ chunkId: chunk.id, problem: 'stale-source', detail: `Source "${id}" was last checked ${source.lastChecked}.` });
			}
		}
	}
	return issues;
}
