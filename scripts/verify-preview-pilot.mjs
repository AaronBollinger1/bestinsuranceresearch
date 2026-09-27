/**
 * BR-R2: persistent preview pilot. Signup, publication, and providers stay closed.
 *
 *   node --experimental-strip-types --test scripts/verify-preview-pilot.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	PILOT_INDEXING_OPEN,
	PILOT_PROVIDER_ENABLED,
	PILOT_PUBLICATION_OPEN,
	PILOT_PUBLIC_SIGNUP_OPEN,
	completeRecovery,
	deleteAccount,
	requestRecovery,
	exportAccount,
	fixturePilotBoard,
	fixturePilotWalk,
	jsonPilotStore,
	memoryPilotStore,
	pilotPermissions,
	pilotPublication,
	requestSignup,
	seedPilot,
	setRole,
	signIn,
	storePrivateMedia,
	verifyCompanyAuthority,
	verifyLicence,
} from '../src/lib/preview-pilot.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const now = '2026-09-27T12:05:00.000Z';

test('public signup stays closed and the json store keeps a recovered session', () => {
	assert.equal(PILOT_PUBLIC_SIGNUP_OPEN, false);
	assert.equal(PILOT_PUBLICATION_OPEN, false);
	assert.equal(PILOT_INDEXING_OPEN, false);
	assert.equal(PILOT_PROVIDER_ENABLED, false);
	const store = jsonPilotStore(JSON.stringify(seedPilot()));
	const before = store.load().accounts.length;
	assert.equal(requestSignup(store, { email: 'new@fixture.invalid', role: 'consumer', now, publicSignupOpen: true }).state, 'signup-closed');
	assert.equal(store.load().accounts.length, before);
	for (let i = 0; i < 5; i += 1) signIn(store, { accountId: 'pilot-consumer', token: 'wrong', now });
	assert.equal(store.load().accounts.find((item) => item.id === 'pilot-consumer').failures, 5);
	assert.equal(completeRecovery(store, { accountId: 'pilot-consumer', token: 'missing', now }).state, 'recovery-failed');
	assert.equal(requestRecovery(store, { accountId: 'pilot-consumer', now }).state, 'recovery-requested');
	const recovery = completeRecovery(store, { accountId: 'pilot-consumer', token: 'pilot-recovery-pilot-consumer', now });
	assert.equal(recovery.state, 'signed-in');
	const reloaded = jsonPilotStore(store.dump());
	const consumer = reloaded.load().accounts.find((item) => item.id === 'pilot-consumer');
	assert.equal(consumer.session.id, 'pilot-session-pilot-consumer');
	assert.equal(consumer.licenceVerified, false);
	assert.equal(consumer.policyVerified, false);
	const media = storePrivateMedia(reloaded, { accountId: 'pilot-consumer', actorId: 'pilot-consumer', byteLength: 24 });
	assert.equal(media.publicUrl, null);
	const exported = exportAccount(reloaded, { accountId: 'pilot-consumer', actorId: 'pilot-consumer' });
	assert.equal(exported.body.media.publicUrl, null);
	assert.equal(exported.body.media.byteLength, 24);
	assert.equal(deleteAccount(reloaded, { accountId: 'pilot-consumer', actorId: 'other', now }).state, 'permission-denied');
	assert.equal(deleteAccount(reloaded, { accountId: 'pilot-consumer', actorId: 'pilot-consumer', now }).state, 'deleted');
	assert.equal(reloaded.load().accounts.find((item) => item.id === 'pilot-consumer').media, null);
});

test('roles stay distinct and authentication verifies nothing', () => {
	const store = memoryPilotStore(seedPilot());
	const at = '2026-09-27T12:10:00.000Z';
	const professional = store.load().accounts.find((item) => item.id === 'pilot-professional');
	const company = store.load().accounts.find((item) => item.id === 'pilot-company');
	assert.equal(pilotPermissions(professional, at).professionalContribution, false);
	assert.equal(pilotPermissions(company, at).companyResponse, false);
	assert.equal(professional.employmentVerified, false);
	assert.equal(company.organizationId, 'fixture-org');
	assert.equal(company.authorityVerified, false);
	assert.equal(setRole(store, { accountId: 'pilot-consumer', actorId: 'pilot-consumer', role: 'company-representative', organizationId: 'fixture-org' }).state, 'role-set');
	assert.equal(store.load().accounts.find((item) => item.id === 'pilot-consumer').authorityVerified, false);
	assert.equal(verifyLicence(store, { accountId: 'pilot-professional', reviewerId: 'consumer' }).state, 'permission-denied');
	assert.equal(verifyLicence(store, { accountId: 'pilot-professional', reviewerId: 'fixture-reviewer-1' }).state, 'licence-verified');
	assert.equal(pilotPermissions(store.load().accounts.find((item) => item.id === 'pilot-professional'), at).professionalContribution, true);
	assert.equal(pilotPermissions(store.load().accounts.find((item) => item.id === 'pilot-professional'), at).companyResponse, false);
	assert.equal(verifyCompanyAuthority(store, { accountId: 'pilot-company', reviewerId: 'fixture-reviewer-1' }).state, 'authority-verified');
	assert.equal(pilotPermissions(store.load().accounts.find((item) => item.id === 'pilot-company'), at).companyResponse, true);
	assert.equal(pilotPermissions(store.load().accounts.find((item) => item.id === 'pilot-company'), at).licensedReview, false);
});

test('one unanswered question stays noindex through dispute, appeal, removal, and rollback', () => {
	const walked = fixturePilotWalk();
	const publication = pilotPublication(walked.state.draft);
	assert.equal(publication.eligible, false);
	assert.equal(publication.indexable, false);
	assert.equal(publication.sitemap, false);
	assert.equal(publication.robots, 'noindex, nofollow');
	assert.equal(publication.gates.find((gate) => gate.gate === 'owner').ok, false);
	assert.equal(publication.gates.find((gate) => gate.gate === 'citation').ok, true);
	assert.equal(walked.state.draft.providerCalls, 0);
	assert.equal(walked.state.draft.spend, 0);
	assert.equal(walked.state.draft.version, 2);
	assert.match(walked.state.draft.summary, /src-fixture-wind/);
	assert.match(walked.html, /data-research-draft="true"/);
	assert.match(walked.html, /data-publication="closed"/);
	const board = fixturePilotBoard();
	assert.match(board, /data-account-failure="rate-limited"/);
	assert.match(board, /data-appeal="open"/);
	assert.match(board, /data-source-removed="src-fixture-wind"/);
	assert.match(board, /data-withdrawal="withdrawn"/);
	assert.match(board, /Withdrawn\./);
	const source = fs.readFileSync(path.join(ROOT, 'src/pages/design/preview-pilot.astro'), 'utf8');
	assert.match(source, /fixturePilotBoard/);
	assert.match(source, /\bnoindex\b/);
	assert.equal(PILOT_PUBLICATION_OPEN, false);
});
