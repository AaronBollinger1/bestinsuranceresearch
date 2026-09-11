# Birch master content inventory and publication plan

Last updated: 2026-09-11

## The product we are building

Birch should be the easiest place to move from an insurance question to a short, source-backed explanation, the surrounding context, and the next useful question. It should serve consumers first, while giving licensed professionals, regulators, researchers, and companies a clearly labeled way to add context.

The promise is not that Birch will always know the answer. The promise is that Birch will show what it knows, where it came from, when it was checked, what may change the answer, and when the evidence is not sufficient.

The product surface stays simple:

- **Ask Birch** — the primary action for a plain-language question.
- **Browse research** — the public path into coverage, company, state, example, tool, and source records.
- **Contribute** — a separate, authenticated, moderated path for corrections, experiences, source tips, professional notes, and company responses.

No question, company, or coverage candidate in this inventory is automatically public. The inventory is a work queue. Every durable page must be drafted, source-linked, machine-readable, and signed off in the correct scope before it is indexable.

## What was created in this pass

The catalog generator is `scripts/generate-content-catalog.mjs`, exposed as `npm run catalog:build`. It imports the canonical insurance-line vocabulary instead of copying it, so the planning system cannot quietly drift from the product's route vocabulary.

The generated planning artifacts are:

- `planning/birch-question-catalog.ndjson` — **12,864 deterministic question candidates**.
- `planning/birch-content-master-manifest.json` — counts, source systems, company-page families, and publication rules.
- `planning/birch-company-page-universe.json` — the company/entity page universe and the five existing Birch company records.

The candidate count is built from:

| Dimension | Count | Meaning |
| --- | ---: | --- |
| Canonical lines | 51 | Coverage/type vocabulary already recognized by Birch |
| Jurisdictions | 56 | 50 states, District of Columbia, and five U.S. territories |
| Use cases | 42 | Life, property, business, claims, renewal, and professional situations |
| Audiences | 14 | Consumer, owner, operator, professional, regulator, and industry roles |
| Question candidates | 12,864 | Candidate prompts only; all pending source and licensed review |
| Existing company records | 5 | Current Birch seed records, not an exhaustive market list |
| Company page families | 12 | Inclusion rules for building the entity universe |

### Candidate families

- 1,020 line questions: 51 lines x 20 durable question intents.
- 11,424 jurisdiction questions: 51 lines x 56 jurisdictions x 4 state-context intents.
- 336 use-case questions: 42 situations x 8 use-case intents.
- 84 audience questions: 14 audiences x 6 audience intents.

This is intentionally a large backlog, not a command to publish 12,864 pages. The first publication wave should be a few hundred high-use, high-evidence records. The remaining candidates stay pending until Birch has the sources, reviewers, and maintenance capacity to support them.

## Insurance type and coverage taxonomy

The coverage library currently has 51 canonical line IDs. These are the stable internal keys; each public page can have a clearer reader-facing title and jurisdiction scope.

### Personal property and household

`homeowners`, `renters`, `condominium-unit-owners`, `mobilehome`, `dwelling-fire`, `residential-earthquake`, `residential-flood`, `flood`, `wildfire`, `windstorm`, `difference-in-conditions`, `scheduled-personal-property`, `umbrella-excess`

### Auto, cargo, and physical movement

`auto`, `commercial-auto`, `motor-truck-cargo`, `inland-marine`

### Commercial property, liability, and income

`commercial-property`, `business-income`, `commercial-general-liability`, `bop`, `builders-risk`, `contractual-risk-transfer`, `additional-insured`, `surety`, `contract-surety`, `license-and-permit-bonds`, `court-bonds`, `surplus-lines`

### Professional, management, employment, and cyber

`professional-liability`, `errors-and-omissions`, `medical-professional-liability`, `technology-errors-and-omissions`, `cyber-liability`, `privacy-and-network-security`, `crime-and-social-engineering`, `directors-and-officers`, `employment-practices-liability`, `third-party-employment-practices-liability`, `wage-and-hour-defense`, `employers-liability`

### Life, health, and benefits

`individual-life`, `term-life`, `permanent-life`, `key-person`, `buy-sell`, `group-health`, `employee-benefits`

Some of these keys describe a policy form, some describe a market or program, and some describe a risk-transfer structure. Birch must preserve those distinctions in page titles and labels. A market such as surplus lines is not a policy form; an additional insured is not a standalone policy; a regulator or residual facility is not a carrier.

