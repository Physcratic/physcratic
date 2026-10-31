# Work status

- Scope: Phase 6A persistent secure student attempts/API only, 2026-10-31 (Asia/Makassar).
- Fresh main058fa3cf125920296227d0c8473cf70abe6ff593 (Phase 5B PR #19); exact reviewed tree verified. Branch codex/problem-authoring-phase-6a.
- Handoffs read first; affected API/auth/grading/reader/database dependencies only, no repeated audit.
- Additive explicit0004 immutable attempt/rate tables with exact user/problem/revision/part FKs, unique idempotency/ordinals, strict JSON/outcome and publication guards; populated rollback refuses.
- Verified same-origin bounded POSTs;60requests/min,20POST/min,100new rolling24h,10 per immutable revision/part. Per-user lock + current parent share lock + same-client grader + atomic insert/commit.
- Normalized idempotent replay never regrades/uses attempt slots; different work409. Stale/hidden new submissions denied. Own history survives unpublish without exposing revision/private content.
- Four outcomes and engine versions preserved. Healthy grader failure saved as review; DB/malformed-result failure rolls back503 for same-key retry.
- Own-only history/detail + public-reader Link/verified companion metadata; no solving UI. no-reveal-v1 never unlocks keys/hints/solutions/private PDFs after correctness/exhaustion.
- Targeted55/55 PASS; full183/184 PASS, sole inherited corpus punctuation assertion lib/corpus-translation.test.ts:66. TypeScript/typegen/diff PASS.
- Disposable PG17 + isolated storage tests include IDOR, bodies/deadline, concurrency, limits/retries, publication/unpublish races, grading failures, poolmax1, SQL integrity and private PDF denial.
- Independent security/data-integrity review complete; fixed read-rate blocking, internal-validation classification and misleading Retry-After; no remaining confirmed blockers.
- Inherited lint missing ESLint / build Inter font network failure confirmed; no tracked config changes. Handoffs + AUTHORED_STUDENT_SUBMISSIONS.md + migration README updated.
- No dependencies, legacy practice/archive/auth/media changes, social/rating/solving UI, merge/deploy or production data/storage/migrations.
- Delivery pending commit/push/draft PR attempt; final SHA via git log -1.
- Next: user review Phase 6A, stop. UI/reveal requires separate phase/request after merge/fresh main/handoffs.
