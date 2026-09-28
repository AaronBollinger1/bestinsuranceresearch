# Birch citation layer blueprint

Status: first interaction pass, 2026-09-11

Reference concept: `design/mockups/birch-citation-layer-concept-01.png`

Birch becomes a source people return to when citing it is faster than paraphrasing it. The citation layer should make provenance visible at the moment of reading and make the stable reference reusable without an account, tracking pixel, or opaque export.

## Promise

**Read the claim. Open the source. Copy the reference.**

There are three distinct objects:

1. **Original source** — the publisher's document or webpage.
2. **Birch record** — Birch's dated, structured record of what the source supports.
3. **Birch page citation** — a reference to the page that explains the claim in context.

The interface must never make the Birch record look like the original authority.

## Citation path

```text
claim marker [1]
  → source ledger row
  → original source / Birch record
  → copy stable link or page citation
  → optional plain text, BibTeX, CSL JSON
```

The claim marker remains a normal anchor. Copy controls are conveniences; the visible source title and URL remain the fallback path when clipboard access is unavailable.

## Page-level component

`CiteThisPage` stays a disclosure rather than a dominant call to action. When opened, it contains:

- ready-to-copy plain citation;
- BibTeX;
- CSL JSON;
- canonical URL;
- content version;
- published and last-reviewed dates;
- machine-readable page record when one exists;
- polite copied/fallback status for assistive technology.

The page citation contains only public page facts. It does not include query text, a form value, an account, a browser identifier, or a user contribution.

## Source-ledger component

Each source row should expose:

- the original title and publisher link;
- authority level, jurisdiction, primary/secondary status, and dates;
- current/superseded/stale/unavailable status;
- claims the source supports;
- an internal Birch record link;
- a one-click stable Birch record link copy action.

The source title continues to open the original publisher. The internal record link is labeled “Birch record” so a reader can tell which object they are copying.

## Interaction states

| State | Button label | Assistive status | Fallback |
| --- | --- | --- | --- |
| Ready | Copy citation / Copy record link | empty | visible text and link remain available |
| Success | Copied | Citation copied to clipboard | none |
| Clipboard unavailable | Copy citation | Clipboard unavailable; select the visible text | select text above or open link |
| Permission failure | Copy citation | Copy failed; select the visible text | select text above or open link |

The feedback resets after a short interval and never changes the claim text. No toast is the only confirmation.

## Visual direction

- source row: plain white paper with a gold source index and hairline separators;
- Birch record link: cobalt, visibly internal;
- copy control: quiet secondary button, not a sales CTA;
- page citation drawer: compact, bordered, keyboard-native disclosure;
- code formats: IBM Plex Mono, wrapped safely on small screens;
- success state: restrained blue/gold status, no confetti or engagement bait.

## Acceptance criteria

- every named record page has a page citation action;
- every visible source row has an internal Birch record link and copy action;
- original source and Birch record are labeled separately;
- copying works when Clipboard API is available and fails accessibly when it is not;
- the visible text remains sufficient to cite without JavaScript;
- no copy action stores or sends content;
- stable URLs use the environment's canonical origin;
- reduced motion removes all copy feedback transitions;
- existing claim anchors, JSON companions, source ledgers, and validation contracts remain unchanged.

## Next implementation sequence

1. Add the page-citation quick action and accessible copy status.
2. Add “Birch record” and “Copy record link” to each source ledger row.
3. Add page citation actions to guide and tool records that already carry author/reviewer metadata.
4. Verify the rendered output across a question, company, guide, tool, and source page.
5. Follow with the Birch Shelf account surface; do not couple citation access to signup.
