# Birch positioning audit — 2026-09-14

Read-only. No product edit, commit, push, merge, deploy, publish, specialty route, or broadened claim.

## Scope

- Exact head: `880f56ffd3b4581e62f4950256a92c23bcd3ab0a` (`Make Birch asset scopes semantic labels`)
- Draft PR #3: https://github.com/AaronBollinger1/bestinsuranceresearch/pull/3
- Surfaces: landing `/`, `/professionals`, `/ask`, `/questions/replacement-cost-vs-market-value`
- Question: after the non-link chip correction, is there one material positioning/product-usage defect left?

## Preview access

Vercel marked this SHA Ready on both projects:

- `bestinsuranceresearch-preview` unique URL: https://bestinsuranceresearch-preview-obyg0e5gm.vercel.app (`dpl_6yxDxwtoam8gBiJPPM9SuiECCSQM`)
- Git alias: https://bestinsuranceresearch-prev-git-8b673c-aaronbollinger1s-projects.vercel.app
- CI: suite, production-posture, and commons all **success** on this SHA

Those hostnames are Vercel SSO-gated (`Login – Vercel`) from this environment. Fresh 1280×844 and emulated 390×844 screenshots were taken from the local preview at `http://127.0.0.1:4324/`, which is serving this same head (eight `SPAN` scope labels, one `/professionals` manifesto action). Receipts: `outputs/birch-positioning-audit-2026-09-14/`.

Untracked `outputs/birch-asset-manifesto-2026-09-13/browser-notes.json` was not read for mutation, deleted, or overwritten.

## Reconciliation: chip correction holds

Committed receipts in `outputs/birch-asset-chip-semantics-2026-09-14/` already showed identical pixels before/after because that pass changed semantics, not paint.

Fresh audit metrics on this head:

- Eight scope labels: Insurance and carriers; Claims and adjusting; Financial planning; Tax; Legal; Real estate and mortgage; Employee benefits; Business finance
- Node type: `SPAN` (`scopeTag: "SPAN"`)
- Scope links: `0`
- Manifesto actions: `Ask a question` → `/ask`; `Explore contributing` → `/professionals` (exactly one professional href)
- 1280px and 390px: `innerWidth === scrollWidth`; overflow false
- Reduced-motion and no-JS manifesto frames match the static pair (`Ensure your assets are protected.` as `h2`; `Insure your assets.` as supporting copy; stage remains hidden)

Cited:

- [Landing manifesto desktop](outputs/birch-positioning-audit-2026-09-14/landing-desktop-manifesto.png)
- [Landing manifesto mobile](outputs/birch-positioning-audit-2026-09-14/landing-mobile-manifesto.png)
- [Reduced motion](outputs/birch-positioning-audit-2026-09-14/landing-desktop-manifesto-reduced.png)
- [No JavaScript](outputs/birch-positioning-audit-2026-09-14/landing-desktop-manifesto-nojs.png)
- Prior semantic receipts: [chip-semantics after desktop manifesto](outputs/birch-asset-chip-semantics-2026-09-14/after-desktop-manifesto.png)

The previous ranked defect (eight identical `/professionals` chip links) is closed. Residual visual risk remains: the labels still look like buttons. That is already recorded in `BIRCH-ASSET-SCOPE-LABEL-HANDOFF-2026-09-14.md` and is **not** the highest-impact remaining issue.

## What still serves both audiences

Consumers: first screen still forks to a question (`landing-desktop.png`); `/ask` states it searches existing records and does not generate advice (`ask-desktop.png`); the cited answer remains under review with sources (`question-desktop.png`).

Contributors: insurance, claims, planning, tax, legal, real estate/mortgage, benefits, and business finance remain named on the professional card and as manifesto labels. `/professionals` is a private preview with “Not yet verified,” “Only after editorial approval,” and “accounts and publishing are not open” (`professionals-desktop.png`, `professionals-mobile.png`). No rankings, quotes, credential-verified claims, or lead forms on these surfaces.

## Ranked refinement (1 of 1)

