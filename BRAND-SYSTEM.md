# Brand System

Settled 8 September 2026. `DIRECTION.md` owns the visual direction in one
paragraph and this file is the whole of it, end to end. Where the two disagree,
`DIRECTION.md` wins until it is changed in the same commit.
`src/styles/tokens.css` is the machine-readable source of truth for every value
named here, and `scripts/verify.mjs` asserts that no stylesheet uses a custom
property the token file does not define.

## 1. What the brand is for

Every other insurance brand is selling reassurance. This one is selling
**checkability**, and that single difference decides every visual choice below.

The property is operated by a licensed brokerage and has to feel independent of
it. Nothing about that is achieved by saying so. It is achieved by looking like
a document that expects to be verified: ink on paper, one accent, the citation
visible next to the claim, and no element on the page whose job is to make the
reader feel good about the page. **Restraint is not an aesthetic preference
here, it is the argument.** A hero video would cost more credibility than it
could ever buy back.

So the test for any new element is not "is this attractive". It is:

> Does this help a reader check something, or does it ask them to trust us?

The second kind gets removed.

## 2. The mark

The approved Birch mark is the paper-birch bird supplied in
`/Users/aaronbollinger/Downloads/birch-final-favicon-package/`. It is a
two-tone blue bird with a clean transparent background. The package is the
source of truth; the interface uses the artwork unchanged in the research
header, Commons header, footer, app icons, favicon, and loading state.

### Usage

- Keep the bird on a clear background with its original proportions.
- Use the supplied transparent PNG at interface sizes and the supplied ICO/PNG
  variants for browser and installed-app icons.
- Do not rotate, mirror, outline, crop, recolour, add a gradient, or place the
  bird inside a badge.
- Keep clear space around the mark. At least 8px is required at interface size;
  more is preferred on editorial surfaces.
- Do not redraw the bird in CSS or SVG. If a vector source is supplied later,
  replace the raster only after checking it against the approved package.

## 3. Icon and app configuration

Current, after this pass:

```
<link rel="icon" href="/birch-bird-32x32.png" type="image/png" sizes="32x32" />
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
```

The manifest uses the supplied 192px and 512px variants and the page uses the
same bird in its header, footer, and loading state. `theme_color` and
`background_color` are the pale Birch blue used by the interface, so an
installed icon does not flash white against the page.

## 4. Colour

Three families and nothing else. Values in `src/styles/tokens.css`.

### Ink and paper

`--ink` `#17212e` through `--faint` `#6b7688` for text; `--cream` `#fbf8f1` as
the page ground, `--paper` `#fffdf9` for raised surfaces, `--white` for the few
places that need to sit above paper. Rules are `--line` and `--line-strong`.

The site is **light-only** and this is deliberate, not unfinished. There is no
`data-theme` and no dark block in the token file. Anything keyed off
`prefers-color-scheme` in the interface paints a dark-mode asset onto a cream
ground and disappears - that exact bug shipped once. The favicon is the single
exception, because it renders outside the page.

### Gold, which means one thing

`--gold`, `--gold-edge`, `--gold-text`, `--gold-wash`. Gold means **the thing
you act on, or the thing that resolved.** Nothing else. From `DIRECTION.md`: if
gold appears and means nothing, remove it.

Applied consequences, so the rule is not re-litigated:

- Primary actions and navigation use Birch blue. Gold is reserved for a
  resolved answer, a citation marker, or an evidence edge.
- An answered `/ask` turn carries a gold left rule, because it resolved.
- A turn that found only background carries `--amber`. A turn that found
  nothing carries a plain `--line-strong` rule. Neither resolved.
- The loading animation has **no gold at all.** A gold edge on the reveal front
  was built and removed: it could not be kept in sync and read louder than the
  mark. Making the arrowhead gold was considered and rejected separately,
  because it recolours the logo.

### Status and data

`--green` `--blue` `--amber` `--rust` `--slate`, each with a wash, for evidence
status. **Never colour alone** - every status is icon plus text plus colour, so
it survives greyscale printing and colour-blind viewing.

`--data-1` through `--data-5` are the categorical series for Layer 2 charts,
already accessible against paper. `AMBITION.md` asks for a cool "data ink"
distinct from gold, and `--data-2` `#34607e` is it: a chart is a reproduction,
not a resolution, so it must not be gold.

## 5. Type

Three families, each with one job, and the job is the reason there are three.

