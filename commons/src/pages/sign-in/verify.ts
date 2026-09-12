import type { APIRoute } from 'astro';
import { SESSION_COOKIE, sessionCookieOptions, verifySignIn } from '../../lib/auth';
import { getStore, selfOrigin } from '../../lib/runtime';

export const prerender = false;

/**
 * Spend the link and open the session.
 *
 * A GET, because it is reached by clicking a link in an email and nothing else
 * can be. That is the one place a GET is allowed to change state on this site,
 * and the mitigations are that the token is single use, short lived, and
 * unguessable at 256 bits.
 *
 * The redirect afterwards is not cosmetic. It gets the token out of the address
 * bar, out of the history entry the reader would otherwise share or bookmark,
 * and out of the Referer header of anything the next page loads. The token is
 * already spent by then, so this is belt and braces - but a spent token in a
 * shared screenshot still tells somebody an address signed in.
 */
export const GET: APIRoute = async ({ request, cookies, redirect }) => {
	const store = getStore();
	const token = new URL(request.url).searchParams.get('token') ?? '';

	const verified = await verifySignIn(store, token);
	if (!verified) {
		/*
		 * One message for every failure: no such token, already used, expired,
		 * malformed. Distinguishing them tells whoever is holding a link they
		 * should not have which of those it is.
		 */
		return redirect('/sign-in/expired', 303);
	}

	cookies.set(
		SESSION_COOKIE,
		verified.sessionId,
		sessionCookieOptions(selfOrigin(request), Math.floor((verified.expiresAt - Date.now()) / 1000)),
	);

	/* Housekeeping on a natural, infrequent event rather than on a timer. */
	await store.purgeExpired(Date.now());

	/* A new account has no display name yet, and that is the first thing it
	   needs before the person can contribute anything. */
	return redirect(verified.account.displayName ? '/account' : '/account?welcome=1', 303);
};
