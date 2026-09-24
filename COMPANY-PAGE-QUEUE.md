# Birch company-page queue

Status: the reusable trust shell is implemented for every organization in the
Research corpus. The current sample is
`/companies/california-earthquake-authority`; the same template also renders the
California Department of Insurance and NAIC records.

This queue is the page contract. It keeps a citable organization record from
becoming a review site by giving every kind of context its own lane, owner, and
publishing gate.

## Product rule

Birch Research answers, “What can be checked, and what does the source say?”
Birch Commons will answer, “What are people discussing or reporting?” Those are
adjacent experiences, not one blended reputation record. A thread is not a
source, an experience is not a verdict, and an official response does not edit
the Research page.

## Page surface, end to end

| Order | Lane | What belongs here | Current state | Publishing gate |
| --- | --- | --- | --- | --- |
| 01 | Documented identity | Legal name, short name, organization type, jurisdiction, identifiers when sourced, dated summary, author, reviewer, and review state | Live | Every factual sentence resolves to a declared source; no record is marked reviewed without the licensed review step |
| 02 | Coverage context | Sourced explanation of the organization’s published scope, related coverage pages, and the jurisdiction that changes the reading | Shell live | Never infer a current line list from a name or marketing copy; never turn context into eligibility, limits, appetite, or claim advice |
| 03 | Official website and contact | First-party websites, contact channels, notes, and a reminder to confirm details before relying on them | Live | Link to the publisher; attach source and date; do not imply Birch is the organization or speaks for it |
| 04 | Official records | Regulator lookups, statutory basis, filings, publications, and other primary records | Live when sourced | Link to the exact public record; do not reprint a changing directory when the publisher is the better source |
| 05 | Financial context | Source links and definitions for financial material when the corpus has them | Honest empty state | No Birch financial-strength score, solvency conclusion, claim-paying conclusion, complaint rate, or ranking |
| 06 | Research connections | Questions, coverage pages, source ledger, corrections, and machine-readable JSON | Live | Research links remain citable and dated; community content is never counted as evidence |
| 07 | Forums | Broad company-specific discussion topics | Private preview | Commons deployment, sign-in, database, mail, moderation, abuse controls, and a real subject route must pass smoke tests |
| 08 | Threads | Attributed, dated conversations attached to the company subject | Private preview | Author identity, immutable edit model, withdrawal tombstone, moderation, and clear “context, not citation” treatment |
| 09 | Experiences | Structured first-person accounts, with role, relationship to the subject, timeframe, jurisdiction, and verification state | Private preview | Consent/privacy review, author disclosure, anti-defamation workflow, moderation, and a path to withdraw; never auto-promote to a Research claim |
| 10 | Professional contributions | Licensed or otherwise verified professionals may add notes, research, corrections, or responses under their own identity | Planned | Verify the person and scope of expertise; disclose conflicts and employer/agency relationship; editorial review remains independent |
| 11 | Official responses | A company or regulator can respond in a visibly separate lane | Private preview | Verify the representative and organization; preserve the original post; label the response as a response, not a correction of the source record |
| 12 | Reviews and ratings | Star ratings, reputation summaries, “best” lists, complaint-rate leaderboards, or sentiment scores | Not a Birch lane | Do not ship this as a growth shortcut. Reconsider only after a separate legal, fairness, taxonomy, denominator, moderation, and appeals decision |

## Sample interaction model

The company page opens with a compact “Company page map.” A reader can jump to
the lane that matches their question:

- **Understand the entity:** read the cited summary and identity metadata.
- **Understand the insurance context:** read the sourced scope and jurisdiction;
  then follow related Research questions.
- **Check the organization:** open the official website, contact channel, or
  regulator record directly.
- **Understand what is not known:** read the financial empty state and explicit
  non-claims instead of mistaking silence for a rating.
- **See conversation:** view separate forum, thread, experience, and official
  response states once Commons is genuinely open.

The preview intentionally shows the conversation architecture without creating
fake activity. The same treatment should be used for an organization with no
published records: say that the lane is empty or unavailable, and keep the
reason visible.

## Data additions required before new lanes open

The existing Research company schema is sufficient for the current shell. Do
not add empty arrays to make future content look live. When a lane is ready, add
the smallest explicit record needed:

1. `coverageContext`: source-backed scope statements and links to canonical
   coverage records, each with jurisdiction and effective/review dates.
2. `financialSources`: first-party filings or named rating-agency records with
   publisher, date, scope, and a note that Birch is not interpreting the result
   as a recommendation.
3. `communitySubject`: a stable subject ID shared with Commons, with no public
   URL until the Commons origin resolves and the subject has a real page.
4. `officialResponse`: a separately moderated record with representative
   verification, relationship disclosure, timestamp, and immutable provenance.

Experience records belong in Commons first. They should not be copied into the
Research JSON record merely because they are popular or repeated. Promotion to
a structured case report requires a provenance link, consent/privacy handling,
moderation, an uncertainty statement, and a Research editor’s independent
source review.

## Acceptance checklist for each company page

- The legal entity and organization type are sourced and dated.
- Official website, contact, regulator, statute, and publication links are
  visibly distinct.
- Coverage context is useful without becoming a coverage determination.
- Financial information is sourced or shown as unavailable; it is never
  replaced by a score, ranking, or implied conclusion.
- Research questions and source ledger are citable and machine-readable.
- Forums, threads, experiences, professionals, and official responses each have
  their own moderation and attribution model.
- No public community link is emitted while `PUBLIC_COMMONS_READY` is false.
- No stars, ratings, rankings, sentiment, complaint-rate, “best,” “cheapest,” or
  reputation language appears as a Birch conclusion.
- Desktop, mobile, keyboard focus, and reduced-motion states are checked before
  the page is included in the one-review packet.

