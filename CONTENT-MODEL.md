# Content Model

The typed schema behind every page. The machine-readable version is
`src/content.config.ts`; this file explains why each field exists and what it is defending
against.

Last updated: 2026-09-02

## Principle

The model is built so that a claim without evidence is a build error, not an editorial
oversight. Every design decision below follows from that one idea.

Content lives in JSON data collections under `src/content/`, loaded by Astro's content layer
and validated by Zod at build time. The file basename is the entry id and the URL slug. There
is one canonical URL per entity and no near-duplicates.

## Collections

| Collection | Count | Route | Machine record |
| --- | --- | --- | --- |
| `sources` | 251 | `/sources/<id>` | in every citing page's `.json` |
| `questions` | 12 | `/questions/<slug>` | `/questions/<slug>.json` |
| `coverages` | 6 | `/insurance/<slug>` | `/insurance/<slug>.json` |
| `companies` | 3 | `/companies/<slug>` | `/companies/<slug>.json` |
| `states` | 3 | `/states/<slug>` | `/states/<slug>.json` |
| `examples` | 11 | `/examples/<slug>` | `/examples/<slug>.json` |
| `tools` | 16 | none. All specified, none published. | n/a |
| `modules` | 8 | `/tools/<slug>` | n/a |
| `people` | 2 | `/authors/<slug>` | n/a |

## Citation markers

Prose fields carry inline markers of the exact form `[S:source-id]`.

At render time `createCiter(sourceIds, context)` resolves each marker to its 1-based position
in that entry's declared `sourceIds` array and emits a numbered link to the source record on
the same page. Numbering comes from the declared array rather than order of appearance, so the
number next to a claim always matches the ledger position.

**A marker that is not in `sourceIds` throws and fails the build.** That is the mechanism that
makes "every citation number resolves to a visible source record" true rather than aspirational.

`scripts/verify.mjs` re-asserts it against the built HTML, and separately asserts that no raw
marker leaked into rendered output, which catches a field that was added to the schema but
never routed through the citer.

## Source

The most important collection. Everything else depends on it.

| Field | Why it exists |
| --- | --- |
| `title`, `publisher`, `url` | Identity. The URL is the citation of record and is never rehosted. |
| `sourceType` | statute, regulation, legislative-record, regulator-guidance, regulator-record, policy-form, government-data, official-documentation, court-decision, secondary-analysis. |
| `authorityLevel` | primary-law, regulator, standards-body, carrier-official, secondary. Drives the hierarchy in `EDITORIAL-AND-CITATION-STANDARD.md`. |
| `primary` | Whether it carries a claim or only explains one. A secondary source may never override a primary one. |
| `officialHost` | False when the text is a reproduction on a third party's site rather than the publisher's own. The words may be identical; the guarantee is not. See **officialHost** below. |
| `jurisdiction` | Two-letter state, `US`, or `n/a`. Prevents a state rule being cited as national. |
| `publishedDate`, `effectiveDate` | Accept `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, `unknown`, or `n/a`. An 1872 statute has no day, and inventing one would be fabricating precision. |
| `accessedDate`, `lastChecked` | Ours, so strict ISO. `lastChecked` drives the stale flag. |
| `claims` | **The load-bearing field.** The exact claims this source supports, each a full sentence, published verbatim on the page. If a sentence needs a claim that is not on this list, either the sentence is wrong or the source is wrong, and both are visible. Each claim is separately addressable; see **Claims** below. |
| `updateCadence` | How often this specific source needs re-checking. A statute and a consumer guide age very differently. |
| `status`, `statusNote`, `supersededBy` | active, superseded, `rescinded`, unavailable, disputed, `not-adopted`. See **Source status, and the chain** below; a non-active source must say why. |
| `archive` | Optional snapshot URL and capture date, where legally and technically appropriate. A link, never a rehosted copy. |

A superseded or unavailable source is never deleted. Answers that relied on it were accurate at
the time, and hiding that history would be a rewrite rather than a correction.

## Claims, and why the claim is the citable unit

There are 1,480 individually recorded claims across 246 source records. A claim is one sentence
stating exactly what one source supports and nothing beyond it. They are what every page is built
from, and they are the unit a citing party actually needs.

A page-level citation cannot be checked later, because the page may have been rewritten around
the sentence that was relied on. So every claim has its own address and its own checksum.

| | |
| --- | --- |
| Claim address | `/sources/<source-id>#c3`, the third recorded claim on that record. The anchor resolves to the sentence. |
| Checksum | The first 12 hex characters of a SHA-256 over the exact claim text. |
| Per-source companion | `/sources/<source-id>.json`, listing every claim with its address and checksum, plus the reverse dependency index. |
| Corpus index | `/claims.json`, normalized as a sources map plus a flat claims array, with the corpus distribution in its header. |

