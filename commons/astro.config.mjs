// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

/**
 * The Commons build.
 *
 * Commons has a static-first build: public research-linked records and policy
 * pages remain cacheable artifacts, while the handful of pages that opt out
 * with `prerender = false` are request-time concerns. The Vercel adapter keeps
 * those routes on the supported Vercel runtime without turning every public
 * page into a function.
 *
 * The sitemap is emitted only when the explicit public-ready flag is true,
 * which is after the property has a real deployment and has passed its release
 * gates. It excludes everything
 * behind a session and everything that only exists for one person: sign-in, the
 * account page, the intake form and the moderation queue. A crawler finding a
 * moderation queue in a sitemap is a bad look even when it correctly 404s.
 */
const PRIVATE = [/\/sign-in/, /\/account/, /\/moderate/, /\/contribute\/(new|sent|withdraw)/, /\/threads\/new/, /\/healthz/];
const publicReady = process.env.PUBLIC_COMMONS_READY === 'true';
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
	site: process.env.PUBLIC_COMMONS_ORIGIN || 'https://commons.birch.insure',
	trailingSlash: 'never',
	build: { format: 'directory' },
	output: 'static',
	adapter: vercel(),
	integrations: [sitemap({ filter: (page) => publicReady && !PRIVATE.some((pattern) => pattern.test(page)) })],
});
