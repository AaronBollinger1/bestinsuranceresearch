# Birch front-door preview handoff — 2026-09-13

## Decision

This checkpoint implements exactly one additive unit on the canonical homepage (`/`): an equal-weight two-audience entry that makes the existing consumer and professional paths legible at the first decision.

- **I have a question** keeps the existing `/ask` composer and leads through `Question → Sources → Answer → Discussion`.
- **I share financial expertise** reuses `/professionals` and `/contribute?type=research`, then shows `Contribution → Review → Byline → Author profile`.
- The destinations are existing routes only: `/ask`, `/sources`, `/questions/replacement-cost-vs-market-value`, `/design/commons-preview`, `/professionals`, `/contribute?type=research`, and `/authors/aaron-bollinger`.
- The discussion step is explicitly future/private: moderated discussion or commenting remains a separate Community surface and is not open in this preview.

The measured gap was that the consumer composer was the first clear decision while professional entry existed only in a lower home rail. The new unit is confined to `src/components/BirchFrontDoor.astro`; it adds no content, identity, source, moderation, signup, or production system. `scripts/verify-product-design.mjs` locks the two paths, their ordered stages, exact route reuse, and the absence of unsupported acquisition/reputation promises.

## Design and truth guardrails

The reference scan supplied patterns only: explicit question/answer state from [Stack Overflow’s accepted-answer guidance](https://stackoverflow.com/help/accepted-answer), authored-work/profile linkage from [Substack publishing](https://support.substack.com/hc/en-us/articles/29152946791188-How-can-I-publish-on-Substack), [Substack profiles](https://support.substack.com/hc/en-us/articles/360039415251-How-do-I-update-my-Substack-profile), and [Medium profiles](https://medium.com/blog/profiles-are-a-lot-more-organized-71034aaec9af), plus ordered workflow stages from [Linear’s Start Guide](https://linear.app/docs/start-guide) and [conceptual model](https://linear.app/docs/conceptual-model). No wording, assets, trade dress, reputation mechanics, testimonials, metrics, guarantees, or claims were copied.

The new labels describe product state, not research findings. Existing wording, cited claims, source/Commons/signup gates, navigation meaning, review uncertainty, and construction restrictions remain locked. No promise is made about backlinks, readers, leads, credentials, publication, or live community features. The professional path points to the existing private, unsaved contribution preview and existing illustrative author record; it does not imply a live publication pipeline or verified credential.

Motion is interaction-led only: a small arrow nudge on hover/focus clarifies each link without autoplay. The DOM remains ordered and readable with JavaScript disabled; keyboard focus remains visible; `prefers-reduced-motion: reduce` removes transitions and transforms; the mobile layout stacks the cards and flow steps at 390px.

## Receipts

Screenshots:

- [Before desktop — 1280×900](outputs/birch-front-door-2026-09-13/before-desktop.png)
- [Before mobile comparison — 390×844](outputs/birch-front-door-2026-09-13/before-mobile.png)
- [After desktop — 1280×900](outputs/birch-front-door-2026-09-13/after-desktop.png)
- [After mobile — 390×844 device emulation](outputs/birch-front-door-2026-09-13/after-mobile.png)

Focused browser proof on the local preview:

- 1280px and emulated 390px: `innerWidth === scrollWidth === bodyScrollWidth`; no horizontal overflow.
- Both audience cards and both ordered four-stage flows are present.
- With reduced motion: focused flow link remained focused, transition was `0s`, animation was `none`.
- With script execution disabled: both paths, ordered flows, and their readable links remained present.
- Existing route hrefs are asserted in the focused product-design test.

Required gates completed:

- `npm run validate` — 182 root tests passed; preview build produced 892 pages.
- `PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://birch.insure npx astro build` — 892 pages.
- Production-posture verification — 162 tests passed.
- `npm run audit:onpage` — 0 findings across 563 indexable pages; 328 noindex pages skipped by design.
- `cd commons && npm run validate` — 80 passed, 1 skipped, 0 failed.
- `npm run check` — 0 errors, 0 warnings.

The default preview build was restored after the production-posture gate. The prior coverage/reading checkpoint remains in [BIRCH-COVERAGE-READING-HANDOFF-2026-09-13.md](BIRCH-COVERAGE-READING-HANDOFF-2026-09-13.md).

## Independent critique

**Strength:** the first decision now gives both audiences equal visual weight while the stage labels show what Birch offers today and what remains gated.

**Risk:** the front door is materially taller, and the professional flow is still a preview because contribution is local-only and Community is not live. Keep the two cards stable; do not add testimonials, metrics, reputation mechanics, or another competing home direction.

## Handoff state

- Branch: `codex/birch-preview-design-next-20260913`
- Base: `origin/claude/bold-hopper-mqcyen`
- PR: existing draft PR #3; update in place
- Scope: preview-only; no merge, deploy, production publish, or production configuration change
