# Birch release recovery — product chain onto launch/initial-publication

Date: 2026-09-15
Lane: terminal-Grok Birch design (Cursor design writing disabled)
Worktree: `bestinsuranceresearch-wt-recover-pr1-pr3-20260915`
Branch: `grok/recover-pr1-pr3-onto-launch-20260915`
Base: exact current `launch/initial-publication`

This is one bounded recovery. It does not merge, deploy, publish, promote, open Commons, flip `reviewState`, or fold PR #2.

## Metadata gate (why this PR exists)

At dispatch, open PRs were only:

| PR | Head | Base | Role |
| --- | --- | --- | --- |
| #1 draft | `ad67133dcac9027a2f7d137ef80c6f1646c9b0a0` (`claude/bold-hopper-mqcyen`) | `launch/initial-publication` | Original product candidate; missing PR #3 design |
| #2 open, not draft | `4901d3a7ca168a673a0e6653e251f40c83a437b6` (`gate/under-construction-20260912`) | `launch/initial-publication` | Separate publication gate; must not be folded |
| #3 draft | `3b46cd4680581f7e8e8c6c9d0b71d700d774347c` (`codex/birch-preview-design-next-20260913`) | `claude/bold-hopper-mqcyen` | Design stack on PR #1; not aimed at launch |

No clean replacement draft recovered PR #1 + PR #3 onto current launch. No Copilot jobs on #1/#3. No in-progress Actions. No recover/replace branches. Cursor design writing is disabled. This PR is therefore the one replacement.

## Old / new SHA mapping

| Name | Old SHA | New location |
| --- | --- | --- |
| Current launch | `f9608b6743fbcda2112fd9fbc6a95c9a5c8cdccb` | Base of this PR |
| PR #1 product head | `ad67133dcac9027a2f7d137ef80c6f1646c9b0a0` | Ancestor of recovered tree (92 commits on launch) |
| PR #3 design head | `3b46cd4680581f7e8e8c6c9d0b71d700d774347c` | Fast-forwarded onto this branch, then this recovery receipt commit |
| PR #2 construction gate | `4901d3a7ca168a673a0e6653e251f40c83a437b6` | **Not an ancestor.** Files `src/pages/under-construction.astro` and the all-route rewrite are absent |

Ancestry proved: launch is an ancestor of PR #1; PR #1 is an ancestor of PR #3; launch has zero commits not in PR #1. Recovery was `git merge --ff-only 3b46cd4` from exact current launch.

## What is preserved

- Dominant consumer CTA: native GET `/ask` **Ask a question** (sole front-door `btn-primary`)
- Quieter professional path: `btn-quiet` **Get cited** → `/professionals`; **Prepare a private draft** → `/contribute?type=research`
- Evidence-first asset protection / risk and loss mitigation / financial-decision education; insurance as launch wedge
- Citations, contributor caveats (editorial review required; attribution may be earned; publication not guaranteed)
- Responsive typography, visible focus, `prefers-reduced-motion`, no-JS GET composer
- Analytics contract, auth/Commons closed (`PUBLIC_COMMONS_READY` remains false), canonical/schema, construction gates unchanged
- PR #2 remains the separate under-construction publication gate

## Tests (recovered worktree)

| Gate | Result |
| --- | --- |
| `npm run validate` (preview) | catalog ok; `astro check` 0 errors / 0 warnings / 376 hints; **892 pages**; **183 passed** |
| Production build `PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://birch.insure` | **892 pages** |
| Production `verify.mjs` + `verify-instrument.mjs` | **162 passed** |
| `npm run audit:onpage` (production dist) | **0 findings / 563 indexable** (328 noindex skipped) |
| `cd commons && npm run validate` | **80 passed / 1 skipped** (external Postgres) |
| Focused `scripts/verify-product-design.mjs` on restored preview dist | **14 passed** |

Default preview `dist/` was restored after the production-posture audit.

## 390px / 1280px evidence

Captured from recovered-tree `astro preview` at `http://127.0.0.1:4377/`:

`outputs/birch-release-recovery-2026-09-15/`

- overflow=false at 1280 and 390 for `/`, `#question-path`, `#expertise-path`, `#asset-protection`
- `#expertise-path` top ≈ 87.67px (1280) / 88.09px (390)
- Tab: Ask a question (9) → Get cited (13) → Prepare a private draft (14)
- Reduced-motion: computed `transition: none`; labels unchanged
- No-JS: native GET `/ask` **Ask a question** remains

## Risks

- This PR duplicates the 92 PR #1 commits plus 9 PR #3 commits against launch. PR #1 stays open as the historical stack parent; do not merge both.
- PR body of #3 is stale; product at `3b46cd4` is the Ask a question / Get cited unit, not the older equal-weight copy.
- Apex `birch.insure` still 308s to www (recorded in `BIRCH-RELEASE-EVIDENCE-HANDOFF-2026-09-15.md`). Not changed here.
- Licensed sign-off remains 0. No agent may mark `reviewed`.
- Live production remains the older BestInsurance build until an owner promote of a READY SHA.

## Rollback

Do not merge this PR. Do not merge PR #1 or PR #3. Do not merge PR #2 as part of this recovery. Do not `vercel --prod` or `vercel promote`. Delete this branch if the recovery is rejected. Live production is unchanged by this draft.

## Next gate (owner)

1. Human review of this replacement draft against launch.
2. Keep PR #2 as the separate construction gate until a curated public slice is licensed-reviewed.
3. Canonical-host / DNS cutover remains owner-only.
4. Commons stays closed until Postgres, Resend, and smoke tests are real.
5. Promote only after inspecting the exact READY deployment SHA.

Stop after this draft exists. No second product item in this pass.
