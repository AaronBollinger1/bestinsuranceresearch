# Implementation Audit

What the project was, what it is now, what was kept, and what was deliberately left undone.

Last updated: 2026-09-02

## The starting point

The existing build was a well-made site for a different product. It was structured as a
**research desk with a lead pathway**: `/research`, `/data`, `/industries`, `/partners`, one
partial tool, and a homepage whose first screen was a 4rem marketing headline over a search
box, with demonstration data presented in a "California property signal board".

It was competent and coherent. It was not the product the brief describes, which is an
evidence-led library where the first screen is the working surface and every claim carries a
source you can open. It then moved further still, to an advisory instrument built on that
library. See **The repositioning** below, and `POSITIONING.md`.

So this was a restructure, not a redesign. The audit's job was to work out what survived that.

## Retained, because the audit found it stronger than a rewrite

| Kept | Why |
| --- | --- |
| **Font system** (Newsreader / Schibsted Grotesk / IBM Plex Mono) | Working, well-chosen, and self-hosted. The brief said keep it unless the audit proved it broken. It was not broken. The only change was giving mono a semantic job: if it is set in mono, it is a fact *about* the content. |
| **Core palette** (ink, cream, paper, gold, green, blue, rust) | Already a restrained multi-colour system rather than the one-hue themes the brief rules out. Formalised into tokens and extended with amber and slate for the status vocabulary. |
| **Gold as the single primary action colour** | Correct instinct. Made a rule: gold is never used for status, so an action can never be mistaken for a state. |
| **`BaseLayout` metadata pattern** | Canonical URL derivation, environment-gated noindex, OG and Twitter tags, and a JSON-LD slot. Sound structure; extended rather than replaced. |
| **Bollinsure handoff attribution** | The original already carried only anonymous fields. Kept the idea, tightened the implementation: every parameter is now validated against a slug pattern before it is set, and a test walks every built page asserting no other parameter can appear. |
| **`siteConfig` operator block** | Legal name, DBA, agency licence, producer licences. Correct and load-bearing for the disclosure requirements. |
| **`vercel.json` security headers** | Already right. Untouched. |
| **Print styles and reduced-motion handling** | Both already present, which is rare. Extended to the new components. |
| **Environment separation** via `PUBLIC_SITE_ENV` | The right mechanism. Made stricter: analytics now require production **and** an explicit container id. |
| **Editorial policy language** | The original `/methodology`, `/editorial-policy`, `/privacy`, and `/terms` had genuinely careful wording about sources, reviewers, and limits. Kept the substance and expanded it, rather than starting from a template. |
| **Identity assets** | Verified byte-identical to the approved folder. `site.webmanifest` had been edited to site colours; restored to the approved version and the `theme-color` meta aligned to match. |

## Changed

### Information architecture

Rebuilt around entities and questions rather than a publication chronology.

`/`, `/ask`, `/insurance`, `/companies`, `/states`, `/questions`, `/tools`, `/examples`,
`/sources`, `/about`, plus `/rss.xml`, `/sitemap-index.xml`, `/llms.txt`, `/llms-full.txt`,
`/robots.txt`, and `/search-index.json`.

Retired: `/research`, `/data`, `/industries`, `/partners` and its five sub-pages. Their content
either had no sourced backing or belonged in the new structure. **Redirects for these paths
must be configured at deploy time**; they are listed in `LAUNCH-GATE.md` rather than
implemented here, because this build has never been deployed and so has nothing to redirect
from.

### Content system

The largest change. Hardcoded page content became eight typed collections with build-time
validation, and citation resolution became a build error rather than an editorial habit.

- 244 source records, from over 100 distinct publishers.
- Over 1,400 individually-recorded claims, each stating exactly what its source supports.
- 1,680 citation markers in page prose, every one resolving, plus every rule detail.
- 12 questions, 6 coverage pages, 3 organizations, 3 states, 4 examples.
- 8 live advisory modules (231 fields, 231 rules), 3 worksheets, 16 tools specified.

Source composition: 65 statutes, 49 official documentation, 47 regulator guidance, 25
regulations, 24 policy forms, 7 government data sets, 6 secondary analyses, 2 regulator
records, 2 legislative records, 1 court decision.

### Design

- Homepage h1 reduced from 4rem to 1.75rem and rewritten as a scope statement. The first screen
  is now a working surface: question field, four context selects, browse row, and a
  source-quality strip counted from the registry.
