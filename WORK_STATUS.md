# Work status

- Scope: Phase 5B restricted server-only symbolic grading, 2026-10-31 (Asia/Makassar).
- Fresh main b0b7cc2755305f4e286f68a7e5b229f1e52608ed (Phase 5A PR #17); exact tree verified against numeric + dimensionless fix d061253.
- Branch codex/problem-authoring-phase-5b. Read handoffs first, affected grading/private revision dependencies only; no repeated audit.
- Added bounded AST parser/exact rational polynomial and rational-function prover; existing private SQL/session/publication/immutable selection architecture retained.
- Acceptance requires exact algebra + nonempty domain + all original definedness guards; exact both-defined unequal rational witnesses can reject. Agreeing points never prove equality.
- Bounds/assumptions/restricted exclusions, removable singularities, safe principal sqrt/abs and tiny exact trig/log constant subset; unsupported or resource-limited cases need review.
- Documented explicit grammar/proof/domain/limits in docs/engineering/SYMBOLIC_GRADING_POLICY.md; not a general equivalence engine. Numeric/manual/dimensionless behavior preserved.
- Caps AST/depth/terms/degree/exponents/coefficients/guards/witnesses/work + cooperative100ms; no eval/Function/CAS execution or new dependencies.
- Targeted 43/43 PASS; exact identity/property/adversarial tests + disposable PostgreSQL immutable expression/domain selection, publication races, auth/privacy.
- Full 171/172 PASS; only inherited corpus-translation punctuation assertion lib/corpus-translation.test.ts:66. TypeScript/typegen/diff checks PASS; no regressions.
- Independent mathematical/security audit complete; 1,200 rational pairs + 5,400 bounded-domain sign/division cases checked independently; no confirmed blockers.
- Lint inherited missing ESLint; build inherited Inter/Google Fonts network failure confirmed by diagnostic. No tracked config changes.
- No student/public grading APIs/UI, schema/migrations, uploads/social/auth/media changes or production data/storage actions. No merge/deploy.
- Handoffs updated; delivery pending commit/push/draft PR attempt. Final SHA via git log -1.
- Next: user review Phase 5B only; stop. Phase 6 requires separate request, merged main and handoffs first.
