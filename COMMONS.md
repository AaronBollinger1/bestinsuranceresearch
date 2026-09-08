# The Commons

Settled 8 September 2026. Layer 3 of `AMBITION.md`, specified end to end.

`AMBITION.md` said the Commons goes on "a separate origin" and never said which,
which left the largest piece of the ambition unbuilt for want of a decision
rather than for want of work. This file is that decision and the design under
it. `DIRECTION.md` still wins where they disagree.

## 1. What this is, and what it is not

Two properties, one estate, and the division is the whole design.

| | **The Record** | **The Commons** |
| --- | --- | --- |
| Origin | `bestinsuranceresearch.com` | a separate origin, named below |
| What it holds | what the rule is, what the form says, what the numbers show | what actually happened to people, and what named practitioners say about it |
| Truth model | every claim cites a document | attributed human account, moderated before publication |
| Agency branding, licence number | yes | **never** |
| Accounts | never | yes |
| Cites | documents only | the Record, and documents |
| Is cited by | answer engines, researchers, brokers | the same, once it is worth citing |

**The Record never cites the Commons.** Layers 2 and 3 may point at Layer 1;
Layer 1 points at nothing above it. That single rule is what lets the estate
hold lived experience without contaminating the citable unit, and it is the
same separation an encyclopedia keeps between an article and its talk page.

The ambition is the Wikipedia and the useful half of Reddit for insurance in the
United States. This half is the Reddit half, and the reason it can exist at all
is that the other half is already 299 sources and 1,905 addressable claims.

## 2. Why a separate origin, and not a subdirectory

Four reasons, and only the last is about taste.

1. **`DIRECTION.md` forbids collecting an email address, an account, an upload
   or an application on the Record.** Free posting needs all four.
2. **Every claim on the Record cites a source, enforced at build time.**
   Unresolved `[S:]` markers throw. User prose cites nothing, so it cannot live
   in those collections.
3. **Coverage discussion by unlicensed people on a page headed *Operated by
   Bollinsure*, under licence 6013787, is a regulatory problem a disclaimer does
   not fix.** This is the load-bearing reason. The Commons carries no agency
   branding and no licence number precisely so that the appearance of licensed
   advice cannot arise.
4. **Citability is the only asset.** An answer engine weighing the Record finds
   zero unsourced assertions. Mixing unmoderated opinion into the same origin is
   the fastest available way to lose that.

Putting the Commons on the Record's origin to save a subdomain is listed in
`AMBITION.md` as a way this fails. It still is.

## 3. The one rule that holds on both origins

**Nobody publishes a verdict on whether a claim should have been paid.**

Not staff, not a reader, not a licence-verified broker, not a lawyer. On the
Record it is enforced by the build. On the Commons it is enforced by moderation,
and it is the only rule that survives the crossing.

It is not a citability preference. It is the licensing line, and it is also the
thing that makes the Commons worth reading: a forum full of strangers declaring
what should have been covered is worth nothing to anybody, and a corpus of
accounts saying *this happened, here is what turned on it, here is who decided*
is worth a great deal.

The Record already encodes the honest form of this in a field. Every example
carries `decidedBy`, and the existing eleven read like this:

> No authority decided this. It is illustrative only.

That sentence is the model for the entire Commons.

## 4. What makes a user experience citable

This is the part that decides whether the Commons becomes a source of truth or
another forum, so it is worth stating precisely.

**An anonymous thread is not citable.** Not by an answer engine, not by a
lawyer, not by us. "My claim got denied and it was BS" carries no date, no
jurisdiction, no line of business, no document, and no way to tell whether it
happened. Volume of it does not add up to authority; it adds up to noise that
an engine learns to discount.

**What makes lived experience citable is structure and provenance.** Six things,
and `src/content/examples/` already asks for all of them:

| Field | Why it makes the account usable |
| --- | --- |
| `label` | what kind of evidence this is: public record, carrier-authored, published industry, anonymized client, composite, hypothetical |
| `labelNote` | why it carries that label |
| `provenance` | where it came from and what was verified |
| `whatHappened` | the facts, dated and placed |
| `decidedBy` | **who decided, or that nobody did** |
| `cannotGeneralize` | at least three reasons this does not transfer |

So the Commons is not a new content model. It is an **intake pipeline into a
schema that already exists and already holds eleven records.** That is the
single most important fact in this document: the hard design work is done, and
what is missing is the moderated route in.

