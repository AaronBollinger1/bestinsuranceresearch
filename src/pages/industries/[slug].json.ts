import type { APIRoute, GetStaticPaths } from 'astro';
import { allIndustryHubs } from '../../lib/industry-hub';
import { ledgerFor, loadCorpus } from '../../lib/corpus';
import { industryRecord, jsonResponse } from '../../lib/machine';

export const prerender = true;

export const getStaticPaths = (async () => {
	const corpus = await loadCorpus();
	return allIndustryHubs(corpus)
		.filter((hub) => hub.hasSubstance)
		.map((hub) => ({ params: { slug: hub.id } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
	const corpus = await loadCorpus();
	const hub = allIndustryHubs(corpus).find((entry) => entry.id === params.slug && entry.hasSubstance);
	if (!hub) return new Response('Not found', { status: 404 });

	const sources = ledgerFor(
		hub.sourceIds,
		corpus.sourceById,
		`industry hub "${hub.id}"`,
	);
	return jsonResponse(industryRecord(hub, sources));
};
