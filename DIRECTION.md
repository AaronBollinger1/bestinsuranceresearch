# Direction

Settled 8 September 2026. This file exists so the direction stops being
re-decided every pass. Where a later decision genuinely supersedes something
here, change this file in the same commit rather than leaving the two to
disagree.

What the property is trying to become is in `AMBITION.md`. That file is
subordinate to this one.

## What this is

An evidence instrument for insurance, published free, that answers questions
about coverage by citing published sources a reader can open.

It is not a comparison site, a broker site, a lead form, or a blog. It is the
thing those cite.

## Who it is for, in this order

1. **Answer engines and researchers.** The citable unit is the claim, not the
   page. That is why claims carry stable addresses and checksums and why every
   path has a JSON companion. Being the most citable source in the category is
   the goal; traffic is a side effect of it, not the target.
2. **A person mid-problem.** Someone who has had a claim denied, a policy
   cancelled, or a contract requirement they do not understand, at the moment
   they are looking for what the rule actually says.
3. **A broker or lawyer checking something.** The audience that will notice if
   a citation is wrong, and whose noticing is what keeps the corpus honest.

Nobody in that list is a lead. See *How it earns* below.

## Rules that do not bend

These are not preferences. Several are enforced by `scripts/verify.mjs` and one
by a response header.

- Every claim cites a source.
- No page collects an application. Enforced at runtime by
  `Content-Security-Policy: form-action 'self'`.
- The licence split is 6013787 agency, 0D94699 Brian, 4345268 Aaron.
- Never push to main.
- Do not touch Bollinsure, BestAMS or CovWell.
- No rating, ranking, price, premium, quote, appetite claim, coverage
  determination, eligibility verdict or risk score is ever published.
- No `FAQPage`, `ClaimReview`, `Rating`, `Review` or `Offer` structured data.
  A source that declines to publish a verdict is more citable, not less.
- A record citing a source that is superseded, rescinded or never adopted must
  say so in its own text.
- Where a source is silent, the record says the source is silent rather than
  filling the gap.

## How it earns

**It does not.** The research property collects nothing and sells nothing, and
that is the reason it is worth citing.

Lead flow runs *through* it, not on it. Every question carries a `handoff`
field naming when a licensed conversation is the right next step, and the eight
specialty sites are the commercial surface:

| Property | Hands off to |
| --- | --- |
| bestho3.com | residential property |
| bestdwellingfire.com | landlord and rental dwelling |
| bestearthquakeinsurance.com | earthquake |
| bestepli.com | employment practices |
| bestcyberliability.com | cyber |
| bestworkerscompensation.com | workers compensation |
| bestgroupmedical.com | group benefits |
| bestartinsurance.com | valuables and fine art |

Those eight stay standalone and optimised in their own right. They are not
redirects to the hub and must not become them; the relationship is reciprocal
linking in both directions and nothing more.

If lead volume needs to rise, the lever is the handoff surface on those eight.
It is never a form here.

## Visual direction

The owner's 11 September consumer SaaS brief supersedes the older visual
description in this section. `BIRCH-PRODUCT-DESIGN-SYSTEM.md` governs the current
design: consumer comprehension first, clear product navigation, compact reading
frames, and source detail available at the point of use. The supplied bird,
brand tokens, and source integrity rules remain the implementation basis.

The world is **Birch blue on pale paper with evidence accents**. Printed
research document meets a calm community utility, not a software-product
dashboard. `src/styles/tokens.css` is the single source of truth: three
elevations, radius never above 8px, brand blue for actions, and evidence colors
reserved for meaning.

- **Type**: Newsreader for display, Schibsted Grotesk for interface, IBM Plex
  Mono for data and addresses.
- **Birch blue** is the primary action and navigation color. **Gold** means
  *this is the thing that resolved* and remains reserved for evidence edges and
  citation markers. If gold appears and means nothing, remove it.
- **Restraint is the brand.** No hero video, no stock photography, no
  illustration of people, no icons carrying meaning on their own. The corpus is
  the product and the design gets out of its way.

### The ink-bloom animation

Generated 8 September 2026: a five-second macro loop of ink blooming through
cream paper with a single gold filament resolving at the end.

Decided placement, and the reasoning, so this is not reopened:

- **It is the `/ask` loading state.** The moment between a question being asked
  and an answer resolving is the only place on this site where a loading state
  is honest, and ink resolving into a legible mark is what the site actually
  does. That is meaning rather than ornament.
- **It is not a hero.** A research instrument that opens with a video reads as
  marketing, and the credibility is the product.
- **The gold lands last.** In the token system gold means the resolved thing,
  so the filament settles as the answer arrives rather than drifting through
  as a highlight. If the clip is recut, that is the beat to keep.
- **Muted, behind `prefers-reduced-motion`, with a static first frame as the
  poster.** A reader who has asked for less motion gets the still.
- **Never on a page that carries a claim.** Nothing animates behind evidence.

### Closed: no clip fills that slot

The placement reasoning above stands. The choice of clip is settled by there
not being one.

`AMBITION.md` re-briefed the beat as the mark resolving rather than ink
blooming, on the ground that the mark resolving is what the site does. The
current implementation uses the approved bird asset directly in
`src/components/BirchLoadingMark.astro` and adds a restrained pulse instead of
generating or redrawing the logo.

So the earlier reasoning for preferring a generated clip is spent. Interface
concept renderings can inform layout and hierarchy, but the supplied bird stays
the only production mark. The ink-bloom file stays in `public/media/` and is no
longer a fallback for anything. `BRAND-SYSTEM.md` holds the motion rules.

## What success looks like

In this order, and none of them is sessions:

1. Records signed off by the licensed reviewer. Currently 0 of 137.
2. Sources a question can actually reach. Currently 234 of 286.
3. Claims cited by someone outside this estate.
4. Rechecks, not first reads: `lastCheckedBasis` of `recheck` rather than
   `access`.
5. Corrections published when we are wrong, which is why `/corrections` exists.

## What we will never do

- Publish a verdict on whether a claim should have been paid.
- Publish an estimate, a premium, or a figure the source did not state.
- Collect an email address, an account, an upload, or an application.
  This is a rule about *this origin*. `AMBITION.md` puts human contribution on
  a separate origin precisely so this one does not have to bend.
- Say a policy covers something without quoting what says so.
- Present a superseded document as current.
- Let a page rank by saying more than the sources support.
