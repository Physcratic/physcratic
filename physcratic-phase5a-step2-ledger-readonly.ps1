& {
    $ErrorActionPreference = 'Stop'

    $checkout = Read-Host 'Path to the reviewed LF Physcratic checkout'
    $catalogLogin = Read-Host 'Approved direct catalogue LOGIN'
    $approvedVersion = Read-Host 'Owner-approved server_version_num (prior value 180007)'
    $receiptPath = Read-Host 'Path to independent owner-approved receipt CSV, or Enter if unavailable'
    if ([string]::IsNullOrWhiteSpace($catalogLogin) -or $approvedVersion -notmatch '^18[0-9]{4}$') {
        throw 'An approved catalogue LOGIN and exact PostgreSQL version are required.'
    }

    $manifest = Join-Path $checkout 'scripts/production-upgrade/migrations.json'
    $pinnedHash = 'f8c75f4c83797153230d2577e8ab24e0848bb8492321aa1edd2e6ec663b30493'
    if ((Get-FileHash -LiteralPath $manifest -Algorithm SHA256).Hash.ToLowerInvariant() -ne $pinnedHash) {
        throw 'The migration manifest does not match the reviewed LF copy.'
    }
    # A top-level object avoids differences in array enumeration across PowerShell versions.
    $manifestText = Get-Content -Raw -LiteralPath $manifest
    $parsed = ConvertFrom-Json -InputObject ('{"entries":' + $manifestText + '}')
    $baseline = $parsed.entries
    if ($baseline -isnot [array] -or $baseline.Count -ne 18) {
        throw 'The baseline must be an array of 18 migration objects.'
    }
    foreach ($entry in $baseline) {
        if ($entry.id -isnot [string] -or $entry.sha256 -isnot [string] -or $entry.sha256 -cnotmatch '^[0-9a-f]{64}$') {
            throw 'Invalid baseline migration object.'
        }
    }

    # Canonical source hashes establish artifact identity. Owner receipts establish installation provenance.
    $additional = @(
        [pscustomobject]@{ id = '0020_authored_public_solutions'; sha256 = 'e8b034dd0103ce9effc3c898f4f808eedbe2ca859fd7defe476bc098746370b0' }
        [pscustomobject]@{ id = '0021_arena_favourite_key_pattern'; sha256 = 'fdb797a3dcc604055f6a89bd9f27b252a6ef38a1a2887c5f044717d184cb3bc3' }
        [pscustomobject]@{ id = '0022_b1_profile_signup'; sha256 = '7f6c2c7cc180ccf0e4d3599acdd17c95c00ef5493c9456e51a00983d61f2bbc3' }
        [pscustomobject]@{ id = '0024_external_medal_verification'; sha256 = 'd26253767fc8eb9feff4a42a04fc4c3d0f1ff15110e1db002a3742d58e6c87f9' }
    )
    $approvedRecords = @()
    if (-not [string]::IsNullOrWhiteSpace($receiptPath)) {
        $approvedRecords = @(Import-Csv -LiteralPath $receiptPath)
    }
    $receiptFields = @('id', 'sha256', 'source_commit', 'applied_by', 'applied_at_utc', 'result')

    $psql = (Get-Command psql -CommandType Application | Select-Object -First 1).Source
    $connection = "host=ep-snowy-heart-b7c1220y.c-13.us-east-1.aws.neon.tech hostaddr='' port=5432 dbname=neondb sslmode=verify-full gssencmode=disable connect_timeout=5"
    $ledgerSql = @'
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '1s';

SELECT 1 / CASE WHEN current_database() = 'neondb'
  AND session_user = :'catalog_login' AND current_user = session_user
  AND current_setting('server_version_num') = :'approved_version'
  AND current_setting('transaction_read_only') = 'on'
  AND to_regclass('public.physcratic_integration_migrations') IS NULL
  THEN 1 ELSE 0 END AS target_guard \gset

SELECT 'ledger' AS kind, id, sha256, result, source_commit, applied_by,
       to_char(applied_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS applied_at_utc
FROM public.physcratic_production_migrations
UNION ALL
SELECT 'object', c.relname::text, '', '', '', '', ''
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relname ~ '^personal_(problem_completion|completion_write_limit)'
UNION ALL
SELECT 'object', t.typname::text, '', '', '', '', ''
FROM pg_type t
WHERE t.typnamespace = 'public'::regnamespace
  AND t.typname ~ '^_?personal_(problem_completion|completion_write_limit)'
UNION ALL
SELECT 'transport', 'backend_ssl', '',
       coalesce((SELECT ssl::text FROM pg_stat_ssl WHERE pid = pg_backend_pid()), 'unknown'), '', '', ''
ORDER BY 1, 2;

ROLLBACK;
'@
    $psqlArgs = @(
        '-X', '-q', '--csv', '-v', 'ON_ERROR_STOP=1',
        '-d', $connection, '-U', $catalogLogin,
        '-v', "catalog_login=$catalogLogin", '-v', "approved_version=$approvedVersion", '-f', '-'
    )
    $csv = $ledgerSql | & $psql @psqlArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Read-only ledger check stopped (psql exit $LASTEXITCODE)."
    }

    $records = @($csv | ConvertFrom-Csv)
    $ledger = @($records | Where-Object { $_.kind -ceq 'ledger' })
    $transport = @($records | Where-Object { $_.kind -ceq 'transport' -and $_.id -ceq 'backend_ssl' })
    if ($transport.Count -ne 1 -or $transport[0].result -cnotin @('true', 'false', 'unknown')) {
        throw 'Expected one transport result from the audit connection.'
    }

    $expected = $baseline + $additional
    $expectedIds = @($expected | ForEach-Object { $_.id })
    $missing = @(foreach ($entry in $expected) {
        if ($entry.id -cnotin $ledger.id) { $entry.id }
    })
    $duplicate = @($ledger | Group-Object -Property id -CaseSensitive | Where-Object { $_.Count -gt 1 } |
        ForEach-Object { [ordered]@{ Id = $_.Name; RowCount = $_.Count } })
    $checksum = @(foreach ($entry in $expected) {
        $wrong = @($ledger | Where-Object { $_.id -ceq $entry.id -and $_.sha256 -cne $entry.sha256 })
        if ($wrong.Count) { [ordered]@{ Id = $entry.id; MismatchedRows = $wrong.Count } }
    })
    $resultMismatch = @($ledger | Where-Object { $_.result -cne 'verified' } |
        Group-Object -Property id -CaseSensitive |
        ForEach-Object { [ordered]@{ Id = $_.Name; MismatchedRows = $_.Count } })
    $unexpected = @($ledger | Where-Object { $_.id -cnotin $expectedIds } | ForEach-Object { $_.id })

    $receiptReport = @(foreach ($entry in $additional) {
        $installed = @($ledger | Where-Object { $_.id -ceq $entry.id })
        $approved = @($approvedRecords | Where-Object { $_.id -ceq $entry.id })
        $different = @()
        $status = if ($installed.Count -ne 1) { 'ledger_row_not_unique' }
        elseif ($installed[0].sha256 -cne $entry.sha256 -or $installed[0].result -cne 'verified') { 'ledger_content_mismatch' }
        elseif ($approved.Count -eq 0) { 'approval_record_missing' }
        elseif ($approved.Count -gt 1) { 'approval_record_duplicate' }
        elseif ([string]::IsNullOrWhiteSpace($approved[0].approval_reference) -or
            [string]::IsNullOrWhiteSpace($approved[0].applied_by) -or
            $approved[0].source_commit -cnotmatch '^[0-9a-f]{40}$' -or
            $approved[0].applied_at_utc -cnotmatch '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$' -or
            $approved[0].sha256 -cne $entry.sha256 -or $approved[0].result -cne 'verified') { 'approval_record_incomplete_or_invalid' }
        else {
            $different = @($receiptFields | Where-Object { $approved[0].$_ -cne $installed[0].$_ })
            if ($different.Count) { 'approval_record_mismatch' } else { 'matches_owner_record' }
        }
        [ordered]@{ Id = $entry.id; Status = $status; DifferingFields = $different }
    })

    $migration0025 = @($ledger | Where-Object { $_.id -clike '0025*' }).Count
    $collisions = @($records | Where-Object { $_.kind -ceq 'object' }).Count
    $unreconciled = @($receiptReport | Where-Object { $_.Status -cne 'matches_owner_record' })
    $verdict = if ($missing.Count -or $duplicate.Count -or $checksum.Count -or $resultMismatch.Count -or
        $unexpected.Count -or $unreconciled.Count -or $migration0025 -or $collisions) { 'hold' } else { 'passed' }
    [ordered]@{
        ClientTls = 'verify-full'
        BackendSslReported = $transport[0].result
        DatabaseTargetGuard = 'passed'
        BaselineExpectedCount = $baseline.Count
        MissingEntries = $missing
        DuplicateEntries = $duplicate
        ChecksumMismatches = $checksum
        ResultMismatches = $resultMismatch
        UnexpectedEntries = $unexpected
        AdditionalInstallationRecords = $receiptReport
        Migration0025Entries = $migration0025
        CompletionObjectCollisions = $collisions
        LedgerCheck = $verdict
    } | ConvertTo-Json -Depth 6
}
