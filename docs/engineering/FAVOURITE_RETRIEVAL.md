# Private favourite retrieval

27 November 2026. Implementation checkpoint [`770f1b9`](https://github.com/Physcratic/physcratic/commit/770f1b9892c758dbd03de667c715d0755225521b), based on main `7a1c0fb`. This addresses the remaining F4 retrieval gap without introducing another work queue or changing saved-practice activation.

## Behavior and privacy

When the retrieval gate is enabled, Arena libraries link to Your favourites in the existing dashboard. The list reuses current card, button and reader-link patterns. It has 24 items per page, Previous/Next, refresh, keyboard focus feedback and explicit loading, empty, failure and changed-account states. A successful empty page says there are no public favourites to show. An outage never masquerades as an empty successful list.

GET `/api/favourites` reads the authenticated owner's existing `community_favourite` records. The `X-Community-Account` header must match the authenticated session before any favourite query or limiter mutation. No owner selector is accepted. Existing session/restriction policy remains in force. Responses are private/no-store, vary on Cookie and the account header, and carry noindex headers. Only canonical public problem keys, titles and reader links are returned. No account identity, attempts, answer keys, drafts, storage URLs or favouriter lists are projected.

Arena identities must exist in the current catalogue. Community titles come only from the current published revision belonging to that same problem, with a supported schema. Withdrawn, draft, mismatched and unavailable revisions are excluded. Metadata/storage failures return an unavailable response. Publication may change after a list read, so the existing reader remains authoritative when opened.

Pagination uses the existing encrypted fixed-length cursor envelope with a distinct favourite/account scope. Completion-history cursors, other-account tokens and tampered cursors are rejected before storage access. The order is by problem key, using the existing account/key index. It is not a frozen snapshot: newly added earlier keys appear after refresh, while a removed cursor row does not invalidate the range position. No total count or new index is introduced.

Reads share the existing persistent 60-per-minute favourite request bucket with heart writes. Excess requests return 429 with Retry-After. This bounds the new read path without another limiter table or grant. Heavy list browsing can temporarily consume the same allowance as favouriting. Queries have bounded page size, client query timeout and a server statement/lock timeout for the read transaction.

The client scopes requests and cached views to the account and a fresh mount identity. It discards old-account output after switching or signing out, including delayed replies and a later return to the same account. Stale cookies require an explicit account reload. Refresh resets pagination and revalidates current membership. No private list is persisted to browser storage.

## Gates and release decision

Production activation remains NO-GO pending separate owner qualification and approval. `FAVOURITE_HISTORY_ENABLED` defaults OFF. It also requires the already approved `COMMUNITY_PROBLEM_STATS_ENABLED` feature. Disabled retrieval loads no server database/session bindings and renders no entry link or owner list. Do not enable another feature merely to satisfy this dependency. Build and serving flags must match.

No schema, migration, project dependency, protected release manifest, auth/grading contract or production setting changes. Existing desired-state heart writes, totals, publication and erasure behavior are unchanged. The existing favourite records remain separate from personal completion marks, attempts and checker correctness. F5 saving qualification stays deferred.

Before activation, the owner must:

1. Review the exact final commit and its CI results. Verify the deployed schema and actual serving LOGIN can use the existing owner-range favourite reads, public revision metadata, user row lock and shared limiter permissions. No grant or schema change is authorized by this document.
2. Qualify the exact build/serving configuration with synthetic A/B/guest sessions, a second browser, stale cookies, delayed replies, removed/withdrawn publications, pagination, unavailable storage and rate limits. Confirm private/no-store responses and no private titles or identities in shared HTML/RSC or logs. Local fixtures do not establish production runtime evidence.
3. Separately approve only the retrieval flag on the intended target. The owner handles deployment manually. Keep existing statistics, practice-saving and deletion gates independent.

Rollback disables the retrieval flag consistently in build and serving scope. Preserve favourite rows, heart writes and existing erasure processing. Do not delete data or replay migrations as a UI rollback.

## Verification

Local API guards, disabled-route binding isolation and strict projection tests pass. The PostgreSQL scenarios cover mixed Arena/community pages, account isolation, encrypted cursor scope/tampering, removed cursor rows, withdrawn and malformed metadata, quota shared with existing heart writes, empty results, storage failure and an erased synthetic account. They passed with a supplemental local PGlite adapter using the unchanged tests. Real PostgreSQL CI is still required, including the existing database job that selects this test through `AUTHORING_TEST_DATABASE_URL`.

The actual owner-list browser test passes guest/pending sessions, paging and focus, empty/outage/429/unsafe responses, held replies across account changes, stale-cookie reload, fresh account views, overflow and axe at 375 and 1440 in light/dark. Transport/session fixtures are synthetic. Screenshots were inspected. Type generation, TypeScript, zero-warning lint and scoped deterministic UI checks pass. Existing project primitives were reused after catalog review. No external review service or hosted UI generation was used.
