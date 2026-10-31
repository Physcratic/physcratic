# Work status

- Scope: Phase 5A server-only numeric grading foundation, 2026-10-31 (Asia/Makassar).
- Base: freshly fetched main 7335d264b32b9deb2ef2d227764ded3257b94c89, Phase 4 PR #15 merged; verified squash tree matches reviewed Phase 4 branch.
- Branch: codex/problem-authoring-phase-5a. Read handoffs first; only grading/contracts/private revision dependencies inspected.
- Added strict typed grading service + verified-session adapter; exact problem/revision/part private-key query, snapshot authorization, safe four-status outputs without key/tolerance/solution details.
- Numeric formula abs(x-y) <= max(absTol,relTol*abs(y)); exact bounded binary64 dyadic arithmetic handles zero/negatives/extremes without overflow/underflow or hidden epsilon.
- Units require explicit exact trimmed allowlisted labels; no conversions or unit folding. Unknown/mismatched units need review. Manual ungraded; symbolic needs-review and remains Phase 5B.
- Promoted already locked server-only marker to direct dependency; tests use react-server condition, separate default-condition rejection test. No CAS/testing-library dependency.
- Targeted 31/31 PASS; 2,500 exact-oracle properties + 600 scaling cases; disposable PostgreSQL historical/private key selection, authorization, immutability, concurrency and timeout.
- Full 159/160 PASS; sole inherited corpus-translation punctuation failure at lib/corpus-translation.test.ts:66. TypeScript/frozen-lockfile/diff checks PASS. No regressions.
- Independent mathematical/security review complete: separate 10,000-case oracle agrees; no confirmed blockers.
- Existing ESLint missing / Inter font build blockers documented Phase 4; unchanged. No UI/API/schema/migration/auth/media changes, no production data/storage actions.
- Handoffs: docs/engineering/PROBLEM_AUTHORING_MAP.md and PROBLEM_AUTHORING_STATUS.md include policies, commands and future transport limits.
- Implementation 56c5067 pushed; final handoff SHA via git log -1. Draft PR creation blocked by GitHub API Forbidden.
- Open PR: https://github.com/Physcratic/physcratic/pull/new/codex/problem-authoring-phase-5a
- Stop after Phase 5A. User review first; Phase 5B only after separate request/merge/fresh main. No merge or deployment.
