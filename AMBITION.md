# Ambition

Settled 8 September 2026. `DIRECTION.md` says what this is today and which
rules do not bend. This file says what it is trying to become, and it is
subordinate to that one: where the two disagree, `DIRECTION.md` wins until it
is changed in the same commit as the thing that supersedes it.

## The goal

**The public reference for insurance: what the rule is, what the numbers say,
and what actually happened to people — in one place, free, and citable to the
document.**

Wikipedia for the rule and the numbers. The useful half of Reddit for the
lived experience. Neither half allowed to contaminate the other.

If that works, the outcome is not traffic. It is that a question about
insurance in the United States cannot be answered well without citing this
estate.

## Why the obvious version of this fails

The obvious build is a forum bolted onto the corpus. That version dies for
four reasons, and they are worth writing down so nobody re-proposes it:

1. **Accounts are on the never list.** `DIRECTION.md` forbids collecting an
   email address, an account, an upload, or an application. Free posting needs
   all four.
2. **Every claim cites a source, enforced at build time.** Unresolved `[S:]`
   markers throw. User prose cites nothing, so it cannot live in the same
   collections.
3. **Coverage advice from unlicensed people, on a page branded to a licensed
   agency, is a regulatory problem.** The header reads *Operated by
   Bollinsure*; the split is 6013787 agency, 0D94699 Brian, 4345268 Aaron. A
   disclaimer does not undo the appearance that licensed advice is being given.
4. **It would spend the only asset we have.** Citability is the product. An
   answer engine weighing this domain currently finds 299 source records and
   zero unsourced assertions. Mixing in unmoderated opinion is the fastest
   available way to lose that, and it took eighty commits to build.

So the answer is not "no discussion". It is that discussion is a **different
layer with a different truth model, on a different origin**, exactly as an
encyclopedia keeps an article and its talk page apart.

## Three layers

| | Layer | Truth model | Origin |
| --- | --- | --- | --- |
| 1 | **The Record** | Every claim cites a document. Reviewed by a named licensed person. | `bestinsuranceresearch.com` |
| 2 | **The Numbers** | Every figure is published government or regulator data, reproduced with its retrieval date. | same origin as the Record |
| 3 | **The Commons** | Attributed human experience and named practitioner annotation, moderated before publication. Cites the Record; the Record never cites it. | a separate origin |

The direction of citation is the whole design. Layers 2 and 3 may point at
Layer 1. Layer 1 points at nothing above it. That is what keeps the citable
unit clean while still letting the site hold the other two kinds of knowledge.

### What each layer may and may not do

| | Record | Numbers | Commons |
| --- | --- | --- | --- |
| Publish a figure a source did not state | no | no | no |
| Publish a rate, premium or price | no | no | no |
| Publish a coverage determination or eligibility verdict | no | no | **no** |
| Publish an unsourced sentence | no | no | yes, attributed |
| Carry a named author who is not staff | no | no | yes |
| Require an account | no | no | yes, on its own origin |
| Carry agency branding or a licence number | yes | yes | **no** |
| Emit `Review` / `Rating` / `FAQPage` markup | no | no | no |

The one rule that is identical across all three: **nobody publishes a verdict
on whether a claim should have been paid.** That is not a citability
consideration, it is the licensing line, and it holds on the Commons even
though nothing else does.

## Layer 2: The Numbers

This is the largest unclaimed ground and it breaks no rule at all, because a
regulator's published dataset is a source like any other — `sourceType:
'government-data'`, of which the corpus already holds seven.

Nobody publishes a good free version of this. Build it in this order:

1. **Complaints by carrier and by reason.** NAIC's Consumer Insurance Search
   already sits in the corpus (`naic-cis`, `naic-cis-agg-reason`). This is the
   single most asked and worst answered question in consumer insurance.
2. **Figures that change on a schedule.** One table of every amount in the
   corpus, the date it next moves, and the instrument that moves it. The
   corpus already holds a MICRA cap stepping each 1 January and indexing at 2
   per cent from 2034, a California breach-notice clock that changed on 1
   January 2026, an ACA affordability percentage the regulation states without
   fixing, and FMCSA minimums revised by rulemaking. Assembled entirely from
   material already written, and citable in a way prose is not.
3. **Market concentration by line and state**, from CDI company profiles and
   NAIC filings.
4. **Residual and public-entity market size** — CEA, Florida Citizens, FHCF,
   NFIP, state WC funds. Two of these are already sourced.
5. **Enforcement and licence status**, from CDI's own published records.

Discipline for this layer: reproduce, date, and link. No derived index, no
ranking, no league table, no score. A chart is a reproduction of a public
figure, not an opinion about a carrier.

## Layer 3: The Commons

Two mechanisms, both of which extend something the schema already has. Neither
is a free-posting forum, and that is deliberate: the moderated versions capture
most of the value with almost none of the exposure.

**Case reports.** `src/content/examples/` already carries eleven records with a
`label` taxonomy (`public-record`, `published-industry`, `carrier-authored`,
`composite`, `hypothetical`), plus `provenance`, `cannotGeneralize`,
`whatHappened` and `reasoningPath`. A reader's real situation enters as a
structured intake, is moderated, is labelled for what it actually is, and is
published as an example that cites law where it touches law. That is the useful
half of a Reddit thread — *this happened to me and here is what turned on* —
with a provenance field attached.

**Practitioner annotation.** `src/content/people/` already carries `licensed`
and `license` fields. A named, licence-verified broker or lawyer may attach a
signed note to a claim address (`/sources/<id>#cN`). Attributed, moderated,
and it *raises* citability rather than diluting it, because a named expert on
the record is evidence. This is the encyclopedia's editor model, not the
anonymous thread.

