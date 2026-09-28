# Birch North Star: the audacious product goal and the disciplined build queue

Status: active direction for the gated Birch preview. Last reviewed 2026-09-11.

## The audacious goal

Birch should become the public research and conversation layer that people reach
before they buy, renew, dispute, or explain insurance: the easiest place to
understand a coverage question, inspect the original source, compare the
jurisdiction and company context, and then hear clearly labelled experiences
from real people and professionals.

The ambitious version is not “a bigger insurance blog” and not “a chatbot that
sounds certain.” It is a durable, source-linked knowledge network for
insurance:

```text
plain-language question
        ↓
reviewed Birch record with claim-level citations
        ↓
coverage · company · state · tool context
        ↓
moderated lived experience and professional context
        ↓
private, consent-first next step for the person who wants help
```

If Birch succeeds, a reader can move through that loop in minutes without being
sold a quote, pushed into a funnel, or asked to surrender a policy document.
Another researcher, journalist, professional, or answer engine can cite the
same stable record and open the source behind it. A contributor can add useful
context without acquiring the power to rewrite a research finding. An insurer
can respond to an experience without buying placement or receiving a silent
reputation score.

The long-term product is therefore three related rooms with one trust model:

| Room | Job | Public promise | Account required |
| --- | --- | --- | --- |
| **Research** | Explain what can be supported by a source. | One answer, dated assumptions, open citations, visible corrections. | No |
| **Commons** | Hold discussion, lived experience, professional context, and replies. | Conversation is attributable and moderated, but it is not evidence by default. | Yes |
| **My Coverage** | Help a person organize their own policy questions privately. | Local-first redaction, minimum collection, explicit deletion, professional handoff by choice. | Later, with consent |

The product should feel like a calm fintech research instrument: fast, legible,
and pleasing to use, with enough social energy to make returning worthwhile but
never enough gamification to turn a claim outcome or financial risk into a game.

## Positioning

The short promise is:

> **Understand insurance. Check the source. Share what happened.**

The first CTA is **Ask Birch**. The second path is **Browse the library**. The
professional path is **Contribute context** and stays visually subordinate to
the public research task. The homepage should not open with quotes, “best
company” language, ratings, premium estimates, or an email capture wall.

The trust line that should recur wherever the rooms meet is:

> **Research explains what can be documented. Commons holds what people say.
> They are connected, not interchangeable.**

## Design North Star

The chosen aesthetic is **editorial fintech**:

- Newsreader for the large statement and direct answer;
- Schibsted Grotesk for interface, body copy, controls, and navigation;
- IBM Plex Mono for source class, dates, status, IDs, and system labels;
- warm paper and cream for reading;
- deep ink/navy for high-trust product surfaces;
- Birch cobalt blue for actions and navigation;
- restrained gold only for resolved evidence, not general decoration;
- small radii, strong alignment, broad whitespace, and deliberate borders;
- the supplied Birch bird as the only brand mark; no AI-generated logo redraw.

