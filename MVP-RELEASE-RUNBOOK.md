# Birch MVP release runbook

Last verified: 2026-09-11. This is the operating sequence for the first
controlled release of Birch Research. It is intentionally staged: the site can
be deployed for private review before it is allowed to index, and Commons can
remain closed until its persistence and mail path are real.

## Current reality

- Repository: `AaronBollinger1/bestinsuranceresearch`
- Default branch: `launch/initial-publication`
- Release candidate branch: `claude/bold-hopper-mqcyen`
- Candidate snapshot audited from commit `72013ce`; the release commit is the
  head of the draft PR and should be recorded there
- Root Vercel project: `bestinsuranceresearch`
- Vercel scope: `aaronbollinger1s-projects`
- Root Vercel project id: `prj_8mGgv90dHyxq6Ijz3buguI0qlyd3`
- Research domains are attached: `birch.insure` and `www.birch.insure`
- `commons.birch.insure` is not configured as a Vercel domain yet
- No Vercel environment variables are currently configured in the project
- Current live production is an older BestInsurance build, not this Birch branch
- The release candidate is green in GitHub Actions: `suite`,
  `production-posture`, `commons`, and Vercel Preview Comments
- The corpus is not reviewed: 176 records carry a review state and none have
  received licensed sign-off

The last point is a release blocker, not a cosmetic note. Until a human
reviewer signs off the intended public slice, Birch may be deployed privately
but must not be presented as a finished source of truth or opened for public
contributions.

## Phase 1 — make GitHub the release control plane

1. Re-read `DIRECTION.md`, `AMBITION.md`, `BIRCH.md`, and `LAUNCH-GATE.md`.
2. Open a draft PR from `claude/bold-hopper-mqcyen` into
   `launch/initial-publication`:

   ```sh
   gh pr create \
     --repo AaronBollinger1/bestinsuranceresearch \
     --base launch/initial-publication \
     --head claude/bold-hopper-mqcyen \
     --draft \
     --title "Birch MVP release candidate"
   ```

3. Protect `launch/initial-publication` in GitHub. Require a pull request, one
   human approval, the three checks `suite`, `production-posture`, and
   `commons`, dismissal of stale approvals, and no force pushes. Do not make
   direct pushes to the default branch the release mechanism.
4. Keep `claude/bold-hopper-mqcyen` as the working branch until the draft PR is
   reviewed. Do not create a second release branch for the same snapshot.

The repository workflow is already the correct CI boundary. Do not add a
second Vercel deploy workflow while Vercel's Git integration is active; that
would create two competing deployment authorities.

## Phase 2 — private Vercel staging

Use the existing `bestinsuranceresearch` project for Research. Keep the
separate `bestinsuranceresearch-preview` project as a QA/reference project; do
not promote it by accident.

Set these non-secret variables for Preview in the Research project:

```text
PUBLIC_SITE_ENV=preview
PUBLIC_SITE_ORIGIN=https://birch.insure
PUBLIC_COMMONS_ORIGIN=https://commons.birch.insure
PUBLIC_COMMONS_READY=false
```

Keep `PUBLIC_GTM_ID` unset. Do not add a Perplexity key yet: the repository has
the server-only adapter and policy boundary, but no durable research job,
moderation queue, or publish approval path.

Set the Vercel production branch to `launch/initial-publication`, the root
directory to the repository root, the framework to Astro, and the build command
to `npm run build`. Vercel's Git integration should create the candidate
deployment for the PR; no manual `vercel --prod` deploy is needed.

The production variables are deliberately not switched to an indexable Birch
posture in this phase. After the reviewed public slice is approved, use:

```text
PUBLIC_SITE_ENV=production
PUBLIC_SITE_ORIGIN=https://birch.insure
PUBLIC_COMMONS_ORIGIN=https://commons.birch.insure
PUBLIC_COMMONS_READY=false
```

Then rebuild and verify that `robots.txt`, canonical URLs, and page metadata all
describe `https://birch.insure`. Never promote the old deployment by URL guess;
inspect the exact READY candidate first.

## Phase 3 — canonical host and DNS

The recommended canonical host is the apex `https://birch.insure`. The
`www.birch.insure` host should permanently redirect to it. The checked-in
`vercel.json` contains both bare-host and path redirects because Vercel's
`/:path*` pattern does not match `/`.

At Porkbun, add or confirm the Vercel record for the root and `www` host as
shown by Vercel. Do not delete mail records. Do not change nameservers as part
of this release. Before changing a parking or forwarding record, re-list the
zone and confirm the exact record is still the one being removed.

Validate in this order:

```sh
curl -sS -I https://birch.insure/
curl -sS -I https://www.birch.insure/
npm run audit:estate
```

The expected end state is one canonical 200 origin for Research, a single
redirect from `www` to the apex, valid SSL, and no redirect chain through the
old BestInsurance host.

## Phase 4 — content and production gate

The release candidate currently contains 858 generated routes, 301 source
records, 85 questions, 27 coverage lines, 19 figures, 10 modules, and 272
module rules. Those numbers describe the build; they do not mean the content is
licensed-reviewed.

The reviewer signs off one stable snapshot using `/review-queue` and the
source worksheets at `/review-queue/<source-id>`. No one should bulk-change
`reviewState`. The first public launch should be a curated reviewed slice, not
all unreviewed routes. Keep the remainder private or clearly marked under
review until it has been read.

Required checks before an indexable Research release:

```sh
npm run validate
PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://birch.insure \
  npx astro build
PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://birch.insure \
  node --experimental-strip-types --test scripts/verify.mjs scripts/verify-instrument.mjs
```

Then run the on-page audit against the production build. The audit should not
be bypassed by running it against a preview/noindex build.

## Phase 5 — Commons, separately and later

Create a new Vercel project named `birch-commons` with root directory
`commons/`, then attach `commons.birch.insure`. Vercel currently recommends an
`A` record for that subdomain at `76.76.21.21`; confirm the dashboard value at
the time of the DNS change.

Before enabling Commons, provision Postgres and Resend and set the deployment
variables from `commons/.env.example`:

```text
COMMONS_ENV=production
PUBLIC_COMMONS_READY=false
COMMONS_DATABASE_URL=...
RESEND_API_KEY=...
COMMONS_MAIL_FROM=...
COMMONS_MODERATORS=...
PUBLIC_COMMONS_ORIGIN=https://commons.birch.insure
PUBLIC_RECORD_ORIGIN=https://birch.insure
```

Run `npm run preflight:production` from `commons/`, apply `commons/schema.sql`,
and complete a real mailbox/database smoke test for sign-in, posting,
moderation, withdrawal, and the health route. Only then can
`PUBLIC_COMMONS_READY=true` be considered. Commons remains noindex and closed
while that gate is false.

## What is intentionally not in MVP release

- no public ratings, rankings, reputation scores, or carrier leaderboards
- no automatic AI publishing from Perplexity or any other search provider
- no server-side policy/document upload or OCR
- no individualized coverage determination, eligibility, price, appetite, or
  claims-payment verdict
- no public forum or professional contribution flow before Commons persistence,
  mail, moderation, and privacy boundaries are exercised

These are product sequencing decisions. They preserve the credibility that the
Research layer is meant to earn.

## Release owner decisions still required

1. Confirm the canonical host is the apex `birch.insure`.
2. Name the human reviewer who will sign off the curated public slice.
3. Approve the DNS/canonical-host cutover window.
4. Decide whether the first public Research release is indexable immediately
   after sign-off or remains noindex for a private beta.
5. Provision the Postgres, Resend, and moderator owner when Commons is ready.
