import type { APIRoute } from 'astro';
import { SESSION_COOKIE, accountFromSession, sameOrigin } from '../../lib/auth';
import { getStore, selfOrigin } from '../../lib/runtime';
import { WITHDRAWABLE_IMMEDIATELY } from '../../lib/store';

export const prerender = false;

/**
 * A contributor taking their own account back.
 *
 * The Commons promises this on four pages - "at any time, before or after it
 * publishes, for any reason or none" - and until now promised it with nothing
 * behind it. The "or none" is the part that shapes this route: it asks for no
 * reason, offers no textarea, and has no confirmation step that argues with the
 * person. Withdrawal is theirs, not a request to be evaluated.
 *
 * Two paths, because a published report is a file in the repository rather than
 * a row in a database:
 *
 *  - Unpublished, so nobody has read it and nothing is live: withdrawn on the
 *    spot.
 *  - Published: recorded as a request, which puts it in the moderator's queue
 *    with the filename to edit. The report stays up until they do, and the
 *    contributor is told that plainly rather than being shown a success message
 *    that is not yet true.
 *
 * A declined submission cannot be withdrawn, because there is nothing to
 * withdraw - and letting it through would tell somebody their decline had been
 * "undone" when nothing changed.
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	if (!sameOrigin(request, selfOrigin(request))) {
		return new Response('Bad request', { status: 400 });
	}

	const store = getStore();
	const account = await accountFromSession(store, cookies.get(SESSION_COOKIE)?.value);
	if (!account) return redirect('/sign-in', 303);

	const form = await request.formData();
	const id = String(form.get('id') ?? '');
	const submission = await store.getSubmission(id);

	/*
	 * Not found rather than forbidden when it belongs to somebody else. The two
	 * are indistinguishable from outside, which is the point: otherwise this
	 * endpoint answers "does this id exist" for anybody who can guess one.
	 */
	if (!submission || submission.email !== account.email) {
		return new Response('Not found', { status: 404 });
	}

	const now = new Date().toISOString();

	if (WITHDRAWABLE_IMMEDIATELY.includes(submission.state)) {
		await store.withdrawSubmission(id, 'withdrawn', now);
		return redirect('/account?withdrawn=1', 303);
	}

	if (submission.state === 'published') {
		await store.withdrawSubmission(id, 'withdrawal-requested', now);
		return redirect('/account?withdrawal-requested=1', 303);
	}

	/* Already withdrawn, already requested, or declined. Nothing to do, and
	   saying so beats pretending something happened. */
	return redirect('/account?withdrawal-noop=1', 303);
};
