BestInsurance Research favicon package

Exact icon extracted from the approved brand board.

LIGHT BROWSER / LIGHT UI:
- favicon-light.svg (black mark, transparent background)
- favicon-light-*.png
- favicon-light.ico

DARK BROWSER / DARK UI:
- favicon-dark.svg (white mark, transparent background)
- favicon-dark-*.png
- favicon-dark.ico

RECOMMENDED HTML:
<link rel="icon" href="/favicon-light.svg" media="(prefers-color-scheme: light)">
<link rel="icon" href="/favicon-dark.svg" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">

The PNG/SVG assets use transparent backgrounds.

---
Amended 2026-09-08: the site now serves /favicon.svg, a true vector traced from
icon-master-black-transparent.png by scripts/trace-mark.mjs. It carries its own
prefers-color-scheme rule, so it replaces both favicon-light.svg and
favicon-dark.svg in the RECOMMENDED HTML above. Those two files remain here but
are no longer referenced: despite the extension, each is a 340x340 base64 PNG
wrapped in an <svg> element rather than vector artwork.
