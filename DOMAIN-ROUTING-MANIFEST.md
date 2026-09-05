# Domain Routing Manifest

The estate plan for the `best*` domains. **Nothing here has been executed. No DNS record, URL
forward, or Vercel domain assignment has been created or changed.**

Last updated: 2026-09-02

**`ESTATE-PLAN.md` is the plan in phases, and `scripts/apply-redirects.md` is the
runbook for executing it.** This document is the per-domain reasoning behind them.

The machine-readable version is `src/config/domain-redirects.ts`, and it is the source of truth:
`scripts/verify.mjs` asserts that every domain marked `redirect` names a route this build actually
produces, and `scripts/plan-redirects.mjs` turns it into an executable plan. This document explains
the reasoning; the file is what gets executed.

## The decision

Consolidate. All specialty domains that have a destination single-hop **301** to it on
`bestinsuranceresearch.com`. Domains with no adequate destination are **parked** and each says what
it needs.

That was decided after an audit that argued the other way, and the audit's findings are kept below
rather than deleted, because they are the risks the decision accepts.

| | |
| --- | --- |
| Domains in the account matching `best*` | 59 |
| Mapped to a **301** | 37 |
| **Parked** pending content | 21 |
| Out of scope (BestAMS, Bollinsure x2, CovWell) | 4 |
| Of the 35, domains that serve a live site today | 8 |

## What the audit found, and what the decision accepts

The eight specialty domains are not parked placeholders. They are live Vercel deployments serving
**608 HTML pages** between them, each with its own application flow, carrier PDF, `api/` submit
endpoint, sitemap, and the estate's shared organisation schema. Verified live on 2026-09-02: all
eight return 200 with their own content.

| Domain | Pages | Depth that a single redirect discards |
| --- | --- | --- |
| `bestgroupmedical.com` | 127 | 35 guides, 27 geo, 13 carrier, 10 case studies |
| `bestcyberliability.com` | 109 | glossary and FAQ depth, carrier pages |
| `bestworkerscompensation.com` | 96 | **50 class-code pages**, 8 case studies |
| `bestearthquakeinsurance.com` | 87 | 28 county pages, 8 carrier pages |
| `bestepli.com` | 76 | two carrier applications, e-signature flow |
| `bestho3.com` | 71 | ACORD 80 application, glossary and FAQ |
| `bestartinsurance.com` | 31 | 12 carrier pages, collector guides |
| `bestcommercialauto.com` | No site of its own. Was parked one pass ago for want of a page. | Work out what a business auto policy actually covers. | `/insurance/commercial-auto` | **301** | https://bestinsuranceresearch.com/insurance/commercial-auto | The coverage page reads ISO CA 00 01 symbol by symbol and states that CA 20 48 names an insured without extending coverage. That is the question the domain carries. | Non-branded impressions on symbol and covered-auto terms. |
| `bestpersonalauto.com` | No site of its own. Was parked one pass ago for want of a page. | Work out what a personal auto policy covers, and what the state requires. | `/insurance/personal-auto-california` | **301** | https://bestinsuranceresearch.com/insurance/personal-auto-california | 12 sources, all California statute: the uninsured and underinsured motorist section, the required-provisions section, repair-shop choice, the Proposition 103 rating factors, and the cancellation and nonrenewal chapter. The destination is narrower than the domain until a second state is built, which is the honest direction to err in. | Non-branded impressions on uninsured motorist and minimum-limit terms. |
| `bestdwellingfire.com` | 11 | shares the `best-ho3` wizard and form |

Three consequences the decision accepts, recorded so they are not rediscovered later:

1. **Deep pages need per-URL mapping or they are lost.** An apex forward sends `/` to a module. It
   does not carry `/class-codes/8810` anywhere useful, which is why the generated plan sets
   `includePath: no` rather than pretending a wildcard solves it. Export each site's indexed URL
   list from Search Console first.
2. **The application funnels have no equivalent on the destination.** The research property
   publishes no price, produces no quote, and takes no application, by design. Whatever those eight
   funnels currently convert stops converting at the switch. That is a business decision, not a
   technical one.
3. **A 301 is permanent.** Removing one later loses what it earned. This is the least reversible
   step in the estate plan.

