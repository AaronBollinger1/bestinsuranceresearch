# Estate Plan

What to do with all 59 `best*` domains, and what BestInsurance Research is being built into.

Last updated: 2026-09-02

## The recommendation, in one paragraph

Consolidate the 27 domains that carry no content, now. Hold the 8 that carry live sites, and make
them cite the research property rather than be replaced by it. That is not the plan of record —
the decision taken was to redirect all 35 — so both are mapped and both are executable, and the
27 are ordered first either way. The reasoning is below and it is short, because it comes down to
one asymmetry: a domain with no content loses nothing by redirecting, and a domain with 127 pages
and a working application funnel loses both.

## Phase 0: unblock. Nothing else can proceed.

`bestinsuranceresearch.com` was registered 2026-09-02 and serves Porkbun parking. Until it serves
the built site, every redirect in this plan is held by the preflight, correctly.

| Step | Detail |
| --- | --- |
| Deploy | Vercel project from the repo, or the static `dist/`. Keep `PUBLIC_SITE_ENV=preview` so it stays `noindex` while review is open. |
| DNS | Delete forward `31698481`, ALIAS `580798276`, wildcard CNAME `580798281`. Keep the four NS, both MX, and the SPF TXT. |
| Origin | Set `PUBLIC_SITE_ORIGIN=https://bestinsuranceresearch.com`, apex canonical, `www` added, SSL verified. |
| Confirm | `/position` returns 200 and renders. The redirect preflight tests exactly this. |

## Phase 1: the 27 content-less domains

No site, no funnel, no indexed depth. Redirecting them costs nothing and consolidates whatever
authority they hold onto one property. This is the phase to run first regardless of which overall
plan is chosen, because it is where you find out whether the destination behaves at no cost.

Ordered by how well the destination answers the query:

| Group | Domains | Destination |
| --- | --- | --- |
| Exact line match | `bestgeneralliability.com`, `bestliability.com`, `bestcommercialpropertyinsurance.com`, `bestpropinsurance.com`, `besthomeownerscoverage.com`, `besthighvaluehomeinsurance.com` | The matching coverage page |
| Exact question match | `bestreplacementcost.com`, `bestinlandmarine.com`, `bestcontractorbonds.com`, `bestprofessionalliability.com`, `besterrorsandomissions.com` | The published question |
| Module match | `bestjewelryinsurance.com`, `bestjewleryinsurance.com`, `bestgrouphealthinsurance.com`, `bestemployerbenefits.com` | The matching module |
| Contract intent | `bestgeneralcontractorinsurance.com`, `bestcontractorcoverage.com`, `bestqualitycontractors.com`, `bestservicecontractors.com`, `bestlocalgeneralcontractors.com` | `/tools/contract-requirements` |
| Review intent | `bestcoveragereview.com`, `bestpolicyreview.com` | `/position` |
| Family level | `bestcommerciallines.com`, `bestpersonallines.com` | `/insurance` |
| Operator level | `bestindependentinsurance.com`, `bestinsurancepartner.com` | `/about`, `/` |

## Phase 2: the 8 live sites

608 pages, eight application funnels, all verified serving on 2026-09-02. This is the phase worth
being slow about.

| Domain | Pages | What a single apex redirect discards |
| --- | --- | --- |
| `bestgroupmedical.com` | 127 | 35 guides, 27 geo, 13 carrier, 10 case studies |
| `bestcyberliability.com` | 109 | glossary and FAQ depth |
| `bestworkerscompensation.com` | 96 | **50 class-code pages** |
| `bestearthquakeinsurance.com` | 87 | 28 county pages |
| `bestepli.com` | 76 | two carrier applications, e-signature |
| `bestho3.com` | 71 | ACORD 80 application |
| `bestartinsurance.com` | 31 | 12 carrier pages, collector guides |
| `bestdwellingfire.com` | 11 | shares another site's wizard |

Two things a redirect cannot decide, and neither is technical:

- **The deep pages.** Export each site's indexed URL list from Search Console and map per URL, or
  accept losing them. `includePath: 'no'` is set deliberately in the plan because a path-appending
  wildcard would send `/class-codes/8810` to a URL that does not exist.
- **The funnels.** The destination publishes no price and takes no application, by design.
  Whatever those eight convert stops converting at the switch.

