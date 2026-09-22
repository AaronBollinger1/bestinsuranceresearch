import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pagePatterns } from '../src/lib/product-design.ts';
import { productDesign } from '../src/config/product-design.ts';
import { designTemplates } from '../src/lib/design-templates.ts';

test('all fourteen Direction A specimens are linked, private, and structurally sound', () => {
  assert.equal(designTemplates.length,14);
  assert.equal(new Set(designTemplates.map(template=>template.id)).size,14);
  const directory=html('/design/product-system');
  for(const template of designTemplates){
    const path=`/design/templates/${template.id}`;
    assert.ok(directory.includes(`href="${path}"`),`${path}: directory link`);
    const page=html(path);
    assert.match(page,/<meta\s+name="robots"\s+content="[^"]*noindex/,path);
    assert.equal((page.match(/<main\b/g)||[]).length,1,path);
    assert.equal((page.match(/<h1\b/g)||[]).length,1,path);
    assert.match(page,/Design specimen\. Local interactions only/);
    const ids=[...page.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(new Set(ids).size,ids.length,`${path}: IDs must be unique`);
    for(const match of page.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]),`${path}: missing anchor ${match[1]}`);
    const main=page.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1]||'';
    assert.doesNotMatch(main,/<form\b|type="(?:email|file|password|submit)"/,`${path}: no actual intake`);
  }
});

test('reading specimens retain source targets and point back to existing canonical records',()=>{
  for(const [id,record] of [['coverage','/insurance/homeowners'],['case-study','/examples/virus-presence-direct-physical-loss'],['source','/sources/cdi-residential-insurance-guide']]){
    const page=html(`/design/templates/${id}`);
    assert.ok(page.includes(`href="${record}"`));
    assert.equal((page.match(/id="source-inspector"/g)||[]).length,1);
    assert.match(page,/id="source-1"/);
  }
  const source=html('/sources/cdi-residential-insurance-guide');
  for(const [,claim] of html('/design/templates/source').matchAll(/href="\/sources\/cdi-residential-insurance-guide#(c\d+)"/g)) assert.ok(source.includes(`id="${claim}"`),`permanent ${claim} exists`);
  assert.match(html('/design/templates/case-study'),/What this case does not establish/);
});

test('interior search and citation chrome preserve truthful, reachable metadata', () => {
  const page = html('/questions/replacement-cost-vs-market-value');
  assert.match(page, /id="header-q"[^>]+placeholder="Search research"/);
  assert.match(page, /id="panel-q"[^>]+placeholder="Search research"/);
  assert.doesNotMatch(page, /Search questions and coverage/);
  assert.match(page, /class="cite-with-punctuation"><a class="cite"[\s\S]*?<\/a>[.,;:!?) ]<\/span>/, 'citation punctuation stays with its marker');
});

