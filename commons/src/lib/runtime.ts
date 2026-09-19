import pg from 'pg';
import { mailerFromEnv, type Mailer } from './mailer';
import { memoryStore } from './store-memory';
import { postgresStore } from './store-postgres';
import type { Store } from './store';

/**
 * Choosing a store and a mailer once, at first use.
 *
 * With `COMMONS_DATABASE_URL` set, Postgres. Without it, the in-memory store -
 * which means the whole site runs locally, sign-in included, with nothing
 * installed and nothing to provision. That matters more than it sounds: an
 * auth flow you cannot run is an auth flow nobody reviews.
 *
 * In production the absence of a database is a hard failure rather than a
 * fallback. An in-memory store on a serverless platform loses every session on
 * every cold start and, worse, gives each instance its own idea of who is
 * signed in. Failing loudly at boot is the only sane behaviour.
 */

let store: Store | null = null;
let mailer: Mailer | null = null;

const isProduction = () => process.env.NODE_ENV === 'production' || process.env.COMMONS_ENV === 'production';

export function getStore(): Store {
	if (store) return store;

	const url = process.env.COMMONS_DATABASE_URL;
	if (url) {
		const pool = new pg.Pool({
			connectionString: url,
			/* Neon terminates TLS at the pooler and does not present a cert the
			   default CA set validates for the pooler host. This is their
			   documented setting, not a shortcut around a certificate problem. */
			ssl: url.includes('localhost') ? false : { rejectUnauthorized: true },
			max: 5,
		});
		store = postgresStore(pool);
		return store;
	}

	if (isProduction()) {
		throw new Error(
			'COMMONS_DATABASE_URL is required in production. An in-memory store would hand each instance its own idea of who is signed in.',
		);
	}

	store = memoryStore();
	return store;
}

export function getMailer(): Mailer {
	if (mailer) return mailer;
	mailer = mailerFromEnv(process.env, isProduction());
	return mailer;
}

/** The origin this deployment answers on, used to build links and check Origin. */
export function selfOrigin(request: Request): string {
	return new URL(request.url).origin;
}