- Page sections became unframed full-width bands. Cards are now reserved for four things:
  repeated results, source records, examples, and framed tools.
- Radii capped at 8px throughout.
- The demonstration "signal board" was removed. It was fabricated data presented visually, and
  no amount of labelling makes that a good idea on a site whose entire proposition is
  provenance.
- Status became a three-part signal (icon, text, colour) so it survives greyscale and
  colour-blind viewing.

### Analytics

Previously GTM loaded whenever `PUBLIC_GTM_ID` was set, including in preview. Now it requires
production **and** an id, and every payload is filtered against a published contract with
closed vocabularies before it can be sent. A free-text value cannot pass the filter, because no
vocabulary accepts one.

### Privacy

The question-handling path was rebuilt. Forms hand the question to `/ask` through
`sessionStorage` rather than the query string; if a question arrives in a URL anyway it is
honoured once, then stripped, and the visitor is told. The lookup runs entirely in the browser
against a static index.

## Content production, and what adversarial review caught

Content was produced in five passes. The passes are documented because the defects each one
caught are the argument for keeping them.

1. **Research.** 18 topic clusters, primary sources located and fetched, claims mapped.
2. **Adversarial verification.** An independent pass instructed to *refute* rather than
   confirm: re-fetch every URL, check every listed claim.
3. **Remediation.** Every finding fixed.
4. **Second adversarial re-check.** A fresh skeptic on the remediated files.
5. **Precision pass.** The residual defects, worked individually.

That structure was not ceremony. A representative sample of what it caught:

| Found | Where | Why it mattered |
| --- | --- | --- |
| **Florida's PIP repeal was vetoed, not enacted** | State page | The draft cited a 2025 bill that died and implied repeal was pending. The 2021 bill that actually passed was vetoed. Stating this wrong would misinform every Florida reader. |
| **California's auto minimums were attributed to the wrong bill** | State page | SB 1107 set the amounts, but AB 1140 amended the section before they became operative on January 1, 2025. The draft credited SB 1107 alone. |
| **A superseded CEA policy form edition** | Earthquake question | The draft quoted BEQ-3B 01-2019. The current edition is 01-2026. Every quoted clause was re-extracted from the current form. |
| **A fabricated funding claim** | CEA organization page | The draft stated the CEA "receives no money from the state budget". The page does not say that. Deleted. |
| **A fabricated regulator rationale** | Replacement cost question | The draft attributed a reason to the CDI for a terminology change. The CDI gives no such reason. Deleted rather than softened. |
| **TWIA's flood requirement stated unconditionally** | Texas state page | The plan's own page conditions it on the property being able to obtain NFIP flood insurance. Dropping the condition turned a conditional requirement into an absolute one. |
| **An omitted statutory branch** | Replacement cost question | Title 10 CCR 2695.183(g) has three timing branches plus an exception; the draft stated one clock. A reader acting on the wrong branch would miss a deadline. |
| **A misstated form section** | Commercial property coverage | The draft described definitions in CP 10 30 09 17 section G that are not there. |
| **An NFIP condition missing its second branch** | Same-limit question | The 80-percent replacement-cost test also has a "maximum amount of insurance available" branch. |
| **A CIGA exclusion quoted without its exception** | Same-limit question | Insurance Code 1063.1 excepts workers compensation benefits and unearned premiums from the $100 exclusion. |

Every one of these reads as authoritative in a draft. None would have been caught by a spell
check, a link checker, or a schema validator.


## The repositioning

Partway through, the direction changed: from a research library with tools appended to an
**advisory instrument with a research engine underneath**, with each specialty domain becoming
its own module inside one master tool. That is a different product, not a different skin, and
it is recorded in `POSITIONING.md` with the reasoning.

What it changed:

| | Before | After |
| --- | --- | --- |
| The product | A library. Tools were a secondary section. | The Coverage Position. Research is the evidence layer under it. |
| What a visitor leaves with | An answer they read | A position they hold, and open items they can act on |
| Value over time | Flat. Each visit is a fresh read. | Compounds. Each module adds to the same object. |
| The specialty domains | 301 to a coverage page or a parked tool | 301 to their own live module, six of eight now live |
| Primary nav | Ask first | Position first |

### What was added

- **`src/lib/position.ts`**: the typed Position object, the deterministic rule evaluator, the
  completeness calculation, and `validateModule()`, which is the boundary expressed as code.
