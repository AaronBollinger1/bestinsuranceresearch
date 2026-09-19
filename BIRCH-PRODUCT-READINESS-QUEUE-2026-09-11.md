# Birch product readiness queue

Last updated: 2026-09-11

## Product direction

Birch is a citation-first public reference for insurance: a calm research layer for understanding coverage, a structured index of insurance companies and sources, and—once identity and moderation are ready—a commons for clearly attributed consumer and professional experience.

The product should feel like a premium fintech research tool with the participation loop of a thoughtful forum. It is not an insurance marketplace, a carrier ranking site, a claims adjudicator, or a substitute for a licensed professional. The free consumer product earns trust by showing the source, jurisdiction, date, scope, and uncertainty beside every meaningful claim.

### North-star loop

`Ask a plain-language question → read a short answer → inspect the evidence → compare the relevant context → save or share a citable record → contribute a clearly labeled experience or professional note when eligible.`

### CTA contract

Use one primary action throughout the public research surface:

- Primary: **Ask Birch**
- Secondary: **Browse research**
- Participation: **Contribute** (separate, always identity/moderation gated)

Do not mix quote, purchase, or lead-generation language into the research CTA. Coverage-review or broker handoff can exist as a clearly separated, optional path after a user understands the educational purpose and any commercial relationship.

## What is now in place

This pass adds a derived industry/context discovery layer without inventing new insurance claims:

- `/industries` is an index of situations and roles that links people into existing reviewed coverage, question, example, company, and source records.
- Fourteen initial contexts are available: homeowners and residential property; HOAs and community associations; landlords and rental property; contractors and construction; small business; real estate and property professionals; hospitality and retail operations; nonprofits and public-serving organizations; schools and childcare; technology and cyber; professional and medical services; transportation and logistics; employers and benefits; and life and succession planning.
- Each published context has a citable HTML page and machine-readable `.json` record.
- Context pages expose the evidence trail, review dates, linked source records, relevant coverage definitions, questions, examples, organizations, and a small “nuances to inspect” section derived from existing structured inputs.
- Contexts are navigation indexes, not doorway pages, recommendations, “best carrier” lists, appetite claims, coverage determinations, or user-rating summaries.
- The site header and footer expose the new discovery layer while preserving the simple `Ask Birch` / `Browse research` hierarchy.

## Page system

Each page family has one job. Keep the information architecture legible as the corpus grows to thousands of topics.

| Surface | Job | Primary action | Evidence expectation |
| --- | --- | --- | --- |
| `/` | Explain Birch in one calm pass | Ask Birch | Trust statement, editorial scope, sample source trail |
| `/ask` | Answer a question and route to context | Ask another question | Inline source markers, source ledger, jurisdiction and date |
| `/industries` | Start from a role, situation, or operating context | Open a context | Linked records only; no new claims in the index |
| `/industries/[slug]` | Assemble a useful context map | Inspect a coverage or question | Source ledger plus linked citable records |
| `/insurance` and `/lines/[line]` | Explain a coverage line | Explore a related line | Definition, scope, exclusions/limits where sourced, citations |
| `/questions/[slug]` | Answer one durable question | Ask Birch | Short answer, caveats, sources, state/jurisdiction handling |
| `/companies/[slug]` | Establish company identity and research links | View research | Official identity data, official channels, regulator/source records; no unsupported reputation verdict |
| `/examples/[slug]` | Make a nuance concrete | Read the underlying coverage | Scenario label, assumptions, non-determinative framing, sources |
| `/tools/[module]` | Help a user organize or understand information | Start the tool | Inputs, privacy treatment, limits, output provenance |
| `/sources/[slug]` | Provide a source record | Return to cited page | Publisher, URL, source type, jurisdiction, last checked, claims supported |
| `/contribute` | Explain how participation works | See eligibility | Auth, attribution, moderation, conflict disclosures |
| `/professionals` | Explain the professional contribution path | Apply to contribute | Credential review, role boundaries, editorial review |
| `/commons` | Host approved conversation in the future | Browse or join | Thread-level provenance, moderation, labels, edit history |

## Citation and optimization contract

Every durable public record must pass this checklist before it is published:

