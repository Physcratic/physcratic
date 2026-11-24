# Authored public worked solutions

## Product correction (24 November 2026)

With `AUTHORED_PUBLIC_SOLUTIONS_ENABLED` on and migration 0020 installed,
publishing a new revision makes its worked solution and included files public.
Studio uses one publication confirmation and sends the saved draft version.
Older Studio clients may still send the former consent field. Migration 0020's
`solution_consented_at` column records the publication time for new public
revisions. Already-published legacy revisions keep their original access policy.
Only the current public revision is served. Automated grading keys remain private.

Arena uses the signed-in student's saved submissions for its Attempted label,
including submissions on earlier revisions. Personal completion still uses the
current revision. Opening the problem or its public worked solution records no
attempt. Public-solution revisions remain excluded from verified-solve statistics
and solve achievements. Republishing under the public policy can remove earlier
verified credit and hide a displayed solve badge if eligibility falls below its
threshold. Saved attempts and badge selections remain in storage.

## Original release

17 November 2026. Implementation from main `806b85d`. Source release does not
install0020 or authorize exposure. `AUTHORED_PUBLIC_SOLUTIONS_ENABLED` defaults OFF.
[Owner migration package](../../scripts/public-solutions-release/README.md).

## Revision consent and legacy behavior

With the gate ON, publication requires `publicSolutionConsent:true` alongside the
exact saved draft version. Author confirmation runs after pending saves complete,
while the editor is busy. Cancellation performs no publish request. Consent is not
stored in local preferences or silently reused. A stale draft/account cannot seal
another owner's revision. Server verification, origin checks, quotas and existing
transactional sealing remain authoritative.

Migration0020 adds immutable policy and consent time to the revision. New consent
uses `public-solutions-v1`, with a server timestamp equal to published_at. Every old
revision defaults to `legacy-private-v1` and stays private. Only a new explicitly
consented republication transitions access. Existing verified per-part reveal/
permission APIs remain functional for legacy publications. They cannot authorize
public-policy revisions through a conflicting second permission model.

No new consenting-user FK, attempt column, reveal event or trigger rewrite is
introduced. Revision policy survives unpublication, exposure rollback and the
existing authorized deletion lifecycle.0018 guards/backup definitions are unchanged.
Already delivered copies cannot be recalled.

## Public serving and reader

`GET /api/authored-problems/[id]/public-solution?revision=<uuid>` and its
`/media/[mediaId]?revision=<uuid>` child are cookie-independent. The gate precedes
database/storage bindings. Disabled routes return503. Readers require exact current
publication plus public consent; legacy/draft/withdrawn access is denied and a stale
selection returns409. They select only worked-solution blocks and approved local
media metadata, never marking keys, tolerances, hints, evaluation data or storage
paths. Images must occur in the sealed solution. PDFs must be explicitly attached
to that revision. Whole-file consent applies. Unrelated uploads remain private.

Parent SHARE locks order reads against publication/unpublication UPDATE locks.
Private Blob bytes use the existing four-second/3MiB complete bounded reader,
then commit before response. No-store, nosniff, sandbox and same-origin media
headers remain. Existing author-only/legacy media URLs are not made public.
An authorized in-flight response may finish after a later unpublication.

The reader reuses Statement / Worked solution tabs, native math/image blocks and
AuthoredPdf/PdfPageViewer. Public text and math plus PDF alternatives are supplied
in server HTML for no-JavaScript readers. Inline previews keep selectable text,
pagination, download and failure states. Missing solutions show an unavailable
message. The private solving workspace stays mounted across tabs and publication
failures, retaining in-memory drafts even when session storage fails. Account
identity changes retain the existing privacy reset. Metadata/noindex is unchanged.

## Integrity consumers

`assisted` remains the immutable recorded-reveal fact. Public-policy attempts carry
`solutionEvidence:'public-access-unverifiable-v1'`, derived from the ORIGINAL
revision on insert responses, read, history and idempotent replay. This persists
when exposure is OFF or the problem is withdrawn. The UI never labels these
attempts unassisted. Cached old strict clients reject the new receipt field rather
than silently relabel it. New clients retain old receipts and local input.

Community statistics exclude public revisions before the bounded attempt scan and
return `solves:null`. SQL achievement eligibility/candidate scans exclude them too.
Original attempt/reveal evidence and badge selections are not rewritten. Current
eligibility can change on republication, as it already depends on current revisions.
Existing partial indexes remain valid. No authored-attempt feed into the inspected
contest/Elo services was found. Those services are untouched.

Personal correctness feedback and `readAuthoredProgress` deliberately ignore
independence eligibility: a current multipart automatic completion can still be
personally solved. No PR C storage or Production persistence activation is included.

Legacy-schema metadata reads use JSON extraction, distinguishing missing columns
from invalid installed policy. Fresh and archived drafts with no published pointer
remain editable. New public publication fails closed if0020 is absent. All other
OFF flows keep their existing old-schema behavior. After public consent exists,
rollback must retain policy-aware receipt/statistics code, not relabel it as legacy.

## Qualification and release boundary

Initial source qualification on806b85d: server1052 pass/33 skip/one TODO, components216 pass, complete applicable
PG suite228 pass/one optional browser skip, then actual deletion/browser14 pass
with0020 installed. New consent/integrity tests7 pass on PostgreSQL18.7 too.
Restricted real LOGIN rights were granted before ALTER and required no new delta.
Legacy reader and four PDF Studio theme/viewport cases passed. New browser checks
cover guests/verified/unverified, real PDF rendering, keyboard/axe, error/retry,
empty solution, consent/cancellation and input retention without storage. A15000-
public-attempt fixture preserved legacy eligibility (103ms in the full local run).
Production-mode Next/session715 checks include SSR MathML/noindex/no-store/no keys,
no-JavaScript solution/PDF links and a real signed session. PDF bytes there are
synthetic browser intercepts; server byte authorization is separately PG-qualified.
Typegen/TypeScript, zero-warning lint and production build pass. Final exact-head
CI, review and source/package hashes are recorded on the implementation PR.
Concurrent Arena changes were preserved through normal merges on18 November.
Recovery/conflict decisions also retain the current publication policy when local
work predates a public/legacy republication. Final-head results belong to the PR.

Physical assistive technology, non-Chromium devices, actual provider credentials,
Production grants/binding and fresh backup/restore evidence remain owner gates.
Anonymous reads have bounded work and existing platform protection, not a newly
qualified distributed guest rate limiter. Monitor load before approving exposure.
The published Learn usage paragraph still describes legacy reveals. Review its
conditional public/legacy wording as part of the later exposure approval, without
changing its editorial-review claims during this source-only implementation.
