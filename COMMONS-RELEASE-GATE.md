# Birch Commons release gate

Status: staging contract only. This document does not authorize a public launch,
enable a new Vercel project, or make the Commons a Research citation source.

Birch has two different jobs. Research at `birch.insure` is the sourced record;
Commons at `commons.birch.insure` is the attributed conversation. The release
gate keeps a named, reviewable Commons deployment from becoming an indexable
public forum before its operational and moderation dependencies exist.

## Release modes

| Mode | `PUBLIC_COMMONS_READY` | Store and mail | Crawlers | What reviewers may do |
| --- | --- | --- | --- | --- |
| Local Preview | `false` | In-memory store and console mailer | `noindex`; `Disallow: /`; no sitemap URLs | Exercise the UI and tests with disposable accounts |
| Private staging | `false` | Real Postgres and Resend test configuration | `noindex`; `Disallow: /`; no sitemap URLs | Run the full smoke test with a non-production mailbox |
| Public release | `true` | Real Postgres and Resend production configuration | Public pages may index; session and moderation routes stay out of the sitemap | Publish only after every gate below is signed off |

The flag is consumed independently by Commons and Research. Commons must be
ready first. Research must keep its own flag false until the Commons origin,
moderation owner, and smoke test have passed.

## Required gates

### 1. Infrastructure

- Create a separate Vercel project rooted at `commons`.
- Apply `commons/schema.sql` to a managed Postgres database.
- Configure TLS, backups, access control, and a tested restore path at the
  database provider.
- Verify the sending domain in Resend and configure `COMMONS_MAIL_FROM`.
- Configure `COMMONS_MODERATORS` with at least one real reviewer mailbox.
- Keep the public origins exactly `https://commons.birch.insure` and
  `https://birch.insure` in the production environment.
- Run `npm run preflight:production`. It checks shape and origin; it does not
  prove reachability, DNS, provider deletion, or moderation quality.

### 2. Application smoke test

Use a disposable test account and a non-production moderator mailbox. Record
the date, environment, build commit, and outcome without recording message
tokens or private contribution text.

- Request a magic link, consume it once, and prove replay is rejected.
- Confirm an expired link is spent and cannot be reused.
- Create a session, change a display name, sign out, and prove the session is
  gone.
- Submit a case report, verify it stays private, and exercise approve,
  needs-more, decline, and author withdrawal.
- Start a thread, reply, withdraw the author's own post, and confirm the
  tombstone remains.
- Report a post and confirm a moderator can hide and restore it.
- Request professional verification and confirm the role remains pending until
  a moderator checks the public register.
- Send and accept a promotion invitation only through the author; confirm a
  moderator cannot publish a report silently from somebody else's post.
- Confirm the service returns an operationally boring health response and does
  not expose configuration details.

### 3. Content and moderation

- Name the initial moderator and the backup reviewer.
- Review `COMMONS.md`, `BIRCH.md`, and `BIRCH-EIGHT-FIGURE-PRODUCT-PLAN.md`
  together so the social layer cannot drift into Research's truth model.
- Keep the prohibition on claim-payment verdicts, ratings, rankings, quotes,
  prices, and advice-shaped outputs enforced by moderation and tests.
- Keep documents, policy numbers, claim numbers, government identifiers, health
  information, and payment data absent from the schema and forms.
- Confirm every durable report has a stable address, label, provenance,
  decision-maker, non-generalization limits, and a JSON companion.
- Confirm no Commons post or account is written into Research content,
  Research search indexes, a dataset release, or a Research citation.

### 4. Public release decision

The person who owns the deployment records these decisions before changing the
flag:

- infrastructure and security review complete;
- legal/privacy review complete for accounts, email, withdrawal, and
  professional verification;
- licensed professional review complete for the claim-payment boundary;
- moderation owner and response expectations named;
- smoke-test evidence attached to the release record;
- `PUBLIC_COMMONS_READY=true` set only on the Commons deployment;
- Commons rechecked at its canonical origin;
- Research then separately reviewed before its `PUBLIC_COMMONS_READY=true` is
  set.

## Failure behavior

If the database or production mail configuration is absent, Commons must fail
closed rather than fall back to memory or a console-delivered sign-in link. If
the public-ready flag is false, pages remain useful for reviewers but are
noindexed, `robots.txt` disallows the origin, and the sitemap exposes no URLs.
If any smoke-test or sign-off item is missing, the flag stays false.

This contract is intentionally boring. A functioning preview is evidence that
the interface can be reviewed; it is not evidence that a public discussion
system is ready to accept real accounts or publish real experiences.
