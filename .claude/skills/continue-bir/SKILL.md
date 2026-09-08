---
name: continue-bir
description: Continue building BestInsurance Research - pick the next unblocked item from the reconciled order, do it properly, validate, commit and push. Use when asked to continue the BIR build, run a BIR pass, or when invoked on a loop. Encodes the rules that do not bend and the things automation must not do.
---

# Continue BestInsurance Research

One pass. Pick **one** item, do it properly, `npm run validate` until green,
commit and push. Do not start a second item in the same pass.

Working directory:
`C:/Users/aaron/Documents/Codex/2026-08-25/au/bestinsurance-research-preview`
Branch: `launch/initial-publication`.

## Read first

1. `HANDOFF.md` - state of play, working practices, and the collisions already
   discovered. Section 1 is the only figure set to trust; the older planning
   files carry stale counts.
2. `AMBITION.md` - *One order, reconciled from the four that existed* is the
   ordered plan. Also *The goal, stated once*, which maps every ask to a layer.
3. `DIRECTION.md` - what this is and the rules that do not bend.

Then `BRAND-SYSTEM.md`, `COMMONS.md` or
`EDITORIAL-AND-CITATION-STANDARD.md` as the item requires.

## Rules that do not bend

- Every claim cites a source. Unresolved `[S:id]` markers throw at build.
- No page collects an application. Enforced by `form-action 'self'`.
- The licence split is **6013787** agency, **0D94699** Brian, **4345268** Aaron.
- **Never push to `main`.** Never touch **Bollinsure**, **BestAMS** or
  **CovWell**.
- No rating, ranking, price, premium, quote, appetite claim, coverage
  determination, eligibility verdict **or risk score** is ever published.
- No `FAQPage`, `ClaimReview`, `Rating`, `Review` or `Offer` structured data.
- A record citing a superseded, rescinded or never-adopted source says so in
  its own text.
- Where a source is silent, say the source is silent rather than filling the
  gap.
- Keys live in `.env.local` and never reach the command line or chat.

## What this pass must never do

These are the failure modes of an unsupervised pass specifically, and they are
separate from the rules above because breaking one of them looks like progress.

- **Never write a new claim without reading the source.** The editorial standard
  is explicit that a citation is made after reading, and that citing a search
  result or a snippet is prohibited. If the document cannot be retrieved, the
  claim does not publish. A recheck on 8 September found an omitted branch that
  had survived the original authoring pass and propagated to four places; the
  only thing that caught it was re-reading the regulation.
- **Never mark anything `reviewed`.** Sign-off is a licensed act belonging to
  Brian Bollinger. `under-review` and `corrected` are the only states this pass
  may set.
- **Never flip `lastCheckedBasis` to `recheck` without a verbatim match.**
  Quote the operative language back from the document and compare it to the
  recorded claim. A summary of a page is not a reading of it. `verify.mjs`
  asserts `lastChecked > accessedDate`, so a source read the same day cannot be
  rechecked at all.
- **Never run `vercel promote`, or any `vercel` command carrying `--prod`.** A
  guard hook blocks it and the estate holds properties that must not be
  touched. Surface the command in the report and let the user run it. Read-only
  `vercel ls`, `vercel project ls` and `vercel inspect` are fine and are how to
  find what is deployed.
- **Never soften wording to make a defect go away.** Fixing a false statement by
  making it vague, while keeping the same citation, converts a wrong claim into
  a vague one and leaves the citation lying.
- **Never manufacture work.** If nothing on the order is unblocked, say so and
  stop. A pass that reports "nothing was eligible today" is a good pass.

## Choosing the item

Work the reconciled order in `AMBITION.md`. Items 1 and 2 - promote to
production, and the licensed review - are **blocked on people, not on work**.
Do not attempt them; do not substitute busywork for them.

Prefer, in this order:

1. **Rechecks that have become eligible.** A source first read on an earlier day
   than today can be rechecked. This is the best automated work available: the
   output is either a confirmation or a flagged discrepancy, and it cannot
   invent content. Figure sources first, since a published amount that has moved
   is the most damaging error available. `DIRECTION.md` counts rechecks as
   success measure four and the corpus is still overwhelmingly first-reads.
2. **A finding from a previous pass that was recorded rather than fixed.**
   `HANDOFF.md` names these. They are pre-scoped and the reasoning is written.
3. **The next unblocked item on the reconciled order.**

Anything that needs a decision - the Commons name, whether `.org` is
defensible, whether to promote - is the owner's. Ask, do not choose.

## How to do it

**Measure before building on a premise, and if the premise fails say so in the
commit rather than forcing the feature.** Two premises have already failed this
way: complaints-by-carrier was unbuildable because the NAIC sources hold no
data, and CDI company profiles are unusable at scale because the lookup is
session-based with no stable per-company URL.

**Run the thing, not just the suite.** Two bugs this month were green in a
122-assertion suite and visible only in a browser: a component style block that
compiled to selectors matching nothing, and a loading animation that flung the
logo apart once per cycle. If the change is visual or client-side, load it.

**Wire a new collection into everything that enumerates records.**
`reviewableRecords()` in `src/lib/review.ts` is the single list. Figures and
cross-rules were each omitted from it once, and each time the queue understated
the backlog and source pages reported no dependents. A test now fails if a
collection publishing `[S:]` markers is not enumerated there.

**Claim addressing is positional.** `/sources/<id>#cN` is the index in the
array. **Append claims, never insert.**

**Use `canonicalLine()`** from `src/lib/lines.ts` for any line-coverage count.

## Gotchas on this machine

- Heredocs break on apostrophes and backticks. Write scripts to a file instead.
- Backticks inside a double-quoted `node -e` string get executed by bash.
- `sharp` resolves only from inside the project directory.
- `grep -c '<loc>'` counts lines, not matches, and the sitemap is one line.
- The repo is mixed CRLF and LF. Match the file you are editing.
- A local `npm run build` is a **preview** build and stamps `noindex`. For
  production output: `PUBLIC_SITE_ENV=production
  PUBLIC_SITE_ORIGIN=https://bestinsuranceresearch.com npx astro build`.

## Finish

1. `npm run validate` until green. Never commit red.
2. Commit with a message that explains **why**, including what was tried and
   rejected. The commit messages are this project's record and are written to be
   read.
3. Push to `launch/initial-publication`.
4. Report in two or three sentences: what changed, what the suite says, and
   anything that needs the owner - a decision, or the promote command.
