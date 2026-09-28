import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const read = (...parts) => readFileSync(path.join(dist, ...parts), 'utf8');

test('the editorial brand lockup names Birch Research without changing navigation', () => {
	const home = read('index.html');
	assert.match(home, /aria-label="Birch Research home"/);
	assert.match(home, /class="brand-wordmark"[\s\S]*?<strong>Birch<\/strong>[\s\S]*?class="brand-edition">Research<\/span>/);
	assert.match(home, /class="header-menu" data-header-menu/);
});

test('every page advertises the compact citation manifest once', () => {
	for (const file of ['index.html', path.join('for-ai', 'index.html'), path.join('professionals', 'index.html')]) {
		const html = read(file);
		const matches = html.match(/title="Birch Research citation manifest" href="\/citation-manifest\.json"/g) ?? [];
		assert.equal(matches.length, 1, `${file} should advertise one citation manifest`);
	}
});

test('the AI guide states identity, provenance, citation rules, and limits', () => {
	const html = read('for-ai', 'index.html');
	for (const phrase of [
		'Canonical identity',
		'Best machine entry points',
		'What to cite',
		'Trust and provenance controls',
		'No visibility guarantee',
	]) assert.match(html, new RegExp(phrase));
	assert.match(html, /noindex, nofollow/);
});

test('the citation manifest is self-describing and preserves closed gates', () => {
	const manifest = JSON.parse(read('citation-manifest.json'));
	assert.equal(manifest.format, 'Birch Research citation manifest');
	assert.equal(manifest.note, 'A Birch-specific discovery contract, not an external standard.');
	assert.equal(manifest.identity.name, 'Birch Research');
	assert.equal(manifest.identity.canonicalOrigin, 'https://birch.insure');
	assert.equal(manifest.access.indexing, 'closed');
	assert.equal(manifest.access.publicCommons, 'closed');
	assert.ok(manifest.corpus.sourceRecords >= 300);
	assert.ok(manifest.corpus.claims >= 1900);
	assert.equal(manifest.discovery.llms, 'https://birch.insure/llms.txt');
	assert.match(manifest.citation.claimAddressPattern, /sources\/<source-id>#c<number>$/);
});

test('llms.txt links the human and machine AI discovery surfaces', () => {
	const llms = read('llms.txt');
	assert.match(llms, /https:\/\/birch\.insure\/for-ai/);
	assert.match(llms, /https:\/\/birch\.insure\/citation-manifest\.json/);
});