The checksum is the part a URL cannot express. It tells a citing party whether the sentence they
relied on still says what it said. A corrected claim is a different claim and gets a different
checksum, deliberately.

### What is deliberately not built

- **No page per claim.** 1,480 thin pages would be doorway pages by any current definition, would
  multiply the crawl surface for 340KB of text that is already published, and would separate a
  claim from the source context that makes it interpretable.
- **No `/claims/<id>` resolver.** It would create a second URI for something that already has a
  canonical one.
- **No `schema.org/Claim` or `ClaimReview`.** Both are fact-checking vocabulary and carry a
  verdict. This site records what a source supports; it does not adjudicate whether the source is
  right. Emitting either would be a false statement in markup about who is speaking, which is
  worse than emitting nothing. A test asserts neither appears anywhere.
- **No confidence, quality, or authority score per claim.** It would be the most
  valuable-looking and least defensible number on the site, and it is the same object the
  positioning refuses when it refuses a risk score.

### The reverse index

Every source record publishes what depends on it: each page, each worksheet, and each module,
with the count of rules involved. Most provenance systems answer "what supports this claim?".
Almost none answer "what breaks if this claim is wrong?".

That index was previously built inline on two pages and both copies omitted modules, so 23
sources whose only dependents were module rules said nothing cited them while 198 rules did, and
the registry page published "registered but not yet cited: 16" when the true figure was 1. There
is now one definition, `citingPages()` in `src/lib/corpus.ts`, and a test asserting that a source
cited by a module rule says so.

## Source status, and the chain

`status` is one of active, superseded, **rescinded**, unavailable, disputed, or not-adopted.

`rescinded` is not a synonym for `superseded`. Superseded says a replacement exists; rescinded
says the issuer withdrew the document and put nothing in its place. Calling a withdrawn guidance
"superseded" implies there is a current version to consult, and there may not be. That is the
same reasoning that put `not-adopted` on the list.

Two further fields make a status checkable rather than merely asserted:

- `statusNote` states why the status is what it is, in the publisher's own terms where possible.
  Required on anything that is not active, asserted by the test suite.
- `supersededBy` names the replacement where one exists, and the source page renders the
  replacement together with **its** status. A document can be superseded by one that has itself
  been withdrawn, and that is the state a reader most needs not to get wrong.

## officialHost

False when the text sits on a third party's site rather than the publisher's own. The words may
be identical; the guarantee is not.

Twenty-four records asserted official hosting while their own `publisher` field described them as
"reproducing", "republishing", "unofficial", or "copy hosted by" a regulator. A record that
contradicts itself on provenance is worse than one that says nothing, because a machine that
trusts the flag will cite a reproduction as authoritative. A test now rejects any source on a
known reproduction host, and any source whose publisher field describes itself as a reproduction,
that still claims `officialHost`.

## Question

The canonical unit. Structure mirrors the answer template exactly, so the page cannot drift
from the model.

- `question`, `aliases` - the canonical phrasing plus real alternates, used for retrieval
  intent matching.
- `shortAnswer` - two to five sentences, direct answer first, citations inline.
- `assumes` - what the answer takes as given. Makes the boundary of the answer explicit.
- `why` - the reasoning, paragraphs separated by a blank line, every material claim cited.
- `whatChanges` - the facts that would change the answer. This is what makes it research
  rather than a fact sheet.
- `variability` - state, policy-form, carrier, and factual variation.
- `nextActions` - concrete steps a person can actually take. Never "contact us".
- `confidence` - established, contextual, disputed, changing, insufficient.
- `reviewState` - reviewed, under-review, corrected. Plus an optional `correction` object
  holding the date, the prior wording, and the revised wording.
- `family`, `lines`, `states`, `audience`, `topics` - the deterministic retrieval filters.
- `companies`, `coverages`, `related` - typed cross-references. A dangling reference fails the
  build.
