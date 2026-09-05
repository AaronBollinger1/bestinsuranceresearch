import type { APIRoute, GetStaticPaths } from 'astro';
import { citingPages, loadCorpus } from '../../lib/corpus';
import { jsonResponse, sourceEntityRecord } from '../../lib/machine';

export const prerender = true;

export const getStaticPaths = (async () => {
	const corpus = await loadCorpus();
	return corpus.sources.map((entry) => ({ params: { slug: entry.id } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
	const corpus = await loadCorpus();
	const entry = corpus.sources.find((item) => item.id === params.slug);
	if (!entry) return new Response('Not found', { status: 404 });
	return jsonResponse(sourceEntityRecord(entry, citingPages(corpus, entry.id)));
};
