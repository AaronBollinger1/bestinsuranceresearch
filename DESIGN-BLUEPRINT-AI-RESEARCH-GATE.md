# Birch AI research gate

Status: designed for the private preview; no provider call is live.

## The decision

Birch should wire Perplexity as a research scout, not as the source of truth.

The useful division of labor is:

1. A reader or editor writes a bounded research brief.
2. A server-side provider search finds candidate pages and returns structured notes with URLs.
3. Birch verifies those candidates against first-party and primary sources.
4. An editor or named licensed reviewer approves each public claim.
5. Birch publishes a stable record, a source ledger, a change date, and machine-readable exports.
6. Google receives the approved public URLs through the sitemap and normal crawling.

The last two steps are distribution. They are not validation. Perplexity discovery and Google indexing must never be described as proof that a statement is correct.

## Why it adds real value

The first high-value research lanes are:

- California statutes, regulations, legislative records, and regulator guidance.
- California court decisions and public case material, with the decision date and jurisdiction attached.
- Public insurer filings, official underwriting or eligibility material, and other company-published documents.
- Dated, attributable professional context about appetite or process, clearly labeled as reported context rather than a carrier promise.
- A separate user-experience lane that preserves the first-person account without turning it into a coverage or company verdict.

This creates a useful answer to “what changed?”, “where is that written?”, and “what should I ask next?” without pretending that an AI-generated summary is legal advice, an underwriting decision, a claims determination, or a review score.

## The non-negotiable trust rules

### California law and cases

Use official legislative, court, and regulator sources whenever they exist. A provider result is a lead until the underlying page is opened, identified, dated, and linked in Birch’s source registry. Every statement about current law needs an as-of date and a status such as active, superseded, disputed, or unavailable.

Birch should summarize a holding or rule in plain language, but keep the original citation, court, docket or legislative identifier, decision or enactment date, and the exact limitation visible. The page must say that it is general information and not legal advice.

### Carrier appetite

“Appetite” is not a durable public fact. It can vary by state, product, risk characteristics, distribution channel, date, and underwriting authority. Birch should only publish:

- An explicit, dated first-party company document;
- A public filing or regulator record;
- Or an attributable professional contribution labeled “reported context,” with the contributor’s role, jurisdiction, date, and conflict disclosure.

Never turn a provider’s synthesis into “Carrier X accepts” or “Carrier Y will write this.” Prefer “questions to ask,” “published eligibility language,” and “reported context last checked on …”. No paid placement, no undisclosed carrier ranking, and no reputational score.

### User experiences and company responses

Experiences belong in Birch Commons, with the author’s relationship to the event, time period, jurisdiction, privacy choices, and moderation state visible. A company response gets its own attributed lane. It does not delete the account or alter a Research record. The same source policy applies if a post makes a factual claim.

### Privacy and policy documents

Do not send policy PDFs, declarations pages, claim correspondence, driver information, addresses, policy numbers, or free-form personally identifying text to a research provider by default. The future policy review flow needs a local or controlled redaction boundary first, explicit user consent second, and a professional review workspace third. The research scout receives only a minimized, redacted question or an approved set of extracted fields.

No provider key belongs in client JavaScript. No raw provider prompt or response should be retained indefinitely by default. Store a minimal audit trace, a canonical source ledger, and the approved Birch packet; set a retention policy for any raw provider material before enabling it.

## The packet contract

The first implementation is the provider-neutral contract in `src/lib/research-pipeline.ts`. A future server route should accept a `ResearchBrief` and return a `ResearchPacket`, not HTML.

```ts
interface ResearchPacket {
  brief: {
    id: string;
    topic: string;
    jurisdiction: string;
    asOf: string;
    requestedSourceClasses: string[];
    question: string;
  };
  provider?: {
    name: 'perplexity' | 'other';
    outputMode: 'search-results' | 'structured-draft';
    requestedAt: string;
    modelId?: string;
    requestId?: string;
  };
  sources: Array<{
    id: string;
    url: string;
    title: string;
    publisher: string;
    jurisdiction: string;
    sourceClass: string;
    officialHost: boolean;
    accessedOn: string;
    lastChecked?: string;
    status: string;
  }>;
  claims: Array<{
    id: string;
    text: string;
    sourceIds: string[];
    claimKind: string;
    reviewState: 'draft' | 'needs-review' | 'approved' | 'rejected';
  }>;
  caveats: string[];
  review: {
    state: 'draft' | 'needs-review' | 'approved' | 'rejected';
    reviewer?: string;
    reviewedOn?: string;
  };
}
```

The `researchGate()` helper blocks publication when a brief is undated, a source is missing, a claim has no source, a claim is unreviewed, or the packet has no named reviewer. It is intentionally not a confidence score. Birch should prefer explicit evidence states to a false-precision percentage.

## Future provider boundary

When Birch moves from static preview to a server runtime:

1. Create a server-only research job endpoint. The browser submits a brief ID and bounded fields, never a provider key.
2. Use Perplexity’s Search API for candidate retrieval or its Agent API with JSON Schema output for a structured draft. Keep the provider model selected in environment configuration and verify the current supported model before deployment.
3. Enforce domain and source-class policies in code. For California legal questions, require a primary-source candidate before the job can leave `needs-review`.
4. Canonicalize and de-duplicate URLs; record publisher, host, jurisdiction, access date, source class, and status.
5. Run deterministic checks before human review: HTTPS, URL reachability, source-class match, claim-to-source references, dates, and PII screening.
6. Place the packet in the existing review queue. A reviewer can approve, reject, request a correction, or mark a source unavailable.
7. Publish only an approved packet into the existing corpus model. Generate the page, `claims.json`, retrieval index, llms files, and source ledger from the same approved record.

The provider adapter is deliberately not implemented in this static pass because there is no server secret, moderation owner, or retention decision in the repository. Installing an SDK alone would create the appearance of a working safety boundary without one.

## Google distribution

Birch already has a sitemap and machine-readable corpus surfaces. Once a record is approved and public:

- Include its canonical URL in the sitemap; never include drafts, private shelves, review-only packets, or gated Commons records.
- Keep title, description, canonical, visible as-of date, source ledger, and structured data aligned.
- Submit the sitemap in Google Search Console and monitor coverage; treat it as discovery, not a publish button.
- Do not build around Google’s Indexing API for ordinary insurance research pages. That API is restricted to supported job-posting and livestreaming-event page types.
- Keep a small changed-record feed so an editor can see what needs re-review before an old page remains discoverable.

The goal is to become easy to cite because each page is genuinely stable, source-forward, readable, and machine-readable—not because Birch attempts to force indexing.

## Editorial workflow and states

```text
briefed
  -> scouting
  -> source review
  -> claim review
  -> approved / rejected / needs correction
  -> published record
  -> recheck / supersede / withdraw
```

The review queue should show provider provenance as one input among the triggers, never as a trust badge. A packet can be “AI-assisted” and still be rejected. A human-authored packet can still require the same source and date gates.

## Product surfaces to build next

The private preview prototype at `/design/research-pipeline-preview` shows the interaction model:

- **Brief**: question, jurisdiction, as-of date, and source classes.
- **Scout**: candidate sources and a provider trace, clearly marked as unverified.
- **Verify**: source ledger, claim-to-source links, status, and reviewer notes.
- **Publish**: a hard gate with blockers and a link to the existing review queue.
- **After publish**: a public record with citations, “what changed,” “what this does not answer,” and a correction path.

The next buildable server milestone is not a chatbot. It is a reviewer console that can run one bounded packet, show the underlying sources, and approve one record end to end.
