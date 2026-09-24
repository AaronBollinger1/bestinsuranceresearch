# Birch preview rebrand handoff — 2026-09-21

## Exact release boundary

- Base: `e86cf7e21855b25ec64f95ad5609c525e8b52be0`
- Branch: `birch/rebrand-focus-20260921`
- Target only: `grok/recover-pr1-pr3-onto-launch-20260915`
- Preview only. No production, launch alias, Commons, provider, form, data, or copy change.

## One bounded unit

The local exact-base audit found the highest-value remaining visual gap in the Direction A front door: the consumer composer, quiet professional second act, and Question → Sources → Answer → Discussion path shared one dense card, while the asset-protection wedge read as an ungrouped strip. This pass keeps the existing markup, wording, routes, and gates but gives the two surfaces a calmer hierarchy:

- the four-step question path becomes a single sequential row on wide screens and retains the existing two-column/one-column responsive fallbacks;
- the professional strip gets a clearer quiet separation from the consumer action;
- the asset-protection section gains a bounded surface, clearer layer rhythm, and a four-column scope grid that collapses at the existing breakpoints;
- existing motion remains opt-in and reduced-motion safe; no JavaScript is required for the layout or routes.

## Evidence

The before audit was captured from the exact local SHA in the browser pass at the 1280 CSS viewport: the question card, professional strip, and four-step path were visibly competing in one block; the asset section had no grouping surface. The after browser pass showed the new separation and the same sourced-answer framing. The automation surface exposed the live image for visual inspection but did not provide a file-backed screenshot export, so no synthetic PNGs are claimed here.

Existing responsive receipts reused for geometry comparison:

- 390px: `outputs/birch-development-status-2026-09-19/frontdoor-390.png`, `outputs/birch-development-status-2026-09-19/answer-390.png`
- 768px: `outputs/birch-development-status-2026-09-19/frontdoor-768.png`, `outputs/birch-development-status-2026-09-19/answer-768.png`
- 1280px: `outputs/birch-development-status-2026-09-19/frontdoor-1280.png`, `outputs/birch-development-status-2026-09-19/answer-1280.png`

Those receipts are used only as the existing geometry pack; they are not presented as new after screenshots. The live browser showed no console errors. Shell-side static checks assert the responsive rules, preview status, noindex metadata, GET ask form, existing professional route, and Commons-preview boundary.

## References and boundaries

Borrowed patterns: Direction A/Focus, calm SaaS-style grouping, readable step sequencing, and restrained evidence surfaces from the checked-in Birch design system. Rejected: competitor wording, assets, trade dress, testimonials, reputation mechanics, metrics, guarantees, individualized advice, lead/backlink promises, credential implications, and live community affordances. The canonical measured 37-dot/arrow bird mark was untouched.

## Verification

- `npm run validate` — pass; 897-page preview build, 204 tests.
- Focused `node --experimental-strip-types --test scripts/verify-product-design.mjs` — pass; 28 tests.
- `PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://birch.insure npx astro build` — pass; 897 pages.
- `PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://birch.insure node --experimental-strip-types --test scripts/verify.mjs scripts/verify-instrument.mjs` — pass; 169 tests.
- `npm run audit:onpage` — pass; 0 findings across 568 indexable pages.
- `commons` validation was intentionally not run because this unit is explicitly scoped away from Commons.

## Rollback and next unit

Rollback is one commit: revert this branch commit. The next finite unit, only after review, is the search/answer/source-drawer reading surface; do not expand content or routes before that review.
