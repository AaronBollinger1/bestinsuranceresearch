# Authority and Distribution Plan

How this site earns references. Nothing here involves buying a link.

Last updated: 2026-09-02


## The authority and citation strategy, front to end

The goal is to be cited: by people, and by answer engines. Those want the same thing, which is
convenient. A citation happens when someone decides this is the **cheapest correct thing to cite**
and the most expensive thing to contradict. Everything below reduces to that.

### The four layers, in the order they matter

**1. Entity. Who is speaking, and can it be established?**

This is the layer that was broken, and it was broken in the worst way: the property published a
producer's licence as the agency's on all 318 pages, and credited the entity licence to a named
individual. An answer engine that reads a licence number and attributes it to the wrong holder
does not produce a hedged answer, it produces a confident wrong one. Fixed 2026-09-02 and now
enforced by three assertions.

The organisation node also carried no `sameAs`, which made the hub the only property in the estate
that read as unaffiliated with the brokerage operating it. Nine sibling URLs are now declared, so
eleven properties sharing one phone number resolve to one business.

What still needs doing on this layer, and it is the highest-value remaining work:

- **A physical address and phone on the organisation node.** The estate publishes 3625 E Thousand
  Oaks Blvd Ste 292, Westlake Village, CA 91362 and a single number across eight sites. The hub
  emits neither. Entity resolution for a licensed broker leans on exactly this.
- **A Google Business Profile link.** The estate's only third-party validation is 18 Google
  reviews, and the specialty sites already assert that the rating must link to the profile so a
  reader can check it. The hub shows no rating and no link. It should show the rating it can
  verify, or nothing, and never a rating it cannot.
- **Consistent naming.** "BestInsurance Research" operated by "WJB Services, Inc. dba Bollinsure
  Insurance Services" needs to read identically everywhere, because an entity that names itself
  three ways is three weak entities rather than one strong one.

**2. Provenance. Can a claim be checked without leaving?**

This layer is genuinely strong and is the differentiator. 1,500 claims, each individually
addressable at `/sources/<id>#cN`, each with a checksum over its exact text, each tied to a source
record with publisher, dates, status, and whether the host is the publisher's own. Plus the reverse
index: what depends on this claim, which almost no provenance system publishes.

Two things still weaken it:

- **`lastChecked` is a bulk stamp on most records.** 242 of 251 sources carry one date from one
  pass. The site publishes that per source and drives a stale flag from it, so it asserts
  per-source verification that did not happen per source. Spot-checking four records found two
  material errors. Until a real sweep runs, the freshness signal is softer than it looks, and
  freshness is a citation input.
- **A claim must stand alone.** Claim-level citability raises the bar on each claim, and the auto
  minimums proved it: a claim reading "a further increase of $20,000" was accurate about the
  statute's increments and would have been read by any machine as the 2035 limit being lower than
  today's. Corrected. That failure mode did not exist before claims became individually citable.

**3. Access. Can a machine get in and know what it may do?**

Largely done, and verified in a production build: `robots.txt` allows crawling and names GPTBot,
OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, PerplexityBot, Google-Extended and
Applebot-Extended explicitly; `llms.txt` states how to cite, what the citable unit is, and what may
not be inferred; `/claims.json` publishes the whole corpus; every source has a `.json` companion;
the corpus declares itself as one `Dataset` with resolving distributions; `sitemap-index.xml` is
advertised absolutely and 288 URLs carry a real `lastmod`.

Deliberately refused, and worth keeping refused: `ClaimReview` and `Claim` structured data, because
both carry a verdict this site does not issue; `FAQPage`, which will not earn a broker rich results;
and any self-serving `aggregateRating`, which is disallowed markup and which the estate's own guard
already rejects for the right reason.

**4. Corroboration. Does anyone else point here?**

Zero, because nothing is published. This is the layer no amount of engineering substitutes for, and
it is where the redirect question actually lives.

## Layer 5: Discovery. Can a person find the answer, and want to send someone else?

