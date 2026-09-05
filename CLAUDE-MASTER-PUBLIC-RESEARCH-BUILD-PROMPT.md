# Claude Master Build Prompt: BestInsurance Research

## Role

Act as the lead product designer, information architect, editorial-systems engineer,
and Astro implementation owner for BestInsurance Research.

Work only inside:

`C:\Users\aaron\Documents\Codex\2026-08-25\au\bestinsurance-research-preview`

This is a local preview and design build. Do not deploy, buy a domain, change DNS,
publish to production, edit Bollinsure, or edit BestAMS. Stop at a fully tested local
preview, Figma-ready design documentation, and a deployment checklist.

Read `AGENTS.md`, `CLAUDE.md`, `README.md`, `DESIGN-REFERENCES.md`,
`BOLLINSURE-INTEGRATION.md`, `PRODUCT-ROLLOUT.md`, and
`DEPLOYMENT-CHECKLIST.md` before making changes. Audit the current application first
and keep anything that is already stronger than this brief.

Approved identity assets are in:

`C:\Users\aaron\Downloads\a`

Use the approved BestInsurance Research icon, favicon set, and manifest from that
folder. Do not use the Bollinsure logo as the BestInsurance Research logo. Bollinsure
may appear only as the operator, licensed-help destination, reviewer, or source of an
explicitly attributed public example.

## Product Definition

BestInsurance Research is an independent-feeling, publicly accessible insurance
research and decision-support library operated by WJB Services, Inc. dba Bollinsure
Insurance Services. It should help a person answer an insurance question, understand
the source and limits of the answer, compare concepts, and decide the next responsible
step without forcing lead capture.

It is not:

- a quote funnel disguised as research;
- a carrier, rater, market-access promise, or eligibility engine;
- a thin programmatic SEO site;
- a generic AI chat page;
- a source of legal, medical, tax, lending, investment, or claims advice;
- a place to collect declaration pages, contact information, or sensitive facts;
- a replacement for a licensed broker or carrier underwriting decision;
- a collection of fabricated examples, outcomes, premiums, carrier appetites, or case
  studies.

Its public promise is:

> Ask an insurance question. See the answer, the evidence, the uncertainty, and the
> next responsible step.

The first screen must be the usable research experience, not a marketing hero. The
brand and literal product category must still be obvious in the first viewport.

## Brand Relationship

Keep the four-part boundary unmistakable:

1. BestInsurance Research attracts, explains, cites, and organizes public information.
2. CovWell is the insured-facing self-guided coverage and service product. It is not a
   second research encyclopedia and is outside this codebase.
3. Bollinsure handles identified client intake, licensed insurance advice, quoting,
   uploads, appointments, email, and calls.
4. BestAMS remains Bollinsure's system of record and is not part of this task.

Use a concise disclosure near any licensed-help action:

> BestInsurance Research provides general information. Licensed help is offered by
> Bollinsure Insurance Services, a California insurance brokerage.

The primary research journey must never require a Bollinsure handoff. A handoff is a
clearly labeled optional next step after the user has received value.

## Design Direction

Design a premium editorial-fintech utility: precise, calm, unusually usable, and
visibly evidence-led. It may feel AI-capable, but it must not use the usual synthetic
AI tropes.

Use the existing font system unless the audit proves it is broken:

- Newsreader for editorial display headings;
- Schibsted Grotesk for interface and body copy;
- IBM Plex Mono for provenance, dates, source labels, and compact metadata.

Use a restrained multi-color system derived from ink, paper, white, gold, green,
useful warning tones, and accessible data colors. Do not create a one-hue beige,
purple, blue-purple, dark-slate, or orange-brown theme. Do not use gradient orbs,
bokeh, excessive pills, glassmorphism, oversized marketing headings, decorative
cards, cards inside cards, or SVG hero illustrations.

Cards may be used only for repeated answer results, source records, examples, and
genuinely framed tools. Page sections should be unframed full-width bands with a
constrained inner grid. Keep corner radii at 8px or less. Controls must look like
controls, not decorative badges.

