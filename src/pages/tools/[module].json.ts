import type { APIRoute, GetStaticPaths } from 'astro';
import { idsOf, ledgerFor, loadCorpus } from '../../lib/corpus';
import { jsonResponse, moduleRecord, toolRecord } from '../../lib/machine';

export const prerender = true;

/*
 * Both kinds of thing under /tools get a companion: the ten advisory modules
 * and the three live worksheets. Their ids match their routes, so one dynamic
 * route covers both rather than the worksheets each needing a hand-written one -
 * which is how they came to have none at all.
 */
export const getStaticPaths = (async () => {
	const corpus = await loadCorpus();
	return [
		...corpus.liveModules.map((entry) => ({ params: { module: entry.id } })),
		...corpus.liveTools.map((entry) => ({ params: { module: entry.id } })),
	];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
	const corpus = await loadCorpus();

	const mod = corpus.liveModules.find((item) => item.id === params.module);
	if (mod) {
		/*
		 * A module has no top-level sourceIds. Its sources are the union of what
		 * its rules cite, which is how /tools/<module> resolves them too - the
		 * rule set is the citing thing, not the module wrapper.
		 */
		const ruleSourceIds = [...new Set(mod.data.rules.flatMap((rule) => idsOf(rule.sourceIds ?? [])))];
		const sources = ledgerFor(ruleSourceIds, corpus.sourceById, `module "${mod.id}"`);
		return jsonResponse(moduleRecord(mod, sources));
	}

	/* toolRecord has existed in machine.ts since the worksheets were built and
	   was never routed. This is the route it was written for. */
	const tool = corpus.liveTools.find((item) => item.id === params.module);
	if (tool) {
		const sources = ledgerFor(idsOf(tool.data.sourceIds), corpus.sourceById, `worksheet "${tool.id}"`);
		return jsonResponse(toolRecord(tool, sources));
	}

	return new Response('Not found', { status: 404 });
};
