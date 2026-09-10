import type { APIRoute } from 'astro';
import { commons } from '../config/commons';

export const prerender = true;

/* A named Preview remains closed until the separate Commons release gate is
   complete. This is intentionally controlled by a deployment flag rather than
   by whether an origin happens to look plausible. */
const unlaunched = !commons.publicReady;

export const GET: APIRoute = () =>
	new Response(
		unlaunched
			? ['# Private Preview. Public indexing is disabled until Commons is ready.', 'User-agent: *', 'Disallow: /', ''].join('\n')
			: ['User-agent: *', 'Allow: /', '', `Sitemap: ${new URL('/sitemap-index.xml', commons.origin)}`, ''].join('\n'),
		{ headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
	);
