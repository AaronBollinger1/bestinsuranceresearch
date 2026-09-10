# Birch — product, trust, and design blueprint

Decision record: 10 September 2026

This is the implementation lock for the next Birch pass. It supersedes the
older assumption that `birch.insure` is only the community room. Birch is now
the primary public product: the free, citable insurance research layer. The
discussion product remains separate at `commons.birch.insure` so lived
experience, accounts, moderation, and evidence never become one ambiguous
content type.

The ambition is large. The launch claim must remain narrow enough to prove:

> **Birch is the clearest place to understand an insurance question, inspect
> the source, and add context without turning an experience into a verdict.**

“The Wikipedia of insurance” is an internal destination, not launch copy.

## 1. Product decision

Birch is a research utility first, a conversation layer second, and a licensed
help handoff only when a person explicitly asks for it.

| Room | Canonical origin | Job | Account required | What is citable |
| --- | --- | --- | --- | --- |
| Birch Research | `https://birch.insure` | Answer questions, explain coverage, map sources, publish tools | No | Documents and structured editorial claims |
| Birch Commons | `https://commons.birch.insure` | Host moderated threads, case reports, and practitioner notes | Yes | Attributed accounts only, labelled as experience rather than rule |
| Licensed help | `https://www.bollinsure.com` | Optional human help from the operator’s brokerage | No Birch account | The brokerage’s own service information, not Birch research |

The source boundary is the product moat. Research can link to a discussion for
context; Research never treats a community post as evidence for a rule. A user
experience can become a structured, labelled example only after consent,
moderation, and provenance checks. It never becomes a coverage verdict.

## 2. Disclosure and entity recommendation

This is a product and governance recommendation, not legal advice.

### Launch structure

Keep the existing operator, **WJB Services, Inc. dba Bollinsure Insurance
Services**, as the legal owner/operator during the MVP. Give Birch its own
brand, domain, editorial policy, navigation, design system, and product
roadmap. Do not present Birch as a quote funnel or as a carrier ranking site.

Use this disclosure consistently:

> Birch is an independent insurance research product operated by WJB Services,
> Inc. dba Bollinsure Insurance Services. The operator’s experience informs the
> questions we research; it does not buy placement or control an independent
> research conclusion. Birch provides general information, not legal, tax,
> investment, medical, claims, or coverage advice. Licensed help is offered
> separately by Bollinsure Insurance Services.

Place the short form in the footer and near any licensed-help handoff. Place the
full form on `/about`, `/methodology`, `/editorial-policy`, `/contribute`, and
the professional profile policy. Do not put the operator name in the hero or
make the disclosure so small that a reader has to search for it.

### Independence controls

- No pay-to-rank, paid “best insurer” badge, sponsored answer, or reputation
  removal in exchange for money.
- A company may claim and correct its own profile, but cannot edit a research
  answer or delete an attributed experience merely because it is unfavorable.
- Every contributor has an author role, conflict statement, publication date,
  review date, and revision history.
- A licensed professional’s badge establishes identity or credentials only; it
  never turns their post into Birch’s editorial conclusion.
- If Birch later accepts outside funding, publish a funding register, a sponsor
  separation rule, and an annual conflict review.

Do not form a nonprofit just to make the product look neutral. A future nonprofit
or public-benefit structure could make sense if the mission, funding, board, and
editorial independence genuinely require it, but it would add tax, governance,
private-benefit, and fundraising constraints before the product has proven its
research and moderation loops. Revisit that decision after a real user base,
outside funding model, and counsel review.

## 3. The landing page lock

### First-viewport copy

- Eyebrow: `Birch / Research`
- Headline: **Insurance answers with the source attached.**
- Supporting line: `Free, independent research for the moments when insurance
  gets hard to read. Ask a question, see the assumptions, and open the source
  behind the answer.`
- Primary CTA: **Ask Birch**
- Secondary CTA: **Browse coverage**
- Quiet proof: `Free to read · no account required`
- Boundary line: `No quotes. No rankings. No sales pitch. Just context you can
  check.`

