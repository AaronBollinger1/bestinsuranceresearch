# Birch California MVP build specification

Updated 10 September 2026.

This is the implementation lock for the first usable Birch product. The interface is deliberately simple: one front door, four paths, and one visible trust boundary. The underlying system is deliberately strict: every source, claim, contribution, identity, and private document has a different type and permission model.

## Product sentence

Birch makes insurance easier to reason about.

The California launch is not a smaller version of a national review site. It is a jurisdiction-first research desk that begins with California questions, California mechanisms, and California source records. Other states may remain in the corpus, but the first-run experience should make California the explicit operating context.

## First-run experience

`/start` is the first-use surface. It asks what the visitor is trying to do and sends them to one of four paths:

| Path | Surface | Account required | Result |
| --- | --- | --- | --- |
| Understand | `/ask`, `/questions`, `/insurance` | No | Cited explanation and related questions |
| Check | `/position`, `/lens` | No for worksheets; private preview for Lens | Organized coverage questions, never a verdict |
| Research a company | `/companies/[slug]` | No | Identity, records, research, and labeled perspectives |
| Participate | `/contribute`, Commons | Draft is local-only; account before publish | Moderated experience, correction, or professional research |

The visitor receives value before signup. Signup is only a durable action: save, follow, publish, respond, or participate in moderation.

## Canonical entity model

The backend should keep these entities separate even when the UI makes them feel connected:

- `ResearchPage`: canonical public explanation.
- `Claim`: atomic statement on a ResearchPage.
- `SourceRecord`: publisher, source type, jurisdiction, dates, URL, status, and exact claims supported.
- `Company`: verified organization identity and official channels.
- `Experience`: first-person account with time, line, jurisdiction, disclosure, and moderation state.
- `Thread`: discussion container, never evidence by default.
- `ProfessionalProfile`: credential, jurisdiction, affiliation, disclosures, and contribution history.
- `OrganizationResponse`: attributed response to a page or experience; never an edit to independent research.
- `ContributionDraft`: private pre-submission artifact.
- `PolicyReview`: private document session, consent record, redaction map, extracted fields, observations, and deletion state.
- `ModerationAction`: report, decision, reviewer, reason, timestamp, and appeal state.

## Permission model

### Anonymous reader

Can read, search, open sources, copy citations, print, and follow public links. Cannot publish, save to an account, or contact a company through Birch.

### Account holder

Can save research, follow topics or companies, create a draft, publish after moderation, and manage display name and disclosure settings.

### Verified professional

Can publish professional research, suggest corrections, answer questions, and disclose affiliation. Verification does not create editorial control.

### Verified organization

Can claim an organization page and publish a clearly labeled response. Cannot delete experiences, change source records, or buy placement.

### Moderator/editor

Can review contributions, attach sources, request clarification, apply labels, publish corrections, and record decisions. Every material edit is auditable.

## Trust boundary

Research is evidence. Commons is conversation. Coverage Lens is private. Licensed help is optional and separately disclosed.

The product must never:

- Convert an experience into a company rating automatically.
- Present a professional contribution as independent editorial research.
- Allow a company to suppress criticism.
- Use policy uploads as public content.
- Make a coverage, eligibility, premium, claims, or risk determination.
- Use a user’s private text for model training by default.
- Use incentives that reward positive sentiment about an insurer.

## California launch content priorities

The first content and navigation emphasis should be:

1. Homeowners and wildfire.
2. Earthquake and California Earthquake Authority context.
3. FAIR Plan and Difference in Conditions context.
4. California auto minimums and proof of financial responsibility.
5. Workers’ compensation mechanisms and class codes.
6. Renters, condominium, landlord, umbrella, and small-business questions.
7. California Department of Insurance consumer tools and complaint process.

Every page should expose jurisdiction, effective date, review date, reviewer, and source ledger before asking the reader to take action.

## MVP definition of done

The California MVP is complete when:

- `/start` is the default onboarding path and works without JavaScript.
- `/ask` returns a canonical research result or an honest insufficient-evidence state.
- Every published answer has visible citations and a source ledger.
- `/states/california` is the jurisdiction hub.
- `/position` contains the working browser-only worksheets.
- `/lens` explains and enforces the privacy gate before document extraction is enabled.
- `/companies` and company pages separate records, research, experiences, and responses.
- `/contribute` can produce a local draft without transmitting content.
- Professional contribution requirements are visible before account creation.
- Signup is action-triggered, not an access gate.
- Commons remains closed until database, email, moderation ownership, and browser QA are ready.
- Preview builds remain noindex and analytics-free.
- Production builds have a public correction path, privacy page, terms, editorial policy, and operator disclosure.

## Operating model recommendation

Birch can be built by the Bollinger family and still become useful as a public education layer, but the relationship must be explicit. The product should say that it is operated by Bollinsure, state how licensed help is compensated, and maintain a public editorial firewall. Independent research should be allowed to disagree with the operator.

The nonprofit question is not required to build the MVP. Defer entity restructuring until counsel has reviewed the editorial, referral, consumer-protection, privacy, professional-credential, and user-content implications. Product-wise, the immediate requirement is independence in process, not a particular tax status.

## Next implementation order

1. Publish and review the California-first onboarding surfaces.
2. Expand the California corpus using the existing source schema.
3. Add account and save/follow behavior only after selecting an auth provider.
4. Provision the separate Commons application and moderation queue.
5. Add verified professional and organization workflows.
6. Replace the Lens preview with on-device extraction and redaction.
7. Add source-bound AI last, after claim and citation integrity is observable.