| Family | Token | Job |
| --- | --- | --- |
| Newsreader | `--font-display` | Headings and questions. A serif, because the claim is the product and a serif reads as a document. |
| Schibsted Grotesk | `--font-sans` | Interface, labels, body running text. |
| IBM Plex Mono | `--font-mono` | Data, dates, claim addresses, checksums, source ids. |

Mono is not decoration. It marks **everything a reader might copy or verify** -
`ca-ins-code-11580-2#c8`, a checksum, a retrieval date. If it is monospaced it
is checkable.

Scale is `--text-2xs` (0.6875rem) to `--text-5xl` (2.5rem), with `--text-4xl`
and `--text-5xl` stepping down under 640px. Four line-heights, `--leading-tight`
to `--leading-prose`. Prose measure is capped at `--prose-w` 720px, and long
text blocks in components cap around 76ch.

All fonts are self-hosted via `@fontsource`, asserted by the suite: no third
party learns that somebody read a page about a denied claim.

## 6. Motion

**The evidence remains still; the product shell can move.** This is the motion
system now that Birch is being presented as a full product rather than a static
reference page.

`src/components/BirchLoadingMark.astro`, the `/ask` loading state, renders the
approved bird asset and adds one restrained pulse when motion is allowed. The
resolved state is always the real logo, not a generated approximation. The
product shell also uses short transitions for the announcement bar, header
mega-menu, CTA press, and landing-page preview states. Those transitions help a
visitor understand where the next action is; they do not animate the answer,
claim, source, or review status.

### The rules that apply to any future motion

- **Shell states only.** Loading, navigation, hover, focus, disclosure, and
  continuity may move. Nothing animates behind evidence, citations, claim text,
  source records, or review status.
- **No autoplay hero.** The landing page may have a quiet state transition or
  hover reveal, but it does not open with video, a carousel, or a simulated
  product claim.
- **Behind `prefers-reduced-motion`, with the static bird as the resting
  state** - so the animation is additive rather than something the still case
  has to opt out of.
- Interface transitions use `--dur-1` to `--dur-3` (120-240ms), with `--dur-4`
  (360ms) reserved for a larger menu or preview reveal. Use `--ease` for state
  changes and `--ease-soft` for a small spatial glide.
- Every hover action has a keyboard/focus equivalent and every disclosure has a
  button state, an accessible name, and an Escape path.

### Why generative video is not in this system

Higgsfield or any other image model may be used to explore interface composition,
but never to redraw the supplied bird or create production motion around it. The
supplied bird is already the approved artwork, so it stays exact wherever it
appears in the product.

More broadly: generated imagery has no home in this brand at all, because the
rules below rule out the things it would be for.

## 7. Imagery, icons, and what is forbidden

- **No stock photography.** None.
- **No illustrations of people.** No smiling families, no advisers at desks.
- **No icon carrying meaning on its own.** Icons pair with text, always. The
  library is Lucide, hairline, and an icon is a wayfinding aid, never the label.
- **No decorative illustration** of any kind. If a graphic is not reproducing a
  public figure or diagramming a real mechanism, it does not belong.
- **Charts are reproductions, not opinions.** Hairline and typographic: no
  fills, no gradients, no rounded bars, tabular figures throughout, and every
  axis label naming a value the data actually reaches. No derived index, no
  ranking, no league table, no score - `AMBITION.md` lists publishing one
  "because a chart looked bare without it" as a way this fails.
- **Open Graph images** are typographic: the question, set in Newsreader on
  cream. There are 28 of them in `public/` and none contains a photograph.

## 8. Surface, space, and elevation

- **Radius never above 8px.** `--r-0` to `--r-4`. The world is paper, and paper
  does not have a 16px corner.
- **Three elevations only**, `--elev-1` to `--elev-3`. Most surfaces have none
  and are separated by a rule instead.
- Borders are `--bw-hair` 1px, `--bw-strong` 2px, `--bw-marker` 3px. The 3px
  marker is the left rule that carries meaning on a card.
- 4px spacing base, `--s-1` to `--s-20`. Shell 1200px, gutter 24px falling to
  16px under 640px, header 60px, minimum tap target 44px.

## 9. The three layers, made visible

From `AMBITION.md`: a reader must be able to see which layer they are standing
in, because the truth model differs. Design doing epistemics.

