# Birch foundation pass — 11 September 2026

This is the implementation brief for the current Birch landing, account, and
conversation pass. It records what was audited, what is now intentional, and
what still belongs in the queue. It is a product decision log, not generated
marketing copy and not a claim that any future service is already live.

## The decision

Birch has one simple public promise:

> Find the answer. Keep the source.

The first action is always `Ask Birch`. Reading stays free and accountless. A
person only sees the one-field, passwordless account flow when they want to
post, reply, save a private shelf, or contribute. This preserves the value of
the Research record while making participation feel as easy as the product
promise.

The product has two visibly different rooms:

- **Birch Research**: the source-backed record. Answers, coverage, company
  identity, jurisdiction, source registry, corrections, and free tools.
- **Birch Commons**: the attributed and moderated conversation room. Questions,
  first-person accounts, practitioner notes, company responses, and threads.

Commons is never silently mixed into a Research answer. A thread can be
invited into a structured case report, but publication is a separate editorial
step with its own label, review, and permanent address.

## What changed in this pass

### Landing

- The Birch mark remains the supplied `birch-bird-transparent.png`; generated
  media is not used to redraw or replace the logo.
- The first viewport now has one dominant interaction: the local, source-backed
  question form. Browse coverage and read the question library remain the only
  secondary exits.
- The hero visual is a CSS-native flock of the real Birch mark converging into
  a directional path. It is tiny, fast, deterministic, and removed by the
  existing reduced-motion contract.
- The product-room preview is now an actual keyboard-operable lane switcher.
  It defaults to all lanes, then lets a visitor focus Research, company
  context, or Commons without pretending to be a live dashboard.
- The account panel says the useful truth directly: read without an account;
  post with one email link. Its CTA resolves to Commons when the readiness flag
  is on and to the private design preview while Commons is gated.

### Signup and contribution

- The account model remains magic-link only. There is no password, separate
  registration form, newsletter consent, or account wall for reading.
- The sign-in screen now shows a three-step progress cue: enter email, open
  the single-use link, post with context. This makes the “signup” feel like a
  continuation rather than a new product.
- The Commons thread index now has a real title/subject search, an explicit
  conversation-room action panel, and a clear `Join to post` path.
- The new-thread screen now explains the three lanes—question, experience,
  source note—before the form. The server-side subject, title, body, and
  verdict prohibition rules remain the authority.
- A thread reply now has a live character count and a clear research-record
  handoff. It still never becomes a citation merely because it has replies.

## Optimal posting model

The posting flow should stay a short sequence with one decision per screen:

1. **Choose a lane** — question, first-person experience, professional note,
   source correction, or company response.
2. **Attach a subject** — an existing company, coverage line, question, state,
   or source. Never create an unattached orphan post.
3. **Write the smallest useful unit** — title, what happened/what is unclear,
   date and state if relevant, and what is firsthand versus inferred.
4. **Add context** — link to a public source, describe the document type, or
   disclose a professional role. Private policy identifiers remain forbidden.
5. **Preview the labels** — `contributed account`, `practitioner note`,
   `carrier-authored`, `public record`, `composite`, or `hypothetical`.
6. **Submit** — a thread is visible as conversation; a report enters
   moderation. No opaque “AI confidence” score, star rating, popularity score,
   or reputation verdict.

The index should sort by recent activity only after the subject filter and
search have done their work. Future ranking can use helpfulness signals, but
not a score that implies that one carrier or one person is objectively good or
bad. Company pages should show a timeline of sourced records and attributed
experiences, not a single blended rating.

## Motion direction

Production decision: use CSS-native motion for the critical path and reserve
Higgsfield for concept review, launch film, social cutdowns, and optional
below-the-fold media. A video background would increase LCP, complicate
reduced-motion behavior, and make the brand mark less controllable.

The current motion budget is:

- **Load**: flock convergence, 900–1300ms, one shot; no blocking media.
- **Hover/focus**: 120–240ms; translate, underline, color, and arrow travel
  only.
- **Posting**: no surprise confetti or looping animation; use state changes,
  labels, and the live character count as feedback.
- **Scroll**: later, add one-shot below-fold reveal for sections only, gated by
  `prefers-reduced-motion` and never applied to cited sentences or forms.
- **Higgsfield**: concept media must carry a `concept-only` label until a human
  selects a cut, verifies performance, and confirms that it does not imply a
  factual insurance outcome.

### Higgsfield concept set

Model selected from the connected catalog: **Seedance 2.5** (`seedance_2_5`),
5 seconds, 720p, 16:9, silent. Three final clips were submitted on 11 September
2026 for 97.5 credits total:

| index | direction | job id | production use |
| --- | --- | --- | --- |
| 1 | flock converges into a rightward path | `45cb40ca-978a-4bc2-acff-ca5e60549d28` | strongest candidate for campaign/hero study |
| 2 | line-drawn nest resolves around a bird | `93afcf7a-dbca-4c4b-9339-7cf1a5a0f576` | warmer illustration alternative |
| 3 | source sheets and nodes resolve to one path | `dc133f91-a355-43a5-be97-dc4b8456f0f5` | research/product narrative |

