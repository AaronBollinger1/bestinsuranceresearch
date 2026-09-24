# Birch CTA redesign — preview-only implementation handoff

Date: 2026-09-15
Lane: Birch, existing draft PR #3
Audited starting head: `98fe1f0a2852e4cf5a8f09a831fe8a9d614d4911`
Review target: the exact pushed PR #3 head recorded with the final commit and one independent Grok audit request.

## Bounded unit

The homepage front door no longer asks visitors to choose between equal starting points or presents twin first-viewport cards. It now gives the consumer path one primary action:

- `Ask a question` — native GET `/ask` composer.
- `Get cited` — compact quiet path to `/professionals`.
- `Prepare a private draft` — text link to `/contribute?type=research`.

The professional strip states that editorial review is required, accepted contributions can earn attribution, and publication is not guaranteed. It also retains the preview denial that it does not provide individualized advice or a live credential. The existing consumer `Question → Sources → Answer → Discussion` links remain unchanged; discussion remains a private preview.

The manifesto keeps its eight semantic, non-link scope labels, one `/professionals` action, and the primary `/ask` action; only its quiet label changes from `Explore contributing` to `Get cited`. No routes, content records, review states, licenses, Commons surfaces, production settings, or other products changed.

## Files in this unit

- `src/components/BirchFrontDoor.astro` — remove the switcher/equal branch grid and full-size professional card; add the compact quiet strip; rename the consumer submit action.
- `src/components/BirchAssetManifesto.astro` — align the single quiet professional CTA to `Get cited`.
- `scripts/verify-product-design.mjs` — lock the one-primary / quiet-professional semantics and preserve the existing route and denial checks.
- `outputs/birch-cta-redesign-2026-09-15-before/` — byte copies of the existing pre-change receipts from the unchanged 5d8730c UI, retained as before evidence.
- `outputs/birch-cta-redesign-2026-09-15-after/` — fresh 1280px and 390px captures, including `#question-path`, `#expertise-path`, and `#asset-protection` anchor receipts.

## Proof

- Browser capture at 1280×844 and 390×844: `overflow=false`, one front-door primary action, quiet professional links present, and `#expertise-path` lands below the sticky header (`top` ≈ 88px in both widths).
- Fresh after screenshot SHA-256: desktop `88914abc56bbd8550f7acba330c4cebc46fc1174a39723db520e778ed864ad21`; mobile `74746c879d34d1da15cf76b1f553c91a1d8e24a5b2b11c95355ad5ff63764d6e`.
- Before screenshot SHA-256: desktop `cd17fe0c64cd82f9d3792061400fa5a4c0ed1ec206f28355540f77c224479f66`; mobile `5139dc7aa3ee1412810f919b4d82f24cb143e33362d857debd197973790d4359`.
- Focused product-design verifier: 14/14 passing.
- `npm run validate`: passing preview catalog, Astro check, 892-page build, and full verification suite; existing schema deprecation warnings only.
- Targeted static proof: GET `/ask`, exactly one `btn-primary`, quiet `/professionals`, `/contribute?type=research`, no switcher/old CTA strings, scroll-margin, and reduced-motion CSS.
- Dev-server route probes: `/`, `/ask`, `/professionals`, `/contribute?type=research`, `/sources`, and `/design/commons-preview` all returned 200.

## Protected state and review boundary

The pre-existing untracked `outputs/birch-asset-manifesto-2026-09-13/browser-notes.json` was not edited or staged; its SHA-256 remains `b4dbac00dda2a0deed858fd4f5f6a6e9b23e2c3308b71706cbe944f9ff6cb784`. The pre-existing untracked audit and overnight handoff files are also not part of this unit. No merge, deploy, promotion, Commons opening, review-state change, wording/claim expansion, or production publication occurred.

Independent review requested once, against the exact pushed PR #3 head.
