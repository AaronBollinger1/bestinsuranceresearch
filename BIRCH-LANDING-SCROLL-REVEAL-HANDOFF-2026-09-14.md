# Birch landing scroll-reveal correction — 2026-09-14

## Decision

At the requested starting head `e470bd1f6c10ca2f9a5c627dac70d6b3e5c88c52`, a fresh screenshot-led critic found one material remaining usability defect: the existing `#question-path` and `#expertise-path` switcher anchors landed beneath the sticky header, clipping the branch heading at both 1280px and emulated 390px. This was separate from the closed Grok CTA and scope-label findings.

The bounded preview-only correction is one CSS declaration in `src/components/BirchFrontDoor.astro`: the two branch targets now use `scroll-margin-top: calc(var(--header-h) + 16px)`. No copy, claims, routes, hierarchy, form behavior, source framing, professional denials, moderation gate, reduced-motion rule, or no-JavaScript path changed.

## Proof

- Before receipts: `outputs/birch-landing-critic-2026-09-14/`
- After receipts: `outputs/birch-landing-critic-2026-09-14-after/`
- At 1280px: branch target top moved from `-0.5px` to `87.5px`.
- At 390px: question target top moved from `-0.1px` to `87.9px`; professional target top moved from `0.0px` to `88.0px`.
- Both widths report `innerWidth === scrollWidth === bodyScrollWidth`, `overflow: false`, and one `main` landmark. The consumer flow remains Question → Sources → Answer → Discussion; the professional flow remains Contribution → Review → Byline → Author profile. The manifesto retains eight non-link scope labels and one `/professionals` action.
- Root and asset-protection screenshots are byte-identical before/after. The protected pre-existing `outputs/birch-asset-manifesto-2026-09-13/browser-notes.json` remains unstaged with SHA-256 `b4dbac00dda2a0deed858fd4f5f6a6e9b23e2c3308b71706cbe944f9ff6cb784`.

## Gates

- Focused `node --experimental-strip-types --test scripts/verify-product-design.mjs`: 14 passed.
- `npm run validate`: 183 passed; preview build 892 pages; Astro check 0 errors, 0 warnings, 376 hints.
- Production build: 892 pages; production verification: 162 passed.
- `npm run audit:onpage`: 0 findings across 563 indexable pages.
- `cd commons && npm run validate`: 80 passed, 1 skipped (external Postgres), 0 failed.

Independent Grok review is requested against the single pushed commit SHA in draft PR #3. No merge, deploy, production publish, or other-product work occurred.
