# Birch Autopilot — the 24/7 build order

Owner direction, 2026-09-30: Birch becomes **the most cited, most referred-to,
free and unbiased insurance intelligence reference**: guides, industry-specific
pages, insurance company pages built on public record and lived experience,
threads and forums for contributions, and a professional workspace that
brokers, agents, lawyers, lenders, and advisers use daily. Branded to and
operated by Bollinsure. Citability is the product; everything below serves it.

The settled architecture in `AMBITION.md` and `DIRECTION.md` stays: three layers
with one direction of citation.

| Layer | Truth model | Origin |
|---|---|---|
| The Record | every claim cites a document; reviewed by a named licensed person | birch.insure |
| The Numbers | published regulator and government figures with retrieval dates | birch.insure |
| The Commons | attributed experience and practitioner annotation, moderated before publication; cites the Record, never cited by it | commons.birch.insure |

This file is the single queue for the autonomous Claude Code loop. The loop reads
it at the start of every tick, takes the first `queued` unit, finishes it end to
end, records the receipt, advances the pointer, and schedules the next tick.

## Handoff, 2026-09-30 evening (Claude Code to Codex)

The Claude Code loop stopped at `8a7241f`. Everything is committed and pushed
to `autopilot/birch-20260930`; nothing is deployed, merged or indexed. Done
this session, each with a receipt in `receipts/autopilot/<unit>/`: R1a, D0,
D1, D2, D3, D3b, D5, D7, DR1, I3, I5, I6, I7. Gate state: preview `npm run
validate` 393/393, production posture verify 184/184. Owner decisions waiting:
`receipts/autopilot/OWNER-GATES.md` (G7 author of record, G8 handoff block).

Working notes that cost time:
- The shell `grep` here is a wrapper; use `/usr/bin/grep`.
- Screenshots: `node scripts/autopilot-screens.mjs <out> <route>...` uses
  Playwright's headless shell, because headless Chrome clamps to 500px wide.
- `astro preview` runs as a daemon; the script reuses whatever URL it reports.
- Content agents must never run git: one `git checkout -- src/content/questions`
  wiped another batch's work. Drafted content needs an adversarial pass against
  each source's `claims` array (the D3 pass rewrote 59 of 90 drafts).
- `scripts/precheck-coverage.mjs <ids>` checks new coverage records without a build.

## The one measure every unit serves

Owner direction, 2026-09-30: what matters, end to end, is that Birch becomes
the source answer engines cite when they tell people about insurance, because
its citation model is the clearest and its trustworthiness can be proved. Birch
does not give the advice. It is the evidence the advice should rest on: the
claim, the document under it, the date it was read, and who has and has not
reviewed it, all addressable and machine-readable.

So every unit is judged by one question before it is built: does this make a
Birch claim easier for an AI system to find, parse, trust, quote and attribute
correctly? Units that do go first. Track D and R8 (citability gates) are
ordered next for that reason. Nothing here bends a rule to get there. A
source that overclaims stops being worth citing, and no AI system can reach
the site until Aaron opens indexing (gate G2).

## Where the loop runs

