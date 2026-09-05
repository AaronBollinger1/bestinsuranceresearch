# Launch Gate

What must be true before this goes to production, in the order it has to happen.

Last updated: 2026-09-02

## Current state

| | |
| --- | --- |
| Domain | **`bestinsuranceresearch.com` registered 2026-09-02.** ACTIVE, auto-renew on, security lock on, Porkbun API access on. |
| What the domain serves | **Porkbun parking.** DNS is the default ALIAS to `uixie.porkbun.com` plus a wildcard CNAME, and a 302 URL forward to `bestinsuranceresearch-com.l.ink`. |
| Deployment | **None.** The site has never been deployed anywhere. |
| Environment | `preview` |
| Indexing | `noindex, nofollow` on all 318 pages; `robots.txt` disallows everything |
| Analytics | None loaded. No container published or modified. |
| Redirects | 35 mapped and validated, 23 parked. **All held.** Preflight refuses to mark them executable until the destination is observed serving the site. |
| The 8 specialty sites | All live, all serving their own content, 608 pages between them. Unchanged. |
| Bollinsure / BestAMS / CovWell | Untouched. BestAMS not read. |

## Build verification

Both environments are green. This matters more than it sounds: until 2026-09-02 the two indexing
tests asserted the preview posture unconditionally, so this document carried an instruction to
edit them at the moment of the flip. That made the first production build the one where the suite
was expected to fail, and a failing suite cannot distinguish a deliberate change from a mistake.
Each posture is now asserted in full, per environment.

| Command | Result |
| --- | --- |
| `npm run validate` | 0 errors, 0 warnings, 318 pages, **77/77** |
| `PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://bestinsuranceresearch.com npm run validate` | 318 pages, **77/77** |

The production build was checked by hand as well as by assertion: `robots.txt` allows crawling,
names the eight AI and answer crawlers explicitly, and advertises
`https://bestinsuranceresearch.com/sitemap-index.xml`; the blanket `noindex` is gone from content
pages.

## The order of operations

Steps 1 to 3 are independent of the licensed review and can proceed now. Step 4 cannot.

### 1. Point the domain at a deployment

Nothing else can be verified until this is done, and the redirect preflight is deliberately
blocked on it.

- [ ] Create the Vercel project from the repo, or deploy the static `dist/` output.
- [ ] Set `PUBLIC_SITE_ORIGIN=https://bestinsuranceresearch.com`.
- [ ] Leave `PUBLIC_SITE_ENV=preview` for now. A deployed preview is still `noindex`, which is
      what you want while the review is open.
- [ ] Add apex and `www` in Vercel, choose the apex as canonical, verify SSL.
- [ ] In Porkbun, delete these three records, which are the default parking set and will
      otherwise shadow anything you point at Vercel. Ids read 2026-09-02; re-list before deleting.

      | What | Type | Id | Current value |
      | --- | --- | --- | --- |
      | URL forward, apex, 302 | forward | `31698481` | `http://bestinsuranceresearch-com.l.ink` |
      | Apex parking | ALIAS | `580798276` | `uixie.porkbun.com` |
      | Wildcard parking | CNAME `*` | `580798281` | `uixie.porkbun.com` |

      Leave the four `NS` records, both `MX` records, and the SPF `TXT` alone: mail forwarding and
      the SPF record are unrelated to the site and removing them breaks email.
- [ ] The domain is **not** on Cloudflare. Checked 2026-09-02: the Porkbun Cloudflare move is
      `NOT_QUEUED`, so the `cloudflare: enabled` flag on the DNS listing means the feature is
      available on the account, not that this zone uses it. Point DNS straight at Vercel.
- [ ] Confirm `https://bestinsuranceresearch.com/position` returns 200 and renders.

### 2. Re-run the redirect preflight

- [ ] `node --experimental-strip-types scripts/plan-redirects.mjs`
- [ ] It flips to `executable: true` only when it observes the real site at the destination. If it
      reports INCONCLUSIVE, it could not reach the network and the verdict is not a pass.

### 3. Decide the two things a redirect cannot decide

Both are business decisions and neither is technical.

- [ ] **The deep pages.** An apex forward carries `/` only. Export the indexed URL list for each
      of the eight live sites from Search Console and decide per-URL mapping, or accept losing 50
      class-code pages, 28 county pages, and 35 guides. The plan sets `includePath: no` rather
      than pretend a wildcard solves it.
- [ ] **The application funnels.** Eight of them, with carrier PDFs and e-signature. The
      destination publishes no price and takes no application, by design. Whatever they convert
      stops converting at the switch.

### 4. The blocking gate: licensed review

**All 35 published content pages and all 8 advisory modules carry `reviewState: 'under-review'`.**

This is the one item that cannot be cleared by anyone but the named licensed reviewer, and it is
the reason not to redirect eight live properties yet. Sending live traffic to an unreviewed
destination is worse than leaving it where it is.


### G1. Licensed review

