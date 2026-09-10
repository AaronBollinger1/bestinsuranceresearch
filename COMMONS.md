# The Commons

Settled 8 September 2026; origin refined 10 September 2026. Layer 3 of
`AMBITION.md`, specified end to end. The current product lock is in
`BIRCH-EIGHT-FIGURE-PRODUCT-PLAN.md`.

`AMBITION.md` said the Commons goes on "a separate origin" and never said which,
which left the largest piece of the ambition unbuilt for want of a decision
rather than for want of work. This file is that decision and the design under
it. `DIRECTION.md` still wins where they disagree.

## 1. What this is, and what it is not

Two properties, one estate, and the division is the whole design.

| | **The Record** | **The Commons** |
| --- | --- | --- |
| Origin | `birch.insure` | `commons.birch.insure` |
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

> **Superseded in part on 9 September 2026 by `BIRCH.md`.** The owner's decision
> is that the whole property is Birch: the evidence layer is **Birch Research**,
> the community is **Birch**, and they are one brand rather than two. What
> follows still records why the name was chosen and the reservation about the
> TLD, both of which stand. What it no longer holds is the claim below that the
> community "cannot be called BestInsurance Research" *because a reader must be
> able to tell which origin they are standing in* - the reader now tells the
> layers apart by what the page discloses, not by what it is called. Section 2's
> load-bearing reason survives the rebrand and is restated in `BIRCH.md`
> section 2 as a rule the build can check.


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

### Decided 9 September 2026: Birch, at birch.insure

It clears all three constraints. It is not the Record. It carries no verb of
selling. And it claims no official standing - which was the constraint most at
risk, because the pull toward sounding like a regulator is strongest when the
goal is to sound impartial. It is a place, which is what a community has
instead of a job title, and the paper birch is the tree the estate's visual
system already comes from.

**The reservation stands and is worth keeping written down.** `.insure` is a
TLD that carriers and agencies buy, and this property's entire value is being
visibly independent of both. That is a real cost and the name does not pay it;
the site does. No agency branding anywhere, a footer that states plainly it is
not an insurer, an agency or a regulator, and a suite that fails the build if
any of that appears. A `.com` would carry the point without needing the
mitigation and is worth taking if the word is obtainable - as an upgrade rather
than a correction, since changing the origin is two lines and a wordmark.

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

## 12a. What is built, as of 9 September 2026

The scaffold exists. `commons/` in this repository is a second Astro project
with its own `package.json`, its own build and its own suite, deployed as its
own Vercel project to its own origin. One repository, two properties, and no
shared build output.

**Named on 9 September 2026: Birch, at birch.insure.** The name and origin live
in `commons/src/config/commons.ts`, once, and every page, the wordmark, the
canonical URLs and `llms.txt` read from it. Naming it lifted the `noindex` and
the `robots.txt` disallow automatically, because both were keyed off the
placeholder origin rather than set by hand, and it brought in the sitemap -
which had been held back precisely because it would otherwise have advertised
URLs on a host that does not resolve.

One thing broke on naming and is worth the warning: **the origin was in two
files.** `astro.config.mjs` feeds the sitemap and `config/commons.ts` feeds
everything else, and only the second was updated - so the launch build served a
robots.txt pointing at a sitemap of URLs on the old placeholder host. Nothing
failed because nothing compared them. A test now does.

Built and passing 12 assertions:

- **The visual separation from section 11.** Cool grey paper against the
  Record's cream, a dark masthead where the Record's is light, and no gold
  token defined at all. A test fails the build if any of the Record's four gold
  hex values or a `--gold` reference reaches the output.
- **The absences that justify the separate origin.** No agency name, no licence
  number, no phone, no address, no handoff. Asserted against the literal
  strings on every file in the build, because a footer copied from the Record
  in a hurry is exactly how one would arrive.
- **`reports`, the collection.** The `examples` schema with the two changes
  section 4 specifies and no others: `sourceIds` optional, renamed
  `citesRecord` because the documents live on the other origin, plus a
  `contributor` block. `cannotGeneralize` keeps its floor of three.
- **`annotations`, defined and deliberately empty.** Section 13 gates
  practitioner annotation on the Record's licensed review, and the schema
  existing is not the mechanism launching. It requires a verified licence by
  refinement, so an unverified annotation cannot validate.