| What | Value |
|---|---|
| Worktree | `/Users/aaronbollinger/Documents/Codex/2026-09-19/in/birch-b1-knowledge-graph-20260925` |
| Branch | `autopilot/birch-20260930` (from `a01316b`, the PR #4 head) |
| Backup remote | `origin` (github.com/AaronBollinger1/bestinsuranceresearch), same branch name |
| Dev | `npm run dev` (Astro) |
| Full gate | `npm run validate` (catalog verify, astro check, build, 27 verify scripts) |
| Production posture | `PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://birch.insure npx astro build` then `node --experimental-strip-types --test scripts/verify.mjs scripts/verify-instrument.mjs` |
| Commons | `cd commons && npm run validate` (in-memory store; Postgres optional locally) |
| Screenshots | Playwright or the Chrome DevTools tools at 390, 768, 1280 |

## The tick protocol

1. `git status --short` shows nothing but the known unstaged `.gitignore`
   (`.vercel` line); `git branch --show-current` is `autopilot/birch-20260930`.
   Otherwise stop and report.
2. Read this file. Take the first `queued` unit. Mark it `in-progress`.
3. Build the unit completely: content model, pages, machine-readable
   companions (`.json.ts`), verify script additions, fixtures, states, tests,
   receipt. Every new page family gets a verify rule that fails the build when
   its rules are broken.
4. Prove it: focused verify, then `npm run validate`, then production posture.
   Screenshot changed surfaces at 390, 768, 1280 into `receipts/autopilot/<unit>/`
   and look at them. Fix what the screenshots show.
5. Write `receipts/autopilot/<unit>/RECEIPT.md`: authority (parent SHA), file
   inventory, commands and results, page counts before and after, screenshots,
   what the unit refuses to do, residual risk, rollback.
6. Commit with a plain one-line summary. Mark the unit `done <sha>` here in the
   same commit.
7. `git push -u origin autopilot/birch-20260930`. Backup only. The branch name
   is excluded from Vercel by `scripts/build-impact.mjs` and matches no
   GitHub Actions trigger. Never open a PR from it.
8. Schedule the next tick immediately. No idle ticks while a unit is `queued`.

## Never, regardless of what a unit says

- Never mark any record `reviewed`. Only Brian Bollinger (0D94699) does that.
  Agents set `under-review` or `corrected` only.
- Never publish a rating, ranking, score, price, premium, quote, appetite
  claim, coverage determination, eligibility verdict, or risk score. Company
  pages carry the regulator's record and decline to rank.
- No `FAQPage`, `ClaimReview`, `Rating`, `Review`, or `Offer` structured data.
- Every claim cites a source that was actually read; an unresolved `[S:id]`
  fails the build. Where a source is silent, say so.
- No uploads, no application collection, `form-action 'self'` stays.
- Keep `PUBLIC_INDEXING_OPEN` unset, `PUBLIC_COMMONS_READY=false`,
  `CORPUS_PUBLICATION_OPEN=false`. Unreviewed candidates are `noindex` and out
  of the production sitemap.
- No provider spend or credentials: Perplexity, Resend, Postgres hosting,
  analytics, imagery. Every adapter is fixture-backed and off by default.
- No GitHub Actions run, no Vercel build, no `vercel` CLI, no PR, no merge, no
  push to `main` or `launch/*`. Never `vercel promote` or `--prod`.
- No Bollinsure lead CTA on the Record (owner revert 2026-09-27). Handoff is
  the `handoff` field and the specialty sites.
- No agency branding or licence number on the Commons.
- ASCII-only content. Light theme only. Gold means act on or resolved. Do not
  alter the bird mark. No generative video.
- Never weaken a test or soften wording to make a defect disappear.

## Content sourcing rule for company pages and experiences

Public record means: state insurance department licence and enforcement
records, NAIC complaint index and financial filings, rate and form filings
(SERFF), receivership and market-conduct actions, court opinions, and the
company's own published material, each with retrieval date and jurisdiction.

Third-party review sites (Yelp, Google, Trustpilot, BBB, Reddit) are **not**
sources: their terms forbid reuse, the content is unverifiable, and quoting it
imports defamation risk. Lived experience enters through the Commons as
attributed, moderated case reports, and through owner-supplied stories with
consent. The Record may link to a Commons thread; it never quotes it as fact.

## The queue

Status: `queued` | `in-progress` | `done <sha>` | `blocked <why>`.

### Design freeze, 2026-09-30 (owner direction)

The general aesthetics will be redone later. Until then the loop changes no
design: no new colours, type, spacing, radius, motion or layout direction. It
keeps the site ready for that redesign and keeps improving everything else.

- Allowed: fixes that make existing text readable or usable (a dark-on-dark
  heading, a collapsed column), token-only refactors that change no rendered
  value, structure, schema, machine files, content, and new pages built from
  the existing templates.
- Deferred to the redesign: D11 (share cards), D15 (gold, chip, radius), the
  visual parts of D17, and the `--faint` value change in D4.
- New unit DR1 goes first: redesign readiness.

| Unit | Title | Done when | Status |
|---|---|---|---|
| DR1 | Redesign readiness | Every raw colour in `src/styles/*.css` outside `tokens.css` is a token with the identical value (no rendered change, proved by before/after screenshots); a page-family and component inventory in `design/REDESIGN-INVENTORY.md` says which template renders each route; a verify rule fails a new raw hex outside the token file. | done (this commit) |

### Track D - Finish the site: design, motion, abilities, schema, SEO, GEO

Owner direction, 2026-09-30: once R1a lands, this track runs next, ahead of
R1b. The first unit, D0, is a measured audit against the build. It is split
into D1, D2 and on here before any of them is built, ordered by reader and
citability impact. All the rules below still apply: light theme only, gold
means resolved, the bird stays as supplied, nothing animates behind evidence,
reduced-motion parity, no forbidden schema types, and indexing stays closed.
The SEO work makes the site correct and ready; it does not open indexing.

| Unit | Title | Done when | Status |
|---|---|---|---|
| D0 | Design, SEO and GEO audit | A ranked findings report measured against dist, with screenshots at 390/768/1280, and the D-units written into this table. | done (this commit); report in receipts/autopilot/D0/AUDIT.md |
| D10 | Remove the Bollinsure lead CTA from the Record | 0 `bollinsure.com/quote`, `quotes@` or `tel:` inside `<main>` on Record families; the handoff field routes to the specialty sites; a verify rule holds it. | blocked: owner gate G8 (the 2026-09-27 revert kept the in-page handoff block, so whether it counts as a lead CTA is Aaron's call) |
| D1 | Claim links and checksums in the ledger | Every question, coverage, guide and company page has a `data-claim-uri` per cited source resolving to an anchor; checksums in HTML equal the companion's; the false "claim addresses visible" sentence is made true. | done (this commit) |
| D2 | Truthful review state in the machine layer | 0 companions carry `lastReviewed`/`reviewedOn` while unreviewed; every unreviewed Article/QAPage has `creativeWorkStatus`; a `limits` array states not-advice and under-review. | done (this commit) |
| D3 | Quotable lede and whole accepted answer | 0 JSON-LD texts or meta descriptions end in an ellipsis; each question has a cited `lede` of 155 characters or fewer. | done (this commit) |
| D3b | Ledes for every other record family | Coverage, tool, example, company and state records carry a cited `lede`; 0 meta descriptions and 0 JSON-LD texts end in an ellipsis; the ceiling in the D3 rule goes to 0. | done (this commit) |
| D4 | The Numbers readable, `--faint` to AA | `/figures`, one industry and one line hub pass 4.5:1; token contrast test green. (Hub bands fixed in R1a.) | queued |
| D5 | Guide panels visible without JS | 0 static `role="tabpanel" hidden`; keyboard tabs still pass. | done (this commit) |
| D6 | Claim stability and versioning | Append-only guard against the latest release; claim history for changed claims; derived `contentVersion`; a new release covering 100% of live claims. Lands before D12. | queued |
| D7 | Machine files carry claims | Companions and llms-full carry claim addresses and checksums; llms.txt and the manifest list industries, lines and tools; the checksum algorithm is stated in each; every URL resolves. | done (this commit) |
| D8 | Entity graph | Birch's `sameAs` no longer claims the agency and specialty sites; one ASCII identity string; author and reviewer are Person `@id`s; licence is a URL. | queued |
| D9 | Source graph | Statutes and regulations emit `Legislation`; `hasPart` claim nodes with checksum identifiers; `/figures` has a Dataset. | queued |
| D11 | Typographic PNG share cards | 0 SVG og:image; no photographic cards; the retired wordmark gone. | queued |
| D12 | Claim-level markers, part 1 | `[S:id#cN]` grammar and resolver; claim-accurate `reliedOnBy`. | queued |
| D13 | Claim-level markers, part 2 | Question short answers cite a claim address per sentence, migrated in batches without touching claim text. | queued |
| D14 | Claim objects | `kind`, `locator`, `sameFactAs`; the 79 near-duplicate pairs grouped; every checksum unchanged. | queued |
| D15 | Gold, chip, radius and badge discipline | Gold only on citations and resolved rules; no 999px pills; the bird not in a badge; tests hold each. | queued |
| D16 | Hub linking | Every record-family page has at least 3 non-index inbound links; hubs linked from records. | queued |
| D17 | Shell motion, nav and copy | Motion tokenised within the 360ms budget; `/ask` sort control no longer says "ranking"; nav deduped. | queued |
| D18 | Crawler posture | Robots agents for when indexing opens (closed until G2), JSON `X-Robots-Tag` and canonical `Link` headers. (Screenshot harness fixed in R1a.) | queued |

### Track H - Intelligence hubs: every industry, every line, every insurer

Owner direction, 2026-09-30: one hub per industry, per line of business and
per insurance company, each gathering everything Birch holds on that subject
into a single cited page an answer engine can quote: the lines that apply, the
statutes and forms that bite, the figures, the companies' regulator record,
the questions, the case studies, and the moderated experiences. A hub asserts
nothing of its own. It indexes records that are cited where they live, and it
says what it does not yet hold.

Case studies are cited or they do not exist. They come from court opinions,
regulator enforcement and market-conduct actions, and receivership records,
each dated with its jurisdiction, and from owner-supplied client cases with a
consent record (the `examples` collection rule). Lived experience comes only
through Commons case reports, and the Record links to them without quoting
them as fact.

| Unit | Title | Done when | Status |
|---|---|---|---|
| H1 | Industry hub template | `/industries/<id>` becomes a hub: lines that usually apply (from the Record), requirements lenders, landlords and contracts impose (cited), forms and exclusions that bite, figures, related companies, questions, case studies, and a "not yet held" list. JSON companion, a verify rule that fails a hub citing anything that is not a record, all three widths. | queued |
| H2 | Line-of-business hub upgrade | `/lines/<line>` gains the same shape: statute map, form editions read, endorsement history, figures, case studies, companies writing the line (regulator-sourced), and a "what the record has not read" block. | queued |
| H3 | Case studies from public record, first 20 | Twenty case studies built from court opinions and regulator actions actually read, each tied to the lines, industries and companies it touches. Holding, facts and the document only; no view on whether a claim should have been paid. | queued |
| H4 | Insurer hub | `/companies/<id>` becomes the hub for R4/R5 data: identity, licence by state, complaints with denominator and year, enforcement, rate filings, case studies, right of response, Commons thread link. No ranking. | queued |
| H5 | Hub cross-graph | Every hub links every related hub both ways (industry to line to company to case study), the knowledge graph and `citation-manifest.json` carry the edges, and a verify rule fails a one-way edge. | queued |
| H6 | Experiences feed into hubs | Commons case reports (C1) surface on the matching hubs as links with counts, never quoted as fact, with provenance labels. Activation gated by G5. | queued |

### Standing improvement queue

Findings from any unit, audit or screenshot that are not that unit's job go
here, with the evidence, and are taken ahead of new units when they affect a
page already built. The loop adds to this list every tick; it never deletes
an entry without the commit that fixes it.

| Id | Found in | Finding | Status |
|---|---|---|---|
| I1 | R1a screenshots | Every guide rendered its first lists one word per line at 768px (`.fact-list` icon column). | fixed in R1a |
| I2 | R1a screenshots | `/lines/<line>` stat band at 1280 renders its numbers and labels close to invisible on the dark band. Root cause: `.figure` styled only dt/dd; 15 families used b/span. | fixed in R1a |
| I3 | wage-and-hour agent | `employment-practices-liability.json`, first `commonlyExcludes` note, states wage-and-hour market practice with no citation and no "common market practice, not a rule" label. Cite it or delete it. | fixed: no source read, claim deleted |
| I5 | D3 lede verification | `what-controls-will-a-cyber-insurer-ask-about` shortAnswer says NIST CSF 2.0 and CISA CPGs "supply most of the vocabulary" of insurer questions; no listed claim supports it. Cite it or delete it. | fixed: claim deleted, the record now says no source read establishes it |
| I6 | D3 lede verification | `schedule-valuables-or-separate-floater` shortAnswer frames "valuation at a loss" without a citation. | fixed: replaced with the cited special-limits claim and a statement that the forms were not read |
| I7 | I5-I6 screenshots | The `EvidenceBoundary` heading ("Limitations") renders dark on the dark box on every question page, 768px capture. Same class as I2. | fixed |
| I4 | R1a agents | Loose ends recorded in the new records: Miller Act 100,000 vs FAR 150,000 threshold; BPC 7071.9(b) cross-reference to a paragraph 7071.10 lacks; the notary bond amount against Gov 8214 damages. Each needs one more source read. | queued |

### Track R — The Record, wider and deeper

| Unit | Title | Done when | Status |
|---|---|---|---|
| R1 | Coverage lines to 51 of 51 | Every canonical line has a coverage page with sourced claims, `commonlyExcludes`, endorsement history where filed, and a JSON companion. Currently 27. Ten lines per unit tick until complete; each page cites forms actually read. | split into R1a-R1c |
| R1a | Coverage lines 28-37 | term-life-california, permanent-life-california, key-person-life, buy-sell-funding, contract-surety, license-and-permit-bonds, court-bonds-california, wage-and-hour-defense, additional-insured-california, contractual-risk-transfer-california; roadmap pruned; verify rule holding canonical-line coverage count. | done (this commit) |
| R1b | Coverage lines 38-47 | business-owners-package, commercial-umbrella-excess, commercial-crime, builders-risk, employers-liability-california, employee-benefits, third-party-employment-practices-california, privacy-and-network-security-california, residential-flood-private, mobilehome-california. | queued |
| R1c | Coverage lines 48-51 | business-income, difference-in-conditions, technology-errors-and-omissions, errors-and-omissions; 51 of 51 asserted by the build. | queued |
| R2 | Industry pages, 14 to 60 | Industry pages for the trades, hospitality, real estate investors and landlords, HOAs, developers and contractors, professional services, healthcare offices, retail, manufacturing, transportation, technology, nonprofits, agriculture, and the rest of the SIC and NAICS majors. Each states the lines that usually apply, the forms and exclusions that bite, the requirements lenders and landlords usually impose, and the questions to bring to a professional. Cited, no advice, `handoff` field set. | queued |
| R3 | Guides program, 27 to 150 | Guides answer the questions people actually search, grouped by moment: bought a property, got a nonrenewal, claim denied, lender letter, lease requirement, starting a business, hiring, first employee, first vehicle, first contractor. Each guide is built from the question catalog, cites the Record, carries a dated primary source, a named reviewer field, `reviewState=under-review`, canonical intent, and internal-link parents and children. Twenty per tick. | queued |
| R4 | Company registry, national | A company record for every admitted and surplus-lines carrier that writes property or casualty in California, then the other states, from regulator identity data: NAIC number, group, domicile, licence status by state, authorised lines, former names, receivership, enforcement, and complaint index with year and retrieval date. Fixture-backed importer with a provider gate for the live pull. Company facts, editorial analysis, and experiences render as visibly separate sections. No ranking. | queued |
| R5 | Company pages with public-record experience | Each company page gains a public-record experience section: complaint ratios by line and year, market-conduct findings, enforcement actions, rate-change filings, all cited and dated, plus a link to that company's Commons thread when one exists. Right-of-response block for the company. | queued |
| R6 | Numbers layer, expanded | The figures table grows to every published regulator dataset that matters to a reader: FAIR Plan policy counts, nonrenewal and cancellation data, rate change approvals, residual-market structure, hazard geography sources. Each figure has a retrieval date, a link, and a chart rendered from the data with the source under it. | queued |
| R7 | Changes and alerts feed | `/changed` becomes a first-class feed of regulatory, form, and figure changes with per-topic and per-company RSS and JSON, the basis for professional watchlists. | queued |
| R8 | AI-citability gates, measured | A verify script scores every indexable page for citability: stable claim addresses, checksums, dated sources, JSON companion, llms.txt inclusion, canonical, structured data within the boundaries. Pages below the bar fail the build. `/for-ai` and `citation-manifest.json` regenerate from the graph. | queued |

### Track P — Professional workspace (preview-only, accounts closed)

| Unit | Title | Done when | Status |
|---|---|---|---|
| P1 | Roles and account states | Reader, experience contributor, licensed professional, company representative, financial professional, editor, moderator. Signup, sign-in, recovery, verification, onboarding, profile, settings, notifications, export, deletion, suspension, appeal screens, every state including pending, rejected, limited, suspended, deleted, offline, reduced motion. Badges state what was verified. Fixture-backed, closed by flag. Builds on BR-D2. | queued |
| P2 | Professional profile pages | Verified profile: credentials and jurisdictions, disclosures, cited contributions, topic expertise, machine-readable authorship, opt-in contact intake behind the closed flag. No promise of leads, ranking, or placement. | queued |
| P3 | Watchlists and daily brief | A professional follows companies, lines, industries, states, and topics. A daily brief page and email fixture assembles what changed (R7), new threads, new experiences, and new Record pages, with citations. | queued |
| P4 | Research desk | Saved searches, pinned claims, cited brief builder that exports a client-ready document (local download) with every citation resolved, and a share link that renders read-only. | queued |
| P5 | Prospecting from public record | A professional can filter the company registry and the figures by state, line, and change (rate filings, nonrenewals, receivership, new entrants) and see the affected reader questions and Commons threads, so daily prospecting starts from what the record says changed. No personal data, no lead lists, no scraping. | queued |
| P6 | Contribution workflow | Draft, submitted, screening, needs-revision, factual review, licensed review where required, accepted, rejected, withdrawn, published, corrected, archived. Actor, timestamp, reason, diff, appeal path, immutable receipt on every transition. Builds on BR-D3. | queued |
| P7 | Incentives and standing | Attribution on accepted contributions, cited-by counts, verified badges, correction credits, and a contributor page. Standing comes from verified licences and accepted corrections, never post volume. No payment, no paid placement. | queued |

### Track C — The Commons (separate origin, fully built, activation gated)

| Unit | Title | Done when | Status |
|---|---|---|---|
| C1 | Case reports | Structured, moderated experience reports: line, state, company, what happened, dates, outcome, documents described not uploaded. PII redaction, no adjuster names, no verdict on whether the claim should have been paid. `user-submitted` label. Runs end to end on the in-memory store and on local Postgres. | queued |
| C2 | Company threads | One thread per company, seeded from R4, with the company's right of response, report, block, mute, rate limits, near-duplicate detection, and moderation queue. | queued |
| C3 | Topic threads and questions | Open discussion on Record topics, each thread pinned to the claim addresses it discusses. Practitioner annotations from verified licences render distinctly. | queued |
| C4 | Moderation and admin | Queues, audit log, safety escalation, service-level counters, bot resistance, appeal handling. Everything a moderator needs before activation. | queued |
| C5 | Commons front door and cross-links | Commons home, search, and the Record-to-Commons links (one direction). Agency branding absent. Screens at all three widths. | queued |

### Track L — Candidate library production

| Unit | Title | Done when | Status |
|---|---|---|---|
| L1 | Candidate factory, first 100 | From `planning/birch-question-catalog.ndjson` (12,864 candidates), produce 100 preview-only question pages with differentiated intent, primary citations from sources actually read, `reviewState=under-review`, canonical intent, internal links, named reviewer field. Automated gates stop thin, duplicate, unsupported, cannibalizing, or orphaned pages. | queued |
| L2 | Candidate factory, scale | Repeat L1 in batches of 100 toward the full catalog, only while the gates stay green and the review sheet stays navigable. | queued |
| L3 | Review sheets for Brian | Each batch produces one review packet: the claims, the sentences that rest on each source, and the exact edit each verdict implies. Agents never record a verdict. | queued |

### Track V — Visual evidence workspace (BR-10, last)

| Unit | Title | Done when | Status |
|---|---|---|---|
| V1 | Property board, investor-first | The consented 2D property board from BR-E2 becomes a workspace for property investors: documents described, hazards from the Numbers layer, requirements from the Record, questions to bring to a professional. No uploads on the Record origin; the board lives on the account layer. | queued |
| V2 | Approximate multi-angle model | A consented multi-angle approximate house model with 2D fallback, labelled approximate, no fabricated geometry. Personal-insurance adapters stay disabled. | queued |

After V2 the loop returns to the top and takes the next most valuable
extension of each track, recorded here first.

## Pointer

Next unit: **D6** (claim stability, versioning, new release; lands before D12), then D8, D9, D12-D14, D16, then content growth (R1b, H1-H4, R4-R6) as usage allows. Design freeze holds: D4 value change, D11, D15 and visual D17 wait for the redesign. D10 waits on owner gate G8.

## Owner gates that stay closed until Aaron says otherwise

Brian's licensed review of the California slice; indexing (`PUBLIC_INDEXING_OPEN`);
merging PR #4 and PR #2; production promotion; the apex/www redirect direction;
Commons provisioning (Postgres, Resend, DNS, moderator); any provider credential.
The loop builds everything up to those gates and assembles one decision packet
per gate in `receipts/autopilot/OWNER-GATES.md`, updated as units land.
