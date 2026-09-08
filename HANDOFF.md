# Handoff

Written 8 September 2026, last revised at the verification-sheet pass, on
`launch/initial-publication`.

Read `DIRECTION.md` (what this is, and the rules that do not bend) and
`AMBITION.md` (what it is becoming, and the architecture) before changing
anything. This file is the state of play plus the things that will cost you a
pass if you learn them the hard way.

---

## 1. Where the work stands

| | |
| --- | --- |
| Branch | `launch/initial-publication`, 88 commits, **never push to `main`** |
| Suite | `npm run validate` = 118 tests, 0 failing. Also `npm run audit:estate`, `npm run audit:onpage` |
| Built pages | 840 (299 are noindex verification sheets) |
| Sources | 299 (122 primary-law, 69 regulator, 45 standards-body, 35 secondary, 28 carrier-official) |
| Questions | 85 (21 national, CA 56, TX 6, FL 5, GA 1) |
| Coverage pages | 27 of 51 canonical lines |
| Figures | 19 (`/figures`, the amounts and what moves them) |
| Modules | 10 live, 15 cross-module rules |
| Records signed off | **0.** 173 `under-review`, 2 `corrected` (cross-rules were missing from the count) |
| Sources ever re-checked | **6 of 299** |
| Sources no question reaches | 48 |
| Cited sentences | 4,948, across 5,696 sentence-to-source edges. Median 13 per source |
| Published records with no review state | **3.** The live worksheets; the tools schema has no `reviewState` field |

### The two things blocking everything else

**Production has never been promoted.** Every deployment for at least the last
fifteen hours is `Preview`; the production deployment is two days old, so 88
commits of work are not on the live site. The guard hook at
`~/.claude/hooks/guard-dangerous-bash.mjs` blocks `vercel promote` and any
`vercel` command carrying `--prod`. **Do not try to reword past the guard** -
surface the command and let the user run it. Read-only `vercel ls`,
`vercel project ls` and `vercel inspect` are not blocked and are how you find
out what is actually deployed.

The command previously recorded here was wrong in two ways and was tried and
failed on 8 September. Both corrections matter:

- **`vercel promote` with no argument does not promote anything.** It reports
  whether a promotion is already in progress, which is why the attempt printed
  "No deployment promotion in progress" and stopped. It needs the deployment
  URL to promote.
- **This repository has no `.vercel` directory**, so it is not linked to a
  project and a bare `vercel` command run inside it resolves nothing. Run from
  `C:\Users\aaron`, the CLI picked up the link in the home directory instead
  and reported checking **best-ams** - a property on the do-not-touch list.
  Nothing happened, because nothing was in progress. Always name the
  deployment explicitly rather than relying on the working directory.

The Vercel project is **`bestinsuranceresearch`**, team
`aaronbollinger1s-projects`, serving `https://bestinsuranceresearch.com`.

Find the newest preview, which is the tip of `launch/initial-publication`:

```
npx --no-install vercel ls bestinsuranceresearch --scope aaronbollinger1s-projects
```

Then hand the user that URL in this shape, and let them run it:

```
npx --no-install vercel promote <deployment-url> --scope aaronbollinger1s-projects --yes
```

Confirm afterwards with `vercel ls`: the promoted deployment should read
`Production` rather than `Preview`.

**Nothing is reviewed.** Every record carries an under-review badge - all 173.
Brian Bollinger is named reviewer on all 85 questions and has signed off none.
`AMBITION.md` puts this ahead of anything public-facing for a reason: an
unreviewed corpus cannot credibly moderate contributed content, and marketing
an instrument whose own badge says "under review" spends the credibility it is
trying to build.

What now exists to make sign-off tractable, in the order it was built:

1. `/review-queue` orders the backlog by record **and** by source. Source-first
   is 299 readings rather than 838. It is not a leverage play - the top twenty
   sources are 18 per cent of dependencies and the graph is flat.
2. **`/review-queue/<source-id>` is the worksheet**, one per source, 299 of
   them. For one document: its claims with addresses and checksums, every
   individual sentence anywhere in the corpus that rests on it with the field
   it sits in and the page it publishes on, the records that declare it
   without pointing a sentence at it, and the exact JSON edit each of four
   verdicts implies. Built by `src/lib/verification.ts`.

That reframes the size of the job honestly. The commitment is **4,948 cited
sentences**, not 173 records - median 13 per source, so one document is a
sitting rather than a project. `/review-queue` states this on the page.

