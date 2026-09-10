# Birch

Written 9 September 2026, on the owner's instruction to rebrand BestInsurance
Research as **Birch** - one insurance property carrying both the cited evidence
and validated human discussion: forum threads, carrier pages, practitioner
contributions.

This supersedes `COMMONS.md` section 10 on naming. It does **not** supersede
section 2, and the difference between those two things is the whole document.

---

## 1. The decision

**Birch is the brand, and it covers everything.** The research corpus and the
community are one property under one name, one wordmark, one navigation. A
reader arrives at Birch, asks a question, reads a cited answer, and finds
underneath it what practitioners and policyholders have said about the same
subject. That is the product, and splitting it across two names was making it
two products.

The name clears the three constraints `COMMONS.md` set and still does: it is not
a verb of selling, it claims no official standing, and it is a place rather than
a job title. The paper birch is the tree the visual system already comes from.

## 2. What the rebrand does not get to change

`COMMONS.md` section 2 gave four reasons for a separate origin. Three of them
were about the **name and the branding on the page**, and the rebrand answers
them. One was not, and it is the load-bearing one:

> Coverage discussion by unlicensed people on a page headed *Operated by
> Bollinsure*, under licence 6013787, is a regulatory problem a disclaimer does
> not fix.

That is a statement about **what appears on a page**, not about how many domains
exist. So it survives the rebrand, restated as a rule the build can actually
check - which makes it stronger than the domain split ever was, because a domain
split was only ever a proxy for it:

> **No page carries both the agency licence disclosure and user-contributed
> prose.**

The evidence layer says who is licensed, because it must. The discussion layer
says plainly that it is not an insurer, an agency or a regulator, and carries no
licence number. One brand spans them; the disclosure does not.

Two other rules cross unchanged, and neither is negotiable:

- **Nobody publishes a verdict on whether a claim should have been paid.** Not
  staff, not a reader, not a licence-verified broker, not a lawyer. On the
  evidence layer the build enforces it; in discussion, moderation does. It is
  the licensing line, and it is also the thing that makes the discussion worth
  reading.
- **The evidence layer never cites the discussion layer.** A `[S:]` marker
  resolves to a published document, and it always will. A thread is not
  evidence, however good it is. The layering is one-way and the build already
  throws on an unresolved marker.

## 3. Why the origins stay separate for now

The brand unifies; the origins do not have to, and pulling them together is the
riskiest part of the change with the least product value.

| | Origin | Carries |
| --- | --- | --- |
| **Birch Research** - the evidence layer | `bestinsuranceresearch.com` today | Cited corpus, 299 sources, the operator's legal name and licence number on every page. No accounts, no forms that post, nothing collected |
| **Birch** - the community | `birch.insure` | Accounts, case reports, threads, moderation. No agency branding, no licence number |

**The origin is a DNS decision and it is the owner's.** Three options, in the
order I would take them:

1. **Leave the evidence layer where it is and rebrand the name only.** Zero
   migration risk, keeps whatever authority the domain has accumulated, and the
   two layers cross-link under one wordmark. This is what is being built now.
2. **Move it to `research.birch.insure`** once the community is real. One
   registrable domain, still two origins, and the reader sees one property. This
   is the intended end state.
3. **Acquire a `.com`.** `.insure` is a TLD carriers and agencies buy, and this
   property's value is being visibly independent of both. The reservation
   recorded in `COMMONS.md` section 10 stands. Worth taking as an upgrade if the
   word is obtainable.

Nothing in the codebase should hardcode the choice. The Record's origin is one
value in `src/config/site.ts`; the community's is one value in
`commons/src/config/commons.ts`. That is deliberate and was already learned the
hard way - the origin was in two files once, and shipped a `robots.txt`
advertising a sitemap on one host containing URLs on another.

## 4. What "validated" has to mean

The owner's word for the contributions is *validated*, and it is the right word
to hold the project to. A forum of strangers asserting what should have been
covered is worth nothing and is a licensing problem besides. What is worth
something is a corpus of accounts saying *this happened, here is what turned on
it, here is who decided* - attributable, checkable, and honest about what it
cannot generalise to.

