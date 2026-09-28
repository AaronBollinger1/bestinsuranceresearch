# Direction A: the remaining page templates

11 September 2026. Owner requested the remaining page designs in one high-effort pass. This extends the approved A / Focus direction; it does not introduce another brand direction or open public access.

## Review entry point

`/design/product-system` is the consolidated directory. Fourteen specimens live at `/design/templates/{id}`. Each has a next-template link, a visible specimen notice, and a collapsed handoff explaining the designed states and the missing service boundary. All are noindex and excluded from the sitemap.

The existing homepage, question and company reading layouts, professional entry, and local contribution composer remain the base. Community and thread specimens now use quieter rows, a wider reading area, sans-serif conversation text, and fewer promotional/explanatory blocks. Account recovery includes expired-link and delivery-failure states.

## Template inventory

| Template ID | Content and interaction | Service boundary |
|---|---|---|
| `topic` | Home/residential research, derived record counts, search, type filter, no results and clear | Existing corpus; no live search call |
| `industry` | Small-business questions, coverage records and context rail | Existing industry taxonomy; not recommendations |
| `state` | California-tagged questions and primary-source context | Jurisdiction view, not a claim of complete California coverage |
| `coverage` | Existing homeowners definition, coverage-part disclosures, exclusions, source drawer | Research unchanged; canonical record remains authoritative |
| `case-study` | Existing public-record example, provenance, reasoning, non-generalizable limits | No individual claim determination or new source review |
| `source` | Publisher, jurisdiction, recorded checking date, stable claim links, citing questions | Existing source record, not a fresh check |
| `contributor` | Published work, expertise, disclosures, explicit empty/unverified states | No fabricated person, publication, or credential |
| `saved` | Example collection, remove, undo, empty collection, following, preferences | Session-local DOM only; no account or email subscription |
| `your-coverage` | Unconnected, optional category selection, review, edit, cancel and clear | No Canopy call, credentials, file upload, or redaction claim |
| `tools` | Task-first progressive launcher into existing worksheets | No new insurance decision rules |
| `company-partner` | Participation, authorization scope, closed access, response example links | Organization authority separate from identity and domain checks |
| `research-desk` | Candidate, scope-conflict and provider-failure scenarios, local checklist | No provider call, approval or publication |
| `moderation` | Privacy, response-dispute and correction scenarios, decision requirements | No real report, private evidence, moderation action or notice |
| `standards` | Editorial frame with standards navigation and real policy/disclosure links | Design principles, not replacement legal terms |

## Shared visual and interaction rules

- Keep the exact bird, blue palette, Newsreader brand expression, and Schibsted interface typography.
- Compact left-aligned page title; one clear task, not multiple competing hero buttons.
- Browse: scan titles and scope first. Source-derived counts describe records, never user activity or authority.
- Read: generous primary column; quiet right-hand context; full evidence behind citations. No rewriting research to fit a card.
- Personal: optional choices, useful empty states, reversible actions, clear persistence boundaries.
- Operations: queue at left, full context at right. Keep an interrupted state visibly incomplete.
- Tabs: real fragment links without JavaScript; enhanced tab semantics, roving focus, arrow/Home/End keys with JavaScript.
- Motion: small color and arrow feedback only. No moving reading text, autoplay, or delayed answers. Reduced-motion disables template motion.
- Mobile: stacked context, horizontally scrollable tabs, single-column cards, readable full-width controls.

## Reference lineage

The prior signed-in Mobbin audit established the patterns below. This pass translates those interaction principles into original Birch code; it does not copy screenshots/assets or claim new Figma edits.

- [ChatGPT source panel](https://mobbin.com/screens/73833b79-1dd5-4354-8fc4-a2e99c33a75e): keep source inspection close to the reading task.
- [Stripe record details](https://mobbin.com/screens/464dcf70-a0d4-4ba9-b23d-ca6ba18e60f5): separate the main record from contextual facts and operations.
- [Reddit post flow](https://mobbin.com/flows/26ef9d17-f7e0-4e09-9af6-01311c9fbffb): destination/type/content hierarchy and recognizable conversation structure.
- [HoneyBook onboarding](https://mobbin.com/flows/1922e5d2-1f9c-43c7-82ba-6bbc28fba7d9): progressive choices instead of a large initial form.
- [Private Birch reference collection](https://mobbin.com/collections/38f9a642-ecc6-4e00-b9da-74c9ac44bced/web/screens).

## Implementation order after this pass

1. Apply the browse and reading frames to the existing coverage, industry, state, example, and source routes, preserving canonical paths, source claim IDs, full content, and review metadata. Specimens are deliberately not duplicate indexable articles.
2. Transfer the account and contribution designs into the existing invited Community application. Verify durable storage, real mail, safe return URLs, rate limits and role-scoped permissions before opening any signup.
3. Connect saved research and following after account identity is established. Keep email categories off by default and auditable.
4. Bind company subjects, threads, professional records, representative authority, responses, corrections and moderation. Identity or a policy relationship does not establish the truth of a story.
5. Connect bounded research tasks and source review. Provider output remains a candidate until original sources and claims are validated and an authorized reviewer signs off.
6. Only then conduct the separate Canopy/privacy/security pass. Document retention, access, consent, revocation, deletion, redaction limits and private professional review need implementation and testing before intake.

Public ratings, carrier rankings, reputation scores, automated publication, bulk SEO pages and policy uploads are not enabled by this design pass. More page templates are not a reason to widen release authority.

## Verification

- Root: 180 passing checks. Production posture: 162 passing checks.
- On-page audit: zero findings across the unchanged 563 indexable pages; the fourteen new routes are noindex.
- Community: 80 passed, one external-database check skipped. No Community backend files changed.
- Browser: all fourteen routes at 1280px desktop and 390px mobile, no horizontal overflow; no browser errors observed in the desktop sweep.
- Exercised: browse search/type filter/empty/reset, coverage disclosure and source modal, Escape focus return, saved remove-all/undo, keyboard End tab selection, private-coverage select/review/edit/cancel, moderation decision boundary, provider-unavailable state, expired-link and delivery-failure recovery, community type filter.
- Screenshots: `outputs/direction-a-templates-2026-09-11/` in the parent workspace, showing real built UI rather than generated mockups.
- Source controls remain real links. Auth, policy intake, private evidence, mail, storage, provider requests and publication were **not** exercised as live services; these specimens deliberately do not call them.
