# Birch — Mobbin reading-experience audit

11 September 2026 (Pacific). Continuation of `BIRCH-PRODUCT-DESIGN-SYSTEM.md`, not a new product direction.

## Decision

Keep Focus / A, the actual bird logo, Birch blue, and the existing self-hosted fonts.
Use Schibsted Grotesk for working-page headings, with Newsreader reserved for editorial accents.
The premium effect should come from clear hierarchy, fast access to evidence, and consistent interactions.
Do not add a fourth homepage direction, decorative video, invented activity, or another auth implementation.

## Direct references inspected in the signed-in Mobbin account

Private collection: [Birch — Product UX](https://mobbin.com/collections/38f9a642-ecc6-4e00-b9da-74c9ac44bced/web/screens).
Four saved items: two screens and two complete flows. Key screens in the flows were visually inspected; this is not a claim that every edge case in those products was audited.

| Reference | Pattern to adapt | Birch application |
| --- | --- | --- |
| [ChatGPT: deep-research answer and source rail](https://mobbin.com/screens/73833b79-1dd5-4354-8fc4-a2e99c33a75e) | Keep provenance beside the answer, with clear source selection. | Implemented a source drawer on question and company records. |
| [Stripe: payment record, timeline, details](https://mobbin.com/screens/464dcf70-a0d4-4ba9-b23d-ca6ba18e60f5) | One record heading, restrained sections, factual metadata, explicit status. | Removed duplicate company overview/navigation blocks and introduced compact section links. No payment UI or invented insurer statistics copied. |
| [Reddit: creating a post, 13-screen flow](https://mobbin.com/flows/26ef9d17-f7e0-4e09-9af6-01311c9fbffb) | Select destination, compose, add context/disclosures, preview the publishing action. | Working community filters and a private contribution entry point now support the direction. The full moderated composer remains the next implementation. |
| [HoneyBook: completing setup, five-screen flow](https://mobbin.com/flows/1922e5d2-1f9c-43c7-82ba-6bbc28fba7d9) | Contextual setup checklist with explicit completed/pending states. | Reference for optional professional onboarding after basic account entry. Not a reference for license verification or proof of identity. |

The current Mobbin login screen was also inspected: provider entry plus a single email task, with terms at the point of commitment. Birch's email-link flow remains a design choice supported by its existing app code, not a claim that Mobbin uses identical authentication.

No third-party screenshot, logo, copy, or product data was inserted into Birch production assets.
No Figma file was edited during this pass; the working implementation and private reference board are the deliverables.

## What changed

- Shared reading layout for all 85 question records and five company records: compact headings, calmer metadata, readable line length, section navigation, consistent source actions.
- Citation numbers progressively enhance into a native modal source drawer. It shows publisher, original URL, jurisdiction, check date/basis, recorded claims, and the full Birch source page. Source selection, Escape dismissal, close control, and focus return are supported.
- Full source ledgers remain server-rendered and addressable. With JavaScript unavailable, original citation anchors still reach their entries.
- Company identity and overview are presented once. Source-backed summary content was moved, not rewritten. No new underwriting, appetite, claims, financial, or rating assertions were generated.
- Company search retains type filtering and gains a clear-filters control. Pending record dates no longer masquerade as review completion.
- Community preview gains search, working room/type filters, explicit empty states, and links to the correct example reply sections. Example activity stays labeled, with no real posts or accounts created.
- Thread preview links to the account walkthrough. Mobile thread content precedes the optional desktop room navigation.
- Pending company/question citations explicitly say editorial review is pending in plain text, BibTeX, and CSL JSON.
- `TechArticle.reviewedBy` now requires an explicit `reviewed` state. An assigned reviewer, a corrected record, or an omitted state does not create a structured-data endorsement.

## Bugs found during verification

1. The first company integration rendered the source dialog inside the repeated community-lane loop. Fixed; a regression test now requires one inspector and one citation target per question/company page.
2. An attribution test depended on the exact capitalized word “Reviewer.” The UI now says “Reviewer (assigned)” for pending work, preserving identification without implying signoff.
3. A new test initially imported an Astro-dependent module through Node's standalone TypeScript loader. Replaced with checks against the actual built citation exports.
4. Mobile community/thread views buried the main content below repeated explanation and navigation. Reduced the introductory material and made the remaining preview controls useful.

## Deliberate limits

This is an interface/reading pass, not a public launch or a new source-research pass.
The corpus remains five organization pages and 85 question pages; a universal insurer directory is not yet populated.
No public signup, posting, database migration, mail delivery, provider billing, policy upload, Canopy connection, Brandfetch request, production promotion, or automated publication was enabled.
There is no new guarantee of indexing, AI citation, unbiased outcomes, anonymous policy documents, or professional endorsement.

Other record families still need the shared reading layout and an explicit pass-through of their review state to citation exports. The shared structured-data helper now defaults safely when that state is absent.

## Next implementation, in order

1. **One moderated contribution journey.** Destination (company/topic), contribution type, draft, sources/disclosures, privacy preview, submit-for-review. Reuse `commons/` permissions and moderation. Preserve unsent work; do not promise durable drafts until backed by storage.
2. **Complete account failure states.** Expired/used link, resend cooldown, delivery error, safe return to original task, invited-account restriction. Then exercise real mail and database on the protected preview before opening signup.
3. **Extend the reading system.** Coverage, industry, state, and case-study pages; explicit review-state exports; article/source relationships. Use real data and clear empty states, not padded company pages.
4. **Company profile progression.** Separate legal entity, brand/group, sourced coverage context, dated official figures, community threads, and authorized company responses. Policy association is a relationship signal, never proof that every statement is true.
5. **Research gaps into reviewed drafts.** Query matching first; outside research only for a real gap; fetch and validate source candidates; require claim support and licensed review before publishing. Popularity must not substitute for evidence.

Keep public access closed until the external-service and moderation gates are demonstrated end to end.

## Verification completed

- Root `npm run validate`: 174 passing tests.
- Production configuration build plus verification: 162 passing assertions.
- On-page audit: zero findings across 563 indexable pages. Preview output restored afterward.
- Community validation: 80 passing; one external-database test skipped. This does not establish working production mail or database connectivity.
- Browser: 1100px desktop and 390px mobile; one source dialog per record; correct source selection; Escape/focus return; copyable canonical citation with pending-review status; 44px drawer close target; no horizontal overflow on checked answer, company, community, and thread views.
- Browser: company name filtering, community type and room filters, empty result, query matching, and thread-to-account walkthrough. No live submission or email was sent.
- Screenshots saved in the parent workspace `outputs/`: `birch-company-reading-2026-09-11.png`, `birch-company-source-drawer-2026-09-11.png`, `birch-source-mobile-2026-09-11.png`, and `birch-thread-mobile-2026-09-11.png`.

Release scope: existing PR branch only. Production promotion and public signup remain outside this pass.
