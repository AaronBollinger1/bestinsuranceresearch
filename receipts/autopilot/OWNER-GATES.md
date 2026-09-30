# Owner gates

Everything the autopilot loop has built up to, and cannot pass, because the act
belongs to Aaron or Brian. The loop assembles each packet and keeps building;
it never opens a gate itself. Updated after every unit.

Branch: `autopilot/birch-20260930`. Nothing here is deployed, merged or indexed.

| # | Gate | Who | State | What is waiting on it |
|---|---|---|---|---|
| G1 | Licensed review of records | Brian (0D94699) | open, 0 records reviewed | Every record on the branch is `under-review`. See the review packet below. |
| G2 | Indexing (`PUBLIC_INDEXING_OPEN`) | Aaron | closed | Production posture builds and passes locally; nothing is indexable. |
| G3 | Merge PR #4 (and PR #2) | Aaron | not merged | The autopilot branch starts at `a01316b`, the PR #4 head. It is a backup branch and has no PR. |
| G4 | Production promotion and apex/www redirect direction | Aaron | undecided | `birch.insure` and `www.birch.insure` are attached to the Research Vercel project and serve an older build. |
| G5 | Commons provisioning (Postgres, Resend, DNS, moderator) | Aaron | not provisioned | `PUBLIC_COMMONS_READY=false`. Commons units run on the in-memory store only. |
| G6 | Provider credentials or spend | Aaron | none granted | Every adapter is fixture-backed and off by default. |
| G7 | Author of record on autopilot-drafted pages | Aaron | decision needed | See below. |

## G1. Licensed review packet

Records added by the loop, all `under-review`, each with its sources listed on
its page and on `/review-queue/<source-id>`. Brian's verdict is the only thing
that changes their state; the loop records none.

### R1a: ten coverage lines (2026-09-30)

Listed in `receipts/autopilot/R1a/RECEIPT.md` with every source the page rests
on. Review order suggested by exposure: contract surety, license and permit
bonds and court bonds first (statutory obligee language), then additional
insured and contractual risk transfer (anti-indemnity statutes), then the four
life pages, then wage and hour defense.

## G7. Author of record

The existing corpus names Aaron Bollinger as author on every coverage record.
The loop followed that convention for the pages it drafted, because changing
the author field is a change to how authorship is represented site-wide and not
a call the loop should make alone. The drafting and the source reading were
done by the autopilot agents; the receipts say so. Decision needed: keep Aaron
as author of record once he has read the page, or introduce a distinct author
entry for automated drafting.
