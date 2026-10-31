# Authored student submissions (Phase 6A)

This phase adds persistent student attempts and API integration only. It adds no solving UI, reveal endpoint, comments/stars, ratings or changes to legacy practice/archive submissions.

Phase6B now consumes these unchanged APIs through the [student solving interface](AUTHORED_STUDENT_UI.md); that document specifies client recovery, revision visibility and browser verification. This document remains the Phase6A server/persistence policy.

## Published reader integration

`GET /api/authored-problems/[problemId]` keeps its existing allowlisted current revision body. A successful response adds a `Link` header with `rel="submission-info"` pointing to `/api/authored-problems/[problemId]/submission-info`.

The companion GET requires a verified server session and returns only the current published revision ID, public part IDs/answer modes, the caller's own per-part usage and explicit unlimited remaining metadata, policy and links. Its single SQL snapshot joins the same published pointer as the reader, never drafts or private parts. If publication changes before submission, the client gets a stale-revision conflict and must reload. The legacy `ProblemReader` model includes static practice answers/hints and is deliberately not used for authored keys. No solving UI is introduced here.

## API contracts

All new endpoints require a valid Better Auth session with `emailVerified === true`, use explicit private/no-store responses and never serialize private revision keys, hints, solutions, private asset references or grader internals.

- `POST /api/authored-problems/[problemId]/attempts`: strict JSON `{revisionId, partId, answer, idempotencyKey}`. User identity/problem path/attempt IDs/timestamp/results/counts/policy are server-owned. Numeric/expression/manual answers reuse Phase 5 schemas; blank and ASCII `1` units are equivalent.
- Creation returns 201 `{attempt, replayed:false}` only after commit. A matching idempotent retry returns 200 `{attempt, replayed:true}` with the original immutable result; different work using the same key returns 409.
- `GET /api/authored-problems/attempts?problemId=<optional uuid>&after=<optional cursor>`: caller's own newest-first history only, page size50 and opaque keyset cursor; unknown/duplicate query fields rejected. Cursor timestamp+UUID filters remain scoped to caller even if forged.
- `GET /api/authored-problems/attempts/[attemptId]`: caller's own attempt only. Guessing another student's ID returns404, including for the problem author.
- `GET /api/authored-problems/[problemId]/submission-info`: verified-reader companion described above; hidden/unpublished problems404.

An attempt response contains only server attempt ID, problem/revision/part IDs, the student's submitted answer, status/reason/engineVersion, attemptNumber (an exact decimal string), createdAt ISO timestamp, spoilerPolicy and app reveal-assistance flag. It includes no user/idempotency identity field, marking key or revision content.

## Limits and spoiler policy

- Shared persistent fixed-minute bucket per user: 60 total new-API requests/minute, including reads, and20 submission POST requests/minute. Invalid/repeated POSTs count as requests; wrong-origin or unauthenticated/unverified requests are rejected before charging. Counters are bounded atomic upserts using one EXCLUDED window timestamp, shared across instances.
- At most100 **new committed attempts in a rolling24-hour window** across all authored problems. There is **no lifetime or per-revision/part practice limit**. All four saved outcomes count toward the rolling quota; matching idempotent replay does not consume a new attempt or ordinal and never regrades. HTTP rate limits still apply to replay. Metadata sets attemptsPerPart=null and attemptsRemaining=null to mean unlimited, not zero.
- Rate429 includes Retry-After60; rolling-day quota exhaustion429 omits that fixed-minute advice. There is no permanently exhausted practice revision.
- Body: actual-byte20,000 limit with5s read deadline, strict JSON, finite numeric answers, existing field caps; NUL/unpaired-surrogate strings rejected before PostgreSQL JSONB. Forged Content-Length cannot bypass the byte limit.
- DB operations use statement5s, lock2s and idle-in-transaction10s limits, plus existing production connection limits. Symbolic CPU/work limits remain Phase 5B's bounded cooperative100ms policy.
- `no-reveal-v1` means **submitting an answer or receiving a grade does not automatically unlock private answers**, hints, worked solutions or private assets. It is not a permanent prohibition on a separate, explicit student-initiated worked-solution viewing feature in a future phase. Such a feature must use its own authorization/reveal/assistance contract; none is implemented here. The current reveal="disabled" metadata describes Phase 6A only. `assisted:false` records only that this app did not reveal a solution before this attempt; it makes no claim about external assistance.

Own historical attempt records remain readable/replayable after unpublish or newer publication, but contain only the student's answer/result/selection. Replay is record retrieval, not a new historical grading request. It never restores access to withdrawn statement content or private assets. New attempts always require the current published revision, including for problem authors.

## Transaction and concurrency invariants