- **`src/lib/position-store.ts`**: local-only persistence. One key, one object, no server call.
- **A `modules` content collection**: 8 modules, 231 fields, 231 rules, all typed and validated.
- **`/position`**: the master instrument. Coverage map, open items ordered by severity, per-module
  completeness, a working kind filter, and a printable brief.
- **`/tools/[module]`**: one generic route that renders any module from its data. A new module is
  data, not code.
- **`src/styles/instrument.css`**: the second visual register. Denser, tabular, monospaced
  figures, severity as a visual grammar. Research pages keep the editorial rhythm.
- **`scripts/verify-instrument.mjs`**: 15 assertions specifically on the boundary.

### The distinction that made it coherent

Modules and worksheets are different things, and conflating them would have made the position
meaningless. A module assesses a line as a standing fact and writes into the position. A
worksheet does one job for one document in front of you now and writes nowhere. A specific pair
of quotes is not a standing fact about your coverage; a roof age is.

The three original tools became worksheets unchanged. They were already correct for that job.

### How eligibility, appetite, and pricing were resolved

The specialty domains are advertised on exactly the three things a public insurance page most
easily gets wrong, and the brief bars verdicts on all three. Rather than narrow the ask or
break the rule, each became an **evidence surface**:

- eligibility becomes placement **pathways** with published entry criteria and the deciding body
  named;
- appetite becomes carrier-authored documents, quoted and dated, never our summary;
- pricing becomes published filed-rate data with an explicit list of what each figure excludes.

Reasoning in `TOOL-REGISTRY-AND-ROADMAP.md`. The short version: an eligibility verdict on a
public page is wrong often enough to cost someone coverage, and it is not sourceable. A
pathway map is both defensible and more useful to a sophisticated reader.

### What the rule review caught

The modules went through the same adversarial cycle as the prose, and it was necessary. The
checkers raised 21 blocking findings across all six modules. A representative sample:

| Found | Why it mattered |
| --- | --- |
| A rule sourced to one CEA form fired for people who recorded a different form | It asserted what the reader's own policy does, for a population the source never covered |
| A claim widened from "included with every CEA homeowner policy" to "included automatically" | The page attributes it to homeowner policies; the rule used it for mobilehome |
| Superseded EEOC guidance presented as active authority | The reader would act on withdrawn guidance |
| A CISA control goal folded two separate goals into one | Misquoted a framework the module keys its whole output to |
| Rules on contract clauses routing to a broker | Contract interpretation is a lawyer's call, and the routing is the honest part |
| A property rule stating flatly that a homeowners policy does not cover flood | A coverage determination, which the boundary forbids outright |

None of those would be caught by a schema validator. All were caught by instructing a fresh
agent to refute rather than confirm.

### What is enforced mechanically now

`npm run verify` runs 60 assertions. Nineteen are specific to the instrument:

- no rule states an eligibility, price, appetite, or coverage verdict, checked twice by
  independent passes;
- no rule fires on an empty position;
- every rule is reachable, meaning some recorded state makes it fire;
- every referenced field exists, and every operator suits its field kind;
- every rule's sources exist and have built pages;
- no field collects an identifier or health information;
- every free-text field carries a privacy note;
- all five rule kinds still exist across the instrument;
- the position page states its boundary and refuses a risk score;
- citation markers on the position link to a source page, not to an anchor that is not there;
- every declared rule source is pointed at by a marker in that rule's own detail;
- every date comparison declares itself rolling, anchored, or field-to-field;
- no rule's prose states a date only the build date could produce;
- date arithmetic is calendar-correct across month-end and leap-year boundaries;
- every `rule-input` field is read by some rule;
- a rule asking for a legal conclusion routes to a lawyer or names one in its action;
- every live module is retrievable from its own name;
- a module with any rule problem cannot produce a page, checked during the build itself.

The reachability check earned its place immediately: it found that my own test harness could not
represent a rule with several conditions on one multiselect, which is how a rule says "this is
the only channel". The rules were right; the probe was wrong.

### Bugs found in my own work during this phase

- `/position` overflowed 150px at 390px and 172px at 320px. The six-option kind filter could not
  wrap. Fixed with a wrapping variant of the segmented control.
- `/position` emitted `#source-N` citation anchors while rendering no source ledger, so the
  markers pointed at nothing. Fixed by teaching the citer to emit absolute source links on
  surfaces that cite without a ledger.