These prompts deliberately request abstract bird-inspired forms without
asking the model to reproduce the actual logo or typeset text. The supplied
logo stays in the interface; the clips are references for movement and
composition. An earlier bird-and-source-card variant was rejected by the
provider safety filter (`ce5365b7-5605-4d63-8c2b-56b30a5d1ed5`) and is not part
of the selected set.

## End-to-end product spine

```text
Landing
  └─ Ask Birch (no account)
       └─ Answer page
            ├─ claim → exact source / date / checksum
            ├─ related question → another answer
            ├─ company / coverage / state → context page
            └─ discuss context → Commons subject room

Commons
  └─ search/filter subject
       └─ thread
            ├─ reply (magic link)
            ├─ withdraw own post / moderator tombstone
            └─ invite to case report
                 └─ contributor completes and submits
                      └─ moderation → labelled permanent report
```

The most important future feature is not a chatbot. It is a durable answer
pipeline: one question gets one canonical answer, source records get dated
and rechecked, disagreement is represented, and a later query resolves to the
same address rather than creating a slightly different AI paragraph every
time.

## Research ingestion policy

Perplexity or another search provider may be used as a research scout, never
as the publisher. The safe sequence is:

1. capture the user question without sending private facts;
2. search official regulators, statutes, court opinions, carrier forms, and
   primary public records first;
3. store the candidate URLs, retrieval date, and why each source is relevant;
4. draft a proposed answer with claim-level source IDs;
5. reject unsupported claims and label disagreement or changing law;
6. require human review before the answer enters the citable Research corpus;
7. publish a `changed` record and machine-readable JSON only after review.

If a question is not supported, Birch should say so and offer a “research
request” that creates a review item. It must not silently turn a private query
into a public post or auto-publish an answer just because a search result was
found.

## Policy/document understanding

The Coverage Lens is the right future high-value tool, but it should be staged:

- first release: local-only file selection, redaction preview, and an explicit
  “nothing has been uploaded” state;
- second release: isolated upload to a short-lived processing boundary, with
  identifiers removed before any model sees extracted text;
- third release: structured fields with page citations, confidence labels,
  user corrections, and a licensed-professional review option;
- never: a hidden policy database, underwriting decision, claim prediction, or
  automatic legal/coverage advice.

The UI should ask what the person wants to understand—not request a full
policy by default. The default output is a checklist of questions to ask a
licensed professional, not a recommendation to buy, cancel, or claim.

## The next 20 deliberate passes

1. Test the new landing lane switcher at 375px, 768px, and 1440px.
2. Add a real Commons return target to magic-link requests using a strict
   same-origin relative-path allowlist.
3. Run a first-visit signup smoke test with the production mail provider in a
   private environment.
4. Add draft persistence only after an account is authenticated; keep the
   current local contribution preview local.
5. Add the company-page discussion summary: sourced record, open threads,
   attributed reports, official response lane.
6. Add company logo ingestion through a reviewed Brandfetch adapter; cache and
   label the source, never scrape on page render.
7. Add `sort=recent` and `sort=unanswered` to Commons once there are enough
   real threads to justify both views.
8. Add a reply “what kind of context is this?” label before publication.
9. Add moderation queue filters for label, subject, age, and unresolved flags.
10. Add report diff pages and a public correction timeline.
11. Add structured professional profile fields, license jurisdiction, and
   conflict disclosure without presenting verification as endorsement.
12. Add company-response invitations with deadlines and a visible
   “response not received” state.
13. Add a source-request queue for unanswered questions; no auto-publish.
14. Add a Perplexity/primary-source evidence adapter behind a server-only key
   and durable review jobs.
15. Add page-level JSON-LD and JSON endpoints for every approved company,
   coverage, question, source, and report.
16. Add sitemap and internal-link checks for every company ↔ coverage ↔ thread
   path before opening indexing.
17. Add a safe citation export: page title, publisher, date, URL, retrieved
   date, and exact claim address.
18. Add the redacted policy-understanding prototype in a separate security
   boundary; do not connect it to public Commons.
19. Select one Higgsfield concept for a non-critical launch cut only after
   human review, compression, poster-frame, and reduced-motion fallback.
20. Promote Research and Commons independently only when their own database,
   mail, moderation, privacy, smoke-test, and indexing gates are green.

## Release gates

The current implementation still follows the existing gates:

- Research can be built and validated as a static, no-account corpus.
- Commons remains separately deployable and noindex until its runtime, mail,
  moderation owner, and smoke tests are confirmed.
- Vercel preview protection remains the review gate; production promotion is a
  separate action and is not implied by a green local build.
- The final logo, colors, fonts, and claim-level citation rules remain the
  authority over generated concept media.

The next meaningful review is not “do we like the animation?” It is whether a
new visitor can answer three questions in five seconds: what Birch is, what to
click, and why the answer is trustworthy. This pass makes the interface point
there.
