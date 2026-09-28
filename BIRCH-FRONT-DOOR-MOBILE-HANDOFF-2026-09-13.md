# Birch front-door mobile handoff — 2026-09-13

## Decision

One screenshot-proven gap remained after the two-audience front door checkpoint: at 390px, the existing professional card began at approximately `y=1175px`, below the 844px first screen. Desktop already showed the two cards together; the mobile stack made the professional audience invisible at the first decision.

This checkpoint adds exactly one coherent unit on the canonical homepage (`/`): a compact, no-JavaScript anchor switcher above the existing cards.

- `I have a question` links to the existing `#question-path` card.
- `I share financial expertise` links to the existing `#expertise-path` card.
- The existing cards, routes, labels, and flows are unchanged: consumer `Question → Sources → Answer → Discussion`; professional `Contribution → Review → Byline → Author profile`.
- No new route, content system, identity system, signup, posting, publication, or live Community feature was introduced.

After the change, the switcher is visible from approximately `y=399px` to `y=496px` at 390px, both choices are visible in the first screen, and the professional card remains the same existing destination at approximately `y=1296px`.

The owner-approved category direction is wired into that same professional branch only: **Evidence-first financial guidance** names education, sources, credential/scope transparency, and editorial review as the product frame; insurance and asset protection remain the launch wedge; future specialist scopes are financial planning, tax, retirement and investing, employee benefits, estate planning, and business finance. The cue is explicitly not individualized advice and does not imply a fiduciary relationship.

## Implementation and constraints

- `src/components/BirchFrontDoor.astro` — add two visible anchor links, the bounded evidence-first scope cue, and restrained hover/focus arrow feedback; preserve the existing equal-weight cards and all existing Question/Sources/Answer/Discussion and Contribution/Review/Byline/Author profile routes.
- `scripts/verify-product-design.mjs` — assert the switcher’s exact anchors and labels in addition to the existing workflow and truth invariants.
- The switcher is plain HTML anchors, so the choice remains readable and usable with JavaScript disabled. Direct hash navigation moves to `#expertise-path` and preserves keyboard focus. `prefers-reduced-motion: reduce` removes the arrow transition and transform. Both 1280px and emulated 390px layouts have no horizontal overflow.

No research wording, factual claim, source record, review posture, route availability, navigation meaning, Commons gate, signup gate, construction gate, or functionality was changed. No backlinks, readers, leads, publication, credentials, fiduciary relationship, or outcomes are promised. Community remains a future/private moderated surface.

## Evidence

Fresh route audit covered `/`, `/ask`, `/questions`, `/professionals`, `/contribute`, `/authors/aaron-bollinger`, `/questions/replacement-cost-vs-market-value`, and `/design/commons-preview` at 1280px and emulated 390px. All audited pages had one main landmark, no horizontal overflow, and retained their existing preview/moderation/source gates.

Screenshots:

- [Before desktop — 1280×844](outputs/birch-front-door-mobile-2026-09-13/before-desktop.png)
- [After desktop — 1280×844](outputs/birch-front-door-mobile-2026-09-13/after-desktop.png)
- [Before mobile — 390×844](outputs/birch-front-door-mobile-2026-09-13/before-mobile.png)
- [After mobile — 390×844 device emulation](outputs/birch-front-door-mobile-2026-09-13/after-mobile.png)

Focused browser proof:

- 1280px and 390px: `innerWidth`, `scrollWidth`, and `bodyScrollWidth` all match; overflow is false.
- Both switcher anchors are visible at 390px and retain the existing card IDs.
- Direct `/#expertise-path` navigation lands the professional card at the viewport top with its switcher link focusable.
- Reduced motion reports `transition: 0s` and `transform: none` for the focused switcher arrow.
- Script execution disabled still exposes both switcher anchors and both existing audience cards.

## Gates

- `npm run validate` — 182 passed, 0 failed; preview build produced 892 pages.
- `PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://birch.insure npx astro build` — 892 pages.
- Production-posture verification — 162 passed, 0 failed.
- `npm run audit:onpage` — 0 findings across 563 indexable pages; 328 noindex pages skipped by design.
- `cd commons && npm run validate` — 80 passed, 1 skipped, 0 failed.
- `npm run check` — 0 errors, 0 warnings, 376 hints.
- Focused product-design suite — 13 passed, 0 failed.

The default local build was restored to preview posture after the production-posture gate. The preceding front-door checkpoint is recorded in [BIRCH-FRONT-DOOR-HANDOFF-2026-09-13.md](BIRCH-FRONT-DOOR-HANDOFF-2026-09-13.md); the coverage reading checkpoint remains linked there.

## Independent critique

**Strength:** the mobile first decision now exposes both audiences without forcing a reader to scan past a long consumer composer, while each choice still lands on the actual existing workflow.

**Risk:** the switcher adds a second compact representation of the same two choices and increases the hero’s vertical height. Keep it limited to the mobile-discovery problem; do not add metrics, testimonials, personalized acquisition promises, sticky behavior, or another competing front door.

## Handoff state

- Branch: `codex/birch-preview-design-next-20260913`
- Starting head audited: `c3f68d1ee577f64b727e3633adc74ee66953f3b1`
- Base: `origin/claude/bold-hopper-mqcyen`
- PR: existing draft PR #3; update in place
- Scope: Birch preview only; no merge, deploy, production publish, or other-product changes
