import type { APIRoute } from 'astro';
import { SESSION_COOKIE, sameOrigin, signOut } from '../lib/auth';
import { getStore, selfOrigin } from '../lib/runtime';

export const prerender = false;

/**
 * POST only.
 *
 * A GET sign-out is a link anybody can put on any page - or that a mail client
 * or link prefetcher can follow on the reader's behalf - to log somebody out.
 * It is a small harm, but it is a harm with no upside, and the origin check
 * costs one header read.
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	if (!sameOrigin(request, selfOrigin(request))) {
		return new Response('Bad request', { status: 400 });
	}

	await signOut(getStore(), cookies.get(SESSION_COOKIE)?.value);
	cookies.delete(SESSION_COOKIE, { path: '/' });
	return redirect('/', 303);
};
