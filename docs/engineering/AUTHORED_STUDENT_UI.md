# Authored student interface

Phase6C-B adds separately confirmed worked-solution viewing using Phase6C-A; see [current solution UI policy](AUTHORED_SOLUTION_UI.md). The original Phase6B statement/submission behavior below remains unchanged; its historical no-solution-UI notes describe that phase.

The public route `/dashboard/authored/[problemId]` reads the currently published authored revision. The dashboard prefix permits the existing sign-in return-path policy; it does not impose an authentication layout on this route. Guests can read. Verified Better Auth accounts can submit and read their own history. Published authors can open this route from the author editor. Legacy practice/archive readers and their static answers remain separate.

## Public content and account boundaries

- The reader uses the existing public revision endpoint and allowlisted serializer, ordered native text/KaTeX/math/image blocks and revision-pinned media proxy. Only statement PDFs are linked. No draft, private key, hint, worked solution, solution PDF, raw Blob URL or historical statement fetch is made.
- The small session shell maps Better Auth loading/error/guest/unverified/verified states. Private workspaces mount only for a verified account, keyed by user/problem. Account changes unmount/abort work; generation guards ignore late results. API401/403 also remove cached private views until account recheck, even if the hook is stale.
- Public revision revalidation occurs on focus/visibility and every30s. A changed pointer or POST404/409 hides stale content and requires explicit reload. Background reads cannot cancel an explicit reload or clear its stale latch. New forms bind only the exact loaded immutable revision. Old input is never copied into new revision fields.
- Browser responses are parsed through safe runtime schemas before acknowledgement/rendering. Feedback uses fixed explanations for correct/incorrect/needs-review/ungraded; no internal reason, witness, expected expression or key is rendered. Review can mean unsupported mathematics, not a wrong answer.

## Input and local recovery

Numeric input is decimal/scientific notation converted to the backend's finite binary64 contract. Incomplete/nonfinite input and nonzero values rounding to zero are rejected; signed zero and representable subnormals remain valid. This is transport validation, not client grading. Shared units normalization makes blank and ASCII `1` dimensionless equivalents; no other unit conversion is added. Expression input is opaque bounded plain text with guidance matching SYMBOLIC_GRADING_POLICY.md. Manual text explicitly saves ungraded.

Unfinished input is stored in **sessionStorage**, scoped by account+problem and keyed by immutable revision+part. It survives navigation/reload in that browser tab, not browser data removal, tab closure or another device. It contains only the student's own input, retry intent and safe receipts. It is separate from authenticated persistent server history. Local work can be downloaded; write failures retain in-memory input and pause new sends. Malformed recovery is preserved for download and pauses sends rather than silently overwriting possible retry identity. No automatic submission occurs on restore.

## Intended submission state machine

1. Explicit submit validates input and allocates a cryptographic UUID. The exact normalized payload, original editable source and key are durably recorded together **before** any network send. If storage fails, no POST occurs.
2. One unresolved intent per account/problem pauses new submissions. Its selected input is locked; other local part buffers remain separate. Synchronous guards prevent double-click/concurrent sends. Reload restores the same intent without POSTing.
3. Network/timeout/408/429/5xx and auth failures retain the exact original body/key. Only an explicit retry sends it again. `Retry-After` produces a countdown; temporary request/day limits are described without a lifetime cap. Chromium can transparently retry HTTP408 itself; every wire attempt still carries the same key/body.
4. A validated matching success atomically replaces pending intent with a safe receipt in one storage write. If acknowledgement storage fails, keep the original intent for idempotent replay. The receipt disables a fast second submit, including after reload; **Start another attempt** is a separate explicit new-intent action.
5. A definitive400/404/409/413 rejection remains visible until explicitly closed, retaining its original revision and local buffer. A stale current revision requires public reload before a new intent. An older pending committed attempt can be recovered after publication changes through Phase6A's replay-first contract; it is never retargeted or regraded.

All reads and writes have a15s browser deadline combined with caller cancellation. Abort on account unmount does not assume server rollback; recovery retains the original key. No browser worker/equivalence engine, endpoint, migration, grading math, attempt quota, reveal or auth/media policy change is introduced.

## History and presentation

Own history uses the existing problem-scoped50-row keyset API, Previous/Next and explicit refresh/retry. Every record displays its own selection IDs, submitted answer, status and timestamp. Only records matching the currently visible revision use current part labels. Historical selections never fetch withdrawn content. After success, invalidate/refetch page one and its cursor together; local prepending/truncating against an old cursor would skip a record and is prohibited.

Desktop has a statement column and sticky answer card; mobile stacks them with part jump/focus controls. Long formulas scroll within keyboard-focusable regions with visible focus and safe KaTeX rendering. Labels, status/error announcements, semantic headings, keyboard controls and own-history focus transitions are explicit. No heavy editor dependency or animation is added.

## Verification and limits

- Model tests: `node_modules/.bin/tsx --conditions=react-server --test lib/authored-student.test.ts`.
- Rendered browser+real production API/grader+PG: `AUTHORING_BROWSER_TOOLS=/path/to/test-tooling scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server tests/authored-student.browser.mjs`. External tooling must provide Playwright and @axe-core/playwright; CHROMIUM_PATH optionally selects Chromium. Existing project esbuild/Tailwind/KaTeX are reused. Storage is isolated memory only.
- Browser coverage includes guests/unverified accounts, all answer modes, math/media, multipart focus, input recovery, lost committed response/reload/replay, duplicate guards, HTTP faults/read errors,50+ history with submission/cursor reset, IDOR/account switch, stale/reload/focus race, unpublish, private isolation, desktop/mobile axe, keyboard scrolling and375px overflow.
- API auth sessions are injected into the production factories; the production Better Auth shell/Next route are typechecked/read-reviewed. Live Better Auth/Vercel staging, real Blob and a production build remain outside this harness. See status for inherited check blockers. No production services/data/migrations are used.
- `no-reveal-v1` continues to prevent automatic disclosure after submission/grading. A separately authorized future explicit worked-solution feature remains possible; none is implemented here. No comments/stars/social/Elo changes.