- `effectiveDate`, `lastReviewed` - when the answer became true, and when a person last checked
  that it still is. Two different questions, two separate fields.
- `author`, `reviewer` - both named, both required.
- `handoff` - whether a licensed review would genuinely help here, and why, in this page's own
  terms. Set to `false` where it would not.
- `schemaEligible` - gates structured data on visible content. `faqPage` defaults false and is
  currently false everywhere; FAQ rich results are restricted to authoritative government and
  health sites, so emitting it would be markup for markup's sake.

## Coverage

Every `commonlyCovers` and `commonlyExcludes` entry is an `{item, note}` pair, and **the note
must carry a policy-form caveat**. That structure exists specifically to make the caveat
unavoidable: there is nowhere to put the claim that is not next to the qualification.

Also carries `protects`, `limitsAndDeductibles`, `endorsements`, `relatedPolicies`,
`underwritingInputs`, and `stateVariations`.

### exposures and claimMitigation

Two required dimensions, minimum three entries each, both `{item, note}` pairs with the note
carrying the citation.

`protects` answers "what is this for". **`exposures`** answers "what goes wrong", which is the
question an underwriter is actually asking and the one a reader needs before they can judge a
limit. The distinction is not cosmetic: a page can describe a coverage grant accurately and still
leave a reader unable to tell whether the limit is sensible.

**`claimMitigation`** is what reduces the frequency or the severity of those exposures. It is the
field most likely to drift into selling, so the boundary is enforced rather than trusted.
`scripts/verify.mjs` rejects any of the following in either the item or the note: save, saving,
savings, discount, credit, rebate, "lowers your premium", "premium reduction", guarantee, "will
qualify", or a percentage-off claim. A mitigation is a thing a reader can do and a source can
support. Whether an insurer credits it is an underwriting decision and is not ours to state.

Every entry in both fields must cite a source the page already declares, which is asserted in the
record as well as thrown at render.

**Ratings are deliberately not a coverage dimension.** Financial strength is a carrier attribute,
not a line attribute, and the estate's policy is that a published rating is linked to the agency
that published it rather than summarised here. See the Company section.

## Company

Carries `whatWeDoNotClaim`, a required array of at least two explicit non-claims. It is the
only field of its kind in the model, and it is there because an entity page is the easiest
place on an insurance site to accidentally imply a rating, a ranking, or an appetite.

`naic` is optional and present only when verified. There is no ratings summary field, because
financial strength is linked to the agency that published it rather than summarised here.

## Lines of business

Four collections declare a line of business, and they had drifted into three vocabularies:
coverage pages used a short slug (`general-liability`), modules used a specific one
(`commercial-general-liability`), and examples used human phrases
(`commercial general liability`). Seventy-one distinct values were in use, most of them
space-and-hyphen duplicates of each other.

The visible consequence was silent. The "Worked examples on this line" section matched on exact
string equality, so **five of the six coverage pages showed no examples at all**. Only
`homeowners` worked, because it happens to be one word. Nothing failed; the section simply
rendered empty.

`src/lib/lines.ts` is now the single vocabulary. Every declared line resolves through
`canonicalLine()` to a canonical id; matching is done with `sharesLine()` on canonical ids; and
`scripts/verify.mjs` fails if any collection declares a line the file does not know. A new phrase
is a test failure rather than an empty section.

Aliases record the judgement calls, because collapsing two genuinely different lines would
surface the wrong examples: `property` resolves to `commercial-property`, `earthquake` to
`residential-earthquake`, `landlord` to `dwelling-fire`, `valuables` to
`scheduled-personal-property`, and `residential-property` to `homeowners` because the one example
using it means it as a synonym.

Two further assertions exist because the specialty domains depend on them. Every coverage page and
every live module must link to each example it shares a line with, and **every live module with a
specialty domain must have at least one worked example on its line** — a domain that redirects to
a page with no worked example arrives at an instrument with no evidence of it being used.

## Example

`label` is the load-bearing field: public-record, carrier-authored, published-industry,
anonymized-client, composite, or hypothetical. `labelNote` states plainly what the example is
and is not, and `provenance` gives either the citation or an explicit statement that no real
client, policy, premium, or claim outcome is described.

`consentRecord` is required when `label` is `anonymized-client`, asserted by
`scripts/verify.mjs`. Without a documented consent record, such an example cannot publish.

