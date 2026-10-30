# Work status

- Scope: Phase 2 draft/publication APIs only, 2026-10-31 (Asia/Makassar).
- Fresh base: 365eb62a47116e710723418d0b8e6148ce8ccd7b (PR #6 merged); branch codex/problem-authoring-phase-2.
- Added verified-owner CRUD/list/preview, version-checked saves, transactional publish/unpublish and published-only reader.
- Phase 1 private keys/immutable history/UUID/sealing/Date contracts preserved; no edits to archive/practice/auth code or packages.
- Added 0002 persistent per-user write limit; media refs rejected until Phase 4; strict origin/JSON/size/ownership checks.
- Handoffs: [map](docs/engineering/PROBLEM_AUTHORING_MAP.md), [status](docs/engineering/PROBLEM_AUTHORING_STATUS.md); API routes/version/error semantics recorded there.
- Targeted disposable PostgreSQL integration: 10/10 PASS; original SQL sealing tests also pass; limiter rollback/up retains revisions.
- Full suite with DB integration enabled: 116/117. Only inherited corpus translation punctuation mismatch fails; no regressions.
- TypeScript PASS. Inherited lint failure (eslint absent) and build blocker (Google Fonts download) reproduced unchanged.
- Independent adversarial security review: no confirmed blocking issues. Auth session injection tested; live Better Auth/browser staging flow not exercised.
- Test script creates/removes local PostgreSQL17 only; no ambient DATABASE_URL, production migration or production data operations.
- Delivery: implementation 1e6ef0e pushed; delivery update on same branch. Compare: https://github.com/Physcratic/physcratic/compare/main...codex/problem-authoring-phase-2?expand=1
- No editor UI, uploads, CAS, comments/stars, production merge or deployment. Phase 3 unstarted.
- Next: user reviews/merges Phase 2, then separately requests Phase 3 from fresh main; read handoffs and only affected code.
