# BestInsurance Research

A public insurance advisory instrument operated by WJB Services, Inc. dba Bollinsure Insurance
Services, a California insurance brokerage.

> Assemble your coverage position. See the gaps, the evidence, the uncertainty, and the next
> responsible step.

An advisory instrument with a research engine underneath. Six line-specific modules assemble
into one coverage position held on the visitor's own device; 231 deterministic checks run
across it; every open item links to a cited source.

This is a **local preview**. It has never been deployed. It emits `noindex, nofollow`, blocks
crawling in `robots.txt`, and loads no analytics.

## Run it

```sh
npm install
npm run dev          # local dev server
npm run validate     # check + build + verify, the full gate
npm run preview      # serve the production build at http://localhost:4321
```

Individually:

| Command | What it does |
| --- | --- |
| `npm run check` | Astro and TypeScript diagnostics |
| `npm run build` | Static build to `dist/` |
| `npm run verify` | 77 assertions against the built output |

`npm run verify` runs after a build and checks the real `dist/` rather than a mock: route
generation, canonical URLs, preview noindex, JSON-LD validity, citation resolution, internal
links, machine-readable companions, analytics privacy, handoff parameters, accessibility
floors, feed correctness, retrieval behaviour, the rule boundary, rule reachability, module
privacy, the domain manifest, and documentation presence.

`validateModule()` also runs **during** the build, from both surfaces that render a module, so a
module whose rules break the boundary cannot produce a page at all. The verify suite asserts the
same invariants afterwards against the built output; that is a second check, not a substitute.

## What is here

**The instrument**

| | |
| --- | --- |
| 8 | live modules, one for every specialty domain that has a site |
| 231 | recorded fields across them |
| 231 | deterministic checks, in five kinds |
| 3 | standalone worksheets |
| 16 | further tools specified, none published |

**The research engine underneath**

| | |
| --- | --- |
| 12 | canonical questions |
| 6 | coverage pages |
| 3 | organizations |
| 3 | states |
| 11 | labelled examples, at least one on every specialty line |
| 251 | source records, from 100+ publishers |
| 318 | built pages |

## How it works

**The position.** One typed object (`src/lib/position.ts`) held in the visitor's own browser.
Each module writes into it; the rule engine reads the whole thing. Because it is one object
rather than nine disconnected forms, a fact recorded in one module can raise an open item in
another. That cross-module inference is the product.

**The rules.** Five kinds only: gap, inconsistency, timing, documentation, question. Every rule
is deterministic, exact comparison or arithmetic on recorded fields. `validateModule()` rejects
anything else at build time, and the test suite asserts that no rule fires on an empty position
and that every rule is reachable.

**The evidence.** Content lives in typed JSON collections validated by Zod. Prose carries inline
`[S:source-id]` markers; `src/lib/citations.ts` resolves each to its source, and **a marker
that does not resolve fails the build**.

**The lookup.** `/ask` is a deterministic lexical search over the corpus, running entirely in
the browser against a static index. There is no model. When nothing supports an answer it
returns *insufficient evidence* rather than guessing.

## Documentation

| File | What it covers |
| --- | --- |
| `POSITIONING.md` | What this product is, and the line it does not cross. **Start here.** |
| `LAUNCH-GATE.md` | What must be true before production |
| `IMPLEMENTATION-AUDIT.md` | What was kept, changed, and deliberately left undone |
| `CONTENT-MODEL.md` | The typed schema and what each field defends against |
| `EDITORIAL-AND-CITATION-STANDARD.md` | Source hierarchy, failure classes, review process |
| `AI-RETRIEVAL-ARCHITECTURE.md` | Retrieval design and the boundary on generation |
| `DESIGN-REFERENCES.md` | Mobbin pass, concept scoring, design decisions |
| `TOOL-REGISTRY-AND-ROADMAP.md` | Modules, worksheets, and how eligibility, appetite, and pricing are handled |
| `ESTATE-PLAN.md` | What to do with all 59 domains, in phases, and the build order for this product. |
| `DOMAIN-ROUTING-MANIFEST.md` | Per-domain reasoning behind the plan. Nothing executed. |
| `scripts/apply-redirects.md` | The runbook for turning the plan into live forwards. |
| `AUTHORITY-AND-DISTRIBUTION-PLAN.md` | How references are earned |
| `ANALYTICS-EVENT-SPEC.md` | Privacy-minimal event contract. Design only. |
| `BOLLINSURE-INTEGRATION.md` | The boundary, and the only data that crosses it |

## The blocking gate

**All 35 content pages and all 6 modules carry `reviewState: 'under-review'`.** No licensed
review has taken place, and the site says so on every page and in every machine-readable
record. That review is the one thing standing between this and production, and for the modules
it means reviewing 231 rules. See `LAUNCH-GATE.md`.

## Environment

| Variable | Purpose |
| --- | --- |
| `PUBLIC_SITE_ENV` | `preview` (default) or `production`. Controls indexing and analytics. |
| `PUBLIC_SITE_ORIGIN` | Canonical origin for URLs and structured data |
| `PUBLIC_BOLLINSURE_ORIGIN` | Handoff destination |
| `PUBLIC_GTM_ID` | Optional. Analytics load only when this is set **and** the environment is production. |
| `PUBLIC_BUILD_DATE` | Optional. Pins "today" for reproducible builds and tests. |

## Boundaries

- This site collects nothing. No account, no email, no phone, no file upload.
- It gives no legal, tax, medical, lending, investment, or claims advice.
- It makes no coverage determination and no eligibility verdict.
- It publishes no rating, ranking, price, or carrier appetite claim of its own.
- It gives no risk score. The only number shown is how much you have recorded.
- Licensed help is offered separately and optionally by Bollinsure, which is not the only
  source of licensed help.
- BestAMS is untouched, unread, and out of scope.
