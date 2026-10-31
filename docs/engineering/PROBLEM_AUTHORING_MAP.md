# Problem authoring architecture map

Phase6C-B continues c259602 on the same completion branch; original Phase6C-A base `a8fac8f83722bfa9faed9a867cbb1582aa0b599f` (Phase6B PR#22); integration branch `codex/physcratic-authoring-completion`.
Source: user-supplied PHYSCRATIC_PROBLEM_AUTHORING_CODEX_PLAYBOOK.md. Phases0–6B merged; Phase6C-A backend reused unchanged by6C-B UI.
Read this, WORK_STATUS.md and [status](PROBLEM_AUTHORING_STATUS.md) first; inspect affected code/dependencies only.

## Established architecture (reuse; do not repeat audits)
- Next 15.5.28 / React 19 / TypeScript / pnpm; existing Zod, KaTeX, mathjs, Drizzle, Better Auth and Vercel Blob. Phase 5A promotes the already locked tiny Next.js server-only marker to a direct dependency for enforced client-import rejection.
- [Database](../../lib/db/index.ts): PostgreSQL Pool + Drizzle; trusted application role, not standalone RLS. Never expose raw authored/private tables.
- [Schema](../../lib/db/schema.ts): authored tables isolated from user/session, practice_attempt, solution_attempt/evidence, archive and contest contracts.
- Better Auth and [submission adapters](../../lib/submission-server.ts) provide session/configured origin; every author operation explicitly requires emailVerified === true.
- Preserve legacy practice/archive/auth/CAPTCHA removal; legacy preview workers expose keys and must never grade authored work. server-only service guards; client transports only; test with --conditions=react-server.
- [Migrations](../../migrations/README.md): explicit, additive 0001/0002/0003/0004/0005; SQL authoritative for deferred FKs/triggers. No schema push/startup/build migration.
## Approved document and privacy contracts
- [Contracts](../../lib/problem-authoring.ts): authored problem -> mutable draft -> immutable numbered revision. Stable UUIDs normalized lowercase before validation/persistence.
- Ordered document context/sections/parts; ordered text spans, display/inline math and image blocks. Image = {id,kind:'image',mediaId,alt,caption}; descriptive alt required at publication.
- Attachments = UUID + purpose statement-image/statement-pdf/solution-pdf. Private hint/solution image IDs live only in private parts, never public attachment indexes.
- Provenance = original/authorized + source + rightsDeclaration; incomplete drafts allowed, publication requires meaningful native content, part/key completeness and rights.
- Physically separate PrivatePart {partId,key|null,hints,solution}. Key modes numeric/expression/manual; modes must match relational revision parts.
- Public mapper explicitly allowlists revision fields, normalizes Drizzle Date to ISO and strips solution-pdf. Serialization does not authorize access.
- Public content never includes keys, hints, worked solutions, private image IDs, solution PDFs or Blob paths/URLs.
## SQL integrity and publication order
- 0001: owner FK; unique draft/problem and revision number; composite same-problem published pointer; exact document/relational part IDs/modes; duplicate IDs rejected.
- Separate private rows and reverse FKs enforce one matching key per revision part. Immutable/sealed child and revision rows cannot be amended later.
- Publication locks problem+draft, checks optimistic version and validates stored document/keys/rights/media.
- Insert revision parts, private keys AND revision media bindings BEFORE final revision sealing insert, then pointer/version updates; commit once before responding.
- No released savepoints: deferred xmin checks require one inserting transaction for children/revision.
- 0003 sealing verifies exact bidirectional set of document attachments/statement images/private hint+solution images versus relational media bindings.
- Revision media bindings are immutable, sealed, same-problem/purpose FK constrained, ready-only, and subject to the same deferred xmin transaction rule.
- Draft saves replace media bindings atomically with document/private rows. Ready media rows locked after parent; same parent lock serializes save/publish/delete/cleanup.
## Phase 2 APIs (extended by Phase 4, existing contracts preserved)
- [API factory](../../lib/problem-authoring-api.ts), [production adapter](../../lib/problem-authoring-server.ts); injected session/origin/pool for disposable tests.
- Base /api/authored-problems. GET/POST /drafts; GET/PUT/DELETE /drafts/[id]; GET /drafts/[id]/preview; POST publish/unpublish; GET /[id] public current revision.
- Strict owner/version JSON; cross-owner/guessed IDs 404. Owner list bounded 50/cursor; 100 retained problems per author; 60 writes/minute across instances (0002).
- All responses private/no-store. Actual-byte JSON limit 2MB/15s. No client owner/count authority. Concurrent same-version mutations produce one success + 409.
- Preview is owner-only allowlisted statement; public GET requires published-state + same-problem pointer join and never queries private tables.
- Delete requires unpublish first; removes working draft, retains immutable history/media registry. Last orphan cleanup prunes empty never-published parent to recover quota.
- Old blanket media denial replaced only with [ownership/reference validation](../../lib/author-media-references.ts) on create/update/publication.
## Phase 4 registry, upload and access policy
- [Media API](../../lib/author-media-api.ts), [validation](../../lib/author-media-validation.ts), [references](../../lib/author-media-references.ts), [private storage adapter](../../lib/author-media-storage.ts).
- 0003 author_media stores server UUID/problem/purpose, private nonce pathname, canonical filename, detected MIME/bytes/hash, pending/ready/deleting state; metadata/content identity immutable.
- author_draft_media and author_revision_media pin references. author_media_usage persists daily attempts. No client paths, owner IDs, storage URLs or public Blob access.
- POST /drafts/[id]/media multipart {file,purpose}; GET same path lists own safe metadata + draft/history retention flags.
- GET /[id]/media/[mediaId] proxies bytes; DELETE same path strictly owner-only JSON {}; POST /media/cleanup strictly owner-only JSON {}.
- Four immutable registry purposes: statement-image, solution-image, statement-pdf, solution-pdf. Same-problem owner/ready/purpose matching on every reference.
- Max 3MiB/file; multipart actual bytes bounded +15s parse; MIME must match binary structure/signature. PNG/JPEG/static WebP dimensions capped 12k/40M pixels; PDF header+EOF checked.
- SVG/HTML/animated WebP rejected. Signature/structure validation is not a complete decoder, PDF sanitizer or antivirus service.
- Writes require configured origin; shared 60/minute bucket + 30 upload attempts/day (including failure), max 100 tracked objects /100MiB per owner. Advisory lock reserves aggregate quota atomically.
- Storage uses existing private Vercel Blob with nonce paths, no overwrite, SDK10s timeouts. Upload reserves pending row, PUTs privately, marks ready; failed/ambiguous writes keep cleanup tombstones.
- Verified owner can read own ready assets. Everyone else gets statement media ONLY if problem currently published AND media bound to current revision or explicitly requested same-problem historical revision.
- Unpublish revokes all anonymous media reads, including historical URLs; historical files remain stored. Private solution assets are always author-only in Phase 4.
- No Blob URLs/redirects/cacheable responses. Exact MIME, nosniff, same-origin CORP, no-referrer, sandbox/default-none CSP; PDFs forced download, never embedded/executed in editor.
- Cleanup only owner-triggered, <=5 candidates/request: ready unlinked >24h, pending/deleting >1h. Saved drafts and ALL historical bindings permanently protect assets.
- Mark deleting under parent/media locks -> delete private object outside DB transaction -> delete registry last; errors retain path for retry. Ambiguous recent PUTs retain tombstones >=1h and repeat physical deletion.
- Populated-registry down migration refuses; rollback exposure first and retain storage/history. Deployment requires a private Blob store and separately reviewed explicit migration; no production access performed.
## Native editor and state preservation
- [Verified route](../../app/dashboard/author/page.tsx), [workspace](../../components/authoring/workspace.tsx), [editor](../../components/authoring/problem-editor.tsx), [media controls](../../components/authoring/media-controls.tsx).
- Native sections/parts/text/math/images, existing KaTeX trust:false/expansion caps, keyboard move/delete focus, numeric/expression/manual private panels; no editor/drag-drop dependency.
- [Session machine](../../lib/problem-authoring-editor.ts): 1800ms serialized autosave, acknowledged versions, explicit 409 comparison/decisions, owner/problem tab recovery, uncertain/raw invalid backups retained.
- Images upload at statement/hint/solution block position; local proxy preview, alt/caption, replacement/removal; optional statement/private solution PDFs upload/replace/download/remove.
- Removing/replacing changes references only after autosave; history stays immutable. Manager shows retention status, protects local refs and exposes explicit unused-file deletion/age-based cleanup; workspace cleanup also available without drafts.
- Pending upload freezes edits/back/publish/conflict copy replacement and protects beforeunload; successful callback invalidates stale comparison. Failures retain original reference and show error.
- Student preview uses only public mapper; private panels/comparison JSON unmounted. It renders statement images/PDF links only, never private assets or unsafe PDF iframe.
## Phase 5A secure grading foundation
- [Client-safe types](../../lib/authored-grading-contracts.ts), [server service](../../lib/authored-grading.ts), [numeric evaluator](../../lib/authored-numeric-grading.ts), [session adapter](../../lib/authored-grading-server.ts). No new routes/student UI or grading persistence; existing author Units help shares the client-safe units policy.
- Strict {problemId,revisionId,partId,answer}; UUID lowercase; numeric answer {kind,value,units} requires finite number and explicit units string <=80; expression <=180/manual text <=4000 are bounded transport cases only.
- Output has status correct/incorrect/needs-review/ungraded, fixed reason, engineVersion numeric-v1/symbolic-v1 and canonical selection (null for invalid input). Never returns key/value/expected units/tolerances/private hints/diagnostics.
- Trusted verified session is injected separately. One indexed SQL snapshot authorizes owner OR currently published problem and joins exact requested problem/revision/part/private key; no draft/public JSON/worker/current-key fallback.
- Verified nonowners may grade explicit historical revisions while problem is published; unpublish blocks them. Owner may grade retained unpublished history; all grading still requires verified email.
- Private schema/part/mode/key mismatches -> needs-review; missing/hidden revision -> ungraded; DB/session failures -> generic needs-review. Client query deadline5s, production pool connection/statement limits retained.
- Numeric policy: |submitted-expected| <= max(absTol,relTol*|expected|), inclusive. absTol/relTol finite/nonnegative from existing private key; no defaults, added epsilon, rounding or sum-of-tolerances.
- Exact dyadic BigInt comparison over stored binary64 values prevents overflow/underflow/rounded-boundary errors; four finite inputs bound integer width <4300 bits. Decimal-looking JSON numbers are binary64, not arbitrary-precision decimal input.
- Units: blank and ASCII "1" are equivalent dimensionless labels after edge trimming (the sole alias). Shared normalizeNumericUnits/numericUnitsHelp in client-safe grading contracts govern student-answer parsing, evaluator key comparison and author guidance; saved author labels remain unchanged. Other labels stay case-sensitive/allowlisted, no conversions/Unicode folding/dimensional algebra; unsupported expressions or physical mismatches need review.
- Manual keys remain ungraded; mismatched answer modes need review. Expression-key dispatch now uses the Phase 5B prover below without changing private selection or numeric behavior.
- [Numeric properties](../../lib/authored-numeric-grading.test.ts), [service security](../../lib/authored-grading.test.ts), [disposable PostgreSQL](../../lib/authored-grading-db.test.ts): exact oracle, boundaries/extremes, units, isolation, immutable selection, concurrent publication and timeout.

## Phase 5B restricted symbolic prover
- [Language/rational arithmetic](../../lib/authored-expression-language.ts), [prover](../../lib/authored-symbolic-grading.ts), [mathematical tests](../../lib/authored-symbolic-grading.test.ts); exact grammar/proof/domain/limit specification in [SYMBOLIC_GRADING_POLICY](SYMBOLIC_GRADING_POLICY.md).
- Custom bounded real AST avoids legacy preview floating literals/domain-unsafe simplification; no eval/Function, mathjs execution, generic CAS or new dependencies. Plain explicit operators/declared real variables, exact rational decimal constants only.
- Exact polynomial/rational cross-product equality proves acceptance only with a nonempty domain and all original definedness obligations proven everywhere. Cancellation, zero products and zero powers preserve singularities.
- Bounds use exact stored binary64; expression/exclusion literals exact decimal rationals. Bounds/positive/nonnegative/nonzero and restricted variable != rational exclusions apply to every variable, including unused ones; unsupported/empty domains need review.
- Safe principal sqrt/abs rules and exact sin/tan0, cos0, log1 constants only; general trig/log/radicals/transcendental constants require review. No sqrt(x^2)->x without sign proof.
- Non-equivalence requires an exact rational, both-defined unequal witness satisfying all domain constraints. Agreeing samples never prove equality; no floating sampling. Unproved/resource-limited cases need review.
- Caps:180chars/128tokens/96nodes/depth16;8variables/128terms/degree16/exponent8/2048-bit rationals/128guards/64witnesses/40k ticks/cooperative100ms. Native work and allocated structures bounded; no hard OS heap/preemption claim.
- Expression results use symbolic-v1 and fixed reason codes; no expected expression/AST/witness/private domain/diagnostics forwarded. Numeric/manual/units and exact SQL selection preserved; disposable PG verifies historical keys/domains, races, auth/unpublish and public isolation.

## Phase 6A student attempt persistence/API
- [Contracts](../../lib/authored-attempt-contracts.ts), [API](../../lib/authored-attempt-api.ts), [production adapter](../../lib/authored-attempt-server.ts), [tests](../../lib/authored-attempt-api.test.ts); full contracts/limits/locking/retention in [student policy](AUTHORED_STUDENT_SUBMISSIONS.md).
- Explicit0004 adds immutable authored_attempt + persistent authored_student_rate, same-problem/revision/part/user FKs, unique user/idempotency + positive bigint per-part ordinals (JSON decimal strings); down refuses populated history. No private key duplication.
- Verified student POST /[id]/attempts requires strict revisionId/partId/answer/idempotencyKey JSON, configured origin, actual20KB/5s body; user/results/policy/timestamps server-owned. Numeric/symbolic/manual outcomes preserved.
- Per-user advisory lock -> canonical idempotency lookup -> current published parent FOR SHARE -> limits -> existing grader on same PoolClient -> allowlisted result/selection -> immutable insert/commit. Publish/unpublish FOR UPDATE serializes; no second grading connection/deadlock.
- Limits:60requests/minute incl reads,20POST/minute,100new attempts/rolling24h; no per-part/lifetime cap. Indexed ordinal allocation stays sequential under the user lock, with exact bigint overflow guard. Replay does not regrade/use attempt slots; different payload same key409. Minute-specific Retry-After only for rate bucket.
- GET /attempts (+ optional problemId/keyset after) and /attempts/[attemptId] return own submitted answer/result/IDs only, even after unpublish; never other students/author. Timestamp(3)+UUID stable newest-first cursor.
- Existing public revision GET body unchanged; Link to verified /[id]/submission-info companion supplies current revision/public parts/own usage/unlimited remaining/policy/URLs from one published snapshot. No drafts/private content; UI is Phase 6B below.
- no-reveal-v1 still prevents automatic disclosure by submission/grading. Phase6C-A adds separate explicit approval/reveal; future assisted flags derive from its ledger, with original replay flags preserved. Healthy grader failure persists review; malformed outputs/DB failures rollback503.

## Phase 6B student solving interface
- [Public route](../../app/dashboard/authored/[id]/page.tsx), [session shell](../../components/authored/student-page-client.tsx), [workspace](../../components/authored/student-workspace.tsx), [public blocks](../../components/authored/public-content.tsx); [UI policy](AUTHORED_STUDENT_UI.md) specifies state/recovery/privacy/testing.
- [Client state](../../lib/authored-student.ts) stores account/problem/revision/part-scoped sessionStorage input + exact pending payload/key + safe receipt. Persist-before-send, explicit same-key retries, atomic acknowledgement and separate new-intent action prevent accidental duplicate attempts; no automatic restored POST.
- Public serializer/current revision GET and media proxy only; statement PDFs only. Verified session/info required for new submissions. Account changes/401/403 remove private panels and ignore/abort late requests; no auth/backend changes.
- Changed/unavailable publication hides stale statements/labels and latches until explicit reload. Pending historical replay retains original selection; never retarget input. Own history50-row cursor pages show immutable IDs, not withdrawn content; success invalidates page+cursor together.
- Reuses shared units policy, bounded answer schemas, KaTeX and design system. Exact four outcomes; opaque expressions and conservative grammar guidance; no grader/key/worker/reveal on client. Keyboard/mobile math scrolling; no dependencies/migrations/limits/math/media-policy changes.
- [Model tests](../../lib/authored-student.test.ts), [rendered browser+PG](../../tests/authored-student.browser.mjs): duplicates/reload/retries, accounts/IDOR, publication/focus race, pagination, privacy and desktop/mobile axe/overflow. Injected sessions and memory storage only; live Better Auth/Vercel staging untested.

## Phase 6C-A explicit solution access backend
- [Policy/API/locking/migration specification](AUTHORED_SOLUTION_ACCESS.md); [API](../../lib/authored-solution-api.ts), [contracts](../../lib/authored-solution-contracts.ts), [server adapter](../../lib/authored-solution-server.ts), [PG security tests](../../lib/authored-solution-api.test.ts).
- Additive0005: default-empty per-revision/part owner permission + explicit image/PDF bindings + immutable per-user/revision/part/authorization-generation reveal ledger. No sealed content/old attempt updates. Down refuses populated audit/assisted state.
- Verified owner GET/PUT /drafts/[id]/solutions/[partId]/permission, strict revision/version/enable/media/expiry. Whole worked solution + all its images explicitly approved; optional revision solution PDFs gain explicit part binding. Revocation/expiry/unpublish deny future access; delivered content cannot be recalled.
- Verified same-origin POST /[id]/solutions/[partId]/view requires exact current published selection, no prior attempt. Commit/reuse own generation event before returning only solution blocks/approved proxy refs; never keys/hints/other parts. Shared60/min student requests, unchanged submission quotas.
- Dedicated GET /[id]/solutions/[partId]/media/[mediaId]?revision checks own current-generation reveal+live permission/publication/binding on every read; bounded4s/3MiB private Blob buffer, final expiry check, private/no-store/sandbox/nosniff/CORP; no raw URLs. Existing private author proxy unchanged.
- Any own reveal assists all later new attempts on the same revision, including other parts. Same user advisory6 -> parent SHARE -> permission SHARE; author writes parent UPDATE first, no user lock. SQL derives boolean; original attempts/replays unchanged, all grading outcomes preserved. Client accepts server boolean; no UI added.

## Phase6C-B UI
- [Solution UI policy](AUTHORED_SOLUTION_UI.md), components/authoring/solution-permissions.tsx and components/authored/worked-solution.tsx: explicit confirmations, metadata reload after writes, schema/exact URL checks, in-memory private snapshots, controlled downloads, original server-assisted records. Existing backend/idempotency unchanged.
## Verification and later-phase boundaries
- [Security integration](../../lib/author-media-api.test.ts): isolated PostgreSQL schema + memory storage; owner/origin/type/size/scope/quota, failure tombstones, exact sealing, historical retention and publication/link/delete races.
- Commands/results/limitations in status; full tests/typecheck/available checks, inherited blockers separate. Disposable DB+mock storage only; live staging/deployment not claimed.
- Completion phases6C-A/6C-B/7/8A/8B share the same integration branch; separate phase commits/pushes, no resets/overwrites or individual PRs. Consolidated PR at release readiness only. No contests/Elo/rankings/comments/stars/social/subscriptions.
- Playbook model/effort: P0 Sol Medium; P1/2/4/6/8 Sol High; P3/7 Sol Medium; P5 Astra Medium or Sol High. No runtime model switch control exposed.
- Stop after each separately requested phase checkpoint. Preserve prior phase work; handoffs first, affected code only, targeted/broader tests, independent review, handoffs/commit/push. User alone triggers authorized deployment after readiness; no merge/deploy/shared DB changes.
