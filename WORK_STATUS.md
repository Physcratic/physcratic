# Work status

- Scope: Phase 5A server-only numeric grading foundation, 2026-10-31 (Asia/Makassar).
- Base: freshly fetched main 7335d264b32b9deb2ef2d227764ded3257b94c89, Phase 4 PR #15 merged; verified squash tree matches reviewed Phase 4 branch.
- Branch: codex/problem-authoring-phase-5a. Read handoffs first; only grading/contracts/private revision dependencies inspected.
- Added strict typed grading service + verified-session adapter; exact problem/revision/part private-key query, snapshot authorization, safe four-status outputs without key/tolerance/solution details.
- Numeric formula abs(x-y) <= max(absTol,relTol*abs(y)); exact bounded binary64 dyadic arithmetic handles zero/negatives/extremes without overflow/underflow or hidden epsilon.
- Premerge fix: blank and ASCII "1" are equivalent dimensionless labels after trimming; shared student schema/evaluator policy and author help. Saved author key labels retained; other physical/unsupported units remain strict. No Phase 5B.
- Promoted already locked server-only marker to direct dependency; tests use react-server condition, separate default-condition rejection test. No CAS/testing-library dependency.
- Fix targeted 33/33 PASS, TypeScript PASS; existing exact-oracle properties, DB authorization/history/concurrency plus dimensionless author/student regressions. Browser shared-help/key persistence/recovery/publication/axe/mobile PASS.
- Full fix suite 161/162 PASS; sole inherited corpus-translation punctuation failure at lib/corpus-translation.test.ts:66. No regressions.
- Independent mathematical/security review complete: separate 10,000-case oracle agrees; no confirmed blockers.
- Existing ESLint missing / Inter font build blockers documented Phase 4; unchanged. Only author units help changes in UI; no API/schema/migration/auth/media changes, no production data/storage actions.
- Handoffs: docs/engineering/PROBLEM_AUTHORING_MAP.md and PROBLEM_AUTHORING_STATUS.md include policies, commands and future transport limits.
- Foundation 56c5067; dimensionless correction delivered on same branch, final SHA via git log -1. Existing draft PR creation blocker: GitHub API Forbidden.
- Open PR: https://github.com/Physcratic/physcratic/pull/new/codex/problem-authoring-phase-5a
- Stop after Phase 5A. User review first; Phase 5B only after separate request/merge/fresh main. No merge or deployment.
