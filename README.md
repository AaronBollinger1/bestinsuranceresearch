# Birch Research

Birch is a free insurance research and community estate. The Research room
publishes answers, coverage context, figures, tools, and the sources behind
them. The separate Commons room at `birch.insure` is for moderated discussion,
case reports, and practitioner notes when verification is available.

The product is operated by WJB Services, Inc. dba Bollinsure Insurance Services,
a California insurance brokerage. That relationship is disclosed on the
Research property; the Commons deliberately carries no agency branding.

> Understand the policy. Check the source. Share what happened.

## Run it

```sh
npm ci
npm run dev          # local Research development server
npm run validate     # check + build + verify
npm run preview      # serve the Research build at http://localhost:4321
cd commons && npm ci
npm run validate     # Commons check + build + verification
```

The latest preview branch is the integration candidate. Production promotion is
intentionally separate from validation and should only happen after the content
review gate is complete.

## What is here

**Research** is a static, citable evidence layer with 299 source records, 85
canonical questions, 27 substantive coverage lines, 19 figures, 10 live
modules, 272 deterministic rules, and a frozen claim dataset. `/ask` is a
browser-local lexical lookup over the published corpus. It is not a generative
chatbot and it does not send the question anywhere.

**Commons** is a separate Astro application. It includes passwordless magic-link
sign-in, Postgres-compatible storage, structured case-report intake,
moderation, withdrawal, and subject-attached discussion threads. Posts are not
citations, and no person or staff member publishes a view on whether a claim
should have been paid.

## Validation

The root suite checks real build output: routes, canonical URLs, indexing
posture, JSON-LD, citation resolution, internal links, machine-readable records,
privacy, accessibility, retrieval behavior, rule reachability, and the content
boundary. The production posture also runs the on-page audit.

The Commons suite checks its own routes, brand boundary, authentication,
intake, moderation, and thread behavior. A Postgres integration run is still a
launch requirement; local validation skips it when `COMMONS_DATABASE_URL` is
not supplied.

## Configuration

| Variable | Purpose |
| --- | --- |
| `PUBLIC_SITE_ENV` | `preview` by default or `production`; controls indexing and analytics |
| `PUBLIC_SITE_ORIGIN` | Research canonical origin |
| `PUBLIC_COMMONS_ORIGIN` | Commons canonical origin, default `https://birch.insure` |
| `PUBLIC_COMMONS_READY` | Set to `true` only after the separate Commons deployment, database, mailer, and moderation gate are live; defaults to `false` |
| `PUBLIC_BOLLINSURE_ORIGIN` | Optional licensed-help handoff destination |
| `PUBLIC_BUILD_DATE` | Optional reproducible build date |
| `PUBLIC_GTM_ID` | Optional production-only analytics container |

Commons additionally uses `PUBLIC_RECORD_ORIGIN`, `COMMONS_DATABASE_URL`,
`RESEND_API_KEY`, `COMMONS_MAIL_FROM`, and `COMMONS_MODERATORS` in a deployed
environment. See `commons/src/config/commons.ts` and `HANDOFF.md`.

## Content and review

Content should be finalized before the licensed review pass. The reviewer should
receive one stable snapshot of copy, source mappings, labels, boundary language,
and machine-readable records. No page should be called reviewed until that
single pass is complete.

## Boundaries

- No rating, ranking, premium, price, appetite, eligibility, or risk-score claims.
- No coverage determination, claims advice, legal, tax, medical, lending, or investment advice.
- No policy or claim numbers, government identifiers, health information, payment data, or document uploads.
- Licensed help is optional and separate from the free research experience.
- BestAMS, CovWell, and the private brokerage systems are out of scope.

## Direction records

- `BIRCH.md` — rebrand boundary and two-origin product decision.
- `BIRCH-REBRAND-OPTIONS.md` — the current rebrand choice and the future migration option.
- `BRAND-SYSTEM.md` — current mark, type, color, surface, and motion rules.
- `DESIGN-REFERENCES.md` — Mobbin/Figma-informed interaction references and rejected patterns.
- `LAUNCH-GATE.md` — what must be true before production.
- `HANDOFF.md` — current implementation state and next work sequence.