1. One specific question, definition, scenario, company fact, or source purpose.
2. A stable slug and a unique, plain-language title.
3. A useful meta description that describes the record rather than promising a result.
4. One canonical URL; preview deployments remain `noindex`.
5. A visible source ledger with original URL, publisher, source type, jurisdiction, last checked date, and claims supported.
6. Inline citation markers that resolve at build time; unresolved markers fail the build.
7. A review state, content version, and reviewer/author role.
8. Machine JSON with the canonical URL and the same source records used by the visible page.
9. JSON-LD appropriate to the page type, without fabricating ratings, prices, quotes, coverage determinations, or organization attributes.
10. Clear separation between sourced fact, Birch explanation, example assumption, user experience, and professional contribution.
11. No private policy data, health information, personal identifiers, or hidden prompt content in the rendered page or machine record.
12. Internal links to the next useful question, coverage, state context, company record, example, and source.

### Content labels

Use consistent labels in the UI and machine records:

- **Research** — Birch synthesis grounded in cited public sources.
- **Source record** — the original publication or official record.
- **Example** — an illustrative scenario, not a prediction or determination.
- **Community experience** — an attributed user account that is not independently verified unless explicitly marked.
- **Professional contribution** — an attributed note from a reviewed professional profile, not a quote or individualized advice unless separately licensed and scoped.
- **Company response** — a response from an authorized organization account, clearly labeled and never allowed to overwrite the underlying experience.

## Editorial boundaries

Birch should not publish a single-number “trust score,” “best insurer” ranking, unsourced carrier appetite, or an AI-generated answer as if it were authoritative. Company pages may aggregate official facts, regulatory records, public source records, and labeled experiences; they must preserve disagreement and show dates.

Search and AI retrieval should prioritize a small, well-sourced answer over a large speculative answer. If the corpus does not answer a question, the interface should say that clearly, capture the gap internally, and offer adjacent sourced questions. Research discovery can suggest candidate sources, but a human-reviewed source record is required before durable publication.

## Ordered implementation queue

### Phase 0 — release guardrails (complete / maintain)

- Keep preview deployments gated and `noindex`; only the intended production origin may be indexable.
- Keep the build validators in CI: citation resolution, route reachability, privacy screen, completeness, forbidden-claim checks, and production on-page audit.
- Treat the corpus as the shared read model for pages, search, RSS, `llms-full`, sitemap, and machine JSON.
- Keep the logo, blue/cream palette, editorial serif plus compact sans typography, and restrained motion tokens consistent.

### Phase 1 — discovery and citable information architecture (current)

- Ship the `/industries` index and derived industry context pages.
- Expand each context from the existing corpus in evidence order, not keyword volume order.
- Add context links to related lines, questions, examples, states, companies, tools, and source records.
- Add empty-state “coverage gaps” that are honest and useful rather than thin SEO pages.
- Add route-level tests for every published context and its machine JSON.

### Phase 2 — information quality and durable linking

- Add a related-record graph: question ↔ coverage ↔ example ↔ state ↔ company ↔ source.
- Add “what this page does not answer” links when a question has a common adjacent ambiguity.
- Add source freshness queues based on `lastChecked`, jurisdiction, source type, and materiality.
- Add source snapshots or permitted excerpts only where licensing permits; keep the original URL canonical.
- Create editorial review screens for citation completeness, outdated links, duplicate questions, and contradictory source claims.
- Add an internal “claim inventory” so each sentence-like fact maps to one or more source IDs.

### Phase 3 — company dossiers

- Standardize company pages into tabs or sections: identity; official channels; coverage research; state context; source records; public experiences; company responses.
- Use Brandfetch or similar services only for presentation assets after confirming usage rights; logos do not establish factual identity or financial strength.
- Import only verifiable organization metadata and retain the source and retrieval date.
- Add company aliases and parent/subsidiary relationships as reviewed records, not inferred search labels.
- Add a neutral page header: “Research about [company]” rather than a reputation promise.
- Add a “respond as this organization” request path that requires domain or administrator verification.

### Phase 4 — public participation and moderation

- Require an account for posting, editing, saving, following, reporting, and replying; keep reading public research frictionless.
- Use magic-link or passkey-first signup with a short profile: display name, role, state/jurisdiction, and disclosure preferences.
- Build post types: question, community experience, source tip, correction, professional note, and company response.
- Show author role and verification level on every contribution; never imply that a verified identity makes an opinion true.
- Add moderation states: draft, submitted, needs source, needs context, approved, published, revised, removed.
- Add abuse/report flows, conflict-of-interest disclosure, edit history, rate limits, and an appeal path.
- Keep reputation signals lightweight: contribution quality, citations added, helpful flags, and accepted corrections; do not turn them into financial or coverage scores.

