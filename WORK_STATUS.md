# Work status

- Scope: Phase 1 schema/model only, 2026-10-31 (Asia/Makassar); Phase 0 merged.
- Verified base: ecee0baa8d56408f9fc9bd22c156a4feac7b8ecb; branch codex/problem-authoring-phase-1.
- Completed: strict typed content/draft/revision/key contracts, explicit private/public mapping, additive versioned Drizzle schema and reviewed SQL up/down.
- Added: relational revision-part identities, separate private keys, owner/revision FKs, uniqueness/checks, immutable revision sealing.
- Handoffs: [map](docs/engineering/PROBLEM_AUTHORING_MAP.md), [status](docs/engineering/PROBLEM_AUTHORING_STATUS.md), [migration notes](migrations/README.md).
- Targeted tests: 10/10 PASS. Disposable PostgreSQL17 up/constraints/down/up PASS; existing user retained.
- Full suite: baseline 93/94; final 103/104. Same existing corpus translation punctuation mismatch, no new failures.
- Typecheck PASS. Baseline lint failure (eslint absent) and build blocker (Google Fonts download) persist unchanged.
- Independent schema/security critic and root review completed; NULL identity and concurrent sealing issues addressed.
- Source/auth/archive/practice behavior and package/lockfile unchanged; media tables deferred to Phase 4.
- Delivery: commit/push/draft PR pending; GitHub API Forbidden persists on PR listing.
- No merge, deployment, production migration or production data edits. Phase 2 unstarted.
- Next: review/merge Phase 1, then separately request Phase 2 from fresh main; read handoffs before affected code only.