`decidedBy` must say what an authority actually decided, or say in terms that nothing was
decided and the example is illustrative only.

## Tool

One registry holds live, specified, and roadmap tools together. Only `status: 'live'` tools get
a route, a sitemap entry, or a navigation link, and `scripts/verify.mjs` asserts that a
non-live tool has no `route`, no built page, and no sitemap entry.

Every tool, built or not, must carry a full `spec`: user, input data, authoritative sources,
privacy boundary, decision rules, uncertainty, output, export format, accessibility states,
schema eligibility, review owner, and update cadence. A tool that cannot answer all twelve is
not specified well enough to build.

`items` holds the sourced checklist content and is empty for unbuilt tools, so a stub cannot
ship by accident.


## Module

The advisory instrument's unit. Eight live modules, 231 fields, 231 rules. Each writes into the
shared Coverage Position defined in `src/lib/position.ts`.

### Fields

`{id, label, help?, kind, options?, unit?, group, required, privacyNote?}`

`kind` is one of select, multiselect, boolean, number, date, text, band. Fields are grouped by
their `group` string, in authored order, and rendered generically: there is one
`ModuleForm.astro` and no per-module markup, so a new module is data rather than code.

`privacyNote` renders next to the control, not on a policy page. It is required on every
free-text field, asserted by `scripts/verify-instrument.mjs`, because free text is where
identifying information leaks in.

`purpose` is `rule-input` or `brief-only`. A `rule-input` field that no rule reads is a build
error. Twelve fields were being asked for and read by nothing before this existed, which is a
question asked for no reason and a dilution of the one number the instrument publishes. Ten of
those were genuinely context for the printed brief and now say so; one was a second ask for a
headcount already collected, and was removed.

### Rules

`{id, kind, severity, title, detail, action, when, sourceIds, relatedQuestion, routeToProfessional}`

`kind` is one of exactly five: **gap**, **inconsistency**, **timing**, **documentation**,
**question**. That list is the boundary. Anything outside it would be an underwriting judgement,
a price, or an appetite claim, and none of those can be sourced. See `POSITIONING.md`.

`when.all` is an array of conditions, each `{field, op, value}`. `op` is one of eq, neq, gt,
gte, lt, lte, includes, excludes, isSet, isEmpty. `value` may be a literal or `{field: "other-id"}`
for a field-to-field comparison, which is how an inconsistency rule compares a required limit
against a carried one.

### Comparing against a date

A date comparand may not be a bare string. That is not a style rule: a rolling window written as
a literal is computed once, when the rule is authored, and is wrong the next day. So a date
comparison has to declare which kind of claim it is making:

| Form | Means | Use for |
| --- | --- | --- |
| `{daysFromToday: n}` | n days from the day the reader is looking; negative is past | A sixty-day notification clock, a thirty-day waiting period |
| `{monthsFromToday: n}` | the same in calendar months, clamped to the last valid day | An annual or two-year training cadence |
| `{fixedDate: "YYYY-MM-DD", why: "..."}` | a date that genuinely does not move, and why | A statutory effective date |
| `{field: "other-id"}` | another recorded field | A required limit against a carried one |
| `{yearsSince: 1998}` | whole years from that year to this one, as a number | The age implied by a recorded construction era |

`yearsSince` exists because the same defect appears in numeric form: a rule reading "more years
since the update than the building has existed" was written as `gt 16`, which is this year's
answer and next year's error.

The prose has to match. A rule that fires on a rolling window and then explains itself with a
computed boundary date is worse than the frozen version, because the rule is right and the
sentence is wrong. `scripts/verify-instrument.mjs` asserts that no rule's title, detail, or
action states a date that is not a cited source's publication date. Say the interval.

Ordered comparisons work numerically, or lexically over ISO dates. An unanswered field never
satisfies a condition other than `isEmpty`, so a rule cannot fire on information the person has
not given.

`routeToProfessional` names who to ask: broker, insurer, lawyer, or accountant. Anything turning
on contract interpretation or employment law must route to a lawyer, asserted by the test suite.

### What the model enforces about rules