Buttons must use clear commands. Use Lucide icons from the installed `@lucide/astro`
package when an icon exists. Use tooltips for unfamiliar icon-only actions. Use
segmented controls for modes, tabs for views, checkboxes for binary filters, and
selects or menus for finite option sets. Every control must be fully functional.

Use subtle CSS motion only for focus, disclosure, state change, and continuity. Honor
`prefers-reduced-motion`. Do not make a looping video or animation the LCP element.

## Mobbin Reference Pass

Use Mobbin as a pattern library, not as a source to copy. Create a short reference
board and note the product, screen, and exact structural lesson used. Look for current
patterns in these categories:

- evidence-led search and answer experiences;
- enterprise knowledge bases;
- fintech data provenance;
- source comparison and expandable citations;
- progressive disclosure in complex onboarding;
- document or record timelines;
- dashboard filters and saved views;
- AI answer confidence and correction patterns;
- mobile search, filters, and citation drawers;
- empty, loading, error, stale-source, and no-result states.

Choose no more than 12 references. Extract layout, hierarchy, interaction, and state
handling, not colors, copy, illustrations, or proprietary branding. Add the final
reference rationale to `DESIGN-REFERENCES.md`.

If Mobbin is unavailable, document that limitation and use first-party product
screenshots from reputable public tools as references. Do not block implementation.

## Figma Deliverable

Translate the implemented design system into a Figma-ready specification or an actual
Figma file when access is available. Use variables and reusable components. Include:

- color, spacing, type, radius, border, elevation, and motion tokens;
- desktop 1440, laptop 1024, tablet 768, and mobile 390 frames;
- header, command search, question composer, filters, answer header, source drawer,
  evidence row, example card, related-question row, data table, callout, correction
  control, licensed-help handoff, footer, pagination, and empty/error/loading states;
- component variants for hover, focus, active, selected, disabled, stale, loading,
  cited, disputed, and reviewed;
- annotations for responsive behavior and keyboard flow;
- a prototype for question to answer to citation to related topic to optional licensed
  handoff.

The implementation remains the source of truth. Figma must reflect working code, not
an unbuildable parallel concept.

## Information Architecture

Build the product around entities and questions, not around a blog chronology.

Top-level public routes:

- `/` research command center;
- `/ask` full question and answer interface;
- `/insurance` coverage and line library;
- `/companies` insurer and organization library;
- `/states` state-specific regulation and availability context;
- `/questions` browsable question library;
- `/tools` free tools and checklists;
- `/examples` labeled educational examples and case studies;
- `/sources` source registry and methodology;
- `/about` operator, editorial policy, corrections, scope, and funding;
- `/rss.xml`, `/sitemap-index.xml`, `/llms.txt`, and `/llms-full.txt`.

Coverage families must support:

- personal: homeowners, renters, condo, auto, umbrella, landlord, valuables, flood,
  earthquake, wildfire-related pathways, and high-net-worth;
- commercial: general liability, property, BOP/package, workers compensation,
  commercial auto, umbrella/excess, cyber, EPLI, professional liability, D&O, crime,
  inland marine, builders risk, bonds, equipment, and industry-specific combinations;
- life: term, permanent, key person, buy-sell, individual use cases, ownership and
  beneficiary concepts;
- health and benefits: group health concepts, employee benefits, COBRA and public
  program explanations, with especially strict source and date requirements;
- specialty and transaction topics as the corpus matures.

Do not publish an empty taxonomy. Seed each live family with a small number of deep,
well-sourced canonical pages and keep future routes out of the sitemap until they are
substantive.

## Homepage and Ask Experience

Before implementing the homepage, create three complete responsive concept directions
in Figma or the Figma-ready design specification. They must share the same identity,
tokens, content model, accessibility standard, and evidence rules, but differ in
information hierarchy:

1. `Research Command Center`: question-first, with compact context controls and a
   visible source-quality strip;
