# Birch design / SEO / GEO audit - 2026-09-30

Read-only audit of `birch-b1-knowledge-graph-20260925`. The goal this ranks against (owner priority): **Birch becomes the source that answer engines (ChatGPT, Perplexity, Google AI features, Claude) cite for insurance, because its citation model and proof of trust are unmistakable.** Every finding is ranked by how much it helps a machine find, parse, trust, quote and attribute a Birch claim correctly. Aesthetics and SEO count only where they serve that.

**Build measured.** `dist/` was rebuilt by another process at 12:01 while this audit ran. Counts below come from that later build unless marked "(979 build)": 1,203 HTML files, 772 non-design and non-review-queue pages, 402 source records, 2,382 claims, 90 questions, 37 coverage pages. Scan scripts are in the scratchpad (`scan.mjs`, `an1.mjs`, `an2.mjs`, `lede.mts`, `sa.mts`). Screenshots are in `scratchpad/audit-shots/`. The live checks (overflow, contrast, keyboard) ran in Chrome DevTools against the existing `astro preview` on :4767.

**Out of scope, by rule.** Dark mode, hero video, photos or illustrations, generated imagery, radius above 8px, FAQPage/Review/Rating/ClaimReview/Offer, ratings/rankings/prices, opening indexing, third-party scripts, and any Bollinsure lead CTA on the Record. None of the fixes below needs any of them.

---

## 1. State of the site

The citation contract is well designed, and most of it is enforced. There are 140+ `verify.mjs` tests and 29 product-design tests. Every claim has a positional address with a matching HTML anchor and a 12-hex checksum. Every record has a `.json` companion that the page advertises with `<link rel="alternate">`, and 487 pages carry it (979 build). Canonicals are single and self-referential. There is a frozen, digest-checked dataset release. The HTML shows review state, dates, the assigned reviewer and "what it cannot decide" without JavaScript. The rule set holds throughout: no banned schema, no third-party scripts, fonts self-hosted.

**The gap is the last hop, and it is the hop an answer engine takes.** A Birch page says "the claim is the citable unit", but no sentence on any answer page is linked to a claim. Question and coverage pages cite *sources* (`[3]` goes to `#source-3`, then to `/sources/id`), never `/sources/id#cN`. The JSON companions and `llms-full.txt` carry no claim addresses or checksums. `claims.json` records "reliedOnBy" at source granularity, so each page is listed as relying on *every* claim of every source it cites. On top of that:

- The machine layer contradicts the review state it claims to protect: 196 of 196 companions export `lastReviewed` while `reviewState` is `under-review`.
- The answer text an engine would quote is cut mid-clause in 57 of 90 QAPage nodes.
- A class collision makes the Numbers layer unreadable to humans: every amount on `/figures`, and the stat band on 64 hub pages, is ink on ink.

Fix the wiring from claim to page and the machine review-state wording, and the proof of trust becomes checkable by a machine end to end. Right now it is checkable only by a patient human.

Visual and interaction state is solid. At a true 390px, scrollWidth equals the viewport on all 19 routes checked. Menus close on Escape and return focus. Guide tabs support Arrow keys, Home and End with roving tabindex. The debt is in design-system consistency:

- Gold is used as generic section-heading colour.
- The under-review chip is almost the same hue as gold.
- `--faint` fails AA on cream.
- Radius goes above 8px in about 20 places.
- Several animations exceed the motion tokens.

---

## 2. Findings, ranked by citability impact

Each finding gives: id, area, evidence, files, fix, and the verify rule that would hold it (the build fails if it regresses). "Held today" means an existing test already covers part of it.

### Tier A: a machine cannot correctly attribute or trust a claim

**F1. Answer pages never link a sentence to a claim, and the page says they do.** (GEO, citation model)
- **Evidence:**
  - `dist/questions/homeowners-earthquake-california/index.html` has 0 `data-claim-uri` and 0 `/sources/*#cN` hrefs. Citation links are `href="#source-3"`.
  - The source ledger lists every claim of each source as plain `<li>` text with no address. `SourceLedger.astro:71-73`: `source.data.claims.map((claim) => <li>{claim}</li>)`.
  - All 90 question pages still say "claim addresses visible in the source ledger" (`src/pages/questions/[slug].astro:173`). That sentence is false.
  - `claims.json` `reliedOnBy` is computed per source (`src/lib/machine.ts:441`). The earthquake question is listed as relying on 91 claims across 11 sources, including claims it never uses, such as the ACORD footer wording.
  - No citable HTML page carries a claim checksum. Checksums appear only in the `.json` files. Source pages show `claim id#cN` but not the checksum.
- **Why it matters:** an engine that follows a Birch citation reaches a source, not the sentence that supports the answer. The "cite the claim, carry the checksum" instruction in llms.txt, `/for-ai` and claims.json cannot be followed from any answer page. The inflated `reliedOnBy` misstates provenance, which is the one thing this brand sells.
- **Fix, phase 1 (one tick):**
  - In `SourceLedger.astro`, render each claim as `<li id="source-3-c2"><a href="/sources/<id>#c2" data-claim-uri=... data-checksum=...>`, with its text and the mono address plus checksum.
  - On source pages, add the checksum next to each `claim id#cN` (`src/pages/sources/[slug].astro`).
  - Change the `[slug].astro:173` copy so it only says what is true.
