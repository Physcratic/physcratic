# Practice and Arena progress

## Current-main release qualification (25 November 2026)

**NO-GO for Production. Keep `PRACTICE_CHECKS_ENABLED` and `ACCOUNT_DELETION_ENABLED` unset.** Review baseline `a5f79a1` includes [PR #256](https://github.com/Physcratic/physcratic/pull/256). The owner has parked account deletion. The saved-check code is ready for operator qualification. A usable, approved erasure channel is the binding release blocker. Both checked-in deletion HTTP endpoints are off under the current instruction. The [nonpublic channel in the activation runbook](POST_B6_PROFILES_PRACTICE.md#smallest-acceptable-owner-choice) is a proposal. Its implementation and qualification require separate authority. The support intake alone has no guarded execution path. Keep the existing privacy and backup gates while deletion is parked.

### Release scope and status meanings

The current save catalogue contains 33 Arena originals. The schema also understands `practice` history and exact replay, including older entries. Retired checks no longer contribute to current progress. Imported Olympiad answer checks remain unsaved. Community problems use their separate authored-attempt ledger, with current published-revision summaries in the same private dashboard.

| Status | What changes it |
| --- | --- |
| Attempted | A saved check for the Arena problem ID or a saved authored attempt for that problem ID. A previous version can still supply this badge on a visible problem. A correct answer is unnecessary. Opening a problem or public solution and checking without saving add no attempt. |
| Completed | The student's private mark in `personal_problem_completion` under `PERSONAL_COMPLETIONS_ENABLED`. The mark can exist without an attempt. Marks drive unfinished-first Arena ordering before pagination, with rating order inside each group. Checks neither create marks nor change the completion cursor. Keep the mark flag and its 0025 release independent. |
| Correctly answered | The trusted grader's result for a part. In private dashboard progress, “Solved correctly” means every required automatically checked part of the same current version has a correct recorded result, with at least one required part. Correct parts can accumulate across checks on that version. Manual and inconclusive results establish no correctness. Results from older or withdrawn versions stay outside current solved counts. |
| Independently solved | Existing authored public statistics and achievements require eligible attempts on the current legacy-private revision and exclude public-solution revisions. Correct grades after public publication still count in the student's private history. A personal mark or Arena check affects neither independent-solve credit nor ratings. |

The two progress sources report their availability separately. The dashboard shows available history when only one source responds. Its aggregate fields stay null when either source is unavailable. Legacy practice attempts, saved rubric submissions and archive reviews remain separate. The public checker and published worked solutions retain their existing access paths.

### Verification and database growth

- Exact-head [CI for #256](https://github.com/Physcratic/physcratic/actions/runs/45569477601) passed. That diff changed documentation only. Reused the prior 38 focused practice checks with zero skips on the same application tree, the existing synthetic browser reload and second-context evidence, and the installed-graph erasure regression. The browser evidence covers an acknowledged save on another context with the same account, together with sign-out, account isolation and original-key recovery. Draft text and unconfirmed retry bodies stay in the originating browser session. They are separate from saved server history.
- Direct inspection confirmed session-derived SQL identity, the rejection-only `X-Practice-Account` header before ledger reads, writes or quota charges, verified email and trusted origin on writes, and private/no-store responses. The client scopes saved data and retry state to the account. Actual Production session configuration and binding remain unverified.
- A focused disposable PostgreSQL 18.6 run used 0017, 0020 and 0025 together with the real API factories and synthetic sessions. It confirmed authored progress with practice OFF, a manual mark with no saved check, an Arena save with an unchanged personalized order and still-valid cursor, unmarking with the attempt intact, and saved progress with marks OFF. Opening a public authored solution added no attempt. Its later correct grade counted privately and remained ineligible for independent-solve credit. Mismatched A/B progress was rejected. The exercise used no real data or provider.
- The rolling limit allows 100 new checks per account per 24 hours, with 20 submissions and 60 total requests per minute. Each new check writes one immutable attempt with submitted answers and results. Rated or manual marks use other tables. The ledger maintains one summary row per graded part, account and version, and one rate row per account. History uses 50-row keyset pages. The current progress query still counts all saved checks for that account and current-version records. The daily cap limits the write rate. There is no lifetime cap or scheduled purge of active-account history.
- A sizing sample put 36,500 small synthetic multipart checks on one account, then saved and read a new check through the normal factories. The 386-byte fixture payload grew the attempt relation and indexes by about 40.5 MiB. Eight local progress reads took 176 to 237 ms. This samples one client and one payload. The release record still needs actual storage headroom, expected traffic and a named owner for size and latency observations. No schema, purge, quota or indexing change is justified by this result.

### Minimum owner sequence

1. **Qualify erasure and retained-copy recovery before saving real checks.** With account deletion parked, stop here for activation. The owner can later authorize qualification of the existing [nonpublic option](POST_B6_PROFILES_PRACTICE.md#smallest-acceptable-owner-choice) without changing the public flag. Require verified subject proof, the current reviewed eraser and applicable schema safeguards, the approved policy and staffed support process, erasure of only the subject's attempts/parts/rate rows, retry and isolation evidence, and an approved inventory and isolated restore reconciliation or enforceable restrictions on unsafe restore paths. The current whole-account HTTP handler checks the 0026 acknowledgement routine if reused. Close or explicitly account for applicable media, Tally and retained-copy obligations under the separate erasure decision. Never substitute ordinary runtime DELETE or a direct unguarded function call.
2. **Attest the candidate and the real serving binding while OFF.** Record exact reviewed SHA and green CI, manual deployment/rollback identities, database project/branch/endpoint, PostgreSQL version and pooled/direct runtime LOGIN. Use owner-authorized read-only metadata with [the existing activation artifacts](../../scripts/activation/README.md) and the [runtime verifier](../../scripts/runtime-role/README.md). Confirm the original verified 0017 and 0018 ledger entries using the reviewed hashes below. Both were previously reported installed. Compare newer installed migrations against their separately approved ledger rather than applying the historical 0018-only inventory rule to the current database. Check runtime `USAGE` on `public`, `SELECT, INSERT` on `practice_check_attempt` and `SELECT, INSERT, UPDATE` on `practice_check_part` and `practice_check_rate`. Verify effective rights including column ACLs, owner/membership and PUBLIC. Expect no ordinary attempt UPDATE, practice table DELETE/TRUNCATE or erasure execution. The existing verifier modes describe an OFF baseline. Check the practice delta explicitly, preserving separately approved live-feature rights. Prepare a minimal reviewed grant delta only if rights are missing. Record expected volume, database headroom and rollback triggers. No practice migration, backfill or 0025 dependency is expected.
3. **Approve the exact server flag and manual deployment.** Once steps 1 and 2 pass, obtain explicit owner approval for Production `PRACTICE_CHECKS_ENABLED=true` on that reviewed release, the synthetic acceptance accounts, observation window and named rollback operator. Leave `ACCOUNT_DELETION_ENABLED` unset during the parked decision. Preserve unrelated flags, including personal completions and public solutions. Client headers and public configuration cannot enable saving.
4. **Accept or roll back.** On the approved serving alias, verify private correct and incorrect Arena saves, same-version multipart progress, resubmission with the original key, stale-version handling, dashboard refresh and a second fresh device/session for the same account. Verify a changed A/B session, expired or signed-out session, unsaved guest and imported checks, and that opening the public solution still creates no attempt. Compare independent-solve counts and any enabled manual mark/order against their expected unchanged values. Confirm missing-save responses, account mismatches and capacity observations meet the release criteria. On leakage, missing durability, unexpected grants or erasure/restore uncertainty, the owner rolls the reviewed deployment back to flag OFF, confirms private practice 503 and working unsaved checks, and preserves saved rows and original retry keys. Historical schema and ledger stay in place.

| Ledger row | Reviewed up-file SHA-256 |
| --- | --- |
| `0017_practice_checks` | `ed15c92d62a48eb03a46b9dd884579595143749f074bd2312f69f2d3f46c9e77` |
| `0018_account_deletion` | `378ff9140a5eab9d62c70505eb764ad1f621ebe26f6d840c62826aee00d61cda` |

This qualification used repository source and disposable tests. No Production queries, mutations, deployment or activation. The checksum-pinned [original activation runbook](POST_B6_PROFILES_PRACTICE.md#bounded-qualification-activation-and-rollback-sequence) remains the detailed operating reference.

## Earlier implementation and release evidence

Post-B6 update, 14 November 2026: the owner confirms0017/0018 installed and
verified. Controlled erasure is implemented in current code. Older statements
below describing it as unimplemented are historical, not a new code blocker.
Practice remains OFF pending the precise [erasure delivery, policy and provider
decision](POST_B6_PROFILES_PRACTICE.md). This does not activate account deletion.

Friday release B2A, 10 November 2026. Original base main `ab8881007fa6fe040b87a1b0fdb6a85e2d12b295`, reconciled with main `942be99148870b834767fbc212e649127abb3b93`. This is the persistence/API batch. Dashboard and solving UI integration is B2B PR #134, which must reconcile with the final B2A merge before its own review. No migration is run by application startup, build or deployment.

## Default-OFF activation boundary

All private practice endpoints are disabled unless the server configuration has exactly `PRACTICE_CHECKS_ENABLED=true`. The default is OFF in every environment, including Production. This is a server-only setting, not a public client flag. Headers, cookies, query fields and request bodies cannot enable it. No environment setting or feature activation is performed by this PR.

`GET/POST /api/practice-checks` and `GET /api/practice-progress` use one lightweight route gate. When OFF it returns HTTP 503 with private/no-store, cookie/account Vary and nosniff headers before even importing database or session bindings. It does not authenticate, charge rate limits, read history or save any record, including when migration 0017 already exists. A disabled POST returns `saveState:unconfirmed`, never `saved:true`, because a retry might refer to an earlier committed request. The client must preserve the original retry intent. The enabled route retains the existing authenticated API contract below.

The public guest checker is outside this gate and remains functional. B2B must preserve unsaved guest checking while persistence is OFF or unavailable. A code-only merge is authorized after the required QA gates, with persistence still OFF. Installation, grants and activation remain separate, unauthorized operations subject to the prerequisites below.

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

Empty UP/DOWN/UP preserves existing tables/data. Populated DOWN deliberately refuses to erase student work. Application rollback leaves the new tables intact and old code ignores them. With the gate explicitly enabled, missing tables make the new persistence APIs return an explicit unavailable/unconfirmed response, while the public checker continues working. Current saved attempts restrict deletion of their owning account, matching the existing authored-attempt implementation. That implementation does not yet satisfy the owner-approved account-deletion policy below, so activation remains blocked. Migration 0017 is unchanged by the activation-gate remediation.

No automatic grant is added. A restricted runtime role needs schema USAGE, SELECT/INSERT on the attempt table, and SELECT/INSERT/UPDATE on part/rate tables. No DELETE or privileged function execution is needed. Actual restricted-role operation is tested locally. Installation, reviewed checksums, migration ledger, runtime grants, backup/rollback and deployment are separate owner-only prerequisites. No Production or shared resource is operated by this work.

## Approved retention policy and remaining activation prerequisites

The owner approved this intended behavior on 10 November 2026:

- Preserve saved progress and practice history while the student's account is active.
- When an account is deleted, erase its associated practice history through a controlled, verified account-deletion workflow.
- Keep ordinary-use history immutable. Account deletion is a separately authorized exception, not an ordinary runtime DELETE permission.
- Document and respect the actual provider backup-retention and expiry policy. No duration, immediate backup-erasure guarantee or legal-hold rule is established here.

The verified account-deletion workflow and its narrow immutability/FK exception are **not implemented**. The current RESTRICT FK prevents account deletion after a saved check, and the immutable trigger also rejects deleting those checks. That is an implementation gap to close before activation, not permission to prevent account deletion indefinitely. Do not change the FK, disable triggers, cascade-delete history or grant ordinary runtime DELETE as a shortcut. A separately reviewed deletion design must erase the relevant practice records under verified account-deletion authority and reconcile existing account/history dependencies.

The actual provider backup retention, expiry, restore/erasure handling and any provider-specific limitations remain unverified. No provider setting or real backup has been inspected or changed. Operators must establish and document those facts before activation rather than inventing an expiry promise.

Persistent progress must remain OFF until the deletion workflow is implemented and tested, the backup policy is verified, and the owner separately approves reviewed 0017 installation/ledger/checksums, least-privilege grants, backup/recovery/application rollback and activation. The code-only merge authorizes none of those operations. After B2A merges, B2B PR #134 must update its dependency and keep this gate and guest fallback intact.

## Verification

Use Node 22 and frozen pnpm dependencies in an isolated worktree. Local commands:

```sh
bash scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server --test lib/practice-check-api.test.ts
AUTHORING_BROWSER_TOOLS=/external/browser-tools CHROMIUM_PATH=/usr/bin/chromium bash scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server tests/practice-check.browser.mjs
```

Fixtures use disposable PostgreSQL and synthetic session adapters. Browser tests execute real HTTP requests and production API/grader factories, including reload and a separate mobile context, not a production UI integration. B2B must test the actual solving/dashboard components. Live Better Auth, real providers, Production data and physical phones are not established by these fixtures. Independent pre-merge review remains required.

The local fixture explicitly enables its server route. Additional OFF checks prove that installed-schema requests cannot create attempts, parts or rate rows and that client enable hints are ignored. Fresh-process endpoint tests forbid importing private bindings while disabled. Final exact-head QA and remote unexecuted-Action observations are recorded with PR #133, separately from historical implementation counts.


## B2B solver and dashboard integration

B2B is explicitly based on the unmerged B2A head `6c4da5862a205719a7749a4f0a2337568c020ca3`, branch `codex/friday-b2b-progress-ui`. Review the incremental UI diff separately. B1 remains an independent authored-input PR. The shared archive answer panel is used only by practice and Arena.

Verified accounts normally check and save through the new endpoint. Guests, unverified accounts and unresolved/unavailable sessions keep the public checker. Saving never changes the trusted grader, ratings or solution permissions. A successful immutable receipt explicitly says saved. Unknown failures preserve the pending intent and expose Check without saving. A malformed or mismatched receipt cannot clear retry intent. A retry which grades earlier answers never attaches that feedback to a newer visible draft.

The private sessionStorage journal is keyed by account, problem and exact grading version. Draft text is kept in full, with a 2,000,000-character serialized budget and explicit copy-before-leaving warning if recovery fails. The original pending body/key is persisted before POST, survives edits/reset/reload and is retried only by a deliberate button. Reload never auto-posts. Validation and the UTF-8 transport budget are checked before allocating a UUID. If intent cannot be stored, no saved-check POST occurs. A cleanup failure after a confirmed receipt keeps the same safe retry instead of allocating another key.

Known account or version changes isolate fields, feedback and retry state and abort old responses. First session resolution preserves newly typed provisional input and focus. It never replaces an existing account draft without a choice, and pending saves stay immutable through that choice. New edits during a recovery conflict remain memory-only until the student chooses. Account consistency headers protect requests whose cookie changes before the displayed client session catches up.

History now reads the current-version ledger, with distinct solved, not-yet-solved and not-graded lists and canonical practice/Arena links. A saved receipt revalidates only the matching account's history/dashboard keys. The dashboard shares the persistent read allowance and uses the same server progress reader and returns explicit null counts plus `practiceProgressAvailable:false` if the schema/provider is missing. Older unversioned totals remain separately named legacy fields. Solution attempts, reviewed archive subproblems and contest/rating data remain separate.

Compatibility: old `physcratic.answer.v1` tab drafts and localStorage solved hints are left untouched. They have no trustworthy owner/version and are deliberately not auto-attributed to an authenticated recovery book or completion ledger. Review legacy-draft communication/recovery policy before rollout. New scoped recovery is tested. No old browser correctness is imported as a verified result.

Browser evidence uses actual solver/history components, production persistence/grading/count factories, disposable PG18.6 and a synthetic session adapter. Surrounding dashboard contest data is synthetic. It covers reload/exact-body retry after a lost committed receipt, newer-draft feedback isolation, guest/unverified checks, storage/provider failure, delayed auth text/focus including MathLive, existing-draft choice, late-response account switching, practice/Arena navigation, 375/1440 light/dark axe and overflow. It does not qualify live Better Auth, production grants/providers, Preview, OS keyboards or physical devices. Existing guest reader regressions and final gate results are recorded in the draft PR.

Final B2B feedback review: the old pure summary always said Nothing is saved. Confirmed matching receipts now use a separate durable-summary entry point, preserving stateless callers and every correctness/tone flag. Failed/unsaved checks retain unsaved wording. Browser tests assert both states. Explicit reset synchronization runs before paint so a reset cannot display an earlier field value for another frame. Pending intent remains immutable. The final server suite passes 802 tests, including the added durability regression. Resource-constrained reruns use the same disposable PG18.6 image with a local tmpfs data directory and isolated temporary build caches. No shared/provider setting changes.

## B5 whole-account readiness (10 November 2026)

The owner has approved account-wide erasure/de-identification and preservation of appropriately licensed published content and other students' work. [B5 readiness](ACCOUNT_DELETION_READINESS.md) now identifies the narrower remaining stop: immutable, mixed-subject evidence needs verified operator redaction/adjudication or a defined limited-retention exception. A shared principal or ID replacement alone does not remove freeform PII. The [prospective publication licence design](PUBLICATION_LICENSE_PROPOSAL.md) is inactive and does not infer retroactive consent. PR #140 remains a bounded draft, not an implemented deletion feature. Resolve that privacy mechanism before the complete default-OFF workflow, then qualify migrations/grants, actual backup/restore facts, ledger, rollback and synthetic behavior before separate Production authorization.

## Current-catalogue readiness correction, 15 November 2026

The default persistence catalogue now excludes the retired identities supplied by
`lib/legacy-practice.ts`. Their grading definitions, versions and immutable
records remain intact. Existing exact-key receipts replay before the current
catalogue check. A new save for a retired identity returns404. Current completion
lists omit withdrawn problems, while `savedChecks` still counts retained saved
records across versions. No browser-local or legacy `practice_attempt` record is
backfilled. Native imported archive checks remain explicitly unsaved through
`saveProgress={false}`. This correction does not add their identities to the
persistence contract or enable the flag.

The retained legacy reader is still used by historical compatibility tests.
Those tests now inject an explicit test-only legacy catalogue rather than
requiring retired identities in the application's current catalogue. Real auth,
erasure and loopback-only upgrade rehearsals seed a retained Arena problem.
No historical migration, grading definition, reviewed operator package/checksum,
Production grant or configuration is changed. See the dated readiness and owner
decisions in [the post-B6 procedure](POST_B6_PROFILES_PRACTICE.md#practice-readiness-evidence-and-owner-gates-15-november-2026).
