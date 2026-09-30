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
| G8 | In-page handoff block on the Record | Aaron | decision needed | See below. Blocks D10. |

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

## G8. The in-page handoff block

The D0 audit found `src/components/Handoff.astro` on 177 Record pages (78
questions, 37 coverage pages, 49 line indexes, 13 tools) rendering "Call a
broker on (phone)" as the primary button, "Request a quote from Bollinsure",
and the quotes@ email. The 2026-09-27 revert (`1cfe263`) removed the header
and homepage intake and left this block in place. AUTOPILOT.md says both "No
Bollinsure lead CTA on the Record" and "Handoff is the `handoff` field and the
specialty sites", which can be read either way.

Options:
1. Keep as is: the block is the sanctioned handoff and shows only where a
   record's `handoff.recommended` is true.
2. Neutral licensed-help note: keep the disclosure, replace the call, quote and
   email buttons with a link to the matching specialty site for the line (per
   DIRECTION.md) and a neutral pointer to checking a licence.
3. Remove the block from the Record entirely; the handoff lives only on the
   specialty sites.

The loop recommends 2: it keeps a route to licensed help, drops the lead
capture from the evidence pages, and matches DIRECTION.md's statement that the
lever for lead volume is the eight specialty sites.
