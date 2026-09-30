# I7 receipt: the Limitations heading is visible

Date: 2026-09-30. Parent `385de71`. Found in the I5-I6 screenshots.

`EvidenceBoundary` renders an h2 ("Limitations") on the ink ground. It inherited
the site's ink heading colour and was invisible on every question page. One
rule in `src/styles/global.css` gives it the paper colour. The stat-figure
contrast test in `scripts/verify.mjs` now also fails if that rule loses its
light colour.

| Command | Result |
|---|---|
| `npm run validate` | 389 / 389 pass |

Screenshots: `questions_schedule-valuables-or-separate-floater-*` (looked at;
the heading reads at 390, 768 and 1280).

A general contrast check across all tokens and dark components belongs to D4.
