# Birch asset-protection manifesto — 2026-09-13

## Decision

One bounded preview unit on the canonical homepage (`/`) positions Birch as evidence-first asset protection, risk and loss mitigation, and financial-decision education. Insurance remains the launch wedge. Coverage is named as one layer beside prevention, documentation, contracts, planning, mitigation, and recovery.

The unit sits below the existing two-audience front door and above the product preview. It does not replace Direction A’s `Understand your insurance.` headline, and it does not add a route.

A one-time Insure → Ensure scroll morph was built and measured, then rejected. The shipped unit is the static pair:

- `Insure your assets.`
- `Ensure your assets are protected.`

The semantic heading is the final sentence. A hidden `aria-hidden` copy of that sentence remains in the DOM so any later decorative treatment cannot become the accessible name. Reduced-motion and no-JavaScript already show the same final message because there is no motion to disable.

Reviewed contribution scopes are labeled, not live: insurance and carriers, claims and adjusting, financial planning, tax, legal, real estate and mortgage, employee benefits, and business finance. Each links to the existing `/professionals` preview. There is no specialty directory, credential badge, publication queue, or attorney-client / fiduciary relationship.

Moderated discussion stays a separate Community preview. This page does not collect or deliver leads.

## Why the morph lost

The morph was implemented as an opacity-only, one-shot overlay (`aria-hidden`, `hidden` until JavaScript, `prefers-reduced-motion` skipped it). Measured mid-crossfade at 1280px:

- `fromOpacity` ≈ 0.21
- `toOpacity` ≈ 0.79

The screenshot shows `Insure` and `Ensure` superimposed into a ghosted misspelling. The start state also presented `Insure your assets.` as a large headline, which reads as a sales imperative on a research property. Scroll-into-view would have started that animation automatically.

That fails the brief on clarity, and it conflicts with the motion rules below. The static pair keeps both sentences readable at once.

Motion evidence retained:

- [Motion start](outputs/birch-asset-manifesto-2026-09-13/motion-start-desktop.png)
- [Motion mid — rejected](outputs/birch-asset-manifesto-2026-09-13/motion-mid-desktop.png)
- [Motion end](outputs/birch-asset-manifesto-2026-09-13/motion-end-desktop.png)

## Routes inspected first

Existing destinations used by the unit:

| Path | What the current code is | How the unit uses it |
| --- | --- | --- |
| `/` | Direction A homepage | Host of the unit |
| `/ask` | Question composer | Primary consumer action |
| `/professionals` | Private professional preview | Every contribution scope |
| `/contribute?type=research` | Local unsaved draft | Unchanged, still on the professional card |
| `/design/commons-preview` | Community specimen, noindex | Named as future/private, not opened as live discussion |
| `/authors/aaron-bollinger` | Illustrative author record | Unchanged professional flow |
| `/questions/replacement-cost-vs-market-value` | Cited answer | Unchanged product preview |

Routes that exist and were **not** linked, because they are not live product promises:

- `/lens` — Coverage Lens private preview
- `/position` — coverage-position worksheet
- `/network` — network specimen
- `/shelf` — saved-trail specimen

No specialty, legal, tax, or claims directory exists. The scopes therefore all reuse `/professionals`.

## Benchmarks

Patterns only. No wording, photography, ratings, or trade dress was copied.

| Source | URL | Transferable principle |
| --- | --- | --- |
| Wikipedia | https://www.wikipedia.org/ | The first task is to read or search, not to buy. |
| CFPB consumer tools | https://www.consumerfinance.gov/consumer-tools/ | Named financial topics and questions can educate without creating a client relationship. |
| NAIC consumer | https://content.naic.org/consumer | Insurance is explained as recovery cost-sharing, with preparedness sitting beside the policy. |
| Insurance Information Institute | https://www.iii.org/about-us | Education and risk information can refuse to sell. Do not copy ranking or traffic claims. |
| Policygenius | https://www.policygenius.com/ | Negative: quotes, family photography, star ratings, people-served and policies-placed metrics. |
| Investopedia | https://www.investopedia.com/ | Negative on the homepage: “best” product tables and advisor marketing. Dated explainers are the useful half. |

Authoritative motion and accessibility:

