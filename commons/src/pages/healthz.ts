import type { APIRoute } from 'astro';
import { getMailer, getStore } from '../lib/runtime';

/**
 * Private operational liveness check for the gated Commons deployment.
 *
 * A healthy response means the configured store is reachable and production
 * mail configuration is present. It does not send mail, test DNS, or imply
 * that the moderation smoke test has passed. The body stays intentionally
 * boring so this route cannot become a data or configuration oracle.
 */
export const prerender = false;

const json = (status: number, body: { status: 'ok' | 'unavailable'; service: string }) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			'Cache-Control': 'no-store',
			'Content-Type': 'application/json; charset=utf-8',
		},
	});

export const GET: APIRoute = async () => {
	try {
		await getStore().checkLiveness();
		/* Construction is enough here: production refuses the console mailer. */
		getMailer();
		return json(200, { status: 'ok', service: 'birch-commons' });
	} catch {
		return json(503, { status: 'unavailable', service: 'birch-commons' });
	}
};
