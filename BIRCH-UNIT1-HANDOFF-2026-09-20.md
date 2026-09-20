# Birch Unit 1 preview handoff

Base: `grok/recover-pr1-pr3-onto-launch-20260915`

Base SHA: `c304042e45d1c55362a8775bf7eb36804ee1265d`

Scope: one bounded preview-only correction from
`bestinsuranceresearch-audit-c304042e45d1c55362a8775bf7eb36804ee1265d-20260920T085237Z.md`.

## Changed

- `src/components/SiteHeader.astro`: shorten both interior search placeholders to
  `Search research`, fixing the 1280px header/panel clipping without changing the
  GET `/ask` route or search meaning.
- `src/lib/citations.ts` and `src/styles/global.css`: render a citation marker and
  immediately following sentence punctuation as one non-breaking inline unit,
  preserving source targets and visible wording.
- `src/lib/corpus.ts`, `src/lib/retrieval.ts`, and `src/pages/ask.astro`: carry
  `reviewState` through the static search index and the client result renderer so
  under-review Ask results say `Record date`.
- `src/pages/questions/index.astro`, `src/pages/questions/[slug].astro`,
  `src/pages/companies/[slug].astro`, and `src/pages/guides/[slug].astro`: use
  `Record date` for under-review list, related-question, and guide metadata while
  leaving completed records as `Reviewed`.
- `scripts/verify.mjs` and `scripts/verify-product-design.mjs`: lock the semantic,
  citation, placeholder, review-state, accessibility, and preview-boundary behavior.
- `outputs/birch-unit1-2026-09-20/README.md`: exact browser evidence and provenance.

No landing-page restyle, Unit 2/3 work, specialty route, Commons opening, machinePath
change, wording/claim expansion, or production/alias change was made. Existing
editorial, citation, attribution, privacy, jurisdiction, moderation, no-JS, and
reduced-motion gates remain in force.

## Validation receipt

- `npm run validate`: pass; 897 preview pages; 199 tests pass.
- `PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://birch.insure npx astro build`:
  pass; 897 pages.
- Production `verify.mjs` + `verify-instrument.mjs`: pass; 166 tests.
- `PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://birch.insure npm run audit:onpage`:
  pass; 0 findings across 568 indexable pages.
- `cd commons && npm run validate`: pass; Commons check 0 errors/0 warnings,
  build pass, 84 tests pass and 1 existing Postgres-dependent test skipped.
- Browser proof: 390/768/1280 captures for `/`, `/ask`, one question, and one guide;
  exact-width no-overflow, skip-link, one-main, placeholder, citation-wrapper, and
  Record date checks pass. Interactive Ask result proof passes.

## Release posture and rollback

This is preview-only. The draft PR must target only
`grok/recover-pr1-pr3-onto-launch-20260915`; do not merge, deploy, promote, open
Commons, or alter production aliases. Rollback is to close the draft PR and/or
`git revert` the single Unit 1 commit; no data or production state is involved.

Risk is limited to presentation and metadata propagation: punctuation binding applies
only to the first immediate sentence mark after a citation, and `reviewState` remains
optional for runtime-only records. The existing route, source, copy, and gate contracts
are otherwise unchanged.

## Queue

Stop after Unit 1 and await independent review. Do not autonomously start Units 2 or 3
or proliferate pages/routes without a new evidence-backed decision.
