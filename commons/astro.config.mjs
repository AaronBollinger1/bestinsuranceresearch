// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

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
 * The sitemap went in when the property was named, which is when it stopped
 * being a list of URLs on a host that does not resolve. It excludes everything
 * behind a session and everything that only exists for one person: sign-in, the
 * account page, the intake form and the moderation queue. A crawler finding a
 * moderation queue in a sitemap is a bad look even when it correctly 404s.
 */
const PRIVATE = [/\/sign-in/, /\/account/, /\/moderate/, /\/contribute\/(new|sent|withdraw)/];
export default defineConfig({
	/*
	 * Kept in step with `origin` in src/config/commons.ts by an assertion rather
	 * than by being computed - the same treatment the Record gives its phone
	 * number, and for the same reason: an invariant that is checked survives a
	 * careless edit, one that is computed hides it.
	 *
	 * They disagreed the moment the property was named. robots.txt reads the
	 * config and said birch.insure; the sitemap reads this and still said
	 * commons.example, so the launch build advertised a sitemap of URLs on a host
	 * that does not exist. Nothing failed, because nothing compared them.
	 */
	site: process.env.PUBLIC_COMMONS_ORIGIN || 'https://birch.insure',
	trailingSlash: 'never',
	build: { format: 'directory' },
	output: 'static',
	adapter: node({ mode: 'standalone' }),
	integrations: [sitemap({ filter: (page) => !PRIVATE.some((pattern) => pattern.test(page)) })],
});
