# Problem authoring implementation status

- Updated: 2026-10-31 (Asia/Makassar). Phase 5A ONLY; phases 0–4 merged.
- Fresh fetched main/base: `7335d264b32b9deb2ef2d227764ded3257b94c89` (Phase 4 PR #15).
- Verified Phase 4 squash merge matches reviewed branch tree exactly; clean branch `codex/problem-authoring-phase-5a` created from fetched main.
- Delivery: verification complete; commit/push/PR attempt pending. Final SHA via git log -1.
- Read WORK_STATUS/map/status first; inspected grading/contracts/private revision schema/dependencies only. No repeated audit or unrelated auth/editor/media changes.

## Completed Phase 5A
- Client-safe strict grading transport schemas and typed correct/incorrect/needs-review/ungraded results, fixed reason codes, engineVersion numeric-v1 and canonical immutable selection.
- Server-only factory + production Better Auth/pool adapter; no public endpoint, client calls, student UI, submissions or result persistence.
- Trusted verified actor derived outside answer payload; no client-supplied user/owner/key/tolerance/current-version override accepted.
- Single indexed SQL statement joins exact problem/revision/part/private key with authorization in the same snapshot. No draft/current-revision/public JSON/worker key fallback.
- Verified owners can grade their immutable history even after unpublish; other verified users only while problem is currently published, including explicitly selected historical revisions.
- Missing or hidden selections return generic ungraded/revision-unavailable. Private schema/part/mode/key inconsistency needs review; DB/session failure returns generic review without diagnostics.
- Result contains only status/reason/version/selection; no submitted text, expected value/units/tolerances, private key/hints/solutions, SQL or Zod diagnostics.
- Numeric policy: abs(submitted-expected) <= max(absTol,relTol*abs(expected)), inclusive; tolerances finite/nonnegative from existing private key only, no default epsilon/rounding.
- Exact dyadic comparison of encoded binary64 inputs with bounded BigInts (<4300 bits) avoids overflow, underflow and floating-operation boundary rounding. Zero relative error uses absolute tolerance only; signed zero equivalent.
- Decimal JSON literals retain JavaScript binary64 semantics: e.g. 0.1+0.2 differs from 0.3 at zero tolerance. Set explicit author tolerances for intended rounding; no hidden decimal parser.
- Units policy: explicit units string required, <=80 characters, edge whitespace trimmed, exact case-sensitive allowlisted labels only. Empty string alone is dimensionless.
- Supported exact labels are listed in authored-numeric-grading.ts (SI/common scaled labels and selected compounds). Unknown labels, alternative spellings, mismatches or unsupported conversions -> needs-review.
- No unit conversions, unit stripping, aliases/case/Unicode folding, offset-temperature handling or dimensional expression evaluation; absTol is in the exact stored unit. Physically different labels never compare as equivalent.
- Manual keys explicitly ungraded. Expression keys/answer-mode mismatches need review; expressions are bounded opaque strings, never evaluated. Phase 5B symbolic engine remains unimplemented.
- Strict finite number input, bounded fields, no coercion/eval, fixed arithmetic work, indexed single-key lookup with 5s client query deadline; existing production connection5s/statement10s pool limits preserved.
- Promoted existing transitively locked server-only@0.0.1 marker to a direct dependency for client-import prohibition. No new numeric/CAS/property-test library.
- pnpm test now passes --conditions=react-server so server-only modules load in Node test workers; default-condition import rejection is separately tested.
- Existing contracts/private schema/migrations/public APIs/auth/CAPTCHA removal/practice/archive/editor/media untouched.

## Verification
- Targeted: 31/31 PASS (numeric/service/private-key DB integration + existing authored contracts).
- Numeric coverage: ±0, negative keys, inclusive absolute/relative equality and adjacent representable values, max not sum, decimal rounding, MAX_VALUE overflow, MIN_VALUE/subnormal products and opposite signs.
- 2,500 seeded finite IEEE754 tuples checked against independent fixed-common-denominator exact oracle; sign symmetry, reflexivity, determinism, monotonic tolerances; 600 exact power-of-two scaling cases.
- Adversarial: NaN/Infinity/non-number/BigInt/null/coercion strings, negative/infinite tolerances, excessive fields/strings, unknown units/case/control/Unicode/injection labels, forged keys/actor/version IDs.
- Security: no DB lookup for invalid/anonymous/unverified input; default client-condition import rejected; exact output allowlist; malformed private keys/identity/schema/modes and DB failures fail closed without secret diagnostics.
- Disposable PostgreSQL17: migrations 0001–0003, exact historical/current/draft distinction, cross-problem/guessed part denial, owner/unpublish gate, key update immutability, concurrent publication stability, real blocked-read timeout/recovery.
- Full with all PostgreSQL tests enabled: 159/160 PASS. Only inherited lib/corpus-translation.test.ts:66 punctuation mismatch fails (baseline Phase 4 142/143). No new regressions.
- TypeScript PASS. Frozen/offline lockfile consistency check and git diff --check PASS. No production databases, files, migrations, storage operations, deployment or merge.
- Existing lint missing ESLint / build Inter font network blockers remain documented Phase 4 baseline; not re-audited or changed by this phase.
- Session-local logs: /tmp/physcratic-p5a-{target,full,typecheck}.log (not committed).

## Independent mathematical correctness and security review
- Independent read-only reviewer checked dyadic decomposition/subnormals/signs/tolerance formula, strict schemas, units, private exact revision joins, authorization snapshots, safe output and server-only guard.
- Reviewer independently executed 10,000 finite binary64 cases against a separate common-denominator oracle; all agreed.
- Final review includes PostgreSQL historical/concurrency/timeout tests; no confirmed actionable correctness/security blockers found. No review modifications.

## Reproducible checks and limits
- Targeted: bash scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server --test lib/authored-grading.test.ts lib/authored-numeric-grading.test.ts lib/authored-grading-db.test.ts lib/problem-authoring.test.ts
- Full: bash scripts/test-problem-authoring.sh node /tmp/physcratic-npm/_npx/fed63785a0df9524/node_modules/pnpm/bin/pnpm.cjs test
- TypeScript: node_modules/.bin/tsc --noEmit (sequential with any build/typegen).
- Direct server-only Node test imports need --conditions=react-server; normal import deliberately throws. Existing browser harness remains under normal React conditions; this phase changes no UI.
- Test DB explicitly restricted to 127.0.0.1/physcratic_authoring_test, unique test schema per suite, disposable container cleanup. No ambient DATABASE_URL read by tests.
- Production adapter/session path typechecked; tests inject server actors into actual factory. No deployed Better Auth/staging flow exercised.
- Phase 6 transport must add origin/session/rate/idempotency/byte/deadline protections before exposing grading. This internal service is not an authorized public grading endpoint.

## Exact next task
- Review Phase 5A only; stop after delivery. No merge/deploy/production changes.
- Phase 5B requires separate request after merge, fresh main and handoffs first; reuse this interface/private selection and add constrained symbolic equivalence/domain/resource tests only then.
