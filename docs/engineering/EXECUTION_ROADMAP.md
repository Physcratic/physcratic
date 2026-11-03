# Execution roadmap

Baseline: main `ca9eeb79f5621d69d81b8a59a97a0b82892762ce`, verified 3 November 2026. Source: [community guidebook](COMMUNITY_GUIDEBOOK.md); current code and [status](COMMUNITY_STATUS.md) take precedence over stale planning claims.

| Priority | Workstream | State / acceptance |
| --- | --- | --- |
| Complete | Authoring/revisions, student reading/submissions/grading, taxonomy, Learn, P1 | Preserve contracts and regressions |
| Complete | Community 2A/2B1/2B2/3A/3B | PRs #90/#95/#98/#101; code merged, operator deployment/enablement remains unverified |
| Active quality | Persistent agent memory and browser/CSP regression integration | No runtime/schema changes. Validate existing merged 3B in CI; keep local fixtures aligned with unified Arena. [PR #105](https://github.com/Physcratic/physcratic/pull/105), exact delivery in [handoff](AGENT_HANDOFF.md) |
| Next P1 | Threaded discussion (Batch 4) | Bounded depth/pagination, safe content, ownership and withdrawal; default OFF until moderation is ready |
| Next P1 | Moderation/reporting (Batch 5) | Protected queue/audit, reports/filtering/abuse controls and private access tests before discussion exposure |
| Blocked | Community installation/grants/flags/deployment | User/operator only. Merged migrations 0007–0012 immutable; follow existing reviewed status procedures |
| Blocked | CSP provider/adapter/cloud qualification | [X3C](CSP_X3C.md), [provider setup](CSP_PROVIDER_VERIFICATION.md); no real-provider/atomic-header/cloud proof. No active enforcement work |
| Deferred | coaching_inquiry removal, marketplace, rated contests, follows/graphs | No approved implementation scope; retain existing table/data |

Freshly fetch main and check open PRs before a batch, before assigning migration IDs, and before delivery. Concurrent Batch 3B PR #101 superseded alternative PR #102; the latter is closed and must not be cherry-picked. Preserve the merged API, tables, flag and count semantics. Do not rebuild completed features.

Each batch ships a focused reviewed PR with exact-head CI, flag-off compatibility and operator handoff. Successful CI/merge does not establish deployment. Sensitive/deployment-affecting batches need explicit approval; the user owns deployment. Further ideas belong in separate proposals.
