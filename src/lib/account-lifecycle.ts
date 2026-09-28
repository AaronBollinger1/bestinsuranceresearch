/**
 * Preview-only account lifecycle (BR-D2).
 *
 * No mail is sent, no password is stored, and public signup stays closed
 * unless a caller passes publicSignupOpen. Choosing a professional role
 * does not verify a licence. Avatar bytes stay off any public projection.
 */
export const PUBLIC_SIGNUP_OPEN = false;
export const SESSION_MS = 60 * 60 * 1000;
export const TOKEN_MS = 15 * 60 * 1000;
export const MAX_AVATAR_BYTES = 512 * 1024;
export const ABUSE_LIMIT = 5;

export const ACCOUNT_ROLES = ['consumer', 'insurance-professional', 'financial-professional'] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export interface AvatarMedia {
	bytes: Uint8Array;
	mime: 'image/png' | 'image/jpeg' | 'image/webp';
	width: number;
	height: number;
	crop: { x: number; y: number; width: number; height: number } | null;
}

export interface AccountRecord {
	id: string;
	email: string;
	role: AccountRole;
	licenseVerified: boolean;
	verifiedAt: string | null;
	deletedAt: string | null;
	session: { id: string; expiresAt: string } | null;
	verificationToken: { id: string; expiresAt: string; used: boolean } | null;
	/** Short-lived one-time fixture credential. The verification secret is not reused. */
	signInToken: { id: string; expiresAt: string; used: boolean } | null;
	recoveryToken: { id: string; expiresAt: string; used: boolean } | null;
	avatar: AvatarMedia | null;
	failures: number;
}

export interface AccountBook {
	accounts: AccountRecord[];
	next: number;
}

