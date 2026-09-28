# Birch Shelf — product blueprint

Status: first interaction pass, 2026-09-11  
Surface: `/shelf`  
Reference concept: `design/mockups/birch-shelf-concept-01.png`

## Product promise

**Keep a trail of what you are learning.**

The Shelf is the private continuity layer between Birch’s public Research records and the future Commons. It should help a reader return to a question, company dossier, coverage guide, or tool without making the reader create an account to browse. It is not a feed, a lead form, a recommendation score, or an insurance decision engine.

## Boundary for the current preview

The route is an interface specimen, not an account system. It must:

- show a realistic signed-out/private-preview state using only existing public Birch records;
- keep all saved-card examples linked to built, crawlable pages;
- make the disabled account gate explicit: no signup, email collection, upload, persistence, or community posting;
- preserve the Research / Companies / Commons separation;
- avoid invented save counts, activity, endorsements, ratings, recommendations, or policy conclusions.

The current Vercel review environment remains the access gate. A future application may put the Shelf behind authentication, but this static route must not imply that authentication, magic links, or a private database already exist.

## Information architecture

1. **Identity and state** — Birch mark, Research / Companies / Commons navigation, and a visible `Private preview` state.
2. **Private-workspace promise** — one sentence explaining that saved research is private until the reader chooses to share it.
3. **Saved research** — three cards representing the canonical record types: question, company, and coverage. Each card uses real corpus facts and links to the public record.
4. **Privacy rail** — “Keep it private → Review anything → Share after review.” The rail explains future behavior without collecting anything now.
5. **Account gate** — “Accounts are not enabled in this preview.” The primary reader action stays “Read without an account”; a disabled preview-access control is explanatory only.

## Future record model

The eventual private data model should be deliberately smaller than the public corpus:

```text
shelf_item
  id                 opaque server id
  owner_id           authenticated account id
  record_type        question | company | coverage | source | tool | thread
  record_path        canonical Birch path, validated against the public index
  note               optional private note, encrypted or otherwise access controlled
  created_at         server timestamp
  updated_at         server timestamp
  sharing_state      private | share-requested | published
```

The server must never treat a private note as a public claim. Publishing a note or contribution must create a separate reviewable object with its own author context, provenance, privacy review, moderation state, and withdrawal path.

## Account and privacy sequence

When this moves beyond a specimen:

1. Read without an account remains the default.
2. A reader chooses `Save to shelf` from a public record.
3. Birch asks for a magic link only at the moment persistence is requested.
4. The account screen explains exactly what is saved, for how long, and how to delete it.
5. A private note is never used as a training, ranking, marketing, or professional lead signal without a separate explicit choice.
6. Sharing begins a review flow; it does not make a private note public immediately.

No policy upload or Canopy Connect connection belongs in the first Shelf release. Those are a separate, high-sensitivity workflow with an explicit consent, redaction, retention, processor, and professional-duty review.

## Visual and interaction rules

- Keep the existing Birch bird mark and the editorial-fintech token system: paper, ink navy, cobalt, muted gold, Newsreader, Schibsted Grotesk, and IBM Plex Mono.
- Use one primary action per state: `Read without an account` for the current preview; `Save to shelf` only after authentication is real.
- Use motion for orientation, not persuasion: a 150–220ms card lift, a quiet focus ring, and a reduced-motion-safe selected-tab transition are enough.
- Never animate a score, popularity signal, urgency counter, or claim.
- Keep the privacy rail visible on desktop and move it above the gate on narrow screens.
- Disabled controls must explain why they are disabled; they must not look like a broken form.

## Acceptance criteria

- `/shelf` builds and is noindex until accounts and persistence are live.
- The route has one h1, a skip link, a main landmark, accessible labels, and no form controls that imply collection.
- Each example card links to a built public record and uses values read from the corpus.
- The account gate says no signup is enabled and the disabled control cannot submit, navigate, or capture an email.
- Existing production posture remains unchanged: the preview stays gated and production is not promoted.
- The page remains useful to a reader who ignores the future account layer.

## Recommended next surface

After the Shelf specimen is accepted, build the read-only Commons room as a route-level prototype. It should reuse the existing contribution labels—experience, professional note, source request, company response—but add a thread detail state, report/correction affordances, and explicit separation from Research before any durable posting backend is introduced.
