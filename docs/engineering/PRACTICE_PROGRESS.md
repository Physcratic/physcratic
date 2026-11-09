# Practice and Arena progress

Friday release B2A, 10 November 2026. Base main `ab8881007fa6fe040b87a1b0fdb6a85e2d12b295`. This is the persistence/API batch. Dashboard and solving UI integration is B2B, which must explicitly depend on this branch while B2A is unmerged. No migration is run by application startup, build or deployment.

## Progress model

The identity is `(kind, problemId)` where kind is `practice` or `arena`, classified by the server catalogue. A compatible grading version means the exact existing SHA-256 `archiveVersion`, including its statement/key/engine snapshot. The grader and tolerance policy are unchanged.

- **Solved:** all required automatically checkable parts have a correct server check on that exact version. At least one required part must exist.
- **In progress:** a correct or incorrect server result exists, but some required parts have never been checked correctly. This is not a claim that the entire problem or the latest answer is incorrect.
- **Not graded:** only invalid, inconclusive, unanswered or self-review results exist. Self-review is never a correctness assertion.

Correct parts may combine across separate attempts on one exact version. Correctness is monotonic within that version. A later wrong or unsupported answer does not remove a prior correct part. Different versions cannot combine. Current dashboard aggregates exclude older or withdrawn catalogue versions, while the account's immutable history and exact idempotent replay remain available.

Lists contain distinct problems, never one entry per attempt. `savedChecks` is separately labelled as a count of saved check records across versions. `correctParts`, `incorrectParts` and `requiredParts` are version-specific. An unresolved incorrect part means there is a graded incorrect result without a correct result for that part, not that an unsupported answer was marked wrong.

No localStorage solved marker is imported or trusted. No historical unsaved check is reconstructed. Existing legacy `practice_attempt` rows remain untouched and unversioned. B2B must keep any legacy counts explicitly separate instead of treating them as verified current-version completion. Authored attempts, rubric submissions, contest results, ratings and public community statistics are unchanged.

## Private APIs

- `POST /api/practice-checks`: existing strict archive-grade input plus a UUID `idempotencyKey`. At least one nonblank answer is required. UTF-8 JSON is bounded to 65,536 actual bytes and the existing read deadline. Per-answer 1,024 characters and 64 parts remain unchanged. Unknown correctness, user, timestamp and result fields are rejected.
- `GET /api/practice-checks`: own history, optional `problemId` and opaque `after`, 50-row timestamp/UUID keyset pages.
- `GET /api/practice-progress`: own current-version progress, counts, public titles and canonical problem links. One SQL snapshot combines immutable attempts and per-part materialization. Reads are bounded to the server catalogue, at most 1,000 identities, with query deadlines.

All private calls require a valid Better Auth session. Writes additionally require verified email and the existing trusted-origin policy. The caller supplies `X-Practice-Account` matching the account its client is showing. This header is a rejection-only consistency guard, never an authorization source. SQL always uses the authenticated session's user ID. If a cookie changes from A to B while the client still thinks it is A, reads and writes return 409 before accessing private data or charging quota. This prevents B's response being cached under A or A's pending input being saved as B.

Responses are `private, no-store`, vary on cookie/account guard and include nosniff. They exclude user IDs, idempotency keys, expected answers and grading internals. History contains only the caller's submitted answers and existing safe grader messages. There is no cross-account or public statistics endpoint.

The public `POST /api/archive-grade` stays unchanged and independent of database/session bindings. Guests can keep checking answers without a login, migration or working persistence provider. B2B must retain this path and make unsaved versus saved feedback explicit.

## Persistence, replay and limits

A persistent fixed-minute bucket allows 60 API requests and 20 write requests per account. It saturates and never moves its window backwards under concurrent refreshes. Wrong-origin and unauthenticated/unverified writes do not charge it. A rolling 24-hour cap allows 100 new saved checks across practice and Arena, with no lifetime/per-problem limit. Replay still charges the minute bucket but not the new-attempt quota.

After strict parsing, a per-account transaction advisory lock serializes replay, quota and progress updates. Existing `(user, idempotencyKey)` is checked before current catalogue/version gates. Same canonical selection and answers replay the immutable result without grading. Answer array order is canonicalized. A different payload with the same key returns 409.

New requests require the current exact version and use the existing trusted grader. A strict result allowlist checks the selection and complete part-ID set. One transaction inserts the immutable attempt and upserts monotonic per-part progress, then commits before returning `saved:true`. Timeouts and lock/idle deadlines bound database work.

A failed or uncertain save returns an explicit `saveState:unconfirmed`. This includes a lost commit acknowledgement, which may have saved already. The client must retain the original body/key and retry it, not assume rollback or silently retarget another account/version. Definitive malformed requests are rejected. B2B must persist retry intent before POST, preserve guest grading and clear account-bound UI/cache on account changes.

## Additive migration 0017

`0017_practice_checks.up.sql` creates only `practice_check_attempt`, `practice_check_part` and `practice_check_rate`, their indexes/constraints and an immutable-attempt trigger. It changes no existing table, routine or grant. Composite foreign keys keep each materialized part linked to an attempt for the same owner, kind, problem and version. The SQL trigger is authoritative, do not use schema push.

Empty UP/DOWN/UP preserves existing tables/data. Populated DOWN deliberately refuses to erase student work. Application rollback leaves the new tables intact and old code ignores them. Missing tables make the new persistence APIs return an explicit unavailable/unconfirmed response, while the public checker continues working. Saved attempts restrict deletion of their owning account, matching the existing authored-attempt retention model. Retention and account deletion policy require owner review before installation.

No automatic grant is added. A restricted runtime role needs schema USAGE, SELECT/INSERT on the attempt table, and SELECT/INSERT/UPDATE on part/rate tables. No DELETE or privileged function execution is needed. Actual restricted-role operation is tested locally. Installation, reviewed checksums, migration ledger, runtime grants, backup/rollback and deployment are separate owner-only prerequisites. No Production or shared resource is operated by this work.

## Verification

Use Node 22 and frozen pnpm dependencies in an isolated worktree. Local commands:

```sh
bash scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server --test lib/practice-check-api.test.ts
AUTHORING_BROWSER_TOOLS=/external/browser-tools CHROMIUM_PATH=/usr/bin/chromium bash scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server tests/practice-check.browser.mjs
```

Fixtures use disposable PostgreSQL and synthetic session adapters. Browser tests execute real HTTP requests and production API/grader factories, including reload and a separate mobile context, not a production UI integration. B2B must test the actual solving/dashboard components. Live Better Auth, real providers, Production data and physical phones are not established by these fixtures. Independent pre-merge review remains required.
