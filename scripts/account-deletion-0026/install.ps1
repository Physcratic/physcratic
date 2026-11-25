[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('Inspect','Install','Verify')][string]$Action,
    [Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{40}$')][string]$PackageCommit,
    [Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{64}$')][string]$ManifestSha256,
    [Parameter(Mandatory)][string]$Plan,
    [Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{64}$')][string]$PlanSha256
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$manifest = Join-Path $PSScriptRoot 'PACKAGE_SHA256SUMS'
$canonical = 'migrations/0026_account_deletion_blockers.up.sql'
$canonicalSha = '3b904c1eb01fc75e5446744acc90474cdbe4aba62c6dffc95b9f7c35bfc6c78a'
$manifestPaths = @(
    $canonical,
    'scripts/account-deletion-0026/install.ps1',
    'scripts/account-deletion-0026/operate.sql',
    'scripts/account-deletion-0026/approval-template.json',
    'scripts/account-deletion-0026/rehearse-local.sh',
    'scripts/account-deletion-0026/sdk-probe.mjs',
    'scripts/account-deletion-0026/README.md'
)

function Get-ByteSha256([byte[]]$Bytes) {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($sha.ComputeHash($Bytes)).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
}

$actualCommit = & git -C $root rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $actualCommit -cne $PackageCommit) { throw 'Wrong package checkout.' }
$changes = & git -C $root status --porcelain
if ($LASTEXITCODE -ne 0 -or $changes) { throw 'Use a clean checkout. Keep the private plan outside it.' }
$utf8 = [Text.UTF8Encoding]::new($false, $true)
$manifestBytes = [IO.File]::ReadAllBytes($manifest)
if ((Get-ByteSha256 $manifestBytes) -cne $ManifestSha256) { throw 'Package manifest checksum mismatch.' }
$verified = @{}
foreach ($line in ($utf8.GetString($manifestBytes).TrimEnd("`n") -split "`n")) {
    if ($line -cnotmatch '^([a-f0-9]{64})  (.+)$') { throw 'Invalid manifest row.' }
    $digest, $path = $Matches[1], $Matches[2]
    if ($path -cnotin $manifestPaths -or $verified.ContainsKey($path)) { throw 'Unexpected or duplicate manifest path.' }
    $bytes = [IO.File]::ReadAllBytes((Join-Path $root $path))
    if ((Get-ByteSha256 $bytes) -cne $digest) { throw "Package file checksum mismatch: $path" }
    $verified[$path] = $bytes
}
if ($verified.Count -ne $manifestPaths.Count) { throw 'Incomplete manifest.' }
if ((Get-ByteSha256 $verified[$canonical]) -cne $canonicalSha) { throw 'Canonical 0026 checksum mismatch.' }

$planPath = (Resolve-Path -LiteralPath $Plan).Path
$planBytes = [IO.File]::ReadAllBytes($planPath)
if ((Get-ByteSha256 $planBytes) -cne $PlanSha256) { throw 'Private plan checksum mismatch.' }
$target = ConvertFrom-Json -InputObject ($utf8.GetString($planBytes).TrimStart([char]0xFEFF))
foreach ($property in @('database','loginRole','migrationOwner','runtimeRole')) {
    if ($target.$property -cnotmatch '^[A-Za-z0-9_-]{1,63}$') { throw "Invalid $property." }
}
if ($target.endpoint -cnotmatch '^[A-Za-z0-9][A-Za-z0-9.-]{0,252}$' -or $target.endpoint -match '(?:^|[.-])pooler(?:[.-]|$)') {
    throw 'Use the approved direct hostname.'
}
if ([string]$target.port -notmatch '^[0-9]{1,5}$' -or $target.port -lt 1 -or $target.port -gt 65535) { throw 'Invalid endpoint port.' }
if ([string]$target.serverVersion -notmatch '^[0-9]{6}$') { throw 'Invalid server_version_num.' }
foreach ($property in @('providerProject','providerBranch','endpointEvidence')) {
    if ($target.$property -isnot [string] -or -not $target.$property.Trim()) { throw "Missing $property." }
}
if ($target.loginRole -ceq $target.runtimeRole -or $target.migrationOwner -ceq $target.runtimeRole) {
    throw 'The migration identities and runtime LOGIN must be separate.'
}

if ($Action -ne 'Inspect') {
    foreach ($property in @('ledgerSha256','inventorySha256')) {
        if ($target.$property -cnotmatch '^[a-f0-9]{64}$') { throw "Invalid $property. Run Inspect and review the baseline." }
    }
}
$windowEndSql = ''
if ($Action -eq 'Install') {
    foreach ($property in @('ownerApproval','recoveryEvidence','writerFenceEvidence','servingConfigEvidence')) {
        if ($target.$property -isnot [string] -or -not $target.$property.Trim()) { throw "Missing $property." }
    }
    if ($target.deletionOff -isnot [bool] -or -not $target.deletionOff -or
        $target.singleAttemptServing -isnot [bool] -or -not $target.singleAttemptServing) {
        throw 'Owner must attest deletion OFF and the serving single-attempt configuration.'
    }
    if ($target.windowEndsUtc -is [datetime]) {
        $windowEnd = [DateTimeOffset]$target.windowEndsUtc
    } else {
        $windowEnd = [DateTimeOffset]::ParseExact($target.windowEndsUtc, "yyyy-MM-dd'T'HH:mm:ss'Z'",
            [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal)
    }
    if ($windowEnd -le [DateTimeOffset]::UtcNow) { throw 'Approved installation window has ended.' }
    $windowEndSql = $windowEnd.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture)
}

foreach ($variable in @('PGSERVICE','PGSERVICEFILE','PGHOSTADDR','PGOPTIONS','PGPASSWORD')) {
    if ([Environment]::GetEnvironmentVariable($variable)) { throw "Clear $variable before running this package." }
}
if ($env:PGSSLMODE -cne 'verify-full' -or -not $env:PGSSLROOTCERT -or
    -not (Test-Path -LiteralPath $env:PGSSLROOTCERT -PathType Leaf)) {
    throw 'Set PGSSLMODE=verify-full and an approved PGSSLROOTCERT file.'
}
$psql = (Get-Command psql -CommandType Application).Source

$sql = $utf8.GetString($verified['scripts/account-deletion-0026/operate.sql'])
$up = $utf8.GetString($verified[$canonical])
$wrapper = [regex]::Match($up, '\ABEGIN;\n(?<body>[\s\S]*)\nCOMMIT;\n\z')
$marker = '-- INSERT VERIFIED 0026 TRANSACTION BODY HERE'
if (-not $wrapper.Success -or [regex]::Matches($sql, [regex]::Escape($marker)).Count -ne 1) {
    throw 'Unexpected canonical migration wrapper or package marker.'
}
# Remove exactly the first BEGIN and last COMMIT after verifying the original bytes.
# operate.sql alone owns the transaction that also includes the grant and ledger.
$body = if ($Action -eq 'Install') { $wrapper.Groups['body'].Value } else { '' }
$assembled = $sql.Replace($marker, $body)
$temp = [IO.Path]::GetTempFileName()
$previousConnectTimeout = $env:PGCONNECT_TIMEOUT
try {
    $env:PGCONNECT_TIMEOUT = '5'
    [IO.File]::WriteAllText($temp, $assembled, $utf8)
    $arguments = @('-X','--no-password','--set=ON_ERROR_STOP=1',"--file=$temp",
        "--host=$($target.endpoint)","--port=$($target.port)","--dbname=$($target.database)","--username=$($target.loginRole)",
        "--set=install=$($Action -eq 'Install')","--set=verify=$($Action -eq 'Verify')",
        "--set=expected_database=$($target.database)","--set=expected_login=$($target.loginRole)",
        "--set=migration_owner=$($target.migrationOwner)","--set=runtime_role=$($target.runtimeRole)",
        "--set=expected_version=$($target.serverVersion)","--set=expected_ledger=$($target.ledgerSha256)",
        "--set=expected_inventory=$($target.inventorySha256)","--set=migration_sha=$canonicalSha",
        "--set=window_ends=$windowEndSql")
    & $psql @arguments
    if ($LASTEXITCODE -ne 0) { throw "psql exited with status $LASTEXITCODE. Inspect the target independently before any retry." }
} finally {
    $env:PGCONNECT_TIMEOUT = $previousConnectTimeout
    Remove-Item -LiteralPath $temp -Force
}
