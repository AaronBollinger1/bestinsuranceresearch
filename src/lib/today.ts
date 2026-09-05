/**
 * One build-time "today".
 *
 * Freshness and stale-source badges must be consistent across every page in a
 * single build, and reproducible in tests. PUBLIC_BUILD_DATE pins it; otherwise
 * the build date is used.
 */
const pinned = import.meta.env.PUBLIC_BUILD_DATE;

export const TODAY: string =
	typeof pinned === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(pinned)
		? pinned
		: new Date().toISOString().slice(0, 10);

export const BUILD_TIMESTAMP: string = `${TODAY}T00:00:00.000Z`;
