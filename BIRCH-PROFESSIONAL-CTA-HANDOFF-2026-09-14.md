# Birch professional CTA refinement — 2026-09-14

## Decision

Implemented the single ranked refinement from `BIRCH-POSITIONING-AUDIT-2026-09-14.md` at the requested starting head `880f56ffd3b4581e62f4950256a92c23bcd3ab0a`.

The front-door professional primary CTA now reads **Explore contributing** and still links to `/professionals`. The adjacent **Prepare a private draft** action still links to `/contribute?type=research`. This is one label change in `src/components/BirchFrontDoor.astro`; no route, layout, style, claim, gate, or behavior was added.

## Why

The prior **Explore publishing** label contradicted the destination’s visible gate: `/professionals` says the preview can prepare a local draft but accounts and publishing are not open. **Explore contributing** describes the available preview path without promising publication, readers, backlinks, leads, credentials, or outcomes.

The equal-weight two-audience switcher, the consumer Question → Sources → Answer → future Discussion flow, the professional Contribution → Review → Byline → Author profile flow, and the eight non-link asset-scope labels remain unchanged. ProductPreview and `/professionals` editorial-policy copy were not edited.

## Implementation and proof

- `src/components/BirchFrontDoor.astro` — renamed only the primary professional anchor label; `href="/professionals"` is unchanged.
- `scripts/verify-product-design.mjs` — requires the exact `/professionals` + **Explore contributing** pair, the exact `/contribute?type=research` + **Prepare a private draft** pair, and rejects **Explore publishing**.
- `BIRCH-POSITIONING-AUDIT-2026-09-14.md` — staged unchanged as the read-only ranked audit.
- `outputs/birch-professional-cta-2026-09-14/` — new focused before/after 1280×844 and 390×844 screenshots.
- `outputs/birch-positioning-audit-2026-09-14/` — staged audit screenshot and notes receipts.

Before and after browser proof at `#expertise-path`:

- 1280px and emulated 390px: `innerWidth === scrollWidth === bodyScrollWidth`; overflow is false.
- Before: primary text **Explore publishing**, primary href `/professionals`; draft text and href remained **Prepare a private draft** → `/contribute?type=research`.
- After: primary text **Explore contributing**, primary href `/professionals`; draft text and href remain unchanged.
- Each width exposes exactly one `/professionals` link in the professional card’s action row.
- The CTA remains a native anchor, so no-JavaScript navigation and keyboard access are unchanged. No script, animation, transform, ARIA, or reduced-motion rule was added.
- The existing manifesto proof remains intact: eight `SPAN` scope labels, zero scope links, one `/professionals` action, and no overflow.

The pre-existing untracked `outputs/birch-asset-manifesto-2026-09-13/browser-notes.json` was preserved byte-for-byte, not staged, with SHA-256 `b4dbac00dda2a0deed858fd4f5f6a6e9b23e2c3308b71706cbe944f9ff6cb784`.

## Gates

- Focused `node --experimental-strip-types --test scripts/verify-product-design.mjs` — 14 passed, 0 failed.
- `npm run validate` — 183 passed, 0 failed; preview build produced 892 pages; Astro check 0 errors, 0 warnings, 376 hints.
- `PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://birch.insure npx astro build` — 892 pages.
- Production-posture verification — 162 passed, 0 failed.
- `npm run audit:onpage` — 0 findings across 563 indexable pages; 328 noindex pages skipped by design.
- `cd commons && npm run validate` — 80 passed, 1 skipped, 0 failed.

The default preview build was restored after production checks. No production publish, merge, deployment, signup, publishing, Community, or other-product action occurred.

## Independent critique

**Strength:** the CTA now matches the actual contribution preview and removes an avoidable publication promise while preserving the professional path’s useful draft action.

**Risk:** “Explore contributing” still lands on a gated preview. Keep the destination’s existing “accounts and publishing are not open” language paired with the action; do not change this into an open-publishing or specialty-directory promise.

## Handoff state

- Branch: `codex/birch-preview-design-next-20260913`
- Starting head audited: `880f56ffd3b4581e62f4950256a92c23bcd3ab0a`
- Base: `origin/claude/bold-hopper-mqcyen`
- PR: existing draft PR #3; update in place
- Scope: Birch preview only; no merge, deploy, production publish, or other-product changes
