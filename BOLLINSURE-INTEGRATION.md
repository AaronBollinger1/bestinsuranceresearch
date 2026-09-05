# Bollinsure Integration Contract

The boundary between the research library and the brokerage, and the only data that crosses it.

Last updated: 2026-08-31

## The four-part boundary

| | Owns |
| --- | --- |
| **BestInsurance Research** | Attracts, explains, cites, and organizes public information. Collects nothing. |
| **Bollinsure** | Identified client intake, licensed advice, quoting, uploads, appointments, email, calls. |
| **CovWell** | The insured-facing self-guided coverage and service product. Not a second research library. Outside this codebase. |
| **BestAMS** | Bollinsure's private system of record. Not part of this project: not read from, not written to, not trained on. |

## The disclosure

Fixed wording, shown near every licensed-help action:

> BestInsurance Research provides general information. Licensed help is offered by Bollinsure
> Insurance Services, a California insurance brokerage.

Each handoff module also discloses that Bollinsure may be compensated by an insurer when it
places coverage, and that it is **not the only source of licensed help**.

## The handoff is optional, always

The primary research journey never requires it. Every answer, its full source ledger, and its
stated limits are complete whether or not a Bollinsure link is ever clicked. The handoff module
appears **after** the content the visitor came for, never before it, and never as a gate.

`handoff.recommended` is a per-question editorial judgement. Where a licensed review would not
genuinely add anything, it is set to false and no module renders.

## What crosses the boundary

Exactly seven parameters, each validated against a slug pattern before it is set:

| Parameter | Value |
| --- | --- |
| `utm_source` | `bestinsuranceresearch` |
| `utm_medium` | `referral` |
| `bir_source_path` | The page path, for example `/questions/claims-made-retroactive-date` |
| `bir_family` | personal, commercial, life, health, general |
| `bir_line` | The line slug, when known |
| `bir_source_tool` | The tool id, when the handoff comes from a tool |
| `bir_completion` | Whole percent, rounded to the nearest ten |

`scripts/verify.mjs` walks every built page and asserts that no outbound Bollinsure URL carries
a parameter outside this list, and that `bir_completion` is always a multiple of ten.

## What never crosses it

The visitor's question. Anything typed into a tool. A name, email, phone, or address. A policy
or claim number. Any document. Any session identifier.

Personal information is collected only if the visitor chooses to provide it in Bollinsure's own
disclosed intake, which is a separate site with its own terms.

## What Bollinsure should do with the attribution

Retain the seven fields in attribution metadata on whatever record its existing intake creates,
and use the existing BestAMS submission path.

Two things to avoid. Do not create a second lead-digest email path. And do not treat a referral
parameter as a lead: a visitor arriving with `bir_source_path` set has read a research page,
not requested contact.

## Direction of links

Contextual links **from** Bollinsure **to** this site should be added only after the destination
pages are complete and reviewed. Linking to an under-review page from a production brokerage
site would import this site's open review gate into a place that has already cleared its own.

## Podcast

Transistor stays the canonical subscription feed. Bollinsure stays the canonical public episode
archive. This site does not mirror the feed and does not import transcripts as research pages.

An episode may be cited here when it materially supports an answer, with a direct link to the
canonical Bollinsure episode page and a clear source label. A transcript enters the corpus only
after factual review, source mapping, and segmentation into claims: the same bar as any other
source.

## Release gates

See `LAUNCH-GATE.md`. The Bollinsure-specific ones:

1. Confirm the disclosure wording appears near every licensed-help action.
2. Confirm no handoff URL carries anything beyond the seven parameters.
3. Confirm the quote intake retains the attribution without creating a duplicate lead path.
4. If GA4 cross-domain measurement is used, verify one session continues across the handoff and
   that no free text enters the payload.
5. Add contextual Bollinsure links only after the destination pages have cleared review.
