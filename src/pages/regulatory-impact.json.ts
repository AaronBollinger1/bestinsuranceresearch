import type { APIRoute } from 'astro';
import { jsonResponse } from '../lib/machine';
import { presentRegulatoryImpact } from '../lib/regulatory-impact';

export const prerender = true;

/** Machine companion for /regulatory-impact. The same fixture queue, still unpublished. */
export const GET: APIRoute = () => jsonResponse(presentRegulatoryImpact());
