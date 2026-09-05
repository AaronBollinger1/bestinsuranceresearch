# Positioning

The decision, and the reasoning. Written before the build so the build can be checked against it.

Last updated: 2026-09-01

## The statement

> **BestInsurance Research is a public insurance advisory instrument.**
>
> It assembles your coverage position from modular, line-specific assessments, checks it against
> cited primary sources, and returns the gaps, inconsistencies, deadlines, and questions that
> follow. Every conclusion is traceable to the record behind it.
>
> It never prices. It never decides eligibility. It never asks who you are.

## What changed, and why

The previous positioning was a research library with tools appended. That is a publisher's
shape: the library is the product and the tools are a marketing surface hanging off it.

The instruction is the inverse. The **tool** is the product; the research is the **engine** that
makes it trustworthy. That is a different product, not a different skin, and it changes three
things structurally.

| | Library shape (before) | Instrument shape (now) |
| --- | --- | --- |
| What the user leaves with | An answer they read | A position they hold, and open items they can act on |
| What the research is for | The thing being consumed | The evidence layer under every conclusion |
| Value over time | Flat. Each visit is a fresh read. | Compounds. Each module adds to the same position. |

## The central object: the Coverage Position

Borrowed deliberately from finance. A *position* is what you hold, valued against what is
knowable, updated as facts change. That is the correct mental model for insurance, and nobody
in this category uses it.

The Position is a single typed object on the visitor's own device. Each module writes into it.
The engine reads the whole thing and returns **open items**.

```
Position
  profile   audience, states, family
  modules   per-module recorded fields, completeness
  derived   coverage map, open items, timeline, evidence
```

Because it is one object rather than nine disconnected forms, a fact entered in one module can
raise an open item in another. That cross-module inference is the actual product, and it is why
the modules must not be separate microsites.

## Why the subdomains become modules rather than sites

Each specialty domain gets **its own module with its own route, its own front door, and its own
independent advertisability**. `bestepli.com` lands on the EPLI module, which stands alone and
is genuinely useful on its own.

But it writes into the shared position. So a visitor who arrives from `bestepli.com`, completes
the employment module, and then notices the cyber module has three open items of its own has
been given more than the domain promised. That is the compounding mechanism, and it only works
if all modules share one object.

Nine separate microsites cannot do this. They would also split the search authority nine ways
and each would need its own review cadence. The routing table is in
`DOMAIN-ROUTING-MANIFEST.md`.

## What "infinite value" means honestly

The phrase needs a definition that survives contact with a regulator, so here it is. The value
compounds along four axes, none of which requires overclaiming:

1. **Breadth.** Each module added raises the value of every module already completed, because
   cross-module rules fire on the combination.
2. **Depth.** Each source added to the registry can raise open items across every module that
   touches it. 228 sources today; the rules are the multiplier on them.
3. **Time.** The position persists. A renewal next year starts from last year's position rather
   than from nothing, and change triggers fire on the delta.
4. **Provenance.** Every open item carries its citation, so the output is checkable rather than
   trusted. That is the only kind of advisory output that gets more valuable as the reader gets
   more sophisticated.

## The line that does not move

The product is an **advisory instrument**, not an underwriting engine. Five rules define the
boundary, and they are enforced in code and in tests rather than in policy:

| The instrument may | The instrument may not |
| --- | --- |
| Notice a **gap**: a described activity with no corresponding coverage recorded | State that a risk is eligible, ineligible, standard market, non-admitted, FAIR Plan eligible, insurable, or uninsurable |
| Find an **inconsistency**: arithmetic on two values the user entered | Produce a premium, price, quote, or rate estimate |
| Compute **timing**: dates the user entered against a cited deadline | State or imply what any carrier will write |
| Flag missing **documentation** a cited source says is required or commonly requested | Say a loss is or is not covered |
| Generate a **question** worth asking, and name who to ask | Assign a class code or any rating-bureau classification |

A gap finding is research, not underwriting: "you record design services and general liability
but no professional liability; these respond to different things, and here is the cited page
that explains why." That is defensible, useful, and checkable. "You qualify for the standard
market" is none of those.

Every rule is deterministic: exact comparison or arithmetic on recorded fields. No scoring, no
weighting, no probability. A rule that would need judgement is not a rule; it becomes a question
the module asks.

## The number we show, and the number we refuse

**Shown: information completeness.** The share of a module's fields the person has actually
recorded. It is honest because it measures their own input, not their risk, and it is useful
because incomplete information is the single most common reason a submission goes badly.

**Refused: any risk score, readiness score, or insurability index.** A single number purporting
to summarise someone's insurance risk would be the most valuable-looking and least defensible
thing on the site. There is no version of it we can source.

## Design consequence: fintech, specifically

"Fintech" is not a texture. It is a set of decisions that follow from showing someone their own
position:

- **A position header.** Persistent, compact, like an account summary: modules complete, open
  items by severity, last updated. It is the first thing on the surface and it is dense.
- **Tabular numerals, right-aligned figures.** Numbers that compare vertically. Already have
  IBM Plex Mono doing provenance work; it now also does figures.
- **Instrument cards.** Each module reads as a position line: name, completeness meter, open
  item count, last touched.
- **Severity as a visual grammar.** High, medium, low, resolved. Icon plus text plus colour, the
  same discipline already used for evidence status.
- **Higher density.** Smaller default type on the advisory surface, more rows per screen, less
  vertical air. The research pages keep the editorial rhythm; the instrument gets the ledger.
- **Deltas and state, not decoration.** No gradients, no orbs, no glass. The visual interest
  comes from information density, which is what actually makes a fintech surface feel serious.

The editorial voice stays on research pages. A person reading about earthquake statutes wants
prose; a person looking at their position wants a ledger. Two registers, one token set.

## Route structure

| Route | What it is |
| --- | --- |
| `/` | The question-first entry, unchanged, plus a route into the position |
| `/position` | **The master instrument.** Coverage map, open items, timeline, evidence, export. |
| `/tools` | The module index |
| `/tools/<module>` | One module. Standalone front door, writes into the position. |
| `/questions`, `/insurance`, `/companies`, `/states`, `/examples`, `/sources` | The research engine, unchanged |

`/position` is the product. The research routes are what make it worth trusting.

## What this positioning rejects

- **A chat interface.** It would promise a generative answer that does not exist here, and it
  would make the position invisible.
- **An account.** The position lives on the device. Adding accounts would convert a tool that
  collects nothing into a database of people's insurance problems.
- **A lead score.** The completeness number exists for the visitor, not for a sales queue. It is
  bucketed to the nearest ten before it can cross any boundary.
- **Nine microsites.** Covered above.
- **A risk score.** Covered above.

## How to tell if this worked

Not by traffic. By whether a person who completes two modules leaves with an open item they
would not have thought of, and can check the citation behind it in one click.

That is the test. `source_opened` on an open item's citation is the metric that measures it.
