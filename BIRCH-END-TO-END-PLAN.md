# Birch end-to-end product plan

Decision draft: 9 September 2026

This is the product, content, distribution, and interface plan for Birch. It
extends `DIRECTION.md`, `BIRCH.md`, `AMBITION.md`, and `HANDOFF.md`; those files
remain authoritative when a proposed feature conflicts with a rule already
settled there.

The final visual lock is in
`outputs/BIRCH-FINAL-DESIGN-REFINEMENT-2026-09-09.md`. The recommended legal and
governance structure is in
`outputs/BIRCH-ENTITY-GOVERNANCE-ARCHITECTURE-2026-09-09.md`; both are counsel
and implementation planning documents, not legal advice.

## The recommendation in one sentence

Make Birch the fastest way to move from an insurance question to a citable
answer, then give people a separate, clearly labelled place to say what they
experienced.

The research layer earns trust through source discipline. The community layer
earns usefulness through attribution, moderation, and context. Neither layer
should borrow the other's truth model.

## The simplest message

## Final aesthetic decision

Use **Option 01 / Editorial research-first** as the default Birch front door.
It makes the product promise immediately useful, puts one question and one
primary action above the fold, and introduces Commons as a deliberate second
step instead of making the homepage feel like a social feed. The pale paper
surface, Birch blue action, small mono provenance labels, and Newsreader
editorial headings are now the working visual system.

The other two directions remain useful planning references:

- **Option 02 / Guided question-first** is the activation variant for visitors
  who need prompts before they know what to search.
- **Option 03 / Two rooms** is the clearest future product-shell direction once
  Research and Commons are both fully populated.

