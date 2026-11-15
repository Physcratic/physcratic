# Authored student interface

Phase7 adds discovery in the existing library's Authored problems collection and
returns readers to `/dashboard?view=problems&collection=authored`. See
[AUTHORED_LIBRARY.md](AUTHORED_LIBRARY.md) for current-only metadata search,
pagination, privacy and noindex policy. Submission and solution behavior below
is unchanged.

Phase6C-B adds separately confirmed worked-solution viewing using Phase6C-A; see [current solution UI policy](AUTHORED_SOLUTION_UI.md). The original Phase6B statement/submission behavior below remains unchanged; its historical no-solution-UI notes describe that phase.

The public route `/dashboard/authored/[problemId]` reads the currently published authored revision. The dashboard prefix permits the existing sign-in return-path policy; it does not impose an authentication layout on this route. Guests can read. Verified Better Auth accounts can submit and read their own history. Published authors can open this route from the author editor. Legacy practice/archive readers and their static answers remain separate.

## Public content and account boundaries

- The reader uses the existing public revision endpoint and allowlisted serializer, ordered native text/KaTeX/math/image blocks and revision-pinned media proxy. Only statement PDFs are linked. No draft, private key, hint, worked solution, solution PDF, raw Blob URL or historical statement fetch is made.
- The small session shell maps Better Auth loading/error/guest/unverified/verified states. Private workspaces mount only for a verified account, keyed by user/problem. Account changes unmount/abort work; generation guards ignore late results. API401/403 also remove cached private views until account recheck, even if the hook is stale.
- Public revision revalidation occurs on focus/visibility and every30s. A changed pointer or POST404/409 hides stale content and requires explicit reload. Background reads cannot cancel an explicit reload or clear its stale latch. New forms bind only the exact loaded immutable revision. Old input is never copied into new revision fields.
- Browser responses are parsed through safe runtime schemas before acknowledgement/rendering. Feedback uses fixed explanations for correct/incorrect/needs-review/ungraded; no internal reason, witness, expected expression or key is rendered. Review can mean unsupported mathematics, not a wrong answer.

## Input and local recovery

Numeric input is decimal/scientific notation converted to the backend's finite binary64 contract. Incomplete/nonfinite input and nonzero values rounding to zero are rejected; signed zero and representable subnormals remain valid. This is transport validation, not client grading. Shared units normalization makes blank and ASCII `1` dimensionless equivalents; no other unit conversion is added. Expression submissions retain the 180-character transport limit and the existing checker. Editable expression drafts may exceed that limit and remain recoverable. Overlength drafts show an associated live validation message and cannot allocate a retry key or send a POST. MathLive restores nonempty drafts. If its import finishes during fallback typing or composition, replacement waits until the whole field loses focus and composition finishes. Numeric and manual controls are unchanged. Manual text explicitly saves ungraded.

Unfinished input is stored in **sessionStorage**, scoped by account+problem and keyed by immutable revision+part. It survives navigation/reload in that browser tab, not browser data removal, tab closure or another device. It contains only the student's own input, retry intent and safe receipts. It is separate from authenticated persistent server history. Local work can be downloaded. The existing serialized recovery budget is 2,000,000 characters. Write or capacity failures retain the latest in-memory input, explicitly warn to download before reloading or leaving, and pause new sends. Expressions are never silently truncated to fit a submission or storage limit. Malformed recovery is preserved for download and pauses sends rather than silently overwriting possible retry identity. No automatic submission occurs on restore.

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


## Solving reliability investigation (15 November 2026)

Baseline: fresh main `bcc132eb44b01d67402910015972b594b08810c2`, preserving the concurrent Studio changes. The existing expression suite passes 47 checks and the published-problem/PostgreSQL browser suite passes. Empty/restored expression fields normally become MathLive editors. Numeric fields and manual text are deliberately different answer modes. A plain expression field after an import failure is an intentional fallback, not a different grading contract.

A new real lazy-chunk/PostgreSQL reproduction finds one concrete availability defect: an import that stays pending never rejects and leaves “Loading math editor…” indefinitely, with no editable fallback. Authored expression fields now opt into a 10-second deadline. If the editor is still pending, the existing plain-expression/LaTeX fallback becomes available. A later import still waits for focus and composition to leave the fallback before mounting. Draft/retry storage, expression limits, submission keys and grading are unchanged. The timer is cancelled on mount, failure and unmount. Other callers, including the official archive reader, omit this optional deadline and retain their existing behavior.

The PostgreSQL browser harness now uses actual lazy ESM chunks and scans every generated JavaScript chunk for private grading sentinels. New desktop/touch cases prove the bounded fallback, plain/LaTeX draft preservation, composition-safe late handover, one editor instance, reload recovery and zero automatic submissions. The expression harness also verifies an explicit fallback submission is accepted exactly once by the existing expression reader/grader. CI includes both suites and triggers when the shared input changes.

### Worked-solution policy and evidence

Existing policy already allows an explicit reveal before submission. The current solution API's 12 disposable-PostgreSQL test groups and the rendered browser suite pass, including text, maths, approved images/PDFs, error handling and assistance recording. No solution service or permission-policy change is needed.

After the owner clarified that OK on the confirmation appears to do nothing in Chrome on Windows, a separate UI reproduction confirmed hidden response feedback. With the View button near the viewport bottom, a successful approved solution starts at 904.39px in an 812px mobile viewport. A denial message starts at 828.39px and ends at 868.39px. Both are outside the viewport and neither receives focus. Existing tests waited for DOM visibility without checking viewport or the desktop sticky rail's clipping.

The solution UI now focuses and scrolls the outcome of an explicit completed reveal into view: the named approved-solution group on success or the existing safe status on denial/error. It does not focus on initial rendering, background revalidation, privacy clearing or cancelled/stale requests. The pending focus is cleared on privacy reset/unmount. New real-PG browser checks cover success and denial at 375px/1440px, account for nested scrolling, retain exact explicit-request counts and prove privacy hiding neither steals focus nor reveals again. This is a response-discoverability fix, not an authorization relaxation. The actual affected Production permission/account state and Windows-device behavior remain unverified.

| State | Existing result |
| --- | --- |
| Verified student, current publication/part, approved unexpired grant | Explicit reveal allowed before or after submission |
| Guest or unverified student | Sign-in/verification required, no private solution |
| No author approval, revoked/expired grant, unpublished problem | Denied without private content |
| Stale revision | Reload required, no retargeted solution |
| Another user's receipt, unapproved/private media or old grant generation | Denied |
| Grade/submission alone | Never reveals or automatically grants permission |

The documented focus/blur/visibility clearing is a privacy safeguard. A native-dialog timing race is a hypothesis, not an observed defect in Chromium, and is not changed. Making all published solutions public, allowing unverified/guest access, auto-approving a new revision or retaining private content across privacy boundaries requires a separate owner policy decision. Current publication does not itself grant solution access. See [solution access](AUTHORED_SOLUTION_ACCESS.md) and [solution UI](AUTHORED_SOLUTION_UI.md).

Actual commands, red/green reproduction, QA counts, independent review, exact head and CI evidence belong to the scoped draft PR. Synthetic APIs use real production factories/grading and disposable PostgreSQL with memory media storage. Real affected user data, physical mobile keyboards, live Better Auth/Blob and non-Chromium behavior are not established. Do not merge or deploy this investigation without owner review. No migration, Production setting, SEO, permission, rating or publication change.
