# Birch review-state discovery surfaces — preview handoff

Status: preview-only, draft PR against `grok/recover-pr1-pr3-onto-launch-20260915`.

Base: `99c8108c8021dbb3725322b4af55b1c061049c8d`
Branch: `birch/mvp-99c8108-20260921`

## Unit

Public discovery surfaces now derive their date label from the record review state. An `under-review` record says `Record date`; reviewed or corrected records keep the existing reviewed wording. The same neutral distinction now reaches author work lists, the private Shelf specimen, state detail and related questions, live module detail, and RSS descriptions. No routes, claims, sources, gates, Commons behavior, motion, or production configuration changed.

## Files

- `src/lib/review-label.ts` — shared public date-label rule.
- `src/lib/corpus.ts` — carries review state into the RSS/home recency model.
- `src/pages/authors/[slug].astro`
- `src/pages/shelf.astro`
- `src/pages/states/[slug].astro`
- `src/pages/tools/[module].astro`
- `src/pages/rss.xml.ts`
- `scripts/verify.mjs` — deterministic rendered-output assertions for the affected surfaces.
- `outputs/birch-review-state-surfaces-2026-09-21/README.md` — responsive/live browser receipt.

## Proof

- `npm run validate` — pass; 897 preview pages, 202 checks.
- `PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://birch.insure npx astro build` — pass.
- `PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://birch.insure node --experimental-strip-types --test scripts/verify.mjs scripts/verify-instrument.mjs` — pass; 169 checks.
- `npm run audit:onpage` — pass; 0 findings across 568 indexable pages.
- `cd commons && npm run validate` — pass; 84 checks, 1 pre-existing Postgres integration skip.
- Focused check: `node --experimental-strip-types --test --test-name-pattern='under-review discovery surfaces' scripts/verify.mjs` — pass.
- Responsive receipt: `outputs/birch-review-state-surfaces-2026-09-21/README.md`, reusing the exact-base 390/768/1280 Birch screenshot pack and recording a fresh local browser pass on `/authors/aaron-bollinger`.

## Safety and rollback

The preview remains above-the-fold `In development`, noindex/no-follow, no-JS readable, reduced-motion safe, and Commons-closed. No production alias, launch branch, main branch, database, provider, or external form was touched. Rollback is the single PR diff (or revert its commits); the previous integration-branch commit is the safe base.

## Next queue

Stop autonomous page proliferation. The next meaningful capability remains the owner-gated contributor moderation/persistence path; it is dependency-blocked by the Commons/database/email launch decision. Otherwise return NO-CHURN unless measured unanswered demand or a source/jurisdiction update creates a new bounded need.
