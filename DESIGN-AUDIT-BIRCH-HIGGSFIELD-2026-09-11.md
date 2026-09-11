# Birch aesthetic audit — Higgsfield pass

Date: 2026-09-11  
Scope: Birch landing page, first viewport, entry CTA, evidence preview, and the visual handoff between Research and the future Commons.

## What was reviewed

- The current Birch landing implementation in `src/pages/index.astro` and `src/styles/global.css`.
- The supplied brand asset: `/Users/aaronbollinger/Downloads/birch-final-favicon-package/birch-bird-logo-transparent.png`.
- The earlier concept baseline: `outputs/higgsfield-birch-concepts-2026-09-09/birch-concept-01-landing-editorial.png`.
- Three new Higgsfield concept boards generated with the exact Birch bird and the earlier concept as visual references:
  - `/Users/aaronbollinger/Documents/Codex/2026-09-09/we-are-attempting-to-create-another/outputs/higgsfield-birch-audit-2026-09-11/birch-option-a-editorial.png`
  - `/Users/aaronbollinger/Documents/Codex/2026-09-09/we-are-attempting-to-create-another/outputs/higgsfield-birch-audit-2026-09-11/birch-option-b-fintech.png`
  - `/Users/aaronbollinger/Documents/Codex/2026-09-09/we-are-attempting-to-create-another/outputs/higgsfield-birch-audit-2026-09-11/birch-option-c-commons.png`

The generated boards are references only. They are not a source of production copy, counts, citations, company marks, ratings, or data.

## Audit findings

The earlier editorial concept had the right instinct—quiet paper, strong serif headline, source-forward composition—but it showed too much “answer surface” before a visitor understood the action. It also contained the normal image-generation failure modes: garbled labels, invented rows, and data-like artifacts that could be mistaken for real evidence.

The new pass confirmed three useful ingredients:

1. **Editorial trust:** warm paper, restrained ink, a refined display face, thin rules, and a calm reading rhythm.
2. **SaaS confidence:** a compact question field, explicit action hierarchy, rounded evidence cards, and a product surface that feels useful immediately.
3. **Commons energy:** a small but legible distinction between documented Research and later lived-experience discussion, without turning the landing page into a social feed.

## Decision: hybrid A + B + C

Birch should feel like a research instrument first and a network second.

- Use the editorial palette and paper/ink contrast from A.
- Use the evidence-card hierarchy and compact SaaS density from B.
- Use the explicit Research / Commons language and directional handoff from C.
- Keep the bird as a quiet navigation signal, not as a mascot competing with the question.
- Keep one dominant first action: **Ask Birch**.
- Keep secondary actions limited to **Browse coverage** and **Read the question library**.
- Use real corpus-backed source rows in the preview card. Never use placeholder counts, testimonials, star ratings, “trusted by” claims, or invented citations.

## Implemented in this pass

- Reframed the hero to `Insurance, with the source attached.`
- Reduced the lede and removed excess qualification from the first viewport.
- Replaced the abstract compass panel with a real, corpus-backed “Source attached” record preview.
- Added a subtle bird orbit with `prefers-reduced-motion` support through the global motion policy.
- Added a three-lane Learn / Check / Share strip that routes to existing product surfaces.
- Made the trust boundary explicit: Research, lived experience, and professional context remain separate lanes.
- Kept preview access gated and signup disabled.

## Hard rules for the next design passes

- Exact supplied Birch bird only; do not accept a generated substitute logo.
- No gradients, neon glows, fake analytics, or decorative dashboard widgets without a product purpose.
- No generated text in production. Every visible claim must come from the content model or a reviewed interface string.
- Every research statement must resolve to a source record; every lived-experience item must be labelled as reported context, not proof.
- Motion should communicate state: focus, hover, loading, source opening, and contribution status. It should never obscure reading.
- Respect reduced-motion preferences and keep the first contentful surface lightweight.

## Recommended next pass

1. **Company dossier surface:** apply the same evidence hierarchy to one company page—identity, official records, coverage context, current updates, and separated Commons threads.
2. **Research result state:** design the post-question answer view with an “answer / assumptions / sources / what would change this” rail.
3. **Private policy review:** design upload and redaction states before any integration; default to local redaction, explicit consent, and no public indexing.
4. **Commons contribution gate:** design identity, professional context, moderation, edit history, and right-of-reply states as a separate workflow.
5. **Motion QA:** add only small state transitions after the page hierarchy is stable; use the bird orbit for loading/review progress, not decoration everywhere.

