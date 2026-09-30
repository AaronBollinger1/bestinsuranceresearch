# D2 receipt: the machine layer tells the truth about review

Date: 2026-09-30. Parent `ce6a491`. Finding F2 (receipts/autopilot/D0/AUDIT.md).

## Why

Every review-bearing companion emitted `lastReviewed` beside
`reviewState: under-review`, so a crawler was told a review happened on that
date while llms.txt says only a completed review is described that way. The
JSON-LD carried no status at all, and `/ask` said it was "checking the reviewed
library" and offered a "Recently reviewed" sort while 0 records are reviewed.

## What changed

- `src/lib/machine.ts`: `reviewPosture()` replaces `lastReviewed` and the bare
  reviewer string in all ten companion builders with `recordDate`,
  `reviewedOn` (only when reviewed), `reviewer: { name, status: assigned |
  signed-off }` and `limits: [under-editorial-review, not-advice,
  not-a-coverage-determination, not-an-eligibility-decision]`.
- `src/lib/schema.ts`: TechArticle and QAPage carry `creativeWorkStatus`
  until signed off.
- Search index chunks: `lastReviewed` renamed `recordDate` (retrieval, corpus,
  the `/ask` sort and label). A live `/ask` query was run in a headless
  browser and renders "Record date 2026-08-31" on its results.
- `/ask` copy: "Sort by", "Newest record date", "Checking the published
  library", "No cited match in the published library".
  `verify-ask-handoff.mjs` asserted the old wording; it now asserts the true
  wording, which is the same strength of check.
- `scripts/autopilot-screens.mjs`: a virtual-time budget so client-rendered
  states finish before capture.

## Verify rule (run against broken cases first)

`no machine record says a review happened that has not, and every one carries
its limits`: no JSON file outside the frozen releases emits `lastReviewed`;
every record with a review state has a correctly qualified reviewer and a
`limits` list including `under-editorial-review` while unreviewed; every
TechArticle and QAPage has exactly one of `reviewedBy` or `creativeWorkStatus`;
and no page says "reviewed library" or "Recently reviewed" while nothing is
reviewed. Proved failing by planting `lastReviewed` in a built companion and by
restoring the old `/ask` wording in a built page.

## Commands

| Command | Result |
|---|---|
| `npm run validate` | 388 / 388 pass |
| production posture verify | 179 / 179 pass |

## Screenshots (looked at)

`ask-earthquake-query-*`: the relabelled sort and a resolved result list.
`insurance_court-bonds-california-*`: page unchanged visually.

## Refuses

No record changed state. Frozen releases are untouched (immutable by design).

## Residual

`index version 2026.08.31` on `/ask` is stale; that is D6.

## Rollback

`git revert` this commit.
