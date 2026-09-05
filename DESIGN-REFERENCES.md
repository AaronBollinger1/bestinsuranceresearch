# Design References

How the interface was decided, what was borrowed and from where, and why the shipped homepage
is the one it is.

Last updated: 2026-09-02

## Direction

A premium editorial-fintech utility. Precise, calm, unusually usable, visibly evidence-led. It
may feel AI-capable; it must not look like AI marketing.

What that ruled out, deliberately:

- gradient orbs, bokeh, glassmorphism, and SVG hero illustrations;
- oversized marketing headings on a page whose job is to be a working surface;
- decorative cards, cards inside cards, and pill-shaped everything;
- a looping video or animation anywhere near the LCP element;
- a single-hue theme in beige, purple, blue-purple, dark slate, or orange-brown.

What it ruled in:

- unframed full-width bands with a constrained inner grid, so the page reads as a document
  rather than a dashboard of floating panels;
- cards reserved for exactly four things: repeated answer results, source records, examples,
  and genuinely framed tools;
- corner radii at 8px or less, everywhere, with no exceptions;
- controls that look like controls, and every one of them wired up.

## Type and colour

The font system was inherited and kept, because the audit found it working rather than broken:

- **Newsreader** for editorial display headings and the direct answer.
- **Schibsted Grotesk** for interface and body copy.
- **IBM Plex Mono** for provenance, dates, source labels, and compact metadata. Mono is doing
  semantic work here: if it is set in mono, it is a fact *about* the content rather than the
  content itself.

All three are self-hosted through `@fontsource`. No font CDN, so no third party observes a
visit.

The palette is a restrained multi-colour system, not a one-hue theme: ink, paper, cream, white,
gold, green, blue, amber, rust, slate. Gold is the single primary action colour and is never
used for status. The semantic colours carry meaning only in combination with an icon and a text
label, so status survives greyscale printing and colour-blind viewing. The full token list is
in `src/styles/tokens.css`, which is the single source of truth and is mirrored into the Figma
variable set.

