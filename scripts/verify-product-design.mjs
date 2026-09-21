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
  assert.match(page, /class="cite-with-punctuation"><a class="cite"[\s\S]*?<\/a>[.,;:!?)]<\/span>/, 'citation punctuation stays with its marker');
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

test('question pages emit QAPage JSON-LD that respects reviewState', () => {
  const page = html('/questions/replacement-cost-vs-market-value');
  assert.match(page, /"@type":"QAPage"/);
  assert.match(page, /"@type":"Question"/);
  assert.match(page, /"@type":"Answer"/);
  assert.match(page, /What is the difference between replacement cost and market value\?/);
  assert.doesNotMatch(page, /"reviewedBy"/);
  assert.doesNotMatch(page, /"@type":"FAQPage"/);
  assert.doesNotMatch(page, /"@type":"(?:AggregateRating|Review|Offer)"/);
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

test('no citation reports that a page was read before it was issued', () => {
  // Every citable page, not a sample: a malformed date pair is invisible on the
  // page and only breaks later, inside whatever reference manager imports it.
  const citations = [...builtPages()].flatMap((route) => {
    const csl = html(route).match(/<pre[^>]*id="cite-csl"[^>]*>([\s\S]*?)<\/pre>/)?.[1];
    if(!csl) return [];
    let record;
    assert.doesNotThrow(() => { record = JSON.parse(decodeEntities(csl))[0]; }, `${route}: CSL export is valid JSON`);
    return [{ route, record }];
  });
  assert.ok(citations.length >= 185, `every citable page is covered (found ${citations.length})`);
  const stamp = (parts) => parts[0] * 10000 + (parts[1] ?? 0) * 100 + (parts[2] ?? 0);
  for(const { route, record } of citations) {
    const issued = record.issued?.['date-parts']?.[0];
    const accessed = record.accessed?.['date-parts']?.[0];
    assert.ok(issued && accessed, `${route}: citation carries both dates`);
    assert.ok(
      stamp(accessed) >= stamp(issued),
      `${route}: issued ${issued.join('-')} is after accessed ${accessed.join('-')}`,
    );
  }
});

test('a context index inherits the weakest review state of the records it gathers', () => {
  const hubs = readdirSync(fileURLToPath(new URL('../dist/industries', import.meta.url)), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  assert.ok(hubs.length >= 14, 'published context hubs exist');
  for(const id of hubs) {
    const recordPath = fileURLToPath(new URL(`../dist/industries/${id}.json`, import.meta.url));
    assert.ok(existsSync(recordPath), `/industries/${id}: machine record exists`);
    const record = JSON.parse(readFileSync(recordPath, 'utf8'));
    assert.ok(['reviewed','under-review','corrected'].includes(record.reviewState), `${id}: record states a review state`);
    const page = html(`/industries/${id}`);
    assert.doesNotMatch(page,/"reviewedBy"/,`${id}: pending review must not become a structured-data endorsement`);
    // The page's own citation must not out-claim the machine record it links to.
    if(record.reviewState !== 'reviewed') {
      for(const format of ['plain','bibtex','csl']) {
        const text = page.match(new RegExp(`<pre[^>]*id="cite-${format}"[^>]*>([\\s\\S]*?)</pre>`))?.[1];
        assert.ok(text,`${id}: ${format} export exists`);
        assert.doesNotMatch(text,/Last reviewed/,`${id}: ${format} must not export an unfinished review as completed`);
      }
    }
    if(record.reviewState === 'under-review') {
      for(const format of ['plain','bibtex','csl']) {
        const text = page.match(new RegExp(`<pre[^>]*id="cite-${format}"[^>]*>([\\s\\S]*?)</pre>`))?.[1];
        assert.match(text,/Editorial review pending/,`${id}: ${format} states the open review`);
      }
      assert.match(page,/Under review/,`${id}: the visible band agrees with the export`);
    }
  }
});

test('every in-page link lands on a section that exists', () => {
  // A dead fragment is invisible in review: the link renders, the cursor
  // changes, the click does nothing. It also silently disables the record
  // scroll-spy, which resolves each nav item with getElementById.
  let checked = 0;
  const dangling = [];
  const duplicated = [];
  for(const route of builtPages()) {
    // Fragments inside svg use xlink targets, and script bodies are not markup.
    const markup = html(route).replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
    const ids = [...html(route).matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const unique = new Set(ids);
    for(const id of unique) if(ids.filter((value) => value === id).length > 1) duplicated.push(`${route} #${id}`);
    for(const match of markup.matchAll(/href="#([^"]*)"/g)) {
      if(match[1] === '') continue;
      checked++;
      if(!unique.has(decodeURIComponent(match[1]))) dangling.push(`${route} -> #${match[1]}`);
    }
  }
  assert.ok(checked >= 400, `in-page links are actually being checked (found ${checked})`);
  assert.deepEqual(dangling, [], `in-page links with no target:\n  ${dangling.slice(0, 12).join('\n  ')}`);
  // An anchor can only resolve to one element, so uniqueness is part of the same promise.
  assert.deepEqual(duplicated, [], `duplicate ids:\n  ${duplicated.slice(0, 12).join('\n  ')}`);
});

test('every page has one main landmark, one h1, and an outline with no gaps', () => {
  // Whole-site, because the hand-listed landmark check above covers seven design
  // routes and the two specimens that nested a second <main> were not among them.
  // A reader navigating by landmark or by heading level is the one who pays.
  let checked = 0;
  const twoMains = [];
  const badH1 = [];
  const skips = [];
  for(const route of builtPages()) {
    // An svg can carry its own <title>; script bodies and comment text are not
    // markup, and a tag named inside either is not an element on the page.
    const markup = html(route)
      .replace(/<svg[\s\S]*?<\/svg>/g, '')
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    checked++;
    const mains = (markup.match(/<main\b/g) || []).length;
    if(mains !== 1) twoMains.push(`${route} (${mains})`);
    const h1s = (markup.match(/<h1\b/g) || []).length;
    if(h1s !== 1) badH1.push(`${route} (${h1s})`);
    const levels = [...markup.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]));
    for(let i = 1; i < levels.length; i++) {
      if(levels[i] - levels[i - 1] > 1) { skips.push(`${route} (h${levels[i - 1]} -> h${levels[i]})`); break; }
    }
  }
  assert.ok(checked >= 800, `every built route is covered (found ${checked})`);
  assert.deepEqual(twoMains, [], `pages without exactly one main landmark:\n  ${twoMains.join('\n  ')}`);
  assert.deepEqual(badH1, [], `pages without exactly one h1:\n  ${badH1.join('\n  ')}`);
  assert.deepEqual(skips, [], `headings that skip a level:\n  ${skips.slice(0, 12).join('\n  ')}`);
});

test('the landmark list names the page\'s own regions, not its notes and mock panels', () => {
  // A landmark list is a table of contents for regions. An inline caveat and a
  // side panel drawn inside a product mock are neither, and two landmarks with
  // the same name — or an unnamed one beside others — cannot be told apart.
  let checked = 0;
  const ambiguous = [];
  const calloutLandmarks = [];
  for(const route of builtPages()) {
    const markup = html(route)
      .replace(/<svg[\s\S]*?<\/svg>/g, '')
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    checked++;
    // A landmark is an element *or* a role attribute. Reading only the elements
    // missed every role="search" form on the site, which is how 1,787 unnamed
    // search landmarks survived this check.
    const groups = {
      nav: [...markup.matchAll(/<nav\b[^>]*>/g)].map((match) => match[0]),
      aside: [...markup.matchAll(/<aside\b[^>]*>/g)].map((match) => match[0]),
    };
    for(const match of markup.matchAll(/<[a-z]+\b[^>]*\srole="([a-z]+)"[^>]*>/g)) {
      if(!['search', 'navigation', 'complementary', 'region', 'form', 'banner', 'contentinfo'].includes(match[1])) continue;
      (groups[match[1]] ??= []).push(match[0]);
    }
    for(const [kind, elements] of Object.entries(groups)) {
      if(elements.length < 2) continue;
      // Resolve aria-labelledby to the text it points at: two landmarks whose
      // different ids resolve to the same words are still indistinguishable.
      const names = elements.map((element) => {
        const label = (element.match(/aria-label="([^"]*)"/) || [])[1];
        if(label) return label.trim();
        const ref = (element.match(/aria-labelledby="([^"]*)"/) || [])[1];
        if(!ref) return undefined;
        return ref.split(/\s+/).map((id) => {
          const target = markup.match(new RegExp(`\\sid="${id}"[^>]*>([\\s\\S]*?)<\\/`));
          return target ? target[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : `#${id}`;
        }).join(' ').trim() || `#${ref}`;
      });
      if(names.some((name) => !name)) ambiguous.push(`${route}: an unnamed ${kind} landmark beside ${elements.length - 1} more`);
      const repeated = names.filter(Boolean).filter((name, i, all) => all.indexOf(name) !== i);
      if(repeated.length) ambiguous.push(`${route}: two ${kind} landmarks both named "${repeated[0]}"`);
    }
    for(const match of markup.matchAll(/<aside\b[^>]*>/g)) {
      if(/class="[^"]*\bcallout\b/.test(match[0])) calloutLandmarks.push(route);
    }
  }
  assert.ok(checked >= 800, `every built route is covered (found ${checked})`);
  assert.deepEqual(ambiguous, [], `landmarks a reader cannot tell apart:\n  ${ambiguous.slice(0, 12).join('\n  ')}`);
  assert.deepEqual(calloutLandmarks, [], `inline caveats published as landmarks on:\n  ${[...new Set(calloutLandmarks)].slice(0, 6).join('\n  ')}`);
  // The note keeps its name; it just stops claiming to be a region.
  const withCallout = html('/methodology');
  assert.match(withCallout, /<div class="callout callout-[a-z]+" role="note" aria-label="[^"]+"/, 'a callout is a named note');
});

test('the Kind tag pill is never worn by a container', () => {
  // `.kind` in instrument.css is an inline-flex chip that sets white-space:
  // nowrap. A verification sheet used the same class for the section grouping
  // its records, so the chip's nowrap inherited into every sentence and the
  // page ran thousands of pixels wide at every viewport. The pill belongs on a
  // span with a kind-<modifier>; a container must not borrow the name.
  const sheets = [...builtPages()].filter((route) => /^\/review-queue\/./.test(route));
  assert.ok(sheets.length >= 300, `verification sheets are covered (found ${sheets.length})`);
  let grouped = 0;
  const containers = [];
  for(const route of builtPages()) {
    const markup = html(route).replace(/<!--[\s\S]*?-->/g, '');
    for(const match of markup.matchAll(/<([a-z]+)\b[^>]*\sclass="([^"]*)"/g)) {
      const classes = match[2].split(/\s+/);
      if(!classes.includes('kind')) continue;
      const modifier = classes.some((name) => /^kind-./.test(name));
      if(match[1] !== 'span' || !modifier) containers.push(`${route}: <${match[1]} class="${match[2]}">`);
    }
  }
  for(const route of sheets) if(html(route).includes('class="kind-group"')) grouped++;
  // Sheets with no grouped records render no section at all, so require most, not all.
  assert.ok(grouped >= sheets.length * 0.9, `verification sheets group records under kind-group (${grouped}/${sheets.length})`);
  assert.deepEqual(containers, [], `the Kind tag pill applied to a non-pill element:\n  ${containers.slice(0, 8).join('\n  ')}`);
});

