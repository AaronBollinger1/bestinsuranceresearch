import test from 'node:test';
import assert from 'node:assert/strict';
import { closedCommonsRequest } from '../src/lib/access.ts';

test('a closed Commons rejects sign-in, account, contribution, and moderation traffic', () => {
	for (const [path, method] of [
		['/sign-in', 'GET'],
		['/sign-in/verify', 'GET'],
		['/sign-out', 'POST'],
		['/account', 'GET'],
		['/account/verify', 'GET'],
		['/contribute', 'GET'],
		['/contribute/new', 'POST'],
		['/contribute/withdraw', 'POST'],
		['/moderate', 'GET'],
		['/moderate/posts', 'GET'],
		['/threads/new', 'GET'],
		['/threads/new', 'POST'],
		['/reports', 'POST'],
	]) {
		assert.equal(
			closedCommonsRequest(path, method, false),
			true,
			`${method} ${path} must be closed while Commons is not ready`,
		);
	}
});

test('a closed Commons still serves health, robots, and read-only GET pages', () => {
	assert.equal(closedCommonsRequest('/healthz', 'GET', false), false);
	assert.equal(closedCommonsRequest('/robots.txt', 'GET', false), false);
	assert.equal(closedCommonsRequest('/', 'GET', false), false);
	assert.equal(closedCommonsRequest('/threads/abc', 'GET', false), false);
	assert.equal(closedCommonsRequest('/reports/seepage-or-sudden-discharge', 'GET', false), false);
});

test('an open Commons does not use the closed-preview gate', () => {
	assert.equal(closedCommonsRequest('/sign-in', 'POST', true), false);
	assert.equal(closedCommonsRequest('/contribute/new', 'POST', true), false);
});
