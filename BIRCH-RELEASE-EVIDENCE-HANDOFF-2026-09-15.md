# Birch read-only release evidence — 2026-09-15

## Exact application SHA

- Audited application head: `5d8730c1010e4f90bf2d21de1e47ee100bf46be9`
- Branch: `codex/birch-preview-design-next-20260913`
- No application UI, content, claims, routes, review state, license gate, DNS, Commons, mail, database, or production setting changed in this unit.
- Design verdict remains the exact-SHA Grok result already recorded on PR #3: **SHIP / no material visual findings**.

## Stack and protected path

- PR #3: draft, `codex/birch-preview-design-next-20260913` → `claude/bold-hopper-mqcyen`, head `5d8730c1010e4f90bf2d21de1e47ee100bf46be9`, `mergeable`, merge state `UNSTABLE`, no reviews.
- PR #1: draft, `claude/bold-hopper-mqcyen` → protected `launch/initial-publication`, head `ad67133dcac9027a2f7d137ef80c6f1646c9b0a0`, `mergeable`, merge state `BLOCKED`, no reviews.
- PR #1 is the only path from this stacked preview branch to `launch/initial-publication`; it remains the protected release PR.
- Protected branch requirements remain: one approving review, `suite`, `production-posture`, `commons`, stale-review dismissal, and conversation resolution. The current pull-request checks for both heads pass; cancelled push runs remain recorded by the workflow’s concurrency policy and were not treated as current approval.

## Read-only canonical probes

Commands run at 2026-09-15:

```sh
curl -sS -I https://birch.insure/
curl -sS -I https://www.birch.insure/
```

Raw response for `https://birch.insure/`:

```text
HTTP/2 308
cache-control: public, max-age=0, must-revalidate
content-type: text/plain
date: Tue, 15 Sep 2026 15:50:53 GMT
location: https://www.birch.insure/
refresh: 0;url=https://www.birch.insure/
server: Vercel
strict-transport-security: max-age=63072000
x-vercel-id: pdx1::9pzs4-1789487453386-8b1f039b62f6
```

Raw response for `https://www.birch.insure/`:

```text
HTTP/2 200
accept-ranges: bytes
access-control-allow-origin: *
age: 498980
cache-control: public, max-age=0, must-revalidate
content-disposition: inline
content-type: text/html; charset=utf-8
date: Tue, 15 Sep 2026 15:50:54 GMT
etag: "3bb882b196a4f8535a487745e3c72f72"
last-modified: Wed, 09 Sep 2026 21:14:33 GMT
permissions-policy: camera=(), microphone=(), geolocation=()
referrer-policy: strict-origin-when-cross-origin
server: Vercel
strict-transport-security: max-age=63072000
x-content-type-options: nosniff
x-frame-options: SAMEORIGIN
x-vercel-cache: HIT
x-vercel-id: pdx1::7wbkt-1789487454181-3765d22790ab
content-length: 46734
```

Result: **canonical-host gate fails**. TLS succeeded and both responses carry HSTS; no response or `Location` header hops through `bestinsuranceresearch.com`. The intended apex-200 / `www`-to-apex-301 posture is not present: the apex currently 308-redirects to `www`, and `www` serves 200 directly. No DNS edit was attempted.

## Review and Commons gates

- The repository still records 176 records with review state and **0 licensed sign-offs**. No agent may mark a record `reviewed`; Brian Bollinger’s licensed review remains required.
- Commons remains closed: `PUBLIC_COMMONS_READY=false`, and `commons.birch.insure` is not configured as a public deployment. The local Commons validation passed 80 tests with 1 external-Postgres test skipped; this is not production smoke approval. No mail or database mutation occurred.

## Checks

- `npm run validate`: 183 passed, 0 failed; preview build 892 pages; Astro check 0 errors, 0 warnings, 376 hints.
- `cd commons && npm run validate`: 80 passed, 1 skipped, 0 failed.

## Rollback and stop condition

Rollback posture for this packet is **do not promote**. Do not merge PR #3 or PR #1, and do not run `vercel promote`, `vercel --prod`, or any DNS change. Live production therefore remains the current older BestInsurance deployment. If a future release clears every protected, content, canonical-host, Commons, and deployment gate, inspect the exact READY deployment SHA first; rollback must target the prior known production deployment, not a new or guessed build.

This is an evidence-only handoff for independent review. Stop here.
