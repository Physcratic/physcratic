# Community launch readiness and operator runbook

Batch 5B is **code readiness only**. Deployment is **PENDING USER ACTION**. No production/shared staging SQL, grants, storage/provider changes, flags or deployment were performed. Passing tests or merging this runbook never authorizes activation.

See [Phase 6A evidence and operator checklist](COMMUNITY_RELEASE_READINESS.md) for VERIFIED/BLOCKED/UNKNOWN status and the approval boundary.

## Current launch decision: NO-GO

The original `communityCommentsEnabled` production lock remains unchanged. Production discussions cannot be activated by setting flags, including when every community flag is true. A separate explicit user-approved launch decision and reviewed code change are required to replace that lock. There is no activation endpoint, implicit date or automatic rollout. Keep discussion flags OFF. The UI gate below does not release the production lock.

Before requesting that decision, the operator must record: exact reviewed deployment SHA, installed migration ledger and grants, private storage verification, synthetic preproduction end-to-end evidence, named primary/backup moderation coverage, approved evidence retention/privacy policy, incident/revocation ownership, load/quota observations and rollback rehearsal. None of those external conditions can be inferred from this repository's CI.

## Schema and least privilege

Inspect the ledger on the explicitly selected target using a direct non-pooled owner connection, a recovery point and the existing migration advisory lock. Never replay installed migrations or schema-push away SQL invariants. Merged 0001–0014 are immutable. For each absent migration, review its complete SQL and checksum from the approved commit, install once in an explicit transaction with `search_path=public,pg_catalog`, bounded lock/statement timeouts, apply its precise grants in that transaction, verify using the non-owner runtime role, then record ID/checksum/source commit/operator/time/result in `physcratic_production_migrations`. Stop and roll back on drift, a timeout or missing prerequisites.

The exact grant statements and transaction/ledger procedure for each batch are retained in [COMMUNITY_STATUS.md](COMMUNITY_STATUS.md). This table is a dependency checklist, not a replacement broad GRANT recipe.

| Migration | Required schema / purpose | Runtime grant boundary |
| --- | --- | --- |
| 0007 community_profile | Better Auth, opt-in profile identity | SELECT, INSERT, narrowly permitted UPDATE plus profile limiter. No auth schema mutation or public email/name copy |
| 0008 community_profile_media | 0007, private image lifecycle | Existing metadata/quota permissions and approved private proxy. No public bucket or broad proof access |
| 0009 community_achievements | authored 0001–0006 + 0007 | Selection/limiter writes, eligibility EXECUTE and existing eligibility read dependencies from COMMUNITY_STATUS.md (including authored attempts). No private answer-key or attempt mutation grants |
| 0010 community_medals | Better Auth; audited staff and claims | Existing claim/limiter and admin-check grants. Runtime cannot assign staff roles or write immutable audit directly |
| 0011 community_medal_showcase | 0009 + 0010 | Validation-function EXECUTE and approved-medal view SELECT must accompany installation, even for earned-only selection writes |
| 0012 community_problem_stats | Better Auth + authored 0001–0006 | Totals SELECT, favourites SELECT/INSERT/DELETE, limiter SELECT/INSERT/UPDATE. Only trusted trigger writes totals |
| 0013 community_comments | Better Auth + authored 0001–0006 | Comments SELECT/INSERT and UPDATE(body,version,deleted_at), reaction/spam grants and limiter. No author/parent/score mutation or comment DELETE/TRUNCATE |
| 0014 community_moderation | 0010 + 0013 | Review/evidence/lock/audit SELECT only; report/appeal SELECT/INSERT only; limiter SELECT/INSERT/UPDATE; only four reviewed helper/decision EXECUTE grants from 5A |

0014 captures existing current comment text into private evidence and holds legacy comments for review, preserving IDs/body/topology. It cannot recover text already erased before installation. Choose a measured maintenance window with adequate storage; timeout/failure must roll back. SQL installation remains safe with discussion exposure disabled. 5B adds **no migration**, table, staff role or runtime grant. Its operator maintenance is deliberately unavailable to the application role.