The page should earn a second action in this order: ask, browse, open a source,
then contribute. Signup is not the first conversion. Ask for an account only
when a person wants to save research, follow a topic/company, post, report, or
enter Commons.

The front door has three product abilities, stated simply:

1. **Ask** — put an insurance question into plain language and get the closest
   cited record.
2. **Check** — open the assumptions, source ledger, dates, and corrections
   behind the answer.
3. **Add context** — later, enter Commons to contribute an attributed
   experience or professional note under moderation.

Coverage pages, state pages, company records, tools, changes, and the question
library remain important depth. They are supporting routes, not competing hero
promises. The header therefore stays one bar, with one primary `Ask Birch`
action and no announcement subheader.

### Landing sequence

1. **Hero / question launcher** — one field, one primary action, one sentence
   about privacy. No email capture, quote form, invented usage number, or
   generic “AI-powered” claim.
2. **Corpus proof** — live counts from the published registry: questions,
   coverage lines, source records, stale records, rechecked records, and most
   recent review date. Counts must be computed, never typed into marketing copy.
3. **Birch loop** — Ask in plain language → Open the source → Improve the
   context. The new landing preview uses a real question record and links to
   its real cited answer.
4. **California launch desk** — wildfire, earthquake, FAIR Plan, auto limits,
   and workers’ compensation are the launch wedge. Specificity makes the large
   national ambition believable.
5. **Library atlas** — coverage, questions, companies/regulators, states,
   examples, and tools. Each tile has an actual count and a useful description.
6. **Review feed** — recent changes and RSS, so a returning reader has a reason
   to come back.
7. **Standards** — what Birch will and will not do, with methodology, source
   registry, and corrections CTAs.

The eight-figure appearance comes from a consistent system, real proof,
excellent writing, and a confident information hierarchy. It does not come
from fake logos, exaggerated market claims, fake testimonials, or heavy visual
effects.

## 4. Navigation and interaction system

The primary desktop header now uses four top-level actions:

- **Start here** — chooses the visitor’s next path.
- **Research** — Ask Birch, coverage, questions, and sources.
- **Explore** — California desk, companies/regulators, tools, and reviewed
  changes.
- **Participate** — contribution, professionals, methodology, policy, and the
  future Commons.

Each group opens a two-column panel with a short orientation statement and
direct links. It works on hover, click, keyboard focus, and Escape. On mobile,
the same groups become plain stacked sections. The menu is a product index, not
a collection of clever labels.

The top announcement rail is reserved for one useful, time-bound editorial
entry point: the California launch desk. It can be dismissed for the session.
Future announcements must have an expiry/owner and must never become a
permanent ad strip.

## 5. Direct reference pass

These are direct Mobbin references used for interaction patterns, not assets or
copy. The implementation keeps Birch’s paper, blue, gold-evidence, and exact
bird mark.