**What is left on this item is not code.** The sheets are the instrument; the
reading has to be done by the licensed reviewer. Put the ordered list in front
of Brian starting at the top of `/review-queue#by-source`, and the first
outcome to look for is a `lastCheckedBasis` flip from `access` to `recheck`,
because 293 of 299 sources have never been returned to.

---

## 2. Rules that do not bend

Several are enforced by `scripts/verify.mjs`; one by a response header. Do not
relax them to ship a feature.

- Every claim cites a source. Unresolved `[S:source-id]` markers throw at build.
- No page collects an application. Enforced by `Content-Security-Policy:
  form-action 'self'`.
- The licence split is **6013787** agency, **0D94699** Brian, **4345268** Aaron.
- Never push to `main`. Never touch **Bollinsure**, **BestAMS** or **CovWell**.
- No rating, ranking, price, premium, quote, appetite claim, coverage
  determination, eligibility verdict **or risk score** is ever published.
- No `FAQPage`, `ClaimReview`, `Rating`, `Review` or `Offer` structured data.
- A record citing a superseded, rescinded or never-adopted source must say so in
  its own text.
- Where a source is silent, say the source is silent rather than filling the gap.
- Keys live in `.env.local` and never reach the command line or chat.

---

## 3. The expanded ambition, and how each piece is actually allowed to work

The user wants: company-level account pages, coverage understanding, all lines,
area-specific value adds, insurance mapping, risk-score understanding, claims
handling forums, contribution levels — "the Wikipedia and Reddit of insurance."

That is achievable. Three of those items collide head-on with the rules above,
and the collisions decide the architecture rather than the scope. `AMBITION.md`
has the three-layer design; this is how the new asks map onto it.

### Allowed on the Record (this origin), now

**Company pages as entity records, not review pages.** The `companies`
collection exists with 3 records and is the most under-built high-value surface
in the corpus. Regulator-published fact is abundant: CDI company profiles carry
licence status, company type, state of domicile, former names, agent for service
of process, and the lines the company is authorised to transact; NAIC carries
group structure and receivership status. Build those. Do **not** build a page
that ranks carriers, scores them, or aggregates opinions about them — that is a
`Rating`/`Review` surface by another name and it is the single largest liability
on the user's list.

**Area-specific value adds and insurance mapping.** This is the biggest
unclaimed ground and it breaks no rule, because hazard geography is public
government data. CAL FIRE Fire Hazard Severity Zones, FEMA NFIP flood maps and
community status, USGS seismic hazard, CEA participation, Florida Citizens and
FHCF, state FAIR plans, ISO Public Protection Classification. Publish the
geography and the residual-market structure. Do **not** publish a per-address
"your risk is N" output: that is a risk score.

**Risk-score understanding, as explanation.** The rule forbids publishing a
score; it does not forbid explaining how scoring works, and there is a real gap.
Insurance scores, CLUE reports and consumer rights in them, how FHSZ tiers are
assigned, what an ISO PPC class means, how a wildfire model vendor's output
enters an underwriting decision. All sourceable. This is a strong content line
and it is the honest version of what the user asked for.

**All lines.** 24 canonical lines are uncovered (listed in `src/lib/lines.ts`;
recount with `canonicalLine()`, never raw slugs). Be aware the remainder skews
toward lines whose forms are not public, so each additional page is weaker than
the last. Depth and jurisdiction are worth more than 51/51 — 141 of 299 sources
are California. New York (DFS regulations are public and unusually good) and
Texas (insurance code fully online) are the cheapest real expansion.

### Requires the Commons (separate origin)

**Claims-handling forums and contribution levels.** Accounts are on
`DIRECTION.md`'s never list *for this origin*. Unlicensed people giving coverage
advice on a page branded "Operated by Bollinsure" under licence 6013787 is a
regulatory problem a disclaimer does not fix. So: separate origin, no agency
branding, no licence number, `rel="ugc"` on outbound, and the verdict
prohibition — nobody publishes a view on whether a claim should have been paid —
enforced by moderation rather than by policy text. That one rule holds on the
Commons even though almost nothing else does.

Two mechanisms come first, and both already have schema support, which is why
they beat opening a forum:

