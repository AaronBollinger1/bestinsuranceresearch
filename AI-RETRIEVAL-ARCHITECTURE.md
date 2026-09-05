# AI and Retrieval Architecture

What is built, what is specified, and the boundary that stops this becoming a chatbot that
guesses about insurance.

Last updated: 2026-09-01

## The governing decision

**No model is configured, and the lookup is not generative.**

`/ask` runs a deterministic lexical search over published, human-reviewed pages, entirely in
the visitor's browser. It cannot write an answer, because it has no model. When nothing in the
library supports an answer it returns *insufficient evidence* and says so.

That is a design choice, not a limitation waiting to be lifted. A generative layer over
insurance content fails in a specific, predictable way: it produces fluent prose that reads
exactly like the sourced prose next to it, and the reader cannot tell which is which. The
retrieval layer below is built so that a future generative layer *could* be added safely, and
the conditions for that are stated at the end. Until every one of them is met, the honest
product is a library lookup that admits what it does not know.

## What is built

### Normalized content store

Typed JSON collections under `src/content/`, validated at build time. `src/lib/corpus.ts` is
the single place that defines what "the corpus" means, so retrieval, the RSS feed,
`llms-full.txt`, the sitemap, and the build-time validator cannot drift apart.

### Chunking by claim and section

`chunkCorpus()` splits every entry along its own semantic boundaries, never by token window:

| Entry type | Chunk kinds |
| --- | --- |
| question | answer, assumption, reasoning (per paragraph), change, variability, action |
| coverage | definition, coverage-detail (per covered/excluded item), variability |
| company | entity |
| state | jurisdiction |
| example | example (per reasoning paragraph) |
| tool | tool |
| module | tool (two chunks per module: its summary, and what it records). 8 modules. |

730 chunks from 35 published entries and 6 modules. Each carries a stable id of the form
`<entryType>:<slug>#<kind>-<n>`.

**Why a module gets two chunks and not one per rule.** Until this change `chunkCorpus()` did not
index modules at all, so a reader searching for the thing the instrument does could not find it.
Indexing all 198 rules would have added several hundred chunks of near-identical governance prose
and shifted the score distribution the evidence floors are calibrated against, which would have
meant recalibrating the refusal behaviour in order to improve discoverability. Instead each module
contributes two chunks, one for its summary and one naming the groups it records, and its sources
are the union of what its rules cite.

The floors were not moved. All eight modules now surface for their own names; "cyber security
controls insurers ask about" reaches 26.0 against a floor of 30 and still returns insufficient
evidence, and "pet insurance for a parrot" still tops out at 6.8. A test asserts each live module
is retrievable by name, which is an assertion about the index rather than about the floor, so it
cannot be satisfied later by loosening one.

### Source ids on every chunk

A chunk's sources are the markers actually present in its own text. A chunk with no marker
inherits its entry's declared sources, so every chunk is attributable without inventing
precision about which specific source backs which specific sentence.

`validateChunks()` asserts that every chunk maps to at least one known, active source, and
`scripts/verify.mjs` re-asserts it against the built index.

### Deterministic filters

Exact, not fuzzy: family, line, state, audience, and effective date. A chunk with no state
applies everywhere; a state-specific chunk must match. The `asOf` filter excludes content whose
effective date is later than the date asked about, which is how a person checks what was true
at a past moment.

### Hybrid ranking

BM25 (k1 1.4, b 0.72) over folded lexical tokens, plus a bigram-overlap term standing in for
the semantic pass until a versioned embedding index exists. Then three corrections that matter
more than the base scoring:

1. **Coverage.** `0.3 + 0.7 * coverage^1.3`, where coverage is the share of distinct query
   terms present. A match on one term out of five is not a match.
2. **Distinctive-term requirement.** At least one matched term must appear in fewer than 25% of
   chunks, or the score is multiplied by 0.3. Without this, "pet insurance for a parrot"
   returns a confident page of results, all matching on the word "insurance". With it, that
   query correctly falls to insufficient evidence.
3. **Bounded support.** An entry scores as its single best chunk plus credit for other matching
   chunks, capped at twice the best chunk's score. Unbounded accumulation would rank a long
   entry above a short one that answers the question exactly, purely because it has more chunks
   to add up, and it would make the evidence floor drift as the corpus grows.

Exact alias or title matches get a bounded boost, so someone who types a canonical question
verbatim always lands on the canonical answer.

### Refusal path

Floors calibrated against the real corpus, measured rather than guessed:

| Best score | Outcome | What the reader sees |
| --- | --- | --- |
| 30 and above | `ok` | Ranked matches with their supporting source counts |
| 4 to 30 | `insufficient` | The closest records, explicitly labelled as not an answer |
| below 4, or no match | `no-result` | Nothing found, with browse and suggest-a-question actions |

Measured separation on the current corpus: questions the library genuinely answers score 49 to
94. Queries about topics it does not cover, but which share vocabulary with it, score 5.6 to
8.2. The floors sit in the gap, and `scripts/verify.mjs` re-checks that separation on every
build so a content change cannot quietly close it.