My recommendation for this phase specifically: **hold them, and cross-link instead.** Each
specialty page that makes a factual claim links to the research page that sources it; the research
property names the specialty site as one route to a quote alongside Bollinsure. That keeps 608
pages and eight funnels and still consolidates the evidence layer. If a site is later folded in,
do it per-URL, not in one hop.

`bestdwellingfire.com` is the exception even under a hold: 11 pages sharing another site's wizard
and form. Either invest it to parity or fold it into `best-ho3` — an intra-estate consolidation,
not a redirect to research.

## Phase 3: the parked domains

Each records what it needs. Two of the ten line pages are now built, so 21 remain parked.

- **Built, and now redirecting:** commercial auto (`bestcommercialauto.com`, from the ISO CA 00 01
  form) and personal auto (`bestpersonalauto.com`, from twelve California statutes). Both were in
  this list one pass ago.
- **Eight line pages still wanted:** D&O (2 domains), products and completed operations, umbrella
  and excess, surplus lines, builders risk, HOA.
- **Thirteen industry pages.** The block most likely to become filler. An industry page that is a
  line page with the trade name swapped in adds nothing. Build only where the trade genuinely
  changes the exposures: roofing, trucking and staffing do; a country club mostly does not.
- **`bestemployerpayroll.com`** is not an insurance line. Retire it or repurpose it.

Nothing in this phase should redirect until its page exists. A permanent redirect to a
loosely-related page teaches a crawler that the destination is not about the query.

## What BestInsurance Research is being built into

An advisory instrument with a research engine underneath, and the only property in the estate that
publishes no price, no quote, and no eligibility verdict. Current state:

| | |
| --- | --- |
| Modules | 8, one per specialty line with a site |
| Fields / checks | 231 / 231 |
| Coverage pages | 6, each carrying exposures, claim mitigation, underwriting inputs, limits, endorsements, state variations |
| Questions / examples | 12 / 11 |
| Sources / claims | 251 / 1,500, every claim individually addressable with a checksum |
| Pages | 318 |
| Assertions | 77, green in preview and in production |

### The build order I would take

1. **Cross-module rules.** The central unrealised claim: the position is one object written by
   eight modules and no rule yet reads across them. 18 were designed and partly refuted before the
   spend limit cut that pass short. This is the thing microsites structurally cannot do.
2. **The shared-field model.** Four field ids are defined twice with different vocabularies
   (`states-of-operation` uses two-letter codes in one module and full slugs in another). The
   reader is asked the same question twice with different answer choices, and any cross-module
   rule reading those fields would be wrong. Fix before (1), because (1) depends on it.
3. **Line pages, one at a time, properly.** Each carries 40 or more sourced statements; personal
   auto came in at 106 citations over 12 sources. Two are done. Umbrella and excess is next of the
   remaining eight, because the contract module already records its limits without explaining them
   and because personal auto now names it as the layer above the auto limit.

   A note from the two that are built, because it changes the order of the rest: how deep a line
   page can go is set by whether its primary sources are public, not by how important the line is.
   Commercial auto worked because ISO CA 00 01 could be read directly. Personal auto worked because
   California writes most of the line into statute. D&O, products, and builders risk are all
   form-driven lines whose forms are not public, so each will be thinner than its importance
   suggests unless it is built on statute and litigation instead. Surplus lines and HOA are
   statutory and should therefore be promoted above them.
4. **Carrier records.** The gap behind "ratings": only three organisation records exist and none is
   a carrier. Financial strength is a carrier attribute and the estate's policy is to link the
   rating to whoever published it. Carrier records are also where appetite claims creep in, so
   this needs the strongest review discipline on the site.
5. **The time dimension on the position.** It records dates and has no deadline surface. Everything
   needed is already there: relative-date comparands, cited intervals, and `savedAt`.
6. **`placement-pathways`, `appetite-evidence`, `filed-rate-explorer`.** The eligibility, appetite
   and pricing answers, published as evidence rather than verdicts. Highest value and highest
   review burden on the roadmap.

### What it will not become

No price, quote, premium, or estimate. No eligibility verdict. No carrier appetite claim of its
own. No coverage determination. No risk score. No account, no email, no file upload. Those are
enforced by `validateModule()` at build time and by 77 assertions after it, not by policy.