- **Case reports.** `src/content/examples/` has 11 records with a `label`
  taxonomy (`public-record`, `published-industry`, `carrier-authored`,
  `composite`, `hypothetical`) plus `provenance`, `cannotGeneralize`,
  `whatHappened` and `reasoningPath`. A reader's real situation enters as
  moderated structured intake and publishes as an example. That is the useful
  half of a Reddit thread with a provenance field attached.
- **Practitioner annotation.** `src/content/people/` has `licensed` and
  `license` fields. A licence-verified broker or lawyer attaches a signed note
  to a claim address (`/sources/<id>#cN`). Attributed and moderated, it *raises*
  citability instead of diluting it.

Shape contribution levels around verified licence and cited contribution, not
volume. A level system that rewards answering questions creates an incentive to
give coverage advice, which is the thing that must not happen.

### Recommended and not on the user's list

1. **A versioned downloadable dataset.** The single strongest citability move
   available. The corpus is already addressable per claim with checksums and a
   JSON companion on every path; a dated release with a stable schema is what
   makes other people's papers and tools cite it.
2. **A published recheck cadence.** 293 of 299 sources have
   `lastCheckedBasis: 'access'` — read once, never returned to. An authority
   that never re-reads decays, and the field exists precisely so the site cannot
   overstate itself. Start with the dated-figure sources.
3. **Wikidata item plus a consistent `sameAs` graph** across all nine
   properties.
4. **Search Console and Bing verification.** Blocked only on the user generating
   tokens; Porkbun DNS writes are confirmed working.
5. **CSP report-only on the six specialty sites that lack one** (surfaced by
   `npm run audit:estate`).
6. **Weekly GitHub Action** running the estate audit, so it stops being
   hand-run.

---

## 4. Working practices that will save you a pass

**One item per pass.** The standing instruction is to pick one, do it properly,
run `npm run validate` until green, commit and push, and not start a second.
Honour it — the commit messages are the project's record and they are written to
explain *why*, including what was tried and rejected.

**Measure before building on a premise.** Two examples from this session. The
"a few sources carry the corpus, so source-first review is a shortcut" premise
was false — top 20 sources are 18% of dependencies. And `AMBITION.md` step 2
(complaints by carrier and reason) turned out unbuildable because the NAIC
sources describe the search tools and hold no data; the aggregate report is
behind an interactive form with no static download. Check first, and if the
premise fails, say so in the commit rather than forcing the feature.

**Claim addressing is positional.** `/sources/<id>#cN` is the index of the claim
in the array. **Append claims, never insert**, or every later citation silently
re-points. Checksums derive from claim text.

**Use `canonicalLine()` from `src/lib/lines.ts`** whenever you measure line
coverage. Raw slug counting reports written lines as unwritten; it inflated the
uncovered count by four for several passes.

**Wire a new collection into everything that enumerates records.** Adding
`figures` left two silent gaps: `citingPages()` in `src/lib/corpus.ts` (so
source pages claimed nothing depended on 19 records) and `reviewQueue()` in
`src/lib/review.ts` (so the queue understated the backlog by 19). Both are fixed;
the pattern is the warning. Check `corpus.ts`, `review.ts`, `llms.txt`,
the sitemap, and `verify.mjs` when you add one.

**A global regex carries `lastIndex`, and `matchAll` inherits it.** Testing a
block with a `/g` regex and then calling `matchAll` on each of its sentences
starts the per-sentence search partway in and silently drops the earlier
markers. It put a question that cites the MICRA statute three times in its own
short answer into the "declared without a marker" bucket, and every test passed
because the record still appeared on the sheet. Use a non-global regex for the
presence check. The suite now asserts which section a dependency lands in, not
just that it appears.

**The dependency set is wider than the reviewable set.** `reviewableRecords()`
in `src/lib/review.ts` is the one list of collections carrying a `reviewState`,
and `dependentRecords()` in `src/lib/verification.ts` adds the live worksheets,
which publish 80 cited sentences on 29 sources with no `reviewState` field in
their schema at all. Do not paper that over by defaulting them to
`under-review`: that asserts a review is open on a record that cannot record
one. Giving `tools` a review state is a real pass of its own.

**`lastCheckedBasis` must be honest.** `'access'` means somebody read it once.
`'recheck'` requires `lastChecked > accessedDate` and is asserted.

**Local `npm run build` is a preview build** — it stamps `noindex` on every
page. `npm run audit:onpage` refuses to run against one. For production output:
`PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://bestinsuranceresearch.com npx astro build`.

