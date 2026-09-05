import type { APIRoute, GetStaticPaths } from 'astro';
import { idsOf, ledgerFor, loadCorpus } from '../../lib/corpus';
import { jsonResponse, questionRecord } from '../../lib/machine';

export const prerender = true;

export const getStaticPaths = (async () => {
	const corpus = await loadCorpus();
	return corpus.questions.map((entry) => ({ params: { slug: entry.id } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
	const corpus = await loadCorpus();
	const entry = corpus.questions.find((item) => item.id === params.slug);
	if (!entry) return new Response('Not found', { status: 404 });
	const sources = ledgerFor(
		idsOf(entry.data.sourceIds),
		corpus.sourceById,
		`question "${entry.id}"`,
	);
	return jsonResponse(questionRecord(entry, sources));
};
