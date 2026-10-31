# Problem authoring architecture map

Phase 5A from merged main `7335d264b32b9deb2ef2d227764ded3257b94c89` (Phase 4 PR #15; 2026-10-31 Asia/Makassar).
Source: user-supplied PHYSCRATIC_PROBLEM_AUTHORING_CODEX_PLAYBOOK.md. Phases 0–4 merged; Phase 5A adds server-only numeric grading only.
Read this, WORK_STATUS.md and [status](PROBLEM_AUTHORING_STATUS.md) first; inspect affected code/dependencies only.

## Established architecture (reuse; do not repeat audits)
- Next 15.5.28 / React 19 / TypeScript / pnpm; existing Zod, KaTeX, mathjs, Drizzle, Better Auth and Vercel Blob. Phase 5A promotes the already locked tiny Next.js server-only marker to a direct dependency for enforced client-import rejection.
- [Database](../../lib/db/index.ts): PostgreSQL Pool + Drizzle; trusted application role, not standalone RLS. Never expose raw authored/private tables.
- [Schema](../../lib/db/schema.ts): authored tables isolated from user/session, practice_attempt, solution_attempt/evidence, archive and contest contracts.
- Better Auth and [submission adapters](../../lib/submission-server.ts) provide session/configured origin; every author operation explicitly requires emailVerified === true.
- Existing practice/archive/source resolver/grading/auth behavior and intentional signup CAPTCHA removal remain unchanged.
- Existing symbolic worker exposes expected answers for legacy preview only; never reuse it for authored server grading.
- [Migrations](../../migrations/README.md): explicit, additive 0001/0002/0003; SQL authoritative for deferred FKs/triggers. No schema push/startup/build migration.

## Approved document and privacy contracts
- [Contracts](../../lib/problem-authoring.ts): authored problem -> mutable draft -> immutable numbered revision. Stable UUIDs normalized lowercase before validation/persistence.
- Ordered document context/sections/parts; ordered text spans, display/inline math and image blocks. Image = {id,kind:'image',mediaId,alt,caption}; descriptive alt required at publication.
- Attachments = UUID + purpose statement-image/statement-pdf/solution-pdf. Private hint/solution image IDs live only in private parts, never public attachment indexes.
- Provenance = original/authorized + source + rightsDeclaration; incomplete drafts allowed, publication requires meaningful native content, part/key completeness and rights.
- Physically separate PrivatePart {partId,key|null,hints,solution}. Key modes numeric/expression/manual; modes must match relational revision parts.
- Numeric keys finite with nonnegative tolerances; expressions have bounded variables/domains/angles/exclusions. No mathematical grading in Phases 1–4.
- Public mapper explicitly allowlists revision fields, normalizes Drizzle Date to ISO and strips solution-pdf. Serialization does not authorize access.
- Public content never includes keys, hints, worked solutions, private image IDs, solution PDFs or Blob paths/URLs.

## SQL integrity and publication order
- 0001: owner FK; unique draft/problem and revision number; composite same-problem published pointer; exact document/relational part IDs/modes; duplicate IDs rejected.
- Separate private rows and reverse FKs enforce one matching key per revision part. Immutable/sealed child and revision rows cannot be amended later.
- Publication locks problem+draft, checks optimistic version and validates stored document/keys/rights/media.
- Insert revision parts, private keys AND revision media bindings BEFORE final revision sealing insert, then pointer/version updates; commit once before responding.
- No released savepoints: custom deferred PostgreSQL xmin equality checks require all children and revision to share the inserting transaction.
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
- [Client-safe types](../../lib/authored-grading-contracts.ts), [server service](../../lib/authored-grading.ts), [numeric evaluator](../../lib/authored-numeric-grading.ts), [session adapter](../../lib/authored-grading-server.ts). No routes/UI or grading persistence.
- Strict {problemId,revisionId,partId,answer}; UUID lowercase; numeric answer {kind,value,units} requires finite number and explicit units string <=80; expression <=180/manual text <=4000 are bounded transport cases only.
- Output has status correct/incorrect/needs-review/ungraded, fixed reason, engineVersion numeric-v1 and canonical selection (null for invalid input). Never returns key/value/expected units/tolerances/private hints/diagnostics.
- Trusted verified session is injected separately. One indexed SQL snapshot authorizes owner OR currently published problem and joins exact requested problem/revision/part/private key; no draft/public JSON/worker/current-key fallback.
- Verified nonowners may grade explicit historical revisions while problem is published; unpublish blocks them. Owner may grade retained unpublished history; all grading still requires verified email.
- Private schema/part/mode/key mismatches -> needs-review; missing/hidden revision -> ungraded; DB/session failures -> generic needs-review. Client query deadline5s, production pool connection/statement limits retained.
- Numeric policy: |submitted-expected| <= max(absTol,relTol*|expected|), inclusive. absTol/relTol finite/nonnegative from existing private key; no defaults, added epsilon, rounding or sum-of-tolerances.
- Exact dyadic BigInt comparison over stored binary64 values prevents overflow/underflow/rounded-boundary errors; four finite inputs bound integer width <4300 bits. Decimal-looking JSON numbers are binary64, not arbitrary-precision decimal input.
- Units: explicit trimmed case-sensitive labels from the evaluator's closed allowlist; empty string is dimensionless. No conversion/aliases/case or Unicode folding/dimensional algebra. Unknown or mismatched labels -> needs-review, even if values match; absTol is in the exact key unit.
- Manual keys -> ungraded; expression keys or mismatched answer modes -> needs-review. No parsing/eval/symbolic equivalence. Phase 5B can extend the typed dispatch without changing private key selection.
- server-only guards evaluator/service/production adapter; only transport contracts are client-safe. Test command uses --conditions=react-server; default-condition import rejection is independently tested.
- [Numeric properties](../../lib/authored-numeric-grading.test.ts), [service security](../../lib/authored-grading.test.ts), [disposable PostgreSQL](../../lib/authored-grading-db.test.ts): exact oracle, boundaries/extremes, units, isolation, immutable selection, concurrent publication and timeout.

## Verification and later-phase boundaries
- [Security integration](../../lib/author-media-api.test.ts): isolated PostgreSQL schema + memory storage; owner/origin/type/size/scope/quota, failure tombstones, exact sealing, historical retention and publication/link/delete races.
- [Browser](../../tests/problem-authoring.browser.mjs): real editor/API/disposable PG, injected sessions; upload/failed replacement/private preview, gated conflict upload, autosave/recovery, accessibility/mobile.
- Commands/results/limitations in status. Full tests, typecheck, lint/build attempts required; report inherited blockers separately. No production data/migrations/storage calls in tests.
- Phase 5B symbolic equivalence remains separate: restricted AST/resource limits, domain/unit/singularity/angle checks; numerical sampling cannot prove equivalence, indeterminate -> needs-review.
- Phase 6 solver/reveal binds immutable revision+part+user+idempotency; assisted/revealed state; no private keys in HTML/RSC/JSON/worker. Never affect existing Elo.
- Phase 7 social: unique non-self stars, same-problem/depth-bound comments, ownership/tombstones/pagination/private reports. Phase 8 staged end-to-end/release review; main merge auto-deploys.
- Playbook model/effort: P0 Sol Medium; P1/2/4/6/8 Sol High; P3/7 Sol Medium; P5 Astra Medium or Sol High. No runtime model switch control exposed.
- Stop after exactly one phase: fresh merged main, persistent handoffs first, targeted then full checks, independent critic, handoffs/commit/push/PR. No automatic merge/deploy.
