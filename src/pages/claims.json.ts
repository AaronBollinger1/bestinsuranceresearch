import type { APIRoute } from 'astro';
import { citingPages, loadCorpus } from '../lib/corpus';
import { claimIndex, jsonResponse } from '../lib/machine';

export const prerender = true;

/**
 * The claim index.
 *
 * Every one of the individually recorded claims in the library, each with its
 * own stable address, a checksum over its exact text, the source that supports
 * it, and the pages that rely on it.
 *
 * This exists because the unit a citing party actually needs is the claim, not
 * the page. A page-level citation cannot be checked later: the page may have
 * been rewritten around the sentence that was relied on. A claim-level citation
 * with a checksum can be checked in one comparison.
 */
export const GET: APIRoute = async () => {
	const corpus = await loadCorpus();
	const reliedOnBy = new Map(
		corpus.sources.map((source) => [source.id, citingPages(corpus, source.id)]),
	);
	return jsonResponse(claimIndex(corpus.sources, reliedOnBy));
};
