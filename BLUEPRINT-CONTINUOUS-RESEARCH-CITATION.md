# Birch continuous research and citation engine

Status: architecture and editorial contract for the private preview. No live provider, auto-publisher, or backlink automation is enabled.

## Product objective

Birch should become the easiest insurance resource to check and cite because every useful page has a stable URL, a clear as-of date, visible limits, and a source record that can be opened by a reader or another system.

The growth loop is:

```text
question -> bounded research brief -> candidate sources -> source verification
-> claim review -> stable Birch record -> useful internal links and feeds
-> reader correction or follow-up -> scheduled recheck
```

AI accelerates discovery and drafting. It never turns a candidate into a fact, a user story into a verdict, or a draft into a public page.

## What happens when Birch does not have the answer

An unanswered query is a routing event, not a publishing event. The local lookup already
has the three evidence outcomes needed to make this decision:

| Lookup state | Reader experience | Research-desk action |
| --- | --- | --- |
| `ok` | Return the existing canonical records with their source trail. | Record only an aggregate demand signal; do not create a duplicate. |
| `insufficient` | Show the closest records with an explicit “not an answer” boundary. | Offer a bounded research candidate with the topic, jurisdiction, and missing evidence class. |
| `no-result` | Say that Birch has a gap, then offer browse and suggest actions. | Create a candidate brief only after privacy screening and deduplication. |
| private or policy-specific | Keep the question or document in the local/private review path. | Stop before provider submission; require explicit consent and a redaction pass. |

The candidate brief is deduplicated against existing question titles, aliases, open briefs, and
recently published records. It stores a normalized topic and jurisdiction by default, not a
visitor's raw question. Raw text is retained only when a person deliberately submits it for
research and agrees to the stated retention period. A candidate brief has no public URL, no
sitemap entry, and no claim status.

The research desk then runs a bounded sequence:

```text
lookup -> classify gap -> privacy screen -> deduplicate -> brief
-> source scout -> verify -> claim review -> publish one record
```

This is why Perplexity should not sit directly behind the answer box. If it does, the reader
cannot tell whether Birch answered from its reviewed corpus or from a fresh, unreviewed web
search. The answer box should remain deterministic; the research desk can use Perplexity
asynchronously after a gap is triaged.

## The daily research desk

### 1. Intake

Create a brief with:

- exact question;
- jurisdiction and audience;
- as-of date;
- requested source classes;
- intended record type: question, coverage, company, state, example, or update;
- exclusions such as policy advice, claims determination, or underwriting decision.

The current provider-neutral gate lives in `src/lib/research-pipeline.ts` and the static specimen is `/design/research-pipeline-preview`.

### 2. Scout

Use Perplexity Search API for raw, ranked candidate results and controlled filters. Use structured output only for extraction into a typed draft; never accept model-generated URLs when the provider returns source links separately. The provider trace should include provider, model, request time, and request ID, but it is an audit field, not an authority badge.

For California work, prefer the California Legislature, California courts, California Department of Insurance, and other first-party or primary repositories. For company context, prefer the company’s own filings and official regulator records. Professional or user contributions stay in their own source classes.

### 3. Verify

The reviewer or ingestion worker must:

- open the candidate URL;
- canonicalize and de-duplicate it;
- record publisher, host, jurisdiction, source class, access date, and status;
- save a source locator or page section when available;
- screen for policy numbers, addresses, health information, names, and other unnecessary personal data;
- attach each proposed claim to one or more source IDs;
- mark a source verified, unavailable, superseded, or disputed.

No claim can leave `needs-review` without a source that is marked `verified`.

### 4. Review

The reviewer sees a side-by-side packet:

- brief and scope;
- provider candidates and provenance;
- source ledger;
- proposed claims with source IDs;
- caveats and what the record does not answer;
- change comparison against the prior published record.

The reviewer can approve, reject, request correction, or mark the source unavailable. Approval is per claim and per packet, with a named reviewer and date.

### 5. Publish

An approved packet generates all public representations from one record:

- readable Birch page;
- stable claim anchors;
- source ledger and citation kit;
- JSON companion;
- search index chunk(s);
- `llms.txt` / `llms-full.txt` entry;
- RSS or changed-record entry when appropriate;
- sitemap membership only when the page is public and indexable.

This prevents the blog, search index, and machine exports from drifting apart.

## Automated content that is safe to automate

### Good candidates

- detect a new official regulator or legislative publication;
- detect that a source URL changed, disappeared, or was superseded;
- open a recheck task when a source reaches its review window;
- draft a proposed “what changed” record from two already verified snapshots;
- produce a source-linked internal newsletter or RSS item;
- generate a draft FAQ from existing approved claims;
- create a contribution request for a missing perspective;
- build a list of real internal links between related Birch records.

