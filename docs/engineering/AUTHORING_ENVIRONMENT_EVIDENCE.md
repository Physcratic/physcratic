# Phase 8B external read-only environment evidence

User supplied the following results of an external connected-account inspection
on2026-10-31 (Asia/Makassar). No variables were decrypted and no infrastructure
or database modifications were made. This agent records that evidence without
claiming direct Vercel/Neon provider access. No secret values are included.

## Confirmed project and deployment mapping

- Team: `neuterions-projects`; project: `financial-dashboard`.
- Project ID: `prj_phm4794zl2QBICu5MMbLFxcHAfFq`; framework: Next.js.
- Connected GitHub repository: `Physcratic/physcratic`.
- READY Preview: `dpl_AMNA9Vhxs7na5RN5ZZAr7MnHYcfv`, branch
  `codex/physcratic-authoring-completion`, SHA
  `71ff793c83c3ab58e4890c4623815052a061eeb8`.
- READY Production: `dpl_FKdnftiM54PyU6dsccG7gwCMnpeK`, branch `main`, SHA
  `c2139de0953714b9ea5c0b8578734bb3ab852da1`.
- `physcratic.com`: attached to this project, no branch-specific mapping.
- `staging.physcratic.com`: mapped to `codex/auth-hardening`, **not** the
  authoring-completion branch. Do not use it as the authoring staging target.

The repository mapping is confirmed. The historical reason for the project name
and intended role of the additional `physcratic` project seen in GitHub statuses
remain unknown. Preview build readiness does not establish runtime isolation.
These deployment SHAs do not cover later Phase8B commits.

## Variable metadata — names, scope and presence only

P/P/D below means Production, Preview and Development. A common entry is not
proof of safe isolation; no decrypted connection/store/secret value comparison
was performed. No authoring-completion-specific override was found.

| Name | Existing metadata | Authoring-completion observation |
| --- | --- | --- |
| DATABASE_URL | one P/P/D entry; separate Preview override for codex/auth-hardening | no branch override; target DB/branch/role and isolation unverified |
| BLOB_READ_WRITE_TOKEN | one P/P/D entry | no branch override; private store ID/isolation unverified |
| BETTER_AUTH_SECRET | one P/P/D entry; separate Preview override for codex/auth-hardening | no branch override; isolated auth secret not established |
| BETTER_AUTH_URL | branch-specific Preview entry for codex/auth-hardening | no general or authoring-completion entry found; effective fallback/origin unverified |
| RESEND_API_KEY, RESEND_EMAIL_DOMAIN | P/P/D entries; separate Preview overrides for codex/auth-hardening | no branch overrides; live delivery/identity unverified |
| STAGING_VERIFICATION_EMAIL_ALLOWLIST | general Preview entry and separate codex/auth-hardening override | general Preview entry present; values/effectiveness not inspected |
| NEXT_PUBLIC_SITE_URL | Production-only entry | no Preview entry found; canonical fallback needs review |

Platform origin fallback values/callback URLs and effective build/runtime
configuration for the final authoring artifact remain unverified. An email
allowlist is not evidence of DB/Blob isolation. Do not copy the auth-hardening
configuration or assume its resources are appropriate for authoring.

## Neon inventory — available resources, not proven connections

| Project | Project ID | Branch | Branch ID | Database |
| --- | --- | --- | --- | --- |
| neon-indigo-dog | divine-mode-82940461 | main | br-quiet-dawn-b7m2zrt3 | neondb |
| neon-indigo-dog | divine-mode-82940461 | physcratic-staging | br-lingering-heart-b7gda0w4 | neondb |
| neon-indigo-dog | divine-mode-82940461 | physcratic-integration | br-solitary-thunder-b7h5q79t | neondb |
| physcratic-staging | wild-water-97019860 | main | br-hidden-surf-b7rb5nw6 | neondb |

Which branch/endpoint/role the Vercel authoring Preview actually uses is UNKNOWN.
No branch is approved as the target merely because its name says staging or
integration. Remote schema, migration ledger, backups and application state are
UNKNOWN. No shared database query or migration was performed by this agent.

## CI evidence closed for the audited handoff

For exact SHA `f87679244a877963c583ad650da30fdee9222f55`:

- PR run: https://github.com/Physcratic/physcratic/actions/runs/41210409141 — SUCCESS.
- Push run: https://github.com/Physcratic/physcratic/actions/runs/41210403475 — SUCCESS.

This agent independently fetched jobs124564096504 and124564062309: install,
types, lint, full unit/PostgreSQL tests and production build all succeeded.
Both checkout logs contain the exact SHA. The remote-CI gate for f876792 is
satisfied; neither result proves live auth, Blob behavior or target isolation.
Any later documentation-only evidence commit has its own CI status, not silently
covered by these runs. Runtime/product code is unchanged by this evidence update.

## Current execution prohibition

Do not run live account/mail tests, migrations, uploads, cleanup or other writes
against the current Preview. Required next action is authorized read-only target,
resource and effective-origin verification. Configuration changes/provisioning
and subsequent staging writes require separate authorization; none was requested
or performed here. Keep real Better Auth and private Blob validation as later
separate gates after isolation is established.