One change is needed. `examples.sourceIds` requires at least one source, which
is right for a staff-written example and wrong for a reader's account that never
touches law. The Commons therefore gets its own collection with `sourceIds`
optional and a `contributor` field, and a report that does touch law cites it -
"cites law where it touches law", as `AMBITION.md` puts it.

### Machine-readability, so an AI can cite it

Whatever the Record does, the Commons does, because that architecture is why the
Record is citable:

- every report gets a stable address and a checksum over its own text, so a
  citing party can tell later whether what they relied on changed;
- every path gets a JSON companion;
- the label and the provenance travel in the machine record, so a system reading
  it knows it is reading a moderated human account and not a statute;
- `llms.txt` on the Commons origin states the truth model plainly, including
  that reports are attributed and not adjudicated.

An engine that can tell the difference between our statute records and our human
accounts will cite both correctly. One that cannot will cite neither.

## 5. The three mechanisms, in order

`AMBITION.md` sets the order and the order is the design. Open discussion last
is not timidity: **the Commons has to be worth reading before it is worth
posting to**, and the first two mechanisms are what make it so.

### 5.1 Case reports (first)

A reader's real situation enters as structured intake, is moderated, is labelled
for what it actually is, and publishes as a report. This is the useful half of a
Reddit thread with a provenance field attached.

- Intake asks the six fields above in plain language, plus state, line, and
  date.
- **No document uploads.** Ever. A declarations page is the densest packet of
  personal information a person owns, and asking for one converts a research
  property into a data-breach liability. Readers describe; they do not upload.
- Moderation strips identifying detail before publication, not after.
- `anonymized-client` requires a documented `consentRecord`, already asserted by
  `scripts/verify.mjs`.
- Every published report carries `cannotGeneralize` with at least three entries,
  because the most likely harm from this surface is a reader treating somebody
  else's outcome as their own rule.

### 5.2 Practitioner annotation (second)

A named, licence-verified broker, adjuster or lawyer attaches a signed note to a
claim address on the Record - `/sources/<id>#cN`.

This *raises* citability rather than diluting it, because a named expert on the
record is itself evidence. It is the encyclopedia's editor model, not the
anonymous thread.

- Verification is a licence number checked against the regulator's own published
  record. `src/content/people/` already carries `licensed` and `license`.
- A licence number is publicly checkable, so verification needs **no identity
  documents and stores no sensitive data.** This is why practitioners come
  before verified policyholders: it is the cheaper verification and the more
  valuable contribution.
- Annotations are attributed, dated, and moderated. The verdict prohibition
  applies to them in full, licence or no licence.
- Annotations live on the Commons and are surfaced *beside* the Record's claim,
  never inside it.

### 5.3 Open discussion (last)

Its own origin, unbranded, `rel="ugc"` on outbound links, moderated against the
verdict prohibition.

Threads are for what changed and what it means: a bill moving, a regulation
adopted, a form edition superseded, a market withdrawing from a county. That is
where public discussion is genuinely additive, because the Record can say what
the rule is and cannot say what practitioners are seeing this month.

## 6. Accounts, and what is never collected

The Commons has accounts. That does not make it a data business.

**Collected:** an email address for sign-in, a display name, and for
practitioners a licence number that is verified against a public register.

**Never collected:** a declarations page or any document upload, a policy
number, a claim number, a date of birth, a government identifier, health
information, or a payment method. The Commons sells nothing, so it needs none of
it.

**Verified policyholder status is deliberately not in the first version.** It
requires identity verification, document handling and storage that the estate
has no reason to hold, and it buys less than practitioner verification does. If
it ever ships, it verifies *that a person holds a policy of a kind*, never which
policy.

## 7. Contribution levels

Shaped around **verified licence and cited contribution, never volume.**

A level system that rewards answering questions creates an incentive to give
coverage advice, which is the one thing that must not happen. So standing comes
from:

- a verified professional licence, displayed with its number and the register it
  was checked against;
- reports published after moderation, counted;
- annotations that a Record page links to, counted;
- corrections accepted, which are worth more than anything else on this list.

Not from: post count, reply count, streaks, upvotes on opinions, or speed of
answering. Nothing on the Commons rewards being first to reply.

## 8. Moderation

**Before publication, not after.** A queue, not a report button. This is slower
and it is the entire product: unmoderated volume is what makes a forum
uncitable.

