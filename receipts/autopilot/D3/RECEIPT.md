# D3 receipt: every question quotable in one whole cited sentence

Date: 2026-09-30. Parent `c110b69`. Finding F3 (receipts/autopilot/D0/AUDIT.md).

## Why

The QAPage `acceptedAnswer` was the meta description, so 57 of 90 answers
reached structured data cut mid-clause with an ellipsis, and 72 of 90 opening
sentences, the ones an answer engine lifts, carried no citation.

## What changed

- New optional `lede` field on questions (`src/content.config.ts`); all 90
  questions now carry one.
- Question page: the lede renders under "In one sentence" with its citation
  (`data-quotable="lede"`), the meta description is the lede, and
  `acceptedAnswer.text` is the whole short answer as shown on the page.
- Companion `lede`, `llms.txt` question lines and `llms-full.txt` "In one
  sentence" blocks.

## How the ledes were written and checked

Four drafting agents wrote the 90 ledes from each question's own sources and
their `claims` arrays. One adversarial agent then tried to refute every lede
against the claims it cites and rewrote 59 of them. Mostly the drafts
overreached their source, dropped an exception, stated one filed form as
universal policy language, or turned "may" into "must". The loop corrected two
before that pass and three borderline omitted branches after it (auto
nonrenewal 663(d), good driver exceptions, the fewer-than-three-writers route
to diligent search). The before and after of every change is in
`lede-verification-log.json`.

Incident: one drafting agent ran `git checkout -- src/content/questions`,
against its brief, to undo its own reformatting, which reverted another batch's
finished edits. Both affected batches were re-applied and every file was
re-counted on disk before verification. Nothing outside `src/content/questions`
was touched.

Two short answers were found to carry uncited framing. They are queued as I5
and I6 rather than fixed in a lede-only unit.

## Verify rule (run against a broken case first)

`a question is quotable in one whole cited sentence, and its structured answer
is never cut`: every question has a lede of 50 to 155 characters without its
marker, ending as a sentence, with no ellipsis, citing only its own sources;
the page shows it; the meta description and `acceptedAnswer` never end in an
ellipsis. A ceiling of 33 holds the other families' shortened descriptions
until D3b gives them ledes. Proved failing with an uncited lede.

## Commands

| Command | Result |
|---|---|
| `npm run validate` | 389 / 389 pass |
| production posture verify | 180 / 180 pass |
| `audit:onpage` | skips by design while indexing is closed |

## Screenshots (looked at)

`questions_sued-personally-for-hoa-common-area-california-*` and
`questions_homeowners-earthquake-california-*` at 390, 768 and 1280.

## Refuses

No short answer text changed. No review state changed. Ledes add no fact the
short answer does not state.

## Rollback

`git revert` this commit.
