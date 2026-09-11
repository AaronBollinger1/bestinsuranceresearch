import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pagePatterns } from '../src/lib/product-design.ts';

const pageFile = (path) => fileURLToPath(new URL(`../dist${path === '/' ? '' : path}/index.html`, import.meta.url));
const html = (path) => readFileSync(pageFile(path), 'utf8');

test('every product pattern leads to a built page, not a dead-end blueprint', () => {
  for (const pattern of pagePatterns) assert.ok(existsSync(pageFile(pattern.href)), `${pattern.title}: ${pattern.href}`);
});

test('design alternatives and account specimens remain unindexable with one main landmark', () => {
  const paths = ['/design/product-system', '/design/account-preview', '/design/thread-preview', '/design/commons-preview', ...['focus', 'editorial', 'explore'].map(direction => `/design/directions/${direction}`)];
  for (const path of paths) {
    const page = html(path);
    assert.match(page, /<meta\s+name="robots"\s+content="[^"]*noindex/, path);
    assert.equal((page.match(/<main\b/g) || []).length, 1, `${path}: exactly one main landmark`);
  }
});

test('the front door preserves review uncertainty and working source-ledger links', () => {
  const home = html('/');
  assert.doesNotMatch(home, /\bReviewed\s+(January|February|March|April|May|June|July|August|September|October|November|December)/);
  assert.match(home, /Research is awaiting licensed review/);
  for (const path of ['/ask', '/methodology']) assert.doesNotMatch(html(path), /human-reviewed/);
  const links = [...home.matchAll(/href="(\/questions\/[^"#]+)#source-ledger"/g)];
  assert.ok(links.length > 0, 'product preview exposes the full source ledger');
  for (const [, path] of links) assert.match(html(path), /id="source-ledger"/);
});
