# Birch Commons thread — product blueprint

Status: read-only interaction pass, 2026-09-11  
Surface: `/design/thread-preview`  
Reference concept: `design/mockups/birch-commons-thread-concept-01.png`

## Product promise

**Talk about what happened, with the context attached.**

Commons is the conversation layer around Birch Research. It gives a person a place to ask for context, share a first-person experience, add a professional note, or publish an attributed company response. It does not turn a story into a verdict, and it never silently edits the citable Research record.

## Boundary for the current preview

The route is a read-only specimen. It must:

- use clearly labeled illustrative content rather than live posts, dates, people, reputation signals, or engagement counts;
- show the future thread hierarchy: room, type, author context, body, research context, replies, and moderation tools;
- keep the composer disabled because authentication, moderation, notification, retention, reporting, and withdrawal are not provisioned;
- preserve a visible path back to public Research and its source ledger;
- avoid likes, votes, ranking, ratings, endorsements, popularity metrics, ad units, and company logos.

## Thread anatomy

1. **Room context** — Commons, a line-of-business room, and a thread type.
2. **Human context** — author display choice, affiliation or verification state when relevant, and a specimen/live state.
3. **First-person account** — what the person observed, what they are asking, and what they are not claiming.
4. **Research bridge** — links to the relevant public Research entry and source registry; no source is implied by the anecdote alone.
5. **Replies by lane** — experience, professional note, source request, or company response each receive an explicit label and disclosure.
6. **Thread tools** — report, correction, and withdrawal remain available in the real product and are shown as inactive in this specimen.
7. **Join gate** — sign-in and moderation are prerequisites to publishing.

## Future contribution object

```text
commons_thread
  id                 opaque server id
  room               homeowners | auto | business | life | professional
  type               experience | professional-note | source-request | company-response
  author_id          authenticated account id
  display_name       public name or protected display choice
  affiliation        optional, verified separately from editorial status
  body               moderated post body; never merged into Research prose
  source_links       optional public source records or original links
  disclosure         conflict / role / relationship statement
  moderation_state   draft | queued | published | limited | withdrawn
  correction_state   none | requested | published
  created_at         server timestamp
  updated_at         server timestamp
```

The thread object must not accept a private policy document, policy number, claim number, health information, or other identifier as a casual post field. The future Coverage Lens workflow is separate and requires its own consent and retention design.

## Moderation and trust sequence

1. A contributor chooses a lane before writing.
2. Birch warns the contributor to remove identifiers and separate observation from inference.
3. The draft is checked for privacy, harassment, defamation risk, conflicts, source misuse, and impersonation.
4. A moderator can request clarification, limit visibility, publish a correction, or decline publication.
5. A published post keeps its original label and edit history. Company responses add context; they do not erase a person’s account.
6. A correction links to the changed post and records what changed. A withdrawal leaves an honest withdrawal state rather than making the conversation appear never to have existed.

## Visual and interaction rules

- Keep the left room rail, center reading column, and right context rail on wide screens; stack them in the order room → thread → context on narrow screens.
- Use cobalt for navigational and research actions, gold for professional/context cues, and green only for an organization lane. Color is always paired with text.
- Use motion for hover orientation only: 150–220ms card lift, arrow nudge, focus ring, and a soft selected-room state. Reduced motion removes transforms and transitions.
- Keep the reading column typographic and calm. Engagement mechanics should never compete with the first-person account or its research bridge.

## Acceptance criteria

- `/design/thread-preview` builds, is noindex, and identifies itself as a specimen/future surface.
- It has one h1, a skip link, a main landmark, keyboard-visible controls, and no collecting form.
- The Research bridge points to built public routes; no fake source is attached to an illustrative experience.
- Sign-in, report, correction, and withdrawal controls are visibly gated and inert.
- The Commons page links to this detail specimen without advertising a live Commons origin while `PUBLIC_COMMONS_READY` is false.
- The page remains understandable without knowing Reddit, X, or any future account system.
