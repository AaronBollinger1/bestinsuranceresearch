# Birch product and design decision

11 September 2026. This is the current product design brief following the owner's
request for a clearer consumer SaaS experience. It supersedes earlier aesthetic
locks and competing design queues. Existing publication, privacy, and release
gates continue to apply. The executable page map is `src/lib/product-design.ts`;
review it at `/design/product-system`.

Template pass (11 September): fourteen remaining Direction A page families are
now interactive specimens at `/design/templates/*`, linked from the blueprint.
See `BIRCH-DIRECTION-A-TEMPLATES-2026-09-11.md` for the complete state inventory,
reference lineage, and migration order. Design completeness does not imply that
accounts, provider calls, intake, or publication have been enabled.

## Position and first impression

Owner selection: **A / Focus is approved** (11 September). Its default is configured
in `src/config/product-design.ts`; it is no longer a recommendation awaiting a
choice. `BIRCH-DIRECTION-A-IMPLEMENTATION-2026-09-11.md` records the implementation.
Professional entry, local contribution preview, and the account specimen now carry
the same focused hierarchy. Next: apply these patterns to the existing invited
Community flow without enabling public signup.

Prior implementation update: the signed-in Mobbin pass is documented in
`BIRCH-MOBBIN-READING-AUDIT-2026-09-11.md`. Shared question/company reading
frames, source inspection, and interactive community filtering are now built.
The live blueprint links to the private Mobbin collection.

Birch helps people understand insurance through sourced answers, useful tools,
and clearly attributed professional and policyholder contributions.

- Landing headline: **Understand your insurance.**
- Primary action: **Ask Birch**.
- Navigation: **Ask / Explore / Community / Contribute**.
- Consumer proof: **Free to read. Sources included.**
- Professional pitch: **Make your experience useful to more people.**
- Company action: **Ask about this company**; later **Follow** and **Share an experience**.
- Social product: **Birch Community**. Keep `commons/`, existing routes, environment
  keys, and the configured origin as internal compatibility identifiers until a
  separate deployment migration is justified. The name is independent of DNS.

Insurance is the domain. California is the launch focus. Financial and real
estate professionals contribute within their documented specialty. Their
credential does not turn them into an insurance expert in every jurisdiction.

The ambition is broad question coverage. Do not promise that any system can
answer every question correctly. For unsupported questions, offer clarification,
research, or a suitable professional handoff.

## Aesthetic decision and alternatives

**A / Focus** is selected by the owner and implemented on the homepage. A centered two-line headline,
question composer, three short starting points, and a working product preview.
This leaves room to understand the task on mobile. `/design/directions/focus`.

**B / Editorial** is retained as an earlier exploration, not an active alternative.
It puts the introduction beside the composer and provides more space for positioning.
`/design/directions/editorial`.

**C / Explore** is retained as an earlier exploration. It adds coverage, company, industry, and tool entrances around the
same question flow. It supports browsing but asks a new reader to make more
choices. Use its pattern for a future returning-reader home.
`/design/directions/explore`.

All three use the actual bird and the same two reusable components. B and C remain
in the noindex design archive; the normal homepage always uses A.

Typography: Schibsted Grotesk handles navigation, product headings, and forms;
Newsreader supplies a small expressive accent in the hero and remains available
for long-form editorial work; IBM Plex Mono is reserved for identifiers and dates.
Preserve the approved blue, paper, and cream palette. Use white for active work
surfaces, 1px boundaries, consistent spacing, and restrained elevation.

The previous implementation gave too much space to internal terminology and
repeated the same company identity in several cards. Compact company headers and
consumer wording are now the pattern. Continue consolidating repeated dossier
sections without removing source provenance.

## Reusable page architecture

The 16 patterns and next steps are rendered at `/design/product-system`.

| Family | Structure | Main action |
| --- | --- | --- |
| Landing | Headline, composer, examples, product preview, helpful content | Ask Birch |
| Answer | Question, short answer, scope, inline citations, source rail, follow-ups | Ask a follow-up |
| Topic / coverage / industry / state | Topic header, filters, useful questions, guides, cases, tools | Explore topic |
| Company directory | Search, entity type, concise sourced rows, meaningful empty state | Find a company |
| Company | Entity identity, Overview / Coverage / Community / Sources, dated facts rail | Ask about company |
| Community / forum | Topic rail, readable thread list, filter by question/experience/note | Ask the community |
| Thread | Original post, author scope, linked research, replies, report/history controls | Reply |
| Experience | Company, product, jurisdiction, timeline, outcome, evidence relationship | Preview experience |
| Contributor | Name, specialty, credential scope, affiliation, authored work, corrections | Read their work |
| Research composer | Question, scope, original explanation, claim-source pairs, disclosure | Submit for review |
| Account | Email, inbox, safe return path, optional role setup | Email me a link |
| Saved / following | Saved answers, followed topics/companies, controlled update preferences | Save / Follow |
| Your coverage | Private connection, field selection, confirmation, revocation | Connect a policy |
| Tool | Clear inputs, reason for each field, source-linked output, export | Run the tool |
| Research operations | Question gap, candidate sources, contradictions, review decision | Review evidence |
| Moderation | Report context, evidence, response, decision, appeal history | Resolve review |