Validation is three separate things, and conflating them is how forums rot:

1. **The account is real.** Magic link, no passwords, only hashes stored. Built.
2. **The contributor is who they say they are.** A licence number checked
   against the state regulator's public lookup earns a badge and a role -
   broker, adjuster, attorney, accountant. Anybody else posts as a reader, and
   the difference is visible on every post. The request and moderator-decision
   flow is built; the actual register lookup remains a human/network-dependent
   action.
3. **The contribution itself has been read by a person.** Case reports are
   moderated before publication and land in git as files, with version history
   and a reviewable diff. Threads cannot work that way and must not pretend to -
   see section 5.

## 5. Threads, and the honest version of a forum

A structured case report going through a moderation queue into a git commit is
right for a durable artifact and impossible for a conversation. Nobody replies
to a question and waits two days for a commit.

So threads are a different mechanism with different promises, and the site has
to say which one a reader is looking at:

- A **thread** is attached to a subject the evidence layer already has a page
  for - a carrier, a coverage line, a question. It is conversation. Posts appear
  when written, from verified accounts only, and moderation is after the fact.
  It is never cited, never included in the dataset release, and never presented
  as a finding.
- A **case report** is a structured account, moderated before it appears,
  published as a file in the repository. It has a stable URL and a review
  history.

A thread can become a case report. That is the promotion path and the thing that
makes the forum worth having: somebody describes what happened to them in a
thread, a moderator recognises it as an account worth keeping, and asks them to
put it through the structured form. The forum is where the corpus finds its
material.

**Every post carries the same standing sentence the eleven examples already
carry, because it is the model for the whole property:**

> No authority decided this. It is illustrative only.

## 6. Carrier pages

The owner asked for pages for carriers. Three records exist. A carrier page
under Birch has three bands, and the order is the argument:

1. **What is documented.** Filings, market conduct actions, statutory
   obligations, financial statements - cited, with an openable source, exactly
   as the corpus already works.
2. **What is not documented, said plainly.** The absence is a finding. Where the
   NAIC data does not hold complaints by carrier, the page says so rather than
   leaving a reader to assume nothing happened.
3. **What people say.** Threads and case reports about that carrier, clearly
   marked as accounts rather than findings, never mixed into band 1.

**This is blocked on network access, not on design.** Every primary-law and
regulator host - the CDI, the NAIC, SERFF, the DFS, the TDI, the FLOIR - is
blocked at `CONNECT` in the current environment while web search still works,
which is the worst combination available: search results are exactly what the
editorial standard forbids citing. A pass that cannot reach a regulator cannot
write a carrier record, and must not fake one from a snippet.

## 7. Sequence

1. **Rename the evidence layer to Birch Research.** One config value, the
   wordmark, the schema.org `Organization`, and a test that the old name only
   survives where it must.
2. **Threads on the community, attached to subjects.** The data layer, the
   permitted surface, moderation after the fact, and the promotion path to a
   case report are built and covered by the Commons suite.
3. **Licence verification and the role badge.** What makes "validated" true.
   The request and moderator decision are wired; the checked-register lookup
   remains a human/network-dependent action.
4. **Cross-linking**, once Commons content exists: an evidence page names how many
   accounts exist for its subject and links to them, without citing them.
5. **Carrier pages**, when a regulator host is reachable.
6. **Coverage Lens**, only as a separately threat-modeled, local-first service.

## 8. What must not change to make this easier

The frozen dataset release at `public/dataset/2026-09-09/` keeps the name it was
cut under. It is checksummed and its manifest promises immutability; rewriting a
frozen release to tidy a brand is exactly the thing that promise exists to
prevent. A release is a historical artifact and reads as one.

Nothing else in this document licenses relaxing a rule in `DIRECTION.md`. The
rebrand changes what the property is called and how many products it looks like.
It does not change what may be published.
