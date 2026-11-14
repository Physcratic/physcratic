# Production runtime role review package

Preparation only. No script is imported by the application or deployment.
`provision.review.sql` contains mutations and requires separate owner approval
of its exact hash, target and role before any live use. CI executes it only in
an isolated synthetic loopback database. Never run it during build/startup.

- [Permission manifest](permissions.json): exact current-feature table/column,
  routine and sequence rights, with source evidence. Future gates stay OFF.
- [Provisioning proposal](provision.review.sql): new LOGIN with NULL password,
  no memberships/ownership, explicit grants only. No shared ACL changes.
- [Read-only metadata verifier](verify.readonly.sql): effective table AND column
  grants, PUBLIC/default ACLs, routines, ownership and membership. Before
  provisioning, only `role_absent` is expected in its final result. Afterward,
  zero final rows are necessary; inventories still need owner review.
- [Real LOGIN identity/TLS SELECTs](identity.readonly.sql): run independently on
  direct and pooled endpoints using the proposed credential, never SET ROLE.
- [Owner cutover and independent rollback](../../docs/engineering/PRODUCTION_RUNTIME_ROLE.md):
  phase boundaries, Windows commands, private evidence and manual acceptance.
- [Focused PG18.7 rehearsal](runtime.pg.test.ts): the new grants and uncovered
  dependencies. Existing B6 and activation suites are reused as evidence.

Verify the manifest's own hash against the independent handoff, then every file,
from a clean LF checkout of the reviewed candidate (`core.autocrlf=false`):

```sh
sha256sum scripts/runtime-role/PACKAGE_SHA256SUMS
sha256sum -c scripts/runtime-role/PACKAGE_SHA256SUMS
```

The PowerShell checksum loop in `scripts/activation/README.md` applies unchanged
after substituting this directory's `PACKAGE_SHA256SUMS`. Do not normalize
reviewed files or regenerate checksums to hide a mismatch.

Only the focused test below is new. Use Node22, existing frozen pnpm10
dependencies, local Docker, and a credential-free shell. The runner supplies
its own guarded loopback URL. Never set a shared/Production URL or clone data.

```sh
AUTHORING_TEST_POSTGRES_IMAGE=postgres:18.7-alpine bash scripts/test-problem-authoring.sh node --require ./tests/server-only-register.cjs --import tsx --test scripts/runtime-role/runtime.pg.test.ts
```

CI runs this in a separate process after the existing activation step, in the
same disposable PG18.7 service job. No new broad QA harness or dependency.
