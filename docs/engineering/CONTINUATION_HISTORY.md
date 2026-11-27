# Continuation and previous work

27 November 2026. This is the bounded navigation part of F4, following the feature evaluation. It reuses the existing catalogue and history rather than adding another work queue.

## Reader navigation

Every shared problem-room header links to "Your previous work" at the existing dashboard history. The target exists during loading, signed-out, unavailable and partial-progress states. It retains existing sign-in, error/retry, version and partial-source handling. It does not imply that unsaved work was recorded or that account saving is enabled.

Arena exposes "Next in Arena" independently of checker success, including after opening the public solution for manual review or after an inconclusive result. The link follows the next catalogue entry and explicitly says so. It is not a teaching sequence. There is no wraparound or invented next entry at the end. The duplicate all-correct-only Arena continuation is removed. Other reader contracts and public solution access remain unchanged.

The existing account/problem/version journals continue to protect pending intent and tab-session drafts. No navigation action marks work complete or records a correct result. Existing database-backed progress/recovery tests remain required for uncertain receipts, account switches, historical versions and outages.

## Verification and limits

Local header/target/boundary tests pass. The actual three-reader browser test passes 88 keyboard/layout/axe assertions across 375/1440 and light/dark. Its Arena cases open the solution before checking, verify continuation without a completion/correctness claim, navigate with the keyboard and return to the original tab-session draft. Source failures and guest sessions are synthetic. TypeScript and focused lint pass. The existing authored public-solution test also checks its previous-work link, and exact-head full CI remains required before merge.

This does not qualify a favourite retrieval experience. The current heart reads and writes favourites for supplied problem keys. The collection has no saved-only retrieval control or private favourite-list query. No new favourite index, auto-mistake queue or scheduler is introduced here. Before extending it, confirm the student need and qualify bounded private pagination, withdrawn problems, account changes and unavailable sources through a separate focused batch. Personal completion history is a different signal and is not described as a favourite list.

No schema, migration, dependency, protected release manifest, production setting, feature flag or deployment change. F5 account-saving qualification remains deferred and separately authorized.

## Final navigation qualification

PR #269 merged as b950bc1817300a9f289506484d729915a82dfc08. All eight workflows and both preview checks passed on exact head ed8b4b9bef96e3981282e7ec6a475b7c58ccfcb8, including core CI, full public library, community, authored student, CSP, continuation/history, discovery/feedback and written recovery. Retargeting to main preserved tested tree 575e2caf85cfd19561a6ddede1e5f533b3fe3d2a. The PR records linked run evidence. Favourite retrieval remains unqualified and F5 remains deferred. No production deployment occurred.

## Favourite retrieval follow-up

The separate default-off implementation on codex/favourite-retrieval reuses existing records and adds private pagination, visibility and account-boundary checks. See [implementation and activation gates](FAVOURITE_RETRIEVAL.md). This supersedes the implementation gap above. Production activation and actual serving-role qualification remain unapproved. F5 saving remains separate.

## Favourite retrieval qualified in the repository

[PR #272](https://github.com/Physcratic/physcratic/pull/272) merged as `27ead7d1e5c1612c461cebce1d4b70cfe7d5c735` after all eight workflows and both preview checks passed on exact head `1ddde8ba0df2ff5208f8e8684984cc6b7085c27c`. [Core CI](https://github.com/Physcratic/physcratic/actions/runs/46007678748) passed 1,179 server tests and all 389 component tests, typecheck, zero-warning lint, production build and both disposable PostgreSQL jobs. The non-database server run retains 42 skips and one TODO. The new favourite SQL scenarios ran successfully on real PostgreSQL. [Favourite browser](https://github.com/Physcratic/physcratic/actions/runs/46007678259), [full library and guest/verified native archive](https://github.com/Physcratic/physcratic/actions/runs/46007678553), [CSP](https://github.com/Physcratic/physcratic/actions/runs/46007678385), community, continuation, progress-label and recovery workflows passed. The initial missing JSON-route inventory entry was corrected without weakening its guard. Direct code review found no blocking issue.

Favourite retrieval closes the remaining F4 implementation gap. It remains OFF by default and NO-GO for activation pending the owner prerequisites in [FAVOURITE_RETRIEVAL.md](FAVOURITE_RETRIEVAL.md). No production deployment, flags, settings, credentials, grants or data changes occurred. F5 saving qualification remains deferred and separate. The next release step is owner runtime qualification and an explicit activation decision, not automatic deployment.
