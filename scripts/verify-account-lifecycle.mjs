/**
 * BR-D2: preview-only accounts and private avatars. No mail and no public signup.
 *
 *   node --experimental-strip-types --test scripts/verify-account-lifecycle.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	ABUSE_LIMIT,
	PUBLIC_SIGNUP_OPEN,
	avatarFallback,
	completeRecovery,
	confirmVerification,
	createAccountBook,
	cropAvatar,
	deleteAccount,
	deleteAvatar,
	exportAccount,
	readSession,
	requestRecovery,
	requestSignup,
	roleLabel,
	setRole,
	signIn,
	uploadAvatar,
	verifyLicence,
} from '../src/lib/account-lifecycle.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOW = '2026-09-27T12:00:00.000Z';
const LATER = '2026-09-27T14:00:00.000Z';

function pngWithSecret() {
	const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	const ihdr = chunk('IHDR', [0, 0, 0, 2, 0, 0, 0, 2, 8, 2, 0, 0, 0]);
	const text = chunk('tEXt', [...'Comment\0secret-exif'].map((char) => char.charCodeAt(0)));
	const iend = chunk('IEND', []);
	return new Uint8Array([...signature, ...ihdr, ...text, ...iend]);
}

function jpegWithSecret() {
	const exif = [...'EXIF-SECRET'].map((char) => char.charCodeAt(0));
	const app1Length = 2 + exif.length;
	return new Uint8Array([
		0xff, 0xd8,
		0xff, 0xe1, app1Length >> 8, app1Length & 0xff, ...exif,
		0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x02, 0x00, 0x02, 0x01, 0x01, 0x11, 0x00,
		0xff, 0xd9,
	]);
}

function chunk(type, data) {
	const length = data.length;
	return [
		(length >>> 24) & 0xff, (length >>> 16) & 0xff, (length >>> 8) & 0xff, length & 0xff,
		...type.split('').map((char) => char.charCodeAt(0)),
		...data,
		0, 0, 0, 0,
	];
}

function openBook() {
	const book = createAccountBook();
	const signup = requestSignup(book, { email: 'Reader@Example.com', role: 'consumer', now: NOW, publicSignupOpen: true });
	assert.equal(signup.state, 'pending-verification');
	const account = book.accounts[0];
	assert.equal(confirmVerification(book, { accountId: account.id, token: account.verificationToken.id, now: NOW }).state, 'verified');
	assert.equal(signIn(book, { email: account.email, token: account.signInToken.id, now: NOW }).state, 'signed-in');
	return { book, account };
}

test('public signup stays closed and the module contacts nobody', () => {
	assert.equal(PUBLIC_SIGNUP_OPEN, false);
	const book = createAccountBook();
	const closed = requestSignup(book, { email: 'reader@example.com', role: 'consumer', now: NOW });
	assert.equal(closed.state, 'signup-closed');
	assert.equal(book.accounts.length, 0);
	const prior = process.env.PUBLIC_COMMONS_READY;
	process.env.PUBLIC_COMMONS_READY = 'true';
	try {
		assert.equal(requestSignup(book, { email: 'reader@example.com', role: 'consumer', now: NOW }).state, 'signup-closed');
	} finally {
		if (prior === undefined) delete process.env.PUBLIC_COMMONS_READY;
		else process.env.PUBLIC_COMMONS_READY = prior;
	}
	const source = fs.readFileSync(path.join(ROOT, 'src/lib/account-lifecycle.ts'), 'utf8');
	assert.ok(!/\bfetch\s*\(/.test(source));
	assert.ok(!/process\.env/.test(source));
	assert.equal(fs.existsSync(path.join(ROOT, 'src/pages/account')), false);
});

test('verification, sign-in, recovery, expiry, export, deletion, and abuse fail closed', () => {
	const book = createAccountBook();
	assert.equal(requestSignup(book, { email: 'not-an-email', role: 'consumer', now: NOW, publicSignupOpen: true }).state, 'invalid-email');
	const signup = requestSignup(book, { email: 'reader@example.com', role: 'consumer', now: NOW, publicSignupOpen: true });
	const account = book.accounts[0];
	assert.equal(signIn(book, { email: account.email, token: account.verificationToken.id, now: NOW }).state, 'sign-in-failed');
	assert.equal(confirmVerification(book, { accountId: account.id, token: 'wrong', now: NOW }).state, 'verification-expired');
	assert.equal(confirmVerification(book, { accountId: account.id, token: account.verificationToken.id, now: LATER }).state, 'verification-expired');
	account.verificationToken.expiresAt = '2026-09-27T12:30:00.000Z';
	assert.equal(confirmVerification(book, { accountId: account.id, token: account.verificationToken.id, now: NOW }).state, 'verified');
	assert.equal(confirmVerification(book, { accountId: account.id, token: account.verificationToken.id, now: NOW }).state, 'verification-reused');
	assert.equal(signIn(book, { email: account.email, token: account.verificationToken.id, now: NOW }).state, 'sign-in-failed');
	assert.equal(signIn(book, { email: account.email, token: account.signInToken.id, now: NOW }).state, 'signed-in');
	assert.equal(readSession(book, { accountId: account.id, now: LATER }).state, 'session-expired');

	const unknown = requestRecovery(book, { email: 'missing@example.com', now: NOW });
	const known = requestRecovery(book, { email: account.email, now: NOW });
	assert.equal(unknown.publicMessage, known.publicMessage);
	assert.equal(unknown.state, 'recovery-requested');
	assert.equal(completeRecovery(book, { email: account.email, token: 'nope', now: NOW }).state, 'recovery-failed');
	assert.equal(completeRecovery(book, { email: account.email, token: account.recoveryToken.id, now: NOW }).state, 'signed-in');

	assert.equal(exportAccount(book, { accountId: account.id, actorId: 'someone-else' }).state, 'export-forbidden');
	const exported = exportAccount(book, { accountId: account.id, actorId: account.id });
	assert.equal(exported.ok, true);
	assert.equal(exported.body.email, 'reader@example.com');
	assert.equal(deleteAccount(book, { accountId: account.id, actorId: 'someone-else' }).state, 'permission-denied');
	assert.equal(deleteAccount(book, { accountId: account.id, actorId: account.id, now: NOW }).state, 'deleted');
	assert.equal(exportAccount(book, { accountId: account.id, actorId: account.id }).state, 'export-forbidden');
	assert.equal(deleteAccount(book, { accountId: 'missing', actorId: 'missing', now: NOW }).state, 'delete-unknown');

	const abuse = createAccountBook();
	requestSignup(abuse, { email: 'reader@example.com', role: 'consumer', now: NOW, publicSignupOpen: true });
	const target = abuse.accounts[0];
	confirmVerification(abuse, { accountId: target.id, token: target.verificationToken.id, now: NOW });
	for (let attempt = 0; attempt < ABUSE_LIMIT - 1; attempt += 1) {
		assert.equal(signIn(abuse, { email: target.email, token: 'wrong', now: NOW }).state, 'sign-in-failed');
	}
	assert.equal(signIn(abuse, { email: target.email, token: 'wrong', now: NOW }).state, 'rate-limited');
	assert.equal(signup.ok, true);
});

test('a verification secret cannot sign in once it is expired or replayed', () => {
	const book = createAccountBook();
	requestSignup(book, { email: 'reader@example.com', role: 'consumer', now: NOW, publicSignupOpen: true });
	const account = book.accounts[0];
	assert.equal(confirmVerification(book, { accountId: account.id, token: account.verificationToken.id, now: NOW }).state, 'verified');
	assert.equal(signIn(book, { email: account.email, token: account.verificationToken.id, now: LATER }).state, 'sign-in-failed');
	assert.equal(signIn(book, { email: account.email, token: account.signInToken.id, now: LATER }).state, 'sign-in-expired');
	assert.equal(account.session, null);
	assert.equal(signIn(book, { email: account.email, token: account.signInToken.id, now: NOW }).state, 'signed-in');
	assert.equal(signIn(book, { email: account.email, token: account.signInToken.id, now: NOW }).state, 'sign-in-reused');
});

test('professional roles do not imply a licence until a reviewer verifies one', () => {
	const { book, account } = openBook();
	assert.equal(roleLabel('insurance-professional', false), 'Insurance professional (licence not verified)');
	assert.equal(roleLabel('financial-professional', false), 'Financial professional (licence not verified)');
	const changed = setRole(book, { accountId: account.id, actorId: account.id, role: 'insurance-professional' });
	assert.equal(changed.publicMessage, 'Insurance professional (licence not verified)');
	assert.equal(book.accounts[0].licenseVerified, false);
	assert.equal(verifyLicence(book, { accountId: account.id, reviewerId: 'reader' }).state, 'permission-denied');
	assert.equal(verifyLicence(book, { accountId: account.id, reviewerId: 'fixture-reviewer-1' }).state, 'licence-verified');
	assert.equal(roleLabel(book.accounts[0].role, book.accounts[0].licenseVerified), 'Insurance professional (licence verified)');
	setRole(book, { accountId: account.id, actorId: account.id, role: 'financial-professional' });
	assert.equal(book.accounts[0].licenseVerified, false);
});

test('avatar upload checks type and size, strips metadata, crops, deletes, and stays private', () => {
	const { book, account } = openBook();
	assert.equal(avatarFallback(book, account.id).kind, 'fallback');
	assert.equal(uploadAvatar(book, { accountId: account.id, actorId: account.id, bytes: new Uint8Array(512 * 1024 + 1) }).state, 'upload-size');
	assert.equal(uploadAvatar(book, { accountId: account.id, actorId: account.id, bytes: new Uint8Array([0x3c, 0x73, 0x76, 0x67]) }).state, 'upload-type');
	const png = pngWithSecret();
	assert.equal(uploadAvatar(book, { accountId: account.id, actorId: account.id, bytes: png }).state, 'upload-metadata-stripped');
	assert.ok(!Buffer.from(book.accounts[0].avatar.bytes).includes(Buffer.from('secret-exif')));
	assert.equal(cropAvatar(book, { accountId: account.id, actorId: account.id, crop: { x: 0, y: 0, width: 3, height: 3 } }).state, 'upload-crop');
	assert.equal(cropAvatar(book, { accountId: account.id, actorId: account.id, crop: { x: 0, y: 0, width: 1, height: 1 } }).state, 'avatar-cropped');
	const exported = exportAccount(book, { accountId: account.id, actorId: account.id });
	assert.equal(exported.body.avatar.publicUrl, null);
	assert.ok(!JSON.stringify(exported.body).includes('secret-exif'));
	assert.equal(deleteAvatar(book, { accountId: account.id, actorId: account.id }).state, 'avatar-deleted');
	assert.equal(book.accounts[0].avatar, null);
	assert.equal(uploadAvatar(book, { accountId: account.id, actorId: account.id, bytes: jpegWithSecret() }).state, 'upload-metadata-stripped');
	assert.ok(!Buffer.from(book.accounts[0].avatar.bytes).includes(Buffer.from('EXIF-SECRET')));
});
