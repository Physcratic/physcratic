# Private favourite retrieval

## Repository qualification (27 November 2026)

[PR #272](https://github.com/Physcratic/physcratic/pull/272) merged as `27ead7d1e5c1612c461cebce1d4b70cfe7d5c735` after all eight workflows and both preview checks passed on exact head `1ddde8ba0df2ff5208f8e8684984cc6b7085c27c`. [Core CI](https://github.com/Physcratic/physcratic/actions/runs/46007678748) passed 1,179 server tests and all 389 component tests, typecheck, zero-warning lint, production build and both disposable PostgreSQL jobs. The non-database server run retains 42 skips and one TODO. The new favourite SQL scenarios ran successfully on real PostgreSQL. [Favourite browser](https://github.com/Physcratic/physcratic/actions/runs/46007678259), [full library and guest/verified native archive](https://github.com/Physcratic/physcratic/actions/runs/46007678553), [CSP](https://github.com/Physcratic/physcratic/actions/runs/46007678385), community, continuation, progress-label and recovery workflows passed. The initial missing JSON-route inventory entry was corrected without weakening its guard. Direct code review found no blocking issue.

The isolated local production build and affected-library sweep passed at 375/390/768/1440 in both themes with zero failures (minimum text 4.63:1, border 3.14:1). The built disabled endpoint returned private/no-store 503. The full signed-in site sweep was not run locally because no disposable local PostgreSQL service was available. Synthetic owner-list tests cover guest/pending, A/B account switches, stale cookies, delayed responses, pagination and error recovery. These checks qualify repository implementation, not actual production runtime permissions or activation.

Activation remains NO-GO. The operator prerequisites below still apply. This qualification supersedes the pending-CI status at the implementation checkpoint.

27 November 2026. Implementation checkpoint [`770f1b9`](https://github.com/Physcratic/physcratic/commit/770f1b9892c758dbd03de667c715d0755225521b), based on main `7a1c0fb`. This addresses the remaining F4 retrieval gap without introducing another work queue or changing saved-practice activation.

## Restricted LOGIN rehearsal

[PR #274](https://github.com/Physcratic/physcratic/pull/274) adds a separate test without modifying application code or reviewed operator packages. The focused `Favourite runtime LOGIN` workflow runs `tests/favourite-history-runtime.pg.test.ts` with `AUTHORING_TEST_DATABASE_URL` on disposable PostgreSQL 18.7, matching the reviewed provisioning package's strict version guard. The older PostgreSQL 18.6 job does not execute this separate scenario. It creates uniquely named database/roles, seeds synthetic records and signs in two synthetic accounts through Better Auth. Runtime route calls use an actual non-owner LOGIN, not SET ROLE or an injected session callback. Setup alone uses the installation connection. Cleanup removes only those generated resources.

The test reuses `scripts/runtime-role/provision.review.sql` and the existing favourites delta, revokes the historically overbroad authored id-column update locally, and checks the Batch A effective-rights audit. Existing migration 0021 is installed only in the disposable database to exercise current catalogue keys. Assertions require real favourite writes, publication, 24-item paging, a second account's list, archived-content exclusion, private/no-store headers, unavailable responses for missing permissions, and rejection of guest/stale/foreign-cursor/expired/signed-out requests without charging another account. Additional assertions deny user DELETE, authored id UPDATE, profiles, practice saving and totals UPDATE. Both feature gates are tested independently and at rollback.

Local target guards, TypeScript and zero-warning scoped lint pass. The database scenario skips explicitly without its guarded test URL. Qualification authority is the exact PR-head CI database result, not that local skip. The earlier API factory and synthetic-browser tests remain complementary. This rehearsal does not replace actual deployment/schema/LOGIN evidence, a second-browser runtime check or owner approval. Do not run it against a shared target. It rejects remote hosts, unexpected database names, query overrides and URL fragments before opening a connection. Retrieval remains OFF by default. F5 remains deferred.

## Behavior and privacy

When the retrieval gate is enabled, Arena libraries link to Your favourites in the existing dashboard. The list reuses current card, button and reader-link patterns. It has 24 items per page, Previous/Next, refresh, keyboard focus feedback and explicit loading, empty, failure and changed-account states. A successful empty page says there are no public favourites to show. An outage never masquerades as an empty successful list.

GET `/api/favourites` reads the authenticated owner's existing `community_favourite` records. The `X-Community-Account` header must match the authenticated session before any favourite query or limiter mutation. No owner selector is accepted. Existing session/restriction policy remains in force. Responses are private/no-store, vary on Cookie and the account header, and carry noindex headers. Only canonical public problem keys, titles and reader links are returned. No account identity, attempts, answer keys, drafts, storage URLs or favouriter lists are projected.

Arena identities must exist in the current catalogue. Community titles come only from the current published revision belonging to that same problem, with a supported schema. Withdrawn, draft, mismatched and unavailable revisions are excluded. Metadata/storage failures return an unavailable response. Publication may change after a list read, so the existing reader remains authoritative when opened.

Pagination uses the existing encrypted fixed-length cursor envelope with a distinct favourite/account scope. Completion-history cursors, other-account tokens and tampered cursors are rejected before storage access. The order is by problem key, using the existing account/key index. It is not a frozen snapshot: newly added earlier keys appear after refresh, while a removed cursor row does not invalidate the range position. No total count or new index is introduced.

Reads share the existing persistent 60-per-minute favourite request bucket with heart writes. Excess requests return 429 with Retry-After. This bounds the new read path without another limiter table or grant. Heavy list browsing can temporarily consume the same allowance as favouriting. Queries have bounded page size, client query timeout and a server statement/lock timeout for the read transaction.

The client scopes requests and cached views to the account and a fresh mount identity. It discards old-account output after switching or signing out, including delayed replies and a later return to the same account. Stale cookies require an explicit account reload. Refresh resets pagination and revalidates current membership. No private list is persisted to browser storage.

## Cursor key configuration

FAVOURITE_HISTORY_CURSOR_SECRET is the preferred optional cursor key. Use a cryptographically random value of at least 32 random bytes, encoded for storage, with one stable value per environment across all serving instances. The configured string must be 32 through 1024 characters without leading or trailing whitespace. An explicitly empty, short, oversized or padded dedicated value fails closed with the existing unavailable response. It must not silently fall back to another key.

When the dedicated setting is absent, BETTER_AUTH_SECRET remains the legacy fallback. The dedicated option makes no change to Better Auth, its credentials or sessions. Do not replace or rotate an authentication key merely to configure this feature. Never use an example/test key, send key values in chat, expose them through NEXT_PUBLIC variables or include them in reports. Existing personal-completion key behavior is outside this change.

The key is resolved when the server module loads, so owner-approved configuration must be applied consistently through the intended deployment. Key rotation invalidates old favourite cursors, which recover by refreshing the first page. It does not delete favourite rows or sign users out. Both retrieval/statistics gates still apply, and setting a cursor key alone does not enable retrieval. Missing key configuration remains an unavailable response when enabled.

The follow-up [implementation checkpoint 6ae0f90](https://github.com/Physcratic/physcratic/commit/6ae0f900ffa58d2b3accef53906d7c724512dc72) includes local resolver checks and extends the real PostgreSQL LOGIN test to decrypt a real route cursor with the dedicated key while rejecting the different authentication key. Exact-head CI is the authority for the runtime result. Keep the change draft/unmerged until the owner approves its release under the observed deployment policy. No environment value or provider setting is changed by the PR.

## Gates and release decision

Production activation remains NO-GO pending separate owner qualification and approval. `FAVOURITE_HISTORY_ENABLED` defaults OFF. It also requires the already approved `COMMUNITY_PROBLEM_STATS_ENABLED` feature. Disabled retrieval loads no server database/session bindings and renders no entry link or owner list. Do not enable another feature merely to satisfy this dependency. Build and serving flags must match.

No schema, migration, project dependency, protected release manifest, auth/grading contract or production setting changes. Existing desired-state heart writes, totals, publication and erasure behavior are unchanged. The existing favourite records remain separate from personal completion marks, attempts and checker correctness. F5 saving qualification stays deferred.

Before activation, the owner must:

1. Review the exact final commit and its CI results. Verify the deployed schema and actual serving LOGIN can use the existing owner-range favourite reads, public revision metadata, user row lock and shared limiter permissions. No grant or schema change is authorized by this document.
2. Qualify the exact build/serving configuration with synthetic A/B/guest sessions, a second browser, stale cookies, delayed replies, removed/withdrawn publications, pagination, unavailable storage and rate limits. Confirm private/no-store responses and no private titles or identities in shared HTML/RSC or logs. Local fixtures do not establish production runtime evidence.
3. Separately approve only the retrieval flag on the intended target. Operator inspection on 28 November 2026 found that main automatically creates Production deployments and assigns custom domains, so merging can release this change. Keep PR #277 draft and unmerged until the owner explicitly approves that Production release. Retrieval activation remains a separate explicit decision. Keep existing statistics, practice-saving and deletion gates independent. No provider deployment setting change is authorized here.

Rollback disables the retrieval flag consistently in build and serving scope. Preserve favourite rows, heart writes and existing erasure processing. Do not delete data or replay migrations as a UI rollback.

## Verification

Local API guards, disabled-route binding isolation and strict projection tests pass. The PostgreSQL scenarios cover mixed Arena/community pages, account isolation, encrypted cursor scope/tampering, removed cursor rows, withdrawn and malformed metadata, quota shared with existing heart writes, empty results, storage failure and an erased synthetic account. They passed with a supplemental local PGlite adapter using the unchanged tests. Real PostgreSQL CI is still required, including the existing database job that selects this test through `AUTHORING_TEST_DATABASE_URL`.

The actual owner-list browser test passes guest/pending sessions, paging and focus, empty/outage/429/unsafe responses, held replies across account changes, stale-cookie reload, fresh account views, overflow and axe at 375 and 1440 in light/dark. Transport/session fixtures are synthetic. Screenshots were inspected. Type generation, TypeScript, zero-warning lint and scoped deterministic UI checks pass. Existing project primitives were reused after catalog review. No external review service or hosted UI generation was used.
