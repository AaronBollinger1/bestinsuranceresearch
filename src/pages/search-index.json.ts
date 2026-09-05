import type { APIRoute } from 'astro';
import { buildSearchIndex, loadCorpus } from '../lib/corpus';
import { siteConfig } from '../config/site';
import { TODAY } from '../lib/today';

export const prerender = true;

/**
 * The retrieval index, published as a static file.
 *
 * The /ask page fetches this once and runs every lookup locally, which is why a
 * visitor's question never leaves their device and never appears in a URL, a
 * server log, or an analytics payload.
 */
export const GET: APIRoute = async () => {
	const corpus = await loadCorpus();
	const index = buildSearchIndex(corpus);
	return new Response(
		`${JSON.stringify({
			$schema: `${siteConfig.origin}/llms-full.txt`,
			recordType: 'retrieval-index',
			contentVersion: siteConfig.contentVersion,
			generatedFor: TODAY,
			notice:
				'Deterministic lexical index over published page text. Chunked by claim and section, with source ids attached. No model, no embeddings, no query logging.',
			...index,
		})}\n`,
		{
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'Cache-Control': 'public, max-age=600',
			},
		},
	);
};