| Item | Count | Reviewer |
| --- | --- | --- |
| Questions | 12 | Brian Bollinger (producer licence 6013787) |
| Coverage pages | 6 | Brian Bollinger |
| Organization pages | 3 | Brian Bollinger |
| State pages | 3 | Brian Bollinger |
| Examples | 11 | Brian Bollinger |
| Live tools | 3 | Brian Bollinger |
| **Advisory modules** | **8** | **Brian Bollinger** |

For each page the reviewer must confirm: the insurance terminology is correct; every
form-level statement names its form and edition or carries a "read your own form" caveat; the
stated limits are honest; the assigned confidence status is justified; nothing reads as
individualized advice; and nothing is a coverage determination or an eligibility verdict.

On sign-off, `reviewState` changes to `reviewed` and the page stops displaying the under-review
badge. **Do not bulk-flip this field.** It is the one field on the site that cannot be set by
anyone who has not actually read the page.

### G1a. Rule review, in addition to page review

The eight modules carry **231 rules** between them. Each is a statement made to a reader about
their own insurance, so each needs the same review as a published sentence, plus two checks a
page does not need:

1. **Does the trigger match the population the source covers?** A rule sourced to one filed
   form must not fire for someone who recorded a different form. This was the most common
   defect found in review.
2. **Does the action route to the right professional?** Anything turning on contract
   interpretation or employment law must route to a lawyer, not a broker.

The mechanical checks (real fields, sensible operators, sourced, reachable, no banned phrasing,
no rule firing on an empty position) already pass in `npm run verify`. They cannot tell whether
a source genuinely supports the sentence citing it. That is the reviewer's job.

### G2. Priority re-verification

These carry the highest cost of being wrong and should be re-checked against primary sources
immediately before launch, regardless of review status:

1. **Statutory auto liability minimums** for California, Texas, and Florida. A stale minimum is
   the most damaging single error the state pages can make.
2. **California Insurance Code 10081 and 10083** mandatory-offer mechanics and timing.
3. **The CEA companion-policy condition** and current deductible options.
4. **Miller Act bond thresholds** and the current California contractor licence bond amount.
5. **WCIRB dual-wage thresholds** effective September 1, 2026.
6. **Any source with `status: not-adopted`.** Confirm the reader cannot mistake a bill for law.

### G3. Content honesty

- [ ] No page states a coverage determination or an eligibility verdict.
- [ ] Every `commonlyCovers` and `commonlyExcludes` note carries a form caveat.
- [ ] Every market-practice claim says so in those words.
- [ ] Every example label is accurate; no composite or hypothetical reads as a real outcome.
- [ ] No `anonymized-client` example exists without a documented consent record. None currently uses that label: the 11 examples are 5 published-industry, 2 carrier-authored, 2 public-record, 1 composite, and 1 hypothetical.
- [ ] No ranking, rating, price, or appetite claim on any company page.
- [ ] The corrections log is accurate and the review count on `/corrections` matches reality.

### G4. Technical

- [x] `npm run check` passes: 0 errors, 0 warnings.
- [x] `npm run build` succeeds: 318 pages.
- [x] `npm run verify` passes: 77 assertions.
- [x] The production build passes too. `PUBLIC_SITE_ENV=production` builds 318 pages and passes
      74/74, so the flip is verifiable rather than expected-to-fail.
- [x] Production `robots.txt` allows crawling, names the eight AI and answer crawlers, and
      advertises the sitemap index by absolute URL.
- [x] Every domain marked `redirect` names a route the build produces.
- [x] The redirect preflight refuses to mark the plan executable until it observes the real site
      at the destination, and reports INCONCLUSIVE rather than passing when it cannot reach the
      network.
- [x] Zero horizontal overflow across every route at 1440, 1024, 768, 390, and 320.
- [x] Zero heading-level skips.
- [x] Zero undersized standalone tap targets at 390.
- [x] Every citation marker resolves; no raw marker in rendered output.
- [x] Every internal link resolves to a built page.
- [x] Every JSON-LD block parses; no review, rating, price, offer, or FAQ schema.
- [x] Retrieval: every question findable by its own title; off-topic queries refuse.
- [x] Rule boundary: no rule states an eligibility, price, appetite, or coverage verdict.
- [x] No rule fires on an empty position; every rule is reachable.
- [x] No rule compares a date to a value frozen at build time.
- [x] No rule's prose states a date only the build date could produce.
- [x] Date arithmetic is calendar-correct across month-end and leap years.
- [x] Every declared rule source is pointed at by a marker in that rule's detail.
- [x] Every `rule-input` field is read by some rule.
- [x] Every live module is retrievable from its own name.
- [x] Every declared line of business resolves to a canonical line.
- [x] Every coverage page and every live module links the worked examples it shares a line with.
- [x] Every live module with a specialty domain carries at least one worked example on its line.
- [x] No module field collects an identifier or health information.
- [x] No file input exists anywhere on the site.
- [ ] Lighthouse on a representative mobile page: LCP under 2.5s, CLS under 0.1.
- [ ] Manual screen reader pass on the answer template and one tool.

