# Editorial and Citation Standard

The working standard. `/editorial-policy` is the public statement of it; this is the version
with the enforcement mechanics attached.

Last updated: 2026-08-31

## Source hierarchy

A claim is carried by the highest tier that actually supports it. A lower tier may explain a
higher one. It may never override one.

| Tier | What it is | What it can do | Recorded as |
| --- | --- | --- | --- |
| 1 | Statutes, regulations, regulator bulletins, official government guidance | Settles the question | `authorityLevel: primary-law` or `regulator` |
| 2 | Filed policy forms and official carrier documents | Describes what a contract says | `policy-form`, `carrier-official` |
| 3 | NAIC, state insurance departments, NCCI, WCIRB, CMS, DOL, IRS, FEMA, SBA, CFPB, SEC | Settles or strongly informs | `regulator`, `standards-body` |
| 4 | Official product or technical documentation | Authoritative about itself only | `official-documentation` |
| 5 | High-quality secondary analysis | May explain, may never override | `secondary`, `primary: false` |

A source read on a third party's site rather than the publisher's own records
`officialHost: false` and is flagged in public as a reproduction. The wording may be identical;
the guarantee is not.

## Citation rules

1. Every material factual claim maps to a source in the registry.
2. A citation is made after reading the source. Citing a search result, a snippet, or another
   article's description of a source is prohibited.
3. A source's `claims` array lists exactly what it supports. That array is published verbatim
   on the page. A claim not on the list may not be attributed to that source.
4. A marker that is not in the entry's `sourceIds` fails the build.
5. Where a claim needs legal force, it is carried by a statute, a regulation, or official
   regulator guidance. Not by a trade article that describes one.

## The failure classes

These are the specific ways insurance content goes wrong. Each was found and fixed during
adversarial review of this corpus, so the list is empirical rather than theoretical.

| Failure | What it looks like | The rule |
| --- | --- | --- |
| **Fabricated attribution** | A `[S:id]` pointing at a source that does not say that. | Re-fetch and read before citing. |
| **Citation overreach** | The source says something narrower than the sentence claims. | Narrow the sentence to the source, or find a better source. |
| **Uncited material claim** | A factual assertion with no marker at all. | Cite it or delete it. |
| **Universal policy language** | Describing one filed form's wording as what "the" policy says. | Name the form and edition, or say "many forms" plus "read your own form". |
| **Market practice as rule** | Common practice stated as a requirement. | Say "common market practice, not a rule" in those words. |
| **Omitted branch** | A statutory rule quoted without its exception or its second clause. | Add the branch. This is the most damaging class: a reader who acts on a rule without its exception has been actively misled. |
| **Statute outside its scope** | A definition that says "as used in this chapter" applied generally. | Confine it to its chapter. |
| **Legal conclusion from a clause** | Burden of proof or causation asserted because a form contains a clause. | The source supports that the clause exists. Nothing more. |
| **Coverage determination** | "This loss is covered" or "does not meet the trigger". | Describe what a form says and name who decides. |
| **Eligibility verdict** | Standard market, non-admitted, FAIR Plan eligible, bound, uninsurable. | Never. Describe pathways and the facts underwriting will weigh. |
| **Incomplete list as complete** | Four of five statutory items, presented as the list. | Add the fifth, or write "including". |
| **Invented precision** | A section number, date, amount, or statistic that was not read. | Never. If it cannot be verified, it does not publish. |

Fixing a defect by softening the wording while keeping the same citation is **not** a fix. It
converts a false statement into a vague one and leaves the citation lying.

## Language

- Direct answer first, then the conditions. Burying the answer under qualifications is a
  failure, not caution.
- Hedges (`often`, `may`, `commonly`, `depends on the policy form`, `carrier underwriting
  decides`) are used where they are the truth and never as filler. A hedge is a finding and
  carries the same evidentiary burden as an assertion.
- Confidence is stated explicitly: established, contextual, disputed, changing, insufficient.
- Where competent sources disagree, that is disclosed rather than resolved by preference.
- ASCII only. No em dashes, curly quotes, or typographic ellipses, asserted by
  `scripts/verify.mjs`.

## Prohibited absolutely

No page may: give legal, tax, medical, lending, investment, or claims advice; state that a
specific loss is or is not covered; state that a specific risk is eligible, ineligible,
standard market, non-admitted, FAIR Plan eligible, bound, or uninsurable; rank or rate an
insurer; publish a `best`, `cheapest`, or `most reliable` claim; publish a complaint statistic
without its denominator and date; or present any of the above as a conclusion the reader can
act on without an insurer or a licensed professional.

## The production pipeline

Content in this repository was produced by a five-pass process, and the passes are documented
because the defects each one caught are the argument for keeping them.

1. **Research.** Per-topic, primary sources located and fetched, claims mapped, prose drafted.
2. **Adversarial verification.** An independent pass instructed to *refute*: re-fetch every
   URL, confirm the page supports each listed claim, and hunt the failure classes above. This
   pass found fabricated attributions, misquoted form sections, unsupported legal conclusions,
   and one truncated bundle.
3. **Remediation.** Every finding fixed by citing properly, narrowing to the source, or
   deleting. Among other things this replaced a superseded CEA form edition with the current
   one and deleted a fabricated statement about an organization's funding.
4. **Second adversarial re-check.** A fresh skeptic re-read the remediated files and found 33
   residual defects across 14 of 18 clusters, mostly omitted statutory branches and scope
   overreach.
5. **Precision pass.** Those 33 worked individually against the primary sources.

Automation did the fetching, the extraction, the drafting, and the adversarial checking.
Automation did not decide what was adequately sourced, and it did not publish.

## Review

Drafting and review are separate functions performed by different people, and both are named on
every page.

- **Author** researches, finds sources, maps each material claim to the source that carries it,
  and writes. Owns citation accuracy.
- **Licensed reviewer** checks the insurance substance: terminology, form behaviour, whether
  the limits are stated honestly, whether the confidence status is justified, and whether
  anything reads as individualized advice or a coverage determination.

Review is required before publication and is a gate, not a formality. A page that has not been
reviewed carries `under-review` in public, on the page and in its machine-readable record.

**Every seed page currently carries `under-review`.** No licensed review has taken place. The
site does not claim one has. See `LAUNCH-GATE.md`.

## Corrections

A material correction is one that changes a conclusion. It publishes with its date, the prior
wording, and the revised wording, and the page carries `corrected`. The prior wording stays
visible: a correction that hides what was previously said is a rewrite.

Typography, formatting, and broken-link fixes are made without a log entry.

Reports arrive by plain email with no form and no capture, so a reader can report an error
without giving this site any personal data at all.

## Maintenance

Each source records its own `updateCadence`. A source past its window is flagged stale
automatically on every page that cites it, and the flag is not suppressible: a page cannot look
fresh while resting on a source nobody has re-checked.

When a source changes in a way that changes an answer, the answer is corrected and logged.
