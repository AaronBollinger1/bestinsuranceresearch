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
	appealDraft,
	confirmDraft,
	correctDraft,
	holdDraft,
	recordOwnerGate,
	refreshDraft,
	removeSource,
	retrieveEvidence,
	reviewDraft,
	rollbackDraft,
	withdrawDraft,
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
	assert.match(walked.html, /data-confirm="confirmed"/);
	assert.match(walked.state.draft.confirmation.receipt, /^pilot-confirm-pilot-consumer-/);
	assert.equal(walked.state.observations.some((item) => item.kind === 'confirm' && item.result === 'confirmed'), true);
});

test('unknown and wrong actors fail closed, and confirm needs a live session', () => {
	const store = memoryPilotStore(seedPilot());
	retrieveEvidence(store, now);
	const before = store.load().draft;
	assert.equal(reviewDraft(store, { now, actorId: 'fixture-reviewer-editor', kind: 'editorial' }).state, 'permission-denied');
	assert.equal(reviewDraft(store, { now, actorId: 'pilot-licensed', kind: 'editorial' }).state, 'permission-denied');
	assert.equal(reviewDraft(store, { now, actorId: 'pilot-editor', kind: 'licensed-review' }).state, 'permission-denied');
	assert.equal(holdDraft(store, { actorId: 'pilot-consumer', now }).state, 'permission-denied');
	assert.equal(removeSource(store, { actorId: 'pilot-consumer', sourceId: 'src-fixture-wind', now }).state, 'permission-denied');
	assert.equal(correctDraft(store, { actorId: 'pilot-owner', now, summary: 'Unwanted rewrite.' }).state, 'permission-denied');
	assert.equal(rollbackDraft(store, { actorId: 'nobody', now, version: 1 }).state, 'permission-denied');
	assert.equal(refreshDraft(store, { actorId: 'pilot-consumer', now, effectiveDate: '2026-09-28' }).state, 'permission-denied');
	assert.equal(withdrawDraft(store, { actorId: 'pilot-licensed', now }).state, 'permission-denied');
	assert.equal(appealDraft(store, { actorId: 'pilot-editor', now, note: 'Staff cannot appeal.' }).state, 'permission-denied');
	assert.equal(recordOwnerGate(store, { actorId: 'pilot-editor', now }).state, 'permission-denied');
	assert.equal(confirmDraft(store, { accountId: 'pilot-consumer', now }).state, 'session-missing');
	const expired = memoryPilotStore(seedPilot());
	retrieveEvidence(expired, now);
	const current = expired.load();
	current.accounts = current.accounts.map((item) => item.id === 'pilot-consumer' ? { ...item, session: { id: 'old', expiresAt: '2026-09-27T12:00:00.000Z' } } : item);
	expired.save(current);
	assert.equal(confirmDraft(expired, { accountId: 'pilot-consumer', now }).state, 'session-expired');
	assert.equal(expired.load().draft.confirmation, null);
	assert.equal(store.load().draft.editorial, before.editorial);
	assert.equal(store.load().draft.sources[0].removed, false);
	assert.equal(store.load().draft.withdrawn, false);
	const owner = recordOwnerGate(store, { actorId: 'pilot-owner', now });
	assert.equal(owner.ok, false);
	assert.equal(owner.state, 'owner-withheld');
	assert.equal(pilotPublication(store.load().draft).gates.find((gate) => gate.gate === 'owner').ok, false);
	assert.equal(store.load().observations.some((item) => item.result === 'owner-withheld'), true);
});