test('an unlaunched route says so above the fold, not only in its footer', () => {
  // The indexing posture was already truthful, but a reader who lands on a
  // preview URL never sees a robots directive. Before this, the only visible
  // status was the footer's "Preview build" paragraph, ~97% of the way down a
  // question page: somebody reading a sourced answer about their own insurance
  // had no way to tell, from what was on screen, that this is unlaunched.
  //
  // The status and the noindex tag are driven by the same flag, so this asserts
  // they agree on every route rather than trusting that they were wired up once.
  let previewPages = 0;
  const missing = [];
  const buried = [];
  const mismatched = [];
  for(const route of builtPages()) {
    const page = html(route);
    const isPreviewBuild = /<body[^>]*data-site-env="preview"/.test(page);
    const hasStatus = page.includes('data-development-status');
    const isNoindex = /<meta name="robots" content="[^"]*noindex/.test(page);
    if(!isPreviewBuild) {
      // Production posture is governed by the launch gate, not by this banner.
      if(hasStatus) mismatched.push(`${route}: development status on a production build`);
      continue;
    }
    previewPages++;
    if(!isNoindex) mismatched.push(`${route}: preview build without noindex`);
    if(!hasStatus) { missing.push(route); continue; }
    // Above the fold means before the header and the main landmark, not merely
    // present somewhere in the document.
    const statusAt = page.indexOf('data-development-status');
    const mainAt = page.indexOf('<main');
    const headerAt = page.indexOf('<header');
    if(statusAt > mainAt || (headerAt !== -1 && statusAt > headerAt)) buried.push(route);
  }
  assert.ok(previewPages >= 800, `every preview route is covered (found ${previewPages})`);
  assert.deepEqual(missing, [], `unlaunched routes with no visible status:\n  ${missing.slice(0, 8).join('\n  ')}`);
  assert.deepEqual(buried, [], `status rendered below the header or main:\n  ${buried.slice(0, 8).join('\n  ')}`);
  assert.deepEqual(mismatched, [], `visible status and indexing posture disagree:\n  ${mismatched.slice(0, 8).join('\n  ')}`);
  // It has to say the three things that make it truthful rather than decorative.
  const home = html('/');
  assert.match(home, /In development\./, 'the status names the state');
  assert.match(home, /not launched/, 'the status says the site is not launched');
  assert.match(home, /nothing here is insurance advice or an offer of coverage/, 'the status refuses solicitation');
});

