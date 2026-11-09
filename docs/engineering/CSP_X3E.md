# X3E: detached document coverage

Baseline: main `fa986dbcc69bbce64aa51586f428f04f160d5e50`, reconciled into PR #122 after its X3D head `870f604b915dfdc5756e598bccf23141d7eee1db`. Production remains report-only and enforcement NO-GO. No application, deployed header/middleware, dependency, schema, provider or deployment change.

## Route strategy and cache preservation

| Document | Observed baseline behaviour | Detached policy | Cache after experiment |
| --- | --- | --- | --- |
| `/` | Now dynamic, HTTP 200. Public landing without a session, Lobby with a session. Main superseded the old redirect | Fresh cryptographic request nonce, invariant theme hash | Existing private, no-cache, no-store retained |
| `/_not-found` | Prerendered HTTP 404, exact build HTML | Exact executable-script hashes from trusted build artifact | Existing `s-maxage=31536000` retained |
| `/settings` | Dynamic HTTP 200 account shell | Fresh request nonce and theme hash | Existing private no-store retained |
| `/admin/moderation` | Dynamic HTTP 200, staff content or access message | Fresh request nonce and theme hash | Existing private no-store retained |
| `/admin/verification` | Dynamic HTTP 200, admin content or access message | Fresh request nonce and theme hash | Existing private no-store retained |

Unknown paths and invalid static Learn slugs return the same built 404 bytes, with private no-store. The local test proxy accepts their hash policy only after exact status/body/script-digest verification against `/_not-found`. Changed or private bodies get HTTP 502 and fail qualification. Nothing computes an authorising hash from a response. Unknown HTTP 200 HTML still fails. A trailing-slash redirect is checked independently of its destination document.

Main also introduced dynamic email-change/forgot/reset-password and contest documents, static public problem discovery pages and 130 generated public problem readers. These are explicitly classified. The prerendered contest-management page is a generic build-time shell, with account/data loading in the client. Only its trusted build bytes are hashed. The nonce matcher is narrowed to dynamic dashboard workspaces and skips explicitly enumerated static artifacts. It does not force cached public readers dynamic. Newly added static pages still require review, and missing hashes or dynamic fallback changes still fail.

Inventory: 27 document templates, 150 concrete hashed artifacts, 68 handler contracts, four error boundaries. There are no unclassified documents or source/build drift errors. Build-time and detached prerender sets must match. Handler additions from main are JSON contest APIs, plain-text llms-full and PNG metadata handlers, never HTML exemptions.

## Checks and limits

The existing guarded build, report/enforce browser harness and detached architecture are reused. Document checks verify actual HTTP status/cache/CSP, matching inline nonce/hash attributes, nonce freshness, exact static bytes, unknown 404 handling, redirects, theme bootstrap/hydration, navigation and injected-script rejection. Headers are tested twice per route. Browser coverage adds seven cold-document cases per policy variant and ten synthetic session/denial/error cases per engine, alongside the existing four architecture cases per engine.

Synthetic sessions exist only in a generated auth dependency inside a dedicated temporary detached worktree. The ordinary gate-off path is tested separately. Explicit fixture runtime gates exercise anonymous/unverified staff denial and verified-session database-unavailable states through the real page and API guards. The database remains unreachable in this document harness. Root member/failed-session fallback and client account settings are covered. These fixtures do not qualify real login, staff grants, private evidence, provider operation or every global error boundary.

Focused regressions require each of the five strategies, reject a missing hash, wrong render mode, new unclassified page, stale build ID, changed HTML/script hashes, forged error-body/status exemptions and fixture activation outside its detached directory. Existing X3D checks remain fail-closed.

Local validation: 37 focused tests, typecheck and zero-warning lint pass. Standard suites: 787 server passes, 24 database-dependent skips and one inherited TODO, plus 146 component passes. The separate disposable PG18.6 run passes all 162 database tests. Release-package, mail/storage and operator rejection suites pass 17, 41 and five tests respectively, with package checksums intact. The database and release suites must run sequentially because the release fixture also creates public-schema relations.

Chromium's report/enforce harness passes 18 cases (ten functional successes and eight expected blocks with fallback). The detached run passes 28 Chromium architecture/document cases. Both builds retain 160 prerender entries and 150 verified HTML artifacts. Maximum static header: 4,829 bytes, below the existing 8,192-byte budget. Static comparisons tolerate manifest ordering, never missing routes. Compressed responses are decoded with a size bound for byte/hash verification and served with their existing encoding.

Exact final-head workflow outcomes are recorded in PR #122. GitHub marked the initial follow-up standard/CSP/community jobs failed before any steps, with no logs. The connector cannot read their annotations, so the underlying runner failure is UNKNOWN. Firefox/WebKit executables are absent locally. Browser CDN download and the official Playwright container pull were denied by environment networking. They are not passes. A green inventory or Chromium run is not successful three-engine qualification. No job, engine requirement or safety gate is skipped to obtain green CI.

## Remaining gates and next action

No atomic publication adapter is implemented. Atomic HTML/hash/header/CDN rollout and rollback proof, real disposable provider/all-engine/cloud qualification, privacy-bounded collector changes and operator-owned Production observation evidence remain open. The calendar does not authorise enforcement. Next action is to review this test-only PR and obtain successful standard CI plus all-three-engine qualification on its exact head. Do not merge, deploy or start enforcement from this batch.
