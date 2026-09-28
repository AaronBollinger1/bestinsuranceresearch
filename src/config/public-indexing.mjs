/**
 * Effective public indexing.
 *
 * Requires both PUBLIC_INDEXING_OPEN exactly "true" and
 * PUBLIC_SITE_ENV exactly "production". Either one alone stays closed.
 * PUBLIC_COMMONS_READY does not open it.
 */
export function publicIndexingOpen(env = process.env) {
	return env.PUBLIC_INDEXING_OPEN === 'true' && env.PUBLIC_SITE_ENV === 'production';
}
