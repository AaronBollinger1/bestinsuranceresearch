import { defineMiddleware } from 'astro:middleware';

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
	const response = await next();

	response.headers.set(
		'Content-Security-Policy',
		[
			"default-src 'self'",
			"base-uri 'self'",
			"object-src 'none'",
			"frame-ancestors 'none'",
			"form-action 'self'",
			"img-src 'self' data:",
			"style-src 'self' 'unsafe-inline'",
			"font-src 'self'",
			"connect-src 'self'",
		].join('; '),
	);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

	/* Nothing that depends on a session may be cached by anything in between. */
	if (!context.isPrerendered) {
		response.headers.set('Cache-Control', 'private, no-store');
	}

	return response;
});