## Use-case inventory

The first 42 use cases are grouped below. Each can become an industry hub, a question cluster, an example set, a tool entry point, or a moderated discussion subject only when the underlying records exist.

### Home and property

Buying a home; selling a home; renting a home; owning a condominium unit; owning a mobilehome; owning a vacation home; owning a high-value home; becoming a landlord; managing rental property; forming or managing a community association; planning a renovation; building or substantially improving a structure.

### Business formation and operations

Hiring a contractor; running a contracting business; signing a contract that requires insurance; providing a certificate of insurance; buying a business; starting a business; adding a business location; hiring an employee; offering employee benefits; working remotely; operating a retail business; operating a restaurant or hospitality business; forming a nonprofit; running a school or childcare program.

### Technology and professional services

Handling customer or patient data; responding to a suspected data breach; opening a medical practice; providing professional services; planning business succession; protecting a key person relationship.

### Transport and claims

Transporting goods for others; using commercial vehicles; hiring or supervising drivers; reviewing a renewal; receiving a nonrenewal or cancellation notice; reporting a loss or claim; responding to a disputed claim decision; recovering after a natural disaster; comparing policy documents; checking an insurance company.

## Company page universe

“All insurance companies” should not be a hand-written list of famous brands. The reliable definition is: every distinct, source-verified entity that is relevant to a selected jurisdiction and has a clearly stated role in the insurance system.

The first company inventory should be generated from regulator and official records, then normalized by legal identity, subsidiary, parent, role, jurisdiction, and source date. NAIC's Consumer Insurance Search warns that insurers may appear under different subsidiary names and recommends checking the state insurance department for licensing. California's Department of Insurance publishes company information routes for license status, company lists, complaint studies, enforcement, rate filings, and market-conduct material. These are the right starting points for the company ingestion contract, not a manually guessed brand list.

### Company page families

1. Licensed property and casualty insurers.
2. Licensed life and annuity insurers.
3. Licensed health insurers and HMOs.
4. Surplus-lines and nonadmitted insurers.
5. Residual markets, pools, and public facilities.
6. Guaranty associations.
7. MGAs, program administrators, and wholesalers.
8. Claims administrators and third-party administrators.
9. Reinsurers and industry entities.
10. Regulators and public insurance entities.
11. Brokers, agents, and financial professionals with opted-in profiles.
12. InsurTech and distribution companies.

### Company page template

Every company or entity page should have separate, visually distinct sections:

1. **Identity** — legal name, short name, entity type, parent/affiliate relationship when sourced, and official domain.
2. **Where the record applies** — jurisdictions, license or program status, effective/last-checked dates, and the regulator/source that supports it.
3. **Official channels** — official website, consumer service, claims or complaint route, and regulator links where available.
4. **Coverage relationships** — only source-linked relationships to a coverage, form, program, or state record; never inferred from a logo or search result.
5. **Public records** — source records for filings, notices, enforcement, market conduct, complaints, financial or statutory information when lawful access and licensing permit.
6. **Current changes** — dated notices, filings, legislation, or public announcements with a “current as of” label.
7. **Community experiences** — future moderated, attributed, first-person material; never merged into sourced company facts.
8. **Company responses** — verified organization responses that add context without deleting or rewriting the underlying experience.
9. **Citation kit** — stable page URL, machine JSON, source ledger, content version, and correction history.

The page must not use a star rating, a single reputation score, a “best insurer” label, a claims-payment verdict, or an unsupported appetite statement. A brand mark can help recognition, but it is not proof of legal identity, licensing, financial strength, availability, or quality.

## Question inventory and page production

The generator covers the recurring questions people ask about any line or situation:

- What is it and what is it designed to address?
- Who might consider it?
- What should a reader ask about scope, exclusions, limits, deductibles, or sublimits?
- Which documents and facts should a reader inspect?
- What may change an insurer's questions without Birch making an eligibility determination?
- What records should a reader keep before or after a loss?
- What should a reader review before renewal or after a cancellation/nonrenewal notice?
- How can one policy, contract, line, or public program interact with another?
- What can affect cost without Birch estimating a premium?
- Which terms and primary sources should a reader understand?
- What varies by jurisdiction?
- What changed recently and therefore needs rechecking?
- What should a reader ask a licensed professional?

