# Written solution recovery

26 November 2026. Branch `codex/written-solution-recovery`, based on main `c4fa2a2`.

## Behavior

The archive written-submission form keeps subpart label, working, final answer and attachment transcription in this browser tab. Reloading restores the same account, problem and source-version draft. This is not server autosave, cross-device synchronization or a promise of recovery after closing the tab. Download working exports a text copy.

An outgoing submission is journalled before POST with its exact normalized payload and idempotency key. An unconfirmed request pauses editing and offers Retry original save. Reload never automatically submits it. Receipt persistence must succeed before the form clears pending intent or starts another attempt. Network errors, malformed responses, 408, 409, 429 and 5xx responses preserve the original request. Definitive pre-save rejection statuses 400, 401, 403, 413 and 415 may unlock editing after the rejection state is persisted.

Files, file names, storage URLs and upload queues are not cached. A draft's selected files must be attached again after reload. For an already submitted pending request only, the journal retains the validated evidence IDs, media types, sizes and hashes required for an identical retry, plus its confirmed transcription. File bytes are not reuploaded during retry. Existing private-media authorization and provider cleanup remain unchanged.

Account and problem changes remount the editor and abort outstanding browser requests. Late responses cannot replace the next account's state. Submission and evidence POSTs carry the existing `X-Practice-Account` header and reject mismatched authenticated cookies before request parsing or writes. Missing headers retain legacy session-authorized behavior. Source metadata is public but its client cache is scoped per account. A changed source version freezes new editing/submission of the old draft, preserves download and original pending retry, and never silently migrates old answers into the new version.

Storage access, parsing and quota failures keep in-memory text available with a warning and download action. Corrupt recovery is left untouched. A new POST cannot begin unless its retry snapshot is stored. If the server replies but the receipt cannot be stored, the original key remains pending for recovery. This deliberately prioritizes avoiding duplicate attempts over submitting without a reload-safe retry key.

## Acceptance

- Unit coverage: Unicode text, account/problem/version isolation, exact pending retry including evidence metadata, invalid/corrupt/oversized recovery, storage failures, receipt-write failures, definitive versus ambiguous errors and request byte limits.
- Rendered browser coverage uses the actual form and synthetic sessions/transport: reload/export, committed save with lost reply, exact retry without a duplicate attempt, receipt reload without resubmission, account switch, stale cookies, delayed response, source-version change, blocked storage, desktop/mobile and light/dark axe checks.
- The browser transport is synthetic. It does not establish live database, Blob, provider or production-session qualification. Existing origin, grading, rating and private evidence checks remain in force.
- Current local unit run: 23 focused tests passed. Focused TypeScript check passed using the matching existing dependency installation. Rendered browser and full CI results are pending during implementation.

## Release boundaries

No schema, migration, dependency, provider setting, production database, feature flag or deployment change. Saved-practice activation and account deletion remain subject to their independent qualification gates. This change protects the existing written-submission workflow and does not activate practice saving.
