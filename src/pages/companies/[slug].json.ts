import type { APIRoute, GetStaticPaths } from 'astro';
import { idsOf, ledgerFor, loadCorpus } from '../../lib/corpus';
import { jsonResponse, companyRecord } from '../../lib/machine';

export const prerender = true;

export const getStaticPaths = (async () => {
	const corpus = await loadCorpus();
	return corpus.companies.map((entry) => ({ params: { slug: entry.id } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
	const corpus = await loadCorpus();
	const entry = corpus.companies.find((item) => item.id === params.slug);
	if (!entry) return new Response('Not found', { status: 404 });
	const sources = ledgerFor(
		idsOf(entry.data.sourceIds),
		corpus.sourceById,
		`organization "${entry.id}"`,
	);
	const relatedQuestions = entry.data.relatedQuestions
		.map((ref) => corpus.questionBySlug.get(ref.id))
		.filter((question): question is NonNullable<typeof question> => Boolean(question));
	const mentioning = corpus.questions.filter(
		(question) => question.data.companies.some((company) => company.id === entry.id) && !relatedQuestions.some((related) => related.id === question.id),
	);
	const allRelated = [...relatedQuestions, ...mentioning];
	const relatedCoverageIds = [...new Set(allRelated.flatMap((question) => question.data.coverages.map((coverage) => coverage.id)))];
	const relatedCoverages = relatedCoverageIds
		.map((id) => corpus.coverageBySlug.get(id))
		.filter((coverage): coverage is NonNullable<typeof coverage> => Boolean(coverage));
	return jsonResponse(companyRecord(entry, sources, { questions: allRelated, coverages: relatedCoverages }));
};
