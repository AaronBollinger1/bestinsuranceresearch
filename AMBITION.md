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

## The goal, stated once

**The public reference for insurance: what the rule is, what the form says,
what the numbers show, and what actually happened to people - free, in one
place, and citable to the document.**

Every ask so far fits that sentence. Nothing so far has needed a rule to bend.
Three of them need a *different origin*, and two of them need a word replaced,
and that is the whole of the collision. This section exists so it stops being
re-litigated every pass.

**The word that has to go is "advice."** Not the ambition behind it - the
ambition is right and is most of what this property already does. The word.
Telling a named person whether their policy covers their loss is a coverage
determination, and a coverage determination published on a page whose header
reads *Operated by Bollinsure* under licence 6013787 is an unlicensed
individualized opinion no disclaimer undoes. What replaces it is stronger
anyway, and is the actual reason to cite this site: **we publish what the
document says, quote the clause that says it, and let the reader apply it.**
"Your CGL excludes this" is advice. "CG 00 01 04 13 excludes it at exclusion
j.(5), here is the text, and here is what turns on it" is evidence. The second
is what an answer engine cites and a lawyer trusts, and it is not a smaller
product - it is the one nobody else is building.

The second word is **"unbiased."** Unbiased about carriers cannot mean a
league table with the bias averaged out. It means we publish the regulator's
own record and decline to rank. A source that refuses to publish a verdict is
more citable, not less, and a carrier ranking is the single largest liability
on the list.

### Every ask, and where it goes

| Ask | Layer | May publish | Never publishes | State |
| --- | --- | --- | --- | --- |
| Coverage understanding, all lines | Record | The form's own words, the statute, the mechanism | A determination on a reader's policy | 27 of 51 lines |
| **Exclusions** | Record | The exclusion quoted, its endorsement history, what turns on it | Whether an exclusion applies to a reader's claim | Live; `commonlyExcludes` on every coverage page |
| **Policy understanding** | Record | What a clause does, what defeats it, what changes it | An eligibility or coverage verdict | The core product |
| **Carrier coverage forms** | Record | Filed form text, quoted and cited, hosted by its publisher | A rehosted copy of a copyrighted form | 26 `policy-form` sources; route proven, see below |
| Company-level entity pages | Record | Licence status, domicile, group, former names, authorised lines, receivership - all regulator-published | Any rating, ranking, score or aggregated opinion | 3 records, all institutions; no carrier records yet |
| Hazard and insurance mapping | Numbers | Published hazard geography and residual-market structure | A per-address risk output | Not started |
| Risk-score understanding | Record | How scoring works, what a CLUE report is, consumer rights in it | Any score, for anyone | Not started |
| **Audits** | Two different things | See below | See below | One built, one forbidden |
| Claims-handling discussion | Commons | Attributed accounts, moderated, labelled for provenance | Whether a claim should have been paid | Not started |
| Chat threads, discussions, opinions | Commons | Named human account and practitioner annotation | The same verdict prohibition, enforced by moderation | Not started |
| Contribution levels | Commons | Standing earned by verified licence and cited contribution | Standing earned by volume of answers | Not started |
| **Automation** | Machinery | Ingest, recheck, release, audit, on a schedule | Automated determination or scoring of anything | See below |

### The three that are underlined, because they are the ones that get confused

**Audits.** The word covers one thing this property should do and one it must
never do, and they look similar from outside.

- *Auditing the corpus* is already built and is the best thing here. The
  verification sheets at `/review-queue/<source-id>` are exactly an audit
  instrument: every one of 4,948 cited sentences traced to the document under
  it. `npm run audit:estate` and `npm run audit:onpage` are the same idea
  pointed at the estate. More of this is pure gain.
- *Auditing a reader's coverage* is a coverage determination wearing a
  clipboard. The line is already drawn and already enforced: the ten live
  modules record a position and surface gaps **against cited rules**, and
  `scripts/verify-instrument.mjs` rejects any rule that states an eligibility,
  price, appetite or coverage verdict. That is the allowed shape of an audit -
  *this rule exists, your recorded position does not address it, here is the
  rule* - and it is the shape every future one takes.

**Automation.** Allowed, wanted, and the constraint is on the output not the
mechanism. Automate the machinery: ingest from government data, the recheck
cadence, dataset releases, the estate audit on a schedule, moderation queues.
Never automate a conclusion the rules forbid a human from publishing - an
automated coverage determination is not more defensible than a manual one, it
is the same publication at scale. The distinction that matters: automation may
decide *what to check and when*, never *what the answer is*.

**Carrier coverage forms, and the route to them.** Measured on 8 September
rather than assumed, and the result reversed the plan:

- **CDI company profiles are a dead end at scale.** The lookup carries exactly
  the right fields - licence status, company type, state of domicile, former
  names, agent for service of process, authorised lines, complaint history -
  and sits behind a session-based search on `interactive.web.insurance.ca.gov`
  with no stable per-company URL. Same failure as the NAIC complaint aggregate,
  which killed Layer 2 step 1. A source we cannot address per company is a
  source no record can cite.
