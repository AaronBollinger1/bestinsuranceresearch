# Birch audacious foundation

Status: preview product direction, 2026-09-10

This document is the product contract for the next development passes. It keeps the ambition large while keeping each public claim, account boundary, and contribution state observable.

## North star

**Ask Birch. Follow the source. Add context.**

Birch should become the public research network for insurance: a fast way to understand a coverage question, inspect the original authority, open the surrounding company and jurisdiction record, and eventually join a moderated conversation about what happened.

The product is not a quote funnel, a carrier ranking site, a claims adjudicator, or an advice engine. The most defensible growth loop is a useful answer that can be cited, a source record that can be checked, and a clearly labelled contribution that improves the next answer.

## The four product rooms

| Room | Reader promise | Account boundary | Publication rule |
| --- | --- | --- | --- |
| Research | “Give me the answer and show me the source.” | None to read | Birch editorial record; every material claim maps to a dated source. |
| Company dossiers | “Help me understand who this organization is and what records surround it.” | None to read | Identity, official channels, filings, coverage context, and service records; no ungrounded reputation score. |
| Commons | “Show me what people report, without presenting reports as facts.” | Required to post or reply; separate deployment | Experience, question, response, and moderation states are always visible. |
| Contributor desk | “Let me add useful research or context under a real identity.” | Magic link plus role/credential checks | Draft → evidence check → privacy check → human review → publish, correction, or decline. |

Coverage Lens is a private tool that sits across the rooms. It should start local-first, redact before extraction, and produce observations and questions—not coverage verdicts.

## The first high-intent journey

1. A reader lands on the public Research home and sees one primary action: **Ask Birch**.
2. The question resolves to a short answer with assumptions, a confidence/status label, and claim-level source markers.
3. The reader opens the original source or Birch's machine-readable record.
4. Related coverage, state, and company records provide the next context without interrupting the answer.
5. Only when the reader wants to add context does Birch explain the Commons boundary and require an account.

The landing page now shows this loop visually in the “Birch network” surface. It is intentionally a product preview, not synthetic activity or a popularity claim.

## Canonical contribution state machine

```text
local draft
  → authenticated draft
  → evidence attached
  → privacy review
  → human moderation
     ├─ published with labels
     ├─ needs changes
     ├─ declined with reason
     └─ superseded / corrected / removed with history retained
```

Contribution types are not interchangeable:

- **Experience:** first-person account, labelled as reported experience.
- **Professional research:** source-backed explanation with identity, role, affiliation, and conflict disclosure.
- **Company response:** attributable response from an authorized representative with a clear evidence boundary.
- **Correction:** a precise claim, source, date, and explanation of the proposed change.

No contributor gets automatic publication, search ranking, a reputation score, or a “verified = correct” label. Verification describes identity or role; it does not decide the truth of a claim.

## Company page shape

Every insurer or public organization page should eventually follow the same addressable structure:

1. **Identity** — legal name, short name, jurisdiction, regulator record, official site, and last checked date.
2. **What Birch can document** — source-backed coverage, filings, public guidance, and claims/service process material.
3. **What remains context** — reported experiences and replies in a separate lane.
4. **Current records** — dated documents with status: current, changed, superseded, stale, or unavailable.
5. **Official channels** — links to the organization or regulator, never a Birch substitute for a complaint or claim channel.
6. **Correction and response history** — durable change log with who supplied the information and what was reviewed.

The page should resist the most tempting but least defensible engagement mechanic: an unexplained star rating. If a future comparison exists, it needs a defined dimension, denominator, date, methodology, and source—not a single “good/bad” number.

## Source and citation contract

The public unit of trust is the claim, not the page view. A source record should carry:

- original URL and publisher;
- document title, publication date, accessed date, and recheck basis;
- source tier and jurisdiction;
- content hash or retained snapshot reference when legally and operationally appropriate;
- the Birch record URL and machine-readable companion;
- claim IDs and the exact relationship between the claim and the source;
- status for current, changed, superseded, stale, unavailable, or disputed material;
- plain-text, BibTeX, and CSL JSON export for readers and researchers.