### Keep human-gated

- legal or legislative interpretation;
- claim-handling summaries;
- company appetite or eligibility statements;
- user-experience moderation;
- policy-document critiques;
- publication of any new claim;
- right-of-reply material from an insurer or professional.

Automated blog posts should therefore be **drafted automatically, reviewed as a packet, and published only from approved claims**. The UI should label them “AI-assisted draft” until approval, then show the human reviewer and source date—not the model name as a credibility signal.

## Citation and discoverability strategy

### Make Birch easy for people and AI systems to cite

- Put the answer in normal HTML, not only a client-rendered widget.
- Keep one canonical URL per record and avoid thin near-duplicates.
- Use descriptive page titles, concise descriptions, stable headings, and visible dates.
- Put source links next to the claims they support.
- Keep a machine companion that exposes the same approved claims and source IDs.
- Use `Article` or `Dataset` structured data only where it describes the actual page; never use review, rating, offer, or fake-authority schema.
- Preserve a correction log and a changed-record feed.
- Maintain a strong internal graph: question -> coverage -> company -> state -> source -> example.
- Publish useful original tables, timelines, glossaries, and comparison frameworks that others can cite with a direct link.

Google describes a sitemap as a way to help it discover canonical URLs, not a guarantee of crawling or ranking. The sitemap should contain only public, canonical Birch pages. [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

Do not build ordinary insurance pages around Google’s Indexing API. Google limits that API to job-posting pages and livestreaming-event pages with the appropriate structured data. [Google Indexing API guidance](https://developers.google.com/search/apis/indexing-api/v3/using-api)

### Replace “backlink creation” with earned distribution

Birch should not buy links, generate spammy guest posts, exchange links at scale, or create pages whose only purpose is to manipulate rankings. Those tactics damage the source-of-truth position.

Build earned references instead:

- publish original, source-linked California insurance timelines;
- release a small downloadable dataset with a stable version and checksum;
- provide embeddable citation cards that link back to the exact claim;
- offer a correction and right-of-reply channel;
- send useful research summaries to journalists, consumer advocates, associations, and professionals who would genuinely use them;
- let contributors claim and maintain their professional profile without changing Research records;
- create deep internal links that help readers follow an issue across coverage, company, state, and source pages.

## Perplexity adapter boundary

The server adapter should use an environment-held key, never browser JavaScript. Perplexity’s current Search API returns structured web results and supports domain, language, and region filters; its Agent API supports JSON Schema structured output. Use Search API for retrieval and the Agent/Sonar path only when a typed extraction is genuinely useful. [Perplexity Search API](https://docs.perplexity.ai/docs/search/quickstart) · [Perplexity structured output](https://docs.perplexity.ai/docs/cookbook/articles/structured-output-extraction/README)

The first live endpoint should be one bounded job, not an open-ended chatbot:

```text
POST /api/research/jobs
input: briefId + bounded brief fields
output: jobId

GET /api/research/jobs/:jobId
output: candidate sources + provider trace + deterministic blockers
```

The first request should be a `candidate-brief` job, not an `answer` job. An answer endpoint
can be considered only after a reviewer has approved the same packet for publication; even
then, it should resolve to the approved Birch record rather than invent a second response.

The client should never receive the provider key, raw policy document, or an unreviewed “answer.” A future worker can store encrypted raw provider material briefly, but the durable source of truth is the reviewed Birch packet.

## Operating controls

- Rate-limit briefs by user and by source class.
- Require an editor role for publishing and a named reviewer for legal, company, and claims material.
- Run PII screening before provider submission and before any public export.
- Store a minimal audit trail with retention windows for raw provider responses.
- Keep analytics vocabulary closed; never log the question, prompt, policy text, or email address.
- Require a correction path on every published record.
- Keep Commons, professional contributions, and Research in separate tables and visual lanes.
- Keep preview and review routes noindex until the product is intentionally opened.

## Recommended implementation sequence

1. Build one real reviewer console around the existing `ResearchPacket` contract.
2. Add a server-only Perplexity Search adapter with source-class and domain policies.
3. Add deterministic URL, date, source, PII, and claim-link checks.
4. Publish one approved packet into the existing corpus and generated exports.
5. Add scheduled rechecks and a changed-record queue.
6. Add draft-only blog/newsletter generation from approved claims.
7. Add earned-distribution assets: citation cards, dataset releases, and correction links.
8. Measure citation usefulness, source opens, corrections, and rechecks—not raw page volume.

## Decision

Birch should optimize for **citation density and editorial reliability**, not maximum automated page count. The product becomes authoritative by being the cleanest place to trace an insurance statement back to a reviewed source, then to a clearly labeled conversation.