Rejected outright: any statement of whether a claim should have been paid; any
naming of an individual adjuster or employee; any personal information about a
third party; any document upload; any premium, quote or rate claim; any carrier
ranking; anything presented as a client result of the operator.

The same licensed reviewer who signs off the Record moderates the Commons at
launch. That is a real constraint on throughput and it is why the sequence
matters.

## 9. The news and legislature line

Their proper home is the **Record**, not the Commons, and the mechanism already
exists in outline: `LAUNCH-GATE.md` has a quarterly "what changed" report built
from source-registry deltas.

Every source carries `status`, `lastChecked`, `lastCheckedBasis`,
`updateCadence` and `supersededBy`. A bill enacted, a regulation adopted, a
guidance rescinded, a form edition superseded - each of those is a *change to a
source record*, and the registry can therefore produce a dated, sourced feed of
what moved without anyone writing news. That is the Wikipedia current-events
analogue, and it is citable in a way commentary is not.

The Commons then discusses those changes. The Record states them.

## 10. Naming and origin

The Commons needs its own name, and it must not sound like any of three things.

- **Not the Record.** It cannot be called BestInsurance Research, because it
  carries no agency branding and the whole point is that a reader can tell which
  origin they are standing in.
- **Not a carrier or an agency.** A name built on a verb of selling - *insure*,
  *cover*, *protect*, *quote* - positions it as a provider. `.insure` is a TLD
  that carriers and agencies buy.
- **Not a regulator.** *Bureau*, *Institute*, *Authority*, *Council* imply
  official standing the estate does not have. This is the worse error of the
  three, and the pull toward it is strong precisely because the goal is to sound
  impartial.

What is left, and what fits: a **brandable, human, place-like name** - a
community has a name, not a job title. `birch.insure` was checked and is
available at $5.66 for the first year and $58.19 a year thereafter; the `.insure`
TLD is the problem with it rather than the word, and *birch* itself is a good
fit for the estate, since the paper birch is the tree the visual system is
already made of.

**Recommended: a brandable word on `.com`, with the `.insure` variant held only
as a defensive redirect if at all.** The decision is the owner's; what this
document fixes is the constraint list above, so the choice cannot accidentally
land on a name that positions the Commons as a seller or as a regulator.

## 11. How it looks, so a reader knows where they are

From `AMBITION.md`, and the point is epistemics rather than decoration:

- **A cooler paper and a visibly different header.** Crossing from cited law
  into human account must be legible without reading a disclaimer.
- **No gold anywhere.** In the token system gold means the thing that resolved.
  Gold on an unsourced post would be a lie in the system's own terms.
- Restraint still applies: no stock photography, no illustrated people, no
  decorative graphics. `BRAND-SYSTEM.md` holds the rules.
- Every report shows its label and its provenance above the fold, in the same
  position the Record shows its review state.

## 12. What would make this fail

- Putting it on the Record's origin to save a subdomain.
- Launching open discussion before case reports, so the most visible thing on
  the estate becomes the least evidenced.
- Moderating after publication instead of before.
- Accepting a document upload "just this once".
- Letting a coverage verdict through because a licensed person wrote it.
- Rewarding volume, and so rewarding fast answers.
- Treating thread count as the measure. The measure is still the five things in
  `DIRECTION.md`, and none of them is sessions.

## 13. Sequence, and the gate

**The gate: the Record has to be reviewed first.** 169 records currently carry
an under-review badge and none is signed off. An unreviewed corpus cannot
credibly moderate contributed content, and a property whose own badge says
"under review" cannot ask practitioners to stake their licences on annotating
it. The instrument for clearing that gate is built - `/review-queue` and 299
verification sheets - and what remains is the licensed reading.

In order:

1. Promote the Record to production. Nothing is cited that does not exist.
2. Clear the licensed review.
3. Choose the Commons name and origin against section 10.
4. Build case-report intake, moderated, into a Commons collection modelled on
   `examples` with `sourceIds` optional and a `contributor` field.
5. Practitioner annotation against claim addresses, licence-verified.
6. Open discussion, on what changed, last.

Steps 3 and 4 can be specified and built while step 2 is in progress. Step 5
cannot launch before step 2 completes, because it asks licensed people to
annotate records that carry no sign-off. Step 6 waits on 4 and 5 being worth
reading.