Contrast was checked against `--paper` (#fffdf9) for every text colour in the system. The
lowest ratio in use is 4.6:1 on `--faint`, which is reserved for metadata labels and is never
used for body copy.

## Mobbin reference pass

Mobbin was available and was used as a pattern library, not as a source to copy. Layout,
hierarchy, interaction, and state handling were extracted. Colour, copy, illustration, and
branding were not.

Twelve references, one structural lesson each.

| # | Product | Screen | Structural lesson taken | Where it landed |
| --- | --- | --- | --- | --- |
| 1 | ChatGPT | [Deep research answer with a "23 Sources" activity rail](https://mobbin.com/screens/73833b79-1dd5-4354-8fc4-a2e99c33a75e) | An answer and its provenance can share one screen if provenance gets its own persistent rail rather than being appended below the fold. | The sticky `.answer-rail` on every answer, coverage, company, state, and example page: contents, confidence, primary-source count, related records. |
| 2 | Elicit | [Paper table with per-row Source and DOI links, sorted by most cited](https://mobbin.com/screens/1be3720e-ed88-4617-8a2d-c967ba92ade9) | Every row in an evidence table should carry its own escape hatch to the original, and the sort control should name what it sorts by. | The source registry list, and the "Most primary sources" ranking mode on `/ask`. |
| 3 | Cohere Playground | [Inline citation chips under an answer paragraph](https://mobbin.com/screens/b438f172-95b4-4b67-a851-4f02f3ada1e9) | Citations belong inline at the claim, not collected at the end, so the reader sees which sentence rests on what. | `[S:id]` markers resolving to numbered `.cite` links that jump to their ledger entry. |
| 4 | Mintlify | [Assistant history with a "Pages cited" column per query](https://mobbin.com/screens/7674a1ba-b62c-46a8-bcff-35e276213e74) | A claim-to-source mapping is worth showing as a first-class column, not hiding in a tooltip. | The `claims` array on every source, published on the page under "What this source supports", plus the reverse index on each source record showing every page that cites it. |
| 5 | Mintlify docs | [Left taxonomy tree, right "On this page", collapsible steps](https://mobbin.com/screens/93535887-7be3-4091-a56d-2156e3a2d653) | Two navigation planes at once: where am I in the library, and where am I in this page. | Header nav plus the rail's "On this page" list. The taxonomy tree was rejected: at 12 questions it would advertise thinness. |
| 6 | Twenty | [Saved-view tabs with filter chips and "Save as new view"](https://mobbin.com/screens/a2dcb0ea-314f-4cee-94e6-fd608dde0d60) | Filter state should be visible as discrete removable facts, not buried in a panel. | Filter rows on `/questions` and `/sources` with a live count and a single reset. Saved views were rejected: they need accounts, and accounts are not on offer. |
| 7 | Neon | [Inline where/column/operator/value filter builder with Apply and Clear](https://mobbin.com/screens/176d32df-9284-4aa9-bc39-70b968fa943e) | Filters read best as a sentence about the data, and "clear" must be as reachable as "apply". | The `/sources` filter row: type, jurisdiction, publisher, two binary checkboxes, one reset. |
| 8 | Stripe | [Payment detail: event timeline left, metadata list right, "Last updated" visible](https://mobbin.com/screens/464dcf70-a0d4-4ba9-b23d-ca6ba18e60f5) | A record page should show its own history and its own freshness without being asked. | The `.answer-dates` row (effective, last reviewed, author, reviewer, sources) and stale-source flagging that propagates from a source to every page citing it. |
| 9 | Careem, Beli, Uber Eats | [Mobile filter sheets with Apply (n) and Clear all](https://mobbin.com/screens/8507d070-983f-405e-a3da-a2fcd6d1d4fc) | On mobile a filter needs a visible count of what it will do, and a one-tap escape. | The mobile filter disclosure with a live count, and the reset repeated inside the no-result state where it is actually needed. |
| 10 | Render, Uxcel | [No matching results, with a reset and suggested queries](https://mobbin.com/screens/0da9bd06-539f-41e1-aa94-a8c78368e69a) | An empty state should offer the next action, not just report the absence. | The no-result and insufficient-evidence blocks on `/ask`, each with clear-filters, browse, and suggest-this-question actions. |
| 11 | Melio | [Multi-step setup with a persistent progress indicator](https://mobbin.com/flows/19e7920f-cdc3-4612-bc67-2660ed342ece) | Progressive disclosure works when the person can always see how much is left. | The tool frame's live count and completion summary, with grouped rather than paginated sections so nothing hides behind a "next". |
| 12 | HoneyBook | [Setup checklist with per-step completion state](https://mobbin.com/flows/1922e5d2-1f9c-43c7-82ba-6bbc28fba7d9) | A checklist should distinguish done, not done, and not applicable rather than collapsing them. | The requirement mapper's three independent states per row: requested, confirmed, open question. That separation is the tool's whole point. |

### What was deliberately not taken

- **Chat transcript UI.** Every evidence-led reference presents answers as a conversation. This
  is a library, and framing it as chat would promise a generative answer that does not exist
  here.
- **Numeric confidence scores.** Several AI references show a percentage. A number implies a
  calibrated model. The status vocabulary (established, contextual, disputed, changing,
  insufficient) is an editorial judgement, and it says so.
- **Saved views and workspaces.** They need accounts. No account is required to read anything
  here, so filter state persists in local storage instead.

## Mobbin pass two: the guide surface

A second pass, run 2026-09-02 for the reusable guide only. The type system and the palette were
not revisited: they are working and the brief says keep them unless the audit proves them broken.

What this pass was looking for: how a reference document identifies itself at a glance, and how
section tabs behave when the sections are long and unequal.

| # | App | Screen | What it settled | Where it landed |
| --- | --- | --- | --- | --- |
| 13 | Surfshark | [Account settings with an icon rail and section tabs](https://mobbin.com/screens/a47d745c-fe20-4d94-b31b-0d1823459a1b) | The closest match to the problem: a glyph rail on the left identifying the area, section tabs above the content with a single accent underline on the selected one. Confirmed the shape rather than changing it, which is the useful outcome of a reference. | `.guide` grid: rail plus body, tabs reusing the existing `.tablist` and its `--gold-edge` underline. |
| 14 | Gusto | [Support tickets, breadcrumb then title then tabs](https://mobbin.com/screens/df196d83-cf1f-468e-8a66-c5d5b2a99ab5) | Order of operations above the tabs: breadcrumb, heading, one line of context, then the tablist. Also an insurance-adjacent product, so the register is close to ours. | The guide page header, in that order. |
| 15 | Ditto | [Style guide with a section list carrying counts](https://mobbin.com/screens/d3ea1f33-6fac-4e1d-9428-5aa6b017363b) | A count beside a section name tells a reader how much is behind it before they spend a click. Cheap, and it makes an eight-tab strip legible. | `.tab-count` on each tab, shown only where a count means something. Overview and Limits carry none. |
| 16 | Unity | [Product page, tabs under the title with a resources column](https://mobbin.com/screens/8eb480d9-6102-4fd2-9d74-950e8442f165) | Reference links belong in a persistent column, not at the bottom of the page a reader may never reach. | `.guide-links` in the rail: the full reference page, the tool for that line, and the machine record. |
| 17 | Mintlify | [Docs with a left rail and an on-this-page outline](https://mobbin.com/screens/22382df2-2420-4b63-b02f-5c309c95dc85) | A rail should say where you are in a body of material, not merely list links. | The rail leads with the line's own mark and its kicker, so the guide is identifiable before anything is read. |
| 18 | Ghost | [Billing, Domain and Support as a full-width segmented control](https://mobbin.com/screens/1527deac-3dd4-4fe0-9614-3f6a375ed5b2) | Considered and rejected. A segmented control divides its width evenly, which is fine for three items and unreadable for eight. Underlined tabs that scroll horizontally degrade better. | Nothing. Recorded because the rejection is the decision. |

### What the references did not decide

Three things came from the constraint rather than from a reference, and no reference would have
suggested them:

- **Every panel is in the HTML at all times**, hidden with `hidden` rather than omitted. Every
  product above loads panel content on demand, which is correct for an application and wrong here:
  this site's proposition is that any sentence can be checked, and 44 of the citations on the
  commercial auto guide sit in panels that are closed on arrival. A crawler, an answer engine, a
  printer and a reader with JavaScript off all get the whole document.
- **Each section is deep-linkable**, and selecting a tab uses `replaceState` rather than
  `pushState`, so the back button leaves the page instead of walking backwards through tabs.
- **Printing opens every panel** and then restores the selection.

## Homepage concepts, scored

Three complete directions were specified against the same identity, tokens, content model,
accessibility standard, and evidence rules. They differ only in information hierarchy.

Scored 1 to 5. The record is also published, noindex and out of the sitemap, at
`/design/homepage-concepts`.

| Criterion | A: Research Command Center | B: Evidence Ledger | C: Insurance Topic Atlas |
| --- | --- | --- | --- |
| Immediate comprehension | 5 | 3 | 4 |
| Source trust in the first viewport | 4 | 5 | 3 |
| Mobile usability | 5 | 3 | 4 |
| Return usefulness | 5 | 4 | 4 |
| Organic-search depth | 3 | 3 | 5 |
| Accessibility | 5 | 4 | 4 |
| Performance risk | 5 | 4 | 4 |
| Freedom from lead-generation pressure | 5 | 5 | 5 |
| **Total (of 40)** | **37** | **31** | **33** |

### Decision: A, with grafts from B and C

**A shipped** because it is the only direction where a first-time visitor and a returning one
both get what they came for in the same screen. Its weakness was organic-search depth, so it
does not ship pure.

**B's source-quality strip was grafted in** and sits inside the first viewport: source count,
primary-source count, stale count, most recent review date, corrected-page count. Every number
is counted from the registry at build time rather than asserted, so it cannot drift from the
truth. B was rejected as a whole because it answers a question the visitor has not asked yet,
and on mobile the registry consumes the entire first screen before the search field appears.

**C's entry-point grid was grafted in** below the fold, with live counts on each tile. That
supplies the internal-linking depth A lacked. C was rejected as a whole because an atlas is the
right shape for a library that is already large; at 12 questions and 6 coverage pages it
advertises its own thinness and forces a category choice before the visitor has expressed a
need.

B and C are preserved as labelled design alternatives at `/design/homepage-concepts`. They are
noindex, excluded from the sitemap, and unlinked from navigation. Three competing homepages
would split the decision rather than make it.

## First viewport contract

The shipped homepage first screen contains, in order: identity and a one-sentence scope
statement; the corpus counts; a labelled question field with a motion-gated rotating example;
four context selects (insurance type, line, state, audience); a browse-by-topic row; and the
source-quality strip.

It contains no email field, no phone field, no account prompt, and no quote call to action.

## Motion

Subtle CSS only, on four things: focus, disclosure, state change, and continuity. Durations are
120ms, 180ms, and 240ms on one shared easing curve.

`prefers-reduced-motion: reduce` collapses every animation and transition to 0.01ms and
disables smooth scrolling. The rotating example on the question field checks
`matchMedia('(prefers-reduced-motion: reduce)')` and simply does not rotate when reduced motion
is requested, rather than rotating faster or cross-fading.

Nothing animated is the LCP element on any page.

## Figma

`src/styles/tokens.css` is the source of truth. The Figma variable set mirrors it exactly:
colour, spacing, type, radius, border, elevation, and motion. Frames at 1440, 1024, 768, and
390. Component variants cover hover, focus, active, selected, disabled, stale, loading, cited,
disputed, and reviewed.

The implementation is the source of truth in both directions. Figma reflects working code; it
does not describe an unbuildable parallel concept.

`/design/component-states` is the live specimen gallery of every required state, rendered from
the real components. It is noindex and out of the sitemap. It exists so a reviewer can compare
states side by side without inventing content to trigger them: showing a "corrected" badge
there is a specimen, whereas faking a correction on a real answer to demonstrate the badge
would be exactly the kind of thing this site exists not to do.

## Mobbin pass three: discovery and comparison

Run 2026-09-02, for the discovery layer recorded in `AUTHORITY-AND-DISTRIBUTION-PLAN.md`. Nothing
here is built yet; the pass was run before committing to the surfaces so the shapes are chosen from
evidence rather than from memory. The type system and palette were not revisited.

What this pass was looking for: how a reference site segments mixed result types, and how a
comparison table handles an absent value.

| # | App | Screen | What it settled |
| --- | --- | --- | --- |
| 19 | Codecademy | [Docs search with result-type tabs and counts](https://mobbin.com/screens/eb89a750-8691-44c5-b9fa-87f7c364c43f) | A total count, then per-type tabs each carrying its own count. The corpus already tags every chunk with an `entryType`, so this is a rendering decision rather than a data one. |
| 20 | Slite | [Search with typed facets and a Verified only toggle](https://mobbin.com/screens/1593defe-aec1-49d2-abc2-37fc84dbd8ad) | The `Verified only` toggle is the shape for a reviewed-only view. Review state is on every record already and currently does nothing but render a badge. |
| 21 | Confluence | [Search with a Related searches chip grid](https://mobbin.com/screens/8cf8c9fd-cf5c-473f-b21f-2327ce2c8f02) | Adjacent queries as chips between result groups. The cheapest lever on long-tail discovery in the whole audit, and the `topics` and alias data needed to generate them exists. |
| 22 | Ferndesk | [Command palette with keyboard hints](https://mobbin.com/screens/59f05a71-36d4-4f70-b956-cd5bc8d0f98d) | Overlay lookup with the arrow, enter and escape hints printed in the footer of the palette rather than hidden. |
| 23 | StackAI | [Palette with a filter affordance and per-result type labels](https://mobbin.com/screens/c20d3077-a7b2-4743-9b64-5dcc7230c00e) | Each result carries a right-aligned type label. Confirms the same segmentation idea works inside a palette, not only on a results page. |
| 24 | Customer.io | [Palette with a category facet opened inline](https://mobbin.com/screens/d6ebb7ec-1bb2-4406-8f94-3684981e13d0) | Faceting from inside the palette instead of sending the reader to a separate filter page. |
| 25 | Clockwise | [Plan comparison grouped under section headers](https://mobbin.com/screens/6dfb7e0e-f5aa-43f5-a098-67de4cf6b776) | Rows grouped under section headings with sticky column headers, and an info affordance per row. The shape for comparing lines: one column per line, rows grouped as covers, excludes and limits. |
| 26 | 7shifts | [Deep-dive plan comparison with collapsible groups](https://mobbin.com/screens/0a9b21b2-170c-4eb4-b758-ead8060acd38) | Collapsible section groups, and one column marked as the reader's current position. Applies directly: mark the line the reader arrived from. |
| 27 | NordVPN | [Full feature list with explicit crosses for absent features](https://mobbin.com/screens/9882de2a-0f73-4863-9d7b-d60ef2e73dd4) | The most consequential reference of the pass, and the one that turned a style question into a correctness one. See below. |

### The reference that changed a requirement

NordVPN marks an absent feature with a cross rather than leaving the cell blank. On a pricing page
that is polish. On a coverage comparison a blank cell is ambiguous between the line excluding
something, the line probably covering it with no source read yet, and the question not applying to
that line at all. Reading the second as the first is precisely the failure this property exists to
prevent.

So the comparison surface carries **four** marks, not two: covered, excluded, does not apply, and
**not researched** — the last rendered as visibly as the others and never collapsed into a blank.
A comparison that admits what it has not read is more citable than one that implies a completeness
it does not have.

### Rejected in this pass

Nothing was rejected outright, which is itself worth recording: the three-pass total now stands at
27 references with one rejection (Ghost's segmented control, ref 18). A pass with no rejections is
a sign the queries were too close to the answer already chosen, so the next pass should deliberately
search shapes this site does not currently use.
