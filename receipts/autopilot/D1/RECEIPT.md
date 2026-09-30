# D1 receipt: claim links and checksums in every ledger

Date: 2026-09-30. Parent `31aad4d`. Finding F1 phase 1 (receipts/autopilot/D0/AUDIT.md).

## Why

An answer engine following a Birch citation reached a document, never the
sentence the answer rests on: the ledger printed claims as bare text, no
answer page carried a claim address or a checksum, and every question page
said claim addresses were "visible in the source ledger" when none were.

## What changed

- `src/components/SourceLedger.astro`: every claim in every ledger (questions,
  coverage pages, guides, line and industry hubs, companies, states, examples,
  tools) links `/sources/<id>#c<n>` and carries `data-claim-uri` (absolute)
  and `data-checksum` (the same sha256 prefix the companions publish), with
  the address and checksum printed in mono beside the claim.
- `src/pages/sources/[slug].astro`: each claim shows its checksum and carries
  `data-checksum`.
- `src/pages/questions/[slug].astro`: the Limitations copy now says what the
  page actually renders.
- `src/styles/global.css`: long addresses wrap on phones.

## Verify rule (run against a broken case first)

`every ledger claim links to its own address and carries its checksum`: on
every page with a ledger (more than 200), claim links are at least as many as
ledger sources, each resolves to an existing `<li id="cN">` on the source page,
and each checksum equals sha256 of the claim text. Proved failing by writing
`000000000000` into one checksum on a built page. It also holds the question
copy to the markup.

## Commands

| Command | Result |
|---|---|
| `npm run validate` | 387 / 387 pass |
| production posture verify | 178 / 178 pass |

The homeowners earthquake question page is 252 KB with 91 claim links.

## Screenshots (looked at)

`sources_usc-49-14706-carmack-*` shows each claim with address and checksum.
`ledger-open-homeowners-earthquake-*` is the question page's ledger with its
disclosures opened (a local copy rendered for capture; ledgers ship closed and
the claims are in the HTML either way). `questions_*` is the page top.

## Refuses

No claim text changed; no checksum changed; no review state changed.

## Residual

Markers still cite a source, not a claim (phase 2 is D12 and D13).
Near-duplicate claims are visible side by side in the ledger (D14).

## Rollback

`git revert` this commit.