### Phase 5 — policy understanding tool

- Let a user upload a declarations page or policy document only after an explicit privacy explanation and consent.
- Process privately: isolate the file, extract only requested fields, redact names, addresses, policy numbers, account IDs, dates of birth, payment data, signatures, and unrelated personal information.
- Store the minimum possible artifact; provide delete/export controls and a visible retention window.
- Return a “what I can see” inventory, missing-information list, plain-language questions, and source links—not a coverage determination or claims outcome.
- Offer an optional professional review handoff with a separate disclosure that Birch or a broker may have a commercial relationship.
- Keep sensitive extraction off public pages, search indexes, machine JSON, analytics payloads, and model-training datasets.
- Add tests that attempt to leak identifiers and health information into rendered output, logs, metadata, and contribution previews.

### Phase 6 — research discovery and AI-assisted editorial work

- Route unanswered or low-confidence questions into an internal research inbox, not directly to publication.
- Use a search provider such as Perplexity for candidate discovery only: collect URLs, publisher, date, jurisdiction, relevant passage, and why it may support the question.
- Cross-check material claims against primary sources—regulator, statute, official form, policy contract, court opinion, or official company filing—before approval.
- Require an editor to accept source records, write or revise the synthesis, attach citation markers, set the jurisdiction, and choose a review date.
- Publish a durable answer only after the same build validators pass. Keep discovery prompts and rejected candidates private.
- Track query gaps, source freshness, answer usefulness, and correction rates rather than optimizing for article count.

### Phase 7 — forums, threads, and current coverage analysis

- Launch Commons only after auth, moderation, reporting, and source-label infrastructure is production-ready.
- Organize discussions by coverage, company, state, industry context, and event; support one canonical thread URL with paginated replies.
- Distinguish current news/legislation from evergreen explainers and user experiences with separate labels and dates.
- Add “current as of” and “last checked” UI to time-sensitive analysis; never imply live monitoring without a source and timestamp.
- Allow a user to subscribe to a topic and receive a digest; do not use engagement notifications to manufacture urgency.
- Add company reply controls and an immutable history so responses add context without erasing criticism.

### Phase 8 — distribution, citations, and launch readiness

- Generate clean Open Graph cards and citation copy for every durable page.
- Add `sameAs`, breadcrumbs, FAQ/Article/DefinedTerm schema only when the visible content supports it.
- Keep sitemap entries limited to substantial, reviewed pages; omit thin, empty, private, and preview URLs.
- Publish RSS and machine feeds with stable IDs, content versions, source links, and update dates.
- Create a citation kit for educators, journalists, professionals, and community moderators that links back to specific source-backed records.
- Track index coverage, referral quality, citation usage, correction latency, and search success without collecting unnecessary personal data.
- Stage launch by corpus quality: research read-only → contributions invite-only → professional contributions → moderated Commons → policy understanding beta.

## Next three passes

1. **Context depth pass:** add the related-record graph, coverage-gap states, route tests, and internal links around the ten new industry hubs.
2. **Company dossier pass:** unify company identity, official sources, coverage links, state views, and future experience sections with neutral language.
3. **Participation foundation pass:** implement auth-gated contribution drafts, profile roles, disclosures, moderation states, and the first reviewed correction flow.

Do not build public ratings, open posting, policy uploads, or automated publishing before the preceding safety and provenance layer is working.

## Definition of product readiness

Birch is ready for a broader public beta when a first-time visitor can ask a question without signing up, understand the answer in under a minute, open the source record, see the jurisdiction and review date, follow the next relevant page, and copy a stable citation. A contributor can sign in, declare their role, submit a source-backed correction or experience, understand its visibility and moderation status, and delete or edit it. An editor can trace every durable claim to a source, see what changed, and block publication when provenance, privacy, or scope is incomplete.

The measure of success is not the number of generated pages. It is whether people can make better-informed insurance decisions with less confusion, while readers, professionals, companies, and future AI systems can tell exactly what Birch knows, what it does not know, and where each statement came from.
