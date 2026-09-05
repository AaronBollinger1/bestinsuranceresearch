# Analytics Event Specification

Design only. **No production analytics was configured, changed, or connected.**

Last updated: 2026-08-31

## Status

- Preview loads **no** third-party marketing or measurement script. Asserted by
  `scripts/verify.mjs`, which fails the build if any page references a known analytics host.
- Production analytics stay off until an owner deliberately supplies `PUBLIC_GTM_ID` **and**
  sets `PUBLIC_SITE_ENV=production`. Both conditions are required in code
  (`siteConfig.analytics.enabled`).
- No container was published, no tag was created, no property was modified.

## The enforcement model

The constraint is in code, not in policy. `src/lib/analytics.ts` publishes a contract; the
runtime shim in `BaseLayout.astro` filters every payload against it before anything can be
sent; and the same contract is embedded in every page as JSON so the filter and this document
cannot drift apart.

```
event name not in the events list          -> dropped
parameter name not in the parameters map   -> dropped
parameter name in the forbidden list       -> dropped
parameter value not in that parameter's
  fixed vocabulary                         -> dropped
```

Every allowed parameter has a **closed vocabulary**. There is no vocabulary that accepts free
text, so a question, an address, or a tool entry cannot pass the filter even if a future
contributor tries to send one. `scripts/verify.mjs` asserts that every vocabulary is a
non-empty array of strings and that the forbidden list blocks `question`, `query`, `email`, and
`address`.

## Events

Eight. Aggregate only.

| Event | Fires when | Why it is worth measuring |
| --- | --- | --- |
| `research_search_started` | A lookup runs on `/ask` | Whether the library is being searched at all |
| `research_answer_viewed` | A result is opened from a lookup | Whether lookups lead anywhere |
| `source_opened` | An outbound source link is followed | Whether the evidence is actually inspected. The single most important number on this site. |
| `related_question_opened` | A related question is followed | Whether the graph between entries works |
| `tool_started` | First interaction with a tool | Whether tools are entered or only viewed |
| `tool_completed` | Print or export from a tool | Whether tools are finished |
| `correction_started` | The report-an-error control is used | Whether the correction path is discoverable |
| `bollinsure_handoff_clicked` | An outbound licensed-help link is followed | Handoff volume, with no attribution to any individual |

## Parameters

| Parameter | Vocabulary |
| --- | --- |
| `insurance_family` | personal, commercial, life, health, general |
| `line` | homeowners, earthquake, landlord, renters, condo, auto, umbrella, flood, general-liability, commercial-property, workers-compensation, commercial-auto, professional-liability, inland-marine, surety, cyber, epli, multiple, none |
| `state` | CA, TX, FL, other, none |
| `source_type` | statute, regulation, regulator-guidance, regulator-record, policy-form, government-data, official-documentation, court-decision, secondary-analysis |
| `page_type` | home, ask, question, coverage, company, state, example, source, tool, editorial |
| `tool_name` | requirement-mapper, renewal-readiness, policy-comparison |
| `answer_status` | established, contextual, disputed, changing, insufficient, no-result |
| `completion_bucket` | 0, 10, 20, ... 100 |

`state` collapses everything outside the three published jurisdictions to `other`, so the
parameter cannot become a location signal. `completion_bucket` is rounded to the nearest ten so
it cannot act as a fingerprint.

## Never sent

`q`, `query`, `question`, `search`, `text`, `name`, `email`, `phone`, `address`, `street`,
`city`, `zip`, `postal`, `policy`, `policy_number`, `claim`, `claim_number`, `dob`, `ssn`,
`document`, `answer`, `notes`, `value`, `input`, `user_id`, `client_id`.

Also never: page URLs carrying a query string, referrer values from a page that received a
question, or any tool-entered fact.

## Session replay

Prohibited. Not "configured off" - prohibited. Any page on this site can receive an insurance
question, and a replay of that is a recording of someone's problem.

## What is deliberately not measured

- **Which questions people ask.** The aggregate worth knowing is which topics have no page.
  That comes from the suggest-a-question path, not from logging queries.
- **Individual journeys.** No user id, no client id, no cross-session stitching.
- **Scroll depth and engagement time.** Not worth the fingerprinting surface for a library.
- **Anything on a tool page beyond start, complete, and a bucketed completion percentage.**

## Cross-domain handoff

The outbound Bollinsure link carries only: `utm_source`, `utm_medium`, `bir_source_path`,
`bir_family`, `bir_line`, `bir_source_tool`, `bir_completion`. Each is validated against a slug
pattern before it is set, and `scripts/verify.mjs` walks every built page asserting that no
outbound Bollinsure URL carries a parameter outside that list.

The visitor's question and anything typed into a tool are never included.

If GA4 cross-domain measurement is configured later, it must be verified in Tag Assistant that
one session continues across the handoff and that no address, email, phone, or free text enters
the payload.

## Before production analytics is enabled

1. Owner authorization, recorded.
2. Confirm the container carries only the eight events above.
3. Verify in Tag Assistant that no payload contains free text.
4. Confirm session replay is not enabled on the property.
5. Confirm the privacy page matches actual behaviour, because it describes behaviour rather
   than intent.
6. Re-run `npm run verify` against a production build.
