/**
 * BR-L1: licensed-help paths stay privacy-safe and discoverable.
 *
 *   node --experimental-strip-types --test scripts/verify-licensed-intake.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handoffActions } from '../src/lib/handoff.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('call, quote, and email carry no question text', () => {
	const actions = handoffActions({ sourcePath: '/questions/claims-made-retroactive-date', family: 'commercial' });
	assert.equal(actions.call, 'tel:+15622689355');
	assert.match(actions.email, /^mailto:quotes@bollinsure\.com\?subject=/);
	assert.equal(actions.email.includes('claims-made'), false);
	const quote = new URL(actions.quote);
	assert.equal(quote.origin, 'https://www.bollinsure.com');
	assert.equal(quote.pathname, '/quote');
	assert.equal(quote.searchParams.get('utm_source'), 'birch');
	assert.equal(quote.searchParams.get('bir_source_path'), '/questions/claims-made-retroactive-date');
	assert.equal(quote.searchParams.get('bir_family'), 'commercial');
	assert.equal(quote.searchParams.has('q'), false);
	for (const [key, value] of quote.searchParams) {
		assert.equal(key === 'q' || key === 'question' || key === 'query', false, key);
		assert.equal(value.includes('@'), false, value);
	}
});

test('the homepage and the global chrome use the same intake', () => {
	const intake = read('src/components/LicensedIntake.astro');
	assert.match(intake, /handoffActions/);
	assert.match(intake, /Call /);
	assert.match(intake, /Request a quote/);
	assert.match(intake, /Email/);
	for (const file of ['src/pages/index.astro', 'src/components/SiteHeader.astro', 'src/components/SiteFooter.astro']) {
		assert.match(read(file), /LicensedIntake/, file);
	}
	assert.match(read('src/pages/index.astro'), /Ask a question|Understand your/);
	const gate = read('src/config/public-indexing.mjs');
	assert.match(gate, /PUBLIC_INDEXING_OPEN === 'true'/);
	assert.match(gate, /PUBLIC_SITE_ENV === 'production'/);
});