## What blocks execution today

The plan is written and tested. It cannot run yet, and none of the three reasons is a permissions
problem.

| Blocker | State on 2026-09-02 | Who clears it |
| --- | --- | --- |
| `bestinsuranceresearch.com` is not registered | Checked: available, $11.08/year. It does not resolve. | Owner. A purchase, so it needs explicit authorization. |
| The research site has never been deployed | No origin exists behind the destination. | Owner, then a deploy. |
| Porkbun API access is off on 58 of 59 domains | `apiAccess: 0` everywhere except `bestepli.com`. URL-forward reads work; writes on an opted-out domain do not. | Owner, per domain, in the Porkbun UI. |

`scripts/plan-redirects.mjs` performs the first of these as a preflight: while the destination does
not resolve it marks the plan `executable: false` and every operation `hold`. A 301 pointed at a
host that does not resolve takes a live site offline, which is the one failure mode worth making
structurally impossible.


## The relationship after consolidation

`bestinsuranceresearch.com` becomes the single public property for research, coverage explanation,
and the advisory instrument. The specialty domains stop being destinations and become entry points
that land on the module or page matching their name.

| Property | What it is for | What it may do that the others may not |
| --- | --- | --- |
| `bestinsuranceresearch.com` | Work out what your position is, and read the source behind every open item | Publish claim-level provenance. It publishes no price, quote, or eligibility verdict. |
| `bollinsure.com` | The licensed brokerage and the trust layer under the estate | Hold the licence, the reviews, and the entity graph. Take an actual placement. |
| `covwell.com` | Insured-facing self-guided coverage and service for existing insureds | Its own recurring workflow. **retain**, out of scope here. |
| The 35 redirected domains | Entry points only | Nothing. They serve a single 301. |

Because the destination takes no application, the licensed-help path on every research page runs to
Bollinsure, and the research property must not imply a price by the way it links.

## Recommendations

`Recommendation` is one of: **301** (single-hop redirect), **park** (hold, no content, no redirect
yet), **retain** (standalone product), **retire** (allow to lapse).

The complete per-domain table is `src/config/domain-redirects.ts`, which is validated on every
build. This is the summary.

| Domain | Evidence | User intent | Destination | Recommendation | Redirect target | Rationale | Measurement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `bestinsuranceresearch.com` | Not registered. Available, $11.08/year, checked 2026-09-02. | Work out an insurance decision. | `/` and `/position` | **retain** | n/a | The canonical property and the destination for everything else. | Acquire, connect apex plus `www`, choose apex as canonical, verify SSL, set `PUBLIC_SITE_ORIGIN`, deploy. Do not purchase without explicit owner authorization. |
| `bestho3.com` | 71 pages, ACORD 80 application. Live, 200. | Assemble a homeowners position. | `/tools/property-position` | **301** | https://bestinsuranceresearch.com/tools/property-position | Module records 36 fields and runs 34 checks. | Module starts; loss of application submissions. |
| `bestdwellingfire.com` | 11 pages, thinnest of the eight. Live, 200. | Understand DP and rental dwelling coverage. | `/insurance/landlord-rental-dwelling` | **301** | https://bestinsuranceresearch.com/insurance/landlord-rental-dwelling | Intent is definitional and the coverage page is published and reviewed. | Non-branded impressions on DP-3 terms. |
| `bestearthquakeinsurance.com` | 87 pages including 28 county pages. Live, 200. | Decide whether and how to carry earthquake coverage. | `/tools/earthquake-pathways` | **301** | https://bestinsuranceresearch.com/tools/earthquake-pathways | Module built on the CA Insurance Code and CEA published forms. | Export the 28 county URLs first; watch their impressions after. |
| `bestepli.com` | 76 pages, two carrier applications, e-signature. Live, 200. | Assess employment-practice exposure. | `/tools/epli-readiness` | **301** | https://bestinsuranceresearch.com/tools/epli-readiness | Module records 31 fields and runs 32 checks on EEOC and DOL sources. | The most mature funnel in the estate; measure what the switch costs. |
| `bestcyberliability.com` | 109 pages. Live, 200. | Assess cyber controls before applying. | `/tools/cyber-control-readiness` | **301** | https://bestinsuranceresearch.com/tools/cyber-control-readiness | Module records 42 fields and runs 40 checks, keyed to a dated framework edition. | Control-question completion. |
| `bestworkerscompensation.com` | 96 pages including 50 class-code pages. Live, 200. | Prepare a workers compensation placement or audit. | `/tools/workers-comp-classification` | **301** | https://bestinsuranceresearch.com/tools/workers-comp-classification | Module records 29 fields and runs 34 checks on WCIRB and bureau sources. | Highest equity at risk of the eight. Export the 50 class-code URLs first. |
| `bestgroupmedical.com` | 127 pages, the largest property in the estate. Live, 200. | Prepare a group benefits renewal. | `/tools/group-benefits-renewal` | **301** | https://bestinsuranceresearch.com/tools/group-benefits-renewal | Module built in this pass: 16 fields, 16 checks, on the ACA and COBRA regulations. Strictest privacy boundary on the site. | Renewal-intake completion. |
| `bestartinsurance.com` | 31 pages, Markel application. Live, 200. | Insure fine art, collectibles, or valuables. | `/tools/valuables-schedule` | **301** | https://bestinsuranceresearch.com/tools/valuables-schedule | Module built in this pass: 14 fields, 17 checks, on the marine insurance article and the nationwide definition. | Collector guide entrances. |
| 29 further domains with a match | No site of their own. | Line or question level. | The matching page | **301** | See `src/config/domain-redirects.ts` | Each names a line, a question, or an intent the corpus already answers. | Non-branded impressions per destination. |
| 21 domains with no match | No site, and no adequate destination. | Mostly industry rather than line level. | None yet | **park** | Not yet | Each records what it needs. Pointing them at the homepage would be a permanent mismatch. | Revisit when the named page exists. |
| `bestams.com` and any BestAMS domain | Internal system of record, client PII behind a login. | Internal. | n/a | **retain**, out of scope | n/a | Explicitly excluded and not read. | No change of any kind. |

