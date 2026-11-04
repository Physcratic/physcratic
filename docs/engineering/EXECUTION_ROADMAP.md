# Execution roadmap

Baseline: main `9367d8769e474707b3aa76c2921813b14aac58b1`, verified 4 November 2026. Source: [community guidebook](COMMUNITY_GUIDEBOOK.md); current code and [status](COMMUNITY_STATUS.md) take precedence over stale planning claims.

| Priority | Workstream | State / acceptance |
| --- | --- | --- |
| Complete | Authoring/revisions, student reading/submissions/grading, taxonomy, Learn, P1 | Preserve contracts and regressions |
| Complete | Community 2A/2B1/2B2/3A/3B | PRs #90/#95/#98/#101; code merged, operator deployment/enablement remains unverified |
| Complete, production locked | Threaded discussion (Batch 4) | [PR #106](https://github.com/Physcratic/physcratic/pull/106), merge `a01836e71521ffbb4686f9b360e355c47fdd2a50`. Threads, reactions, owned edits, soft deletion and abuse controls. Default OFF and production-locked until Batch 5 |
| Integration | Persistent agent memory and browser/CSP regression infrastructure | [PR #105](https://github.com/Physcratic/physcratic/pull/105), reconciled with Batch 4 without runtime/schema changes. CI triggers include shared source/fixtures, migrations, dependency manifests and build configuration. Merge authorised after exact-head workflows pass, then stop |
| Next P1, fresh session only | Moderation/reporting (Batch 5) | Protected queue/audit, reports/filtering/abuse controls, retention/evidence policy and private access tests. Review launch protections separately; no automatic discussion enablement |
| Blocked | Community installation/grants/flags/deployment | User/operator only. Merged migrations 0001–0013 immutable; follow existing reviewed status procedures |
| Blocked | CSP provider/adapter/cloud qualification | [X3C](CSP_X3C.md), [provider setup](CSP_PROVIDER_VERIFICATION.md); no real-provider/atomic-header/cloud proof. Report-only NO-GO, no active enforcement work |
| Deferred | coaching_inquiry removal, marketplace, rated contests, follows/graphs | No approved implementation scope; retain existing table/data |

Freshly fetch main and check open PRs before a batch, before assigning migration IDs, and before delivery. Batch 3B PR #101 superseded alternative PR #102; the latter is closed and must not be cherry-picked. Preserve the merged API, tables, flags and count semantics. Do not rebuild completed Batches 3B or 4, edit migration 0013 or remove the discussion production lock.

Successful CI/merge does not establish deployment or authorise SQL/grants/flags. The explicit authorisation for this session is PR #105 integration and merge only, followed by a stop. Batch 5 belongs in a fresh Codex session.
