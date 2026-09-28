# Birch — 20-pass product-readiness roadmap

Decision record: 10 September 2026

This is the next execution sequence for Birch Research and the future Birch
Commons. It turns `BIRCH-END-TO-END-PLAN.md`, `COMMONS.md`, `LAUNCH-GATE.md`,
and the current Figma/Mobbin audit into one ordered set of passes. The order is
deliberate: trust, reviewability, and operational safety come before growth
mechanics, private policy workflows, or open community activity.

This is a target schedule, not permission to bypass a blocked gate. A pass that
needs a licensed reviewer, a production database, a live origin, or a primary
source stays blocked until that dependency is genuinely available.

## Product lock

Birch is one brand with two clearly separated rooms:

- **Birch Research** at `birch.insure`: free, accountless, citable research,
  source records, tools, current changes, and machine-readable releases.
- **Birch Commons** at `commons.birch.insure`: authenticated, moderated,
  attributed experiences, practitioner notes, organization responses, and
  discussions. It never edits or becomes evidence for Research.

The product loop is:

`Question → cited answer → source → next question → attributed context → moderation → stable record`

The launch promise is intentionally narrower than “the Wikipedia of insurance”:

> **Birch is the clearest place to understand an insurance question, inspect
> the source, and add context without turning an experience into a verdict.**

The following never ships in Research, and never appears as a hidden growth
mechanic in Commons: ratings, rankings, paid placement, premium or quote
claims, claim-payment conclusions, coverage determinations, eligibility
verdicts, appetite verdicts, risk scores, or fabricated community activity.

## Schedule at a glance

| Window | Passes | Gate | Outcome |
| --- | --- | --- | --- |
| 10–12 Sep 2026 | 01–04 | One reviewable snapshot | The team can inspect the product once, with clear boundaries and no invented proof. |
| 13–16 Sep 2026 | 05–08 | Research depth | The citable core has a stronger discovery, citation, company, and change surface. |
| 17–23 Sep 2026 | 09–13 | Commons operational readiness | Accounts, storage, verification, moderation, and abuse controls are proven in staging. |
| 24–30 Sep 2026 | 14–17 | Cross-layer usefulness | Research and Commons can connect without contaminating the evidence model. |
| 1–7 Oct 2026 | 18–20 | Assisted and public readiness | Grounded assistance, legal/operational sign-off, and production launch are separately cleared. |

Dates are planning windows only. A blocked pass moves; it does not get replaced
with a weaker shortcut.

## Passes 01–04 — reviewable foundation

### 01 — Readiness ledger and review contract

**Status: in progress / started 10 September 2026.**

Create one readiness ledger, record the chosen landing and Commons direction,
and make the internal specimen easy to review. The protected preview must show
the actual product boundary: Research first, typed context second, gated
publishing third.

Deliverables:

- this 20-pass roadmap;
- a noindex Commons product specimen with rooms, typed threads, gated composer,
  context rail, and `Read → Discuss → Verify → Review` protocol;
- links from contribution and professional surfaces into that specimen;
- a reviewer checklist covering copy, interaction states, privacy, source
  provenance, and no-fabricated-activity rules;
- the newest protected preview URL recorded outside the public navigation.

Ship gate: build, accessibility, citation, internal-link, noindex, and
protected-preview checks pass. No account, post, upload, rating, or live
community data is enabled.

### 02 — Performance, accessibility, and motion budget

Audit representative Research, tool, company, professional, contribution, and
Commons-specimen pages at desktop and mobile widths. Preserve self-hosted
fonts, static-first rendering, and the exact bird asset. Measure and record LCP,
CLS, total blocking time, heading order, form labels, keyboard focus, reduced
motion, and tap targets.

Deliverables:

- a small performance budget checked in as a test or audit script;
- no new third-party script or animation near the LCP element;
- keyboard equivalents for hover, menu, disclosure, and focus states;
- reduced-motion behavior that removes spatial movement rather than merely
  shortening it;
- a contained mobile Commons menu with 44px navigation targets and no
  horizontal overflow;
- a no-store Commons `/healthz` liveness route that checks the backing store
  and production mail configuration without exposing secrets;
- explicit empty, disabled, error, and success states for every public form.

Ship gate: representative mobile LCP target under 2.5 seconds, CLS under 0.1,
no accessibility blocker, and no motion behind a research claim.

### 03 — California launch snapshot and content lock

Freeze the California launch desk, its source mappings, page labels, related
questions, machine records, and current-change copy as one snapshot. Re-read
every source needed for a changed claim; never write from a search snippet.

Deliverables:

- source-to-claim inventory for wildfire, earthquake, FAIR Plan, auto, and
  workers compensation entry points;
