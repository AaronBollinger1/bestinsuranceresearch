# Birch launch gate

Last updated: 2026-09-11. This file describes the current Birch MVP release
candidate, not the retired BestInsurance deployment.

## Current state

| Area | State |
| --- | --- |
| Research app | Astro static app at the repository root |
| Commons app | Separate Astro SSR app in `commons/`, intentionally closed |
| Release branch | `claude/bold-hopper-mqcyen`; candidate snapshot audited at `72013ce` |
| Default branch | `launch/initial-publication` |
| Root Vercel project | `bestinsuranceresearch` in `aaronbollinger1s-projects` |
| Research domains | `birch.insure` and `www.birch.insure` attached to the root project |
| Commons domain | `commons.birch.insure` not configured yet |
| Live production | Older BestInsurance build; Birch branch has not been promoted |
| Indexing posture | Preview/noindex until licensed content review is complete |
| Review state | 176 records carry review state; 0 have licensed sign-off |
| CI | Candidate branch green across `suite`, `production-posture`, and `commons` |

## Gates

### G1 — repository and GitHub

- [ ] Draft PR opened from `claude/bold-hopper-mqcyen` to
      `launch/initial-publication`.
- [ ] Default branch requires a PR and one human approval.
- [ ] `suite`, `production-posture`, and `commons` are required checks.
- [ ] Stale approvals are dismissed; force pushes are disabled.
- [ ] The PR describes the review boundary and links to
      `MVP-RELEASE-RUNBOOK.md`.

### G2 — build and application behavior

- [x] `npm run check` passes with zero errors and zero warnings.
- [x] `npm run validate` passes on the candidate branch.
- [x] Production posture is exercised in CI with
      `PUBLIC_SITE_ORIGIN=https://birch.insure`.
- [x] Citation markers resolve and claim records have machine-readable
      companions.
- [x] Internal links, JSON-LD, retrieval, privacy, accessibility, and the
      no-upload boundary are covered by verification.
- [x] Research defaults to a browser-local deterministic `/ask` lookup.
- [x] Perplexity is server-only policy code; no live key or automatic publish
      path exists.
- [ ] Lighthouse and manual screen-reader sign-off on the chosen public slice.

### G3 — Vercel preview

- [x] Preview variables are set on the root Research project:

  ```text
  PUBLIC_SITE_ENV=preview
  PUBLIC_SITE_ORIGIN=https://birch.insure
  PUBLIC_COMMONS_ORIGIN=https://commons.birch.insure
  PUBLIC_COMMONS_READY=false
  ```

- [ ] Vercel Git integration uses the repository root, Astro, and
      `npm run build`.
- [ ] Preview deployment protection is enabled for private review.
- [ ] `PUBLIC_GTM_ID` remains unset.

### G4 — canonical host and DNS

- [ ] Apex `https://birch.insure` is confirmed as canonical.
- [ ] `www.birch.insure` redirects once to the apex.
- [ ] SSL is valid on both hosts.
- [ ] Porkbun records are re-listed immediately before any change.
- [ ] Mail records are left untouched.
- [ ] `npm run audit:estate` is rerun after DNS settles.
- [ ] No redirect chain passes through `bestinsuranceresearch.com`.

### G5 — editorial review

- [ ] Reviewer receives one stable snapshot of the chosen public slice.
- [ ] Every public claim is checked against its cited source.
- [ ] Form, edition, jurisdiction, confidence, and boundary language are
      checked where applicable.
- [ ] No record is bulk-flipped from `under-review` to `reviewed`.
- [ ] Corrected records have a correction entry and a new dated dataset release.
- [ ] The first public release is limited to the reviewed slice; the rest stays
      private or visibly under review.

### G6 — production indexing

- [ ] Set, only after G5:

  ```text
  PUBLIC_SITE_ENV=production
  PUBLIC_SITE_ORIGIN=https://birch.insure
  PUBLIC_COMMONS_ORIGIN=https://commons.birch.insure
  PUBLIC_COMMONS_READY=false
  ```

- [ ] Build and run the production verification suite.
- [ ] Run the on-page audit against the production output.
- [ ] Confirm canonical URLs, `robots.txt`, sitemap, OG metadata, JSON-LD, and
      redirects on the exact READY deployment.
- [ ] Promote the exact inspected deployment, not the latest deployment by
      guess and not the separate preview project.
- [ ] Submit the sitemap to Search Console only after the canonical host and
      reviewed slice are live.

### G7 — Commons, later

- [ ] Create the separate Vercel project rooted at `commons/`.
- [ ] Attach `commons.birch.insure` and configure its DNS record.
- [ ] Provision Postgres and Resend; apply `commons/schema.sql`.
- [ ] Set the production variables in `commons/.env.example`.
- [ ] Run `npm run preflight:production` from `commons/` and a real mailbox/database
      smoke test.
- [ ] Keep `PUBLIC_COMMONS_READY=false` until sign-in, posting, moderation,
      withdrawal, and health checks pass in the deployed environment.
- [ ] Only then decide whether to enable public discussion links.

## Explicitly out of MVP

Ratings, rankings, reputation scores, AI-autopublished research, policy OCR or
document uploads, individualized coverage determinations, eligibility/price or
appetite claims, and claims-payment verdicts are not launch features.

## Release command discipline

Read-only inspection is safe:

```sh
vercel ls bestinsuranceresearch --scope aaronbollinger1s-projects
vercel inspect <exact-deployment-url> --json
```

Do not run `vercel promote`, `vercel --prod`, or change DNS until G1 through G5
are cleared and the exact deployment has been inspected. The release runbook
in `MVP-RELEASE-RUNBOOK.md` is the authoritative sequence.
