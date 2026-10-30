# Problem authoring architecture map

Phase 0 inventory at `80bef237f7c187b74ce83316f3dda780dae42792` (2026-10-31, Asia/Makassar).
Source: user-supplied PHYSCRATIC_PROBLEM_AUTHORING_CODEX_PLAYBOOK.md; this is a contract, not implemented code.
Read this and [status](PROBLEM_AUTHORING_STATUS.md) before each phase; inspect only affected code/dependencies.

## Verified current architecture
- [package.json](../../package.json): Next 15.5.28, React 19, TypeScript, pnpm lockfile; Zod, KaTeX, mathjs, Drizzle, Better Auth, Blob installed in manifest.
- [schema](../../lib/db/schema.ts): user/session/account/verification; solution_attempt, solution_evidence, practice_attempt; contest/contest_registration/contest_rating; archive_progress.
- No authored-problem, revision, grading-key, star or comment tables in this schema.
- [DB](../../lib/db/index.ts): PostgreSQL Pool + Drizzle; DATABASE_URL, max 5 connections, statement/transaction timeouts.
- No tracked SQL migrations, Drizzle config/migration command, ESLint config or GitHub workflows found.
- [auth](../../lib/auth.ts): Better Auth email/password, email verification required for login, terms hooks, trusted origins and auth rate limits.
- [submission helpers](../../lib/submission-server.ts): session lookup and configured-origin checks; no explicit emailVerified guard.
- [security](../../lib/submission-security.ts), [request limits](../../lib/submission-request.ts): origin allowlist, media signatures, bounded request parsing.
- [static model](../../lib/physics.ts): Problem with numeric answer, hint, solution and example Elo; not authored content.
- [practice route](../../app/dashboard/problems/[id]/page.tsx) loads static problems into ProblemReader.
- [practice grading](../../lib/practice.ts), [progress API](../../app/api/progress/route.ts): server computes static numeric correctness; user-scoped attempts, idempotency and daily limits.
- [submissions API](../../app/api/submissions/route.ts): official source/version validation, ownership of evidence, user-scoped history, idempotency, awaiting-reference only.
- [source resolver](../../lib/submission-source.ts) is the archive boundary; preserve its callers/contracts.
- [symbolic math](../../lib/symbolic-math.ts): restricted AST, sqrt only, symbolicEqual/rationalize; no general trig/domain-safe server grading.
- [worker](../../lib/symbolic-worker.ts) and [answer UI](../../components/physics/symbolic-answer.tsx) receive expected key in browser: preview only, never authored grading.
- [working editor](../../components/physics/math-working-editor.tsx), [LaTeX](../../lib/latex-working.ts): existing plaintext/equation preview; no block authoring composer.
- [upload](../../app/api/solution-evidence/route.ts): session/origin checks, bounded multipart, MIME/signature, UUID paths, SHA256, DB quota reservation, private Blob, failure cleanup.
- [download](../../app/api/solution-evidence/[id]/route.ts): user-owned DB lookup before private Blob read, attachment, no-store/nosniff.
- Existing upload endpoints do not explicitly check emailVerified; private solver evidence must not become public author media.

## Proposed minimal typed contract (Phase 1; names provisional)
- UUID and ISODate below denote validated strings; all document payloads use strict, bounded Zod discriminated unions.
- Problem: {id: UUID, slug: string, ownerId: UserId, state: 'draft'|'published'|'archived', publishedRevisionId: UUID|null, createdAt, updatedAt}.
- Draft: {problemId: UUID, version: integer, content: Document, privateParts: PrivatePart[], updatedAt}; compare-and-swap version on save.
- Revision: {id: UUID, problemId: UUID, number: integer, schemaVersion: 1, content: Document, publishedAt}; immutable after publication.
- Document: {title: string, topicTags: string[], methodTags: string[], estimatedDifficulty: string|null, context: Block[], sections: Section[], provenance: Provenance, attachments: MediaRef[]}.
- Section: {id: UUID, title: string, blocks: Block[], parts: Part[]}; ordered arrays, globally unique nested IDs per document.
- Part: {id: UUID, label: string, blocks: Block[], answerMode: 'numeric'|'expression'|'manual'}; no expected answers/tolerances/domains here.
- Inline: {kind:'text', text:string}|{kind:'math', latex:string}; no raw HTML.
- Block: {id:UUID} & ({kind:'text', spans:Inline[]}|{kind:'math', latex:string}|{kind:'image', mediaId:UUID, alt:string, caption:string}).
- MediaRef: {id:UUID, purpose:'statement-image'|'statement-pdf'|'solution-pdf'}; URLs/access are server-derived, never trusted client ownership claims.
- Provenance: {kind:'original'|'authorized', source:string, rightsDeclaration:string}; incomplete drafts allowed, publication requires rights.
- PrivatePart: {partId:UUID, key:Key, hints:Block[], solution:Block[]}; physically separate from public statement JSON, keyed by draft/revision + part.
- Key = {kind:'numeric', value:number, units:string, absTol:number, relTol:number} | {kind:'expression', expected:string, variables:Variable[], angleUnit:'radians'|'degrees', exclusions:string[]} | {kind:'manual'}.
- Variable: {name:string, domain:'real', min?:number, max?:number, assumptions:('positive'|'nonnegative'|'nonzero')[]}; explicit supported-domain validation.
- Numeric values/tolerances finite; tolerances nonnegative; units separate; expression size/AST/power/domain/resource limits mandatory.
- Published solutions are a separate immutable revision-bound projection served only through intentional solution access; drafts remain private.
- Add normalized authored_problem, authored_draft, authored_revision, authored_private_part and author_media tables; exact SQL reviewed in Phase 1.
- FK owner -> user; draft unique problem; revision unique(problemId, number) and unique(problemId, id); composite FK ensures published pointer belongs to problem.
- Separate private draft/revision key storage or enforce exactly-one parent; unique(parent, partId), no orphan keys, no public SELECT * mapping.
- Persist revision-bound part identity for submission FKs; Zod validates cross-document IDs, block order and key/mode alignment transactionally.
- Authored attempts/reveals are separate from old attempts; bind user + immutable revision + part + idempotency; record assisted/revealed-before-submit.
- Star: separate table unique(problemId,userId), no self-star; server derives count. Comment: separate table with parentId, authorId, tombstone/hidden state.
- Parent comment must belong to same problem; bound depth, stable pagination; reports private. No staff powers without existing authorization model.