Added 2026-09-02, after a front-to-end audit. The four layers above are about being **citable**.
This one is about being **referred to**, which is a different property and the one the brief
actually asks for. An answer engine cites a page; a person sends a colleague a link. The second
needs the site to be fast and pleasant to use, and it is the layer with the least built.

### What the audit found

Counted from the build, not estimated:

- **78 percent of the crawlable surface is source records.** 264 of 340 pages are `/sources/<id>`.
  They are the provenance layer working correctly, but they are derivative pages whose job is to
  point at someone else's document. The pages a person actually refers to — questions (13), tools
  (12), examples (12), coverage (9), guides (9) — come to 55 pages between them. For a citation
  property that ratio is fine. For a referral property it is backwards.
- **Twelve questions is not a corpus.** The search index holds 803 chunks, of which 12 are `answer`
  chunks. `/ask` is the front door, the homepage leads with it, and there are twelve answers behind
  it. This is the single largest gap between what the site promises and what it holds.
- **Retrieval is deterministic lexical, by design.** No model, no embeddings, no query logging,
  because nothing a reader types may leave their browser. That is the right call and should not be
  revisited. The cost is that recall depends on the asker using the corpus's own words. 77 aliases
  soften it. More questions and more aliases are the only honest levers available.
- **Results are not segmented by record type.** A lookup returns a flat list across coverage
  detail, reasoning, jurisdiction, example and answer chunks. A reader who wants the statute and a
  reader who wants the plain answer are served the same undifferentiated list.
- **There is no comparison surface.** The most common real question on this subject is
  comparative — homeowners against dwelling fire, general liability against professional
  liability, uninsured against underinsured — and the corpus holds the material to answer it
  structurally. Nothing renders it side by side.
- **Coverage pages do not link their own guide.** 0 of 8. The guides link up to the reference page;
  nothing links down. The newest and most linkable surface receives no equity from the pages that
  have it.

### One defect found and fixed in this pass

The homepage described the corpus as **"12 reviewed questions"** while all twelve carried
`reviewState: under-review` and rendered an UNDER REVIEW badge on their own pages. On a property
whose entire proposition is that a claim can be checked, overstating its own review status is the
worst available defect, and it is the same class of error as the licence inversion: the front door
asserting something the records do not support.

Corrected, and now guarded. The guard checks the class rather than the instance — for any
collection with zero reviewed records, no built page may use the phrase "reviewed <noun>" — and it
switches itself off per collection as soon as one record there is genuinely reviewed. It was
verified by reintroducing the defect and confirming the assertion fails.

### What to build, and the reference behind each

Design references were taken from a Mobbin pass on 2026-09-02, recorded in `DESIGN-REFERENCES.md`.
The type system and palette were not revisited.

