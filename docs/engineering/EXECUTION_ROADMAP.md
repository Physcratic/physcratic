# Execution roadmap

Baseline: main `0f2c7f4`, verified 3 November 2026. Source: [community guidebook](COMMUNITY_GUIDEBOOK.md); code and [status](COMMUNITY_STATUS.md) take precedence over stale planning claims.

| Priority | Workstream | State / acceptance |
| --- | --- | --- |
| Complete | Authoring/revisions, student reading/submissions/grading, taxonomy, Learn, P1 | Preserve contracts; existing regression suites |
| Complete | Community 2A/2B1/2B2/3A | PRs #90/#95/#98 and historical status; flags remain disabled, deployment/operator prerequisites unverified |
| Review P1 | Batch 3B favourites and truthful completion counts | Implemented, independently reviewed and locally verified; PR/CI state in [handoff](AGENT_HANDOFF.md). Valid public namespaced identities, verified idempotent writes, shared quota, bounded batched counts, current-revision independent completion proof, gated API/UI, retries/privacy/races tested |
| Next P2 | Threaded discussion (Batch 4) | Only after 3B review; bounded depth, safe content, pagination/ownership. Default OFF until moderation exists |
| Next P2 | Moderation/reporting (Batch 5) | Protected queue/audit, filters, reports and abuse controls; approved moderation semantics and private access tests before exposure |
| Blocked | Community installation/grants/flags/deployment | User/operator only; migrations 0007–0011 remain immutable. New 3B migration 0012 needs separate review/operator action |
| Blocked | CSP provider/adapter/cloud qualification | [X3C](CSP_X3C.md), [provider setup](CSP_PROVIDER_VERIFICATION.md); no credentials, atomic publication proof or cloud qualification. No active enforcement work |
| Deferred | coaching_inquiry removal, marketplace, rated contests, follows/graphs | No approved implementation scope; retain existing table/data |

Each batch ships a focused reviewed PR with exact-head CI, flag-off compatibility and operator handoff. Successful CI/merge does not establish deployment. Sensitive batches remain unmerged pending explicit approval. Further ideas belong in a separate proposal, not this implementation loop.
