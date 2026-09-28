# Birch asset-scope semantics — 2026-09-14

## Decision

One additive preview-only correction was made at the exact starting head `6e59a283a6b3745f876bce88f36684cc474f6d54`: the eight visible contribution scopes in the homepage asset-protection manifesto are now non-link labels. They remain visually identical chips and keep the exact wording:

- Insurance and carriers
- Claims and adjusting
- Financial planning
- Tax
- Legal
- Real estate and mortgage
- Employee benefits
- Business finance

The labels are scope indicators, not specialty destinations. The single professional action remains `Explore contributing` → `/professionals`. No specialty route, second identity system, or new contribution path was added.

## Why

Before this pass, all eight chips independently pointed to the same `/professionals` preview. That repeated destination implied eight distinct navigable specialties and added eight unnecessary keyboard stops, although no specialty routes exist. The correction keeps the two-audience hierarchy, sourced-answer framing, professional contribution path, denials, gates, layout, and visual treatment unchanged.

No copy or research claim was added. Existing boundaries remain in force: no personalized advice, fiduciary or attorney-client relationship, credential badge, ranking, lead, reader, backlink, publication, outcome, or live discussion promise.

## Implementation

- `src/components/BirchAssetManifesto.astro` — scope data is now label text rendered as `<span class="asset-manifesto-scope-label">`; the existing `/ask` and `/professionals` actions are unchanged.
- `scripts/verify-product-design.mjs` — focused assertions require eight semantic labels, zero scope links, and exactly one `/professionals` action.
- `outputs/birch-asset-chip-semantics-2026-09-14/` — exact 1280×844 and CDP-emulated 390×844 before/after receipts, including manifesto-focused captures.

The pre-existing untracked `outputs/birch-asset-manifesto-2026-09-13/browser-notes.json` was read only, not overwritten, deleted, or staged. SHA-256 before and after: `b4dbac00dda2a0deed858fd4f5f6a6e9b23e2c3308b71706cbe944f9ff6cb784`.

## Evidence

- [Before desktop — 1280×844](outputs/birch-asset-chip-semantics-2026-09-14/before-desktop.png)
- [After desktop — 1280×844](outputs/birch-asset-chip-semantics-2026-09-14/after-desktop.png)
- [Before desktop manifesto — 1280×844](outputs/birch-asset-chip-semantics-2026-09-14/before-desktop-manifesto.png)
- [After desktop manifesto — 1280×844](outputs/birch-asset-chip-semantics-2026-09-14/after-desktop-manifesto.png)
- [Before mobile — 390×844](outputs/birch-asset-chip-semantics-2026-09-14/before-mobile.png)
- [After mobile — 390×844](outputs/birch-asset-chip-semantics-2026-09-14/after-mobile.png)
- [Before mobile manifesto — 390×844](outputs/birch-asset-chip-semantics-2026-09-14/before-mobile-manifesto.png)
- [After mobile manifesto — 390×844](outputs/birch-asset-chip-semantics-2026-09-14/after-mobile-manifesto.png)

The before/after pixels are identical by design: this pass changes semantics and keyboard exposure without changing the visual chip treatment. All four screenshots are valid PNGs at their named dimensions.

Focused browser proof after the change:

- CDP metrics at 1280px and emulated 390px: `innerWidth === scrollWidth === bodyScrollWidth`; `overflow: false`.
- Both widths expose `scopeLabels: 8`, `scopeLinks: 0`, and `professionalActions: ["Explore contributing"]`.
- DOM semantics: all eight scope nodes are `SPAN`; the manifesto has no `script`; only `Ask a question` and `Explore contributing` are tabbable within the unit.
- The built HTML preserves the same labels and actions with JavaScript disabled; the component contains no client script or new motion.
- Existing reduced-motion contract is unchanged; no animation, transition, or transform was added by this pass.

## Gates

- `npm run validate` — 183 passed, 0 failed; preview build produced 892 pages; Astro check 0 errors, 0 warnings, 376 hints.
- `PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://birch.insure npx astro build` — 892 pages.
- Production-posture verification — 162 passed, 0 failed.
- `npm run audit:onpage` — 0 findings across 563 indexable pages; 328 noindex pages skipped by design.
- `cd commons && npm run validate` — 80 passed, 1 skipped, 0 failed.
- Focused browser semantic/accessibility proof — passed at 1280px and emulated 390px.

The default preview build was restored after production checks. No source records, claims, review states, signup or publication gates, Community readiness, navigation meaning, or production aliases changed.

## Independent critique

**Strength:** the chips now communicate breadth without pretending that Birch has eight live specialty destinations, and keyboard users reach only real actions.

**Risk:** the unchanged chip styling can still look interactive at a glance. Keep the heading/body explanation and single `Explore contributing` action paired with it; do not add hover states, specialty routes, or per-scope CTAs in this unit.

## Handoff state

- Branch: `codex/birch-preview-design-next-20260913`
- Starting head audited: `6e59a283a6b3745f876bce88f36684cc474f6d54`
- Base: `origin/claude/bold-hopper-mqcyen`
- PR: existing draft PR #3; update in place
- Scope: Birch preview only; no merge, deploy, production publish, or other-product changes
