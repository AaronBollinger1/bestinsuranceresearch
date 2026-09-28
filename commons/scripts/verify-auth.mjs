/**
 * The sign-in flow, tested against a real store implementation.
 *
 *   npm run verify
 *
 * These are the assertions that make the auth layer reviewable. Everything they
 * check is a property of `src/lib/auth.ts` rather than of Postgres, which is
 * exactly why the store is an interface: the whole flow runs in memory, so
 * "does a spent link work twice" is a test rather than a hope.
 *
 * They also run against Postgres. With COMMONS_DATABASE_URL set, the store
 * conformance block at the bottom runs the same operations against a real
 * database, which is how the unexercised SQL in store-postgres.ts gets
 * confirmed. Without it, that block skips and says so.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/*
 * Imported straight from source with Node's type stripping, the same way the
 * Record's suite runs. No shim and no build step between the test and the code
 * it is testing - an auth suite that exercises a compiled copy is one that can
 * silently stop matching the source.
 */
import {
	MAX_TOKENS_PER_HOUR,
	SESSION_TTL_MS,
	TOKEN_TTL_MS,
	accountFromSession,
	looksLikeEmail,
	normaliseEmail,
	requestSignIn,
	sameOrigin,
	sessionCookieOptions,
	signOut,
	verifySignIn,
} from '../src/lib/auth.ts';
import { memoryStore } from '../src/lib/store-memory.ts';

const ORIGIN = 'https://commons.test';
const tokenOf = (url) => new URL(url).searchParams.get('token');

/* ------------------------------------------------------------------ */
/* The link                                                            */
/* ------------------------------------------------------------------ */

test('a sign-in link signs the person in, and creates the account on first use', async () => {
	const store = memoryStore();
	const request = await requestSignIn(store, 'Reader@Example.com', ORIGIN);
	assert.ok(request, 'no link was issued for a valid address');

	/* The address is normalised, so the same person is the same account
	   however they typed it. */
	assert.equal(request.email, 'reader@example.com');

	const verified = await verifySignIn(store, tokenOf(request.url));
	assert.ok(verified, 'a fresh link did not verify');
	assert.equal(verified.account.email, 'reader@example.com');
	assert.equal(verified.account.displayName, '', 'a new account should have no display name yet');

	const account = await accountFromSession(store, verified.sessionId);
	assert.equal(account?.email, 'reader@example.com', 'the session did not resolve to the account');
});

test('a link works exactly once', async () => {
	const store = memoryStore();
	const request = await requestSignIn(store, 'reader@example.com', ORIGIN);
	const token = tokenOf(request.url);

	assert.ok(await verifySignIn(store, token), 'first use should work');
	assert.equal(
		await verifySignIn(store, token),
		null,
		'a spent link worked twice. Email is forwarded, screenshotted and scanned; a replayable link is one anybody downstream of the inbox can use.',
	);
});

test('an expired link does not work, and is spent by being tried', async () => {
	const store = memoryStore();
	const t0 = Date.now();
	const request = await requestSignIn(store, 'reader@example.com', ORIGIN, t0);
	const token = tokenOf(request.url);

	const late = t0 + TOKEN_TTL_MS + 1;
	assert.equal(await verifySignIn(store, token, late), null, 'an expired link verified');

	/* And it is gone, not merely rejected: a link is spent by being followed,
	   whatever the outcome. Otherwise an expired token sits in the table
	   waiting for a clock skew or a manual expiry bump. */
	assert.equal(
		await verifySignIn(store, token, t0 + 1),
		null,
		'an expired link was still in the store and became usable again',
	);
});

test('a token that was never issued does not verify', async () => {
	const store = memoryStore();
	assert.equal(await verifySignIn(store, 'not-a-real-token'), null);
	assert.equal(await verifySignIn(store, ''), null);
});

test('the store is keyed by hash, so a raw token addresses nothing in it', async () => {
	/*
	 * The property that makes a database dump useless to whoever takes it. It is
	 * checked by address rather than by inspecting internals: if the store is
	 * keyed by the hash, then looking a record up by the raw value finds nothing,
	 * while the flow that hashes first still works.
	 */
	const store = memoryStore();
	const request = await requestSignIn(store, 'reader@example.com', ORIGIN);
	const token = tokenOf(request.url);

	assert.equal(
		await store.consumeSignInToken(token),
		null,
		'the raw token addresses a row, so the store is holding it in the clear',
	);
	/* And the hashed path still works, which proves the lookup above failed for
	   the right reason rather than because the token was already gone. */
	const verified = await verifySignIn(store, token);
	assert.ok(verified, 'the token was destroyed by the raw lookup');

	assert.equal(
		await store.getSession(verified.sessionId),
		null,
		'the raw session id addresses a row, so the cookie value is stored in the clear',
	);
	assert.ok(await accountFromSession(store, verified.sessionId), 'the hashed session lookup broke');
});

