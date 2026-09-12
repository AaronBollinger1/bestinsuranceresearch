import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pagePatterns } from '../src/lib/product-design.ts';
import { productDesign } from '../src/config/product-design.ts';

test('the selected Direction A is the homepage, not an undecided alternative', () => {
  assert.equal(productDesign.direction, 'focus');
  const home = html('/');
  assert.match(home, /data-design-direction="focus"/);
  assert.doesNotMatch(home, /data-design-direction="(?:editorial|explore)"/);
  assert.match(html('/design/product-system'), /A \/ Focus[^<]*Selected/);
  assert.doesNotMatch(html('/design/product-system'), /Compare landing directions/);
  assert.equal(pagePatterns.find(pattern => pattern.title === 'Landing').href, '/');
});

function assertLocalDraftBoundary(page) {
  const draft = page.match(/<form\b[^>]*id="contribution-form"[^>]*>[\s\S]*?<\/form>/)?.[0];
  assert.ok(draft, 'local contribution form exists');
  assert.match(draft, /<fieldset\b[^>]*id="draft-fields"[^>]*\sdisabled(?:\s|>)/, 'draft fields fail closed without JavaScript');
  assert.doesNotMatch(draft, /<(?:input|button)\b[^>]*type="submit"/, 'preview is not a network submit');
  for (const tag of draft.matchAll(/<(?:input|textarea|select)\b[^>]*>/g)) {
    assert.doesNotMatch(tag[0], /type="(?:email|file)"/, 'no contact or document intake');
    assert.ok(!/\sname=/.test(tag[0]) || /type="radio"/.test(tag[0]), 'draft prose cannot become successful form fields');
  }
}

test('contribution preview fails closed and provides write, preview, and clear states', () => {
  const page = html('/contribute');
  assertLocalDraftBoundary(page);
  // Prove the check rejects the safety regression, rather than passing vacuously.
  assert.throws(() => assertLocalDraftBoundary(page.replace(/(<fieldset\b[^>]*id="draft-fields"[^>]*?)\sdisabled/, '$1')));
  assert.match(page, /<section\b[^>]*id="draft-preview"[^>]*\shidden/);
  for (const target of ['preview-draft','edit-draft','confirm-clear','cancel-clear','draft-private-check']) assert.match(page, new RegExp(`id="${target}"`));
  assert.match(page, /Text is lost when you leave or reload/);
  assert.match(page, /does not detect or redact sensitive information/);
  assert.match(page, /<noscript>/);
});

test('professional entry does not turn an illustrative profile into verification', () => {
  const page = html('/professionals');
  assert.match(page, /Illustrative contributor profile/);
  assert.match(page, /Not yet verified/);
  assert.doesNotMatch(page, /Credential verified/);
  for (const type of ['research','correction']) assert.match(page, new RegExp(`href="/contribute\\?type=${type}"`));
});

test('reading pages retain one source inspector and permanent source targets', () => {
  for (const family of ['companies','questions']) {
    const directory = fileURLToPath(new URL(`../dist/${family}/`, import.meta.url));
    for (const entry of readdirSync(directory,{withFileTypes:true}).filter(entry=>entry.isDirectory())) {
      const page = readFileSync(`${directory}${entry.name}/index.html`,'utf8');
      assert.equal((page.match(/id="source-inspector"/g)||[]).length,1,`${family}/${entry.name}: exactly one source dialog`);
      assert.equal((page.match(/id="cite-this-page"/g)||[]).length,1,`${family}/${entry.name}: one citation target`);
      assert.match(page,/aria-label="Record sections"/);
      assert.match(page,/id="source-ledger"/);
      assert.match(page,/id="source-1"/);
      assert.doesNotMatch(page,/<section[^>]+class="[^"]*company-dossier-band/);
    }
  }
});

test('citation exports distinguish assigned review from completed review', () => {
  for(const path of ['/companies/farmers-insurance-exchange','/questions/am-i-an-applicable-large-employer']) {
    const page = html(path);
    assert.doesNotMatch(page,/"reviewedBy"/,'pending review must not become a structured-data endorsement');
    for(const format of ['plain','bibtex','csl']) {
      const text = page.match(new RegExp(`<pre[^>]*id="cite-${format}"[^>]*>([\\s\\S]*?)</pre>`))?.[1];
      assert.ok(text,`${path}: ${format} export exists`);
      assert.match(text,/Editorial review pending/);
      assert.doesNotMatch(text,/Last reviewed/);
    }
  }
});

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
