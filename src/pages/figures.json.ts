import type { APIRoute } from 'astro';
import { loadCorpus } from '../lib/corpus';
import { figuresRecord, jsonResponse } from '../lib/machine';

export const prerender = true;

export const GET: APIRoute = async () => {
	const corpus = await loadCorpus();
	return jsonResponse(figuresRecord(corpus.figures));
};