- **Fix, phase 2 (content, multi-tick):**
  - Extend the marker grammar to `[S:source-id#c3]` (the bare `[S:id]` stays valid).
  - Resolve these markers in `createCiter`, and link `cite` directly to the claim.
  - Compute `reliedOnBy` from claim-level markers.
  - Until then, rename the field `citedSourceOf` so it stops asserting claim-level use.
- **Verify rules:**
  - (a) Every rendered ledger claim has an `href` matching `/sources/<id>#c<n>` that resolves to an existing anchor, plus a `data-checksum` equal to the companion's checksum.
  - (b) No page text asserts "claim address" unless that page renders at least one `data-claim-uri`.
  - (c) After phase 2: every `[S:id#cN]` marker resolves to an existing claim. `reliedOnBy` for claim X lists only pages whose markers name X.

**F2. The machine layer says "last reviewed" while nothing is reviewed.** (GEO, trust state)
- **Evidence:**
  - All 196 review-bearing companions (questions, insurance, guides, companies, states, examples, tools) emit `"lastReviewed": "<date>"` with `"reviewState": "under-review"`. 0 records are reviewed.
  - Companions also emit `"reviewer": "Brian Bollinger"` with no "assigned" qualifier. The HTML correctly says "Reviewer (assigned)".
  - llms.txt says: "Only a completed review is described as last reviewed."
  - Held today, but only for llms.txt, llms-full and the HTML: `verify.mjs:1103` and `:144`. Not for companions.
- **Files:** `src/lib/machine.ts` (companion builders), `src/content.config.ts:189` (field name `lastReviewed` is really the record date).
- **Fix:**
  - In companions, emit `recordDate`, plus `reviewedOn` only when `reviewState === 'reviewed'`.
  - Emit `reviewer: { name, status: "assigned" | "signed-off" }`.
  - Add a top-level `limits` array (`"under-editorial-review"`, `"not-advice"`, `"not-a-coverage-determination"`) so a crawler can carry the qualifiers without parsing prose.
  - In JSON-LD, add `creativeWorkStatus: "Draft - editorial review pending"` on TechArticle/QAPage while under review. There are 0 today.
- **Verify rule:** for every `*.json` companion, if `reviewState !== 'reviewed'`, then there is no `lastReviewed` or `reviewedOn` key, `reviewer.status === 'assigned'`, and `limits` includes `under-editorial-review`. Every JSON-LD article or QAPage node for an unreviewed record carries `creativeWorkStatus`.

**F3. The quotable answer is cut mid-clause, and the lede is often uncited.** (GEO, quotability; SEO)
- **Evidence:**
  - The QAPage `acceptedAnswer.text` ends in "..." on 57 of 90 questions. Example: "...the wording insurers must use for the mandatory earthquake...". It is built from `metaDescription()` (`src/pages/questions/[slug].astro:54,82`).
  - `<meta name="description">` ends in "..." on 90 pages (57 questions, 9 coverage, 8 tools, 6 examples, 3 companies, others). `verify.mjs:4506` explicitly allows a trailing `...`.
  - `shortAnswer` has a median of 596 characters (max 1,976; 44 of 90 exceed 600). The schema says "2-5 sentences".
  - The first sentence exceeds 155 characters in 20 answers.
  - 72 of 90 lede sentences carry no citation marker. The verdict sentence that an engine lifts ("Generally no.", "Very little.") is the one sentence without a source.
- **Fix:**
  - Set `acceptedAnswer.text` to the full stripped `shortAnswer`. It is visible on the page, so this meets the schema.ts rule.
  - Add a content field `lede`: one whole sentence, at most 155 characters, carrying at least one marker.
  - Use `lede` for the meta description, `og:description`, `llms.txt` lines and the companion `lede` key.
  - Keep `shortAnswer` as the body.
- **Verify rules:**
  - (a) No JSON-LD `text`, `description` or `acceptedAnswer.text` ends with `...` or `...`.
  - (b) Every question has a `lede` of 50 to 155 characters that ends in sentence punctuation and contains `[S:`.
  - (c) Remove the `description.endsWith('...')` allowance from `verify.mjs:4506` once `lede` exists.

**F4. The canonical machine files do not carry claim addresses.** (GEO, one-hop retrieval)
- **Evidence:**
  - `llms-full.txt` (1 MB, the "full corpus index") contains 0 `#cN` addresses and 0 checksums.
  - Question and coverage companions list `sources[].supportsClaims` as bare strings, with no `claimId`, `canonicalUrl` or `checksum`. Only `/sources/<id>.json` and `claims.json` carry them.
  - `claims.json` claims do not inline `lastChecked`, `status` or the source URL. A consumer has to join them from `sources{}`.
