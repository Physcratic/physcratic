# Post-B6 activation review artifacts

No startup, build or deployment imports or executes these files. Nothing here
authorizes Production/shared-staging connections or mutations.0019 is excluded.

- [Batch A owner release sequence](../../docs/engineering/POST_B6_ACTIVATION.md)
- [Permission and runtime-role proposal](../../docs/engineering/B6_RUNTIME_PERMISSIONS.md)
- [Batch B profiles/practice decision](../../docs/engineering/POST_B6_PROFILES_PRACTICE.md)
- [Release-engineer review and remaining gates](../../docs/engineering/POST_B6_RELEASE_REVIEW.md)

`runtime-readonly.sql` is an owner-authorized metadata inspection, with a psql
`runtime_role` variable. It does not infer the application's role or connect for
you. `favourites-grants.review.sql` and `profiles-grants.review.sql` are separately
reviewed transactional deltas, not automatic installers or role bootstraps.
Require actual target, role and file-hash approval before any live execution.

The manifest uses repository-root paths. First independently compare its own
SHA-256 with the review handoff, then verify every listed file. The reviewed Git
candidate binds the whole source tree, including dependencies not repeated in
this focused artifact manifest. Do not substitute unreviewed main or old assets.
Prepare a clean LF checkout with `core.autocrlf=false`. If Windows line-ending
conversion changes hashes, obtain a new clean checkout rather than editing the
manifest or normalizing reviewed files to force a pass.

```sh
sha256sum scripts/activation/PACKAGE_SHA256SUMS
sha256sum -c scripts/activation/PACKAGE_SHA256SUMS
```

PowerShell7, from a clean checkout of the independently reviewed commit:

```powershell
$ExpectedPackage = (Read-Host 'Independently reviewed activation manifest SHA-256').Trim()
if ((Get-FileHash scripts/activation/PACKAGE_SHA256SUMS -Algorithm SHA256).Hash.ToLowerInvariant() -cne $ExpectedPackage) { throw 'Wrong activation package' }
Get-Content scripts/activation/PACKAGE_SHA256SUMS | ForEach-Object {
  $Digest, $Path = $_ -split '\s+', 2
  if ((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() -cne $Digest) { throw "Package file mismatch: $Path" }
}
```

`runtime.pg.test.ts` is an explicit local-only rehearsal. It refuses any root
database URL except loopback `physcratic_authoring_test` without query overrides,
requires PostgreSQL 18.7, creates its own uniquely named database and identities,
and cleans only those resources. It uses synthetic passwords/accounts and actual
route exports, including real Better Auth sessions and LOGIN binding. Run its
documented command only with disposable local PostgreSQL and real service secrets
removed. It stays outside the legacy 18.6 CI database glob and now runs in its
own process/step after the existing operator tests in CI's PostgreSQL18.7 job.
That step also verifies this activation manifest. The existing community browser
job retains statistics coverage and reuses its tooling and isolated PostgreSQL
service for the profile suite's focused `COMMUNITY_PROFILE_ACCOUNT_GUARD_ONLY=1`
mode. No second harness or broad local QA sweep is required.

The new CI browser step sets `COMMUNITY_PROFILE_ACCOUNT_GUARD_ONLY=1` and runs
`node --require ./tests/server-only-register.cjs --import tsx tests/community-profile.browser.mjs`.
It reuses the suite's existing Settings/setup harness once and skips unrelated
media/theme/axe sweeps. The default full profile suite remains available. With
`CHROMIUM_PATH` unset/empty it selects CI's installed Playwright browser; local
runs may explicitly select an installed Chromium via `CHROMIUM_PATH`.