test('links are rate limited per address', async () => {
	const store = memoryStore();
	const now = Date.now();
	for (let i = 0; i < MAX_TOKENS_PER_HOUR; i += 1) {
		assert.ok(await requestSignIn(store, 'reader@example.com', ORIGIN, now), `request ${i + 1} should be allowed`);
	}
	assert.equal(
		await requestSignIn(store, 'reader@example.com', ORIGIN, now),
		null,
		'the form can be used to mail one address without limit',
	);

	/* A different address is unaffected, and the window rolls. */
	assert.ok(await requestSignIn(store, 'other@example.com', ORIGIN, now));
	assert.ok(await requestSignIn(store, 'reader@example.com', ORIGIN, now + 61 * 60 * 1000));
});

test('the rate limit counts links that were used, not just links outstanding', async () => {
	/*
	 * The bug this catches: counting rows in the token table resets the limit
	 * every time somebody follows a link, because following it deletes the row.
	 * The limit exists to stop the form mailing a stranger repeatedly, and a
	 * consumed link is still a message that was sent.
	 */
	const store = memoryStore();
	const now = Date.now();
	for (let i = 0; i < MAX_TOKENS_PER_HOUR; i += 1) {
		const request = await requestSignIn(store, 'reader@example.com', ORIGIN, now);
		await verifySignIn(store, tokenOf(request.url), now);
	}
	assert.equal(
		await requestSignIn(store, 'reader@example.com', ORIGIN, now),
		null,
		'signing in reset the rate limit',
	);
});

test('a malformed address is declined without a distinguishable response', async () => {
	const store = memoryStore();
	for (const bad of ['', 'nope', 'a@b', '@example.com', 'a b@example.com', `${'x'.repeat(250)}@example.com`]) {
		assert.equal(await requestSignIn(store, bad, ORIGIN), null, `${bad} was accepted`);
	}
	assert.ok(looksLikeEmail('reader@example.com'));
	assert.equal(normaliseEmail('  Reader@Example.COM '), 'reader@example.com');
});

/* ------------------------------------------------------------------ */
/* The session                                                         */
/* ------------------------------------------------------------------ */

test('a session expires, and is cleaned up when it does', async () => {
	const store = memoryStore();
	const t0 = Date.now();
	const request = await requestSignIn(store, 'reader@example.com', ORIGIN, t0);
	const verified = await verifySignIn(store, tokenOf(request.url), t0);

	assert.ok(await accountFromSession(store, verified.sessionId, t0 + 1000));
	assert.equal(
		await accountFromSession(store, verified.sessionId, t0 + SESSION_TTL_MS + 1),
		null,
		'an expired session still resolved',
	);
});

test('signing out ends the session immediately', async () => {
	const store = memoryStore();
	const request = await requestSignIn(store, 'reader@example.com', ORIGIN);
	const verified = await verifySignIn(store, tokenOf(request.url));

	await signOut(store, verified.sessionId);
	assert.equal(await accountFromSession(store, verified.sessionId), null, 'the session survived sign-out');
});

test('an absent or unknown cookie resolves to nobody', async () => {
	const store = memoryStore();
	assert.equal(await accountFromSession(store, undefined), null);
	assert.equal(await accountFromSession(store, ''), null);
	assert.equal(await accountFromSession(store, 'made-up'), null);
});

test('two sign-ins produce two independent sessions', async () => {
	/* Signing out on a phone must not sign the person out on a laptop. */
	const store = memoryStore();
	const a = await verifySignIn(store, tokenOf((await requestSignIn(store, 'reader@example.com', ORIGIN)).url));
	const b = await verifySignIn(store, tokenOf((await requestSignIn(store, 'reader@example.com', ORIGIN)).url));

	assert.notEqual(a.sessionId, b.sessionId);
	await signOut(store, a.sessionId);
	assert.equal(await accountFromSession(store, a.sessionId), null);
	assert.ok(await accountFromSession(store, b.sessionId), 'signing out of one device ended the other');
});