const pageFile = (path) => fileURLToPath(new URL(`../dist${path === '/' ? '' : path}/index.html`, import.meta.url));
const html = (path) => readFileSync(pageFile(path), 'utf8');

/** Every built route, so a whole-site invariant cannot be satisfied by a sample. */
function* builtPages(dir = fileURLToPath(new URL('../dist', import.meta.url)), route = '') {
  for(const entry of readdirSync(dir, { withFileTypes: true })) {
    if(entry.isDirectory()) yield* builtPages(`${dir}/${entry.name}`, `${route}/${entry.name}`);
    else if(entry.name === 'index.html') yield route || '/';
  }
}

const decodeEntities = (text) =>
  text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

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

test('ask examples are GET links to sourced answers', () => {
  const page = html('/ask');
  assert.match(page, /Try one of these/);
  assert.match(page, /href="\/questions\/[^"]+"[^>]*data-example=/);
  assert.doesNotMatch(page, /<button[^>]*data-example=/);
});

test('live Ask chrome uses Ask a question, not Ask Birch', () => {
  const home = html('/');
  assert.match(home, /class="[^"]*header-ask-cta[^"]*"[^>]*>Ask a question/);
  assert.doesNotMatch(home, /class="[^"]*header-ask-cta[^"]*"[^>]*>Ask Birch/);
  const industries = html('/industries');
  assert.match(industries, /class="btn btn-primary"[^>]*>Ask a question/);
  assert.doesNotMatch(industries, /class="btn btn-primary"[^>]*>Ask Birch/);
});

test('the front door makes the consumer action primary and the professional path quiet', () => {
  const home = html('/');
  const frontDoor = home.match(/<section[^>]+class="[^"]*front-door[^"]*"[\s\S]*?<\/section>/)?.[0];
  assert.ok(frontDoor, 'front door exists');
  for (const id of ['question-path', 'expertise-path']) assert.match(frontDoor, new RegExp(`id="${id}"`));
  assert.match(frontDoor, /<form action="\/ask"[^>]*method="get"[\s\S]*<button class="btn btn-primary"[^>]*>Ask a question/);
  assert.match(frontDoor, /class="question-starters"/);
  assert.match(frontDoor, /href="\/ask\?q=/);
  assert.doesNotMatch(frontDoor, /data-starter/);
  assert.doesNotMatch(frontDoor, /<script/);
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
