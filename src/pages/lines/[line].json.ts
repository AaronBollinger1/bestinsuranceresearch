import type { APIRoute, GetStaticPaths } from 'astro';
import { loadCorpus } from '../../lib/corpus';
import { allLineHubs } from '../../lib/line-hub';
import { jsonResponse, lineRecord } from '../../lib/machine';

export const prerender = true;

/* Only lines with substance get a page, so only those get a companion. A
   companion for a line the library holds nothing on would be a record whose
   entire content is zeroes. */
export const getStaticPaths = (async () => {
	const corpus = await loadCorpus();
	return allLineHubs(corpus)
		.filter((hub) => hub.hasSubstance)
		.map((hub) => ({ params: { line: hub.line } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
	const corpus = await loadCorpus();
	const hub = allLineHubs(corpus).find((item) => item.line === params.line);
	if (!hub) return new Response('Not found', { status: 404 });
	return jsonResponse(lineRecord(hub));
};
