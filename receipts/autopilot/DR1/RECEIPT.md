# DR1 receipt: redesign readiness

Date: 2026-09-30. Parent `c495698`. Owner direction: the aesthetics will be
redone later; change no design now, make the redesign easy.

## What changed

- 81 raw colours in `global.css`, `instrument.css`, component style blocks and
  one inline print style now reference tokens: 44 new `--u-*` tokens at the end
  of `:root` in `src/styles/tokens.css`, each holding its original value and
  naming where it is used, plus two existing tokens reused where the value
  already matched (`--ink-2`, `--white`). Named by value on purpose: the
  redesign assigns roles.
- `design/REDESIGN-INVENTORY.md`: all 64 page files, each with its layout,
  template and shared components, and where the look lives.

## Proof of no visual change

Nine routes (home, ask, a coverage page, a question, a line hub, figures, a
company, a tool, a guide) captured at 390, 768 and 1280 before and after:
27 of 27 PNGs byte-identical. Three of the after captures are in this folder.

## Verify rules (each run against a broken case first)

- `no raw colour lives outside the token file, so a redesign is a token edit`:
  fails on any hex or rgb() in the stylesheets, component style blocks or
  inline style attributes outside tokens.css. Proved failing with a planted
  `#123456` in a component.
- `the redesign inventory names every page file`.

| Command | Result |
|---|---|
| `npm run validate` | 391 / 391 pass |
| production posture verify | 182 / 182 pass |

## Refuses

No rendered value changed. No layout, type or motion changed.