2. `Evidence Ledger`: a direct-answer preview, source registry, review dates, and
   correction status as the strongest first-viewport signal;
3. `Insurance Topic Atlas`: high-scan coverage, state, company, question, and tool
   entry points around a restrained central search experience.

Score all three from 1-5 for immediate comprehension, source trust, mobile usability,
return usefulness, organic-search depth, accessibility, performance risk, and freedom
from lead-generation pressure. Record the comparison and recommendation in
`DESIGN-REFERENCES.md`. Implement the strongest direction and preserve the other two
as clearly labeled design alternatives only; do not ship three competing homepages.

The homepage is a research workspace. The first viewport should contain:

- the BestInsurance Research identity and short scope statement;
- a prominent question field with an example that rotates only when motion is allowed;
- optional context controls for insurance type, state, company, and audience;
- a browse-by-topic fallback;
- visible source and review standards;
- recent or frequently useful questions based on editorial selection, not fake usage
  counts;
- no required email, phone, account, or quote CTA.

Question input rules:

- accept plain-language questions;
- never place the question in a public query string if it might contain personal data;
- warn users not to include names, policy numbers, addresses, health details, claim
  identifiers, or other private data;
- support a non-AI deterministic topic lookup fallback;
- provide a visible edit-question action;
- preserve the user's context locally only when privacy requirements are met;
- do not claim the answer is personalized insurance advice.

Answer page structure:

1. direct answer in two to five sentences;
2. `What this assumes`;
3. `Why this is the answer` with inline citations;
4. `What changes the answer`;
5. state, policy-form, carrier, or factual variability;
6. concrete next actions;
7. source ledger with title, publisher, date, jurisdiction, last checked, and direct
   link;
8. correction/report control;
9. related canonical questions;
10. optional licensed-help handoff when appropriate.

Never hide the source ledger behind account creation. Do not use citation numbers that
do not resolve to visible source records.

## Content Data Model

Create typed content collections and schemas. Avoid hardcoding dozens of pages in one
component. At minimum model:

### Question

- id, slug, canonical question, aliases;
- short answer;
- detailed sections;
- insurance family, line, state, audience, company, and topic tags;
- assumptions and answer-changing facts;
- effective date and last reviewed date;
- author and licensed reviewer;
- source IDs and source-level claim mapping;
- confidence status: established, contextual, disputed, changing, or insufficient;
- handoff recommendation and reason;
- related question IDs;
- schema eligibility flags.

### Source

- source ID;
- title, publisher, canonical URL, source type;
- jurisdiction and authority level;
- publication/effective/access dates;
- primary or secondary designation;
- archived snapshot metadata where legally and technically appropriate;
- exact claims supported;
- last checked;
- update cadence;
- status: active, superseded, unavailable, or disputed.

### Coverage

- line and family;
- definition;
- typical insured, covered property, event, or obligation;
- common limits, deductibles, exclusions, endorsements, and conditions described
  without implying universal policy language;
- related policies and common combinations;
- underwriting inputs;
- state variations;
- primary sources;
- reviewer and dates.

### Company

- legal company or group name;
- NAIC identifiers when sourced;
- official URLs and contact channels;
- regulator records;
- states or product context only when sourced and current;
- financial-strength links rather than unsupported summaries;
- complaint or enforcement links with denominator and date warnings;
- no unsourced `best`, `cheapest`, `most reliable`, or appetite claims.

### Example

- real, anonymized, composite, or hypothetical label;
- scenario facts;
- question;
- reasoning path;
- outcome or range only when verified;
- what cannot be generalized;
- source and reviewer references;
- consent/provenance record for any real case.

Never present a composite or hypothetical example as a real Bollinsure client result.
Do not use personal information from any declarations page, intake, email, or BestAMS
record.

## Citation and Editorial Standard

Prefer primary sources in this order where relevant:

1. statutes, regulations, regulator bulletins, and official government guidance;
2. filed policy forms, endorsements, and official carrier documents;
3. NAIC, California Department of Insurance, NCCI, CMS, DOL, IRS, FEMA, SBA, CFPB,
   SEC, and other competent public authorities;