| Rule | Enforced by |
| --- | --- |
| Only the five permitted kinds | Zod enum |
| Every referenced field exists | `validateModule()` |
| An operator suits the field kind, for example no `gt` on a select | `validateModule()` |
| A select comparison names a real option, so the rule can actually fire | `validateModule()` |
| Every rule is sourced, unless it is pure arithmetic | `validateModule()` |
| Every `[S:id]` marker is in the rule's own `sourceIds` | `validateModule()` |
| No banned phrasing: eligible, uninsurable, premium, covered, risk score | `validateModule()` plus a second independent pass in the tests |
| Every declared source is pointed at by a marker in the rule's own detail | `validateModule()` |
| A condition on an option field names an option that exists, for eq, neq, includes and excludes | `validateModule()` |
| A date comparison declares itself rolling, anchored, or field-to-field | `validateModule()` |
| No rule prose states a date only the build date could produce | `scripts/verify-instrument.mjs` |
| Every `rule-input` field is read by some rule | `validateModule()` |
| No rule fires on an empty position | `scripts/verify-instrument.mjs` |
| Every rule is reachable: some state makes it fire | `scripts/verify-instrument.mjs` |
| No field collects an identifier or health information | `scripts/verify-instrument.mjs` |
| All five kinds still exist across the instrument | `scripts/verify-instrument.mjs` |

The reachability check matters more than it looks. A rule that can never fire is dead weight
that reads as coverage: the module appears to check something it does not.

## Position

Not a content collection. A runtime object, defined in `src/lib/position.ts` and held in the
visitor's own browser:

```
Position
  version   bumped when the shape changes; a stale record is discarded, never migrated
  savedAt   ISO timestamp
  profile   audience, states, family
  modules   per-module { fields, touchedAt }
```

One object, written by every module, read by the rule engine. That is what makes cross-module
open items possible, and it is the reason the specialty domains are modules rather than
microsites.

The only derived number is **information completeness**: the share of a module's fields the
person has recorded. It measures their own input, never their risk. `bucket` rounds it to the
nearest ten and is the only completeness value permitted to cross a boundary. There is no risk
score in this system and there is not going to be one.

## Build-time enforcement

| Rule | Enforced by |
| --- | --- |
| A citation marker resolves to a declared source | `createCiter` throws at render |
| A declared source exists in the registry | `ledgerFor` throws at render |
| A cross-reference resolves | Astro `reference()` validation |
| Required fields are present and well-typed | Zod schema |
| No raw marker in rendered HTML | `scripts/verify.mjs` |
| Content is ASCII | `scripts/verify.mjs` |
| A client example has a consent record | `scripts/verify.mjs` |
| An unbuilt tool has no route | `scripts/verify.mjs` |
| A rule stays inside the five permitted kinds | `validateModule()` |
| A rule references only real fields, with sane operators | `validateModule()` |
| A module with any rule problem cannot produce a page | `assertModulesValid()`, called from both module surfaces |
| Every live module is retrievable by its own name | `scripts/verify.mjs` |
| Every coverage page states at least three exposures and three mitigations, and renders both | `scripts/verify.mjs` |
| No claim mitigation promises a price, a saving, a credit, or an outcome | `scripts/verify.mjs` |
| Every declared line of business resolves to a canonical line | `scripts/verify.mjs` |
| Every coverage page and module links the examples it shares a line with | `scripts/verify.mjs` |
| Every module with a specialty domain has a worked example on its line | `scripts/verify.mjs` |
| Every source has a `.json` companion, and every claim an anchor and a checksum | `scripts/verify.mjs` |
| A non-active source says why, and names its replacement and that replacement's status | `scripts/verify.mjs` |
| No source claims official hosting while describing itself as a reproduction | `scripts/verify.mjs` |
| The corpus declares one Dataset whose distributions all resolve | `scripts/verify.mjs` |
| No fact-checking or commercial structured data anywhere | `scripts/verify.mjs` |
| No rule fires on an empty position; every rule is reachable | `scripts/verify-instrument.mjs` |
| Every entry names an author and a reviewer | `scripts/verify.mjs` |

## The one thing the model cannot enforce

Whether a source genuinely supports the sentence citing it. That is a judgement, and it is what
the named reviewer is for. The model's job is to make sure the judgement is always visible and
always attributable: the claim, the source, the claim list, and the reviewer's name are all on
the same page.

Every seed entry and every module currently carries `reviewState: 'under-review'` because that
judgement has not yet been exercised. For the modules it means 231 rules awaiting review, and
two checks a page does not need: whether the trigger matches the population the source covers,
and whether the action routes to the right professional. See `LAUNCH-GATE.md`.