- **No mechanism to upload anything.** Not a setting: there is no file input in
  the output and no field in the schema, and both are asserted. A field that
  was never built cannot be quietly filled in by a later form, which is the
  only version of that promise worth making.
- **The verdict prohibition as a lint.** Six patterns matched against every
  report, as a backstop under moderation rather than a substitute for it. It is
  also asserted to appear on the three pages a contributor actually reads.
- **Machine records.** A JSON companion per report carrying `truthModel`, so a
  system reading it knows it has an attributed human account rather than a
  statute. `llms.txt` states the truth model and the one-way relationship.
- **Withdrawal renders rather than deletes.** A withdrawn report keeps its
  address and says what happened to it, because a citation that silently 404s
  is worse for the person who relied on it than one that explains itself.

One report is published, labelled `hypothetical`, saying in its own text that
it did not happen. It exists so a contributor can see a finished report before
writing one and so the pages and machine records around it are real rather than
mocked. The home page counts constructed illustrations separately from real
accounts and says there are none of the latter, because "1 published report"
would have been the first misleading sentence on a site whose whole proposition
is that it is not misleading.

### Accounts, built 9 September 2026

Sign-in works. The Commons is now `output: 'static'` with a Node adapter, so
every page stays prerendered except the four that opt out - sign-in, verify,
sign-out and the account page. A report and the standards are files, because
they do not depend on who is reading.

**Magic link, no password.** A password is a second secret to store, leak,
reset and reuse across sites, and the email round trip verifies the same thing
either way. What that buys is that the account table has no password column to
be dumped.

Six rules hold the flow up, and each is asserted in `verify-auth.mjs` rather
than trusted to a comment:

1. **Only hashes are stored.** The emailed token and the session cookie are
   random 32-byte values; the store holds SHA-256 of each. A test proves the
   point by address rather than by inspecting internals - looking a row up by
   the raw value finds nothing, while the flow that hashes first works.
2. **A link works once, for fifteen minutes,** and is spent by being followed
   even when it turns out to be expired. Email is forwarded, screenshotted and
   followed by scanners.
3. **Sign-in never reveals whether an address has an account.** Same page for
   a valid address, an unknown one, a rate-limited one and a malformed one.
   Otherwise the form is an oracle for "does this person contribute here",
   which on a site about people's insurance problems is a real disclosure.
4. **Five links per address per hour,** counted from an issue log rather than
   from outstanding tokens - a consumed link is still a message that was sent,
   and counting token rows would reset the limit every time somebody signed in.
   There is a test for exactly that bug.
5. **Origin is checked on every state-changing request,** and the cookie is
   HttpOnly, SameSite=Lax and Secure on https. Astro's own origin check fires
   first, so a cross-site POST is refused twice independently.
6. **A GET never signs anyone out.** A link anybody can put anywhere that logs
   somebody out is a small harm with no upside.

**The store is an interface, and that is the auditable part.** `src/lib/store.ts`
is the entire permitted surface of what the Commons may remember about a person,
and it fits on a screen. `schema.sql` reads as a list of what is not there: no
column for a policy number, a claim number, a date of birth, a government
identifier, health information or a payment method, and no table for a file. A
test greps both for those names. A field that was never built cannot be quietly
filled in by a well-meaning form later, and `/account` shows the reader the
whole record rather than a summary of it.

**What is verified and what is not.** Everything above the store is exercised:
the flow runs against `memoryStore` in 17 assertions, and the whole thing was
run end to end against a live server - link issued, session opened, replay
refused, display name saved, sign-out clearing the cookie. `store-postgres.ts`
is **unexercised**: there was no database to reach. The conformance block at
the end of `verify-auth.mjs` runs the same operations against a real one when
`COMMONS_DATABASE_URL` is set, and skips loudly when it is not. Run it once
against a scratch Neon database before opening sign-in to anybody.

**To turn accounts on:**

1. Create a Neon database and apply `commons/schema.sql`.
2. Put `COMMONS_DATABASE_URL` in `commons/.env.local`.
3. Create a Resend key and a verified sender; add `RESEND_API_KEY` and
   `COMMONS_MAIL_FROM`.
4. Run `npm run verify` with `COMMONS_DATABASE_URL` set, to exercise the SQL.
5. Send yourself one sign-in link before anybody else gets one. The Resend
   integration has never made a live call.

