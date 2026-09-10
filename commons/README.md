# Birch Commons

Birch Commons is the authenticated discussion layer for Birch: threads,
replies, structured experiences, practitioner notes, moderation, and private
verification requests. It is deliberately separate from Birch Research. A
community account or post is context, not a research citation.

## Current deployment shape

Commons is a static-first Astro app with request-time routes using the official
Vercel adapter. Create a separate Vercel project for this directory; do not attach it to the existing
`bestinsuranceresearch` Research project.

Recommended Vercel project settings:

- Project name: `birch-commons`
- Root directory: `commons`
- Framework preset: Astro
- Build command: `npm run build`
- Install command: `npm install`
- Runtime: Node 24 on Vercel
- Production domain: `commons.birch.insure`

The repository's existing `bestinsuranceresearch` project remains the Research
site at `birch.insure`. No production alias should be changed by this app.

## Required production setup

1. Provision a managed Postgres database for Commons. Apply `schema.sql` once
   against that database, using the provider's migration-safe SQL console or
   `psql`; never put the connection string in git.
2. Verify the sending domain in Resend and create a production API key. The
   `COMMONS_MAIL_FROM` domain must be one Resend has approved.
3. Add the variables in `.env.example` to the Vercel Production environment.
   Use at least one real mailbox in `COMMONS_MODERATORS`.
4. Run the shape-only gate locally with values from a secure environment:

   ```sh
   npm run preflight:production
   ```

   The preflight never prints secrets and does not claim that a database or
   mail provider has been reached.
5. Deploy Commons as a preview and complete the smoke test below. Only after
   that should the Research project set `PUBLIC_COMMONS_READY=true` and expose
   public Commons links.

## Smoke test before public linking

Use a real non-production moderator mailbox and a test account to verify:

- request a magic link; consume it once; confirm a second use is rejected;
- create a session, sign out, and confirm the account is no longer accessible;
- start a thread, reply, withdraw the author's own post, and confirm the
  tombstone remains;
- report a post, review it as a moderator, and confirm hide/restore behavior;
- submit a structured experience and a professional-verification request;
- send a moderator invitation to promote a post into a case report, then
  accept and decline the invitation in separate tests;
- confirm the Research origin is linked only after these flows work and that
  every public community post carries its author and context boundary.

## Release gate

The public Research site currently defaults to `PUBLIC_COMMONS_READY=false`.
That is intentional. Do not flip it merely because a Vercel preview exists:
the database, Resend, moderator access, `commons.birch.insure` DNS/SSL, and the smoke
test all need to be complete first. Keep the Research production promotion as
a separate, explicit review action.

For local development, omit production credentials and the runtime uses the
in-memory store and console mailer. The verification suite reports the
Postgres conformance case as skipped when `COMMONS_DATABASE_URL` is absent;
that is a development signal, not a production approval.
