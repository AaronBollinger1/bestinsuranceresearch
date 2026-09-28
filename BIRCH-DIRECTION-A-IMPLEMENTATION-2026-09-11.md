# Direction A: selected and configured

The owner chose A / Focus on 11 September 2026. This pass carries that decision
into the existing product; it does not open public registration or publish content.

## What is configured

- `src/config/product-design.ts` selects Focus as the homepage default.
- The approved bird, fonts, palette, question composer, and hero remain intact.
- `/design/product-system` is now the selected-direction blueprint, with B/C
  retained under earlier explorations rather than a competing recommendation.
- `FocusPageHeader.astro` supplies the centered, concise task-entry pattern used
  by professional entry, the contribution workspace, and the account specimen.
- `/professionals` offers three useful paths and an explicitly illustrative
  profile, without a fabricated verified credential or contribution count.
- `/contribute` opens the actual task immediately: contribution type, title,
  coverage, prose, optional source notes, privacy check, and a private preview.
  Research/correction links correctly initialize the client on static pages.
- `/design/account-preview` uses a single focused card instead of a large split
  marketing layout. Email/inbox/profile states remain examples; no mail is sent.
- Existing company/question reading frames, source drawers, and Community
  filtering already fit this direction and remain unchanged.

## Local draft boundaries

Write -> validate -> preview -> keep editing. A preview is not a save, submission,
credential check, redaction service, or published contribution. Reloading loses it.
No email, file input, fetch, browser storage, or backend connection was added.
Draft fields are disabled in server HTML and enabled only after the submit
prevention handler is installed. Draft text has no form name, never enters the
query string, and renders using `textContent`, not HTML. Clearing asks for a
second deliberate action; cancel keeps the draft. These are product controls,
not a claim that a future submission backend has been verified.

The previous form claimed a private draft was ready without rendering one. It
also read query parameters in a static route's build-time frontmatter. Both were
replaced with a working local state flow. The old professional profile showed
"Credential verified" without a corresponding checked record; that claim is gone.

## Reference lineage

This builds on the signed-in Mobbin audit, not a new reference collection:

- [Reddit contribution flow](https://mobbin.com/flows/26ef9d17-f7e0-4e09-9af6-01311c9fbffb):
  choose context before writing; clear composition and preview actions.
- [HoneyBook setup flow](https://mobbin.com/flows/1922e5d2-1f9c-43c7-82ba-6bbc28fba7d9):
  explain the next step when it becomes relevant, not a wall of onboarding rules.
- [Private Birch reference board](https://mobbin.com/collections/38f9a642-ecc6-4e00-b9da-74c9ac44bced/web/screens).

No third-party artwork, copy, or logo was imported. No Figma edits or generated
media were needed to implement the owner's chosen direction.

## Verification

- Root `npm run validate`: 177 passed.
- Production-posture build/tests: 162 passed.
- On-page audit: zero findings over 563 indexable pages.
- Community validation: 80 passed, one external-database-dependent test skipped.
- Default preview build restored after production-posture testing.
- Browser: desktop and 390px layout, research type preselection, native invalid
  field focus, privacy confirmation, text-only preview (HTML escaped), unchanged
  query URL, retained edits, cancel/confirm clear, and account specimen progression.
- Regression tests reject an enabled-without-JavaScript draft fixture and protect
  the selected homepage, profile status, and required preview controls.

## Next implementation, not another redesign

Apply these selected patterns to the existing `commons/` invited account and
moderated submission routes. Exercise expired/resend/return states, real mail,
durable storage, and scoped permissions before opening participation. Keep all
source-read and licensed-review gates. The corpus does not become reviewed when
the interface becomes more polished.