**The professional card’s primary CTA still says `Explore publishing`, and it lands on a page that says publishing is not open.**

That contradicts the manifesto’s honest `Explore contributing` on the same homepage, and it over-promises the contributor path this audit is required to protect.

### Screenshot evidence

- [Landing expertise card, 1280×844](outputs/birch-positioning-audit-2026-09-14/landing-desktop-expertise.png) — primary button **Explore publishing** next to **Prepare a private draft**; Future discussion already says Community is not open.
- [Professionals desktop](outputs/birch-positioning-audit-2026-09-14/professionals-desktop.png) — destination copy: **Private preview. Prepare a local draft now; accounts and publishing are not open.**
- [Professionals mobile](outputs/birch-positioning-audit-2026-09-14/professionals-mobile.png) — same gate on the first 390px screen.
- [Landing manifesto](outputs/birch-positioning-audit-2026-09-14/landing-desktop-manifesto.png) — same origin already uses **Explore contributing** for the identical `/professionals` destination.

Live DOM at this head: `explorePublishing: ["/professionals"]` on `/`; empty on `/professionals`. The string exists only in `src/components/BirchFrontDoor.astro`.

### Bounded acceptance

One copy change. No new routes. No specialty directory. No claim broadening.

1. In `src/components/BirchFrontDoor.astro`, change the primary professional button label from `Explore publishing` to `Explore contributing`. Keep `href="/professionals"`. Keep **Prepare a private draft** → `/contribute?type=research`.
2. Do not retitle `I share financial expertise`, restyle manifesto chips, add per-scope CTAs, or invent specialty pages.
3. Do not change `/professionals` “How publishing works” (that is an editorial-policy link, not a publish action).
4. Optional lock in `scripts/verify-product-design.mjs`: front door contains `Explore contributing` and does not contain `Explore publishing`.
5. Accessibility / motion: native `<a>` only; no new script, animation, or `aria` change. Reduced-motion and no-JS must still show the same label. Keyboard still has two professional actions on the card (contributing + private draft), not eight chip stops.
6. Re-check 1280px and 390px: no overflow; manifesto still has eight non-link labels and one `/professionals` action.

### No-churn alternatives (explicitly not this follow-up)

- **Leave the label** if the owner reads “Explore publishing” as “inspect the publishing path” (the card already lists Contribution → Review → Byline). That reading is available; it is weaker than matching the manifesto and the destination gate.
- **Do not restyle the eight scope chips** to look less like buttons. Semantics are already correct; a visual restyle is the residual risk from the last pass, not a new defect.
- **Do not retitle the switcher** to name legal/real-estate. Those specialties already appear in the professional-card body (`landing-desktop.png`) and as manifesto labels; a longer switcher reopens the 390px wrap.
- **Do not change ProductPreview `Join a conversation` in this unit.** It sits under the manifesto’s “not open here” (`landing-desktop-manifesto.png`) but is a pre-existing specimen tab, not the professional CTA contradiction.
- **Do not open publishing, accounts, or Community** to make “Explore publishing” true.

If the owner would rather not spend a validate/commit cycle on one visible string, **no-churn is a valid close for the chip work**; it is not a valid close for this CTA mismatch if the next pass is going to touch the homepage at all.

## Accessibility / reduced-motion / no-JS (current head)

- Manifesto: no client script; decorative stage `hidden` + `aria-hidden`; `h2` is the final sentence in default, reduced-motion, and no-JS captures.
- Scope chips: not in the tab order (spans). Keyboard surface in the unit is Ask a question + Explore contributing.
- Front-door `Explore publishing` is a real link with a visible name; the defect is the name, not the control.
- `/ask` and the question page: no overflow at 1280 or 390; `/ask` already denies generated advice.

## Handoff state

- Branch: `codex/birch-preview-design-next-20260913`
- Exact head audited: `880f56ffd3b4581e62f4950256a92c23bcd3ab0a`
- Base: `origin/claude/bold-hopper-mqcyen`
- PR: existing draft PR #3; do not merge from this audit
- This file is audit-only; it is not a product change
