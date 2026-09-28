# Birch ask → cited-answer Focus journey — 2026-09-21

Preview-only. Base: `grok/recover-pr1-pr3-onto-launch-20260915` after PR #30 merge `952d2b3f3724795bb1c3436248ec097fc9158d98`.

## Unit

Carry the approved Focus browse/reading frame into the canonical `/ask` → cited-answer journey. Representative record: `/questions/california-minimum-auto-insurance-and-proof`. No source content, claims, review states, or publication gates changed.

- `/ask` uses the Focus header pattern (inlined, not `FocusPageHeader`, so recover CSS-in-HTML tests stay green). Sole primary submit is **Ask a question**. **Get cited** is the quiet professional path.
- Featured examples stay one hop to `/questions/<id>` (no JS trap).
- Lookup and browse rows name the next step: Read the answer / Open sources on the record. Hit classes live in `global.css` so JS-rendered rows match without an Astro cid.
- Question pages add a reading journey (Answer · Limitations · Sources · Related reading), a visible Limitations boundary, and an Open sources control that is a `#source-ledger` link without JS and opens the source drawer with JS (focus returns on close, existing inspector).

## Not in this unit

Landing/front door, Commons, review-state values, production aliases, live AI.
