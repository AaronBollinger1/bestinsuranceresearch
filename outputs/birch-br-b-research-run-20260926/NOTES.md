# BR-3 research-run page - responsive and interaction evidence - 2026-09-26

Captured against the production-posture build served locally by
`astro preview` on `localhost:4322`. No remote action; the server was
stopped after capture. All figures below were read from the live DOM with
`document` queries, not estimated from pixels.

## Responsive (no horizontal overflow at any width)

| Width | Page | scrollWidth == clientWidth | File |
| --- | --- | --- | --- |
| 390 (mobile emulation, dpr 2) | run-success | true (390/390) | run-success-390.png |
| 768 | run-success | true (768/768) | run-success-768.png |
| 1280 | run-success | true (1280/1280) | run-success-1280.png |
| 390 | run-no-source | captured | run-no-source-390.png |
| 1280 | run-licensed-review-required | true | run-licensed-review-required-1280.png |
| 1280 | run-provider-outage (mid-replay, at the resumed step) | true | run-provider-outage-1280-resumed.png |
| 1280 | run-success (mid-replay, step 4 of 13) | true | run-success-1280-replay-step4.png |

## Interaction (read from the DOM)

- Default render shows the complete recorded step list (13/13 on
  run-success) - this is also the no-JS and reduced-motion rendering.
- "Replay from the first event" -> status region announces
  "Step 1 of 13: Queued. Recorded 2026-09-26T09:00:00.000Z."; 1 step visible.
- "Next recorded event" -> "Step 2 of 13: Checking Birch evidence.
  Recorded 2026-09-26T09:00:05.000Z. 4 Birch evidence passages."
- Cancel enabled at pipeline steps, disabled at refresh-due/failed; Retry
  enabled only at failed/blocked/stale (verified true on run-no-source,
  false at run-success end). Both render read-only explanations; a
  disabled Retry click changes nothing.
- Provider-outage replay: step 5 "Provider unavailable" (cancel enabled,
  retry disabled), step 6 "Resumed. Recorded 2026-09-26T13:20:00.000Z."
- All six controls are native buttons, keyboard focusable (activeElement
  check), computed min-height 44px; rendered heights 45px at every width.
- `document.getAnimations().length === 0` - the page runs no animation at
  all, so reduced-motion parity is structural, and the page script
  contains no setInterval/setTimeout/requestAnimationFrame (asserted by
  scripts/verify-research-run.mjs).
- `aria-live="assertive"` count 0; the status region is `role="status"`.
- Status lines carry recorded timestamps and real counts only; no
  percentage appears anywhere on the page.
