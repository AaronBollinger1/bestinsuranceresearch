import { defineMiddleware } from 'astro:middleware';
import { applyCommonsSecurityHeaders, closedCommonsRequest } from './lib/access';
import { commons } from './config/commons';

/**
 * Response headers, on every route.
 *
 * The Record sets these in vercel.json because it is a static deploy. The
 * Commons serves requests, so they belong here - and one of them is doing real
 * work rather than being hygiene.
 *
 * `form-action 'self'` is the one. The Record uses it to enforce a rule it
 * never wants to break: no page collects an application. Here the rule is
 * different - this origin has forms, and that is the point of it - but the
 * constraint that a form on this site can only ever submit to this site is
 * exactly as valuable, because the failure it prevents is a submitted account
 * of somebody's insurance problem going somewhere nobody chose.
 *
 * `default-src 'self'` with no script-src exception at all: there is no
 * JavaScript on this site yet, and the moment one is added this header is the
 * thing that will notice.
 */
export const onRequest = defineMiddleware(async (context, next) => {
	if (
		!context.isPrerendered &&
		closedCommonsRequest(context.url.pathname, context.request.method, commons.publicReady)
	) {
		return applyCommonsSecurityHeaders(
			new Response(
				'Birch Community is a private preview. Accounts, sign-in, contribution, and moderation are not open.',
				{
					status: 403,
					headers: {
						'Content-Type': 'text/plain; charset=utf-8',
						'Cache-Control': 'private, no-store',
					},
				},
			),
		);
	}

	const response = await next();
	applyCommonsSecurityHeaders(response);

	/* Nothing that depends on a session may be cached by anything in between. */
	if (!context.isPrerendered) {
		response.headers.set('Cache-Control', 'private, no-store');
	}

	return response;
});
