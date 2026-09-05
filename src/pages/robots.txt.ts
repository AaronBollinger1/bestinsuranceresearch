import type { APIRoute } from 'astro';
import { isPreview, siteConfig } from '../config/site';

export const prerender = true;

/**
 * Preview blocks everything. Production allows general crawling and named AI
 * crawlers, because the whole point of the library is to be quotable with
 * attribution, and points them at the machine-readable entry files.
 */
export const GET: APIRoute = () => {
	const body = isPreview
		? ['User-agent: *', 'Disallow: /', '', '# Preview environment. Nothing here is indexable.', ''].join('\n')
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
