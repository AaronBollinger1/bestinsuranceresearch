# Birch machine citation review-state receipt

Target unit: machine-readable citation parity, starting from
`420dc2f7465918695e336fe9bd8e9a1d9ffd5c34`.

This unit changes only machine-facing JSON companions and the two plain-text
citation indexes. It adds `reviewState` to the remaining substantive machine
records and makes `llms.txt` / `llms-full.txt` call an under-review record's
date a **record date**, while completed records retain **last reviewed**. No
visible page copy, route, claim, source, gate, motion rule, or navigation byte
was changed.

## Responsive evidence

Because the unit is machine-only, the exact-base responsive answer captures are
reused as the pixel baseline and regression evidence:

- `../birch-development-status-2026-09-19/answer-390.png`
- `../birch-development-status-2026-09-19/answer-768.png`
- `../birch-development-status-2026-09-19/answer-1280.png`

The live preview at `http://127.0.0.1:4327/questions/replacement-cost-vs-market-value`
was also inspected with the browser bridge. It retained the above-fold
`In development.` gate, `Search research`, `Record date`, visible source links,
and the existing no-JS/reduced-motion-safe page structure. No animation or CSS
was changed by this unit.

## Machine evidence

- Preview build: `897 page(s) built`.
- Focused verifier: `node --experimental-strip-types --test --test-name-pattern='machine citation records preserve|citation indexes distinguish' scripts/verify.mjs` — 2 passed.
- The new assertions cover every question, coverage, guide, company, state, and example machine companion plus representative pending question/coverage entries in both indexes.

The existing `In development`, noindex, Commons-closed, keyboard, and reduced-
motion receipts remain valid because this unit does not alter their source
surfaces.