## Interaction contract

- Every action has an idle, hover, keyboard-focus, loading, success, and failure
  treatment where applicable. Empty content offers a useful next step.
- Menu items have icons and text. Hover is optional; click, touch, and keyboard
  work. Escape closes the menu and returns focus to its trigger.
- Primary buttons: minimum 44px hit target, short verb, restrained press feedback.
- Product tabs: arrow keys plus Home/End, programmatic selected state, all content
  available without JavaScript. Record sections use stable URL anchors.
- Sources: cite the claim inline, show publisher/date/limitation, open original
  source. Do not require hover to access evidence.
- Desktop: readable content column plus an optional context rail. Mobile: one
  column; source details below; horizontal tabs scroll within their container.
- Motion: 120-180ms control feedback, up to 240ms menus/drawers, no forced intro,
  no loading delay for decoration, and reduced-motion support.
- Retention: saved work, useful replies, followed subjects, requested updates,
  and visible corrections. Avoid streaks, artificial scarcity, and invented counts.

## Research and Perplexity

The repository already contains a server-only Perplexity Search scout and a
gated research automation contract. This design pass does not enable network
generation. Build on that contract rather than introducing another pipeline.

1. Normalize the question into topic, jurisdiction, coverage, company entity,
   time frame, and intent. Ask for missing context only when it changes the answer.
2. Retrieve the existing corpus first; check relevance, source status, and freshness.
3. If the answer is missing or stale, offer **Research this question**. Explain
   any transfer to an external research provider at that decision.
4. Send only the approved general research brief to Perplexity Search. Apply
   domain/date filters by source class and a request cost/timeout budget.
5. Fetch and read the candidate documents. Record publisher, effective date,
   jurisdiction, exact supporting passages, conflicting evidence, and retrieval
   time. A search citation is a candidate link, not validation of its content.
6. Return a clearly labeled web-research draft only when evidence supports it.
   Keep the generated answer, Birch's published answer, and community experience
   visually distinct. Show uncertainty or no answer when needed.
7. Deduplicate against existing questions. Queue a new article or an update;
   include original context, useful worked examples, and a named human reviewer.
8. Publish after editorial approval with stable claim/source addresses, author,
   scope, review status, dates, correction history, and machine-readable companion.
9. Recheck by volatility and source changes. Update the canonical article instead
   of publishing one thin page per wording of the same question.

States: existing answer; clarification needed; searching; examining sources;
draft available; conflicting sources; insufficient evidence; provider timeout;
budget exhausted; review queued. Never turn a failed request into a success state.