| Layer | Ground | Accent | Status |
| --- | --- | --- | --- |
| **The Record** - every claim cites a document | cream, ink, gold | gold means resolved | built |
| **The Numbers** - reproduced public data | same ground | `--data-2` for chart strokes, never gold | `/figures` built, charts not |
| **The Commons** - attributed human account | a cooler paper, a visibly different header | **no gold anywhere** | built separately, not yet deployed |

The Commons rule is absolute and is a token-system argument rather than a
branding one: gold means resolved, and gold on an unsourced post would be a lie
in the system's own terms. It also carries **no agency branding and no licence
number**, which is the whole reason it lives on a separate origin.

## 10. Voice

`EDITORIAL-AND-CITATION-STANDARD.md` owns this. The three lines that are also
brand decisions:

- **Direct answer first, then the conditions.** Burying the answer under
  qualifications is a failure, not caution.
- **A hedge is a finding.** "Often", "depends on the form", "carrier
  underwriting decides" are used where they are the truth and never as filler,
  and each carries the same evidentiary burden as an assertion.
- **ASCII only.** No em dashes, curly quotes or typographic ellipses in content,
  asserted by the suite.

And the two words that do not survive contact with the rules, per
`AMBITION.md`: **advice** becomes the document quoted and cited, and
**unbiased** means publishing the regulator's record and declining to rank.

## 10a. Shortening a passage

Added 9 September 2026, after the homepage was found shipping six severed words
above the fold.

**Prose is never cut at a character count.** `src/lib/excerpt.ts` is the only
sanctioned way to shorten a passage, and `scripts/verify.mjs` fails the build on
any `.slice(0, n)` where n is 40 or more and the thing being sliced is not an
array.

Three functions, and the distinction between them matters:

- **`excerpt(text, budget)`** for something written in sentences. It takes whole
  sentences up to the budget, tolerating a quarter over rather than amputating
  one, and falls back to whole words with an ellipsis only where a single
  sentence is longer than that.
- **`clip(text, budget)`** for a name or a title, which is *not* prose. Word
  boundary only. Running the sentence rule over "Cal. Code Regs. tit. 19,
  section 901" produced the description "Source record: Cal. Code Regs. tit." -
  correct by that rule and useless.
- **`metaDescription(text)`** for `<meta name="description">`, at 155
  characters, because that is roughly what a search engine shows and a
  description that stops mid-clause reads as a broken page before anybody has
  opened it.

### Why this is a brand rule and not a formatting preference

Two reasons, and both go to section 1: the brand is selling checkability.

**A cut at an arbitrary character can invert a claim.** `DIRECTION.md` holds
that a hedge is the finding - often, may, commonly, depends on the policy form.
"Generally covered, unless the form excludes earth movement" truncated at the
comma is not a shorter version of that sentence. A summarising rule that can
reverse a claim is an editorial fault wearing a typographic costume.

**Prose severed mid-word is the signature of a page nobody read.** It is the
most recognisable texture of machine-assembled text, and this property's entire
argument is that a person checked this. Every element on the page is supposed to
survive the test in section 1 - does this help a reader check something - and a
card reading "NASBP describes a su" fails it before the reader gets to the
citation.

### The same rule for lists

A question tagged with five lines of business rendered all five as a wrapping
wall of monospace, which reads as output rather than as metadata.
`shortList(items, keep)` shows three and counts the rest.

## 11. The California launch position

The MVP is California, and that is not a retreat - it is already what exists:
56 of 85 questions, 141 of 299 sources, 13 of 27 coverage pages and all 10
modules. The brand claim at launch should be the narrow thing that is
checkable today, not the destination.

- **Say**: California insurance, answered from the statute and the form, with
  the document attached.
- **Do not say**: the Wikipedia of insurance. That is the ambition, and
  claiming it before the Record is reviewed spends exactly the credibility the
  restraint above is buying.
- The specialty sites are the commercial surface and stay standalone. On a low
  budget the distribution lever is those eight and the reciprocal linking, not
  new domains.

## 12. Open items

| | Blocked on |
| --- | --- |
| `site.webmanifest` theme colour is white against a cream site | a pass that can test on a device |
| Chart primitives for Layer 2 (hairline, no fills, tabular figures) | Layer 2 content |
| Commons ground and header, once the origin is chosen | the Record being reviewed |
| Regenerate the raster icon package from the vector, so all sizes derive from one source | nothing; worth doing next time icons are touched |
| Dark mode, if it is ever wanted | a `data-theme` stamp; the vector already needs no second asset |
