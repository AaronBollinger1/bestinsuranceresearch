import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Account, Store } from './store';

/**
 * Magic-link sign-in.
 *
 * No passwords, ever. `COMMONS.md` section 6 collects an email address to sign
 * in with and nothing else, and a password is a second secret to store, leak,
 * reset and reuse across sites for no gain here - the email round trip is the
 * verification either way.
 *
 * The rules below are the ones that make this safe, and each one is asserted in
 * `scripts/verify-auth.mjs` rather than trusted to this comment.
 *
 * 1. **Only hashes are stored.** The token in the emailed link and the session
 *    id in the cookie are random 32-byte values; the store holds SHA-256 of
 *    each. A dump of the database therefore does not let anyone sign in as
 *    anybody. Hashing is plain SHA-256 rather than a password KDF on purpose:
 *    these are high-entropy random values, not human-chosen secrets, so there
 *    is nothing to brute force and a slow hash would only add latency.
 *
 * 2. **A link is single use and short lived.** Fifteen minutes, and spent the
 *    moment it is followed - including when it turns out to be expired. Email
 *    links get forwarded, screenshotted, and followed by scanners; a link that
 *    still works the second time is a link anyone downstream of the inbox can
 *    use.
 *
 * 3. **Sign-in never reveals whether an address has an account.** The response
 *    is identical either way. Otherwise the form is an oracle: submit an
 *    address, learn whether that person contributes here. On a site about
 *    people's insurance problems that is a real disclosure, not a theoretical
 *    one.
 *
 * 4. **Requests are rate limited per address**, so the form cannot be used to
 *    send someone a stream of mail.
 *
 * 5. **State-changing requests check the Origin header**, and the session
 *    cookie is SameSite=Lax, HttpOnly and Secure. Two independent defences
 *    against a cross-site POST.
 */

/** Fifteen minutes. Long enough to switch to a mail client, short enough to matter. */
export const TOKEN_TTL_MS = 15 * 60 * 1000;
/** Thirty days. A research site is not a bank; the cost of re-signing-in is mail. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Links per address per hour. */
export const MAX_TOKENS_PER_HOUR = 5;

export const SESSION_COOKIE = 'commons_session';

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

/** 32 random bytes, base64url. 256 bits of entropy in a URL-safe string. */
const secret = () => randomBytes(32).toString('base64url');

/**
 * Addresses are compared lower-cased and trimmed so the same person is the same
 * account however they typed it. Nothing else is normalised: stripping dots or
 * plus-addressing would silently merge addresses that their owner considers
 * distinct, and several providers treat them as distinct too.
 */
export function normaliseEmail(input: string): string {
	return input.trim().toLowerCase();
}

/**
 * Deliberately permissive. The only test that matters is whether the message
 * arrives, and a clever regex mostly rejects valid addresses belonging to
 * people who then cannot sign in.
 */
export function looksLikeEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export interface SignInRequest {
	/** The link to email. Never logged, never returned to the browser. */
	url: string;
	email: string;
}

/**
 * Issue a sign-in link, or decline quietly.
 *
 * Returns null when rate limited. The caller must render the same page either
 * way - see rule 3. That is why this returns null rather than throwing: a
 * thrown error invites a distinguishable response.
 */
export async function requestSignIn(
	store: Store,
	rawEmail: string,
	origin: string,
	now = Date.now(),
): Promise<SignInRequest | null> {
	const email = normaliseEmail(rawEmail);
	if (!looksLikeEmail(email)) return null;

	const recent = await store.countRecentTokens(email, now - 60 * 60 * 1000);
	if (recent >= MAX_TOKENS_PER_HOUR) return null;

	const token = secret();
	await store.createSignInToken({
		tokenHash: sha256(token),
		email,
		expiresAt: now + TOKEN_TTL_MS,
	});

	const url = new URL('/sign-in/verify', origin);
	url.searchParams.set('token', token);
	return { url: url.toString(), email };
}

export interface VerifiedSession {
	account: Account;
	/** The raw cookie value. Set once, never stored. */
	sessionId: string;
	expiresAt: number;
}

/**
 * Spend a link and open a session.
 *
 * The account is created here on first use. There is no separate signup step,
 * because a separate signup step is only meaningful when there is a password to
 * choose, and there is not.
 */
export async function verifySignIn(
	store: Store,
	token: string,
	now = Date.now(),
): Promise<VerifiedSession | null> {
	if (!token) return null;

	const record = await store.consumeSignInToken(sha256(token));
	if (!record) return null;
	if (record.expiresAt <= now) return null;

	const account = await store.upsertAccount(record.email);
	const sessionId = secret();
	const expiresAt = now + SESSION_TTL_MS;
	await store.createSession({ idHash: sha256(sessionId), email: record.email, expiresAt });

	return { account, sessionId, expiresAt };
}

/** Resolve a cookie to an account, or null. Expired sessions are cleaned up. */
export async function accountFromSession(
	store: Store,
	sessionId: string | undefined,
	now = Date.now(),
): Promise<Account | null> {
	if (!sessionId) return null;
	const idHash = sha256(sessionId);
	const session = await store.getSession(idHash);
	if (!session) return null;
	if (session.expiresAt <= now) {
		await store.deleteSession(idHash);
		return null;
	}
	return store.getAccount(session.email);
}

export async function signOut(store: Store, sessionId: string | undefined): Promise<void> {
	if (!sessionId) return;
	await store.deleteSession(sha256(sessionId));
}

/**
 * Cookie attributes, in one place so no route can set a weaker set.
 *
 * `secure` is off only when the origin is plain http, which in practice means
 * local development. Setting Secure on http would make the cookie silently not
 * work and send somebody hunting for a bug in the token flow.
 */
export function sessionCookieOptions(origin: string, maxAgeSeconds: number) {
	return {
		httpOnly: true,
		secure: origin.startsWith('https://'),
		sameSite: 'lax' as const,
		path: '/',
		maxAge: maxAgeSeconds,
	};
}

/**
 * Origin check for state-changing requests.
 *
 * SameSite=Lax already blocks a cross-site POST in every browser that honours
 * it. This is the second, independent defence, and it is the one that does not
 * depend on the browser getting it right. A request with no Origin header at
 * all is rejected: every browser sends one on a POST, so its absence means the
 * request did not come from a page.
 */
export function sameOrigin(request: Request, expected: string): boolean {
	const origin = request.headers.get('origin');
	if (!origin) return false;
	try {
		return new URL(origin).origin === new URL(expected).origin;
	} catch {
		return false;
	}
}

/**
 * Constant-time comparison, for anywhere a caller-supplied value is checked
 * against a stored one directly rather than by hash lookup.
 */
export function safeEqual(a: string, b: string): boolean {
	const left = Buffer.from(a, 'utf8');
	const right = Buffer.from(b, 'utf8');
	if (left.length !== right.length) return false;
	return timingSafeEqual(left, right);
}

export { sha256 };