- Four ids collided between the `tools` registry and the new `modules` collection, which built a
  page for a tool marked as not built. Resolved by removing the promoted entries from `tools`.

### The remediation pass, and what it exposed in my own work

The rule review was run as a separate adversarial cycle: a checker per module instructed to
refute, then a remediation agent per module. Twenty-one blocking findings were raised and fixed.
Twenty more came back marked advisory, and reading them was the useful part, because several were
not advisory at all. They were the same defect class the checkers had called blocking elsewhere,
plus one boundary violation and one engine gap that was mine.

**The engine gap.** Fifteen date comparisons across three modules were literals like
`lt 2025-08-31`, each computed from the build date. Every one was a rolling window written as a
fixed point, so all fifteen were wrong the day after the build — and by the time I found them the
build date had already passed. The schema permitted only a literal or a field reference, so there
was no way to express "twelve months before whenever the reader is looking".

The fix was to make the distinction explicit rather than inferable, which is what the rest of
this project does with everything else:

| Added | Means |
| --- | --- |
| `{daysFromToday: n}`, `{monthsFromToday: n}` | a rolling window, resolved in the reader's browser on the day they read |
| `{fixedDate, why}` | a date that genuinely does not move, and the reason it does not |
| `{yearsSince: y}` | whole years from a calendar year to this one, for the numeric form of the same bug |

A bare string on a date field is now a build error. Three things fell out of doing it properly:

- The old "+60 days" literal was **off by one**. The relative form is exact.
- The prose had the same defect and worse. Fourteen sentences read "falls before 2025-08-31,
  which is twelve months before today". With a rolling comparand those rules would fire correctly
  and then explain themselves with a wrong date, which is a worse failure than the original. All
  fourteen now state the interval. A test asserts that no rule's prose states a date which is not
  a cited source's publication date.
- `heating-cooling-years-since-update` was collected and read by nothing, while its sibling
  `electrical-years-since-update` carried the arithmetic. Adding the twin resolved both.

**The boundary claim that was not enforced.** Three documents stated that a rule turning on
contract interpretation or employment law must route to a lawyer, "asserted by the test suite".
No such test existed. That is worse than the missing check, because the documentation was
claiming mechanical enforcement that was not there. I wrote the test: a rule whose prose asks the
reader to obtain a legal conclusion must either route to a lawyer or name one in its action. It
found three rules; each now names the lawyer boundary while keeping the broker as the primary
route, because the broker is who places the coverage or the bond and the reading of the
obligation is not theirs to give.

The same audit found that `validateModule()` was called only from the verify script and never
during the build, while `CONTENT-MODEL.md` described its findings as build errors. It now runs
from both surfaces that render a module, so a module with a bad rule cannot produce a page. The
verify suite still asserts the same invariants against the built output, which is a second check
rather than a substitute. Wiring it in immediately failed the build with ten real problems.

**Triggers that fired for populations their statements did not cover.** Six rules, the same shape
each time: a condition written as "not none" that also admitted "not recorded", or "not all on
file" that also admitted "not applicable".

| Rule | Fired for | Said |
| --- | --- | --- |
| `earthquake-percentage-deductible-not-converted` | any answer but "none", including "not recorded" | what the CEA form does |
| `prior-audit-additional-premium-...` | including "we do not use subcontractors" | you have an open certificate gap |
| `prior-audit-reclassification-repeats` | including "partially" and "unknown" | your records do not separate activities, flatly |
| `fewer-classifications-than-activities` | a code count of zero, meaning no policy | you have fewer codes than activities |

**Populations that were getting nothing.** The mirror image, and the more interesting half. A
reader who had recorded a contractual cyber limit requirement but neither figure got no open item
at all, because the only rule on it was arithmetic and arithmetic needs both numbers. Two
documentation rules now cover that, and the three stages hand off cleanly: no figures, required
figure only, then the shortfall. The flood waiting-period rule fired only on "none", so the
reader with an urgent date and an unrecorded flood status — the most urgent version of the
problem — got nothing.

**Severity that outran its source.** Seven rules sat at high severity on the strength of the EEOC
promising-practices page alone, which states in terms that its practices are not legal
requirements under federal law. Severity is a claim about consequence, and a source that
disclaims being a requirement cannot carry that claim by itself. All seven are now medium.
Re-sourcing specific ones to state law, with a state gate, would justify restoring high, and that
is written down rather than assumed.