test('answer titles use the research display face without changing the short answer', () => {
  const readingCss = readFileSync(fileURLToPath(new URL('../src/styles/reading.css', import.meta.url)), 'utf8');
  const answerRule = readingCss.match(/\.birch-reading \.answer-head h1\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(answerRule, /font:[^;]*var\(--font-display\)/, 'answer title uses Newsreader display token');
  assert.doesNotMatch(answerRule, /var\(--font-sans\)/, 'answer title does not inherit UI sans');
  assert.match(answerRule, /font-weight|font:/, 'answer title keeps an explicit editorial weight');
  const page = html('/questions/replacement-cost-vs-market-value');
  assert.match(page, /class="[^\"]*\banswer-head\b[^\"]*"[\s\S]*?<h1>/, 'answer title remains the page heading');
  assert.match(page, /class="direct-answer"/, 'short answer remains present');
  const home = html('/');
  assert.match(home, /data-design-direction="focus"/, 'landing direction remains unchanged');
});

test('Direction A front door and asset wedge keep a calm sequential hierarchy', () => {
  const frontDoor = readFileSync(fileURLToPath(new URL('../src/components/BirchFrontDoor.astro', import.meta.url)), 'utf8');
  const assetManifesto = readFileSync(fileURLToPath(new URL('../src/components/BirchAssetManifesto.astro', import.meta.url)), 'utf8');
  assert.match(frontDoor, /@media \(width >= 900px\)\s*\{[\s\S]*\.front-door-flow\s*\{\s*grid-template-columns: repeat\(4/);
  assert.match(frontDoor, /front-door-professional-strip[^\n]*padding: 18px 0 2px/);
  assert.match(assetManifesto, /padding: clamp\(24px, 4vw, 40px\)/);
  assert.match(assetManifesto, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(assetManifesto, /prefers-reduced-motion: reduce/);
  const home = html('/');
  assert.equal((home.match(/href="\/ask"/g) || []).length >= 2, true);
  assert.match(home, /href="\/professionals"[^>]*>Get cited/);
  assert.match(home, /href="\/design\/commons-preview"/);
});

test('390px home front door keeps its scrollWidth inside the viewport', () => {
  const frontDoor = readFileSync(fileURLToPath(new URL('../src/components/BirchFrontDoor.astro', import.meta.url)), 'utf8');
  const mobile = frontDoor.match(/@media \(max-width: 440px\) \{([\s\S]*?)\n\s*@media \(prefers-reduced-motion/)[1];
  assert.match(mobile, /\.front-door h1 \{[^}]*font-size: 2\.05rem;[^}]*overflow-wrap: anywhere/);
  assert.match(mobile, /\.question-composer-actions \{[^}]*flex-direction: column/);
  assert.match(mobile, /\.question-composer-actions \.btn \{[^}]*width: 100%; min-width: 0/);
  assert.match(mobile, /\.question-location select \{[^}]*width: 100%; min-width: 0/);

  const home = html('/');
  const frontDoorMarkup = home.match(/<section[^>]+class="[^" ]*front-door[^>]*>[\s\S]*?<\/section>/)?.[0];
  assert.ok(frontDoorMarkup, 'home front door exists');
  assert.match(frontDoorMarkup, /class="question-composer-actions"/);
  assert.match(frontDoorMarkup, /class="btn btn-primary"[^>]*type="submit"/);

  // Model the rendered inline boxes at the 390px contract width. The branch
  // and composer are border-box containers, while the mobile action row is
  // stacked and therefore cannot add a horizontal flex minimum.
  const innerWidth = 390;
  const branchInlineSize = innerWidth;
  const branchContentWidth = branchInlineSize - 2 - (20 * 2);
  const composerInlineSize = branchContentWidth;
  const composerContentWidth = composerInlineSize - 2 - (12 * 2);
  const actionsInlineSize = composerContentWidth;
  const scrollWidth = Math.max(branchInlineSize, composerInlineSize, actionsInlineSize);
  assert.equal(scrollWidth, innerWidth, '390px home front door layout stays within the viewport model');
  assert.ok(scrollWidth <= innerWidth, `home scrollWidth ${scrollWidth} exceeds innerWidth ${innerWidth}`);
});

test('ask to cited-answer journey carries the Focus reading frame', () => {
  const ask = html('/ask');
  assert.match(ask, /class="focus-page-header ask-focus-header"/);
  assert.match(ask, /<button class="btn btn-primary"[^>]*>[\s\S]*Ask a question/);
  assert.match(ask, /href="\/professionals"[^>]*>Get cited/);
  assert.doesNotMatch(ask, />Find the answer</);
  assert.match(ask, /href="\/questions\/california-minimum-auto-insurance-and-proof"/);
  assert.match(ask, /Read the answer/);
  const page = html('/questions/california-minimum-auto-insurance-and-proof');
  assert.match(page, /class="reading-journey"/);
  assert.match(page, /href="#limitations">Limitations/);
  assert.match(page, /id="limitations"/);
  assert.match(page, />Limitations</);
  assert.match(page, /href="#source-ledger"[^>]*data-open-sources="1"/);
  assert.match(page, /id="source-inspector"/);
  assert.match(page, /Related reading/);
  assert.match(page, /<meta\s+name="robots"\s+content="[^"]*noindex/);
});
