# Phase6C-B solution controls and explicit viewing

Phase8A completed the previously outstanding independent follow-up of these
controls, protected media, assistance and account/revision races. One Phase7
exact-label filtering finding was fixed; final independent PG33/33 and both
browser suites pass with no remaining confirmed finding. Root's unified
editor-to-student workflow also passes. See [Phase8A](AUTHORING_PHASE8A.md) for
scope/limits and the current build/lint/corpus status; older notes below are
historical.

Phase7 library discovery links into this existing reader; no permission,
confirmation, reveal, media or assistance policy changes. Discovery never
fetches solution permissions or preloads a solution. See
[AUTHORED_LIBRARY.md](AUTHORED_LIBRARY.md).

Continues integration branch from c259602. Reuses0005 and Phase6C-A APIs unchanged; no new backend authorization, ledger, media, grading, quota or migration logic.

Author editor embeds SolutionPermissions, independently of draft autosave. Explicitly load the current public immutable snapshot, choose its part, and GET permission with revision query. Display configured enabled/private/expired state, current permission version, approved IDs and expiry. Labels describe configuration, not a promise of live access. Every enabling operation requires fresh checkbox approval of the complete native solution/image set, individually selected full PDFs and native confirmation. Optional expiry is UTC ISO. PUT uses JSON-only revision and no query string. Both successful acknowledgement and any uncertain/conflicting failure clear metadata; a GET reload is required before another write. No blind retries. Retained loaded snapshots permit historical revocation after unpublication; current-publication enforcement remains server-owned.

Student reader shows View worked solution independently of grading/submission, only in a verified account/current-revision workspace. Every explicit request has a native confirmation explaining revision-wide assistance. No initial/background/poll/grading/prefetch reveal POST exists. The response is parsed with solutionViewSchema, checked for exact requested selection, exact dedicated proxy URL for every approved media item and approved image references. Rendering uses React text, existing trust:false keyboard-scrollable KaTeX and dedicated solution image URLs. PDF downloads use controlled authenticated fetch, bounded expected PDF handling and temporary local download URLs; errors clear private content and report in-page. No generic owner-only media endpoint or raw Blob URL is used.

Content lives only in component memory, never submission recovery storage. Part/revision/account changes unmount it; generation guards ignore late completions. Focus/blur/visibility changes, read/download/image errors, stale/current-publication uncertainty and a five-minute privacy timeout hide the delivered snapshot. No background reveal revalidation is performed. Server authorization applies to each future request; delivered content cannot be recalled, and this UI does not claim instantaneous remote revocation of already-delivered text. Failed/aborted requests may have committed a reveal, which is explained. Retrying is explicit and Phase6C-A reuses its receipt. Record labels show the actual server assisted boolean; no client answer/flag rewrite, including original idempotent retries.

Browser harness exercises actual components and production API/grader factories on disposable PostgreSQL through0005 and memory storage: author enable/revoke, uncertain503 permission write requiring metadata reload, PDF-only approvals, explicit before-submit reveal, original uncertain unassisted submission replay after reveal followed by new assisted submission, private image/math rendering, controlled PDF download/failure, future assisted attempt, multipart navigation, account clearing and publication-change invalidation, zero initial reveal POSTs, key/hint isolation and desktop/mobile axe/overflow. Existing full Phase6B submission retry/recovery/IDOR/pagination cases still run. Authentication is injected; live Better Auth/Vercel/private storage/deployment are not tested.

Independent read-only focused UX/security review found stale live-expiry wording and inadequate plain-link PDF failure handling. Corrected both; followup caught a misplaced download handler, corrected and proven by actual download/failure tests. Reviewer reported no authorization bypass/key leak. Its final followup hit a tool usage limit; final wiring was verified by root inspection, browser tests and TypeScript rather than claiming another completed independent pass.

No individual PR, merge, deployment or production/shared migration. Stop after this phase's separate commit/push; await next separately supplied phase prompt on the SAME integration branch. Inherited corpus assertion, missing ESLint and Google Fonts build blocker remain recorded in status.