### G5. Domain

- [x] `bestinsuranceresearch.com` registered 2026-09-02. ACTIVE, auto-renew on, API access on.
- [ ] Connect apex and `www` in Vercel, select apex as canonical, verify SSL. **Delete the
      Porkbun parking URL forward and the default wildcard CNAME first** or they will shadow it.
- [ ] Set `PUBLIC_SITE_ORIGIN` to the live origin and rebuild.
- [x] Porkbun inventory reconciled 2026-09-02: 59 `best*` domains, all mapped in
      `src/config/domain-redirects.ts` (35 redirect, 23 park), plus 4 out of scope.
- [ ] Configure redirects only after `scripts/plan-redirects.mjs` reports `executable: true`.
      It observes the destination serving the real site before it will say so.
- [ ] Verify each redirect returns a single `301` to the exact canonical URL with no second
      hop.

### G6. Privacy and security

- [ ] Confirm the privacy page still matches actual behaviour. It describes behaviour, not
      intent, so a behaviour change is a privacy-page bug.
- [ ] Confirm no file upload exists anywhere.
- [ ] Confirm no API secret is present in browser code.
- [ ] Confirm security headers are applied on the production host.
- [ ] Confirm session replay is not enabled on any property.

### G7. Analytics

Optional. The site is complete without it.

- [ ] Owner authorization recorded.
- [ ] Container carries only the eight events in `ANALYTICS-EVENT-SPEC.md`.
- [ ] Tag Assistant confirms no free text in any payload.
- [ ] Cross-domain measurement verified, if used.

### G8. Production flip

Only after G1 through G6.

- [ ] Set `PUBLIC_SITE_ENV=production`.
- [ ] Rebuild and confirm: `noindex` is gone, `robots.txt` allows crawling and names the
      sitemap.
- [x] Re-run `npm run verify`. Both indexing tests now assert the posture for whichever
      environment is set, so a production build is green rather than expected-to-fail. Verified
      2026-09-02: `PUBLIC_SITE_ENV=production` builds 318 pages and passes 74/74.
- [ ] Add the Search Console property and submit `/sitemap-index.xml`.
- [ ] Add each redirected domain as its own Search Console property.

## Explicitly out of scope

Not to be done as part of this launch, under any circumstance:

- Editing the Bollinsure production site or repository.
- Editing BestAMS, or reading from it.
- Any DNS or Porkbun change beyond the authorized redirects.
- Adding a paid AI dependency.
- Enabling any generative answer path. `/ask` stays a deterministic library lookup until every
  precondition in `AI-RETRIEVAL-ARCHITECTURE.md` is met.
- Publishing any tool that is not `status: 'live'` with a reviewed specification.

## Backlog

### Launch

1. **Deploy to the registered domain.** Independent of the review and blocking everything
   downstream, including the redirect preflight.
2. Licensed review of all 35 pages and 231 rules (G1, G1a).
2. Priority re-verification (G2).
3. Lighthouse and screen reader passes (G4).
4. Domain acquisition and Porkbun reconciliation (G5).
5. Redirects for the six domains whose destinations are published: `bestho3.com`,
   `bestdwellingfire.com`, `bestearthquakeinsurance.com`, `bestepli.com`,
   `bestcyberliability.com`, `bestworkerscompensation.com`. `bestgroupmedical.com` and
   `bestartinsurance.com` stay parked until their modules publish.

### Next

6. Build `group-benefits-renewal`, which unparks `bestgroupmedical.com`. Strictest privacy
   boundary on the site: no member health information, ever.
7. Build `valuables-schedule`, which unparks `bestartinsurance.com`.
8. Add cross-module rules deliberately. The engine supports them and the two property-adjacent
   modules already share fields, but no rule currently reads across modules. That is the
   single highest-leverage addition, because it is the thing microsites cannot do.
9. Add 6 to 8 more questions in the two deepest families rather than spreading thin.
9. First quarterly "what changed" report, from the source registry deltas.
10. Downloadable checklist artifacts with canonical pages and licences.
11. External subject-matter reviewer on at least one page.

### Later

12. Remaining domain-aligned tools, each gated on its own content depth.
13. `placement-pathways`, `appetite-evidence`, `filed-rate-explorer`. Highest value and highest
    risk; they need the strongest review discipline on the site.
14. Versioned embedding index, once the corpus outgrows lexical retrieval.
15. Additional state pages, driven by published questions rather than to complete a map.
16. Embeddable tools with attribution.
17. Generative answer path, only if all seven preconditions are met.

## Sign-off

Production requires, in writing:

| Gate | Owner | Date |
| --- | --- | --- |
| Licensed content review (G1, G2, G3) | Brian Bollinger | |
| Technical (G4) | Aaron Bollinger | |
| Domain (G5) | Owner | |
| Privacy and security (G6) | Owner | |
| Analytics, if enabled (G7) | Owner | |
| Production flip (G8) | Owner | |