| Source | URL | Transferable principle |
| --- | --- | --- |
| WCAG 2.2.2 Pause, Stop, Hide | https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html | Scroll-into-view counts as starting automatically. Looping or >5s motion needs a pause control. |
| WCAG 2.3.3 Animation from Interactions | https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html | Non-essential motion from interaction must be disableable. Extra scroll motion is a vestibular risk. |
| Technique C39 | https://www.w3.org/WAI/WCAG22/Techniques/css/C39 | Static first; motion only as an enhancement. |
| MDN `prefers-reduced-motion` | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion | Scaling and panning are vestibular triggers. Motion must not be the only way to communicate. |
| Apple HIG Motion | https://developer.apple.com/design/human-interface-guidelines/motion | Motion is optional, cancelable, and never the sole carrier of meaning. |
| Apple Reduced Motion criteria | https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria/ | Ongoing or large-scale motion turns off when Reduce Motion is on. |

## Implementation

- `src/components/BirchAssetManifesto.astro` — new homepage unit
- `src/pages/index.astro` — insert the unit after the front door
- `src/components/BirchFrontDoor.astro` — align the professional scope list with the same specialties and denials
- `scripts/verify-product-design.mjs` — lock heading, layers, scopes, existing routes, and gated-feature language

No source records, claims, review states, signup gates, Commons readiness, or production aliases changed.

## Evidence

Screenshots:

- [Before desktop — 1280×844](outputs/birch-asset-manifesto-2026-09-13/before-desktop.png)
- [After desktop — 1280×844](outputs/birch-asset-manifesto-2026-09-13/after-desktop.png)
- [After desktop manifesto](outputs/birch-asset-manifesto-2026-09-13/after-desktop-manifesto.png)
- [Before mobile — 390×844](outputs/birch-asset-manifesto-2026-09-13/before-mobile.png)
- [After mobile — 390×844](outputs/birch-asset-manifesto-2026-09-13/after-mobile.png)
- [After mobile manifesto](outputs/birch-asset-manifesto-2026-09-13/after-mobile-manifesto.png)
- [Reduced motion](outputs/birch-asset-manifesto-2026-09-13/reduced-motion-desktop.png)
- [JavaScript disabled](outputs/birch-asset-manifesto-2026-09-13/no-js-desktop.png)

Focused browser proof:

- 1280px and 390px: `innerWidth === scrollWidth === bodyScrollWidth`; overflow is false.
- Semantic heading text is `Ensure your assets are protected.`
- `Insure your assets.` is visible static copy, not the `h2`.
- Decorative stage remains `hidden` and `aria-hidden="true"`.
- `/#asset-protection` lands the unit at `top: 88px` with `--header-h: 72px` (`scroll-margin-top`).
- Reduced motion and no-JS keep the same heading color (`rgb(23, 33, 46)`) and the same visible pair.
- Keyboard focus reaches `Ask a question`.
- Eight scope links point only at `/professionals`.

## Gates

- `npm run validate` — 183 passed, 0 failed; preview build produced 892 pages; `astro check` 0 errors, 0 warnings, 376 hints.
- `PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://birch.insure npx astro build` — 892 pages.
- Production-posture verification — 162 passed, 0 failed.
- `npm run audit:onpage` — 0 findings across 563 indexable pages; 328 noindex pages skipped by design.
- `cd commons && npm run validate` — 80 passed, 1 skipped, 0 failed.
- Focused product-design suite — 14 passed, 0 failed.

The default local build was restored to preview posture after the production-posture gate. The preceding front-door mobile checkpoint is recorded in [BIRCH-FRONT-DOOR-MOBILE-HANDOFF-2026-09-13.md](BIRCH-FRONT-DOOR-MOBILE-HANDOFF-2026-09-13.md).

## Independent critique

**Strength:** the wordplay is now readable without waiting, and the unit states the category without turning Birch into a quote desk or a live professional network.

**Risk:** the homepage is taller. Keep this as one band under the existing front door. Do not add a second morph, a specialty microsite, testimonials, or a lead form to “complete” the scopes.

## Handoff state

- Branch: `codex/birch-preview-design-next-20260913`
- Starting head audited: `11a876e6356a1488076e948292fdfe7acb2a8824`
- Base: `origin/claude/bold-hopper-mqcyen`
- PR: existing draft PR #3; update in place
- Scope: Birch preview only; no merge, deploy, production publish, or other-product changes
