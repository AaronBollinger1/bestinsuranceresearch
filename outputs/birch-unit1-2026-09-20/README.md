# Birch Unit 1 browser receipt

Target: `c304042e45d1c55362a8775bf7eb36804ee1265d`

This receipt covers only Unit 1 from the audit dated 2026-09-20:

- interior search chrome uses the shorter `Search research` placeholder;
- citation markers keep an immediately following sentence mark attached;
- under-review list, guide, and interactive Ask result metadata says `Record date`.

## Before evidence

The pre-change screenshots are the stored c304 baseline receipts, left in place and
not overwritten:

- `/Users/aaronbollinger/.config/portfolio-grok-supervisor/receipts/evidence-c304042e-20260920/birch/frontdoor-390.png`
- `/Users/aaronbollinger/.config/portfolio-grok-supervisor/receipts/evidence-c304042e-20260920/birch/frontdoor-768.png`
- `/Users/aaronbollinger/.config/portfolio-grok-supervisor/receipts/evidence-c304042e-20260920/birch/frontdoor-1280.png`
- `/Users/aaronbollinger/.config/portfolio-grok-supervisor/receipts/evidence-c304042e-20260920/birch/answer-390.png`
- `/Users/aaronbollinger/.config/portfolio-grok-supervisor/receipts/evidence-c304042e-20260920/birch/answer-768.png`
- `/Users/aaronbollinger/.config/portfolio-grok-supervisor/receipts/evidence-c304042e-20260920/birch/answer-1280.png`

## After evidence

The browser bridge rendered after captures in the task receipt against the isolated
preview server at `127.0.0.1:4326`, using viewport overrides `390x844`, `768x1024`,
and `1280x900`. Each width covered `/`, `/ask`,
`/questions/replacement-cost-vs-market-value`, and `/guides/homeowners`.

At every width and route the DOM proof returned:

- `scrollWidth === innerWidth`;
- one `main` landmark and a present skip link;
- `header-q` placeholder `Search research`;
- no overflow at 390px or 1280px;
- citation wrappers present on content pages;
- pending records rendered `Record date`.

The interactive Ask proof submitted the existing replacement-cost question locally
against the static index. Its first result had metadata
`Matched in: Direct answer`, `4 supporting sources`, `Record date 2026-08-31`,
and `Open`, with no `Reviewed` label.

The browser bridge does not expose reduced-motion emulation; its screenshots used
the normal browser preference. Reduced-motion parity remains covered by the checked-in
CSS contract and the full verification suite; no animation or motion token was changed
by this unit.
