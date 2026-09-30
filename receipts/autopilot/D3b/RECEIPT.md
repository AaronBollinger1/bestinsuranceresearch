# D3b receipt: every record family quotable in one whole sentence

Date: 2026-09-30. Parent `d0eeb3d`.

- `lede` added to the coverages, companies, states, examples, modules and tools
  schemas; 67 records now carry one (37 coverage, 5 companies, 3 states,
  11 examples, 10 modules, 1 tool).
- `src/components/QuotableLede.astro` renders it under "In one sentence" on
  coverage, company, state, example and module pages; each page's meta
  description (and the JSON-LD built from it) is the lede.
- Drafted by two agents from each record's own sources; one adversarial pass
  changed one (community association module: it read as a compliance verdict);
  the loop fixed the cyber lede's dropped "or notification" branch.
- The D3 rule now requires a well-formed lede on every record in these
  families, cited except modules, and the ellipsis ceiling is 0: no page ends
  its meta description in an ellipsis (was 33).

| Command | Result |
|---|---|
| `npm run validate` | 389 / 389 pass |
| production posture verify | 180 / 180 pass |

Screenshots: `insurance_cyber-liability-*` (looked at; the lede sits above the
definition and reads at 390).

Refuses: no definition, summary or claim text changed; no review state changed.
