# D0 and I3 receipt

Date: 2026-09-30. Parent `f3fb575`.

## D0: design, SEO and GEO audit

A read-only agent measured the preview build (1,203 pages, 402 sources, 2,382
claims) against the design, motion, schema, SEO and AI-citability rules, ranked
26 findings by how much each helps an answer engine find, parse, trust, quote
and attribute a Birch claim, and proposed 18 units. The full report is
`AUDIT.md` in this folder. Nothing in the repo was edited by the audit.

The units are now D1-D18 in AUTOPILOT.md. D10 (Bollinsure lead CTA on 177
Record pages) is taken first because AUTOPILOT.md's never-list already forbids
a lead CTA on the Record; it is a rule violation, not a new decision. F9 (hub
stat bands) and F25 (390px screenshots) were already fixed in R1a; the /figures
contrast part of F9 remains as D4.

## I3: uncited market practice on the EPL page

`employment-practices-liability.json` said wage and hour exposure "is commonly
addressed by sublimit, by defence-only cover, or not at all" with no source and
no label. No source for it has been read, so per the editorial standard the
claim is deleted rather than softened. The note now says the record has read no
form and points to the wage and hour defense page. The record stays
`under-review`.

New verify rule: `market practice is either cited or labelled as practice,
never stated as a rule`. Proved failing against the old EPL text; the other six
corpus sentences that speak for insurers generally all carry a citation or the
"practice rather than a rule" label.

## Commands

| Command | Result |
|---|---|
| `npm run validate` | 386 / 386 pass |
| production posture verify | 177 / 177 pass |
