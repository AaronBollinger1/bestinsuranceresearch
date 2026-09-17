/**
 * Request-time Commons gate.
 *
 * PUBLIC_COMMONS_READY=false is not only an indexing flag. Until the database,
 * mail, moderation, and smoke-test gates pass, sign-in, account, contribution,
 * moderation, and thread-create handlers must not accept traffic even if a
 * preview origin has secrets configured.
 */
export function closedCommonsRequest(pathname: string, method: string, publicReady: boolean): boolean {
	if (publicReady) return false;
	const path = pathname.replace(/\/+$/, '') || '/';
	if (path === '/healthz' || path === '/robots.txt' || path === '/llms.txt') return false;
	const prefixes = ['/sign-in', '/sign-out', '/account', '/contribute', '/moderate'];
	if (prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return true;
	if (path === '/threads/new') return true;
	const verb = method.toUpperCase();
	return verb !== 'GET' && verb !== 'HEAD' && verb !== 'OPTIONS';
}
