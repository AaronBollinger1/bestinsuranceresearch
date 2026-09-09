## Start here

This repository is two properties, and the rules that govern them are checked in
rather than held in a conversation. Read these before changing anything:

- **`DIRECTION.md`** - what this is and the rules that do not bend. Never push
  to `main`; never publish a rating, ranking, price, quote or risk score; never
  mark a record `reviewed` (that is a licensed act belonging to Brian
  Bollinger); never write a claim without reading the source.
- **`HANDOFF.md`** - the live state of play. Section 1 is the only figure set to
  trust. Section 1a is how to pick this up on a machine that has never seen it,
  including the traps that have each cost a pass. Section 1b is the audit lens
  currently producing findings.
- **`BIRCH.md`** - the rebrand: one property called Birch, carrying both the
  cited evidence layer (Birch Research) and validated discussion, and the rules
  the rebrand is not allowed to relax.
- **`AMBITION.md`** - the reconciled order of work.
- **`.claude/skills/continue-bir/SKILL.md`** - the continuation prompt. Invoke
  the `continue-bir` skill to run a pass.

**What this is building, in one line:** Birch - one insurance property carrying
a cited evidence layer (Birch Research) and a validated discussion layer, so a
reader gets the sourced answer and what practitioners and policyholders actually
saw, without either contaminating the other. `HANDOFF.md` section 1 has the
state, and the "What to pick up next" list under it is ordered and says what is
blocked.

`git log` is the audit trail. Commit messages are long on purpose: each says
what was measured, what the measurement returned, and what was proved before the
fix was believed.

**Validate in both indexing postures, or you have only run half the suite:**

```
npm run validate                       # preview posture: check + build + tests
PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://bestinsuranceresearch.com npx astro build
PUBLIC_SITE_ENV=production PUBLIC_SITE_ORIGIN=https://bestinsuranceresearch.com \
  node --experimental-strip-types --test scripts/verify.mjs scripts/verify-instrument.mjs
npm run audit:onpage                   # production build only, by design
cd commons && npm run validate         # Birch, the community: its own suite
```

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