test('the session cookie is httpOnly, lax, and secure on https', () => {
	const secure = sessionCookieOptions('https://commons.test', 3600);
	assert.equal(secure.httpOnly, true, 'script can read the session cookie');
	assert.equal(secure.sameSite, 'lax');
	assert.equal(secure.secure, true, 'the session cookie is sent over plain http');
	assert.equal(secure.path, '/');

	/* Off only on http, which in practice means local development. Setting
	   Secure there makes the cookie silently not work and sends somebody
	   hunting for a bug in the token flow. */
	assert.equal(sessionCookieOptions('http://localhost:4321', 3600).secure, false);
});

/* ------------------------------------------------------------------ */
/* Cross-site                                                          */
/* ------------------------------------------------------------------ */

test('a state-changing request from another origin is refused', () => {
	const make = (origin) =>
		new Request('https://commons.test/sign-in', {
			method: 'POST',
			headers: origin ? { origin } : {},
		});

	assert.equal(sameOrigin(make('https://commons.test'), ORIGIN), true);
	assert.equal(sameOrigin(make('https://evil.test'), ORIGIN), false);
	assert.equal(sameOrigin(make('https://commons.test.evil.test'), ORIGIN), false);
	assert.equal(sameOrigin(make('null'), ORIGIN), false, 'a sandboxed frame posted successfully');

	/* No Origin header at all is refused. Every browser sends one on a POST, so
	   its absence means the request did not come from a page. */
	assert.equal(sameOrigin(make(null), ORIGIN), false);
});

/* ------------------------------------------------------------------ */
/* What may be stored                                                  */
/* ------------------------------------------------------------------ */

test('neither the schema nor the store has anywhere to put what is never collected', () => {
	/*
	 * COMMONS.md section 6. The only enforceable version of that promise is
	 * that the columns do not exist, so this reads the SQL and the interface
	 * rather than trusting the prose on /contribute.
	 */
	const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '').replace(/\/\/.*$/gm, '');
	const sql = strip(fs.readFileSync(path.join(ROOT, 'schema.sql'), 'utf8'));
	const iface = strip(fs.readFileSync(path.join(ROOT, 'src/lib/store.ts'), 'utf8'));

	for (const banned of [
		'password',
		'date_of_birth',
		'dateOfBirth',
		'ssn',
		'policy_number',
		'policyNumber',
		'claim_number',
		'claimNumber',
		'upload',
		'attachment',
		'file',
		'payment',
		'card',
		'health',
	]) {
		assert.ok(!new RegExp(banned, 'i').test(sql), `schema.sql defines "${banned}"`);
		assert.ok(!new RegExp(banned, 'i').test(iface), `the Store interface defines "${banned}"`);
	}
});

test('a licence is stored whole or not at all', () => {
	/* A licence number with no record of where it was checked is an unverified
	   claim, and the entire value of practitioner standing is that it was
	   checked against the regulator's own register. */
	const sql = fs.readFileSync(path.join(ROOT, 'schema.sql'), 'utf8');
	assert.match(sql, /license_is_whole_or_absent/, 'nothing stops a half-recorded licence');
	assert.match(sql, /license_verified_against/, 'the register a licence was checked against is not recorded');
});

/* ------------------------------------------------------------------ */
/* Store conformance, against Postgres when one is available           */
/* ------------------------------------------------------------------ */

test('the Postgres store behaves like the interface says', { skip: !process.env.COMMONS_DATABASE_URL }, async () => {
	/*
	 * Everything above runs in memory, so the SQL in store-postgres.ts is the
	 * one part of this layer that no test reaches. Run the suite with
	 * COMMONS_DATABASE_URL pointing at a scratch database to close that gap -
	 * it is the confirmation the writing session could not do.
	 */
	const pg = await import('pg');
	const { postgresStore } = await import('../src/lib/store-postgres.ts');
	const pool = new pg.default.Pool({ connectionString: process.env.COMMONS_DATABASE_URL });
	const store = postgresStore(pool);
	const email = `test-${Date.now()}@example.com`;

	try {
		const request = await requestSignIn(store, email, ORIGIN);
		assert.ok(request);
		const token = tokenOf(request.url);
		assert.ok(await verifySignIn(store, token), 'first use failed against Postgres');
		assert.equal(await verifySignIn(store, token), null, 'a link replayed against Postgres');
		assert.equal(await store.countRecentTokens(email, Date.now() - 3600_000), 1, 'the issue log was not written');
	} finally {
		await pool.query('delete from sessions where email = $1', [email]);
		await pool.query('delete from sign_in_issue_log where email = $1', [email]);
		await pool.query('delete from accounts where email = $1', [email]);
		await pool.end();
	}
});
