# D5 receipt: guide panels readable without JavaScript

Date: 2026-09-30. Parent `f7bf1d8`. Finding F10 (receipts/autopilot/D0/AUDIT.md).

Every guide shipped 7 of its 8 panels with a static `hidden` attribute, so a
reader without JavaScript, or any text extractor that honours `hidden`, got
one section per guide, while `GuideTabs.astro` said every panel was visible
without the script. Panels now ship visible; a small inline script placed
right after them hides the unselected ones at parse time (the hash target if
it names a panel, else the first), so readers with JavaScript see no change
and no flash. CSP already allows inline scripts (`script-src 'self'
'unsafe-inline'`). No design change.

Checked in a headless browser against the built site: raw HTML has 8 panels,
0 hidden; with JavaScript, 1 visible; with `#excludes`, only that panel.

Verify rule: `every guide panel is readable without JavaScript` (no tabpanel
ships `hidden`; the parse-time script is present on every guide).

| Command | Result |
|---|---|
| `npm run validate` | 392 / 392 pass |
| production posture verify | 183 / 183 pass |

Screenshots: `guides_homeowners-*` (looked at; identical presentation).
Residual: without JavaScript the tab buttons render but do nothing; all
content is below them.