| Surface | Reference | What it buys |
| --- | --- | --- |
| Result-type tabs with counts on `/ask` and search | [Codecademy docs search](https://mobbin.com/screens/eb89a750-8691-44c5-b9fa-87f7c364c43f) — a total result count, then `Courses / Articles / Docs` tabs with per-type counts | A reader choosing between the statute and the plain answer instead of scrolling one flat list. Cheap: the chunk `entryType` already exists. |
| "Reviewed only" filter | [Slite search](https://mobbin.com/screens/1593defe-aec1-49d2-abc2-37fc84dbd8ad) — typed facets plus a `Verified only` toggle | The review state is already on every record and is currently only decoration. As review lands, this becomes the highest-trust view of the corpus and the one to cite. |
| Related searches under results | [Confluence search](https://mobbin.com/screens/8cf8c9fd-cf5c-473f-b21f-2327ce2c8f02) — a chip grid of adjacent queries between result groups | Turns one query into a discovery graph. This is the cheapest available lever on long-tail citation: the aliases and `topics` fields needed to generate the chips already exist. |
| Command palette on every page | [Ferndesk](https://mobbin.com/screens/59f05a71-36d4-4f70-b956-cd5bc8d0f98d) and [StackAI](https://mobbin.com/screens/c20d3077-a7b2-4743-9b64-5dcc7230c00e) — overlay lookup with visible keyboard hints | Search is currently a header field that navigates away. A palette makes the corpus reachable from wherever the reader is, which is what makes a reference site sticky. |
| Coverage comparison, grouped by section | [Clockwise](https://mobbin.com/screens/6dfb7e0e-f5aa-43f5-a098-67de4cf6b776) — comparison rows grouped under section headers with sticky columns; [7shifts](https://mobbin.com/screens/0a9b21b2-170c-4eb4-b758-ead8060acd38) — collapsible groups, with one column marked as the reader's current position | Answers the comparative question the corpus can already support: one column per line, rows grouped as covers / excludes / limits, each cell citing. |

### The design constraint that comparison imposes

[NordVPN's feature table](https://mobbin.com/screens/9882de2a-0f73-4863-9d7b-d60ef2e73dd4) marks
every cell explicitly, with a cross rather than a blank where a feature is absent. For a pricing
page that is a polish decision. Here it is a correctness requirement, and it is the reason a
comparison surface is harder than it looks.

A blank cell in a coverage comparison is ambiguous between three completely different states:

1. the line **excludes** this, and a source says so;
2. the line **covers** this, and no source has been read yet;
3. the question **does not apply** to this line at all.

Reading (2) as (1) is exactly the failure this whole property exists to prevent. So the comparison
table needs a fourth mark — **not researched** — rendered as visibly as covered and excluded, and
it must never be collapsed into the same blank. That constraint is also what makes the surface
valuable: a comparison that admits what it has not read is more citable than one that implies
completeness it does not have.

### Sequence

The discovery layer is worth building **after** the entity work and **alongside** the question
corpus, not before either. A beautiful search over twelve answers is still twelve answers, and a
comparison table across eight lines with three states covered is mostly "not researched" marks. The
surfaces are cheap; the material behind them is the work.

## The no-pitch position, and what it changed

Recorded 2026-09-02 on the owner's instruction: the estate no longer takes application intake on
its public properties. The proposition is a reading with the evidence attached and nothing asked in
return. A person who wants licensed help calls a broker, calls in, or requests a quote from
Bollinsure.

### On this property it is structural, not a policy

The audit found the modules already collect nothing, and not by convention. The module form carries
no `action`, no submit control, and **not one of its 231 fields has a `name` attribute** — the
attribute a browser requires before it will include a value in a request. `FormData` over the form
returns zero entries. A person can fill in all 42 fields of the property module and there is no
mechanism, short of rewriting the page, by which any of it could leave the browser.

That is a stronger claim than a privacy promise and it is worth stating as such, so the module page
now says it in terms a reader can verify by viewing source. It is also now an assertion:
`no module can collect an application` checks every built module for a form action, a submit
control, and any named field, and checks that the page still tells the reader. Adding a `name`
attribute is a one-character change that would silently convert a worksheet into an intake form and
make a published statement false; that test is what stands between those two states.

### What the handoff says now

Three routes, in this order: **call a broker** (primary), **request a quote from Bollinsure**,
**email**. The disclosure underneath was already right and is unchanged — it states that Bollinsure
operates the site, that it may be compensated by an insurer when it places coverage, and that it is
not the only source of licensed help.

Two things were removed rather than reworded:

- **A dead button.** "Book a time" pointed at `bollinsure.com/contact`, which returns 404, and that
  site has no scheduling page at any path. It was dead on every page that rendered a handoff.
  Removed rather than repointed at the quote form, because a button labelled "book a time" that
  opens a quote request is worse than no button. If a booking page is published, add it back.
- **A lead score.** The attribution payload could carry `bir_completion`, a rounded percentage of
  how far through a module a person had got. No caller ever passed it and it never reached the
  built output, but its only purpose is to tell the brokerage how warm a lead is. The tool name
  still crosses, so a broker knows what the person was reading; how far they got is not the
  brokerage's business.

### What this does not cover

`bestepli.com` carries live application intake: 71 named inputs, twelve e-signature references, and
a `fetch("/api/submit")` call. That is a real submission path and it is the clearest instance of
exactly what this position removes. Three other live properties show no named inputs on their
homepages, though their application sub-routes were not crawled; `bestho3.com` references ACORD
nine times and `bestworkerscompensation.com` four, so both likely carry an application deeper in.

Acting on any of that means editing and deploying those repositories, which deploy from `main` on
push, so it is held pending explicit authorization. Nothing was changed on any of them.

### Where redirects are the right instrument, and where they are not

Redirects do not create authority. They **move** it. That single sentence decides every case.

| Case | Instrument | Why |
| --- | --- | --- |
| 27 domains with no content | **Redirect** | Nothing to move except the domain itself. Costless, and it consolidates the estate onto one property. Do these first. |
| 23 parked domains with no destination | **Hold** | A permanent redirect to a loosely related page teaches a crawler the destination is not about the query. That is negative authority, not neutral. |
| 8 domains with live sites | **Per-URL mapping, not an apex hop** | This is the important one. |

On the eight: they hold 608 indexed pages, and the pages most likely to be earning and to be cited
are the deep ones — 50 class-code pages, 28 county pages, 35 guides. A single apex 301 moves the
authority of one URL and discards the rest. So for the authority goal specifically, **the per-URL
export is not housekeeping, it is the strategy.** Export each site's indexed URLs from Search
Console, map each to its closest destination, and redirect at that granularity. Where no
destination exists yet, keep the page live until one does.

That reframes my earlier recommendation rather than repeating it. Holding the eight preserves the
pages; mapping them per URL preserves the pages *and* consolidates the authority. Mapping is
better than either holding or an apex hop, and it costs research rather than risk.

### What actually earns citations, in order of leverage

1. **Publish.** Nothing is cited that does not exist. The property has never been deployed.
2. **Clear the review.** 35 pages and 231 rules are `under-review`. A broker-reviewed hub whose
   pages say they are unreviewed is not yet the thing being described.
3. **Map the deep pages** before redirecting anything that has them.
4. **Run the source sweep** so `lastChecked` means what it says.
5. **Finish the entity layer**: address, phone, verifiable rating link, consistent naming.
6. **Then breadth.** Eight line pages are missing and thirteen industry pages do not exist. Breadth
   matters for citation because an answer engine cites the page that answers the question asked, and
   most questions are about lines this site does not yet cover. But breadth before review and before
   publication earns nothing.

### The one thing to avoid

Every mechanism above is designed so that being cited follows from being correct and checkable. The
temptation with an AI-citation goal is to add surface that looks authoritative — more schema types,
more pages, ratings, scores, a confidence number per claim. Each of those raises apparent authority
without adding a checkable fact, and the first time an engine catches one being wrong it costs more
than all of them earned. The corpus is worth citing because a reader can check any sentence in it in
one click. That property is the asset.

## The bet

Insurance content is a saturated category where almost everyone is optimizing for the same
keywords with the same thin pages. Competing on volume against that is a losing position for a
brokerage-operated library.

The bet is that provenance is the durable differentiator. A page that shows its sources, its
dates, its uncertainty, and its corrections is citable by people who cannot cite a marketing
page: journalists, educators, trade associations, professional advisers, and increasingly the
answer engines that now sit between a question and a website.

That produces fewer, better references, and it compounds because the assets stay accurate.

## The consolidation move

The `best*` specialty domains 301 into this site rather than running as separate microsites.
Eight thin insurance sites sharing one operator and overlapping content is the pattern that
suppresses all of them; one canonical library with eight advertisable front doors compounds
every inbound link into a single authority. Full rationale and the routing table are in
`DOMAIN-ROUTING-MANIFEST.md`.

## What is already built

The distribution strategy is mostly already in the codebase, which is the point: these are
product properties, not campaigns.

| Asset | State | Why it earns a reference |
| --- | --- | --- |
| Versioned source ledger | **Built.** 217 records, each with the exact claims it supports and every page that cites it | A researcher can audit a claim without asking permission |
| Public methodology | **Built.** `/methodology` | States where automation is and is not used, specifically |
| Correction log | **Built.** `/corrections`, with prior wording preserved | Publishing corrections is the cheapest credibility signal and almost nobody does it |
| Machine-readable companions | **Built.** `.json` on every substantive page | An answer engine can consume facts with their dates attached |
| `llms.txt` and `llms-full.txt` | **Built.** | Interpretation rules travel with the content |
| Cite this page | **Built.** Plain text, BibTeX, CSL JSON | Removes the friction between wanting to cite and citing |
| Update feed | **Built.** `/rss.xml`, keyed to review dates | Re-review is news to anyone relying on a page |
| Retrieval index | **Built.** `/search-index.json`, chunked with source ids | Makes the corpus usable by systems, not just readers |

## What comes next

### Downloadable artifacts

Each gets a stable canonical page, a stated licence, a documented methodology, an update date,
and a machine-readable file alongside the human one. A PDF with no canonical page is a dead end
that accumulates nothing.

First three, drawn from the built tools:

1. The contract insurance requirement checklist, from the requirement mapper.
2. The renewal readiness checklist, personal and commercial.
3. The policy comparison worksheet with its generated question list.

### Embeddable tools

A small embed of a live tool, attributing to the canonical tool page. Conditions, permanently:
the attribution link is visible, it is a normal link, there are no hidden links, and there is
no dofollow requirement imposed on the host. An embed that demands a followed link is a paid
link with extra steps.

### Outreach

Only when a specific resource solves a recurring public question the recipient already
fields. Templates for trade associations, educators, journalists, professional firms,
regulators, and subject-matter reviewers.

The rule that makes it not spam: **the email names the specific question their audience keeps
asking and links the specific page that answers it with sources.** No template that could be
sent to a second recipient unchanged.

Subject-matter reviewers are the highest-value category and the least used. A named external
reviewer on a page is both a quality improvement and a reason for that reviewer's institution
to reference it.

### Podcast and audio

Transistor stays the canonical subscription feed. Bollinsure stays the canonical public episode
archive. This site does not mirror the feed and does not import transcripts as research pages.

An episode may be cited here when it materially supports an answer, with a direct link to the
canonical Bollinsure episode page and a clear source label. A transcript enters the corpus only
after factual review, source mapping, and segmentation into claims: the same bar as any other
source.

The workflow that actually generates value runs the other way. When research surfaces a
question worth an episode, the episode links to the canonical research page, and the research
page cites the episode only if it adds something the sources do not.

### Quarterly "what changed"

A report built from documented source changes: which statutes were amended, which bulletins
were issued, which forms were refiled, and which answers changed as a result.

It is cheap to produce because the source registry already records `lastChecked`, `status`, and
supersession, and it is genuinely useful because nobody else publishes the delta. This is the
single most likely asset to earn recurring trade-press references.

## One source, many surfaces

The content system is built so one reviewed source can support a canonical answer, a coverage
page update, a tool note, a downloadable artifact, a podcast citation, and a social summary
**without duplicating the article across domains.**

The mechanism is the source registry. A source is a first-class record with its own page and
its own reverse index of citing pages. Updating it updates everything that depends on it, and
each surface links back to the canonical page rather than restating it.

That is why cross-domain duplication is not merely prohibited by policy here: the architecture
makes it pointless.

## Measurement

By canonical asset, not by keyword.

| Metric | Why |
| --- | --- |
| Referring domains per asset | Which pages actually earn references |
| Referring organization type | Whether the audience is trade, academic, press, or regulator |
| Non-branded discovery resulting from a reference | Whether a reference produces anything downstream |
| `source_opened` rate | Whether readers inspect evidence. The best single proxy for whether provenance is working. |
| Corrections received from outside | A rising number is a good sign: it means the work is being checked |
| Quarterly report pickup | Whether the delta report is landing |

Not measured: keyword rank as a primary metric, and total page count as a proxy for anything.

## Explicitly banned

- Paid links, link exchanges, reciprocal-link grids.
- Mass guest-posting and article syndication networks.
- Doorway microsites, city pages, and spun content.
- Fake studies, invented statistics, and surveys with undisclosed methodology.
- Undisclosed sponsorship of any kind.
- Republishing canonical content under a second domain.
- Any embed that requires a dofollow link or hides one.

If a tactic would need to be hidden from the reader, it does not go in the plan.