1. Authenticate, protect write origin, charge persistent request bucket, validate bounded JSON.
2. Begin transaction; acquire per-user advisory lock (shared namespace across all problems) to serialize idempotency, rolling usage and per-part ordinal allocation.
3. Find existing `(user,idempotencyKey)` first. Reparse stored JSON through the answer schema before comparing canonical selection/answer, avoiding JSONB property-order differences and allowing the defined dimensionless aliases.
4. For a new attempt, lock the currently published problem parent `FOR SHARE`; require exact client revision match and valid revision part. Publication/unpublish uses existing `FOR UPDATE`, so it waits until attempt commit, or wins first and causes conflict/404.
5. Check the rolling-day quota and allocate the next per-user/revision/part ordinal under the same user lock. Invoke the existing server-only grader with the **same PoolClient** (its dependency accepts a query executor). No second pool connection is needed while holding publication locks, even with pool max1.
6. Runtime-allowlist the grader's exact status/reason/version/selection shape, require pinned selection equality, then insert answer/outcome/ordinal and commit atomically. Unknown grader extras or changed selection rollback503, with no secret diagnostics.

Correct, incorrect, needs-review and ungraded remain distinct. Unsupported expressions remain review outcomes. A thrown grader failure is a generic service-unavailable review if the DB transaction is healthy. An aborted DB read/failed insert/commit rolls back and returns503; the client retries the same key. There is no pending attempt row, partial grade or separate idempotency reservation to reconcile. A committed attempt recovered after a lost HTTP response is returned exactly once without regrading or slot consumption.

## SQL and migration safety

Explicit additive `0004_authored_attempts.up.sql` creates only `authored_attempt` and `authored_student_rate`. Composite FKs bind problem+revision and revision+part; user FK preserves ownership. User/key uniqueness and unique positive bigint ordinals per user/revision/part reinforce serialization without a practice cap. Timestamp precision3 preserves exact cursor ordering through JS ISO serialization; UUID resolves ties.

Ordinals start at1 and use PostgreSQL bigint with CHECK(attempt_number>0), with no policy upper bound. API attemptNumber and metadata attemptsUsed are decimal strings to avoid JavaScript integer rounding, including beyond 2^53. Per-part metadata uses the highest ordinal from an indexed backward scan (equal to the count for immutable API-created contiguous histories); attemptsRemaining is null. Next numbering also uses that indexed maximum rather than a historical COUNT(*). The retained unique ordinal constraint prevents duplicate sequence numbers.

The bigint representation ceiling (9223372036854775807) is checked before addition/grading: a new write would return a generic retryable503 without overflow/rounding or partial records. Own history and idempotent replay are checked first and remain available. This unreachable-at-practice-rates technical storage boundary is not a replacement learning-policy cap; widening the representation would require a separately reviewed migration if ever needed.

Immutable history can grow without a lifetime row quota. The100/day ingestion bound limits growth to roughly36,500 records/year/student plus boundary effects; submitted payloads remain bounded. Reader history stays keyset-paginated; daily quota scans use an indexable statement-timestamp cutoff and stop at100 rows, and per-part sequence/metadata lookups use the ordinal index. No automatic purge, silent idempotency expiry or replacement permanent cap is added. Storage monitoring and any future archival/retention/deletion policy must preserve revision bindings, privacy and retry semantics through a separately reviewed design.

SQL checks restrict answer keys/types/size, finite numeric range, status/reason pairs, engine versions and fixed no-reveal policy. A trigger rejects mutations/deletes and new insertions against any non-current/unpublished revision under a parent share lock. Application session authorization remains in the trusted server boundary, as in prior phases; these tables are not exposed as standalone RLS clients. Application day limits require the serialized API path.

There is no automatic migration/build/startup hook or schema push. Apply reviewed0004 after0003 with the existing advisory migration lock/checksum/source-commit ledger procedure. Rollback exposure first. The down file refuses populated attempts; immutable user work/history and its revision FKs must be retained. User FK RESTRICT intentionally prevents silently deleting audit/history with an account; a future separately reviewed retention/deletion workflow would need to address that explicitly.

## Verification and remaining boundaries

Disposable PostgreSQL integration covers migration up/down/up and populated rollback refusal, all outcome types, strict auth/origin/body/deadline, own-only history and pagination, normalized concurrent retries/conflicts, uncapped >10 practice, rolling/minute quotas, bigint/JSON-precision and representation-edge guards, gated unpublish/new-publication races, grading failure/rollback, poolmax1, immutable SQL/FKs and private solution PDF denial after a correct answer.

The production Better Auth/Vercel staging flow is not exercised by these injected-session factory tests; no production DB or storage is accessed. UI and intentional reveal/assistance policy changes require a later separately scoped phase. Existing numeric/symbolic proof limitations remain documented in SYMBOLIC_GRADING_POLICY.md.