The question candidates are not keyword variations for search traffic. Before drafting, each candidate must be deduplicated against the existing question library, merged with adjacent variants where appropriate, and assigned a specific canonical question. One durable question should have one canonical answer, with aliases pointing to it.

## Publication state machine

Every candidate moves through explicit states:

`candidate -> triaged -> source-requested -> source-captured -> drafted -> automated-checks -> licensed-review -> compliance-review -> approved -> published -> recheck-due -> corrected or superseded`

The state belongs to the record, not to a dashboard color. A record cannot be called reviewed until the licensed review event exists for the exact content version and scope. If a source changes, the record returns to `recheck-due` even if its prose has not yet visibly changed.

### Required review record

Store the following internally for each signed-off record:

- content ID and immutable content version;
- reviewer role and relevant line of authority;
- license jurisdiction and a regulator-verification URL or internal verification reference;
- review date and next recheck date;
- jurisdiction and audience scope reviewed;
- sources and claims inspected;
- reviewer decision: approve, approve with edits, return for sources, or reject;
- conflicts or commercial relationship disclosure;
- reviewer notes and the final checksum.

Public pages may show the reviewer role, review date, scope, and methodology. Do not publish unnecessary license numbers or private verification data.

### Who may sign off

A licensed broker can be the accountable reviewer for core insurance explanations within the broker's actual competence and license scope. One person should not be treated as qualified to approve every state, every line, health or medical content, life and annuity content, legal interpretations, or claims disputes.

Use a scoped review panel as the corpus expands:

- licensed producer with the relevant line and jurisdiction;
- state-specific insurance reviewer for state law and regulator material;
- attorney or regulatory subject-matter reviewer for legal interpretation, statutes, litigation, and formal disputes;
- qualified health or benefits reviewer for health and employee-benefit material;
- privacy/security reviewer for policy documents, user experiences, and sensitive data;
- editorial/compliance reviewer for conflict disclosure, commercial separation, and claims language.

The broker pass confirms insurance accuracy and scope. It does not turn Birch into the regulator, an insurer, a law firm, a medical provider, or a personalized advisory service.

## AI answer and research loop

The answer engine should have three modes:

### 1. Answer from the published corpus

Retrieve only source-linked records. Return the concise answer, assumptions, jurisdiction, confidence/status, related questions, and direct links to the source ledger and machine JSON. The answer should not silently combine a California rule with a general explanation.

### 2. Insufficient evidence

If the corpus cannot support the answer, say so. Offer adjacent published questions and invite a source request. Capture the unanswered query internally without storing unnecessary personal details.

### 3. Research gap workflow

Use an external research provider such as Perplexity only for candidate discovery. Save candidate URLs, publisher, date, jurisdiction, source type, relevant passage, and why the source might support the question. Cross-check material claims against primary law, regulator guidance, official forms, court opinions, public filings, or another appropriate authority. An editor then drafts the answer, attaches citation markers, assigns scope, and requests licensed review. No external answer should auto-publish or be presented as Birch authority.

After approval, the record can enter the corpus, search index, RSS/change feed, sitemap, `llms.txt`, and machine JSON. Google indexing is an outcome of a clean, indexable, useful page; it is not a substitute for editorial approval.

## Citation and AI-discovery contract

Every published record must have:

- one stable canonical URL;
- a unique, plain-language title and a complete meta description;
- visible inline source markers that resolve to a same-page source ledger;
- original URL, publisher, source type, jurisdiction, publication/effective date, last-checked date, and claims supported;
- author, reviewer, content version, and correction history;
- JSON-LD that describes only visible content;
- machine JSON with the same facts and source records;
- internal links to the relevant coverage, question, state, company, example, tool, and source;
- an honest boundary label that separates Birch explanation, sourced fact, example, user experience, and professional contribution.

Preview deployments remain protected and `noindex`. Thin, empty, duplicate, private, and candidate-only routes remain out of the sitemap. Search engines and answer engines should discover a smaller set of excellent records rather than thousands of nearly identical pages.

## Ordered publication queue

### Wave 0: instrument and audit the queue