Without a database the in-memory store runs the whole flow locally, which is
what makes this reviewable at all. **In production the absence of either a
database or a mail key is a hard failure at boot**, deliberately: an in-memory
store on a serverless platform gives each instance its own idea of who is
signed in, and a console mailer in production prints session-granting links
into a log.

### Case reports and the queue, built 9 September 2026

Mechanism 5.1 works end to end. A signed-in contributor writes a report at
`/contribute/new`, it lands in a queue, a moderator decides, and an approved
one becomes a report record.

**Published reports are files, not rows.** Submissions live in the database;
the queue emits a `src/content/reports/<slug>.json` for commit. That is more
work per report and it is the right trade: published content in git gets
version history, a reviewable diff and a correction trail that keeps the prior
wording, which is the discipline the Record runs on. It also means a reader
never depends on the database being up, and that there is one source of truth
for what is published rather than two that can disagree. The generated file was
dropped into the collection and built during this pass, so it is confirmed to
satisfy the `reports` schema rather than assumed to.

**What the contributor is asked, and what they are not.** The form asks the six
fields in plain language plus state, line and date. It does not ask for the
`label` or the `provenance`, and that is deliberate: a person describing their
own situation is not the best judge of what kind of evidence it is, and
provenance records *what a moderator checked*, which the contributor cannot
testify to. `cannotGeneralize` is asked for, with the floor of three, because
somebody who cannot name three reasons their situation is particular has
usually not finished thinking about it - and the alternative is a moderator
inventing limits on an account they did not live.

**The verdict check flags, it does not block.** Seven patterns run over every
field at submission time. A match is stored and shown to the moderator, and the
contributor is told it was flagged. It is not a rejection, for one reason worth
keeping: *"the adjuster told me it should have been covered"* is a report of
what somebody said, which is exactly the kind of fact this site wants, and no
pattern can tell that from a verdict. A person decides, and a false positive
must not cost somebody the twenty minutes they just spent.

**Moderator status comes from `COMMONS_MODERATORS` and from nowhere else.** No
page grants it, no field on the account form sets it, and a test fails if any
page ever assigns it or writes `kind: 'staff'`. The whole privilege-escalation
surface of the application is a deployment setting. A signed-in non-moderator
gets a 404 rather than a 403 at `/moderate`: telling a stranger that a queue
exists there, and that they are merely not allowed in, is information they have
no use for.

**Sending it back is the common case.** Most submissions will be incomplete
rather than wrong. `needs-more` and `declined` both require a note to the
contributor, enforced, because a decision that goes back with no reason is how
somebody stops contributing.

Set `COMMONS_MODERATORS` to the reviewer's address to open the queue.

### Withdrawal, built 9 September 2026

Section 8 promised withdrawal "at any time, for any reason or none", and four
pages repeated it. **Nothing on the site could do it.** A promise with no
mechanism behind it is the defect this estate treats most seriously, so closing
it came before the next mechanism.

Two paths, because a published report is a file rather than a row:

- **Unpublished** - pending or sent back - is withdrawn on the spot. Nobody has
  read it and nothing is live.
- **Published** is recorded as a request, which puts it at the top of the
  moderator's queue with the filename to edit. The report stays up until the
  file changes, and the contributor is told exactly that rather than shown a
  confirmation that is not yet true.

**Nothing asks why.** There is no textarea, no confirmation step that argues,
and no reason field anywhere in the route - and a test asserts the function
signature has nowhere to put one, so a later page cannot start requiring a
justification without that failing. "Or none" is the part of the promise most
easily lost.

**A withdrawal never overwrites a moderator's decision.** They are separate
fields with separate timestamps, because a report a moderator declined and one
its author withdrew are different things and one state field cannot say which
happened. `publishedSlug` is recorded at publication for the same reason: a
moderator handling a withdrawal has to be told which file to edit, and "find it
by title" is how the wrong one gets edited.

Somebody else's submission returns 404 rather than 403, so the endpoint cannot
be used to test whether an id exists.

One wording fix came with it. `/moderation` said "a contributor may have their
account withdrawn at any time" - written before user accounts existed, and now
reading two ways. It says *report*, and says plainly that withdrawing one does
not close the account.

**Still not built:** practitioner annotation (gated on the Record's licensed
review) and open discussion (last, and waiting on the first two being worth
reading).

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