export interface AccountResult {
	ok: boolean;
	state: string;
	accountId?: string;
	publicMessage: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createAccountBook(): AccountBook {
	return { accounts: [], next: 1 };
}

export function roleLabel(role: AccountRole, licenseVerified: boolean): string {
	if (role === 'consumer') return 'Consumer';
	const title = role === 'insurance-professional' ? 'Insurance professional' : 'Financial professional';
	return licenseVerified ? `${title} (licence verified)` : `${title} (licence not verified)`;
}

function fail(state: string, publicMessage: string): AccountResult {
	return { ok: false, state, publicMessage };
}

function findEmail(book: AccountBook, email: string): AccountRecord | undefined {
	const key = email.trim().toLowerCase();
	return book.accounts.find((account) => account.email === key && !account.deletedAt);
}

export function requestSignup(book: AccountBook, input: { email: string; role: AccountRole; now: string; publicSignupOpen?: boolean }): AccountResult {
	const open = input.publicSignupOpen ?? PUBLIC_SIGNUP_OPEN;
	if (open !== true) return fail('signup-closed', 'Public signup is closed.');
	if (!EMAIL.test(input.email.trim()) || !(ACCOUNT_ROLES as readonly string[]).includes(input.role)) {
		return fail('invalid-email', 'That signup could not be started.');
	}
	const email = input.email.trim().toLowerCase();
	const existing = findEmail(book, email);
	if (existing) {
		existing.failures += 1;
		if (existing.failures >= ABUSE_LIMIT) return fail('rate-limited', 'Try again later.');
		return fail('sign-in-failed', 'If an account exists, use sign-in or recovery.');
	}
	const id = `fixture-account-${book.next++}`;
	book.accounts.push({
		id,
		email,
		role: input.role,
		licenseVerified: false,
		verifiedAt: null,
		deletedAt: null,
		session: null,
		verificationToken: { id: `fixture-verify-${id}`, expiresAt: new Date(Date.parse(input.now) + TOKEN_MS).toISOString(), used: false },
		signInToken: null,
		recoveryToken: null,
		avatar: null,
		failures: 0,
	});
	return { ok: true, state: 'pending-verification', accountId: id, publicMessage: 'Verification is pending. No message was sent.' };
}

export function confirmVerification(book: AccountBook, input: { accountId: string; token: string; now: string }): AccountResult {
	const account = book.accounts.find((item) => item.id === input.accountId && !item.deletedAt);
	if (!account?.verificationToken) return fail('verification-expired', 'That verification did not succeed.');
	if (account.verificationToken.used) return fail('verification-reused', 'That verification did not succeed.');
	if (account.verificationToken.id !== input.token || account.verificationToken.expiresAt <= input.now) {
		account.failures += 1;
		return fail(account.failures >= ABUSE_LIMIT ? 'rate-limited' : 'verification-expired', 'That verification did not succeed.');
	}
	account.verificationToken.used = true;
	account.verifiedAt = input.now;
	account.signInToken = { id: `fixture-signin-${account.id}`, expiresAt: new Date(Date.parse(input.now) + TOKEN_MS).toISOString(), used: false };
	account.failures = 0;
	return { ok: true, state: 'verified', accountId: account.id, publicMessage: 'The fixture account is verified. No licence was checked.' };
}

export function signIn(book: AccountBook, input: { email: string; token: string; now: string }): AccountResult {
	const account = findEmail(book, input.email);
	const token = account?.signInToken;
	const expired = !!token && !token.used && token.id === input.token && token.expiresAt <= input.now;
	const replayed = !!token && token.used && token.id === input.token;
	if (!account || !account.verifiedAt || !token || token.id !== input.token || token.used || token.expiresAt <= input.now) {
		if (account) account.failures += 1;
		const state = account && account.failures >= ABUSE_LIMIT ? 'rate-limited' : replayed ? 'sign-in-reused' : expired ? 'sign-in-expired' : 'sign-in-failed';
		return fail(state, 'Sign-in did not succeed.');
	}
	token.used = true;
	account.session = { id: `fixture-session-${account.id}`, expiresAt: new Date(Date.parse(input.now) + SESSION_MS).toISOString() };
	account.failures = 0;
	return { ok: true, state: 'signed-in', accountId: account.id, publicMessage: 'Signed in on this fixture. No provider was contacted.' };
}

export function requestRecovery(book: AccountBook, input: { email: string; now: string }): AccountResult {
	const account = findEmail(book, input.email);
	if (account?.verifiedAt) {
		account.failures += 1;
		if (account.failures >= ABUSE_LIMIT) return fail('rate-limited', 'Try again later.');
		account.recoveryToken = { id: `fixture-recovery-${account.id}-${account.failures}`, expiresAt: new Date(Date.parse(input.now) + TOKEN_MS).toISOString(), used: false };
	}
	return { ok: true, state: 'recovery-requested', publicMessage: 'If an account exists, recovery can continue on this fixture. No message was sent.' };
}

export function completeRecovery(book: AccountBook, input: { email: string; token: string; now: string }): AccountResult {
	const account = findEmail(book, input.email);
	if (!account?.recoveryToken || account.recoveryToken.used || account.recoveryToken.id !== input.token || account.recoveryToken.expiresAt <= input.now) {
		return fail('recovery-failed', 'Recovery did not succeed.');
	}
	account.recoveryToken.used = true;
	account.session = { id: `fixture-session-${account.id}`, expiresAt: new Date(Date.parse(input.now) + SESSION_MS).toISOString() };
	account.failures = 0;
	return { ok: true, state: 'signed-in', accountId: account.id, publicMessage: 'Recovery signed the fixture account in. No provider was contacted.' };
}

export function readSession(book: AccountBook, input: { accountId: string; now: string }): AccountResult {
	const account = book.accounts.find((item) => item.id === input.accountId && !item.deletedAt);
	if (!account?.session || account.session.expiresAt <= input.now) {
		if (account) account.session = null;
		return fail('session-expired', 'The session has expired.');
	}
	return { ok: true, state: 'session-active', accountId: account.id, publicMessage: 'The fixture session is active.' };
}

export function exportAccount(book: AccountBook, input: { accountId: string; actorId: string }): { ok: boolean; state: string; body?: Record<string, unknown> } {
	if (input.accountId !== input.actorId) return { ok: false, state: 'export-forbidden' };
	const account = book.accounts.find((item) => item.id === input.accountId);
	if (!account || account.deletedAt) return { ok: false, state: 'export-forbidden' };
	return {
		ok: true,
		state: 'exported',
		body: {
			id: account.id,
			email: account.email,
			role: account.role,
			roleLabel: roleLabel(account.role, account.licenseVerified),
			licenseVerified: account.licenseVerified,
			avatar: account.avatar ? { stored: true, publicUrl: null, mime: account.avatar.mime, crop: account.avatar.crop } : { stored: false, publicUrl: null, fallback: fallbackLabel(account.email) },
		},
	};
}

export function deleteAccount(book: AccountBook, input: { accountId: string; actorId: string; now: string }): AccountResult {
	if (input.accountId !== input.actorId) return fail('permission-denied', 'That account cannot be deleted.');
	const account = book.accounts.find((item) => item.id === input.accountId && !item.deletedAt);
	if (!account) return fail('delete-unknown', 'That account cannot be deleted.');
	account.deletedAt = input.now;
	account.session = null;
	account.avatar = null;
	account.verificationToken = null;
	account.signInToken = null;
	account.recoveryToken = null;
	return { ok: true, state: 'deleted', accountId: account.id, publicMessage: 'The fixture account is deleted.' };
}

export function setRole(book: AccountBook, input: { accountId: string; actorId: string; role: AccountRole }): AccountResult {
	if (input.accountId !== input.actorId) return fail('permission-denied', 'That role cannot be changed.');
	const account = book.accounts.find((item) => item.id === input.accountId && !item.deletedAt);
	if (!account) return fail('permission-denied', 'That role cannot be changed.');
	if (!(ACCOUNT_ROLES as readonly string[]).includes(input.role)) return fail('permission-denied', 'That role cannot be changed.');
	account.role = input.role;
	account.licenseVerified = false;
	return { ok: true, state: 'role-set', accountId: account.id, publicMessage: roleLabel(input.role, false) };
}

export function verifyLicence(book: AccountBook, input: { accountId: string; reviewerId: string }): AccountResult {
	if (!input.reviewerId.startsWith('fixture-reviewer-')) return fail('permission-denied', 'A licence is not verified.');
	const account = book.accounts.find((item) => item.id === input.accountId && !item.deletedAt);
	if (!account || account.role === 'consumer') return fail('permission-denied', 'A licence is not verified.');
	account.licenseVerified = true;
	return { ok: true, state: 'licence-verified', accountId: account.id, publicMessage: roleLabel(account.role, true) };
}

function fallbackLabel(email: string): string {
	const letter = email.trim().charAt(0).toUpperCase();
	return letter || '?';
}

export function avatarFallback(book: AccountBook, accountId: string): { kind: 'fallback'; label: string } {
	const account = book.accounts.find((item) => item.id === accountId);
	return { kind: 'fallback', label: fallbackLabel(account?.email ?? '') };
}

function u8(bytes: number[]): Uint8Array {
	return new Uint8Array(bytes);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
	return String.fromCharCode(...bytes.slice(start, start + length));
}

function parseImage(bytes: Uint8Array): { mime: AvatarMedia['mime']; width: number; height: number; stripped: Uint8Array } | null {
	if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG') return parsePng(bytes);
	if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return parseJpeg(bytes);
	if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return parseWebp(bytes);
	return null;
}

function parsePng(bytes: Uint8Array): { mime: 'image/png'; width: number; height: number; stripped: Uint8Array } | null {
	const signature = bytes.slice(0, 8);
	const kept: Uint8Array[] = [signature];
	let offset = 8;
	let width = 0;
	let height = 0;
	let sawIhdr = false;
	const drop = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf']);
	while (offset + 8 <= bytes.length) {
		const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
		const type = ascii(bytes, offset + 4, 4);
		const end = offset + 12 + length;
		if (end > bytes.length) return null;
		if (type === 'IHDR') {
			width = new DataView(bytes.buffer, bytes.byteOffset + offset + 8, 4).getUint32(0);
			height = new DataView(bytes.buffer, bytes.byteOffset + offset + 12, 4).getUint32(0);
			sawIhdr = true;
		}
		if (!drop.has(type)) kept.push(bytes.slice(offset, end));
		offset = end;
		if (type === 'IEND') break;
	}
	if (!sawIhdr || width < 1 || height < 1) return null;
	const size = kept.reduce((sum, chunk) => sum + chunk.length, 0);
	const stripped = new Uint8Array(size);
	let cursor = 0;
	for (const chunk of kept) {
		stripped.set(chunk, cursor);
		cursor += chunk.length;
	}
	return { mime: 'image/png', width, height, stripped };
}

function parseJpeg(bytes: Uint8Array): { mime: 'image/jpeg'; width: number; height: number; stripped: Uint8Array } | null {
	const out: number[] = [0xff, 0xd8];
	let i = 2;
	let width = 0;
	let height = 0;
	while (i + 1 < bytes.length) {
		if (bytes[i] !== 0xff) return null;
		const marker = bytes[i + 1];
		if (marker === 0xd9) {
			out.push(0xff, 0xd9);
			break;
		}
		if (marker === 0xda) {
			out.push(...bytes.slice(i));
			break;
		}
		if (i + 3 >= bytes.length) return null;
		const length = (bytes[i + 2] << 8) | bytes[i + 3];
		if (length < 2 || i + 2 + length > bytes.length) return null;
		const isMetadata = (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe;
		if (!isMetadata) {
			if (marker >= 0xc0 && marker <= 0xc3 && length >= 7) {
				height = (bytes[i + 5] << 8) | bytes[i + 6];
				width = (bytes[i + 7] << 8) | bytes[i + 8];
			}
			out.push(...bytes.slice(i, i + 2 + length));
		}
		i += 2 + length;
	}
	if (width < 1 || height < 1) return null;
	return { mime: 'image/jpeg', width, height, stripped: u8(out) };
}

function parseWebp(bytes: Uint8Array): { mime: 'image/webp'; width: number; height: number; stripped: Uint8Array } | null {
	const chunks: Uint8Array[] = [];
	let offset = 12;
	let width = 0;
	let height = 0;
	while (offset + 8 <= bytes.length) {
		const type = ascii(bytes, offset, 4);
		const length = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4).getUint32(0, true);
		const end = offset + 8 + length + (length % 2);
		if (end > bytes.length) return null;
		if (type === 'VP8X' && length >= 10) {
			width = 1 + bytes[offset + 12] + (bytes[offset + 13] << 8) + (bytes[offset + 14] << 16);
			height = 1 + bytes[offset + 15] + (bytes[offset + 16] << 8) + (bytes[offset + 17] << 16);
		}
		if (type !== 'EXIF') chunks.push(bytes.slice(offset, end));
		offset = end;
	}
	if (width < 1 || height < 1) return null;
	const payload = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
	const body = new Uint8Array(12 + payload);
	body.set(bytes.slice(0, 12));
	body[4] = (4 + payload) & 0xff;
	body[5] = ((4 + payload) >> 8) & 0xff;
	body[6] = ((4 + payload) >> 16) & 0xff;
	body[7] = ((4 + payload) >> 24) & 0xff;
	let cursor = 12;
	for (const chunk of chunks) {
		body.set(chunk, cursor);
		cursor += chunk.length;
	}
	return { mime: 'image/webp', width, height, stripped: body };
}

export function uploadAvatar(book: AccountBook, input: { accountId: string; actorId: string; bytes: Uint8Array }): AccountResult {
	if (input.accountId !== input.actorId) return fail('permission-denied', 'That image was not stored.');
	const account = book.accounts.find((item) => item.id === input.accountId && !item.deletedAt);
	if (!account) return fail('permission-denied', 'That image was not stored.');
	if (input.bytes.length > MAX_AVATAR_BYTES) return fail('upload-size', 'That image is too large.');
	const parsed = parseImage(input.bytes);
	if (!parsed) return fail('upload-type', 'That file is not a supported image.');
	const hadMetadata = parsed.stripped.length < input.bytes.length;
	account.avatar = { bytes: parsed.stripped, mime: parsed.mime, width: parsed.width, height: parsed.height, crop: null };
	return { ok: true, state: hadMetadata ? 'upload-metadata-stripped' : 'upload-stored', accountId: account.id, publicMessage: 'The image is private to this fixture account.' };
}

export function cropAvatar(book: AccountBook, input: { accountId: string; actorId: string; crop: { x: number; y: number; width: number; height: number } }): AccountResult {
	if (input.accountId !== input.actorId) return fail('permission-denied', 'That crop was not stored.');
	const account = book.accounts.find((item) => item.id === input.accountId && !item.deletedAt);
	if (!account?.avatar) return fail('upload-crop', 'There is no image to crop.');
	const { x, y, width, height } = input.crop;
	if (x < 0 || y < 0 || width < 1 || height < 1 || x + width > account.avatar.width || y + height > account.avatar.height) {
		return fail('upload-crop', 'That crop does not fit the image.');
	}
	account.avatar = { ...account.avatar, crop: { x, y, width, height } };
	return { ok: true, state: 'avatar-cropped', accountId: account.id, publicMessage: 'The private image crop was stored.' };
}

export function deleteAvatar(book: AccountBook, input: { accountId: string; actorId: string }): AccountResult {
	if (input.accountId !== input.actorId) return fail('permission-denied', 'That image was not removed.');
	const account = book.accounts.find((item) => item.id === input.accountId && !item.deletedAt);
	if (!account) return fail('permission-denied', 'That image was not removed.');
	account.avatar = null;
	return { ok: true, state: 'avatar-deleted', accountId: account.id, publicMessage: 'The private image was removed.' };
}
