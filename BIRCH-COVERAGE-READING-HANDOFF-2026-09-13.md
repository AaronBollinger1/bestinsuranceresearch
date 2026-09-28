# Birch coverage reading-frame handoff — preview only

## Decision

One evidence-supported, additive aesthetic improvement was selected: apply the already-approved Direction A reading frame to the canonical coverage record at `/insurance/homeowners`.

The improvement removes the redundant product-context strip from the record header and adds the existing record-section navigation and source inspector. It makes the page read as one focused evidence record on desktop and mobile. No new visual language, content, or route was introduced.

## Exact implementation

- `src/pages/insurance/[slug].astro` — use the existing `birch-reading` body frame; remove only the redundant `ProductContextBar`; add existing `RecordNavigation` and `SourceInspector`. The template applies to the existing `/insurance/*` coverage family; canonical paths, section IDs, source records, JSON companions, citation links, Commons handoff, and correction control remain unchanged.
- `scripts/verify-product-design.mjs` — extend the existing reading-page structural invariant to the coverage family and add a preview-only `/insurance/homeowners` assertion for the reading frame, noindex, navigation targets, JSON companion, and one source inspector.
- `outputs/birch-coverage-reading-2026-09-13/` — stored comparison captures at 1280x900 and 390x844:
  - [before desktop](outputs/birch-coverage-reading-2026-09-13/before-desktop.png)
  - [after desktop](outputs/birch-coverage-reading-2026-09-13/after-desktop.png)
  - [before mobile](outputs/birch-coverage-reading-2026-09-13/before-mobile.png)
  - [after mobile](outputs/birch-coverage-reading-2026-09-13/after-mobile.png)

## Evidence and verification

- Selection basis: the Direction A coverage specimen and the mobile reading audit's remaining coverage-template gap; the change stays within existing Birch tokens and components.
- `npm run verify` — 181 passed, 0 failed.
- `npm run validate` — passed; preview build emitted 892 pages; Astro check reported 0 errors.
- `PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://birch.insure npx astro build` — passed; 892 pages.
- `PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://birch.insure node --experimental-strip-types --test scripts/verify.mjs scripts/verify-instrument.mjs` — 162 passed, 0 failed.
- `npm run audit:onpage` — 0 findings across 563 indexable pages.
- `cd commons && npm run validate` — 80 passed, 1 documented skip, 0 failed.
- Browser check on the local preview: `scrollWidth === innerWidth` at 390px and 1280px; the accessibility tree exposes the skip link, one main landmark, record-section links, Sources button, Cite action, source ledger, and footer. Opening Sources creates the existing dialog; Escape closes it and returns focus to Sources.

## Locked boundaries

Wording, research claims, source records, review posture, route availability, navigation meaning, Commons gate, signup gate, construction gate, and functionality are unchanged. `PUBLIC_COMMONS_READY` remains false. This is a preview release-candidate change only: no merge, push, deploy, production promotion, publication, signup, policy intake, or agent creation was performed. BestAMS, Bollinsure, and Covwell were not touched.

## Handoff

Worktree: `/Users/aaronbollinger/Documents/GitHub/bestinsuranceresearch-wt-design-next-20260913`

Branch: `codex/birch-preview-design-next-20260913`

Base before this pass: `ad67133` (`Design remaining Direction A page templates and recovery states`). The local commit containing this handoff is the release-candidate checkpoint; do not promote it without the existing construction and licensed-review gates.

PR lookup was unavailable because the GitHub API could not resolve from this environment. The local branch currently tracks `origin/claude/bold-hopper-mqcyen`; no push was attempted.