**Thirty-seven citations nothing pointed at.** Thirty-seven rules declared a source that no
sentence in the rule cited. They rendered in the ledger regardless, which pads the apparent
evidence base with something the reader cannot check — precisely the failure the marker system
exists to prevent. All thirty-seven were dropped and the reverse direction is now enforced. No
rule lost its last source, because no rule had a detail without markers.

**Noise that read as coverage.** Three cadence rules fired on a date alone, so a reader who had
recorded a control as absent got both "this does not exist" and "its annual cadence has lapsed".
Each is now gated on the control not being absent. Verified live: absent plus a stale date raises
the gap only; in place plus a stale date raises the cadence item.

### Test bugs I initially took for content bugs

Three, all in the reachability probe, and the pattern is worth recording because it recurred:
**the probe has to resolve a comparand through the engine rather than re-implement it.** When the
comparand became an object, the probe could no longer construct a satisfying value and reported
all fifteen migrated rules as unreachable. It now calls the engine's own resolver against a
pinned date, which also removed a latent midnight-UTC flake where the probe and the evaluator
could disagree about what day it was.

### One thing I broke and had to recover

While wiring the build-time validator I sliced `src/lib/corpus.ts` at an insertion point and
appended, discarding the five exported functions that followed. The type check caught it
immediately, with 54 errors naming the missing exports, and the file was recovered from the
session transcript rather than reconstructed from call sites. The restored version was diffed
against the current one to confirm the newer `loadCorpus` was kept, and separately checked to
confirm no module chunking had been lost — there had never been any, which is what led to the
next change.

### Modules were invisible to the lookup

Once the instrument became the product, a reader searching "how do I check my workers comp
classification codes" got research pages and no module. `chunkCorpus` had never indexed modules.
Each live module now contributes **two** chunks, one for its summary and one naming what it
records — deliberately not one chunk per rule, which would add several hundred near-identical
governance paragraphs and shift the score distribution the retrieval floors are calibrated
against. All six now surface for their own names, and the refusal behaviour is unchanged: "pet
insurance for a parrot" still tops out at 6.8 against a floor of 30.

The floors were not touched to make modules score better. A query like "cyber security controls
insurers ask about" reaches 26.0 and still refuses, which is the calibration working rather than
failing.

### Where it landed

| | |
| --- | --- |
| Modules | 6 |
| Fields | 201, of which 191 feed a rule and 10 are declared brief-only |
| Rules | 198 — 60 documentation, 53 question, 40 gap, 26 inconsistency, 19 timing |
| Severity | 92 high, 97 medium, 9 low |
| Assertions | 60, all passing |
| Pages | 302 |

## The specialty-line examples, and what was actually available to port

The brief for this pass was to finalize the line-of-business case studies and examples "ported
from bestepli, bestworkerscompensation, bestgroupbenefits, etc." The honest finding is that there
was nothing of that kind to port, and it is worth recording why.

| Source checked | What is actually there |
| --- | --- |
| `bestepli` repository snapshot | A quote-and-bind funnel: an in-browser premium estimate, then an application that fills an official carrier PDF, captures a signature, and emails the signed form. Marketing headings for the four claim types and the coverage enhancements. **No case studies.** |
| `best-cyber-liability` repository | A bare `.git` directory with no HEAD and no tree. Nothing to read. |
| workers comp, group benefits, HO3, dwelling fire, earthquake, art | No snapshot found anywhere on disk. |

Two things follow. First, this was authoring work rather than migration. Second, and more
important, the specialty sites' central asset is the thing this instrument's boundary forbids: a
premium estimate. A page whose value proposition is "instant estimate" cannot be ported into a
product that publishes no price, quote, or premium. What can be carried across is the subject
matter, not the mechanism.

So each specialty line got a worked example built the way the existing ones are built: read
published documents, attribute every sentence, state what was not read, and refuse the verdict.

| Example | Line | Label | Reachable from |
| --- | --- | --- | --- |
| The EEOC rescinded its harassment enforcement guidance in January 2026 | employment practices | public-record | `bestepli.com` |
| The breach clock is a ceiling, not a cadence | cyber | published-industry | `bestcyberliability.com` |
| A CEA percentage deductible is set by a limit on a different policy | residential earthquake | carrier-authored | `bestearthquakeinsurance.com` |
| The business is classified, not the individual jobs | workers compensation | published-industry | `bestworkerscompensation.com` |
| One contract sentence usually asks for three endorsements | general liability | published-industry | `/tools/contract-requirements` |
| The COBRA notice chain is three clocks owned by three parties | group health | published-industry | `bestgroupmedical.com`, when its module publishes |
| A fine arts floater is a classification question | scheduled personal property | published-industry | `bestartinsurance.com`, when its module publishes |

