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

test('account and workflow specimens explicitly expose recovery and no-side-effect states',()=>{
  for(const state of ['email','inbox','profile','expired','failure']) assert.ok(html('/design/account-preview').includes(`data-account-panel="${state}"`));
  for(const state of ['start','consent','review','cancelled']) assert.ok(html('/design/templates/your-coverage').includes(`data-coverage-panel="${state}"`));
  for(const id of ['contributor','company-partner','research-desk','moderation']){
    const page=html(`/design/templates/${id}`);
    assert.doesNotMatch(page,/Credential verified|Company verified|Verified policyholder/);
  }
  for(const id of ['research-desk','moderation']) assert.match(html(`/design/templates/${id}`),/No approval, removal, notice, or publication occurred/);
  const saved=html('/design/templates/saved');
  for(const attr of ['data-library-empty','data-undo-save','data-preference-status']) assert.ok(saved.includes(attr));
});

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
  assert.match(draft, /method="get"/, 'type selection is GET-first');
  assert.match(draft, /action="\/contribute"/);
  assert.doesNotMatch(draft, /<fieldset\b[^>]*id="draft-fields"[^>]*\sdisabled(?:\s|>)/, 'draft fields work without JavaScript');
  assert.doesNotMatch(draft, /<(?:input|button)\b[^>]*type="submit"/, 'preview is not a network submit');
  for (const tag of draft.matchAll(/<(?:input|textarea|select)\b[^>]*>/g)) {
    assert.doesNotMatch(tag[0], /type="(?:email|file)"/, 'no contact or document intake');
    assert.ok(!/\sname=/.test(tag[0]) || /type="radio"/.test(tag[0]), 'draft prose cannot become successful form fields');
  }
}

test('contribution preview fails closed and provides write, preview, and clear states', () => {
  const page = html('/contribute');
  assertLocalDraftBoundary(page);
  assert.throws(() => assertLocalDraftBoundary(page.replace('id="contribution-title"', 'name="title" id="contribution-title"')));
  assert.match(page, /<section\b[^>]*id="draft-preview"[^>]*\shidden/);
  for (const target of ['preview-draft','edit-draft','confirm-clear','cancel-clear','draft-private-check']) assert.match(page, new RegExp(`id="${target}"`));
  assert.match(page, /Text is lost when you leave or reload/);
  assert.match(page, /does not detect or redact sensitive information/);
  assert.match(page, /<noscript>/);
  assert.match(page, /cannot send them/);
  assert.match(page, /Citations/);
  assert.match(page, />0</);
  assert.match(page, /Not live/);
  assert.match(page, /Contributor profile/);
  assert.match(page, /There is no moderation queue on this origin/);
  assert.match(page, /Accounts and posting stay closed/);
});

test('professional entry does not turn an illustrative profile into verification', () => {
  const page = html('/professionals');
  assert.match(page, /Illustrative contributor profile/);
  assert.match(page, /Not yet verified/);
  assert.doesNotMatch(page, /Credential verified/);
  for (const type of ['research','correction']) assert.match(page, new RegExp(`href="/contribute\\?type=${type}"`));
});