## Trust boundary and permissions
- Public: allowlisted statement serializer for published revisions only; no private key, draft solution, private media, attempt history or sampling seeds.
- Owner: verified server-session user may create/save/publish/archive own content and access own keys; reject client owner/user/count fields.
- Other verified users: grade published revision, reveal allowed published solution, comment and toggle star; prevent self-star.
- Anonymous/unverified: allowed public reading only; all new writes require explicit user.emailVerified === true (not medal flair).
- New writes: configured origin, payload limits, ownership, rate limits, idempotency where applicable; transactional optimistic concurrency/publish.
- Server-only grader loads keys; parser preview receives submitted expression only. Results: accepted/incorrect/needs-review/ungraded.
- Numerical sampling finds counterexamples, never proves equivalence; sqrt(x^2) != x over unrestricted reals; define units, singularities and angle convention.
- Practice reveal before submission is allowed; persist assisted state. Never update existing ratings/Elo from authored attempts.
- Reuse existing libraries; Tiptap/dnd-kit evaluation belongs to Phase 3, no new dependencies in Phase 0.

## Migration and release strategy
- Additive migrations/contracts only; preserve auth, archive, practice and existing IDs/data contracts; no mass rewrite or production DB access.
- Phase 1 must establish reproducible reviewed SQL/migration bookkeeping because no runner exists; do not assume drizzle-kit installed.
- Verify up/down on disposable PostgreSQL, FK/unique/check constraints and serializer tests before migration approval; no production migration here.
- Publication transaction freezes revision + private content + media bindings atomically; updates fork drafts, never mutate old revision/attempt references.
- Rollback application exposure first; retain historical revisions/attempts; destructive down migration only on disposable DB before user data exists.
- No merge/deploy. README says merging main automatically deploys; prepare manual Vercel release/rollback gates in Phase 8.

## Acceptance/test plan (future implementation, not passing tests)
- Phase 1: malformed/bounded contracts, unique block/part IDs, FK/revision consistency, no private keys in public projection.
- Phase 2: anonymous/unverified/cross-owner denial, guessed draft/key IDs, stale/concurrent save conflict, rights/meaningful statement/part/key/media publication checks.
- Phase 3: exact multi-section/block/math round-trip; keyboard/mobile reorder, autosave conflict/error/recovery and XSS-safe preview.
- Phase 4: cross-owner media refs, MIME mismatch/magic bytes/size/quota, stale/orphan assets, private solution/draft leak denial.
- Phase 5: equivalent fractions/signs/trig, canonical g*sin(3*theta)^(1/2), explicit * and suggestion for sin(3 theta); domain/zero/units/tolerance edges, malicious AST/DoS; indeterminate -> needs-review.
- Phase 6: second verified solver, all four grade statuses, retry/version integrity, solution reveal/assisted history and no keys in HTML/RSC/JSON/worker bundles.
- Phase 7: concurrent one-star toggle/count, no self-star, reply ownership/same-problem parent/depth, deletion tombstone, pagination and hidden reports.
- Phase 8: full author->publish->solver->reveal->social->new revision flow; old revisions preserved; regression checks for corpus/practice/auth; staging browser/security/math/accessibility review.
- Existing targeted baseline: pnpm exec tsx --test lib/{practice,symbolic-math,submission-security,submission-request,solution-grading,latex-working}.test.ts.
- Required checks: pnpm test; pnpm exec tsc --noEmit; pnpm lint; pnpm build. Actual outcomes are in status, never infer passes.
- Each phase: fresh merged main, read these files + WORK_STATUS.md, verify HEAD/concurrent branches, targeted tests then project checks, critical second pass, update handoffs, commit/push/draft PR, stop.
- Playbook model/effort: P0 Sol Medium; P1/2/4/6/8 Sol High; P3/7 Sol Medium; P5 Astra Medium or Sol High. No runtime model switch control was exposed in this session.
