// @ts-check
import { defineConfig } from 'astro/config';

/**
 * The Commons build.
 *
 * Deliberately smaller than the Record's config. No sitemap integration yet:
 * a sitemap advertises canonical URLs, the origin here is still a placeholder,
 * and advertising URLs on a host that does not resolve is worse than
 * advertising none. It goes in when the property is named.
 */
export default defineConfig({
	site: process.env.PUBLIC_COMMONS_ORIGIN || 'https://commons.example',
	trailingSlash: 'never',
	build: { format: 'directory' },
});
