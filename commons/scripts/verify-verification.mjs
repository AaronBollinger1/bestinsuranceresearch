import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { memoryStore } from '../src/lib/store-memory.ts';
import {
	PROFESSIONAL_ROLES,
	newVerificationRequestId,
	validateVerificationRequest,
	verificationRecord,
} from '../src/lib/verification.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('only the supported professional roles can be requested', () => {
	const valid = validateVerificationRequest({
		kind: 'broker',
		licenseNumber: '123456',
		authority: 'California Department of Insurance',
		registerUrl: 'https://interactive.web.insurance.ca.gov/producer-search/',
	});
	assert.deepEqual(valid.errors, []);
	assert.equal(valid.draft?.kind, 'broker');
	assert.deepEqual(Object.keys(PROFESSIONAL_ROLES).sort(), ['adjuster', 'attorney', 'broker']);

	const unsupported = validateVerificationRequest({
		kind: 'financial-adviser',
		licenseNumber: '123456',
		authority: 'A public authority',
		registerUrl: 'https://example.com/register',
	});
	assert.ok(unsupported.errors.some((error) => error.field === 'kind'));
});

test('a request needs a direct HTTPS register URL and public fields', () => {
	const result = validateVerificationRequest({
		kind: 'broker',
		licenseNumber: '1',
		authority: 'x',
		registerUrl: 'http://example.com/register',
	});
	assert.ok(result.errors.some((error) => error.field === 'licenseNumber'));
	assert.ok(result.errors.some((error) => error.field === 'authority'));
	assert.ok(result.errors.some((error) => error.field === 'registerUrl'));
});

test('approval updates the account and makes the role badge verifiable', async () => {
	const store = memoryStore();
	await store.upsertAccount('broker@example.com');
	const request = verificationRecord(
		'broker@example.com',
		{
			kind: 'broker',
			licenseNumber: '0D94699',
			authority: 'California Department of Insurance',
			registerUrl: 'https://example.com/register/0D94699',
		},
		'2026-09-09T10:00:00.000Z',
		newVerificationRequestId(),
	);
	await store.createVerificationRequest(request);
	assert.equal((await store.pendingVerificationRequests()).length, 1);

	await store.decideVerificationRequest(request.id, {
		state: 'approved',
		moderator: 'moderator@example.com',
		note: 'The public register lists this number as active for the requested role.',
		decidedAt: '2026-09-09T11:00:00.000Z',
		verifiedOn: '2026-09-09',
	});

	const account = await store.getAccount('broker@example.com');
	assert.equal(account?.kind, 'broker');
	assert.equal(account?.license?.number, '0D94699');
	assert.equal(account?.license?.verifiedAgainst, 'https://example.com/register/0D94699');
	assert.equal(account?.license?.verifiedOn, '2026-09-09');
	assert.equal((await store.pendingVerificationRequests()).length, 0);
	assert.equal((await store.getVerificationRequest(request.id))?.state, 'approved');
});

test('declining a request leaves the account as a reader', async () => {
	const store = memoryStore();
	await store.upsertAccount('reader@example.com');
	const request = verificationRecord(
		'reader@example.com',
		{
			kind: 'adjuster',
			licenseNumber: 'A-1234',
			authority: 'A public licensing authority',
			registerUrl: 'https://example.com/register/A-1234',
		},
		'2026-09-09T10:00:00.000Z',
		'00000000-0000-4000-8000-000000000001',
	);
	await store.createVerificationRequest(request);
	await store.decideVerificationRequest(request.id, {
		state: 'declined',
		moderator: 'moderator@example.com',
		note: 'The named register did not expose a matching active record.',
		decidedAt: '2026-09-09T11:00:00.000Z',
	});

	const account = await store.getAccount('reader@example.com');
	assert.equal(account?.kind, 'reader');
	assert.equal(account?.license, undefined);
	assert.equal((await store.getVerificationRequest(request.id))?.state, 'declined');
});

test('the database schema contains a separate pending verification queue', () => {
	const schema = fs.readFileSync(path.join(ROOT, 'schema.sql'), 'utf8');
	assert.match(schema, /create table if not exists verification_requests/);
	assert.match(schema, /state in \('pending', 'approved', 'declined'\)/);
	assert.match(schema, /register_url\s+text not null check \(register_url ~ '\^https:\/\/'\)/);
});
