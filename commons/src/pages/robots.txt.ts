import type { APIRoute } from 'astro';
import { commons } from '../config/commons';

export const prerender = true;

/*
 * Closed while the property is unnamed. The origin is a placeholder, so every
 * URL a crawler could take from here points at a host that does not resolve.
 * Opening this is part of naming the property.
 */
const unlaunched = commons.origin.includes('example');

export const GET: APIRoute = () =>
	new Response(
		unlaunched
			? ['# Not launched. The origin is a placeholder.', 'User-agent: *', 'Disallow: /', ''].join('\n')
			: ['User-agent: *', 'Allow: /', '', `Sitemap: ${new URL('/sitemap-index.xml', commons.origin)}`, ''].join('\n'),
		{ headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
	);
