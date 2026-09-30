# D7 receipt: the machine files carry claims

Date: 2026-09-30. Parent `91ad172`. Findings F4 and F13 (receipts/autopilot/D0/AUDIT.md).

- Record companions (questions, coverage, guides, companies, states, examples,
  tools): every `sources[].supportsClaims` entry is now
  `{ claimId, canonicalUrl, checksum, text }` instead of a bare string, so a
  consumer can cite and verify a claim from the record without a second fetch.
- `llms-full.txt`: every entry gains a `claim addresses:` line naming the
  claim ranges behind it (was 0 claim addresses in the file).
- The checksum rule is stated in the same words in `llms.txt`, `/for-ai` and
  `citation-manifest.json` (new `claimChecksum` block): sha256 over the exact
  UTF-8 claim text, first 12 lowercase hex characters.
- `llms.txt` gains an Industries section listing every industry page (14).

Verify rule: `the machine files carry claim addresses, checksums and the rule
that makes them`: companion claims are objects whose checksum recomputes from
their text; every llms-full entry with sources has claim addresses; all three
files state the algorithm; llms.txt lists every built industry page. Proved
failing by altering the algorithm wording in the built llms.txt.

| Command | Result |
|---|---|
| `npm run validate` | 393 / 393 pass |
| production posture verify | 184 / 184 pass |

Screenshots: `for-ai-*` (looked at). llms-full.txt is 1.34 MB.
Residual (from F13, not done here): llms-full lists ranges, not per-claim
checksums; /for-ai still has typographic punctuation in its prose.
