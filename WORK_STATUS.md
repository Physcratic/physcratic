# Work status

- Scope: Phase 2 draft/publication APIs only, 2026-10-31 (Asia/Makassar).
- Reconciled base: e4fbc88264a2c4280e6077f31346c06722fce6c4 (Phase 1 recovery PR #12 merged); same codex/problem-authoring-phase-2 branch.
- Added verified-owner CRUD/list/preview, version-checked saves, transactional publish/unpublish and published-only reader.
- Phase 1 private keys/immutable history/UUID/sealing/Date contracts preserved; no edits to archive/practice/auth code or packages.
- Added 0002 persistent per-user write limit; media refs rejected until Phase 4; strict origin/JSON/size/ownership checks.
- Handoffs: [map](docs/engineering/PROBLEM_AUTHORING_MAP.md), [status](docs/engineering/PROBLEM_AUTHORING_STATUS.md); API routes/version/error semantics recorded there.
- Targeted disposable PostgreSQL integration: 10/10 PASS; original SQL sealing tests also pass; limiter rollback/up retains revisions.
- Full suite with DB integration enabled: 116/117. Only inherited corpus translation punctuation mismatch fails; no regressions.
- TypeScript PASS. Inherited lint failure (eslint absent) and build blocker (Google Fonts download) reproduced unchanged.
- Independent adversarial security review: no confirmed blocking issues. Auth session injection tested; live Better Auth/browser staging flow not exercised.
- Test script creates/removes local PostgreSQL17 only; no ambient DATABASE_URL, production migration or production data operations.
- Delivery: original implementation 1e6ef0e retained; conflict-free main merge plus refreshed checks/handoffs on same branch. Compare: https://github.com/Physcratic/physcratic/compare/main...codex/problem-authoring-phase-2?expand=1
- Recovery reconciliation: merge preserves both histories; Phase 1 migration/tests and auth/CAPTCHA/package paths match main; no runtime implementation edits.
- Reverification: Phase 1 contracts 13/13, disposable PostgreSQL integration 10/10, TypeScript PASS; full 116/117 with same inherited failure.
- Fresh independent security review: no confirmed blocking issues; authorization, version races, publish ordering and private keys reviewed.
- Signup CAPTCHA removal/PR #11 retained. No editor UI, uploads, CAS, comments/stars, production merge or deployment. Phase 3 unstarted.
- Next: user reviews/merges Phase 2, then separately requests Phase 3 from fresh main; read handoffs and only affected code.