4. official product or technical documentation;
5. high-quality secondary analysis used only to explain, never to override a primary
   source.

Every material factual claim must map to a source. Every time-sensitive answer needs a
`last reviewed` date. Display uncertainty honestly. Use language such as `often`,
`may`, `depends on the policy form`, and `carrier underwriting decides` where that is
the truth. Do not let cautious wording become vague wording: state the direct answer
first, then the conditions.

Create a public methodology page that explains:

- source hierarchy;
- author and reviewer roles;
- update cadence;
- corrections;
- use of AI in drafting, extraction, search, and evaluation;
- how human review is required before publication;
- how sponsorships, affiliate relationships, and Bollinsure handoffs are disclosed;
- that ranking and inclusion are not for sale;
- how examples are labeled;
- what the site deliberately does not answer.

No page may imply that schema markup, AI generation, or retrieval replaces licensed or
editorial review.

## AI and Retrieval Architecture

Design for a trainable, versioned public corpus, not for uncontrolled model training.

Build or specify:

- a normalized content store;
- chunking by claim and section, not arbitrary token windows;
- source IDs attached to every chunk;
- versioned embeddings or search indexes;
- deterministic filters for state, line, company, audience, and effective date;
- hybrid keyword and semantic retrieval;
- answer generation that may only cite retrieved source records;
- a refusal or `insufficient evidence` path;
- a claim-to-source validator;
- evaluation fixtures for factuality, citation correctness, state confusion,
  out-of-date content, unsupported carrier claims, and prohibited personalization;
- an editorial queue for unanswered high-value questions;
- an audit log for draft, reviewer, source changes, and publication status.

Do not train on or ingest private Bollinsure or BestAMS data. Public Bollinsure pages
may be indexed only as public attributed sources. Any future private retrieval system
must remain separately permissioned and is outside this task.

For the preview, implement deterministic sample content and interfaces. If a model is
not configured, use a clearly labeled mock answer engine that never presents generated
text as live research. Do not add a paid AI dependency without approval.

## Tools

The `/tools` experience should prioritize free, broadly useful decision support.
Build the framework and at least three polished, source-aware tools:

1. Insurance Requirement Mapper
   - choose agreement or transaction type;
   - organize requested policies, limits, endorsements, evidence, and open questions;
   - distinguish requested terms from verified availability;
   - export/print a non-binding checklist without contact capture.

2. Renewal Readiness Checklist
   - select personal or commercial context and relevant lines;
   - show documents, schedules, change triggers, and timing;
   - save locally or print;
   - never claim submission or carrier review has occurred.

3. Policy Comparison Workspace
   - compare user-entered limits, deductibles, forms, and endorsements locally;
   - do not upload or persist policy documents in this project;
   - warn that matching labels may not mean matching coverage;
   - provide questions to take to a broker or carrier.

Prepare future tool specifications, but do not fake live data:

- California property-readiness explainer;
- contract insurance requirement mapper;
- workers compensation classification question builder;
- claims-made continuity timeline;
- commercial auto schedule builder;
- earthquake, flood, and wildfire decision-path explainers;
- carrier and regulator lookup launcher;
- premium or replacement-cost calculators only if methodology and data are defensible.

Create a typed tool registry and detailed implementation specifications covering the
major insurance families, even though only the three launch tools are built now. Every
future tool must name its user, input data, authoritative sources, privacy boundary,
calculation or decision rules, uncertainty, output, export format, accessibility
states, schema eligibility, review owner, and update cadence. Include at least:

- homeowners, condo, landlord, flood, earthquake, and wildfire: property information
  organizer and public-hazard source explorer, without a carrier eligibility verdict;
- personal auto: driver, vehicle, use, limit, deductible, and household schedule
  builder that stores locally only;