- **Files:** `src/lib/machine.ts`, `src/pages/llms-full.txt.ts`, `src/pages/claims.json.ts`.
- **Fix:**
  - In every record companion, emit `supportsClaims` as `{claimId, canonicalUrl, checksum, text}`. Once F1 phase 2 lands, emit `usesClaims`: only the claims the record's markers name.
  - In llms-full, add a `claims:` line per entry, listing the addresses used (after F1 phase 2) or the source claim ranges (before it).
  - In claims.json, inline `sourceUrl`, `lastChecked`, `status` and `authorityLevel` on each claim, so one object is self-sufficient for attribution.
- **Verify rule:** every record companion's `supportsClaims[*]` has `claimId`, `canonicalUrl` and `checksum` equal to the source companion's. `llms-full.txt` contains at least one `#c` address per question entry. Every claims.json claim has `sourceUrl`, `lastChecked` and `status`.

**F5. Positional claim addresses have no append-only guard.** (GEO, citation stability)
- **Evidence:**
  - Address = array index (`verify.mjs:1906` asserts that the address *is* positional).
  - Append-only is holding by discipline today: 0 of 301 sources reordered since the prior build.
  - But `cfp-dwelling-policy#c19` in release 2026-09-09 now has different text under the same address. Old: "...among the covered perils, and states no maximum dwelling limit." New: "...among the covered perils shown and does not state a maximum dwelling limit on this page."
  - No history of that change is published anywhere.
  - No test fails if an agent inserts or deletes a claim mid-array. That would silently re-point every external citation, and other agents are adding claims right now (src has 2,159 claims against 1,915 in the 979 build).
- **Fix:**
  - Add optional `history: [{checksum, text, until}]` per claim (the claim becomes an object; see F15).
  - Render "revised since release X" on the source page and in the companion.
  - Deletion becomes a tombstone (`status: withdrawn`) that keeps its index.
- **Verify rule:** for the latest frozen release, every release `claimId` still exists. If its checksum differs, the live claim carries a `history` entry whose checksum equals the release checksum. No source's live claim count is lower than its release count.

**F6. The version signals are stale, so an engine cannot detect change.** (GEO, freshness)
- **Evidence:**
  - `contentVersion: '2026.08.31'` is hard-coded (`src/config/site.ts:139`) and stamped into every companion, llms.txt, the manifest and `/for-ai`. Meanwhile sources grew from 299 to 402 and claims from 1,905 to 2,382.
  - The latest frozen release, 2026-09-09, holds 1,905 claims. 477 live claims (20%) exist in no release, so they cannot be cited reproducibly.
- **Fix:**
  - Derive `contentVersion` from the build date plus a short hash of the claim corpus, or bump it by rule whenever a claim checksum set changes.
  - Cut a release. Publish `claimsSinceLatestRelease` in the manifest.
- **Verify rule:** `contentVersion` equals `hash(sorted claim checksums)` (or its date is on or after the maximum `lastChecked`/record date in the corpus). Fail, or at least warn, when claims not covered by the latest release exceed 10%.

**F7. Entity identity is inconsistent, and `sameAs` asserts the wrong thing.** (GEO, entity resolution)
- **Evidence:**
  - The Birch `Organization` node on every page has `sameAs: [bollinsure.com, bestho3.com, ... 9 URLs]` (`src/lib/schema.ts:32`, `src/config/site.ts:114`). schema.org `sameAs` means "the same entity". It tells an engine that Birch *is* bestho3.com and Bollinsure, which is the opposite of the independence argument.
  - This is enforced by `verify.mjs:1268`, which requires at least 5 sameAs entries including bollinsure.
  - There are three self-descriptions:
    - llms.txt: "A public insurance **advisory** instrument". "Advisory" also contradicts "not advice".
    - JSON-LD, the manifest and site.ts: "Free insurance research and community conversation... a person's experience...". This one contains a curly apostrophe, which breaks the ASCII rule.
    - The `/for-ai` lede, a third wording.
  - `meta name="author"` is the agency on every page, while JSON-LD says the author is Aaron Bollinger.
