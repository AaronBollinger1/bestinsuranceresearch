# Birch company dossier blueprint

Status: first product surface, 2026-09-11

Reference concept: `design/mockups/birch-company-dossier-concept-01.png`

The company dossier is Birch's first high-density product surface. It should help a reader answer three different questions without blending them:

1. Who is this organization?
2. What can Birch document about it?
3. What context has the community reported, and what is still private preview?

The page is a reusable template, not a one-off marketing page. Every company record should resolve to the same information architecture and the same trust boundaries.

## Product promise

**Understand the record. Follow the evidence. Find the conversation.**

The page is not a carrier scorecard, quote funnel, complaint leaderboard, or claims outcome predictor. It is a dated research dossier with a future, separately moderated community layer.

## Visual direction

- warm cream reading canvas with white paper panels;
- deep ink/navy for titles and authority surfaces;
- Birch cobalt for links, actions, and the bird mark;
- restrained gold for evidence labels, dates, and status cues;
- Newsreader for dossier titles and major statements;
- Schibsted Grotesk for navigation, controls, and labels;
- IBM Plex Mono for dates, source status, record IDs, and metadata;
- small-radius cards, hairline rules, generous whitespace, and no fake dashboard chrome.

The supplied bird mark is the only logo source. A future brand-data provider may fill the neutral company identity slot after identity matching; it must not replace the source or create a Birch rating.

## Desktop composition

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Birch bird + wordmark     Research   Companies   Commons        Ask Birch     │
├─────────────────┬───────────────────────────────────────┬────────────────────┤
│ COMPANY DOSSIER │ What Birch can document                │ Community context   │
│ company identity│ dated source-backed record             │ Forums              │
│ official domain │ source card + copy citation            │ Threads             │
│ Ask Birch       │ source card + publisher                │ Experiences         │
│ page navigation │ source card + last reviewed            │ Private preview     │
├─────────────────┴───────────────────────────────────────┴────────────────────┤
│ citation kit · correction history · official channels · related research      │
└──────────────────────────────────────────────────────────────────────────────┘
```

The current implementation retains the long-form editorial page and rail for accessibility and crawlability. The new dossier overview should act as the visual orientation layer above that document rather than hiding the existing source record.

## Required regions

### 1. Identity

Display:

- short name and legal name;
- organization type;
- jurisdiction or domicile;
- official domain;
- regulator identity where available;
- last reviewed date;
- neutral logo/initials tile until enrichment is verified.

Identity facts must remain source-linked. An official domain is a channel, not an endorsement.

### 2. Research lane

Display:

- one sourced summary;
- “What Birch can document” heading;
- source-backed coverage context;
- dated records and current/superseded status;
- source publisher and original link;
- copy-citation affordance;
- explicit boundary whenever the page cannot decide something.

Never invent a financial-strength number, appetite statement, product catalog, claim outcome, or recommendation.

### 3. Community lane

Display separately:

- Forums;
- Threads;
- Experiences;
- Official responses;
- moderation state;
- private-preview label while Commons is not ready.

Community counts are moderation inventory only. They must never read as popularity, quality, complaint rate, or reputation.

### 4. Action layer

Primary action: **Ask Birch**.

Secondary actions:

- open official website;
- read source ledger;
- copy page citation;
- open related Research.

Future account actions such as “Save company” should remain disabled or clearly labeled private preview until authentication, storage, and deletion are live.

## Responsive behavior

- Desktop: three-column orientation layer, then document and contents rail.
- Tablet: identity column becomes a top card; Research and Community remain separate stacked panels.
- Mobile: identity, Ask Birch, research summary, source links, then community preview. No horizontal scrolling and no hidden labels that change a source's meaning.

## Interaction budget

- company identity tile: no motion beyond focus state;
- source cards: 2px lift and arrow movement on hover;
- community lane cards: border and background change only;
- Ask Birch: existing button lift/arrow feedback;
- loading: supplied bird mark with a calm converging-dot treatment;
- reduced motion: no transform, no delayed content reveal, no auto-advancing content.

No animation may obscure a claim, source, date, or privacy warning.

## Data contracts

The visual layer may consume:

- `company` identity record;
- declared source records;
- declared question and coverage relationships;
- community availability flag;
- future normalized brand identity record.

The visual layer must not consume an unreviewed third-party reputation score or turn missing data into a placeholder metric.

Future Brandfetch/licensed identity record:

```ts
type CompanyBrandIdentity = {
  provider: string;
  matchedLegalName: string;
  matchedOfficialDomain: string;
  logoUrl?: string;
  colors?: { primary?: string; accent?: string };
  capturedAt: string;
  matchReviewedBy: string;
  matchSourceId: string;
};
```

This record is enrichment only. It does not publish a Birch opinion.

## Acceptance criteria for this pass

- the supplied bird mark is visible and unchanged;
- one primary CTA is obvious;
- Research and Community are visually distinct;
- every visible count describes records, not reputation;
- the company identity slot is ready for future enrichment but honest about its status;
- company pages remain crawlable, citation-linked, keyboard accessible, and static;
- private preview does not collect signup, uploads, or personal data;
- the existing validation suite remains green.

## Next surfaces, in order

1. Company dossier sample and template (this pass).
2. Citation copy and source-freshness interactions.
3. Birch Shelf signup and saved-research states.
4. Commons forum/thread read-only prototype.
5. Contributor Desk submission and moderation states.
6. Policy Lens local redaction experience.
7. Brand identity adapter behind a feature flag.