The exploration board, the linked Mobbin reference translation, and the four
downstream surface compositions are in the
[Birch Research + Commons Figma exploration file](https://www.figma.com/design/okHFaikGZGx1MJmvUgTWHj).
The supplied bird mark is used as an exact image asset; it is not redrawn or
recolored.

The latest Figma additions are the `Birch / Mobbin references + product
blueprint` page (root frame `30:3`) and the `Birch / Core surface compositions`
page. The latter contains editable artboards for `01 / Landing + ask gate`,
`02 / Signup / magic link`, `03 / Company dossier / no score`, and `04 /
Contribution / redact and review`. The Mobbin references are direct links and
annotations only; they are not copied product screenshots or brand assets.

The next infrastructure slice is now wired in `commons/`: the app uses the
official `@astrojs/vercel` SSR adapter, has a production environment example,
and has a secret-safe `preflight:production` gate. The deployment target is a
separate Vercel project named `birch-commons`, with `birch.insure` as its
eventual origin. The Research-to-Commons public link remains off until the
external Postgres, Resend, moderator, DNS/SSL, and smoke-test gates are
complete. See `commons/README.md` for the runbook.

Higgsfield is connected and permissioned, but this workspace does not expose a
Higgsfield generation action. No Figma frame or raster preview is being
represented as a Higgsfield output. If the generation action becomes available,
the prompts should refine these same approved surfaces rather than introduce a
new logo, palette, or information architecture.

### Product naming

- **Birch** is the umbrella.
- **Birch Research** is the public evidence layer: sourced answers, coverage
  context, figures, current source changes, and tools.
- **Birch Commons** is the conversation layer: threads, experiences,
  practitioner notes, and official responses.

### Recommended front door copy

**Eyebrow:** Birch / Research

**Headline:** Insurance answers with the source attached.

**Subhead:** Birch is free, independent research for the moments when insurance
gets hard to read. Ask a question, see the assumptions, and open the source
behind the answer.

**Primary CTA:** Ask Birch

**Secondary CTA:** Browse coverage

**Library link:** Read the question library

**Community handoff:** Read the research first. Bring your experience to
Commons when you are ready. / Open Birch Commons

**Trust line:** Free to read · no account required

This is stronger than a quote, comparison, or “get help” CTA because it tells a
person exactly what happens after the click and preserves the site's
independence. A professional handoff can remain available on relevant research
pages, but it should not compete with the first question on the home page.

### CTA hierarchy

1. **Ask Birch** — the single dominant action on the homepage.
2. **Browse coverage** — the no-question entry point.
3. **Read the question library** — the return-visitor path.
4. **Open Birch Commons** — the optional conversation path after the research
   boundary is understood.
5. **Contribute research** or **Share an experience** — contribution paths,
   shown inside Commons and on relevant subject pages, not as competing hero
   actions.

Avoid “Get a quote,” “Find the best insurer,” “Improve your rating,” “See who
wins,” “Guaranteed answer,” and “Tell us about your policy.” They either imply
a commercial or comparative service, invite sensitive data, or promise a
verdict the product must not publish.

## The product loop

`Question → cited answer → source → next question → attributed experience → moderation → stable record → external citation`

The loop should be visible in the interface, but each step must remain honest:

- A question search returns only an approved research record or an explicit
  insufficient-evidence state.
- An answer exposes assumptions, variability, dates, and the source ledger.
- A source page lets another researcher quote and link to the exact record.
- A thread captures context without becoming evidence.
- A case report can be promoted from a thread, moderated before publication,
  and given a stable URL.
- A licensed reviewer can sign off research; a moderator can only moderate
  community content. Those are different permissions.

## Interface system

The current visual direction is the right base and should be locked before
building more product surfaces:

- Use the supplied Birch bird/favicon package unchanged. Never redraw or
  regenerate the bird in a mockup or production asset.
- Newsreader for editorial display, Schibsted Grotesk for interface/body copy,
  and IBM Plex Mono for dates, provenance, and evidence labels.
- Pale paper, ink navy, Birch blue for actions, and gold only where it carries
  the existing evidence meaning.
- Thin rules, restrained radii, no gradient hero, no stock people, no rating
  stars, no decorative dashboard chrome, and no generated logo treatment.
- One primary task per screen. Use cards for repeated records, source entries,
  examples, and tools; do not turn every sentence into a card.

### Research navigation

`Ask Birch` · `Coverage` · `Questions` · `Sources` · `States` · `Companies` · `Tools` · `Commons`

### Research page contract

Every indexable research page should expose, in the first screen or immediately
after the answer:

1. A descriptive title and one direct answer or scope statement.
2. What the answer assumes.
3. What changes it.
4. The source markers attached to individual claims.
5. Effective/accessed/reviewed dates and named authorship where expected.
6. A clear “not a determination” boundary where a reader could mistake context
   for a coverage or claim verdict.
7. Related questions and the next useful route.

### Commons navigation

`Topics` · `Threads` · `Experiences` · `Practitioner notes` · `Organizations` · `Contribute`

Commons should look related to Birch but visibly different at the point where a
reader crosses from a cited record into a human account. Every post should show
its author, account status, subject, posting date, moderation state where
relevant, and the standing sentence: “No authority decided this. It is
illustrative only.”

## Who can contribute

| Role | Can do | What readers see | Verification |
| --- | --- | --- | --- |
| Reader | Read, start a thread, reply, submit an experience | Display name or “A reader, unnamed” | Magic-link account only |
| Contributor | Submit a structured case report | Attributed report, moderator label, withdrawal path | Magic-link account; report moderated before publication |
| Licensed professional | Add practitioner notes and participate in threads | Role badge, authority/register, verification date, conflict disclosure | Public regulator register or manual review when no public register exists |
| Credentialed financial professional | Add finance-adjacent research or experience | Credential type and status, not an implied insurance licence | CFP, FINRA, state, bar, CPA, or other authoritative register where applicable |
| Organization representative | Respond to a company subject | “Official response” label, organization identity, author identity | Domain/organization verification plus moderator approval |
| Moderator | Review and label community content | Moderator identity on decisions | Private operational permission |
| Licensed research reviewer | Sign off the evidence layer | Author/reviewer and review state on the record | Existing reviewer workflow; no automatic sign-off |

“Verified professional” should mean only that the stated identity/credential was
checked against a named authority. A profile that has merely supplied a title
should say “self-described,” not “verified.” If a credential has no reliable
public register, use a manual-review state and publish the limitation.

## Contribution types

### 1. Discussion thread

Fast, signed-in conversation attached to an existing subject: a company,
coverage line, or research question. Posts are immutable after publishing;
authors can withdraw them and moderators can hide them, with tombstones left in
place. Threads are never citations, dataset records, or findings.

### 2. Structured experience / case report

An account of what happened, what information mattered, who made the decision,
and why it cannot be generalized. A moderator reads it before publication. If
it becomes a durable report, it is stored as a versioned repository record with
a stable URL and correction/withdrawal history.

### 3. Practitioner note

A sourced explanation from a broker, adjuster, attorney, accountant, planner,
or other financial professional. It should begin as community content with a
visible author role and conflict disclosure. It can be considered for the
research layer only after the same source, claim, and licensed-review process
as every other record. A professional badge is not a substitute for a
citation.

### 4. Official response

An organization may respond to a subject, correct a factual statement about its
own documented operations, or explain its process. It cannot remove a user's
account, buy a preferred position, suppress a critical experience, or turn a
response into a rating. The response stays labeled as an official response and
is never silently merged into the user's prose.

## Identity, credential, and coverage verification

### Account creation

Keep the current passwordless flow: one-time magic link, no password, no
newsletter, and only the minimum account fields. A user should be able to read
the entire research layer without an account.

### Professional verification

The request and moderator decision flow is now implemented in Commons. The
remaining human step is the actual lookup against the named public register;
the UI records what was checked, by whom, and on what date without turning a
self-described role into a badge.

1. The user selects a role and supplies a public register URL.
2. Birch asks for the public licence or credential number only where that number
   is publicly checkable.
3. The system records the named register, lookup URL, checked date, and result.
4. A moderator confirms edge cases and conflicts of interest from the queue.
5. The role badge is shown on each contribution and links to the authority where
   possible.
6. Expired, surrendered, or unresolvable credentials fall back to
   self-described status until rechecked.

Do not ask for a government ID, date of birth, policy number, claim number, or
uploaded licence image when a public register can establish the relevant fact.

### “Your Coverage” / Canopy Connect

Treat this as a private verification feature, not a public research input:

- Obtain explicit, granular consent before the connection.
- Store a short-lived provider token or a minimal attestation, not a raw policy
  document or full declaration page, unless a separate legal/privacy review
  explicitly authorizes retention.
- Expose only the minimum public badge, such as “coverage subject verified,”
  never policy numbers, limits, addresses, or personal health information.
- Let the user revoke the connection and delete the attestation.
- Keep the data in the community/account system; never place it in the cited
  corpus, public JSON, search index, or model training set.

If Canopy Connect is unavailable, the fallback is a manual attestation or
private magic-link confirmation. It must not become a reason to collect a deck
page in a public form.

## The citation and distribution engine

The goal is not to manufacture “SEO pages.” The goal is to make every useful
claim easy for a person, researcher, or answer engine to discover, quote, and
verify.

### Citable-by-default record format

Every research record should have:

- A stable, descriptive URL and canonical link.
- One claim per addressable paragraph or claim id where practical.
- An inline source marker linked to a source record.
- A source record with publisher, document title, date basis, jurisdiction,
  authority level, current status, and exact supported claims.
- A visible author/reviewer state and last-reviewed date.
- A machine-readable JSON companion with the same boundaries as the HTML.
- A change/correction trail rather than a silently replaced paragraph.
- “Copy citation,” “Open source,” and “Download JSON” actions.

### Indexing rules

Keep the evidence pages in static, readable HTML with normal `<a href>` links,
not a client-only shell. Keep JSON companions, sitemaps, canonical URLs, and
robots behavior in agreement. Do not index account actions, moderation forms,
drafts, private coverage attestations, or state-changing URLs.

Google's current documentation says that generative-search visibility still
rests on the same crawlability, page experience, clear structure, and unique
people-first content as ordinary Search; it does not require a special “AI
optimization” trick. See [Google's AI Search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide),
[crawlable-link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable),
and [structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).

### AI research workflow

Use AI as an internal research assistant, not as an unsupervised publisher:

1. Discover candidate primary sources.
2. Fetch and preserve the source metadata.
3. Extract candidate claims and quote locations.
4. Draft plain-language explanations with source ids attached.
5. Run boundary checks for advice, verdicts, invented figures, and unsupported
   certainty.
6. Put the record in a human review queue.
7. Publish only after the licensed reviewer signs off.

The public Birch bot should answer only from published research and should show
the record/source links it used. It should say “Birch does not have a sourced
answer for that yet” instead of filling a gap from a thread, a model prior, or
an unsourced professional opinion.

### The external citation loop

Make Birch useful to people who already publish elsewhere:

- Give each record a clean citation block with title, author, review date, and
  canonical URL.
- Publish source changes and corrections through the existing change feed and
  RSS.
- Offer a documented read-only JSON/API surface for research records and source
  metadata.
- Provide small, unstyled embed/citation links only after the public HTML model
  is stable.
- Create reference packs for real-estate, HR, construction, benefits,
  accounting, legal, and risk professionals: one canonical guide plus the
  source record, not a marketing PDF.
- Invite corrections from source owners and professionals without granting
  editorial control over the result.

The durable growth mechanism is a source or professional citing a precise
answer because it is easier to verify than an unsourced summary. Do not chase
inauthentic mentions, mass AI pages, or link exchanges; Google's guidance
explicitly distinguishes people-first value from search-engine-first content
and scaled low-value generation. See [Google's people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
and [AI-content guidance](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content).

## How Birch becomes heavily used

### The first-use loop

1. A person arrives from a specific question, not a generic brand ad.
2. The answer appears immediately in plain language.
3. The source, assumption, and next question are one click away.
4. The reader saves or cites the stable record.
5. When they have an experience, they can join Commons without confusing it
   with research.

### The content portfolio

Build depth in this order:

1. High-intent questions with a clear answer and primary source.
2. Canonical coverage-line guides with state/jurisdiction variations.
3. Worked examples that show what changes an answer without deciding a claim.
4. Source records and current-change pages that researchers can cite directly.
5. Professional notes and moderated experiences attached to existing subjects.
6. Current coverage analysis only when a named source, effective date, and
   change record exist.

Each new page should answer: Who is this for? What question does it resolve?
What is the source? What would change it? Why should somebody bookmark or cite
it instead of searching again?

### Distribution partners

The most credible early distribution is through the people who already need to
explain insurance: independent brokers, real-estate professionals, attorneys,
CPAs, HR/benefits advisers, lenders, construction professionals, and consumer
advocates. Give them canonical reference links and professional profiles, not
affiliate incentives or reputation scores.

### Measures of real traction

Track these before vanity sessions:

- External domains and documents linking to a Birch claim or source record.
- Search impressions and clicks by canonical question.
- Searches that resolve to a published answer versus insufficient evidence.
- Return visits to the same subject and source-open rate.
- Rechecks completed and corrections published within a target window.
- Professional contributions accepted, declined, withdrawn, and promoted.
- Thread-to-case-report promotions.
- Official responses that add context without displacing user accounts.
- Time from source change to an updated record.

## Technical architecture

### Two surfaces, one brand

- **Research:** static Astro build, content collections, source registry, claim
  ids/checksums, JSON companions, dataset releases, sitemap, RSS, and the
  existing verification suite.
- **Commons:** server-rendered account, thread, report, moderation, and
  organization surfaces with the existing in-memory/Postgres store contract.
- **Sync boundary:** the Research build exports the subjects Commons may attach
  to. Commons can link to Research, but Research never cites a thread or
  experience.

### Minimal persistent model

The current store already covers the core shapes. The next additions should be
small and explicit:

- `CredentialVerification`: account, credential type, authority, lookup URL,
  checked date, status, reviewer, and expiry/recheck date.
- `Organization`: canonical name, verified domains, public records, and
  authorized representatives.
- `ConflictDisclosure`: contributor, subject, relationship, compensation or
  ownership statement, and publication status.
- `OfficialResponse`: organization, subject, author, body, timestamp, and
  moderation event; never an edit to user content.
- `ModerationEvent`: immutable action, actor, reason, timestamp, and affected
  content id.
- `CoverageAttestation`: provider reference, consent, minimal result, expiry,
  revocation, and deletion state; never public policy detail.

### Abuse and trust controls

- Rate-limit magic links, thread creation, replies, and report submissions.
- Keep the existing honeypot and same-origin checks; do not add a third-party
  tracking captcha to a privacy-led product without a deliberate decision.
- Block verdict-shaped thread posts at write time, as the current implementation
  does; flag but do not silently reject structured reports before moderation.
- Prohibit paid placement, review suppression, anonymous organization posting,
  sockpuppet accounts, copied source summaries, and fabricated credentials.
- Preserve withdrawal/hide tombstones and moderation reasons.
- Add a public correction-request route that creates a queue item but never
  directly changes published research.

## Ordered delivery plan

### Phase 0 — Lock the front door

- Use Option 01 / Editorial research-first as the production landing direction;
  retain Options 02 and 03 as planning references for later activation and
  product-shell work.
- Keep the current implementation's one-question, one-primary-CTA hierarchy.
- Lock the copy above, the final bird package, palette, typography, and two-room
  boundary.
- Do one content/research review pass on the stable snapshot before expanding
  the public surface.

### Phase 1 — Make “validated professional” true

- Build the credential-verification flow and public-register/manual-review
  states.
- Render the role badge consistently in profiles, threads, reports, and official
  responses.
- Add conflict-of-interest disclosure and recheck/expiry behavior.
- Persist the Commons store in its production Postgres adapter and test the
  complete auth/moderation flow against it.

### Phase 2 — Make the forum feed the durable corpus

- **Complete:** moderator-to-author promotion from a post to a structured case
  report, with author confirmation, atomic persistence, and public provenance
  that labels the originating thread as context rather than a citation.
- Link subject pages to the number and type of community accounts without
  presenting them as evidence or ratings.
- Add report revisions, withdrawal, corrections, and author-visible status.

### Phase 3 — Add professionals and organizations safely

- Practitioner-note composer with source links, role, jurisdiction, employer,
  and conflict disclosure.
- Organization pages with official-response permissions and no moderation veto
  over user experiences.
- Separate “documented,” “community accounts,” and “official response” bands on
  every company page.

### Phase 4 — Add private coverage context

- Design the “Your Coverage” account area.
- Complete privacy/legal review for Canopy Connect or an equivalent provider.
- Store minimal, revocable attestations only; never publish raw documents or
  feed them into the research index.

### Phase 5 — Make the corpus portable and citable

- Add citation blocks, copy-citation actions, JSON/API documentation, and source
  change feeds.
- Create professional reference packs and lightweight embeds.
- Measure external citations and source reach in Search Console and the existing
  controlled analytics contract.

### Phase 6 — Add the grounded Birch assistant

- Retrieval over approved Research records only.
- Inline links to the exact record and source used.
- Clear separation when it summarizes a moderated account: “A community member
  reported…” rather than treating the account as a rule.
- No personalized coverage determination, claim verdict, premium, ranking, or
  unsupported answer.

## Definition of done for the next review

The front door is ready for one review when:

- the pitch, CTA labels, logo, palette, typography, privacy line, and Commons
  boundary are final;
- the current landing build passes both indexing postures and its on-page audit;
- no product-specific page has been changed merely to support an unchosen visual
  direction;
- the reviewer receives one content snapshot with source mappings and current
  review states;
- the three concept renderings are clearly marked as planning references, not
  approved production assets;
- the roadmap starts with public subject cross-linking and production-store
  validation, not a premature carrier-rating or reputation system; the
  credential-verification and thread-promotion foundations are already in the
  branch.

## Current implementation status

The working branch already has the Birch visual rebrand, the final favicon/logo
package, the simplified landing CTA hierarchy, the Research corpus, the Commons
account/thread/case-report surfaces, credential-verification requests, the
moderator-to-author promotion flow, and the test/audit suite. The immediate
product gaps are cross-linking the two layers once Commons is genuinely live,
production validation of the Postgres/Resend path, and a separately threat-
modeled Coverage Lens service. Carrier pages remain blocked until primary
regulator sources are reachable; they should not be drafted from search snippets.
