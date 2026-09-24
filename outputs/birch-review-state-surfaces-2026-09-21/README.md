# Birch review-state surface evidence

Base: `99c8108c8021dbb3725322b4af55b1c061049c8d`
Worktree: `/private/tmp/birch-mvp-99c8108-20260921`
Route under review: `/authors/aaron-bollinger`

## Responsive receipt

The changed markup is label-only; the existing exact-base responsive pack remains the geometry receipt for the shared shell and research surfaces:

- 390px: `outputs/birch-development-status-2026-09-19/frontdoor-390.png`, `outputs/birch-development-status-2026-09-19/answer-390.png`
- 768px: `outputs/birch-development-status-2026-09-19/frontdoor-768.png`, `outputs/birch-development-status-2026-09-19/answer-768.png`
- 1280px: `outputs/birch-development-status-2026-09-19/frontdoor-1280.png`, `outputs/birch-development-status-2026-09-19/answer-1280.png`

The changed author surface was opened from the local preview at `http://127.0.0.1:4328/authors/aaron-bollinger` in the browser-verification pass. The visible work list rendered `RECORD DATE` for pending records and `REVIEWED` only for reviewed records; the page retained the above-the-fold development gate and no-JS-readable links. The same pass scrolled the work list without horizontal overflow at the available desktop viewport.

## Behavior checks

- Preview build: 897 pages.
- The new deterministic verifier covers author profiles, shelf, state detail/related rows, live module detail, and RSS descriptions.
- Existing shared shell reduced-motion and no-JS checks remain in the full suite; no motion or focus behavior changed.
- Commons was not opened or changed.