- Keep the generated catalog deterministic and checked into the planning layer.
- Add catalog validation for unique IDs, duplicate questions, canonical line IDs, jurisdiction codes, grammar, and review gates.
- Add a source-request record so unanswered queries are visible to editors but never leak into public research.
- Freeze the current 85 questions, 27 coverage pages, 301 sources, 11 examples, 10 modules, and five company records as the baseline snapshot.

### Wave 1: high-use California research

- Select 150 to 250 candidates across homeowners, renters, auto, wildfire, earthquake, flood, contractors, small business, workers compensation, cyber, professional liability, and life.
- Prefer primary California Department of Insurance, California statute/regulation, official program, policy-form, and public authority sources.
- Add source-linked examples and state-specific “what changes the answer” sections.
- Run one stable broker/editor review pass on the frozen wave.

### Wave 2: public company identity and regulator layer

- Build the California company/entity import adapter from official company lists, company-by-line records, surplus-line lists, complaint/enforcement pages, and market-conduct sources.
- Normalize legal identity, aliases, subsidiaries, parents, roles, jurisdictions, official domains, and source dates.
- Produce identity-only pages first; add coverage relationships only after source matching.
- Add a verified organization response request flow without giving the organization editorial control over Birch's research.

### Wave 3: core national coverage library

- Draft general explanations for the 51 canonical lines where sufficient source material exists.
- Add the highest-volume use cases and audience questions without creating duplicate pages for every phrasing.
- Add primary source records and worked examples for exclusions, limits, documentation, claims process context, renewal, and coordination questions.

### Wave 4: jurisdiction expansion

- Expand state-by-state only when a line has an appropriate state source set and a reviewer with relevant scope.
- Prioritize California, Florida, Texas, New York, and other jurisdictions based on user demand and source readiness—not search volume alone.
- Never turn the 56-jurisdiction candidate matrix into 56 published pages by default.

### Wave 5: tools and private policy understanding

- Keep public tools accountless when they use no sensitive input.
- Build the policy-understanding beta only after privacy design, local redaction, retention/deletion, secure processing, access control, and professional handoff are tested.
- Return observations, missing-information prompts, source links, and questions for a professional—not coverage determinations.

### Wave 6: authenticated Commons

- Require magic-link/passkey authentication for posting, replying, saving, following, reporting, and editing.
- Launch post types for question, experience, source tip, correction, professional note, and company response.
- Require role disclosure, moderation state, edit history, rate limits, reporting, appeals, and withdrawal.
- Keep community experiences, professional contributions, company responses, and sourced research visibly separate.

### Wave 7: distribution and maintenance

- Publish stable citation cards, RSS, machine feeds, and a dataset release for approved records.
- Add source freshness jobs, correction queues, broken-link checks, answer-gap analytics, and re-review reminders.
- Measure citation usage, successful answer sessions, source opens, correction latency, and unanswered-question rate—not page count alone.

## Definition of done for the master program

The content program is ready for broader public beta when:

1. A visitor can ask a question without signing up and gets either a sourced answer or an honest insufficient-evidence result.
2. A reader can inspect the exact source record, jurisdiction, last-checked date, reviewer scope, and machine JSON.
3. A company page distinguishes the carrier, regulator, facility, administrator, broker, and technology role.
4. A contributor can sign in, disclose their role, submit an experience or correction, see moderation status, and withdraw it.
5. A licensed reviewer can approve an immutable content version within an explicit line and jurisdiction scope.
6. AI-assisted research can suggest sources and gaps without publishing unreviewed prose.
7. Preview is gated and noindex; only approved, substantial records enter the production sitemap.
8. Every correction, supersession, source update, and review decision is traceable.

The master list is complete as a planning instrument when it can answer “what should we research next?” without pretending that a candidate is already true. Birch becomes a source of truth one reviewed, citable record at a time.

## Immediate next implementation passes

1. Add `catalog:verify` to CI and the root validation command.
2. Add a first-class research-gap queue and candidate-to-draft handoff record.
3. Build the company identity import contract for one jurisdiction, beginning with California and preserving the regulator's entity naming.
4. Select the first 150 to 250 Wave 1 questions and map each to sources before any prose generation.
5. Prepare the single licensed review packet containing the frozen copy, source mappings, machine records, boundaries, and change log.

The only human input required to begin Wave 1 signoff is the name and scope of the licensed reviewer or review panel: license jurisdiction, lines of authority, and whether they are reviewing Birch as an independent educational product or as part of a disclosed brokerage relationship.