- **State filing document libraries are the route, and this corpus already
  proves it twice.** `iso-ho-00-03-05-11-nv-doi` is American Family/Homesite's
  filed HO 3, a static PDF on `doi.nv.gov`. `iso-dp-00-03-12-02-nv` is CSAA's
  filed DP 3 on `docs.nv.gov`. `iso-ho-00-06-05-11-me-bureau` is on
  `maine.gov`. Stable government-hosted URLs, carrier-specific, quotable.
  Nevada and Maine are open; that is where carrier-level form work starts.
- Note what those records get right and keep getting right:
  `officialHost: false`. The state hosts the copy; ISO and the carrier publish
  the text. We cite and quote the clause. We never rehost the form.

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

**`COMMONS.md` is the specification.** This section states the shape; that file
fixes the origin question this one left open, and holds the account model, the
moderation rule, contribution levels, the naming constraints, and what makes a
user account citable rather than merely present.

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

**The vector now exists, and this paragraph used to say it did not.**
`scripts/trace-mark.mjs` recovers the artwork from
`icon-master-black-transparent.png` by connected-component analysis of the
alpha channel and emits `public/mark.svg`: 37 real circles and one traced
arrowhead, in `currentColor`, at 3.4KB against the master's 7.3KB. It is
checked before it is allowed to write - 37 dots against the 37 recorded here,
radius falling toward the point (correlation 0.852, so the mark measurably is
a funnel), and 0.975 intersection over union against the master's own ink.

Three things were blocked on that and are no longer: dark mode needs no second
file, the mark scales past 512px, and the loading animation can be the one
briefed below rather than a wipe. `BRAND-SYSTEM.md` is the full system.

### The loading animation

Re-briefed under this plan, superseding nothing in `DIRECTION.md` except the
choice of clip:

- **The beat is convergence, not bloom.** Scattered dots drifting inward and
  resolving into the arrowhead is literally what the site does, and now
  literally what the product does. The ink-bloom clip
  (`public/media/ask-loading-ink-bloom.mp4`) is atmospheric and means nothing
  in particular; the mark resolving means the thing. Prefer the mark.
- **It is derived from the geometry, not generated at all.** This bullet used
  to brief a clip with the master PNG as first and last frame, on the
  reasoning that model drift would at least be confined to the middle. That
  is no longer the best available option and the clip is not needed: with the
  vector in hand the 37 dots are real elements, each animated from its own
  measured distance to the arrowhead, and the resolved frame is provably the
  artwork coordinate for coordinate. Nothing drifts because nothing is
  invented. `src/components/MarkConverging.astro`, and
  `scripts/mark-frames.mjs` renders the cycle to a contact sheet so it can be
  reviewed without a browser.
- Everything else from `DIRECTION.md` holds: `/ask` loading state only, never a
  hero, muted, behind `prefers-reduced-motion` with a static poster, and never
  on a page carrying a claim.

## Sequence

Layer 2 first, and not because it is easier. It breaks no rule, it needs no
moderation, it needs no account, and it is the half that makes the Commons
worth joining. A statistics reference nobody else publishes is also the
strongest possible answer to *why would a practitioner annotate here*.

The ordered plan is **one order, reconciled** above, and it supersedes the
six-step list this section used to carry as well as the separate orderings in
`ESTATE-PLAN.md`, `LAUNCH-GATE.md` and `AUTHORITY-AND-DISTRIBUTION-PLAN.md`.
Two items from that old list are now done and should not be re-proposed: the
dated-figures table shipped as `/figures`, and complaints by carrier and reason
was measured and found unbuildable, because the NAIC sources describe the
search tools and hold no data and the aggregate report sits behind an
interactive form with no static download.
### One order, reconciled from the four that existed

This estate held four orderings of the same work, in four files, and none of
them agreed. That is most of why the direction kept being re-asked:

- `HANDOFF.md` section 5 ordered by what a session can pick up next.
- `ESTATE-PLAN.md` ordered by what the instrument structurally needs.
- `LAUNCH-GATE.md` ordered by what blocks a production flip.
- `AUTHORITY-AND-DISTRIBUTION-PLAN.md` ordered by what earns a citation.

The last one wins where they conflict, because `DIRECTION.md` says citability
is the goal and traffic is a side effect of it. Reconciled against the state as
measured on 8 September, with 90 commits in:

