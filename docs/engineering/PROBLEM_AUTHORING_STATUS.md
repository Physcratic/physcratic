# Problem authoring implementation status

- Updated: 2026-10-31 (Asia/Makassar). Phase 5B ONLY; phases 0–5A merged.
- Fresh fetched main/base: `b0b7cc2755305f4e286f68a7e5b229f1e52608ed` (Phase 5A PR #17).
- Verified merged tree exactly matches reviewed Phase 5A + dimensionless fix `d061253`; branch `codex/problem-authoring-phase-5b` created from fetched main.
- Delivery: verification complete, commit/push/draft PR attempt pending; final SHA via git log -1.
- Read WORK_STATUS/map/status first; inspected grading/contracts/private revision dependencies only. No repeated repository audit.

## Completed Phase 5B
- Server-only restricted symbolic prover extending existing grading factory/typed response; immutable selection, private SQL query/session/publication authorization unchanged.
- [SYMBOLIC_GRADING_POLICY.md](SYMBOLIC_GRADING_POLICY.md) specifies grammar, proof obligation, domains, exact arithmetic, limits, examples and deliberate unsupported cases; do not claim general equivalence.
- Custom bounded lexer/Pratt AST: exact rational decimals, declared real variables, explicit + - * / ^, unary signs, parentheses, whitelisted one-argument functions. Real precedence/right-associative powers; no implicit multiplication.
- Existing legacy mathjs browser preview lacks this exact-literal/domain proof boundary; left unchanged. No eval/Function, compiled expressions, generic CAS or new dependencies.
- Rational-coefficient multivariate polynomials and rational expressions: exact cross-products prove identity only when all original definedness guards hold on a declared nonempty domain.
- Preserves holes through cancellation/zero products/zero powers; no unsafe removable-singularity or 0^0 simplification.
- Nonzero proofs use sound rational interval enclosures, monomial factors and one-variable affine roots excluded by bounds/assumptions/exclusions; other cases may need review.
- Variable domains enforce inclusive binary64 min/max, strict positive, nonnegative, nonzero and restricted variable != rational exclusions. Unsupported exclusions and empty domains never ignored; unused variable declarations checked too.
- Bounds retain exact stored binary64; expression/exclusion decimal literals are exact decimal rationals. Singleton bound 0.1 intentionally differs from symbolic 1/10; documented/tested prominently.
- Principal sqrt of perfect rational squares and supported real-square -> abs rules; abs constants/sign-proven expressions/declared variables. No unrestricted sqrt(x^2)->x.
- Only exact trig/log constants sin/tan0, cos0, log1; all other trig/log identities require review, including identical unsupported calls. Angle convention preserved; supported constants valid in radians/degrees.
- A non-equivalent result needs an exact rational both-defined unequal witness satisfying every domain declaration. Finite agreeing points never establish equivalence; no floating sampling/tolerance.
- Proven equivalent -> correct/symbolic-equivalent; exact counterexample -> incorrect/symbolic-counterexample; unsupported/domain/inconclusive/resource limits -> needs-review with fixed reason.
- Dispatched expression engineVersion symbolic-v1; numeric/manual remain numeric-v1. Safe response stays status/reason/version/selection only, no expression/AST/witness/private domain/key/error details.
- Explicit caps:180chars,128tokens,96nodes,depth16,8variables,128terms,degree16,exponent8,2048-bit rationals,128guards,64witnesses,40k ticks,cooperative100ms deadline.
- Native BigInt operands and AST/maps/term vectors/allocated work bounded. No hard OS-level heap/preemption claim; no unchecked external CAS/evaluation call.
- Phase 5A exact numeric tolerances, manual behavior, blank/ASCII 1 dimensionless alias, public serialization/private isolation preserved.
- No routes/student APIs/UI/uploads/social, schema/migrations, dependencies, auth/media behavior, production DB/storage changes, merge or deployment.

## Verification
- Targeted final mathematical/property/security/private DB/contracts: 43/43 PASS.
- Required adversarial identities: polynomial equality, removable singularities incl x=1/exclusion, sqrt-square sign domains, abs identity, unsupported trig/log identities incl negative arguments, undefined functions/division, empty/incompatible domains.
- Parser/degree/term/coefficient/exponent/nesting/size attacks return review, with injection/assignment/accessor/implicit multiplication refused. No expression execution.
- 220 seeded polynomial expansion and total rational identity cases plus non-equivalent variants; deterministic exact arithmetic only.
- Regression polynomial vanishes at every searched witness but is not identically zero: result inconclusive, never correct.
- Disposable PostgreSQL17: original numeric/domainless contracts plus immutable historical expression/private domain/exclusion selection, concurrent publication, foreign revision denial, verified owner/student/unpublish gates and public/result privacy.
- Full suite with all PostgreSQL tests enabled: 171/172 PASS; sole inherited corpus-translation punctuation failure at lib/corpus-translation.test.ts:66 (Phase 5A baseline 161/162). No new regressions.
- TypeScript PASS, including final sequential typegen after build. git diff --check PASS.
- Lint attempted: inherited missing eslint executable. Build attempted: inherited Inter/Google Fonts network EPERM; diagnostic disabled webpack worker in-process only to expose font error, no tracked config changes.
- Logs /tmp/physcratic-p5b-{math,target,full,typecheck,lint,build,build-diagnostic}.log are session-local, not committed.

## Independent mathematical/security review
- Independent read-only reviewer audited parser precedence, exact rationals, interval/nonzero/sign proofs, singularity guards, domain nonemptiness, resources, private dispatch and outputs; no confirmed actionable blockers.
- Independently generated 1,200 rational-expression pairs; 380 accepted proofs checked on exact rational grids, with no accepted unequal/undefined values.
- Independently generated 5,400 bounded-domain division/abs cases; 436 accepted proofs checked for nonzero divisors and correct signs, no discrepancies.
- These independent grids are adversarial test evidence, not the implementation's equality proof or a claim of exhaustive verification. Source proof conditions remain authoritative.
- Reviewer checked actual PostgreSQL historical-key/publication/privacy tests; no files modified by reviewer.

## Reproducible checks / limits
- Targeted: bash scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server --test lib/authored-symbolic-grading.test.ts lib/authored-grading.test.ts lib/authored-grading-db.test.ts lib/authored-numeric-grading.test.ts lib/problem-authoring.test.ts
- Full: bash scripts/test-problem-authoring.sh node /tmp/physcratic-npm/_npx/fed63785a0df9524/node_modules/pnpm/bin/pnpm.cjs test
- TypeScript: node_modules/.bin/next typegen then node_modules/.bin/tsc --noEmit, sequentially with build.
- Node server tests require --conditions=react-server; existing default-condition marker rejection regression retained. Only disposable localhost physcratic_authoring_test DB + unique test schemas used.
- No ambient DATABASE_URL/production storage used by tests; production adapter typechecked, sessions injected into real factory, deployed auth/staging flow not exercised.
- No general radicals/trig/log/constants/complex/unit algebra. Unsupported true identities intentionally require review; see capability policy before expanding language.
- Existing input/private key contracts still cap expression180/exclusions20/variables20; prover can conservatively refuse beyond its stricter eight-variable budget.

## Exact next task
- User review Phase 5B only; stop after delivery. No merge/deploy/production migrations.
- Phase 6 requires separate request after merge/fresh main/handoffs; reuse private immutable selection and typed result. Add origin/session/rate/idempotency/body/deadline controls before exposing any student grading/reveal API.