| Reference | Pattern adopted in Birch |
| --- | --- |
| [ChatGPT deep-research answer](https://mobbin.com/explore/screens/73833b79-1dd5-4354-8fc4-a2e99c33a75e) | Keep provenance beside the answer in a persistent source rail. |
| [HoneyBook setup flow](https://mobbin.com/explore/flows/1922e5d2-1f9c-43c7-82ba-6bbc28fba7d9) | Show completion state and progressive disclosure in onboarding and contribution. |
| [Slite search](https://mobbin.com/explore/screens/1593defe-aec1-49d2-abc2-37fc84dbd8ad) | Use visible result facets and a reviewed-only mode instead of a hidden filter drawer. |
| [Mintlify documentation](https://mobbin.com/explore/screens/22382df2-2420-4b63-b02f-5c309c95dc85) | Combine taxonomy, on-page orientation, and a persistent resources rail. |
| [Stripe record detail](https://mobbin.com/explore/screens/464dcf70-a0d4-4ba9-b23d-ca6ba18e60f5) | Put freshness, history, and structured metadata beside the primary record. |
| [Confluence related search](https://mobbin.com/explore/screens/8cf8c9fd-cf5c-473f-b21f-2327ce2c8f02) | Offer adjacent questions after a result so a zero-result session has a next move. |

The Corgi reference is useful for a different reason. Its live [insurance
homepage](https://www.corgi.insure/) demonstrates how a serious insurance
product can use grouped navigation, a staged CTA, product packages, proof, and
FAQ content in one coherent journey. Birch borrows the information architecture
idea—not its visual identity, claims, or sales funnel. Birch’s equivalent of a
package is a research path: Ask, Check, Contribute.

## 6. Core feature blueprint

### Research and citability

- Retrieval-first Ask Birch search over the published corpus; no unsupported
  generative answer is allowed to appear as a fact.
- Claim-level citation markers with stable source IDs, publisher, accessed date,
  last checked date, exact support, and jurisdiction.
- Editorial status vocabulary: established, contextual, disputed, changing, or
  insufficient. Do not expose a fake percentage confidence score.
- Immutable dataset releases, JSON records, RSS, sitemap, `llms.txt`, and
  canonical URLs for deep links.
- Public correction log with prior wording, changed wording, reason, source,
  reviewer, and timestamp.
- Every page tells the reader what it does not establish. The absence of a
  researched fact is a visible state, not a blank cell.

### Company pages

Every company page starts as an identity and official-record page:

- legal/brand identity, regulator links, states where verified, official
  contact/complaint channels, and source dates;
- products or coverage references only when supported by public documents;
- a separate “public experiences” area, never mixed into the official profile;
- attributed company response with an immutable edit history;
- no star rating, “best” ranking, sentiment score, or claim-payment verdict.

The page should answer “who is this, what can I verify, and what do people say?”
without pretending those are the same kind of knowledge.

### Commons: forums, threads, and experiences

The future `commons.birch.insure` application should contain:

- magic-link signup, display name controls, verified email, block/report, and
  account deletion;
- forum taxonomy by line, state, company, and question;
- thread pages with canonical URL, title, timestamps, reply tree, edit history,
  moderation state, and related Research links;
- a structured experience form that asks what happened, when, where, what
  document was involved, who decided, and what cannot be generalized;
- company response with a verified organization role, never a hidden edit;
- moderation queue for privacy, threats, defamation, personal data, solicitation,
  unsupported verdicts, and regulated advice;
- “experience”, “public record”, “company-authored”, “professional note”, and
  “editorial research” labels rendered as different content types.

The product should reward useful provenance—source links, clear chronology,
helpful corrections—not outrage, volume, or one-sided company attacks.

### Professional contribution

Create a separate professional profile, not a pay-to-play reputation page.

Suggested roles: licensed insurance producer, claims professional, financial
planner, attorney, real-estate professional, researcher, or company
representative. Credential verification should record credential type,
jurisdiction, public register or manual review source, verification date,
affiliation, and conflict disclosure.

Professionals can:

- draft a research note or source annotation;
- add a clearly labelled practitioner context note to a thread;
- respond to factual questions within their competence;
- claim an organization profile and post a response;
- receive attribution and a public contribution history.

They cannot edit Birch’s published answer, suppress criticism, buy an evidence
badge, or turn a profile into a quote funnel. Any licensed-help CTA is explicit,
optional, and points to the brokerage’s separate service surface.

### Coverage Lens: policy understanding

This is valuable, but it is Phase 2 rather than MVP. The correct promise is
“organize your policy and prepare better questions,” not “we found your gaps.”

Build order:

1. Browser-local file selection and a preflight screen explaining redaction,
   retention, and limits.
2. Client-side redaction of names, addresses, policy/claim numbers, signatures,
   account numbers, dates of birth, and health information before any network
   action.
3. OCR/extraction only after explicit consent, with the original document
   deleted by default and extracted fields shown for correction.
4. Coverage map that links each detected field to a public explanation and says
   “not found”, “unclear”, or “needs professional review” where appropriate.
5. Optional handoff to a licensed professional, with the user choosing what to
   share. No silent CRM lead creation.

The current `/lens` page correctly remains a private-preview file-selection
surface. Do not add raw document upload or OCR until storage, encryption,
deletion, access logs, vendor terms, and the exact advice boundary are approved.

### AI layer

AI should accelerate research operations, not replace the source model:

- ingest and classify source documents into structured claims;
- propose questions, aliases, examples, and source mappings for human review;
- detect stale sources, conflicting claims, and missing jurisdiction labels;
- draft answer candidates that cannot publish until every material claim resolves
  to an approved source;
- power an answer assistant that quotes or links the exact Birch record and says
  when the corpus is insufficient;
- never train reputation scores from unmoderated sentiment or infer a claim
  outcome from a story.

## 7. Growth and “source of truth” mechanics

The growth loop is a citation loop:

`question → useful answer → opened source → related question → saved/followed
topic → correction or contribution → stronger answer`

The first account prompt should be “Save this research” or “Follow this topic”,
not “Create an account to continue.” Reading remains free and open.

Distribution priorities:

- publish one canonical answer per durable question, not ten thin rewrites;
- build state and company landing pages only when the record has enough sources;
- expose claim IDs, dates, source titles, machine-readable records, and stable
  URLs so journalists, practitioners, and answer engines can cite the work;
- provide “cite this answer” and “copy source list” controls;
- link the Bollinsure specialty properties to Birch’s research pages without
  duplicating their commercial funnels;
- publish a change feed and correction feed so returning readers trust updates;
- invite professionals to improve missing context, never to manufacture
  favorable reputation.

The primary product metric is **qualified research sessions**: a session that
opens an answer, opens at least one source, and takes a useful next action. Pair
it with citation opens, return research, zero-result rate, correction latency,
accepted contribution rate, moderation time, and professional verification
quality. Do not optimize for pageviews alone.

Potential long-term funding can stay aligned with the consumer promise: paid
institutional research/API access, team workspaces, or professional review
tools with clear separation from public ranking and editorial control. Do not
sell placement inside the evidence layer.

## 8. Build sequence

### Now — visual and structural foundation

- [x] Set `birch.insure` as Research canonical origin in site config.
- [x] Reserve `commons.birch.insure` as a separate, gated discussion origin.
- [x] Keep the supplied Birch bird mark unchanged.
- [x] Add the Research / Explore / Participate mega navigation.
- [x] Add the California launch announcement and dismissible state.
- [x] Add the real-corpus Birch loop preview to the landing page.
- [x] Apply motion tokens and reduced-motion behavior to shell transitions only.
- [x] Keep the operator disclosure in the footer and trust surfaces, not the
  hero pitch.

### Next — one stable review snapshot

- [ ] Finish the California source/claim review and freeze copy, mappings,
  labels, machine records, and correction language together.
- [ ] Add the final operator/about/methodology disclosure copy after counsel or
  owner approval.
- [ ] Run the single licensed editorial review pass on that frozen snapshot.
- [ ] Add a production-safe domain migration plan from the old research origin;
  do not switch redirects until DNS, canonical tags, sitemap, and external
  links are verified on Birch.

### After the review — product depth

- [ ] Add save/follow accounts only after the read-only research flow is stable.
- [ ] Launch Commons with a real database, mailer, moderation owner, abuse
  controls, and the research/community boundary tests.
- [ ] Add professional verification and structured contribution review.
- [ ] Expand company pages and state pages from the source registry.
- [ ] Build Coverage Lens with privacy gates, redaction, deletion, and explicit
  human-review boundaries.
- [ ] Add retrieval-grounded AI assistance after the citation contract is
  enforced end to end.

## 9. Acceptance gate for the premium launch

Birch is ready for the next public review when:

- the primary domain and every canonical URL say `birch.insure`;
- the homepage has one clear CTA and no invented proof;
- every visible answer claim resolves to an open source record;
- Research, Commons, and licensed help are visibly distinct;
- hover interactions have keyboard equivalents and reduced motion removes the
  spatial effects;
- no document, account, or personal data is collected by the public Research
  surface;
- company/profile features cannot become pay-to-play reputation management;
- all California launch copy and source mappings are frozen for one reviewer;
- build, accessibility, link, citation, machine-output, and browser checks pass;
- the actual domain migration and Commons deployment are approved separately
  from the design review.