| # | Work | Blocked on | Why here |
| --- | --- | --- | --- |
| 1 | **Promote a deployment to production** | The user, one command | Nothing is cited that does not exist. Highest leverage on the citation list and every other item is downstream of it. |
| 2 | **Licensed sign-off** | Brian's reading | A hub whose 173 records say "under review" is not the thing being described. The instrument for it is built: `/review-queue` plus 299 verification sheets. No code left. |
| 3 | **Recheck the remaining figure sources** | Nothing | Next, and the next pass. Seven of eleven figure-source documents are now rechecked; four remain. See below. |
| 4 | **Give `tools` a `reviewState` and a `reviewer`** | Nothing | 3 live worksheets publish 80 cited sentences and cannot state whether anyone checked them. Schema change to a 16-record collection. |
| 5 | **Carrier entity records** | Nothing, now the route is known | The gap behind every "unbiased on companies" ask. 3 organisation records exist and none is a carrier. Strongest review discipline on the site, because this is where appetite claims creep in. |
| 6 | **Hazard geography and residual markets** | Nothing | Largest unclaimed ground, breaks no rule, and it is the area-specific layer. |
| 7 | **Risk-score explainers** | Nothing | The honest version of the risk-score ask, and a real gap nobody fills. |
| 8 | **New York and Texas depth** | Nothing | 141 of 299 sources are California. NY DFS and the Texas code are both fully public. |
| 9 | ~~Versioned dataset release~~ **done.** | - | Release 2026-09-09 is cut and frozen: 1,905 claims, 299 sources, published at `/dataset` with a SHA-256 per file. See below. |
| 10 | **Commons** | Item 2, and provisioning | **Scaffolded.** `commons/` is a second project on its own origin with its own suite; see `COMMONS.md` section 12a. What remains is a name, a database and a mail sender. Practitioner annotation still cannot launch before item 2. |

### What the dataset release actually changed

`/claims.json` already published every claim, so the gap was never access - it
was identity. A live endpoint regenerated on every build, carrying a
`generatedFor` stamp that moved daily whether or not a word did, cannot be
cited: "we used the BestInsurance Research claim index" names nothing anyone
can fetch again and compare. Downloadable and citable are different properties
and only the second one is the goal in `DIRECTION.md`.

So a release is frozen bytes committed to `public/dataset/<date>/`, cut by
`scripts/cut-release.mjs` and regenerated by nothing. A correction lands in the
*next* release, beside the old one, never inside it.

Three decisions worth not re-taking:

- **The release states its own review posture.** A clean machine-readable
  corpus reads as a verified one, so `manifest.json` carries the sign-off
  counts, how many sources were re-read rather than read once, and the same
  `mayNotBeInferred` list the claim index carries plus one more line about
  review. A release that let a consumer assume licensed sign-off would be
  trading on a verification that has not happened.
- **The checksum algorithm is duplicated, and held to account rather than
  shared.** `cut-release.mjs` runs outside Astro and cannot import
  `claimChecksum()` from `src/lib/machine.ts`. Two copies of a hash function is
  the arrangement that drifts silently, and a drifted checksum invalidates
  every citation carrying one without failing anything. `verify.mjs` compares
  the two on every claim whose text is byte-identical in both, which catches
  drift without forbidding corrections.
- **Immutability is asserted, not promised.** The manifest digests are checked
  against the bytes on disk, and `vercel.json` serves a release
  `max-age=31536000, immutable` - true here and a lie on the live endpoints,
  which is the difference between the two surfaces. `/dataset/releases.json` is
  deliberately outside that rule, because it gains a row every time a release
  is cut.

The remaining question is cadence, and it is deliberately not a calendar:
releases are cut when the corpus has moved enough to be worth pinning. The
first one that follows a correction will exercise the `changesSince` block,
which lists the claim ids whose checksum moved.

Breadth is deliberately last among the content items, and the reason is worth
keeping: an answer engine cites the page that answers the question asked, so
breadth does matter - but breadth published before review and before deployment
earns nothing at all.

### Why the recheck pass is next, and how small it is

`DIRECTION.md` counts rechecks as success measure four, and the corpus is at
**13 of 299**: 286 sources carry the date somebody first read them and nothing
more. An authority that never re-reads decays, and `lastCheckedBasis` exists
precisely so the site cannot overstate itself.

The bounded place to start remains the figures. **19 published figures rest on
11 distinct source documents; seven are now rechecked and four remain
first-read only.** Eleven documents confirm every amount this site publishes.
A figure whose amount has moved is the most damaging error class available here
- a wrong number is what a reader acts on - and finding one produces a
correction, which is success measure five.

The verification sheets make this cheap in a way it was not last week: each
sheet already holds the document, the claims recorded against it, and every
sentence resting on it, so a recheck is a comparison rather than an
investigation.

Two disciplines for that pass, both from
`EDITORIAL-AND-CITATION-STANDARD.md`. A recheck is made by reading the
document, so it needs the operative language quoted back verbatim and compared
against the recorded claim - a summary of a page is not a reading of it. And
where the text cannot be retrieved, the honest outcome is no recheck at all
rather than a flipped flag, because `verify.mjs` asserts the flag and the flag
is the whole point of the field.

### A note on the older planning files

`ESTATE-PLAN.md`, `LAUNCH-GATE.md` and `AUTHORITY-AND-DISTRIBUTION-PLAN.md`
carry state tables written between 8 and 20 commits ago and now understate the
corpus - 8 modules where there are 10, 231 rules where there are 272, 251
sources where there are 299, 35 records under review where there are 173. Their
*reasoning* is current and is why they are still worth reading; their counts are
not. `HANDOFF.md` section 1 is the live figure and the only one to trust. Do not
spend a pass syncing numbers across five files: that is how they came to
disagree in the first place.

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