Verify no inherited/default grants confer ownership, schema CREATE, operator roles, staff writes, direct evidence/audit INSERT/UPDATE/DELETE/TRUNCATE, or direct review/lock/case-decision UPDATE. Check trusted routine search paths and PUBLIC revocations. Preserve existing authoring publication locks and their narrowly scoped `UPDATE(id)` grants. User identifiers in private staff audit do not become public identity fields.

## Storage and external prerequisites

- Profiles with media require the existing private `COMMUNITY_PROFILE_BLOB_STORE_ID`, `community-profile-media/<uuid>.webp` namespace, approved OIDC trust and private proxy authorization. Use the existing upload limits, cleanup/retry state and raster validation; never change bucket visibility.
- Medals require the separate private `COMMUNITY_MEDAL_BLOB_STORE_ID`, `community-medal-proof/<uuid>.pdf` namespace and approved OIDC trust. Validate size/bytes, quotas, failed-upload cleanup, current admin checks and own-claim download/review denial. Moderator status alone never permits certificate access. Do not copy proofs into reports, exports, evidence or logs.
- Reporting/moderation stores plain text in PostgreSQL; it introduces no media bucket, third-party content service or URL fetch. Existing Better Auth verified sessions, origin checks and trusted-edge IP/HMAC secret assumptions remain prerequisites. Unknown IPs share a conservative bucket; do not weaken trusted-header checks to avoid limits.
- Synthetic local storage/browser fixtures do not establish real-provider readiness. The user must separately verify their paid-seat deployment and approved private-store bindings without exposing credentials or user data.

## Gates and staged verification

All gates default OFF. No flag was changed externally by this batch.

| Gate | Dependencies / current effect |
| --- | --- |
| COMMUNITY_PROFILES_ENABLED | 0007 and grants, opt-in visibility |
| COMMUNITY_AUTHORSHIP_ENABLED | Profiles plus 0007; opt-in author attribution in `/api/arena/collection`. Independent of discussion activation |
| COMMUNITY_PROFILE_MEDIA_ENABLED | Profiles plus 0008/private image storage |
| COMMUNITY_ACHIEVEMENTS_ENABLED | Profiles plus 0009; optional medals below |
| COMMUNITY_STAFF_ENABLED | 0010 audited staff authorization; required by moderation and medals |
| COMMUNITY_MEDALS_ENABLED | Staff plus 0010/private PDF storage |
| COMMUNITY_VERIFICATION_UI_ENABLED | Medals + staff; private verification UI |
| COMMUNITY_MEDAL_SHOWCASE_ENABLED | Profiles/achievements/medals/staff + 0011 |
| COMMUNITY_PROBLEM_STATS_ENABLED | 0012; static verified solves remain unavailable |
| COMMUNITY_MODERATION_ENABLED | Staff + 0014, private reports/appeals/staff APIs |
| COMMUNITY_MODERATION_UI_ENABLED | Moderation + staff, dashboard/report/appeal/history UI |
| COMMUNITY_COMMENTS_ENABLED | 0013 + moderation/staff readiness; only development/test/Preview. Production remains unconditionally denied |

1. **Offline/disposable:** frozen install, typecheck/lint/full tests/build, migrations up/down/up on empty disposable PostgreSQL, exact runtime grants, browser reporting/appeal/staff flows, current publication/privacy, account switching, concurrent decisions and private-proof isolation. No shared target is used by these tests.
2. **Separately authorized preproduction:** operator selects disposable resources and synthetic accounts, verifies installed/granted schema and private stores, deploys through their own account, then explicitly selects only required preproduction flags. Verify guest reads, verified writes, held edits, report history, independent appeal release, stale conflict handling, moderator/admin distinctions and revocation. Exercise root/thread locks and a second device/mobile keyboard. Collect bounded timings/quota observations without text/proof/session logs.
3. **Staff rehearsal:** audited operator assigns stable Better Auth IDs through `scripts/community-staff.sql`; no profile or public role API. Provide primary and backup admins so appeals can have an independent reviewer. Moderators can triage/hide/lock, admins restore/reopen/correct/decide appeals. Reviewers cannot act on their own reports/content; appeal reviewer must differ from the original human reviewer. Verify revoke-to-none and fresh-request denial. Document response targets, escalation and absences.
4. **Separate launch decision:** user reviews all evidence, approved retention policy and rollback ownership. If approved, a new scoped change must explicitly design the default-deny production activation mechanism and test staged exposure. This batch leaves the existing lock untouched and does not claim production launch readiness.
5. **User-owned deployment/rollout:** only after that separate approval, the user controls deployment, flags, stage sizes and observation windows. Stop on private-data exposure, authorization failure, absent moderation coverage, quota/storage faults or unexpected errors. CI does not deploy or enable the feature.

