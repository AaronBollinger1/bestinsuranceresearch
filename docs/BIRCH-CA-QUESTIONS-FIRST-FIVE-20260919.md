# First five California answer pages — receipt, 2026-09-19

Unit: publish the first five of the 25 highest-intent California questions as real GET answer pages, per `receipts/BIRCH-DIRECTION-20260917.md` line 22 (usage mechanics, priority 1: question coverage). Preview only; base `grok/recover-pr1-pr3-onto-launch-20260915`.

## What shipped

Five question records, each rendering at its own GET route with the question as the `h1`, a sourced short answer, scope labelling (`assumes`, `whatChanges`, `variability`), a source ledger, a machine-readable companion, and QAPage JSON-LD.

| Route | Question | Sources behind it |
|---|---|---|
| `/questions/california-minimum-auto-insurance-and-proof` | What auto insurance does California require, and what do I have to carry in the car? | Veh. Code 16056; Veh. Code 16020; SB 1107 (2022); CA DMV; Ins. Code 11580.1 |
| `/questions/what-is-the-california-fair-plan-and-who-is-it-for` | What is the California FAIR Plan, and who is it actually for? | Ins. Code 10091; California FAIR Plan |
| `/questions/insurer-in-liquidation-who-pays-california` | My insurance company was placed in liquidation. Does a California fund pay my claim, and up to how much? | Ins. Code 1063.1; CIGA home; CIGA claims |
| `/questions/debris-flow-after-a-wildfire-which-peril-california` | A debris flow after a nearby wildfire damaged my home. Which peril does the claim turn on? | Ins. Code 530; California FAIR Plan dwelling property form CFP 00 01 |
| `/questions/california-data-breach-what-my-business-must-do` | My California business had a data breach. What am I required to do, and how long do I have? | Civ. Code 1798.82; Civ. Code 1798.81.5; Civ. Code 1798.150 |

## Source URL behind each answer

Every URL below was re-checked on 2026-09-19 and returned HTTP 200.

| Source id | URL |
|---|---|
| `ca-veh-code-16056` | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=VEH&sectionNum=16056 |
| `ca-veh-code-16020` | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=VEH&sectionNum=16020 |
| `ca-sb-1107` | https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202120220SB1107 |
| `ca-dmv-insurance-requirements` | https://www.dmv.ca.gov/portal/vehicle-registration/insurance-requirements/ |
| `ca-ins-code-11580-1` | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=INS&sectionNum=11580.1 |
| `ca-ins-code-10091` | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=INS&sectionNum=10091 |
| `ca-fair-plan-home` | https://www.cfpnet.com/ |
| `ca-ins-code-1063-1` | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=INS&sectionNum=1063.1 |
| `ciga-home` | https://www.ciga.org/ |
| `ciga-claims` | https://www.ciga.org/how-we-work/liability-auto-property-claims |
| `ca-ins-code-530` | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=530.&lawCode=INS |
| `cfp-dwelling-property-policy-form` | https://www.cfpnet.com/wp-content/uploads/2026/01/Dwelling-Fire-Policy_effective-3-17-26.pdf |
| `ca-civ-code-1798-82` | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82 |
| `ca-civ-code-1798-81-5` | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.81.5 |
| `ca-civ-code-1798-150` | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.150 |

No new source records were created. All fifteen already existed in the corpus with verified `claims` arrays, and every sentence in the five answers is composed from those recorded claims and carries an `[S:id]` marker back to one of them. That was deliberate: it keeps the new pages inside material that has already been read and recorded rather than asserting anything new about California law.

## One question was dropped and replaced, and why

The fifth page was originally drafted as *"California changed how home insurance rates are set. What actually changed, and what did insurers have to give in return?"*, built on `cdi-cat-model-2024` (the Department's December 2024 catastrophe-model and net-cost-of-reinsurance releases) together with Ins. Code 1861.01 and 1861.05.

At URL-verification time `https://www.insurance.ca.gov/` returned **HTTP 503 for the whole host**, including its root, from two independent network paths. The specific press release could not be confirmed to resolve. The brief for this unit requires a real, resolvable URL and says to drop a claim that cannot be sourced, so the drafted page was deleted rather than published on a citation that could not be checked that day.

It was replaced with the data-breach question, whose three statutes are all on `leginfo.legislature.ca.gov` and all returned 200. The dropped question remains a good candidate: `cdi-cat-model-2024` is an existing verified record, and the page can be restored unchanged once the CDI host is reachable again.

## FAQPage was not emitted, deliberately

The unit brief asked for "QAPage/FAQPage" JSON-LD. Each page emits **QAPage** and no FAQPage. `scripts/verify.mjs` contains a standing assertion banning `FAQPage`, alongside `Claim`, `ClaimReview`, `Rating`, `Review` and `Offer`, with the stated reason that those types carry a verdict this site does not adjudicate. The question schema's `schemaEligible.faqPage` defaults to `false` for the same reason. Emitting FAQPage would have required overturning an existing editorial decision, which is outside a bounded content unit.

## Linking from the question-first surface

`src/pages/ask.astro` selected its "Try one of these" examples with `corpus.questions.slice(0, 6)` — the six records that happened to sort first by filename. That is now an explicit shortlist (`FEATURED_QUESTIONS`) leading with the newly published California answers, so each is one hop from the primary CTA rather than reachable only through search. Markup, component and count are unchanged; unresolvable ids are dropped and the list tops up from corpus order, so a renamed record shortens the list instead of breaking the build.

No landing restyle, no new design system, no new components. The answer pages use the existing question route and typography.

## Evidence

`outputs/birch-ca-questions-first-five-2026-09-19/`, captured at **1280** and **390**:

- `answer-auto-{desktop,mobile}.png` — the auto answer's direct-answer block with numbered citation markers resolving to the ledger.
- `answer-breach-{desktop,mobile}.png` — the same for the data-breach answer.
- `ask-examples-{desktop,mobile}.png` — the `/ask` composer showing the new answers as example prompts.

## Gates

- `npm run validate`: **897 pages** (892 + 5), **196 passed**, 0 failed, `astro check` 0 errors.
- The five new questions were added to `ANSWERABLE` in `scripts/verify.mjs`, so the suite now asserts each is findable by its own wording through the search index and scores at least 30. That is what proves these are reachable answers rather than orphan pages.
- All fifteen cited source URLs re-checked at 200 on 2026-09-19.

## Scope held

Five questions only, not 25. No contribution loop, no engagement mechanics, no landing redesign, no alternative-aesthetic work, no production promotion, nothing outside the preview branch.