**Then, and only then, open discussion** — on its own origin, unbranded, with
`rel="ugc"` on outbound links, and with the verdict prohibition enforced by
moderation. Sequence matters: the Commons has to be worth reading before it is
worth posting to, and the first two mechanisms are what make it so.

## Aesthetics, tailored to the three layers

The world stays **ink on cream paper with one gold accent**, per
`DIRECTION.md`. What the three layers add is that a reader must be able to
*see* which layer they are standing in. Design doing epistemics, which is the
same logic the rest of the brand already runs on.

- **The Record** is unchanged. Ink on cream. Gold means *the thing you act on
  or the thing that resolved*.
- **The Numbers** get exactly one new token: a **data ink**, muted and cool,
  for chart strokes and axes. Not gold — gold means resolved, and a chart is a
  reproduction, not a resolution. Charts are hairline and typographic: no
  fills, no gradients, no rounded bars, tabular figures throughout, and every
  axis label naming a value the data actually reaches.
- **The Commons** changes ground. A cooler paper and a visibly different
  header, so crossing from cited law into human account is legible without
  reading a disclaimer. No gold anywhere on it — gold on an unsourced post
  would be a lie in the token system's own terms.
- **Restraint still is the brand.** No stock photography, no illustrated
  people, no icon carrying meaning alone. Three layers is more surface, not
  more decoration.

### The mark, and what it now means

The logo is a scattered field of dots that narrows and shrinks into a solid
arrowhead. Traced from the master, it is 37 dots — radius 2.58 at the open
edge falling to 1.60 at the point — converging on the arrowhead's own
centreline. It is a funnel.

That was already a good mark for a citation engine. Under this plan it is the
product diagram: **many scattered accounts and sources, narrowing into one
resolved answer.** Nothing about the artwork changes. What changes is that it
now earns its place on the Commons as well as the Record, because the funnel
is what the Commons feeds.

The mark has no vector source. Every asset in `public/` derives from
`icon-master-black-transparent.png`, which is why dark mode needs a second file
and why nothing can animate it cleanly. Producing a true vector of it is
therefore a real task, not housekeeping.

### The loading animation

Re-briefed under this plan, superseding nothing in `DIRECTION.md` except the
choice of clip:

- **The beat is convergence, not bloom.** Scattered dots drifting inward and
  resolving into the arrowhead is literally what the site does, and now
  literally what the product does. The ink-bloom clip
  (`public/media/ask-loading-ink-bloom.mp4`) is atmospheric and means nothing
  in particular; the mark resolving means the thing. Prefer the mark.
- **It is generated from the real asset, not from a description.** The master
  PNG goes in as both the first and the last frame, so the clip begins and
  ends on the actual artwork and loops seamlessly. Any model drift is confined
  to the middle, and a clip whose dots distort is rejected rather than shipped.
- Everything else from `DIRECTION.md` holds: `/ask` loading state only, never a
  hero, muted, behind `prefers-reduced-motion` with a static poster, and never
  on a page carrying a claim.

## Sequence

Layer 2 first, and not because it is easier. It breaks no rule, it needs no
moderation, it needs no account, and it is the half that makes the Commons
worth joining. A statistics reference nobody else publishes is also the
strongest possible answer to *why would a practitioner annotate here*.

1. The dated-figures table. Free; the material is already written.
2. Complaints by carrier and reason, from data already sourced.
3. Get the Record reviewed. 139 records currently say a review is open and
   none is signed off. Layer 3 cannot credibly moderate anything while
   Layer 1 is unreviewed.
4. Case-report intake, moderated, into the existing `examples` schema.
5. Practitioner annotation, licence-verified, against claim addresses.
6. Open discussion, separate origin, last.

## What would make this fail

- Putting the Commons on the Record's origin to save a subdomain.
- Letting one unsourced sentence into a Layer 1 collection because it was
  obviously true.
- Publishing a derived score, index or ranking on Layer 2 because a chart
  looked bare without one.
- Allowing a coverage verdict anywhere, including from a licensed contributor.
- Building discussion before the Record is reviewed, so the most visible thing
  on the estate becomes the least evidenced.
- Treating Layer 3 volume as the measure. The measure is still the five things
  in `DIRECTION.md`, and none of them is sessions.
