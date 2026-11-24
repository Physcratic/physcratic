# Externally verified medals

Students submit certificates in Tally. The owner reviews them there, maps each submission to a Physcratic account and records the verified award through a trusted database connection. Physcratic stores the award, a private submission reference, and the award and revocation audit. It stores no certificate or certificate URL. Tally submissions and their retention are managed separately by the owner.

## Operator setup

Use PowerShell with PostgreSQL `psql` 15 or newer on PATH, from this repository. Configure a direct, individually attributable owner login through an approved libpq service (`PGSERVICE`, optionally `PGSERVICEFILE`) or `PGHOST`, `PGDATABASE` and `PGUSER` (`PGPORT` if needed). Use TLS with `PGSSLMODE=verify-full` and the provider’s trusted CA bundle via `PGSSLROOTCERT` where required, or the equivalent settings in the service. Use the approved secret channel or libpq password file. Keep operator credentials out of the application, command arguments and logs.

```powershell
# Find the account, existing awards and their private audit.
.\scripts\external-medals\medal.ps1 -Action lookup -Email 'student@example.invalid'
.\scripts\external-medals\medal.ps1 -Action lookup -Handle 'student_handle'

# Award a reviewed medal. If supplied together, email and handle must match.
.\scripts\external-medals\medal.ps1 -Action award -Email 'student@example.invalid' -Handle 'student_handle' `
  -Competition IPhO -Award gold -Year 2025 -Country ID -TallyReference 'REVIEWED_SUBMISSION_ID'

.\scripts\external-medals\medal.ps1 -Action award -Handle 'student_handle' -Competition National `
  -Award silver -Year 2025 -Country ID -CompetitionName 'National competition name' -TallyReference 'ANOTHER_SUBMISSION_ID'

# Copy the bare UUID from lookup. Confirm its recipient again.
.\scripts\external-medals\medal.ps1 -Action revoke -Handle 'student_handle' -MedalId '<UUID from lookup>'
```

The command displays the target database, operator, account and proposed award or revocation before a write. Check that the account belongs to the reviewed submission and enter `yes` to proceed. The write and audit commit together. Lookup is read-only and lists up to 100 awards for that account.

Competitions are `IPhO`, `APhO`, `EuPhO` and `National`. Awards are `gold`, `silver`, `bronze` and `honourable-mention`. Years run from 1959 through the current UTC year. National awards require a two-letter country code and a competition name. Paste only the Tally submission ID (1–100 letters, digits, underscores or hyphens). The same reference and exact award return the original medal ID on retry. Reusing that reference for different details or another account fails. An active medal or internal claim already in the same account and competition/year slot blocks a new award. National slots also include country and case-insensitive competition name.

Repeated revocation succeeds without another audit row. Revocation removes the badge from live displays and stops it being selected. The private audit and a previously selected, now dormant badge ID are retained. A revoked reference cannot reactivate the award. An independently reviewed replacement needs its own submission reference. Account deletion erases the external award and audit with the account and its showcase. It generates no certificate cleanup job.

## Activation and grants

Review migration 0024 against these SHA-256 checksums.

| File | SHA-256 |
| --- | --- |
| Up | `d26253767fc8eb9feff4a42a04fc4c3d0f1ff15110e1db002a3742d58e6c87f9` |
| Down | `600800963056bc5c02d1473fbee4fdee8efa5b42f3ebef4ad4e841d27698abdc` |

1. Keep `COMMUNITY_EXTERNAL_MEDALS_ENABLED` unset until the owner separately approves installation and activation. Verify the existing migration ledger including 0007, 0009–0011, 0015 and the account deletion schema (0018). Follow the [migration procedure](../../migrations/README.md) using the reviewed 0024 file, expected checksum, recovery point, timeouts and advisory lock. Confirm the existing badge guard owner can read the trusted badge sources. Verify installation and grants with a real restricted runtime login before recording the migration and committing.
2. The only extra application grant is the projection below. Keep existing schema USAGE, public-profile reads, `SELECT, INSERT, UPDATE` on the badge-selection and write-limiter tables and `EXECUTE` on `community_showcase_ids_valid(text[])`. Arena attribution also uses its existing authored-library grants. Check effective permissions, including PUBLIC, inherited and default-owner grants. Runtime must have no access to the two private tables, no execute on the operator functions, no projection writes, no schema CREATE and no membership of the operator or owner role.

   ```sql
   GRANT SELECT ON public.community_external_approved_medal TO :"runtime_role";
   ```

3. After separately approved synthetic rehearsal, the owner can enable `COMMUNITY_PROFILES_ENABLED` and `COMMUNITY_EXTERNAL_MEDALS_ENABLED`. `COMMUNITY_AUTHORSHIP_ENABLED` controls Arena attribution independently. An optional `COMMUNITY_MEDAL_TALLY_URL` must be an HTTPS `https://tally.so/r/<form-id>` URL with no extra path, query or fragment. No URL is configured by this change.
4. Keep `COMMUNITY_MEDALS_ENABLED`, `COMMUNITY_VERIFICATION_UI_ENABLED` and `COMMUNITY_MEDAL_SHOWCASE_ENABLED` off. External badges need neither `COMMUNITY_STAFF_ENABLED` nor `COMMUNITY_ACHIEVEMENTS_ENABLED`. The external gate excludes the internal certificate routes. Keep legacy claims, proofs, audit and selections intact.
5. To roll back exposure, disable `COMMUNITY_EXTERNAL_MEDALS_ENABLED` through the owner’s release process. Preserve awards and selections. The down migration is for empty disposable databases and refuses to remove either active or revoked records.
