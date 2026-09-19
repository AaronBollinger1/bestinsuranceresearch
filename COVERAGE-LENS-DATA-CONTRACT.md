# Coverage Lens data contract

Status: design contract only. Coverage Lens is not an upload, OCR, advice, or
policy-storage service in the current Birch Preview. This document describes
the conditions that must be true before any of those capabilities can be
enabled. It is an implementation and counsel-review artifact, not legal advice.

## The product promise

Coverage Lens helps a person organize an insurance document and prepare better
questions for a licensed professional. It does not say that a person has a
coverage gap, decide whether a claim is covered, choose a product, estimate a
price, decide whether an insurer will accept a risk, or provide individualized
insurance, legal, tax, or financial advice.

The user-facing language is deliberately limited to:

- **Found** - a field or phrase was identified in the document or in the user's
  own structured input.
- **Not found** - the selected material did not expose a field that this
  workflow knows how to identify.
- **Unclear** - the extraction or the document is ambiguous and needs a human
  to check it.
- **Needs professional review** - the question depends on the full policy,
  endorsements, facts, or a licensed professional's judgment.

The product must never silently turn any of those states into “not covered,”
“underinsured,” “eligible,” “ineligible,” “approved,” or “denied.”

## The current Preview contract

The current `/lens` page is intentionally a browser-local preflight:

1. Selecting a PDF or image only gives the browser a `File` object and displays
   its name and approximate size. The file is not opened, parsed, uploaded, or
   sent to an OCR or AI provider.
2. The redaction preview accepts only a short excerpt that the reader chooses
   to paste. It masks a small set of common patterns locally, then tells the
   reader that the heuristic is incomplete.
3. Reset clears the selected file, excerpt, checkbox, and preview result from
   the page. Closing the tab ends the browser session. No account, analytics
   event, URL parameter, cookie, server log, Research record, Commons post, or
   CRM lead is created by the flow.
4. The file picker is not an upload control. Until the future gates below are
   approved, the page must continue to say so plainly.

The Preview must remain useful without an account and must not ask a visitor to
upload a document as a prerequisite for reading Birch Research.

## Data classes and allowed destinations

| Class | Examples | Allowed destination | Default lifetime |
| --- | --- | --- | --- |
| Public research | Coverage explanations, source ids, public company records | Birch Research, its machine companions, and frozen releases | According to the public corpus release policy |
| Transient document bytes | PDF, image, declaration page, policy excerpt | Browser memory only in Preview; a future private service only after the upload gate | Delete on reset, expiry, or explicit deletion; never public |
| Derived private fields | Line of insurance, form identifier, limit, deductible, effective date, endorsement label | Future private Lens workspace only, if the user consents to each use | Short-lived by default; exact TTL must be chosen before implementation |
| Identity and account metadata | Magic-link account id, consent version, deletion event | Future Commons/private account store only | Account policy; never copied into Research |
| Contribution context | A voluntarily shared, de-identified explanation or question | Commons only after explicit author submission and moderation | Controlled by Commons publication and withdrawal rules |

No document bytes, extracted policy fields, account identifiers, or private
attestations may enter the Research corpus, `/claims.json`, the public search
index, a dataset release, a Commons thread, an analytics event, or model
training data. A professional handoff is a user-selected disclosure, not an
automatic side effect of analysis.

## Required lifecycle

The implementation should use an explicit state machine rather than a boolean
called `uploaded`:

`local-selected -> local-redaction -> consent-required -> private-extraction ->
user-review -> optional-handoff -> deleted`

Every state must also be able to reach `expired` or `deleted`. A failed parser,
provider timeout, consent withdrawal, account deletion, or suspicious access
must not leave an orphaned document. The UI must show the current state and the
next destructive or sharing action in plain language.

### 1. Local preflight

Before a file leaves the device, the user sees the document classes that Birch
will refuse: names, addresses, policy and claim numbers, payment details,
signatures, dates of birth, health information, credentials, and another
person's data. The user can cancel without creating an account. File type and
size limits are enforced before parsing, and the limit is shown before the
picker opens.

### 2. Redaction review

Client-side masking is a convenience, not a guarantee. The review screen must
show the original excerpt and the proposed redacted version in separate,
clearly labeled panels. The user must be able to correct extracted text,
remove a field, discard the document, and start over. A green “safe” badge is
not allowed; the honest status is “Review required.”

