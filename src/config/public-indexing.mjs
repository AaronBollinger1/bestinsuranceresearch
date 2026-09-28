/**
 * Owner gate for public indexing.
 *
 * Closed unless PUBLIC_INDEXING_OPEN is exactly "true".
 * PUBLIC_SITE_ENV and PUBLIC_COMMONS_READY do not open it.
 */
export function publicIndexingOpen(env = process.env) {
	return env.PUBLIC_INDEXING_OPEN === 'true';
}