The strongest of these is the EEOC one, and it is worth saying why. Verifying it turned up a live
error in our own registry: a 1999 EEOC enforcement guidance was recorded as `active` while the
publisher's own page had carried a supersession notice since April 2024. Following the chain
showed that the 2024 replacement was itself partially vacated in May 2025 and then rescinded by
Commission vote in January 2026, so there is currently no EEOC enforcement guidance on workplace
harassment in force. An employer measuring its policy against that document is measuring against
something withdrawn. That is a genuinely useful, current, checkable finding, and it exists because
one source was re-read rather than assumed.

Three of the eleven examples were built on regulation text read from a third-party reproduction
rather than the publisher's own host, because the official host blocks automated fetching. Each
says so in its own `cannotGeneralize` list, and the source records carry `officialHost: false`.

### What was not built, and why

- **No group benefits module.** `bestgroupmedical.com` stays parked. The COBRA example gives that
  domain a destination with something read on it, but a module there carries the strictest privacy
  boundary on the site and is not started.
- **No valuables module.** `bestartinsurance.com` stays parked for the same reason.
- **No example carries the `anonymized-client` label**, and none should until a documented consent
  record exists. The eleven are 5 published-industry, 2 carrier-authored, 2 public-record, 1
  composite, and 1 hypothetical.

## The estate audit, and the compliance fixes it produced

The instruction was to audit every repo other than CovWell, BestAMS and Bollinsure, and bring the
insurance content across. The audit was run against GitHub and Vercel rather than against local
snapshots, which turned out to matter: the local copies were from June and the live sites had moved.

### What is actually out there

Fourteen repositories, of which eight are the specialty insurance sites. `best-os` is BestAMS —
it deploys to bestams.com and holds client PII behind a login — so it was excluded and not read.
All eight specialty repos are GitHub-linked Vercel projects, so a push to `main` deploys to
production. Nothing was pushed.

| Domain | Pages | What it carries |
| --- | --- | --- |
| `bestgroupmedical.com` | 127 | 35 guides, 27 geo, 13 carrier, 10 case studies, 3 sitemaps |
| `bestcyberliability.com` | 109 | wizard, carrier PDF, glossary and FAQ depth |
| `bestworkerscompensation.com` | 96 | 50 class-code pages, 8 case studies, wizard, PDF |
| `bestearthquakeinsurance.com` | 87 | 28 geo pages, 8 carrier pages, PDF |
| `bestepli.com` | 76 | two carrier applications, full e-signature flow |
| `bestho3.com` | 71 | wizard, ACORD 80 application, generator |
| `bestartinsurance.com` | 31 | 12 carrier pages, collector guides, Markel application |
| `bestdwellingfire.com` | 11 | shares the `best-ho3` wizard and form |

608 pages. That single table is why `DOMAIN-ROUTING-MANIFEST.md` was rewritten: the plan of record
was a 301 from six of these into a module, and two more parked. Redirecting
`bestworkerscompensation.com` would have retired 50 class-code pages for one form, and the two
domains marked "park because no destination exists" are in fact the largest and the eighth largest
properties in the estate.

### There were no case studies to port, and that is not what was wrong

The two repos that have case studies handle them very differently, and the difference is the
finding.

`best-group-medical` publishes ten of them correctly. Every page carries an explicit disclosure in
the owner's own words: "Educational examples only... They are not based on real clients or actual
transactions. All figures are representative market ranges."

`best-workers-compensation` published eight with no disclosure anywhere. They carry 90 dollar
figures and 20 percentages between them - premiums, experience modifications, claim reserves,
audit bills - under a "Reviewed by Bollinsure Insurance Services, CA Licensed Broker, License
#0D94699" badge, written in the first person about an engagement: "at the time of our engagement",
"their prior broker had never", "our engagement". Four also carried a quoted customer voice
attributed to "Business owner, name withheld", and one of those named a member of staff by first
name inside the quotation.

So the estate already had the right answer on one spoke and had simply not applied it on another.

### What was fixed