## Retention and bounded maintenance

Evidence, moderation audit and submitted case inputs are immutable. Soft deletion removes public text but retains prior evidence for authorized staff. There is **no evidence/case/audit purge** in 5B. Open cases should remain reviewable through their appeal window. A possible 180-day review point after final resolution trades data minimisation against appeal/abuse evidence, but is only a proposal. It cannot be enacted under the current immutable schema without a separately approved privacy/retention design. Audit metadata may need longer accountability retention, while backups need an explicit expiry and restricted restore policy. Account deletion does not guarantee erasure of text evidence or historical actor references. Decision auditing does not establish read-access auditing, which remains an operational decision. A legally/operationally approved retention period, legal-hold exceptions, access review, erasure handling and backup expiry remain launch blockers. Do not disable immutable triggers, run destructive downs or invent a purge to satisfy an individual request. Restrict operator logs and backups, and use a separately reviewed privacy procedure when approved.

Limiter/spam records older than **30 full days** can be removed through the new operator-only utility. It scans at most 200 primary-key ordered rows per invocation under row locks, deletes only expired records among that page, preserves current counters and returns a cursor. It never touches comment text, evidence, audit, reports, appeals, staff or restrictions. Sparse expired rows require a complete cursor sweep and a later restart from the beginning; SKIP LOCKED rows are revisited on that later sweep. There is no automatic scheduler or new runtime DELETE grant.

After separately authorizing maintenance and selecting an explicit direct operator target (never ambient DATABASE_URL), run:

```sh
# Set COMMUNITY_MAINTENANCE_DATABASE_URL through the approved operator secret channel.
# Initial bounded page. No SQL runs during import, build or application startup.
corepack pnpm exec tsx --conditions=react-server scripts/community-moderation-maintenance.ts moderation
```

The fixed areas are `moderation`, `comments`, `content` and `spam`. Repeat only when `next` is non-null, passing its one key as a separately shell-quoted argument; spam has two keys (user ID and body hash). Stop when `next` is null, then sweep other areas separately. Treat returned cursors as private operator data. Record counts/time/target identity without user content or secrets. Four-second statement/two-second lock timeouts roll back that page; the prior committed cursor remains reusable. The tool requires operator DELETE rights that the application intentionally lacks. This batch tests it only on disposable PostgreSQL.

## Policy review and recovery

`community-text-v2` preserves whole-token physics terminology and ordinary “data:” labels; executable data URL types stay held. Hard blocks, conservative uncertain holds, trusted-domain checks and plain-text rendering remain. This local heuristic is not comprehensive multilingual/contextual moderation. Review sampled synthetic false positives, unexpected queue growth and abuse evasions before launch; policy changes require code review/tests and never let a user override a hold. Existing held text is not automatically released after a policy update. Admin approval/appeal correction always targets current content/review versions and remains audited.

For uncertain submissions, retry the same request reference and fixed text or check private history. Duplicate-active/stale decisions return 409: reload, inspect current evidence and decide with its latest version; never blindly retry a staff write. The dashboard prevents actions while older evidence/audit pages are shown. On access loss/session change, private details are disposed; the server independently rechecks every request. Periodic/focus checks bound cached staff display, but revocation cannot retract evidence already seen or copied by an authorized reviewer.

For an incident, separately authorized operators disable exposure first and the user deploys the approved rollback. The existing production lock remains a safeguard, not an incident-response substitute. Keep moderation/evidence available only to current staff if approved for investigation. Revoke staff through audited role-to-none changes, rotate credentials only through the owner process, preserve immutable records and recover from the verified backup when needed. Do not down populated schemas, erase history, reopen locked threads through an appeal, restore soft-deleted text or modify grading/auth to recover community UI. A storage outage must not broaden proof permissions. Decision reasons may be visible to the affected comment author or case submitter. Exclude reporter identities, third-party personal information and private evidence. Record correction reasons; accepted stale appeals are denied and need a new current-content review.