## Execution order

1. **Register `bestinsuranceresearch.com`** and connect apex plus `www`. Owner authorization
   required; it is a purchase.
2. **Deploy the research site** to it, set `PUBLIC_SITE_ORIGIN`, and clear the launch gate. Until
   `reviewState` is `reviewed` on the content and the modules, the destination is not ready to
   receive traffic from eight live properties.
3. **Export the indexed URL list** for each of the eight live sites from Search Console, and decide
   per-URL mapping for the deep pages. This is the step that preserves the 50 class-code pages, the
   28 county pages, and the 35 guides.
4. **Decide what happens to the eight application funnels.** They have no equivalent on the
   destination.
5. **Opt each domain into Porkbun API access**, or plan to create the forwards in the UI.
6. **Run `node --experimental-strip-types scripts/plan-redirects.mjs`.** It refuses to mark the plan
   executable while the destination does not resolve. Review `redirect-plan.json`.
7. **Create the forwards**, apex and `www`, one hop, permanent. Confirm with a header check that the
   response is `301`, that `Location` is the exact canonical URL, and that there is no second hop.
8. **Add each redirected domain as its own Search Console property** if it is not one already, and
   keep it there so the migration is measurable.
9. **Leave them in place permanently.** A 301 that is later removed loses what it earned.


## The disclosure standard, now enforced in code

The audit found one class of exposure that was live rather than theoretical, and it has been
fixed in a working copy. See `IMPLEMENTATION-AUDIT.md` for the detail.

All eight repos already ran `scripts/social-proof.test.mjs` from `npm test`, enforcing that the
Google rating and count agree estate-wide, that a producer licence is never presented as the
agency's, that the retired phone number never returns, and that each page carries exactly one
identified organisation node parented to Bollinsure. A **section 6** has been added to that same
file in all eight, enforcing three further rules:

- every page under `case-studies/` carries an illustrative disclosure;
- no page carries an attributed quotation unless it also links the Google Business Profile, so a
  reader can check it;
- no page carries unbounded promise language, and no page declared illustrative also describes a
  real engagement.

Extending the estate's own guardrail rather than adding a parallel script was deliberate: that
file already exists in all eight repos, already runs on `npm test`, and its own header explains
why a shared constant with nothing enforcing it drifts.