If an identifier is not confidently recognized, it is treated as present. A
future provider may receive only the minimum selected material, over an
authenticated encrypted connection, after the user has seen the destination,
purpose, retention period, and provider terms.

### 3. Extraction and correction

Extraction is opt-in and private. The result is a proposed map, not a finding:

- field name;
- extracted value or masked value;
- page or region where it was found, when reliable;
- confidence and ambiguity explanation;
- link to a public Birch explanation, when one exists;
- status: `found`, `not-found`, `unclear`, or `needs-professional-review`.

The user corrects or removes every proposed field before it can be used in a
handoff. Original bytes are deleted by default after extraction. If a provider
requires temporary retention, the UI must show the exact reason and expiry,
and the server must enforce the expiry rather than relying on a promise in
copy.

### 4. Professional handoff

The user chooses whether to share anything and sees a final review of the
selected fields. The handoff says what is being sent, to whom, why, and for how
long. No silent CRM lead, phone call, quote request, or marketing subscription
is created. The licensed professional receives a question list and disclosed
context, not an instruction that Birch has made a coverage decision.

The Research-to-Bollinsure handoff remains a separate commercial surface. A
Birch account, a professional role badge, or a Canopy Connect-style coverage
attestation must never be presented as an endorsement, recommendation, or
proof that a particular policy is suitable.

## Deletion and access requirements

Deletion is a first-class product action, not a footer link. Before activation,
the implementation owner must choose and document:

- maximum retention for original bytes, extracted fields, consent records, and
  access logs;
- whether deletion is immediate or queued, and the maximum completion time;
- how provider-side copies and backups are deleted or expire;
- whether a user can revoke a handoff after it has been delivered;
- the account-deletion cascade for sessions, attestations, and drafts;
- the minimal non-content audit record retained to prove deletion happened;
- support ownership and the incident path if a deletion fails.

The deletion audit may retain event type, opaque internal id, timestamp, and
result. It must not retain document text, policy values, claim facts, names,
addresses, or raw provider payloads. Access logs must use the same minimization
rule.

## Security and vendor gate

No OCR, AI, storage, or policy-connection integration is production-ready
until counsel and the security owner approve all of the following:

- threat model and data-flow diagram;
- encryption in transit and at rest, key ownership, and secret rotation;
- authentication, authorization, tenant isolation, and support access;
- file-type, size, malware, prompt-injection, and content-boundary handling;
- provider terms, retention, deletion API, subprocessors, and model-training
  defaults;
- backup, restore, incident response, and deletion verification;
- response headers, CSP, rate limits, abuse controls, and observability that
  cannot capture document content;
- a professional-review policy distinguishing education from regulated advice.

The cheapest acceptable first implementation may be client-only extraction with
no server persistence. If a server or third-party provider is later chosen, it
must be a deliberate decision recorded here, not an incidental dependency
added to make a demo work.

## Acceptance tests before enabling any upload

The following are release gates, not future aspirations:

1. A network test proves no bytes leave the browser before consent.
2. A consent test proves that declining, revoking, or timing out leaves no
   document or derived field in the private store.
3. A deletion test proves original bytes, derived fields, provider copies, and
   user-visible links are removed or expired within the documented window.
4. A privacy test proves documents and fields never reach Research, Commons,
   analytics, URLs, email subject lines, logs, backups, or model training.
5. An authorization test proves one account cannot read another account's
   workspace, handoff, or deletion record.
6. A boundary test proves every output uses only the four allowed statuses and
   never emits a coverage, eligibility, price, or risk verdict.
7. A professional-handoff test proves the user selects the payload and that no
   silent CRM or quote action occurs.
8. A failure test proves provider, parser, malware, and timeout failures leave
   a clear state and do not create a partial public record.
9. A usability test proves the flow is understandable on a phone, keyboard
   navigable, reduced-motion safe, and cancellable at every step.
10. Brian and counsel sign the exact copy, retention period, provider choice,
    and advice boundary before the feature flag changes from preview to live.

Until every gate has an owner and evidence, the correct production behavior is
the current local preview: explain the workflow, allow reset, and do not upload
or analyze a policy.
