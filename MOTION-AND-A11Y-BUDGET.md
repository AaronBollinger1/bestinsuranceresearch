# Birch motion and interaction budget

This is the shared acceptance contract for the Research shell, the company-record
surfaces, private contribution drafts, and the Commons specimen. It keeps the
interface calm while making the important controls easy to use on a touch device.

## Interaction targets

- `--tap` is 44px and is the minimum height for header navigation, header search,
  buttons (including `btn-sm`), segmented controls, tabs, fields, and mobile
  navigation links.
- Inline citations, legal links, breadcrumb links, and footer links stay dense
  reading links. They are not promoted into buttons; their spacing and visible
  focus state must remain usable without making source-led prose difficult to scan.
- Every icon-only control uses a square `--tap` target and an accessible name.

## Motion

- The default shell may use short background, color, opacity, and spatial
  transitions for wayfinding: header menus, hover/focus affordances, disclosure
  chevrons, and the loading mark.
- The Research loading mark uses a 1.6 second orbital point around the exact
  Birch bird. The bird itself does not rotate or morph. The orbit means “source
  resolution is active”; it is not a progress percentage and must not imply a
  confidence score.
- Research answer transitions may use a 220ms content fade, a 280ms evidence
  rail slide, and a 200ms Question-to-Record state change. Professional
  contribution state changes may use one 300ms step. These timings are cues for
  state changes, not decoration behind readable claims.
- No research claim, citation, source ledger, or contribution text animates on
  page load. No hero autoplay is part of the Research surface.
- `prefers-reduced-motion: reduce` disables animation and transitions and removes
  hover/press translation or rotation. A menu or disclosure still opens in its
  final state; reduced motion changes movement, not access to content.
- The shell timing tokens remain bounded: `--dur-1` 120ms, `--dur-2` 180ms,
  `--dur-3` 240ms, and `--dur-4` 360ms for a larger menu only.

## Review loop

The representative browser check covers `/`, `/ask`, one company record,
`/contribute`, `/professionals`, and `/design/commons-preview` at desktop and
mobile widths. It confirms no horizontal overflow, visible focus for keyboard
navigation, a working Escape path for the menus, and 44px targets for the
primary controls. The build guard in `scripts/verify.mjs` keeps the shared rules
from regressing when new pages are added.
