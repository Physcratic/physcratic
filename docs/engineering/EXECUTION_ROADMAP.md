# Execution roadmap

X3E review candidate (9 November 2026): test-only follow-up in PR #122 closes the five X3D inventory gaps and reconciles current-main routes. See CSP_X3E.md and the PR's exact-head checks for runtime qualification and environment blockers. No deployed policy change, merge or enforcement is authorised. Next milestone is reviewed standard/all-engine qualification, not automatic enforcement.

Baseline: main `a4a75c292fc0a9d6392e25f92818e454d6ffb4eb`, verified 4 November 2026. Source: [community guidebook](COMMUNITY_GUIDEBOOK.md); current code and [status](COMMUNITY_STATUS.md) take precedence over stale planning claims.

| Priority | Workstream | State / acceptance |
| --- | --- | --- |
| Complete | Authoring/revisions, student reading/submissions/grading, taxonomy, Learn, P1 | Preserve contracts and regressions |
| Complete | Community 2A/2B1/2B2/3A/3B | PRs #90/#95/#98/#101; code merged, operator deployment/enablement remains unverified |
| Complete, production locked | Threaded discussion (Batch 4) | [PR #106](https://github.com/Physcratic/physcratic/pull/106), merge `a01836e71521ffbb4686f9b360e355c47fdd2a50`. Threads, reactions, owned edits, soft deletion and abuse controls. Default OFF and production-locked until Batch 5 |
| Complete | Persistent agent memory and browser/CSP regression infrastructure | [PR #105](https://github.com/Physcratic/physcratic/pull/105), reconciled with Batch 4 without runtime/schema changes. CI triggers include shared source/fixtures, migrations, dependency manifests and build configuration. Merge authorised after exact-head workflows pass, then stop |
| Complete, production locked | Moderation backend (Batch 5A) | [PR #109](https://github.com/Physcratic/physcratic/pull/109), merge `a9bff60a1ad7ab408875d3e06b432d5a1cf21925`, exact-head CI #190 and browser #3 green. Reports, staff decisions, evidence/audit, create/edit policy, locks and appeals. See [status](COMMUNITY_STATUS.md). Production lock intact; no SQL or feature enablement |
| Complete, production locked | Moderation dashboard/integration (Batch 5B) | [PR #112](https://github.com/Physcratic/physcratic/pull/112), merge `cded70fa4174acd0f79512ced7ae4d5fa73da9f8`, exact-head CI #193 and browser #4 green. Dashboard, reports/history/appeals, bounded operator maintenance and launch runbook. Default-off UI, original production lock intact. See COMMUNITY_STATUS.md |
| Complete, production locked | Batch 5B completion | [PR #115](https://github.com/Physcratic/physcratic/pull/115), merge `4b4e0d7bd4f63f59b6078334456e7523ac6b4403`, approved head `5946de97823c139b934ffba96b1eedcf0d2f6d5b`, exact-head CI #197/browser #6 green. Fixed-intent confirmation, numeric audit pagination and expanded integration tests. Explicit user merge approval received. See current handoff |
| Complete, operator installation pending | Security S1 | [PR #119](https://github.com/Physcratic/physcratic/pull/119), merge `a988056a157171db5f77e8470683fedc1cceb1e2`, exact-head CI #207/browser #7 green. Additive 0015 privileged medal routine hardening, policy v3 confusable/domain holds, exploit and compatibility regressions. No launch or production operation |
| Separate explicit user decision required | Operational launch review | Approved retention/privacy policy, private providers, staffing, load/staged verification and a reviewed production activation design. Current launch NO-GO |
| Blocked | Community installation/grants/flags/deployment | User/operator only. Merged migrations 0001–0014 immutable; follow existing reviewed status procedures |
| Blocked | CSP provider/adapter/cloud qualification | [X3C](CSP_X3C.md), [provider setup](CSP_PROVIDER_VERIFICATION.md); no real-provider/atomic-header/cloud proof. Report-only NO-GO, no active enforcement work |
| Deferred | coaching_inquiry removal, marketplace, rated contests, follows/graphs | No approved implementation scope; retain existing table/data |

Freshly fetch main and check open PRs before a batch, before assigning migration IDs, and before delivery. Batch 3B PR #101 superseded alternative PR #102; the latter is closed and must not be cherry-picked. Preserve the merged API, tables, flags and count semantics. Do not rebuild completed Batches 3B or 4, edit migration 0013 or remove the discussion production lock.

Successful CI/merge does not establish deployment or authorise SQL/grants/flags. The current session authorises only Batch 5B implementation/PR/merge after green checks, followed by a stop. No deployment or production activation is authorized. PR #105 integration is complete.

Batch 5B completion follows independently merged PR #112 without duplicating its UI and is now integrated through [PR #115](https://github.com/Physcratic/physcratic/pull/115). Stop after merge verification and this documentation-only handoff. Exact next milestone: a separately authorised operator readiness review. Production launch remains NO-GO with the original lock, operator prerequisites and separate approval unchanged.

Current authorization: Security S1 remediation/PR/merge after exact-head green checks, then stop. Existing production discussion lock remains intact; installation/activation is separate user/operator work.

Phase 6A: documentation-only release audit complete. See COMMUNITY_RELEASE_READINESS.md for evidence states and approvals. Exact next phase: operator-authorised read-only inventory and isolated preproduction rehearsal (Phase 6B). Launch remains NO-GO; no Production action is authorised by this checklist.