- explicit stale, superseded, rescinded, and not-adopted labels;
- one reproducible snapshot manifest with checksum and review state;
- unresolved evidence questions recorded rather than filled with prose.

Ship gate: no new claim lacks a read source, every citation resolves, and all
pages remain `under-review` until the licensed reviewer signs them off.

### 04 — One-review packet

Package the review surface so content, design, and product boundaries can be
reviewed in one pass. The packet points to the chosen Figma frames, direct
Mobbin pattern references, the protected preview, and the decision log.

Deliverables:

- landing, Ask, answer/source ledger, company dossier, contribution/review,
  signup, Commons, and future Coverage Lens state maps;
- copy lock with primary/secondary/quiet CTA hierarchy;
- exact favicon and typography/palette reference;
- reviewer decision fields: approve, revise, blocked, or not applicable;
- one issue list that distinguishes content corrections from design changes.

Ship gate: one reviewer can answer “what is this, what can I trust, and what
happens next?” without opening a second planning system.

## Passes 05–08 — research depth and discovery

### 05 — Research discovery and empty states

Strengthen `/ask`, `/questions`, `/insurance`, `/sources`, `/states`, and
`/tools` around one discovery grammar: visible result type, jurisdiction,
review state, freshness, and a next useful route. Make zero-result and
insufficient-evidence states helpful without guessing.

Ship gate: exact-title retrieval works, off-topic queries refuse, filters
actually narrow results, and every empty state offers a truthful next action.

### 06 — Citation portability pass

Add a calm “Cite this answer” block to representative Research records. It
should offer the canonical URL, claim identifiers, source list, accessed and
review dates, and a copyable citation without collecting an account or
tracking free text.

Ship gate: copied citations resolve to stable pages and the machine companion;
no `Review`, `Rating`, `Offer`, `FAQPage`, or unsupported authority schema is
introduced.

### 07 — Change, correction, and source-history pass

Make `/changed`, `/corrections`, source records, and RSS feel like one coherent
history surface. Show what changed, why it changed, what source supports it,
and whether the old wording remains available as a historical record.

Ship gate: every recorded change comes from a real record delta; corrections
leave an auditable trail; no current event is implied without a source.

### 08 — Company and regulator page trust shell

Refine company pages into three visibly separated bands: documented identity and
official records; community accounts; official responses. Add empty states for
unavailable or unverified information instead of placeholder reputation data.

Ship gate: no carrier ranking, sentiment score, complaint rate, “best” claim,
or fabricated response appears. New carrier facts remain blocked when primary
regulator access is unavailable.

## Passes 09–13 — Commons operational readiness

These passes apply to the separate Commons application. The Research origin
does not gain accounts, uploads, or a post composer as a side effect.

### 09 — Production-store proof

Run the existing Commons account, thread, report, moderation, withdrawal, and
professional-verification flows against the production-shaped Postgres adapter
in a staging environment. Add migrations, seed only non-public test fixtures,
and prove rollback/deletion behavior.

The code now exposes `/healthz` for this gate. It is a liveness check, not a
substitute for the staging smoke test: it confirms Postgres reachability and
production mail configuration, but it does not send mail, check DNS, or prove
moderation readiness.

Ship gate: `COMMONS_DATABASE_URL`, mailer, moderator list, and origin are present
in staging; the conformance suite passes; no in-memory fallback is reachable in
production posture.

### 10 — Auth, sessions, and abuse limits

Harden magic-link signup, session rotation, same-origin checks, honeypot, rate
limits, block/report controls, account deletion, and mailer failure states.
Keep signup optional for reading and ask for an account only for saving,
following, posting, reporting, or entering Commons.

Ship gate: replayed links, expired links, excessive requests, malformed posts,
and unauthorized moderator actions all fail safely and are observable without
logging sensitive content.

### 11 — Structured experience and thread pipeline

Make the experience flow easy to complete and hard to misread. Ask what
happened, when, where, what document or process mattered, who decided, and what
cannot be generalized. Keep the originating thread as context, not evidence.

Ship gate: drafts are private, moderation precedes publication, published
records have stable URLs and labels, and withdrawal/hide actions leave
tombstones with no deleted-history illusion.

### 12 — Professional verification and conflict disclosure

Finish role, jurisdiction, credential, authority/register, checked date,
expiry/recheck, affiliation, compensation, and conflict states. Show
“self-described”, “verification pending”, “verified”, and “expired/unresolved”
as distinct states.

Ship gate: a badge means only that the stated credential was checked against a
named authority. It never implies that a professional’s post is Birch’s answer
or creates a carrier endorsement.

### 13 — Moderation operations and audit log