**Shell gotchas on this machine.** Heredocs break on apostrophes and backticks —
use the Write tool for any script or content with either. Backticks inside a
double-quoted `node -e` string get executed by bash. `/tmp` resolves as `C:\tmp`
for node but not for bash; use the session scratchpad. `grep -c '<loc>'` counts
lines not matches, and the sitemap is one line — use `grep -o ... | wc -l`.
`ffmpeg` is not installed. `sharp` is available but only resolves from inside
the project directory.

**Vercel `source: "/:path*"` does not match bare `/`.** A canonical-host
redirect needs a separate `source: "/"` rule. This shipped broken across three
repos and was caught by the estate audit.

**Porkbun MCP is fully wired** for reads and writes estate-wide. The
`apiAccess: 0` flag in `list_domains` is misleading — verified empirically.

**The mark has a true vector now, and that closed three open items.**
`scripts/trace-mark.mjs` traces `icon-master-black-transparent.png` by
connected-component analysis into `public/mark.svg` - 37 circles and one
arrowhead, validated at 0.975 IoU against the master and refusing to write if
the geometry disagrees with the 37 dots `AMBITION.md` records. It also emits
`public/favicon.svg`, self-colouring, which replaces `favicon-light.svg` and
`favicon-dark.svg` - both of which were a base64 PNG in an `<svg>` wrapper,
22KB between them. **Do not hand-edit either SVG. Re-run the tracer.**

The loading animation is `src/components/MarkConverging.astro`: the 37 real
dots converge inward, each timed from its own measured distance to the
arrowhead, so the resolved frame is the artwork exactly.
`scripts/mark-frames.mjs` renders the cycle to a contact sheet and asserts
both that the resolved frame reproduces `mark.svg` and that no visible dot is
displaced on the way out - the first version failed the second, ending each
loop by flinging all 37 dots outward. `MarkResolving.astro` was the masked-
raster wipe and is deleted.

**Higgsfield has no remaining job here.** Two Seedance passes conditioned on
the master both replaced the mark with a random dot cloud. The reason not to
try a third is no longer that it failed; it is that the geometry is measured,
the motion derives from it, and a generated clip could only be less exact.
Generated imagery has no home in this brand more generally, because
`BRAND-SYSTEM.md` rules out the things it would be for: no stock photography,
no illustrated people, no decorative graphics.

The site is **light-only**: no `data-theme`, no dark block in `tokens.css`. Do
not key anything in the interface off `prefers-color-scheme` or you will paint
a white mark onto cream. The favicon is the one exception, because it renders
outside the page.

**A foreign logo sat at `public/favicon.svg` for 90 commits** - the Astro
starter's own mark, one filled path in a 128 viewBox. Nothing referenced it
and nothing noticed. Four assertions now check that every asset claiming to be
the mark is 37 circles and one arrowhead.

---

## 5. The order

**`AMBITION.md` now holds the reconciled order**, in the section *One order,
reconciled from the four that existed*. Read it there rather than here, because
this estate had four different orderings of the same work in four files and
copying a fifth into this one is how that happened. The short version:

1. **Promote to production.** The user, one command. Nothing is cited that does
   not exist, and everything else is downstream.
2. **Licensed sign-off.** Brian reading. The instrument is built; no code left.
3. **Recheck the figure sources.** 19 published figures rest on 11 documents and
   none of the 11 has ever been rechecked. Next pass. Bounded, and a moved
   amount produces a correction, which is the point.
4. **Give `tools` a `reviewState` and a `reviewer`**, so the 3 live worksheets
   stop publishing 80 cited sentences with no review state recordable.
5. **Carrier entity records.** Route measured and settled: state DOI filing
   libraries, not CDI company profiles. See the map in `AMBITION.md`.
6. Hazard geography, then risk-score explainers, then New York and Texas depth,
   then the versioned dataset release, then the Commons.

### What the goal is, so it stops being re-asked

`AMBITION.md` opens with *The goal, stated once*, and maps every ask made so far
- forms, exclusions, policy understanding, companies, mapping, risk scores,
threads, opinions, audits, contribution levels, automation - to a layer, with
what it may publish and what it never publishes. Two words in the brief do not
survive contact with the rules and are replaced there rather than argued about
again: **advice** becomes the document quoted and cited, and **unbiased** means
publishing the regulator record and declining to rank. Neither loses anything
the ambition actually wanted.