test('reading pages retain one source inspector and permanent source targets', () => {
  for (const family of ['companies','questions','insurance']) {
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

test('canonical coverage reading frame stays preview-only and navigation-safe', () => {
  const page = html('/insurance/homeowners');
  assert.match(page, /<body[^>]+class="birch-reading"/);
  assert.match(page, /<meta\s+name="robots"\s+content="[^"]*noindex/);
  assert.doesNotMatch(page, /product-context-bar/);
  assert.match(page, /aria-label="Record sections"/);
  assert.match(page, /href="#definition"/);
  assert.match(page, /href="#source-ledger"/);
  assert.match(page, /href="\/insurance\/homeowners\.json"/);
  assert.equal((page.match(/id="source-inspector"/g) || []).length, 1);
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

test('the front door makes the consumer action primary and the professional path quiet', () => {
  const home = html('/');
  const frontDoor = home.match(/<section[^>]+class="[^"]*front-door[^"]*"[\s\S]*?<\/section>/)?.[0];
  assert.ok(frontDoor, 'front door exists');
  for (const id of ['question-path', 'expertise-path']) assert.match(frontDoor, new RegExp(`id="${id}"`));
  assert.match(frontDoor, /<form action="\/ask"[^>]*method="get"[\s\S]*<button class="btn btn-primary"[^>]*>Ask a question/);
  assert.equal((frontDoor.match(/class="btn btn-primary"/g) ?? []).length, 1, 'Ask a question is the only front-door primary action');
  assert.match(frontDoor, /id="expertise-path"[\s\S]*For insurance and financial professionals[\s\S]*Editorial review is required\.[\s\S]*Accepted contributions can earn attribution[\s\S]*publication is not guaranteed/);
  assert.match(frontDoor, /class="btn btn-quiet"[^>]*href="\/professionals"[^>]*>Get cited/);
  assert.match(frontDoor, /href="\/contribute\?type=research"[^>]*>Prepare a private draft/);
  assert.match(frontDoor, /Question[\s\S]*Sources[\s\S]*Answer[\s\S]*Discussion/);
  assert.doesNotMatch(frontDoor, /front-door-switcher|Choose your starting point|front-door-branch-expertise|I share financial expertise\./);
  assert.doesNotMatch(frontDoor, /Explore publishing/);
  for (const path of ['/ask', '/sources', '/questions/replacement-cost-vs-market-value', '/design/commons-preview', '/professionals', '/contribute?type=research']) {
    assert.match(frontDoor, new RegExp(`href="${path.replace(/[?]/g, '\\?')}"`), path);
  }
  assert.doesNotMatch(frontDoor, /backlinks?|live comments|credential verified|personalized advice/i);
});

test('the homepage second act offers policy paths and private contribution without a second filled primary', () => {
  const home = html('/');
  const second = home.match(/<section[^>]+id="understand-policy"[\s\S]*?<\/section>/)?.[0];
  assert.ok(second, 'understand-policy unit exists');
  assert.match(second, /Understand your policy/);
  assert.match(second, /href="\/questions\/homeowners-earthquake-california"/);
  assert.match(second, /href="\/contribute\?type=experience"[^>]*>Share an experience/);
  assert.match(second, /href="\/professionals"[^>]*>Get cited/);
  assert.doesNotMatch(second, /class="btn btn-primary"/);
  assert.match(home, /href="\/contribute\?type=experience"/);
  assert.doesNotMatch(home, /Explore contributing/);
  assert.match(home, /Signup and posting stay closed/);
  assert.doesNotMatch(second, /get a quote|personalized advice|live comments/i);
});

test('the asset-protection manifesto is semantic, existing-route-only, and honest about gated features', () => {
  const home = html('/');
  const manifesto = home.match(/<section[^>]+id="asset-protection"[\s\S]*?<\/section>/)?.[0];
  assert.ok(manifesto, 'manifesto unit exists');
  assert.match(manifesto, /id="manifesto-title"/);
  assert.match(manifesto, /Ensure your assets are[\s\S]*protected/);
  assert.equal((manifesto.match(/<h2\b/g) ?? []).length, 1, 'one heading');
  assert.doesNotMatch(manifesto, /Insure your assets/);
  assert.doesNotMatch(manifesto, /asset-manifesto-from|data-manifesto-stage/);
  assert.doesNotMatch(manifesto, /<script/);
  for (const layer of ['Coverage', 'Prevention', 'Documentation', 'Contracts', 'Planning', 'Mitigation', 'Recovery']) {
    assert.match(manifesto, new RegExp(layer));
  }
  for (const scope of ['Insurance and carriers', 'Claims and adjusting', 'Financial planning', 'Tax', 'Legal', 'Real estate and mortgage', 'Employee benefits', 'Business finance']) {
    assert.match(manifesto, new RegExp(scope));
  }
  assert.match(manifesto, /href="\/ask"/);
  assert.equal((manifesto.match(/href="\/professionals"/g) ?? []).length, 1, 'Get cited is the single professional action');
  assert.match(manifesto, /href="\/professionals"[^>]*>Get cited/);
  assert.equal((manifesto.match(/class="asset-manifesto-scope-label"/g) ?? []).length, 8, 'all eight scopes are semantic labels');
  assert.match(manifesto, /not individualized advice/);
  assert.match(manifesto, /fiduciary or attorney-client relationship/);
  assert.match(manifesto, /Moderated discussion remains a separate Community preview/);
  assert.match(manifesto, /does not collect or deliver leads/);
  assert.doesNotMatch(manifesto, /href="\/(?:lens|position|network|shelf)"/);
  assert.doesNotMatch(manifesto, /backlinks?|guarantee|live comments|credential verified|personalized advice|get a quote/i);
  const hrefs = [...manifesto.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  assert.doesNotMatch(manifesto, /<a[^>]+>(?:Insurance and carriers|Claims and adjusting|Financial planning|Tax|Legal|Real estate and mortgage|Employee benefits|Business finance)<\/a>/);
  for (const href of hrefs) {
    assert.ok(href.startsWith('/') || href.startsWith('#'), href);
    assert.doesNotMatch(href, /^\/(?:lens|position|network|shelf)(?:[/?#]|$)/);
  }
});
