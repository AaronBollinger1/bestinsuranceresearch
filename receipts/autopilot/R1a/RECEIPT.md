# R1a receipt: coverage lines 28 to 37

Date: 2026-09-30. Branch `autopilot/birch-20260930`. Parent `8ecfd09`.

## What landed

Ten coverage records, each with a generated reference page, guide, line index
and JSON companion. All are `under-review`. None is `reviewed`.

| Coverage id | Line | Sources |
|---|---|---|
| term-life-california | term-life | 10 |
| permanent-life-california | permanent-life | 18 |
| key-person-life | key-person | 6 |
| buy-sell-funding | buy-sell | 7 |
| contract-surety | contract-surety | 27 |
| license-and-permit-bonds | license-and-permit-bonds | 20 |
| court-bonds-california | court-bonds | 21 |
| wage-and-hour-defense | wage-and-hour-defense | 16 |
| additional-insured-california | additional-insured | 6 |
| contractual-risk-transfer-california | contractual-risk-transfer | 9 |

101 new source records. Every one was fetched from its publisher (or, for three
court opinions, from a named reproduction marked `officialHost: false`) and read
before its claims were written. Hosts: leginfo.legislature.ca.gov,
uscode.house.gov, acquisition.gov, irs.gov, supremecourt.gov, courtlistener.com,
scocal.stanford.edu. Every new source is `lastCheckedBasis: access`.

Two existing sources gained a claim after a re-read and are now `recheck`
dated 2026-09-30: `ca-ins-code-10127-9` and `ca-ins-code-10127-10` (the credit
and conversion policy exception to the free look).

`ca-ins-code-10509-953` was read and recorded but is not yet cited by any page.

## Who did the work

The drafting and source reading were done by five autopilot research agents,
two lines each, working from a written brief (the editorial standard's failure
classes, official hosts only, no claim without a read). The coverage records
name Aaron Bollinger as author, following the existing convention; that is
owner gate G7.

Loop spot-checks, run against the live statute text on leginfo:
Ins Code 10110.4 (all eight claims), BPC 7071.11 (all twelve claims including
(g)), Ins Code 11580.04 (first provision). All matched, exceptions included.

## Also in this unit

- `/insurance` now publishes "37 lines published, 37 of 51 canonical lines of
  business", computed by `lineCoverage()` in `src/lib/lines.ts`.
- Roadmap pruned of the four life lines now published.
- Guide fix: every guide rendered its icon-less lists one word per line at
  768px, because the text fell into the 20px icon column of `.fact-list`. One
  CSS rule in `src/styles/global.css`. Pre-existing on all 27 older guides.
- Stat band fix: the dark `.figure` band styled only `dt`/`dd`, so fifteen page
  families using `b`/`span` (line and industry hubs, guide and line indexes,
  every review-queue sheet) printed their numbers dark on dark. Styled in
  `src/styles/instrument.css`; the two hub templates moved to `dl`/`dt`/`dd`.
- `scripts/precheck-coverage.mjs`: fast pre-build check for drafters.
- `scripts/autopilot-screens.mjs`: local screenshots at 390/768/1280. It
  prefers Playwright's headless shell, because headless Chrome clamps windows
  to 500px and its "390" captures were a cropped 500px layout.
- Commons subject list regenerated (`coverage: 37`).
- AUTOPILOT.md: R1 split into R1a-R1c; the north-star section; Track D, Track H
  and the standing improvement queue added on owner direction.

## Verify rules added (each run against a broken case first)

1. `the coverage library publishes the true share of canonical lines it has a
   page for`: recomputes the count, forbids two pages on one canonical line,
   requires each covered line to have a built page. Proved failing by editing
   the built count to 36.
2. `a guide list item without an icon is given the whole row`.
3. `every stat figure carries the label and value markup its dark band
   styles`: every `.figure` on every page uses a styled pair, and the
   stylesheet colours all four selectors. Proved failing by removing the
   `.figure > b` rule.

## Commands and results

| Command | Result |
|---|---|
| baseline `npm run validate` at 8ecfd09 | 382 / 382, 978 pages |
| `npm run validate` | 385 / 385 pass, 1202 pages |
| production posture build + `verify.mjs verify-instrument.mjs` | 176 / 176 pass |
| `cd commons && npm run validate` | 84 pass, 1 skipped, 0 fail |
| `precheck-coverage.mjs` | 37 records clean (warnings only on older records) |

## Screenshots (looked at)

`/insurance`, `/insurance/court-bonds-california`, `/guides/buy-sell-funding`,
`/lines/contract-surety`, each at 390, 768 and 1280, in this folder. They
capture the top of the page at a tall viewport, not the full page. The 390
court bonds page fits with no horizontal overflow; the guide lists read as
paragraphs at 768; the line index stat band is legible at every width.

## What this unit refuses to do

No record is marked reviewed. No page states a coverage determination,
eligibility verdict, price, or tax or legal conclusion; the Connelly and
insurability-of-wages material states what the opinions say and marks
confidence insufficient where courts point different ways. No policy form was
described that was not read; each page says which forms it has not read.

## Residual risk

- Automated drafting: 101 sources and ten pages were read by agents and only
  sampled by the loop. Brian's review (G1) is the check that matters.
- Loose ends recorded in the records and in the improvement queue (I3, I4).
- Three court opinions come from reproductions, not the courts' own hosts.

## Rollback

`git revert <this commit>` removes the ten records, 101 sources and the fixes.
Nothing is deployed.