In a working copy, not pushed. Eighteen files across all eight repos.

| Fix | Where |
| --- | --- |
| The owner's own illustrative disclosure, adapted to the line, added to all 8 case studies and their index | `best-workers-compensation` |
| 5 attributed testimonial blocks removed | 5 of the 8 case studies |
| 5 first-person engagement phrases rewritten so an illustrative page no longer claims a real engagement | 4 case studies |
| "Return on investment... effectively unlimited" and "Cost of broker intervention: $0" rewritten | `roofing-mod-reduction` |
| Carrier-relationship promises replaced with what is actually the broker's to say | `best-art-insurance/carriers/markel.html` |
| Section 6 added to the existing `social-proof.test.mjs` guardrail | all 8 repos |

A disclosure does not cure a fabricated endorsement, which is why the testimonials were removed
rather than labelled. A figure on a page that says it is illustrative is a modelling assumption; a
quotation attributed to a person is an endorsement, and it is either real and checkable or it does
not belong there.

The Markel paragraph made four promises in three sentences: a volume claim, "faster turnaround,
more flexible terms" as a consequence of the relationship, indicative pricing "within 24 to 48
hours for collections of any size", and "we know how to get you the best terms they offer". A
broker can say who it submits to. Turnaround, flexibility and terms are the underwriter's to give.

### Why section 6 went into their file rather than a new one

All eight repos already run `scripts/social-proof.test.mjs` from `npm test`. It already enforces
that the Google rating and count agree estate-wide, that a producer licence is never presented as
the agency's licence, that the agency licence is never credited to a person, that a retired phone
number never returns, and that every page carries exactly one identified organisation node
parented to Bollinsure. Its own header explains why: a shared constant with nothing enforcing it
drifts, and it had drifted before.

Section 6 adds three rules in the same shape: every `case-studies/` page carries the disclosure; no
page carries an attributed quotation unless it also links the Google Business Profile so a reader
can check it; and no page carries unbounded promise language or claims a real engagement while
declaring itself illustrative. All eight repos pass, including `best-group-medical`, which passed
on its own merits without changes.

### What the audit over-reported, and why that is worth stating

The first pass flagged 393 candidates across 250 files. After reading them in context, roughly
eleven were real. The rest were false positives of a kind worth naming, because a compliance audit
that cries wolf is worse than none:

- "We saved your answers" in a quote wizard is not a savings claim.
- A 15% figure on the workers compensation pages is California Labor Code 4658.1, a statutory
  permanent-disability adjustment, not a premium result.
- "Estimated gross premium of $32,400" on a class-code page is labelled illustrative arithmetic
  about a rate, and is some of the most useful content on the site.
- `makesOffer -> Offer -> Service` is the canonical schema.org pattern for an agency describing a
  service. It carries no price and is correct.
- An `Offer` with `price: 0` on `email-security-check` describes a free tool, not free insurance.
- "We are appointed with a number of California workers compensation carriers" in a terms page is
  good disclosure, not an appetite claim.
- The `best-ho3` homepage testimonial reads as a genuine customer review and the page links the
  verifiable Google profile, so it passes section 6 rather than being deleted.

None of those was changed. 162 pages emit `FAQPage` structured data, which will not earn rich
results for a broker and is worth removing on SEO grounds, but it is not a compliance exposure and
was left alone.

### Still open

- **Whether the eight workers compensation scenarios were ever real.** They are now labelled
  illustrative, which is safe under either answer. If any was a real anonymized client, the
  disclosure needs to say that instead and a consent record has to exist. That is the owner's fact
  to supply, not mine.
- **Nothing is pushed.** Eight patches sit in the working copy. All eight repos auto-deploy from
  `main`, so merging is a production deployment and needs an explicit decision.
- **`bestdwellingfire.com`** is the one domain where consolidation is the honest answer: 11 pages
  sharing another site's wizard and form. Consolidate into `best-ho3`, or invest to parity.

## Verification performed

| Check | Result |
| --- | --- |
| `npm run check` | 0 errors, 0 warnings |
| `npm run build` | 279 pages |
| `npm run verify` | All assertions pass |
| Horizontal overflow, 27 routes at 1440/1024/768/390/320 | 0 of 135 combinations overflow |
| Heading-level skips | 0 across 27 routes |
| Standalone tap targets under 36px at 390 | 0 |
| Console errors | None |
| Citation markers resolving | 1,680 of 1,680 |
| Raw markers leaked into HTML | 0 |
| Internal links resolving | All |
| JSON-LD blocks parsing | All; no review, rating, price, offer, or FAQ schema |
| Preview noindex on every page | Yes |
| Retrieval: question findable by own title | 12 of 12, each ranking first |
| Retrieval: off-topic query refuses | Yes; verified against three off-topic queries |
| Client JavaScript shipped | 32 KB total across the whole site |