Build the moderator work surface for privacy, threats, personal data,
defamation, solicitation, unsupported verdicts, regulated advice, source
quality, and organization impersonation. Give each action an immutable reason,
actor, timestamp, affected content id, and author-visible outcome.

Ship gate: every public post has a moderation state; reports are triaged; an
organization cannot delete a user account; a moderator cannot silently rewrite
published text.

## Passes 14–17 — cross-layer usefulness

### 14 — Gated Research ↔ Commons subject links

After Commons has real content and a live origin, add subject-level links from
Research to the number and type of community accounts. Never present those
accounts as source evidence, rankings, or outcomes. Keep the link absent while
the destination is unresolved.

Ship gate: `PUBLIC_COMMONS_READY=true` only when deployment, database, mailer,
moderator, smoke tests, DNS/SSL, and no-dead-link checks all pass.

### 15 — Organization response lane

Add claimable organization profiles, domain verification, authorized
representatives, official response labels, and response history. A response can
add context or correct an official fact; it cannot suppress a user experience
or change a Research record.

Ship gate: official response, user account, professional note, and editorial
research render as separate types with separate permissions and provenance.

### 16 — Your Coverage privacy architecture

Design the private Coverage Lens flow without turning Birch into a document
repository. Start with local preflight and redaction explanations. Only after
legal, vendor, security, retention, and deletion review should client-side
redaction, optional extraction, or a minimal coverage attestation be enabled.

Ship gate: no public policy detail, policy/claim number, address, date of birth,
health data, signature, or identifiable document reaches the Research corpus or
Commons feed. Birch says “not found”, “unclear”, or “needs professional review”
instead of declaring a gap or giving individualized advice.

### 17 — Distribution and citation measurement

Add controlled, privacy-safe measurement for qualified research sessions, source
opens, citation copies, zero-result rate, correction latency, accepted
contribution rate, moderation time, and professional verification quality.
Document Search Console and machine-output review procedures.

Ship gate: no event contains free text, document content, policy details, or
uncontrolled identifiers; the product remains useful without analytics.

## Passes 18–20 — grounded assistance and launch

### 18 — Grounded Birch assistant

Add an assistant only over approved Research records and their source ledger.
Every answer must link to the exact record and source used, identify
jurisdiction and freshness, and refuse when the corpus is insufficient. A
community account is summarized as an attributed account, never as a rule.

Ship gate: no unsupported answer, personalized coverage determination, claim
verdict, premium, ranking, or hidden lead creation can be emitted.

### 19 — Final readiness and counsel packet

Run the one final product/content/design review against the frozen snapshot.
Confirm operator disclosure, licensing language, privacy behavior, terms,
community rules, moderation escalation, vendor terms, accessibility, security
headers, backups, deletion, incident response, and support ownership.

Ship gate: licensed research review is complete for the intended launch set;
Commons operations are staffed; domain and environment values are explicit; no
unresolved blocker is relabeled as a design preference.

### 20 — Production launch and post-launch observation

Promote only the explicitly named deployment after the origin, canonical tags,
robots, sitemap, redirects, SSL, security headers, analytics posture, and live
smoke checks are confirmed. Keep Birch Research and Commons launches separate.

First 30-day observation:

- qualified research sessions and source-open rate;
- unanswered-question rate and correction latency;
- moderation queue age and withdrawal requests;
- page performance and accessibility regressions;
- citations or links from independent researchers and answer engines;
- no evidence that a company, professional, or paid partner is influencing
  placement or moderation.

Ship gate: public launch is reversible, monitored, and does not require
silently enabling a feature that failed a previous gate.

## Current execution state

- **Pass 01:** started in the Research branch with the protected Commons
  specimen, contribution/professional handoffs, and this roadmap.
- **Pass 02:** next after the roadmap commit; the Astro dev launcher is blocked
  by the local sandbox's `nice(5)` permission, so browser checks currently use
  the built static output and the hosted protected preview. This is an
  environment limitation, not a product pass.
- **Passes 03–08:** can proceed in the Research repository without Commons
  credentials, but content changes remain subject to source reading and
  licensed review boundaries.
- **Passes 09–13:** require staging Postgres, Resend, a moderator owner, and
  secret values managed outside the repository.
- **Passes 14–15:** require a deployed Commons origin and real moderated
  content; they remain gated by `PUBLIC_COMMONS_READY`.
- **Pass 16:** requires an explicit privacy/security/vendor decision before any
  document or policy integration is built.
- **Pass 20:** never runs as a blind `--prod` action from this branch.

## Completion standard

The 20 passes are complete only when a reader can understand insurance for free,
inspect the exact source, contribute context without losing privacy, distinguish
experience from evidence, and see a clear path to a qualified human without
mistaking Birch for an insurer, regulator, ranking service, or personalized
advice engine.