### Claim-to-source validator

`validateChunks()` reports four problem classes: no source, unknown source, inactive source
(superseded or unavailable), and stale source (past its review window). The stale check is what
propagates a source's age onto every page citing it.

### Privacy properties

The index is a static file. The browser fetches it once and runs every lookup locally.

- The question never reaches a server.
- The question never enters a URL. If one arrives in the query string (a no-JavaScript submit,
  a bookmark, an inbound link) it is honoured once, then stripped with `replaceState` and the
  visitor is told it was removed.
- Forms on other pages hand the question to `/ask` through `sessionStorage`, not the query
  string.
- Filter selections persist in `localStorage`. They are a controlled vocabulary, never text.
- No analytics event can carry the query. The contract filter drops any parameter not in a
  fixed vocabulary, and there is no vocabulary that accepts free text.

## What is specified but not built

### Versioned embedding index

Retrieval is lexical today, and the bigram term is an acknowledged stand-in for semantic
matching. A semantic layer would need: a pinned embedding model version recorded alongside the
index; per-chunk vectors regenerated whenever a chunk changes; the version published in
`search-index.json` so a stale client can detect it; and hybrid fusion with the lexical score
rather than replacement, because lexical matching is what makes an exact statute citation
findable.

It is not built because the corpus is 662 chunks. Lexical retrieval over a corpus this size,
with the three corrections above, is measurably adequate, and a semantic layer would add a
build dependency and a model version to maintain for no present gain.

### Answer generation, if it is ever added

Every one of these is a precondition, not a nice-to-have:

1. Generation may only cite source records that retrieval actually returned. No parametric
   knowledge.
2. A claim-to-source validator runs on the generated text before display, and any claim that
   cannot be mapped to a retrieved chunk blocks the answer.
3. Generated text is visually and semantically distinct from reviewed text, at every level:
   its own status, its own styling, its own machine-readable flag.
4. The refusal path is preferred over a weak answer, with the same floors as today.
5. Evaluation fixtures pass (below).
6. A named licensed reviewer signs off on the generation prompt, the refusal thresholds, and a
   sampled set of outputs before launch and on every prompt change.
7. An audit log records the retrieved set, the generated text, the validator result, and the
   reviewer decision for every generated answer.

Until all seven hold, `/ask` stays a library lookup. A partially-implemented version of this is
worse than none, because it looks the same to the reader.

### Evaluation fixtures

Specified, with the first three implemented in `scripts/verify.mjs`:

| Fixture | Asserts | Status |
| --- | --- | --- |
| Findability | Every published question is the top hit for its own exact title | **Implemented** |
| Refusal | Off-topic queries return insufficient or no-result, never confident hits | **Implemented** |
| Filter integrity | A family filter never widens the result set or leaks an entry | **Implemented** |
| Factuality | Sampled claims re-verified against their cited sources | Manual, per the review process |
| Citation correctness | Every marker resolves and its source supports the claim | Build-time for resolution; manual for support |
| State confusion | A California rule is never returned as the answer to a Texas question | Specified |
| Out-of-date content | A stale source is flagged on every page citing it | **Implemented** in the UI |
| Unsupported carrier claims | No appetite, rating, or ranking language | **Implemented** |
| Prohibited personalization | No output implies individualized advice | Specified |

### Editorial queue

Unanswered high-value questions are captured through the suggest-a-question action in the
no-result state, which is a plain email with no capture on our side. A structured queue with
demand signals is specified but not built, and it must not become a log of visitor questions:
the aggregate that matters is which topics have no page, not who asked what.

### Audit log

Draft, reviewer, source change, and publication status per entry. Currently carried by git
history plus the `reviewState` and `correction` fields. A dedicated log is specified for when
more than two people touch the corpus.

## Training and ingestion boundary

- **No private data.** Nothing here reads from, writes to, or is trained on Bollinsure or
  BestAMS records. Not intake, not email, not declarations pages, not the agency management
  system.
- **Public Bollinsure pages** may be indexed only as public, attributed sources, held to the
  same standard as any other source.
- **The podcast** is not mass-imported. An episode may be cited when it materially supports an
  answer, with a direct link to the canonical Bollinsure episode page. A transcript enters the
  corpus only after factual review, source mapping, and segmentation into claims.
- **Any future private retrieval system** stays separately permissioned and is outside this
  codebase entirely.

## For external AI systems

`/llms.txt` states scope, interpretation rules, and what the site deliberately does not answer.
`/llms-full.txt` is the full corpus index with every canonical URL, every source id, and the
dates that make the content interpretable. `/search-index.json` is the chunked index itself,
with source ids on every chunk.

The interpretation rules published there are not decorative. The most important:

- Do not present our content without its date. Most of it is time-sensitive.
- Where we hedge, the hedge is the finding. Do not strip it.
- A confidence status of `disputed`, `changing`, or `insufficient` is a material qualifier.
  Carry it through.
- Nothing here decides coverage or eligibility.