Perplexity currently distinguishes Search, Agent, Router, and legacy Sonar APIs;
keep the source scout on Search unless an evaluated need justifies a second API.
Reference: [official API overview](https://docs.perplexity.ai/docs/getting-started/overview).

## Professional value and publishing

The offer is attributable, useful original work: a stable author page, publication
history, documented credentials, named article authorship, source transparency,
topic relevance, and an appropriate external profile link. Do not sell guaranteed
search rankings, AI citations, endorsement, or link equity.

Flow: read freely -> account at save/reply/contribute -> choose role -> optional
credential request -> scoped verification -> draft -> source/privacy/conflict
checks -> editor review -> revisions -> publication -> corrections/rechecks.

Professional status records credential type, jurisdiction, scope, verification
method/date, expiration, and affiliation. Licensed professional, verified company
representative, and policy relationship are separate statuses. Their badges
explain what was checked. No single universal trust score.

Keep user links appropriately marked as user-generated, and paid relationships
disclosed and marked appropriately. Curate substantive articles on merit.

Google says AI search features need the same fundamental SEO work, not a special
AI schema. Bulk generated pages without added value can violate spam policies.
References: [AI features](https://developers.google.com/search/docs/appearance/ai-features),
[generative content guidance](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content).

## Companies, experiences, and responses

Map brand -> group -> legal insurer -> product/jurisdiction. Never assign a
brand-level anecdote or figure indiscriminately to every underwriting entity.
Brandfetch can provide presentation assets; regulatory and first-party sources
provide factual identity and dated statistics. Logo availability is not verification.

Company pages show documented identity, source-linked coverage/form context,
dated financial or regulatory facts with denominators and limits, related
questions, company-specific discussion, experiences, and attributed responses.
Current appetite can only be shown as dated, sourced material with geographic
and product scope; it does not establish eligibility for the reader. No live
appetite feed is implemented or authorized by this pass.

An experience records who is speaking, company/entity selection, coverage,
state, broad event dates, the author's account, response history, and what remains
unresolved. Sensitive claim details stay out of public discussion.

A verified representative may reply, clarify the process, link to official
material, and invite the customer to an appropriate private support channel.
They cannot edit the original account, suppress criticism, or declare it resolved
on the author's behalf. Display 'company responded' separately from
'author reports resolved'. Support reports, correction requests, moderation,
appeals, and author withdrawal with a visible history.

Benefits: useful specificity, a reason for experts to contribute, and a reason
for companies to engage. Costs: verification, moderation, privacy work, and
operational review. Launch narrowly enough that those functions are staffed.

## Canopy and policy critique

Use ordinary account authentication first. Canopy is an optional insurance-data
connection, not the primary account login or a universal proof of identity.
Its docs describe structured personal/commercial P&C data, SDK/components,
webhooks, and the pulls API: [Canopy getting started](https://docs.usecanopy.com/reference/getting-started).

Plan: consent -> connect in the provider flow -> signed webhook -> retrieve
permitted data -> match named-insured/relationship with appropriate evidence ->
user confirms -> store minimal scoped attestation with date/expiry -> revocation.
Public badge: 'Policy relationship checked', only for the supported relationship.
It does not validate a claim allegation or confer professional authority.

Policy review is private and opt-in. Extract locally where feasible, redact,
show the exact public preview, and require an explicit sharing decision. Automated
redaction can miss information; never promise complete anonymization. Share
minimal coverage facts with the selected professional, not original documents
with the public forum or a web-search provider. Define encryption, access logs,
retention, deletion, malware scanning, and incident handling before accepting files.

## Concrete build sequence

1. This pass: consumer landing, three alternatives, reusable preview, Community
   naming, compact company header, navigation polish, account specimen, page map.
2. Finish the shared reading frame across answer/company/topic/thread and replace
   repeated explanation cards with contextual disclosures.
3. Apply the account specimen to the existing community auth flow; test invited
   sign-in, expired/resend states, return path, durable store, and real mail.
4. Finish the original-post/reply/composer states, role verification, reports,
   author withdrawal, representative response, and moderation queue.
5. Complete a small initial set of company dossiers from actual source readings.
6. Connect the existing research scout to durable jobs and reviewer operations.
7. Add saves/following and opt-in updates after the initial flows are usable.
8. Canopy sandbox and private policy critique follow the permission/storage review.

Preview accounts and public signup stay closed until the deployment and
moderation gates are exercised. No release promotion is part of this design pass.

## Reference audit

- [Linear](https://linear.app/): current product-first landing and clear task
  vocabulary reviewed. Borrow hierarchy and density, not its dark styling.
- [Stripe on Mobbin](https://mobbin.com/screens/464dcf70-a0d4-4ba9-b23d-ca6ba18e60f5):
  opened and visually inspected this pass. Timeline beside details informs
  company responses and evidence rails. The public screen was accessible; the
  browser was signed out, so no authenticated copying to Figma was performed.
- [ChatGPT source-rail reference](https://mobbin.com/screens/73833b79-1dd5-4354-8fc4-a2e99c33a75e):
  inherited direct reference; not re-audited this pass.
- [Birch Figma board](https://www.figma.com/design/okHFaikGZGx1MJmvUgTWHj?node-id=30-3):
  fetched and visually inspected. It is a collection of useful architecture
  cards, not high-fidelity page designs. The browser gallery now supplies the
  concrete page/interaction reference missing from that board.
- Higgsfield concept job `19ae7034-c281-42d1-adff-90e992d40a67`: supplied the actual
  bird logo and requested landing/company/thread composition. Concept imagery
  is for critique; generated text and claims do not enter the corpus.

Acceptance: one primary action per region; usable keyboard navigation; no mobile
overflow; every source link resolves; no invented activity or credentials; working
preview gates; both indexing postures and community checks pass. Usability and
real-user performance targets still require measurement after invited testing.