- **Fix:**
  - Remove `sameAs` from the Birch node.
  - Put the estate relationship on the `InsuranceAgency` node: `url` bollinsure.com, `sameAs` the eight specialty sites (the agency's own web presences), and keep `parentOrganization`.
  - Take one `identity.description` string from `site.ts`, in ASCII, and use it in llms.txt, the manifest, JSON-LD and `/for-ai`.
  - Set `meta author` to the record's author Person.
  - Rewrite test 1268 accordingly.
- **Verify rule:** the Birch Organization node has no `sameAs`, and the parent agency node carries the estate. The description string is byte-identical across llms.txt, citation-manifest.json and JSON-LD, and is ASCII. Record pages have `meta author` equal to the JSON-LD author name.

**F8. A Bollinsure lead CTA sits on 177 Record pages.** (Rule conflict; GEO trust)
- **Evidence:**
  - `src/components/Handoff.astro` renders "Need a licensed review?" with a filled primary "Call a broker on (562)...", "Request a quote from Bollinsure" (`bollinsure.com/quote?utm_source=birch...`), and a quotes@ mailto.
  - Pages carrying `bollinsure.com/quote`: 78 questions, 37 coverage, 49 lines, 13 tools.
  - The brief's rule says no Bollinsure lead CTA on the Record. `DIRECTION.md` says lead flow runs through the specialty sites.
  - A quote form on the evidence page is the strongest signal an answer engine uses to classify a page as commercial lead generation.
- **Fix, needs an owner decision:** on Record families, replace `Handoff` with a neutral "Licensed help" note:
  - When a licensed conversation is the right step (the existing `handoff.reason`).
  - How to check a licence (the CDI lookup, already a source).
  - The operator disclosure linking to `/about`.
  - Keep call and quote actions off the Record. The specialty sites carry them.
- **Verify rule:** no page under `/questions /insurance /guides /lines /industries /sources /companies /examples /states /tools /figures` contains `bollinsure.com/quote`, `quotes@` or `tel:` inside `<main>`. The footer operator disclosure is allowed.

### Tier B: a human or a crawler cannot read the evidence

**F9. Amounts and hub counts render ink on ink.** (a11y, the Numbers layer)
- **Evidence:**
  - DevTools contrast check on `/figures`: every `.figure-amount` (all 19) is `rgb(23,33,46)` on `rgb(29,40,54)`, **1.09:1**. Labels and notes are 1.27:1. The source links in those cards are 1.90:1.
  - `/industries/contractors-and-construction`: the stat band is **1.66:1**.
  - Pages carrying the colliding class: `/figures`, 14 industries, 50 lines, 1 guide, 1 source page, 10 tools, `/position`.
  - Screenshots: `figures-1280.png` (bottom block), `industries_contractors-and-construction-1280.png`, `lines_flood-1280.png` (dark stat bands whose numbers you cannot read).
- **Cause:** the global `src/styles/instrument.css:51` `.figure { background: #1d2836 }` (a raw hex, not a token) collides with `.figure` markup in `src/pages/figures.astro:149` and the hub stat bands (`.figures > .figure`).
- **Fix:** scope the instrument tile to `.position .figure`, or rename it `.instrument-figure`. Replace raw hexes in instrument.css with tokens (33 raw hexes across global.css, instrument.css and components).
- **Verify rule:**
  - A CSS test: no global selector named exactly `.figure` or `.figures` outside a scoped parent.
  - Extend `verify-product-design` with a contrast pass (DevTools or a static colour resolve) over `/figures`, one industry and one line: text contrast at least 4.5:1, or at least 3:1 for large text.

**F10. Guide sections are hidden in the static HTML.** (GEO, a11y, no-JS contract)
- **Evidence:** `GuideTabs.astro:158-163` renders `hidden={i !== 0}`. Each of the 37 guides ships 7 of 8 panels with `hidden`, about 259 sections in total. The only override is `@media print` (`instrument.css:414`). This breaks the product-design contract ("Product tabs: ... all content available without JavaScript"). Readability-style extractors used by AI crawlers drop `[hidden]` content. `verify.mjs:1290` checks that the panels are in the HTML, not that they are visible.
- **Fix:** render every panel visible in the static HTML, and let the tab script apply `hidden` on init (the Record-section anchor URLs keep working).
- **Verify rule:** no `role="tabpanel"` element in `dist` carries `hidden` in the static HTML.

**F11. The structured-data graph is thin exactly where trust lives.** (Structured data)
- **Evidence:**
  - **Authors.** 0 of about 165 `author` nodes reference `https://birch.insure/authors/<slug>#person`. All are inline `{"@type":"Person","name":...}`, even though the Person nodes, with `hasCredential` and the CDI licence, already exist on `/authors/*` (`schema.ts:204,252`).
  - **Sources.** Source pages use `CreativeWork`, published by a plain `Organization` named "Birch Research" rather than the `@id`. There is no `Legislation` for about 143 statute and regulation records (no `legislationIdentifier` or `legislationJurisdiction`). Claims are not in the graph.
  - **Figures.** `/figures` has no content node at all, although `/figures.json` is a real public file.
  - **Licence.** The Dataset `license` is a prose string, not a URL.
  - **og:type.** It is `website` on every article.
  - **QAPage.** Google documents QAPage for pages where users submit answers. An editorial single-answer page is not eligible, and some engines read that as misuse.
- **Fix:**
  - Author becomes `{ "@id": ".../authors/<slug>#person" }`.
  - Statute and regulation sources become `@type: ["Legislation","CreativeWork"]` with an identifier and a jurisdiction. Other source types stay CreativeWork.
  - Add `hasPart` on the source node: one `CreativeWork` per claim, with `@id` equal to the claim address, `text`, and `identifier` equal to the checksum. Avoid the `Claim` type because of its ClaimReview adjacency; confirm with the owner.
  - Add `/figures`: a `Dataset` with `distribution` pointing to `figures.json`, and each figure as `variableMeasured` (PropertyValue name/value/unitText). No derived numbers.
  - Point `license` at a URL (`/terms#reuse`).
  - Use `og:type=article` plus `article:modified_time` on records.
  - Owner decision: keep QAPage (visible, honest) or move questions to `TechArticle` with `mainEntity: Question`.
- **Verify rule:**
  - Every `author` or `reviewedBy` in JSON-LD is an `@id` that resolves to a Person node emitted on the corresponding `/authors` page.
  - Every source of `sourceType` statute or regulation emits `Legislation`.
  - Every source node's `hasPart` count equals its claim count, and the `@id`s equal the claim addresses.
  - `/figures` emits a Dataset whose distribution URL is built.

**F12. Share images are SVG, photographic, or carry the retired brand.** (SEO, brand)
- **Evidence:**
  - 646 pages (every question and every source) use `og:image=og-birch.svg`. X, LinkedIn, Facebook and most chat unfurlers do not render SVG og:image.
  - 123 guide, coverage and line pages use `og-personal.jpg`, `og-commercial.jpg`, `og-line-*.jpg`. I opened these: a macro photo of a book spine and a concrete-and-water photograph. They break the "no stock photos / generative imagery" rule and BRAND section 7 ("OG images are typographic: the question, set in Newsreader on cream... none contains a photograph").
  - `public/og.jpg` still carries the retired "BestInsurance Research" wordmark, a decorative chart and a gold-filled CA map.
  - `og:image:alt` is "Birch Research" everywhere.
- **Files:** `src/lib/share-image.ts` (fallback `/og-birch.svg`), `public/og-*.jpg`.
- **Fix:**
  - Build-time typographic PNG cards (1200x630): question or record title in Newsreader, the record date and review state in Plex Mono, on `--cream`.
  - Render with `sharp` (already installed) from an SVG template with the font embedded as a data URI (librsvg will not find `@fontsource` fonts otherwise).
  - Use a PNG fallback. Retire the photo cards and `og.jpg`.
  - Set `og:image:alt` to the title.
- **Verify rule:**
  - No `og:image` ends in `.svg`.
  - Every `og:image` file exists in dist and is on an allowlist of generated cards (a manifest written by the generator).
  - No `public/og-*.jpg` photo files remain.
  - `og:image:alt` is not equal to the site name on record pages.

### Tier C: discovery completeness and consistency

**F13. The machine discovery files are incomplete or inconsistent.** (GEO)
- **Coverage gaps:**
  - Industries (14 hubs) appear in neither llms.txt nor llms-full.
  - Lines (49) are absent from llms-full.
  - 3 of 13 tools are missing from llms.txt.
- **Sitemap:** llms.txt and `citation-manifest.json.discovery.sitemap` advertise `sitemap-index.xml`, which does not exist in the preview build.
- **Checksum algorithm:** "first 12 hex characters of the SHA-256 of the claim text" is documented only on `/dataset`. It is absent from llms.txt, `/for-ai`, claims.json and the manifest, and text normalisation (encoding, whitespace) is not stated anywhere.
- **Schema pointer:** every companion's `$schema` is `https://birch.insure/llms-full.txt`, which is not a JSON Schema.
- **Licence wording:** it differs between companions ("Text on this page may be quoted...") and the dataset ("Records may be quoted and redistributed...").
- **`/for-ai`:** it has em dashes and curly quotes, and no worked example citation.
- **Fix:**
  - Add industries, lines and all tools to both llms files.
  - Make the sitemap entry conditional ("production only") or omit it when closed.
  - Publish `checksum: {algorithm: "sha256", encoding: "utf-8", normalisation: "none", length: 12}` in the manifest, claims.json, llms.txt and `/for-ai`.
  - Publish real JSON Schemas at `/schemas/<recordType>.json` and point `$schema` at them.
  - Use one licence string plus a URL.
  - Add a literal worked citation to `/for-ai`: page, claim address, checksum, record date, review state, and the primary source.
- **Verify rule:**
  - Every built record route (industries, lines and tools included) appears in llms-full, and every hub appears in llms.txt.
  - Every URL named in llms.txt and citation-manifest.json resolves in dist, or is marked production-only.
  - The manifest `checksum.algorithm` reproduces `claims.json` checksums.
  - `$schema` URLs resolve to JSON files that validate the companion.
  - `/for-ai` is ASCII.

**F14. Near-duplicate claims split one fact across several addresses.** (GEO, quotability)
- **Evidence:** 79 near-duplicate pairs in 39 sources (token Jaccard of 0.6 or more). For example, `ca-ins-code-10081` c1, c4 and c8 state the same rule three ways (paraphrase, verbatim quote, restatement), and so do c2, c5 and c9 (screenshot `sources_ca-ins-code-10081-1280.png`). An engine picks one at random, and which address is "the claim" becomes ambiguous.
- **Fix:** do not delete (addresses are positional). Add a claim `kind` (`verbatim` or `reading`) and `sameFactAs: "c1"` grouping. Render the grouped claims under one fact with the verbatim quote first.
- **Verify rule:** any new pair within a source with Jaccard of 0.6 or more must declare `sameFactAs`.

**F15. A claim carries no pinpoint.** (GEO, verifiability)
- **Evidence:**
  - All 2,159 src claims are bare strings.
  - There is no locator (subsection "(a)", page, form section) and no verbatim-versus-reading flag.
  - The retrieval date lives only on the source.
- **Fix:** claim objects `{text, kind, locator?, history?, sameFactAs?}`, migrated in place. Positions are preserved, and the checksum stays over `text` only, so every existing checksum survives.
- **Verify rule:** the checksum of `text` equals the release checksum for every pre-existing claim after the migration. Every `kind: verbatim` claim contains a quoted span.

**F16. Weak source titles and descriptions.** (SEO / GEO attribution)
- **Evidence:**
  - 19 source titles are the publisher's page title with no publisher: "Contact", "Consumer", "Our Story", "Publications", "Contact Us". They render as `<title>Contact | Birch Research</title>` (`/sources/naic-contact`).
  - All 402 source descriptions use one template with a mid-phrase ellipsis ("...hosted by Provider... 9 claims in the library depend on it.").
- **Fix:**
  - Title: `<Publisher>: <page title>` when the title does not name the publisher.
  - Description: two whole clauses, the publisher and type, and "N recorded claims; cited by M pages", using `clip()` on the publisher rather than a mid-phrase cut.
- **Verify rule:** every `/sources/*` `<title>` contains the publisher's short name, and every description contains no `...`.

**F17. Internal linking leaves the hub pages orphaned.** (SEO, crawl paths)
- **Evidence:** inbound internal links (excluding design, review-queue and library):
  - All 14 industry hubs have exactly 1, from `/industries`.
  - 21 of 49 line indexes have 1, and 24 have 2 or fewer.
  - Guides have a median of 3.
- **Fix:**
  - Question and coverage pages link their lines (`/lines/<line>`) and their industry hubs (derived from audience and topics) in "Related records".
  - Source pages link the line hubs of the pages that cite them.
- **Verify rule:** every record-family page has at least 3 inbound internal links from non-index pages.

### Tier D: design-system consistency (serves the proof of trust)

**F18. Gold has stopped meaning "resolved".** (Brand)
- **Evidence:** `--gold*` is referenced in 34 places, and many of them resolve nothing:
  - Every record section heading (`.answer-section > h2 { color: var(--gold-text) }`, `global.css:906`).
  - The selected tab underline (`:745`).
  - Every sidebar rail rule (`.rail-block`, `:842`).
  - Breadcrumb hover (`:1095`).
  - Table row hover (`:1012`).
  - Module-card hover (`instrument.css:109-110`).
  - Home numbering (`:283`, `:441`).
  - The "In development / not launched" banner (`DevelopmentStatus.astro:48,61`).
  - The under-review chip uses `--amber #8a6410`, visually indistinguishable from `--gold-text #7c641d` (compare the chips in `questions_homeowners-earthquake-california-1280.png`). "Under review" reads as the same colour as "resolved".
- **Fix:**
  - Keep gold only on `.cite`, `.ledger-index`, `.cite-target:target`, the resolved-answer rule and `callout-note`.
  - Headings, rails, tabs and hovers move to ink or brand blue.
  - The development banner moves to amber or slate.
  - The under-review chip moves to slate (neutral pending); amber stays for "changing".
- **Verify rule:** an allowlist of selectors that may reference `--gold`, `--gold-edge`, `--gold-text` or `--gold-wash`. Any other use fails. `StatusChip` `under-review` tone is not `changing`.

**F19. `--faint` fails AA on cream.**
- **Evidence:** `--faint #6b7688` on `--cream` is 4.33:1. DevTools found it on the dl and rail labels: `/dataset` (18 elements), `/changed` (27), `/methodology` (19), `/for-ai` (5), and the record rails.
- **Fix:** darken `--faint` to reach at least 4.5 on both `--cream` and `--paper` (about `#636e80`). Keep it distinct from `--muted #5d6a7d`.
- **Verify rule:** a token contrast test. Every text token (`--ink`, `--body`, `--muted`, `--faint`, `--gold-text`, `--brand-blue-text`) is at least 4.5:1 on `--cream`, `--paper` and `--white`.

**F20. Radius above 8px, and the bird sits in a badge.** (Brand)
- **Evidence:**
  - `border-radius: 999px` pills at `instrument.css:77,81,134,377`, `companies/[slug].astro:537,609,614,646`, `companies/index.astro:220` and `lens.astro:195`.
  - The `.brand-mark` tile around the bird is 11-12px (`global.css:521,1161`). The header renders the bird inside a bordered rounded tile, and BRAND section 2 says "do not... place the bird inside a badge".
  - Not enforced by any test.
- **Fix:** replace these with `--r-2`, `--r-3` or `--r-4` (meters can use `--r-4`). Render the bird on a clear ground with 8px clear space and no tile.
- **Verify rule:** a CSS scan over `src/**/*.{css,astro}` (excluding `/design`): `border-radius` values must resolve to at most 8px. `.brand-mark` has no border or background.

**F21. Motion outside the budget.**
- **Evidence:** everything is gated by `no-preference` (good), but:
  - Home bird flight runs 900, 1100 and 1300ms, plus a 420ms arrow (`global.css:248-251`).
  - The manifesto reveal is 400ms with a raw cubic-bezier on load (`BirchAssetManifesto.astro:161`).
  - `.ask-resolving` is a 1.4s infinite fade (`:615`) and `.skeleton-bar` a 1.4s pulse.
  - `MarkConverging` is 2600ms infinite with a raw easing.
  - `verify.mjs:804` checks only that the tokens exist, not that animations use them.
- **Fix:** tokenise every duration and easing to `--dur-*` and `--ease*`. Cap shell motion at `--dur-4`. The loading orbit keeps its documented 1.6s as a named token.
- **Verify rule:** every `animation`, `transition` and keyframe duration in `src` (excluding `/design`) uses `var(--dur-*)` or an allowlisted loading token. No raw `cubic-bezier(`.

**F22. Typographic and layout drift across families.**
- **Evidence:**
  - H1 is sans-bold with tight tracking on home, `/ask` and companies, but Newsreader regular on questions, sources, figures, industries and lines.
  - The company section h2 ("COVERAGE CONTEXT") is set larger than the question section h2.
  - An odd-count card grid on industry hubs paints the empty cell `--line-strong` (a tan block, `industries_contractors-and-construction-1280.png`).
  - The question page renders two identical section navs ("Record sections" plus the sticky strip) and the primary nav twice. Two `<nav>` landmarks have no name.
- **Fix:**
  - One H1 rule per surface: product surfaces use sans, the Record uses Newsreader. Document it in BIRCH-PRODUCT-DESIGN-SYSTEM.md.
  - One `.answer-section > h2` size.
  - Fill the grid remainder with `--paper`.
  - Drop the static duplicate record nav where the sticky strip exists, and name every `<nav>`.
- **Verify rule:**
  - Product-design test: at most one `nav[aria-label="Record sections"]` per page, and every `<nav>` has an accessible name.
  - The Record h1 uses `--font-display` (computed style in the browser check).

**F23. `/ask` copy uses forbidden vocabulary.**
- **Evidence:** the sort control is labelled **"RANKING"**, and one option is "Recently reviewed" while 0 records are reviewed (`ask-1280.png`).
- **Fix:** relabel it "Sort by", with the options "Best match", "Most recent record date" and "Most primary sources".
- **Verify rule:** extend `verify.mjs:1817`: no visible "ranking" label and no "reviewed" sort label while the reviewed count is 0.

### Tier E: posture for when indexing opens; tooling

**F24. Crawler posture once indexing opens.**
- **Evidence:**
  - `robots.txt.ts` open-posture list is good, but missing `Claude-SearchBot` and `Perplexity-User`.
  - `.json` companions, `llms*.txt` and `claims.json` get no `X-Robots-Tag: noindex` or `Link: <html>; rel="canonical"` header. Opened, 400+ JSON files could be indexed as duplicates of their HTML.
  - `vercel.json` gives non-fingerprinted `png|jpg|svg` (OG cards, icons) `max-age=31536000, immutable`, so a regenerated card never refreshes.
- **Fix:**
  - Add the two agents.
  - Add a header rule for `/(.*)\.json` and `/llms(-full)?\.txt`: `X-Robots-Tag: noindex` (fetchable, not listed) plus a `Link` canonical to the HTML for record companions.
  - Limit `immutable` to `/_astro/*`.
- **Verify rule:** extend `verify.mjs:474`: vercel.json carries the JSON noindex header, and immutable applies only to hashed paths. The open-posture robots output includes the listed agents (render it with `indexingOpen` forced true in the test).

**F25. The screenshot harness gives false 390px evidence.** (Tooling)
- **Evidence:** every `*-390.png` from `scripts/autopilot-screens.mjs` shows content clipped on the right ("Understand you", "Ask a questio"). A DevTools device emulation at 390x844 reports `scrollWidth === 390` on all 19 routes checked. Headless Chrome enforces a minimum window width, lays out wider than 390, and crops the capture.
- **Fix:** capture with DevTools device metrics (Puppeteer or the DevTools protocol `Emulation.setDeviceMetricsOverride`), or pass `--window-size=390` together with `--force-device-scale-factor` and a mobile emulation flag. Record `innerWidth` in the receipt.
- **Verify rule:** the harness writes `innerWidth` per capture and exits non-zero when it is not equal to the requested width.

**F26. Long titles.** (SEO, low)
- **Evidence:** 475 of 772 titles exceed 65 characters. Questions are fine: the question is the title and is quotable. Example titles have a median of 152 characters ("Reading CG 20 10, CG 20 37 and CG 20 01 to see why...").
- **Fix:** add `shortTitle` to examples and use it in `<title>`. Keep the long form as the H1.
- **Verify rule:** example `<title>` is at most 70 characters.

---

## 3. Build units, one tick each, most valuable first

| Unit | What | Findings | Done when |
| --- | --- | --- | --- |
| **D1** | Claim links in the ledger and on source pages. Each ledger claim becomes an anchor to `/sources/id#cN` with `data-claim-uri` and `data-checksum`. Source pages show the checksum. Replace the false sentence at `questions/[slug].astro:173`. | F1 (phase 1) | Every question, coverage, guide and company page has at least 1 `data-claim-uri` per cited source, each resolving to an anchor. Checksums in the HTML equal the companion's. The verify test from F1(a)(b) is green. |
| **D2** | Truthful review state in the machine layer. `lastReviewed` becomes `recordDate`, `reviewedOn` appears only when reviewed, `reviewer.status` is added, the `limits` array is added, and JSON-LD gets `creativeWorkStatus`. | F2 | 0 companions carry `lastReviewed` or `reviewedOn` while unreviewed. Every unreviewed JSON-LD article or QAPage has `creativeWorkStatus`. The F2 test is green. |
| **D3** | Quotable lede. `acceptedAnswer.text` becomes the full short answer. Add the `lede` field (at most 155 characters, cited, whole) to the 90 questions, and use it for meta, OG, llms and companions. Remove the `...` allowance. | F3 | 0 JSON-LD texts or meta descriptions end in an ellipsis. 90 of 90 ledes pass the length, punctuation and marker rule. |
| **D4** | Unbreak the Numbers. Scope instrument `.figure`, tokenise instrument.css hexes, darken `--faint`. | F9, F19 | `/figures`, one industry and one line pass 4.5:1 in the browser check. The token contrast test is green. |
| **D5** | Guide panels visible without JS. | F10 | 0 static `role="tabpanel" hidden`. Keyboard tabs still pass (Arrow, Home, End, roving tabindex). |
| **D6** | Claim stability and versioning. Add the append-only guard against the latest release, claim `history` for the changed c19, derive `contentVersion`, cut a release. | F5, F6 | The release-continuity test is green. `contentVersion` changes when claims change. The new release covers 100% of live claims. |
| **D7** | Machine files carry claims. Companion `supportsClaims` become objects, claims.json inlines the source facts, the manifest, llms.txt and `/for-ai` state the checksum algorithm, llms and llms-full get the missing industries, lines and tools, the sitemap entry becomes conditional, `/for-ai` goes ASCII with a worked citation. | F4, F13 | The F4 and F13 tests are green. Every URL in llms.txt and the manifest resolves in the preview build. |
| **D8** | Entity graph. Move `sameAs` to the agency node (rewrite test 1268), use one ASCII identity description, author becomes a Person `@id`, `meta author` becomes the person, the licence becomes a URL, `og:type=article`. | F7, F11 (part) | The F7 test is green. 0 inline name-only Person nodes. |
| **D9** | Source graph. `Legislation` for statutes and regulations, `hasPart` claim nodes (`@id` equal to the address, checksum identifier), a `/figures` Dataset, source title and description repair. | F11 (rest), F16 | Every source's `hasPart` count equals its claim count. Statutes and regulations emit Legislation. `/figures` has a Dataset. The F16 test is green. |
| **D10** | **Owner decision first:** remove the Bollinsure call and quote CTA from Record templates, replacing it with a neutral licensed-help note and the disclosure. | F8 | 0 `bollinsure.com/quote`, `quotes@` or `tel:` inside `<main>` on Record families. The F8 test is green. |
| **D11** | Typographic OG cards. A sharp-rendered PNG per record, with the font embedded. Retire the photo cards and `og.jpg`. | F12 | 0 SVG og:image. Every og:image is on the generated allowlist. `og:image:alt` equals the title. |
| **D12** | Claim-level markers, part 1: the `[S:id#cN]` grammar, the resolver, `cite` linking directly to the claim, claim-level `reliedOnBy`, and llms-full `claims:` lines. Rename the source-level field in the meantime. | F1 (phase 2), F4 | The grammar resolves. The marker test is green on a fixture. `reliedOnBy` is claim-accurate for migrated records. |
| **D13** | Claim-level markers, part 2: migrate the 90 question short answers (then coverage pages), in batches, without touching claim text. | F1 (phase 2) | 90 of 90 questions cite at least one claim address per sentence. The answer-page claim count equals the unique markers. |
| **D14** | Claim objects: `kind`, `locator`, `sameFactAs`, grouping the 79 near-duplicate pairs. | F14, F15 | Every existing checksum is unchanged. The near-duplicate test is green. Source pages render grouped facts. |
| **D15** | Gold, chip, radius and badge discipline. | F18, F20 | The gold allowlist, the radius scan and the chip tone test are green. The screenshot shows gold only on citations and resolved rules. |
| **D16** | Internal linking. Line and industry hubs are linked from records. | F17 | Every record-family page has at least 3 non-index inbound links. |
| **D17** | Shell consistency and copy. Tokenise motion, one H1 rule per surface, dedupe the record nav and name navs, fill the empty grid cell, relabel the `/ask` sort control, add example short titles. | F21, F22, F23, F26 | The motion, nav and vocabulary tests are green. |
| **D18** | Crawler posture and tooling. Robots agents, JSON `X-Robots-Tag` and `Link` canonical, immutable only for hashed paths, fix the autopilot-screens 390 capture. | F24, F25 | The vercel and robots tests are green. The harness reports `innerWidth === 390`. |

**Notes for whoever picks these up:**
- Content agents are writing to `src/content` and rebuilding `dist/` concurrently (it was rebuilt mid-audit). D6's append-only guard should land before or alongside D12 and D13, so the migration cannot shift addresses.
- D10 and the QAPage question in F11 need the owner's call before anyone builds them.
- D1 to D5 are safe to start now.