The Birch record is a transparent index and interpretation layer. It must not masquerade as the original authority. The source page therefore distinguishes “Birch record” from “Original source” in both human and machine-readable output.

## Design system decision

Use **editorial fintech** as the final aesthetic:

- warm paper/cream as the reading canvas;
- deep ink/navy for authority and dense product surfaces;
- Birch cobalt blue for action, links, and navigation;
- restrained gold only for evidence/resolution, never as decoration everywhere;
- Newsreader for large editorial statements;
- Schibsted Grotesk for controls and product UI;
- IBM Plex Mono for dates, source status, and system labels;
- small radii, strong alignment, open whitespace, and no fake dashboard metrics.

The exact Birch mark remains the supplied asset. The converging-dot animation is reserved for resolving/loading states and a small number of brand moments. Buttons use fast lift/arrow feedback; all motion has a reduced-motion path.

The working visual reference board is in [Figma](https://www.figma.com/design/Eq0BlU9kbUsMHrqxW81eCw). Mobbin references are treated as pattern research, not source material to copy: [Mobbin MCP](https://mobbin.com/mcp) covers shipped finance onboarding, KYC expectation-setting, and community-feed patterns.

## Gating and rollout

### Preview now

- Vercel SSO protects the entire Preview deployment.
- `noindex, nofollow` and the preview robots response protect the build from indexing.
- Birch signup, Commons posting, durable drafts, OCR, server storage, and public policy uploads remain disabled.
- The contribution and Coverage Lens screens demonstrate the future flow locally without pretending that backend capabilities exist.

### First public Research release

- Keep reading, search, citations, source records, and corrections open.
- Keep Commons off until the separate deployment, account system, mail delivery, moderation owner, abuse controls, deletion path, and data-retention policy are live.
- Keep licensed help visibly separate from Birch's research and never let an answer CTA silently become a quote request.

### Commons release gate

Do not flip `PUBLIC_COMMONS_READY` until all of the following are true:

- durable authentication and email verification;
- public-name and disclosure controls;
- report/block/delete flows;
- rate limits, spam controls, moderation queue, audit log, and escalation owner;
- source and attachment retention rules;
- company response permissions and conflict disclosures;
- correction, supersession, and takedown workflows;
- exportable public URLs with canonical, labelled metadata.

## Policy Lens boundary

The recommended first implementation is a private browser session that accepts a deliberately selected PDF or image, asks for consent, previews redaction, and stops before OCR or AI processing. A later server workflow must not start from “upload and tell me if I am covered.” It should start from:

1. identify candidate fields;
2. show the raw and redacted preview;
3. let the person correct or delete fields;
4. retain only the minimum approved context;
5. produce source-linked education and questions for a qualified professional;
6. make deletion, expiry, and provider copies explicit.

Do not collect Social Security numbers, payment details, health information, claim identifiers, or another person's personal information for the MVP. This is a product/data contract, not a promise that redaction is perfect.

## Entity and independence decision

Do not change legal entity type as part of the visual pass. Operate Birch as a separately named product with a public editorial charter, conflict disclosure, privacy/terms pages, and a clear operator disclosure while counsel evaluates the long-term structure. A nonprofit conversion should be a governance and funding decision—not a badge added to imply neutrality. The near-term trust asset is the visible methodology, source trail, correction history, and separation between Research, Commons, and Bollinsure's licensed services.

## Next build sequence

1. Refine the public Research home and `/ask` interaction around the single “Ask Birch” action.
2. Bring the same product shell to question, coverage, and company dossier pages.
3. Add claim-level “copy citation” and source freshness states everywhere a claim is rendered.
4. Turn `/design/commons-preview` into the authoritative Commons UX spec, including thread, reply, report, and moderation states.
5. Add the authenticated contribution backend only after the state machine and deletion policy are approved.
6. Implement company response and professional identity paths as moderated roles, never as paid placement.
7. Add Coverage Lens extraction only after the privacy/data contract and provider model are approved.
8. Run a citation, accessibility, performance, and security gate before any indexing or production promotion.
