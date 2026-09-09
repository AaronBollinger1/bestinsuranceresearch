// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

/**
 * The Commons build.
 *
 * `output: 'static'` with an adapter, which is the important part: every page
 * stays prerendered except the handful that opt out with `prerender = false`.
 * Only sign-in, verify, sign-out and the account page are server-rendered. A
 * report, the standards, the moderation policy and llms.txt are files, and they
 * should be - they do not depend on who is reading.
 *
 * The node adapter rather than the Vercel one, deliberately: it means the whole
 * thing boots with `node dist/server/entry.mjs` and the sign-in flow can be
 * exercised end to end without deploying. Swapping to @astrojs/vercel for
 * deployment is a one-line change and nothing above the adapter cares.
 *
 * No sitemap yet. A sitemap advertises canonical URLs, the origin is still a
 * placeholder, and advertising URLs on a host that does not resolve is worse
 * than advertising none. It goes in when the property is named.
 */
export default defineConfig({
	site: process.env.PUBLIC_COMMONS_ORIGIN || 'https://commons.example',
	trailingSlash: 'never',
	build: { format: 'directory' },
	output: 'static',
	adapter: node({ mode: 'standalone' }),
});