The connected Figma reference board is [Birch North Star — Research + Commons](https://www.figma.com/design/i45yrkrvDVS8vfnS7y9v2J).
The code remains the source of truth. The board records the approved hierarchy
for the landing page, Research desk, and Commons thread, including where motion
is allowed.

### Motion contract

Motion should explain what the system is doing, not decorate the page:

| Surface | Motion | Timing | Why |
| --- | --- | --- | --- |
| Header bird | A barely perceptible hover lift/turn. | 180–240ms | Confirms the mark is interactive without stealing attention. |
| Ask Birch loading | Bird remains legible; one blue source dot orbits the mark. | 1.6s loop | Communicates source resolution, not model “thinking.” |
| First-run/onboarding | One gentle wing lift or short flight into the shelf. | Once, 360–520ms | A welcome moment is the only place the bird can be more expressive. |
| Buttons | Small lift on hover, press into place, arrow travels 2–3px. | 120–180ms | Makes controls feel tactile and responsive. |
| Menus/disclosures | Opacity plus 4–6px vertical reveal. | 180–240ms | Establishes hierarchy and keeps the interface calm. |
| Research claims | No animated text, count-up, shimmer, or looping background. | None | Evidence must read as stable and quotable. |
| Commons replies | New-post insertion may fade/slide a few pixels. | 180ms | Makes conversation feel live without rewarding outrage. |

Every motion path must have a reduced-motion state. Do not wire the Higgsfield
loading video into the reader path: it is a visual reference and a marketing
asset, not a critical dependency or a backdrop behind a claim.

## Perplexity decision

Perplexity belongs in a server-only **research scout**, not behind the reader's
answer box. The reader-facing sequence stays deterministic:

```text
reader query → local Birch index → approved record / insufficient / no result
```

When the library cannot answer, the product should say so and offer the closest
related records. Behind the scenes, an authenticated editor or scheduled job
can create a deduplicated research brief. Only that brief may go to Perplexity:

```text
gap detected
  → privacy screen
  → normalize topic, jurisdiction, and as-of date
  → deduplicate against existing/open briefs
  → Perplexity Search API candidate retrieval
  → verify URLs and source class
  → map claims to sources
  → named human review
  → publish one Birch record
```

The first live endpoint should return a `jobId` and later a candidate packet.
It should not return a fresh answer to a visitor. The current preview contains
the provider-neutral packet contract, reviewer console, and the first
server-only request/normalization boundary in `src/lib/research-provider.ts`.
No live provider key or endpoint is enabled in the static preview.

Perplexity's current Search API is a good fit for ranked raw results, domain
filters, country filters, and controlled content budgets. Structured output can
help type a draft, but URLs must come from the provider's actual result objects,
not from model-generated text. See the [Perplexity Search API documentation](https://docs.perplexity.ai/docs/search/quickstart)
and its [structured output guidance](https://docs.perplexity.ai/docs/cookbook/articles/structured-output-extraction/README).

## Coverage Lens: the right future feature

Policy upload can be high-value, but it should not be the first public growth
loop. It creates a much higher privacy and liability surface than a research
question. The right first version is a **local-first policy lens**:

1. the person selects one file or image locally;
2. the UI explains what the tool can and cannot do;
3. a local heuristic identifies likely fields, with uncertainty shown;
4. a raw/redacted preview appears side by side;
5. the person edits or deletes every candidate field;
6. the tool retains only an approved, minimum context—or nothing;
7. the output is education and questions for a qualified professional, never a
   coverage determination, denial prediction, or “you are underinsured” score;
8. expiry and deletion are visible before any optional server step.

The MVP must refuse or discard Social Security numbers, payment details,
health information, claim identifiers, names of other people, addresses, and
unnecessary policy identifiers. Redaction is a guardrail, not a promise that a
document is safe. A future server path needs encryption, retention windows,
provider contracts, access logs, deletion, and a threat model before launch.

## Company pages

Every company page should use the same five-panel address:

1. **Identity** — legal name, official domain, regulator record, jurisdiction,
   and last checked date.
2. **What Birch can document** — public filings, regulator records, coverage
   material, and dated company material with claim-level citations.
3. **Current context** — changed or superseded records, official channels, and
   clearly labelled availability information. No unsupported “appetite” claim.
4. **What people report** — Commons threads, case reports, replies, and
   contributor status in their own lane; never merged into Research evidence.
5. **Response and correction history** — company replies, correction requests,
   moderation decisions, and source changes with a durable audit trail.

Brand enrichment may add a verified logo, official domain, and public identity
metadata after the organization match is confirmed. Statistics must retain
publisher, date, definition, denominator, and scope. Brand data and counts are
not a Birch reputation score. Star ratings are intentionally deferred until a
dimension, denominator, time window, moderation policy, right of reply, and
legal review exist.

## Entity recommendation

Do not convert the current operator into a nonprofit as a design or marketing
move. Keep Birch as a separately named product with a published editorial
charter, conflict disclosure, privacy and terms pages, corrections policy, and
visible disclosure that it is operated by WJB Services, Inc. dba Bollinsure
Insurance Services.

Counsel can later evaluate a public-benefit corporation, nonprofit, or a
separate independent entity if governance, funding, board independence, tax
status, and editorial control justify it. A nonprofit label without those
controls would not make a source more neutral. In the near term, the durable
trust asset is the visible source trail, named review, correction history, and
separation between research and licensed service.

## Twenty-pass queue

This is the order of work. A pass is complete only when its UI, data contract,
privacy posture, accessibility behavior, and validation are all accounted for.

| Pass | Deliverable | Status / gate |
| ---: | --- | --- |
| 01 | Freeze Birch brand tokens, exact bird assets, type system, and origin config. | Complete; preview remains gated. |
| 02 | Simplify homepage to one promise, one primary Ask action, one browse path, and one trust line. | In refinement; the current hero already has the core shape. |
| 03 | Make header navigation, mobile menu, focus states, and CTA hover/press behavior consistent. | Complete foundation; continue visual QA. |
| 04 | Keep `/ask` deterministic and local; expose `ok`, `insufficient`, `no-result`, and offline states. | Complete. |
| 05 | Wire exact-logo research loading state with reduced-motion fallback. | Complete. |
| 06 | Build Research desk reviewer console around `ResearchPacket`. | Complete as a noindex specimen. |
| 07 | Add the server-only Perplexity scout adapter and typed candidate normalization. | Current pass; no key or live route enabled. |
| 08 | Add brief deduplication, privacy screening, domain/source policies, and job audit fields. | Next implementation slice. |
| 09 | Approve one candidate packet and publish it through the corpus/export pipeline. | Blocked on server runtime + named reviewer. |
| 10 | Add claim-level copy citation, source locator, and current/stale/superseded states to all records. | Next after packet publication. |
| 11 | Make `/explore` the intent-first front door for thousands of topics without a taxonomy wall. | Planned; preserve search-first simplicity. |
| 12 | Extend one shared shell across question, coverage, state, company, source, and tool pages. | Partially complete; audit route-by-route. |
| 13 | Complete company dossier samples with official identity, context lanes, and response history. | Foundation complete; more records require source reading. |
| 14 | Turn Commons preview into the authoritative thread/reply/report/moderation specification. | Preview exists; backend gate remains closed. |
| 15 | Implement magic-link account creation only for Commons, with generic confirmation and deletion controls. | Blocked on auth/mail/storage owner. |
| 16 | Implement professional verification as a role badge, not a truth badge; disclose affiliation/conflicts. | Blocked on regulator lookup and moderation owner. |
| 17 | Add the local-first Coverage Lens with raw/redacted preview and no server upload. | Preview foundation exists; file processing remains disabled. |
| 18 | Add optional server policy review only after threat model, consent, retention, encryption, and deletion. | Deliberately deferred. |
| 19 | Add earned distribution: dataset releases, citation cards, RSS/change feed, and useful original tables. | Architecture exists; publish only approved records. |
| 20 | Run launch gate: citation integrity, accessibility, performance, security, privacy, content review, and production gate. | Required before any public indexing or Commons opening. |

## Success measures

Measure whether Birch is useful and trustworthy, not whether it produces the
most pages or the most emotional engagement:

- percentage of published claims with an open, verified source;
- source-open rate from a claim and time to first useful record;
- correction quality and median correction response time;
- percentage of pages with a current review state and visible as-of date;
- successful navigation from question to coverage, company, state, source, and
  next tool;
- Commons report resolution time, deletion completion, and right-of-reply use;
- professional contributions that retain clear identity and conflict context;
- policy-lens redaction acceptance and deletion completion, never document
   volume alone;
- citation reuse and earned references from organizations that genuinely use the
  material.

Do not optimize for raw user posts, page count, time-on-page, star ratings,
automated backlink volume, or AI answer count. Those measures would pull Birch
away from the source-of-truth position.

## Current boundary

The preview remains Vercel-gated and noindex. There is no public signup, no
live Commons, no durable policy upload, no provider key in browser code, and no
production promotion in this pass. This is intentional: the next meaningful
dependency is a server-only research job with storage, reviewer ownership, and
privacy controls—not a louder homepage or an unreviewed chatbot.

## Live estate audit: 2026-09-11

The repository audit is green, but the network audit of the currently served
estate is not. That distinction matters: local build integrity cannot prove
that nine separately deployed properties point at the same canonical graph.
`npm run audit:estate` reached all nine hosts and found:

- `www.birch.insure` is the host that answers, while the live Birch page
  canonicalizes to `bestinsuranceresearch.com` and `robots.txt` advertises the
  old host's sitemap. This is the highest-priority launch defect because it
  splits the primary brand's canonical vote.
- The eight retained specialty sites do not link back to `birch.insure`, so the
  estate is currently a collection of islands rather than a research graph.
- `bestearthquakeinsurance.com`, `bestepli.com`,
  `bestcyberliability.com`, `bestworkerscompensation.com`,
  `bestgroupmedical.com`, and `bestartinsurance.com` do not return a CSP
  header. The main repo already declares a CSP in `vercel.json`; each retained
  property needs the same security-header contract or an explicitly reviewed
  exception.

This is an external deployment configuration queue, not a reason to mutate the
content corpus or redirect live specialty properties immediately. Before any
production promotion, choose one canonical Birch host, bind both apex and
`www` deliberately, set `PUBLIC_SITE_ORIGIN` to that host in the production
environment, regenerate the sitemap and canonical tags, add reciprocal hub
links to retained properties, and re-run the estate audit until it passes. Do
not redirect a live specialty property merely to make the graph look complete;
export its indexed URLs and make a per-URL decision first.

The Vercel CLI also confirmed that the inspected `bestinsuranceresearch`
deployment is a ready **preview** deployment, not production. No deployment,
domain, environment variable, or redirect was changed during this pass.
