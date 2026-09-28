import type { APIRoute } from 'astro';
import { isPreview, siteConfig } from '../config/site';

export const prerender = true;

/**
 * Preview blocks everything. Production serves the read-only estate and still
 * blocks crawlers until PUBLIC_INDEXING_OPEN is exactly true. That gate is
 * not PUBLIC_SITE_ENV and not PUBLIC_COMMONS_READY.
 */
export const GET: APIRoute = () => {
	const indexingClosed = isPreview || siteConfig.indexingOpen !== true;
	const body = indexingClosed
		? ['User-agent: *', 'Disallow: /', '', '# Indexing is closed. Nothing here is offered to crawlers.', ''].join('\n')
		: [
				'User-agent: *',
				'Allow: /',
				'',
				'# Named AI and answer crawlers are welcome. Attribution and a link to the',
				'# canonical URL are the only thing asked in return. See /llms.txt.',
				'User-agent: GPTBot',
				'Allow: /',
				'',
				'User-agent: OAI-SearchBot',
				'Allow: /',
				'',
				'User-agent: ChatGPT-User',
				'Allow: /',
				'',
				'User-agent: ClaudeBot',
				'Allow: /',
				'',
				'User-agent: Claude-User',
				'Allow: /',
				'',
				'User-agent: PerplexityBot',
				'Allow: /',
				'',
				'User-agent: Google-Extended',
				'Allow: /',
				'',
				'User-agent: Applebot-Extended',
				'Allow: /',
				'',
				`Sitemap: ${siteConfig.origin}/sitemap-index.xml`,
				'',
			].join('\n');

	return new Response(body, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
	});
};
