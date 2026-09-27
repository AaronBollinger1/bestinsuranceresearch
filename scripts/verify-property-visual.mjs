/**
 * BR-E2 / BR-10: consented captures, a 2D board, and an approximate sketch.
 *
 *   node --experimental-strip-types --test scripts/verify-property-visual.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	IMAGERY_PROVIDER_SIGNED,
	addCapture,
	blockCost,
	correctNote,
	createBoard,
	deleteCapture,
	exportBoard,
	grantConsent,
	withdrawConsent,
	imageryOutage,
	markReview,
	presentBoard,
	recordConflict,
	rollbackBoard,
	shareBoard,
} from '../src/lib/property-visual.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ADDRESS = '14 Fixture Way';

function shot(board, angle, extra = {}) {
	return addCapture(board, {
		angle,
		quality: 'sufficient',
		note: `${angle} wall of the fixture building.`,
		bytes: 1200,
		statedAddress: ADDRESS,
		mime: 'image/jpeg',
		...extra,
	});
}

test('consent, match, quality, upload, deletion, retention, and the 2D fallback', () => {
	assert.equal(IMAGERY_PROVIDER_SIGNED, false);
	let board = createBoard('prop-1', ADDRESS);
	assert.equal(shot(board, 'north').board.state, 'consent-required');
	board = grantConsent(board, { actor: 'Fixture Owner', purpose: 'Record the exterior for the owner.', scope: 'Four exterior faces of 14 Fixture Way', recordedAt: '2026-09-27T12:00:00.000Z' });
	assert.equal(board.consent.actor, 'Fixture Owner');
	assert.equal(board.consent.withdrawnAt, null);
	assert.equal(shot(board, 'north', { statedAddress: '99 Other Street' }).board.state, 'property-mismatch');
	assert.equal(shot(board, 'north', { quality: 'insufficient' }).board.state, 'quality-insufficient');
	assert.equal(shot(board, 'north', { mime: 'image/svg+xml' }).board.state, 'upload-failed');
	board = shot(board, 'north').board;
	assert.equal(board.captures.length, 1);
	const refused = deleteCapture(board, 'cap-1', '2026-09-27T12:00:00.000Z', '2026-09-27');
	assert.equal(refused.state, 'ready');
	assert.equal(refused.captures.length, 1);
	const purged = deleteCapture(board, 'cap-1', '2026-09-27T12:00:00.000Z', null);
	assert.equal(purged.state, 'deleted');
	assert.equal(purged.retained.length, 0);
	assert.equal(purged.captures.length, 0);
	const kept = deleteCapture(board, 'cap-1', '2026-09-27T12:00:00.000Z', '2027-09-27');
	assert.equal(kept.state, 'retained');
	assert.equal(kept.retained[0].bytes, 0);
	assert.equal(kept.retainedUntil, '2027-09-27');
	assert.equal(kept.captures.length, 0);
	board = kept;
	board = withdrawConsent({ ...board, consented: true, consent: { actor: 'Fixture Owner', purpose: 'Record the exterior for the owner.', scope: 'Four exterior faces of 14 Fixture Way', recordedAt: '2026-09-27T12:00:00.000Z', withdrawnAt: null } }, '2026-09-27T13:00:00.000Z');
	assert.equal(board.consented, false);
	assert.equal(board.consent.withdrawnAt, '2026-09-27T13:00:00.000Z');
	assert.equal(shot(board, 'east').ok, false);
	assert.equal(board.model, null);
	const view = presentBoard(board, 'property');
	assert.equal(view.fallback, '2d');
	assert.match(view.html, /2D evidence board/);
	assert.match(view.html, /noindex, nofollow/);
	const source = fs.readFileSync(path.join(ROOT, 'src/lib/property-visual.ts'), 'utf8');
	assert.ok(!/\bfetch\s*\(/.test(source));
	assert.ok(!/process\.env/.test(source));
	assert.equal(fs.existsSync(path.join(ROOT, 'src/pages/design/property-board.astro')), true);
});

test('four angles can show an approximate non-measuring sketch; outage and cost do not call a provider', () => {
	let board = grantConsent(createBoard('prop-1', ADDRESS), { actor: 'Fixture Owner', purpose: 'Record the exterior.', scope: ADDRESS, recordedAt: '2026-09-27T12:00:00.000Z' });
	for (const angle of ['north', 'east', 'south', 'west']) board = shot(board, angle).board;
	assert.equal(board.model.shown, true);
	assert.equal(board.model.approximate, true);
	assert.equal(board.model.measurement, false);
	assert.match(board.model.label, /Not an underwriting measurement/);
	const shown = presentBoard(board, 'property');
	assert.match(shown.html, /data-approximate="true"/);
	assert.match(shown.html, /2D evidence board|Approximate sketch/);
	const outage = imageryOutage(board);
	assert.equal(outage.state, 'provider-outage');
	assert.equal(outage.providerCalls, 0);
	assert.equal(outage.model, null);
	assert.match(presentBoard(outage, 'property').html, /2D evidence board/);
	const cost = blockCost(board);
	assert.equal(cost.state, 'cost-blocked');
	assert.equal(cost.spend, 0);
	assert.equal(cost.providerCalls, 0);
});

test('conflict, correction, review, share, export, and rollback honor BR-E1 permissions', () => {
	let board = grantConsent(createBoard('prop-1', ADDRESS), { actor: 'Fixture Owner', purpose: 'Record the exterior.', scope: ADDRESS, recordedAt: '2026-09-27T12:00:00.000Z' });
	board = shot(board, 'north').board;
	const before = board;
	board = recordConflict(board, 'north', 'Earlier note.', '<script>secret</script>');
	assert.equal(board.state, 'conflict');
	board = correctNote(board, 'cap-1', 'North wall after correction.', '2026-09-27T12:00:00.000Z');
	assert.equal(board.state, 'corrected');
	assert.equal(board.corrections[0].was, 'north wall of the fixture building.');
	board = markReview(board);
	assert.equal(board.state, 'in-review');
	assert.equal(shareBoard(board, 'location').state, 'permission');
	assert.equal(shareBoard(board, 'property').shared, true);
	assert.equal(exportBoard(board, 'contributor').ok, false);
	const exported = exportBoard(board, 'property');
	assert.equal(exported.ok, true);
	assert.equal(exported.body.measurement, false);
	assert.equal(exported.body.indexable, false);
	const rolled = rollbackBoard(board, before);
	assert.equal(rolled.state, 'rolled-back');
	assert.equal(rolled.captures[0].bytes, 0);
	assert.equal(rolled.providerCalls, 0);
	const denied = presentBoard(board, 'contributor');
	assert.match(denied.html, /<h1>Permission required<\/h1>/);
	assert.ok(!denied.html.includes('north wall'));
	assert.ok(!denied.html.includes('<script>'));
	const allowed = presentBoard(recordConflict(before, 'north', 'Earlier note.', '<script>secret</script>'), 'property');
	assert.equal(allowed.html.includes('<script>'), false);
	assert.match(allowed.html, /&lt;script&gt;/);
});