- umbrella and high-net-worth: underlying-policy and asset-context checklist;
- life: needs-conversation organizer with no medical or beneficiary data storage;
- group health and benefits: renewal and census-preparation checklist with no member
  health information;
- commercial package, general liability, and property: COPE, operations, locations,
  revenue, payroll, subcontractor, and contract-requirement workspaces;
- workers compensation: payroll and classification question builder with clear class
  code caveats;
- commercial auto: fleet and driver schedule builder;
- cyber: control-readiness checklist tied to dated primary frameworks;
- EPLI: employment-practice readiness checklist, not legal advice;
- professional liability and D&O: claims-made continuity and retroactive-date timeline;
- inland marine and equipment: property-in-transit and equipment schedule builder;
- bonds: bond requirement organizer that distinguishes surety from insurance;
- builders risk and construction: project, value, parties, duration, and contract
  requirement organizer.

Do not publish an empty tool route. Keep unbuilt tools in the registry and roadmap,
not in the sitemap or public navigation.

Do not publish a public verdict that a property is standard, non-admitted, FAIR Plan,
eligible, bound, or uninsurable. Explain possible pathways and the facts that affect
underwriting.

## Company and Coverage Pages

Create entity pages that are useful without pretending to compare prices or appetite.

A company page should contain:

- verified identity and regulator links;
- products or lines only when sourced;
- claims/contact/portal links from official sources;
- policy-form and consumer-guide links where available;
- state availability and dates when confirmed;
- related questions;
- source ledger;
- corrections path;
- no ratings summary without methodology and direct source.

A coverage page should contain:

- direct definition;
- who or what it is designed to protect;
- what it commonly covers and does not cover, with policy-form caveats;
- limits, deductibles, conditions, endorsements, and connected policies;
- underwriting information commonly requested;
- state-specific variations;
- worked examples with labels;
- related company, state, question, and tool pages;
- source ledger and review date.

## Case Studies and Real Examples

Build a credible example system, not a testimonial wall.

Allowed example types:

- public regulator or court examples, directly cited;
- public carrier examples, labeled as carrier-authored;
- published industry examples with permission and citation;
- Bollinsure cases only when anonymized, approved, and documented;
- composites clearly labeled `composite educational example`;
- hypotheticals clearly labeled `hypothetical`.

Each example must include `what happened`, `what information mattered`, `what the
insurance question was`, `what was decided by the carrier or other authority`, `what
cannot be generalized`, and sources. Never invent savings, close times, placement,
claims outcomes, or policy terms.

## Search, SEO, GEO, and AI Crawlability

Build authority through usefulness and provenance, not keyword volume.

Required technical work:

- one canonical URL per substantive entity or question;
- clean permanent redirects from retired paths;
- XML sitemap index split by question, coverage, company, state, tool, and editorial
  content when volume justifies it;
- useful HTML navigation and contextual internal links;
- breadcrumbs;
- RSS for newly reviewed research, questions, tools, and corrections;
- valid `robots.txt` by environment;
- `noindex, nofollow` in preview;
- production-ready `llms.txt` and `llms-full.txt` with scope and canonical links;
- server-rendered answer content;
- complete title, description, Open Graph, and social image metadata;
- source, author, reviewer, published, modified, and effective dates in visible HTML;
- content hashes or stable IDs in the source registry;
- no hidden FAQ or schema-only content;
- no doorway pages, spun city pages, or empty company pages;
- no cross-domain duplication.

For every substantive answer, coverage page, company page, source record, and tool,
provide a stable machine-readable JSON companion that contains only public page facts,
source identifiers, jurisdiction, effective dates, review dates, canonical URL, and
content version. Add a visible `Cite this page` control with plain-text, BibTeX, and
CSL JSON output. Never put private questions, user inputs, analytics identifiers, or
generated claims in these records.

Use schema only when it matches visible content. Appropriate types include:

- `Organization`;
- `WebSite` with `SearchAction` only if the search URL genuinely works;
- `CollectionPage`;
- `Article` or `TechArticle`;
- `FAQPage` only for visible question-answer content and current Google eligibility;
- `BreadcrumbList`;
- `DefinedTerm` and `DefinedTermSet`;
- `ItemList`;
- `Dataset` only when the public data and license justify it;
- `SoftwareApplication` or `WebApplication` for real interactive tools;
- `PodcastSeries` and `PodcastEpisode` for any properly integrated public feed.

Do not use review, rating, price, offer, or medical schema without the actual visible
and eligible content.

## Domain Strategy

Do not make every Porkbun domain a separate thin insurance website. Create
`DOMAIN-ROUTING-MANIFEST.md` with one row per domain and these columns:

- domain;
- existing history or backlinks;
- user intent;
- canonical BestInsurance Research topic, tool, or collection;
- recommendation: retain, build as a distinct product, 301 redirect, park, or retire;
- redirect target;
- rationale;
- migration and measurement notes.

Default rule:

- Generic question, application, quote, coverage, or calculator domains should 301 to
  the strongest matching canonical BestInsurance Research page or tool.
- Retain a separate domain only when it has a genuinely distinct product, data source,
  recurring user workflow, brand, and content roadmap that cannot be served better on
  the canonical research site.
- Preserve a historically valuable domain only after checking backlinks, indexed
  pages, trademarks, spam history, and user intent.
- Never use cross-domain duplicate content, microsite doorway pages, or chain
  redirects.
- Never redirect a domain to an unrelated homepage merely to avoid deciding its
  purpose.

The manifest is a plan only. Do not touch Porkbun, DNS, Vercel domains, or redirects
outside the local project.

At minimum, reconcile the current known inventory found in the Bollinsure estate:

- `bestartinsurance.com`;
- `bestcyberliability.com`;
- `bestdwellingfire.com`;
- `bestearthquakeinsurance.com`;
- `bestepli.com`;
- `bestgroupmedical.com`;
- `bestho3.com`;
- `bestworkerscompensation.com`;
- `covwell.com`;
- `bollinsure.com`;
- the selected BestInsurance Research production domain.

Also ingest a current Porkbun export or approved API inventory when available and flag
domains missing from the known list. Do not expose Porkbun credentials. Default to
retaining Bollinsure, CovWell, and BestInsurance Research as the three standalone
public products. Default the `best...` specialty domains to a single-hop 301 pointing
to the exact matching BestInsurance Research coverage page or tool. Recommend a
separate specialty product only when the audit proves meaningful history or backlinks
and the product has a distinct recurring workflow, data source, owner, and roadmap.

## Authority and Distribution Plan

Create `AUTHORITY-AND-DISTRIBUTION-PLAN.md`. The strategy must earn references through
usefulness and provenance, not link purchases, reciprocal-link grids, thin syndication,
or keyword volume. Include:

- a versioned source ledger, correction log, public methodology, and update feed;
- downloadable checklists and public datasets with stable canonical pages, licenses,
  methodology, update dates, and machine-readable files;
- small embeddable tools whose attribution links point to the canonical tool, without
  hidden links or forced dofollow terms;
- outreach templates for trade associations, educators, journalists, professional
  firms, regulators, and subject-matter reviewers when a resource solves a recurring
  public question;
- a guest-expert and podcast citation workflow that keeps Transistor and Bollinsure as
  the canonical audio surfaces;
- a quarterly `what changed` research report based on documented source changes;
- backlink and citation monitoring by canonical asset, referring organization,
  relevance, and resulting non-branded discovery;
- an explicit ban on paid links, mass guest-posting, doorway microsites, fake studies,
  invented statistics, and undisclosed sponsorships.

Design the content system so one reviewed source can support a canonical answer,
coverage page update, tool note, downloadable artifact, podcast citation, and social
summary without duplicating the same article across domains.

## Bollinsure Handoff

The optional licensed-help handoff must be simple and transparent.

Use a compact module after useful content:

- title: `Need a licensed review?`;
- plain disclosure of Bollinsure relationship;
- actions: `Start with Bollinsure`, `Email quotes@bollinsure.com`, `Call`, and `Book`;
- preserve only anonymous attribution fields such as source tool, source path,
  insurance family, and completion percentage;
- never place the user's free-form question or personal facts in the URL;
- do not post directly to BestAMS;
- do not imply Bollinsure is the only valid source of licensed help.

Keep the research answer available even when the handoff is ignored.

## Speaking of Insurance Source Relationship

The canonical podcast feed is:

`https://feeds.transistor.fm/speaking-of-insurance`

Do not mirror the feed, compete with the Bollinsure podcast archive, or mass-import
unedited transcripts as research pages. BestInsurance Research may cite a reviewed
Bollinsure episode when it materially supports an answer, with a direct link to the
canonical Bollinsure episode page and a clear source label. A transcript should enter
the research corpus only after factual review, source mapping, and segmentation into
claims. Keep Transistor as the canonical subscription feed and Bollinsure as the
canonical public episode archive. BestInsurance Research remains the canonical home
for its own independent question, coverage, company, source, and tool pages.

## Accessibility

Target WCAG 2.2 AA.

Required:

- semantic headings and landmarks;
- skip link;
- complete keyboard support;
- visible focus;
- labels and descriptions for every control;
- no color-only status;
- 44px minimum touch targets where practical;
- correct disclosure and dialog focus behavior;
- status messages announced without stealing focus;
- accessible tables with mobile alternatives;
- reduced motion;
- high zoom and 320px support;
- text alternatives for meaningful media;
- no clipped text, horizontal overflow, or stretched mobile buttons.

## Performance

The interface must remain fast enough to be a research tool.

Targets on representative mobile pages:

- LCP below 2.5 seconds;
- CLS below 0.1;
- INP below 200ms when measurable;
- minimal blocking JavaScript;
- no client framework hydration for static content;
- route-level or component-level islands only for real interaction;
- local optimized fonts with good fallback metrics;
- responsive AVIF/WebP images;
- no autoplay hero video;
- lazy-load below-fold media;
- pre-render stable public pages;
- cache source assets and feeds responsibly;
- no third-party marketing script in preview.

## Privacy and Security

- Do not collect contact information for research access.
- Do not store free-form questions until a privacy design and retention policy are
  approved.
- Do not upload policy documents in this project.
- Do not include API secrets in browser code.
- Add strict environment separation.
- Add security headers suitable for Astro/Vercel preview.
- Keep analytics event payloads free of questions, names, emails, addresses, policy
  numbers, document text, and other personal data.
- Do not use session replay on pages that may receive insurance questions.
- Provide a public privacy explanation that matches actual behavior.

## Analytics

Design a privacy-minimal event specification but do not configure production analytics
without approval.

Useful aggregate events:

- research_search_started;
- research_answer_viewed;
- source_opened;
- related_question_opened;
- tool_started;
- tool_completed;
- correction_started;
- bollinsure_handoff_clicked.

Allowed parameters are controlled vocabularies such as insurance family, line, state,
source type, page type, tool name, and answer status. Never send the query text or
tool-entered facts.

## Content Seed

Create enough deep seed content to prove the system, not to simulate a finished
encyclopedia. Include at minimum:

- 12 canonical questions across personal and commercial P&C;
- 6 coverage pages;
- 3 company/regulator entity pages;
- 3 state or California-specific pages;
- 3 working tools;
- 4 labeled examples using public or clearly hypothetical facts;
- the full source registry, editorial policy, corrections process, privacy page, and
  about/operator page.

Good seed questions include:

- Does homeowners insurance cover earthquake damage in California?
- What is the difference between replacement cost and market value?
- When does a landlord need a landlord policy instead of homeowners coverage?
- What information does a commercial property underwriter usually request?
- What is the difference between general liability and professional liability?
- What is a claims-made retroactive date?
- When can a contract require additional insured status?
- What does a lender insurance requirement actually prove?
- How do workers compensation class codes affect a quote?
- What is inland marine insurance used for?
- What does a surety bond guarantee, and what does it not insure?
- Why can two insurance policies with the same limit protect differently?