Two overflow bugs and two accessibility defects were found by this process and fixed: the
footer grid overflowed 31px at 390 on every page; the `/ask` example chips overflowed 136px;
`DataTable`'s mobile stack skipped a heading level; and `StateBlock` used an `h3` where the
page's first heading after `h1` needed an `h2`.

A retrieval relevance bug was also found and fixed: "pet insurance for a parrot" returned ten
confident results, all matching on the word "insurance". The fix added a distinctive-term
requirement and bounded the per-entry score accumulation, and the behaviour is now locked into
the test suite.

## Deliberately not done

| Not done | Why |
| --- | --- |
| **Deployment** | Out of scope by instruction. Nothing was deployed. |
| **Domain purchase, DNS, Porkbun changes** | Out of scope by instruction. `DOMAIN-ROUTING-MANIFEST.md` is a plan. |
| **Production analytics** | Out of scope by instruction. Specified only. |
| **Editing Bollinsure or BestAMS** | Out of scope by instruction. Neither was touched. |
| **Generative answers** | No model configured. `/ask` is a deterministic lookup. The seven preconditions for adding generation are in `AI-RETRIEVAL-ARCHITECTURE.md`. |
| **Embedding index** | 662 chunks. Lexical retrieval with the three corrections is measurably adequate, and a semantic layer would add a model version to maintain for no present gain. |
| **Google Places integration** | The previous build carried it for address autocomplete. No tool now accepts an address, so the dependency was dropped rather than carried. |
| **19 of 22 tools** | Specified in full, built as none. An empty tool route is worse than no route. |
| **FAQ schema** | Implemented in the schema builder, gated off everywhere. FAQ rich results are restricted to authoritative government and health sites; emitting it would be markup for markup's sake. |
| **A test framework dependency** | `scripts/verify.mjs` uses `node:test` and runs against the real `dist/` output. No new dependency, and the thing under test is the artifact rather than a mock of it. |

Dependency count is unchanged from the original build: six runtime, two dev.

## Known gaps, stated plainly

1. **No licensed review has happened.** All 35 content pages carry `reviewState: 'under-review'`
   and say so in public. This is the blocking gate in `LAUNCH-GATE.md` and it is the single
   most important open item.
2. **The Porkbun inventory was not ingested.** The read-only `list_domains` call was blocked by
   the session's permission policy. The manifest is built from the known inventory in the brief
   plus the stated routing direction, and it carries a reconciliation procedure that must run
   before any redirect is configured.
3. **Screenshots were reviewed, not archived.** Pages were rendered and inspected at every
   required viewport in a real browser, and the overflow, heading, and tap-target audits above
   are machine-verified across all 27 routes at all five widths. Image files were not written to
   disk. `npm run preview` plus the route list in `LAUNCH-GATE.md` reproduces the review.
4. **One source is superseded and two are not-adopted.** All three are intentional: a superseded
   authority is kept because answers that relied on it were accurate at the time, and a
   not-adopted bill is kept so a reader who encounters it elsewhere can see it never became law.
5. **Lighthouse and screen reader passes are outstanding.** The structural preconditions are
   met (32 KB of JavaScript, no hydration for static content, self-hosted fonts, no autoplay
   media, fixed-height skeletons), but neither has been run.

## Real content versus demonstration

**Real, sourced, and verified:** every question, coverage page, organization page, state page,
example, source record, and the checklist content of all three live tools. Every factual claim
traces to a fetched primary source. Nothing on these pages is placeholder.

**Illustrative by design, and labelled as such:** three of the four examples are composites or
hypotheticals, each carrying an explicit statement that no real client, policy, premium, or
claim outcome is described. The fourth rests on a public court record.

**Specification only:** 19 tool registry entries. They have no route and no sitemap entry.

**No placeholder content exists anywhere.** No lorem ipsum, no `href="#"`, no fake counts, no
fake ratings, no carrier logos, no testimonials. Asserted by `scripts/verify.mjs`.
