/**
 * BR-E1: business and property-investor views. Personal adapters stay off.
 *
 *   node --experimental-strip-types --test scripts/verify-property-research-views.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CANONICAL_LINES } from '../src/lib/lines.ts';
import {
	PERSONAL_ADAPTERS,
	PRIMARY_LINES,
	PROPERTY_VIEWS_PUBLIC,
	VIEW_ACTIONS,
	VIEW_ROLES,
	callPersonalAdapter,
	can,
	layoutAt,
	presentResearchView,
} from '../src/lib/property-research-views.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('roles stop at their boundary and personal adapters do not run', () => {
	assert.equal(PROPERTY_VIEWS_PUBLIC, false);
	assert.equal(can('organization', 'view-organization').allowed, true);
	assert.equal(can('organization', 'view-evidence').allowed, false);
	assert.equal(can('policy-evidence', 'view-evidence').allowed, true);
	assert.equal(can('policy-evidence', 'view-organization').allowed, false);
	assert.equal(can('contributor', 'view-own-draft').allowed, true);
	assert.equal(can('contributor', 'view-task').allowed, false);
	assert.equal(can('task', 'view-task').allowed, true);
	assert.equal(can('location', 'view-portfolio').allowed, false);
	assert.equal(can('portfolio', 'view-property').allowed, true);
	assert.equal(can('property', 'view-location').allowed, true);
	for (const role of VIEW_ROLES) {
		assert.ok(VIEW_ACTIONS.some((action) => !can(role, action).allowed), role);
	}
	for (const line of PRIMARY_LINES) assert.ok(CANONICAL_LINES.includes(line), line);
	for (const adapter of PERSONAL_ADAPTERS) {
		const result = callPersonalAdapter(adapter.id);
		assert.equal(result.enabled, false);
		assert.equal(result.calls, 0);
		assert.equal(adapter.enabled, false);
	}
	const source = fs.readFileSync(path.join(ROOT, 'src/lib/property-research-views.ts'), 'utf8');
	assert.ok(!/\bfetch\s*\(/.test(source));
	assert.ok(!/process\.env/.test(source));
	assert.equal(fs.existsSync(path.join(ROOT, 'src/pages/portfolio')), false);
});

test('every view state is accessible, noindex, and the layout follows the viewport', () => {
	const states = ['loading', 'error', 'empty', 'offline', 'review', 'permission', 'conflict', 'ready'];
	for (const state of states) {
		const view = presentResearchView({
			role: 'portfolio',
			action: 'view-portfolio',
			state,
			title: 'Fixture portfolio',
			conflict: { left: 'The first reading keeps the earlier deadline.', right: 'The second reading moves the deadline.' },
		});
		assert.equal(view.indexable, false);
		assert.equal(view.state, state);
		assert.match(view.html, /<html lang="en">/);
		assert.match(view.html, /width=device-width/);
		assert.match(view.html, /noindex, nofollow/);
		assert.equal((view.html.match(/<h1[\s>]/g) || []).length, 1);
		assert.match(view.html, /<main[\s>]/);
		assert.match(view.html, new RegExp(`data-state="${state}"`));
	}
	const empty = presentResearchView({ role: 'portfolio', action: 'view-portfolio', state: 'empty', title: 'Fixture portfolio' });
	assert.match(empty.html, /No properties are in this portfolio/);
	assert.ok(!/14 Harbor/.test(empty.html));
	const denied = presentResearchView({ role: 'location', action: 'view-evidence', state: 'ready', title: 'Fixture location' });
	assert.equal(denied.state, 'permission');
	assert.match(denied.html, /role="status"/);
	assert.match(denied.html, /may not view-evidence/);
	const conflict = presentResearchView({
		role: 'property',
		action: 'view-property',
		state: 'conflict',
		title: 'Fixture property',
		conflict: { left: 'Earlier deadline.', right: 'Later deadline.' },
	});
	assert.match(conflict.html, /Earlier deadline/);
	assert.match(conflict.html, /Later deadline/);
	assert.equal(layoutAt(390), 'stack');
	assert.equal(layoutAt(767), 'stack');
	assert.equal(layoutAt(768), 'split');
	assert.equal(layoutAt(1279), 'split');
	assert.equal(layoutAt(1280), 'wide');
	assert.equal(layoutAt(1920), 'wide');
	const payload = '<img src=x onerror="alert(1)"><script>secret-record</script>';
	const marked = presentResearchView({
		role: 'property',
		action: 'view-property',
		state: 'conflict',
		title: payload,
		conflict: { left: payload, right: 'Later deadline.' },
	});
	assert.equal(/<img\b/i.test(marked.html), false);
	assert.equal(marked.html.includes('<script'), false);
	assert.match(marked.html, /&lt;img/);
	assert.match(marked.html, /&lt;script&gt;/);
	const hidden = presentResearchView({
		role: 'location',
		action: 'view-evidence',
		state: 'conflict',
		title: 'Policy number ABC-123 for Fixture Mutual',
		conflict: { left: 'Policy number ABC-123 stays on the first reading.', right: payload },
	});
	assert.equal(hidden.state, 'permission');
	assert.match(hidden.html, /<title>Permission required<\/title>/);
	assert.match(hidden.html, /<h1>Permission required<\/h1>/);
	assert.ok(!hidden.html.includes('ABC-123'));
	assert.ok(!hidden.html.includes('Fixture Mutual'));
	assert.ok(!hidden.html.includes('<script>'));
	assert.ok(!hidden.html.includes('onerror'));
	const ready = presentResearchView({ role: 'organization', action: 'view-organization', state: 'ready', title: 'Fixture organization' });
	assert.match(ready.html, /min-width: 768px/);
	assert.match(ready.html, /min-width: 1280px/);
});