Use current primary sources and visibly date every answer. Do not use a question if
you cannot support it properly.

## Required States

Implement and visually verify:

- default;
- hover and keyboard focus;
- active and selected;
- loading skeleton that does not shift layout;
- no results;
- insufficient evidence;
- source temporarily unavailable;
- stale source;
- answer under review;
- answer corrected;
- offline or fetch failure;
- mobile filters open and closed;
- print/export;
- no JavaScript fallback for core content.

## Implementation Standards

- Preserve the current Astro stack and local conventions.
- Prefer typed Astro content collections and server-rendered components.
- Use structured APIs and parsers instead of string manipulation.
- Keep components small and domain-named.
- Avoid adding dependencies unless they remove real risk or complexity.
- Add tests for route generation, canonicals, schema, source resolution, internal
  links, preview noindex behavior, privacy-safe analytics fields, and domain manifest
  validity.
- Add no placeholder `#` links, dead controls, lorem ipsum, fake user counts, fake
  ratings, fake carrier logos, or fabricated testimonials.
- Use ASCII source text unless an existing content file requires otherwise.
- Do not reformat unrelated files.

## Verification

Before presenting the result:

1. Run `npm run check` and `npm run build`.
2. Start the local preview on an available port.
3. Verify the homepage, one question, one coverage page, one company page, one tool,
   methodology, source registry, and Bollinsure handoff.
4. Capture desktop 1440x900, laptop 1024x768, mobile 390x844, and narrow 320px
   screenshots.
5. Check browser console and failed network requests.
6. Check horizontal overflow and text clipping at every viewport.
7. Use keyboard-only navigation through the complete primary journey.
8. Test reduced motion, 200% zoom, and no JavaScript for core answer content.
9. Validate every JSON-LD block with a parser.
10. Crawl internal links and ensure every source citation resolves.
11. Confirm preview pages and preview robots remain noindex/no-follow.
12. Confirm no contact data, questions, addresses, documents, or secrets enter URLs or
    analytics.

## Deliverables

Produce:

- the working local Astro preview;
- `IMPLEMENTATION-AUDIT.md` with what was retained, changed, and deferred;
- updated `DESIGN-REFERENCES.md` with Mobbin/Figma rationale;
- `CONTENT-MODEL.md`;
- `EDITORIAL-AND-CITATION-STANDARD.md`;
- `AI-RETRIEVAL-ARCHITECTURE.md`;
- `DOMAIN-ROUTING-MANIFEST.md`;
- `AUTHORITY-AND-DISTRIBUTION-PLAN.md`;
- `TOOL-REGISTRY-AND-ROADMAP.md`;
- `ANALYTICS-EVENT-SPEC.md`;
- `LAUNCH-GATE.md`;
- screenshot paths and test output;
- a prioritized backlog split into launch, next, and later.

The close-out must explicitly state:

- no deployment occurred;
- no DNS or Porkbun change occurred;
- no Bollinsure code changed;
- no BestAMS code changed;
- no production analytics changed;
- which pages contain real researched content versus demonstrative placeholders;
- which claims still need a licensed or editorial reviewer;
- which design references came from Mobbin and what was learned from each;
- exact commands and local URL for review.

## Order of Work

1. Audit the existing project and preserve its strongest implementation.
2. Build the content/source model and seed source registry.
3. Establish the design tokens and core layout.
4. Build the homepage research workspace and canonical answer template.
5. Build coverage, company, state, example, source, and methodology templates.
6. Build the three free tools.
7. Add the optional Bollinsure handoff with privacy-safe attribution.
8. Add schema, RSS, sitemap, robots, llms files, and domain manifest.
9. Build all required states and responsive layouts.
10. Test, screenshot, document, and stop before deployment.

Use senior judgment. Make the experience feel finished, but do not manufacture scale,
authority, data, examples, integrations, or features that do not yet exist.
