[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('RecordIntent','Arm','Status','Disarm')][string]$Action,
    [Parameter(Mandatory)][ValidatePattern('^[A-Za-z0-9][A-Za-z0-9.-]{0,252}$')][string]$Endpoint,
    [ValidateRange(1,65535)][int]$Port = 5432,
    [Parameter(Mandatory)][ValidatePattern('^[A-Za-z0-9_-]{1,63}$')][string]$Database,
    [Parameter(Mandatory)][ValidatePattern('^[A-Za-z0-9_-]{1,63}$')][string]$Login,
    [Parameter(Mandatory)][ValidatePattern('^[A-Za-z0-9_-]{1,63}$')][string]$Owner,
    [Parameter(Mandatory)][ValidateRange(150000,999999)][int]$ServerVersion,
    [Parameter(Mandatory)][guid]$CaseId,
    [Parameter(Mandatory)][string]$IntentFile,
    [ValidatePattern('^[a-f0-9]{64}$')][string]$IntentSha256
)
$ErrorActionPreference = 'Stop'
$utf8 = [Text.UTF8Encoding]::new($false, $true)
foreach ($name in 'PGSERVICE','PGSERVICEFILE','PGHOSTADDR','PGOPTIONS','PGPASSWORD','PGSSLNEGOTIATION') {
    if (Test-Path -LiteralPath "Env:$name") { throw "Clear $name." }
}
if ($Endpoint -match '(?:^|[.-])pooler(?:[.-]|$)' -or !$env:PGSSLROOTCERT -or
    !(Test-Path -LiteralPath $env:PGSSLROOTCERT -PathType Leaf)) {
    throw 'Use the approved direct endpoint and existing trusted CA.'
}
if ($CaseId -eq [guid]::Empty) { throw 'An exact case reference is required.' }
$psql = (Get-Command psql -CommandType Application).Source
$connection = "host=$Endpoint port=$Port dbname=$Database user=$Login sslmode=verify-full gssencmode=disable connect_timeout=5"
$folder = (Resolve-Path -LiteralPath ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($IntentFile)))).Path
$path = Join-Path $folder ([IO.Path]::GetFileName($IntentFile))

function Invoke-CaseSql([string]$Sql) {
    # All values are either validated identifiers or a hex/UUID/timestamp.
    # Pass the restricted subject through stdin, avoiding process arguments.
    $dbSql = @'
BEGIN;
SET LOCAL search_path = pg_catalog, public, pg_temp;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '10s';
SELECT current_database() = :'expected_database' AND session_user = :'expected_login'
   AND current_user = session_user AND NOT pg_is_in_recovery()
   AND current_setting('server_version_num') = :'expected_version' AS target_ok \gset
\if :target_ok
\else
DO $$ BEGIN RAISE EXCEPTION 'Unexpected target'; END $$;
\endif
SET LOCAL ROLE :"expected_owner";
SELECT current_user = :'expected_owner' AND NOT rolsuper
   AND current_user::regrole = (SELECT proowner FROM pg_proc
      WHERE oid='public.account_deletion_arm(uuid,text,text,text,timestamptz)'::regprocedure) AS owner_ok
FROM pg_roles WHERE rolname=current_user \gset
\if :owner_ok
\else
DO $$ BEGIN RAISE EXCEPTION 'Unexpected erasure owner'; END $$;
\endif
'@
    $expires = if ($record) { ([DateTimeOffset]$record.expiresUtc).UtcDateTime.ToString('yyyy-MM-ddTHH:mm:ssZ') } else { '' }
    $scope = if ($record) { [string]$record.scopeSha256 } else { '' }
    $subject = if ($record) { [string]$record.subject } else { '' }
    $arguments = @('-X','-w','-qAt','-v','ON_ERROR_STOP=1','-d',$connection,
        '-v',"expected_database=$Database",'-v',"expected_login=$Login",'-v',"expected_owner=$Owner",
        '-v',"expected_version=$ServerVersion",'-v',"case_id=$CaseId",'-v',"intent_sha=$IntentSha256",
        '-v',"scope_sha=$scope",'-v',"valid_until=$expires",'-f','-')
    $result = "\set subject '$subject'`n$dbSql`n$Sql`nCOMMIT;`n" | & $psql @arguments
    if ($LASTEXITCODE -ne 0) { throw 'Database outcome unconfirmed. Preserve the intent and reconcile before retrying.' }
    $result
}

function Get-IntentHash([byte[]]$Bytes) {
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try { [BitConverter]::ToString($algorithm.ComputeHash($Bytes)).Replace('-', '').ToLowerInvariant() }
    finally { $algorithm.Dispose() }
}

$record = $null
if ($Action -eq 'RecordIntent') {
    if (Test-Path -LiteralPath $path) { throw 'Use a fresh intent filename in the approved encrypted location.' }
    $snapshot = Invoke-CaseSql "SELECT public.account_deletion_arm_scope(:'case_id'::uuid);"
    $scope = ConvertFrom-Json -InputObject $snapshot
    $verifiedSubject = Read-Host 'Stable subject ID from independently verified authorization'
    if ($verifiedSubject -cne $scope.subject -or $verifiedSubject -cnotmatch '^[A-Za-z0-9_-]{1,128}$') {
        throw 'Verified subject and current request differ.'
    }
    $approval = Read-Host 'Verified authorization evidence reference'
    $disposition = Read-Host 'Reviewed publication, Blob and Tally disposition reference'
    $custody = Read-Host 'Approved independent encrypted custody reference'
    foreach ($value in $approval,$disposition,$custody) {
        if (!$value.Trim() -or $value.Length -gt 256) { throw 'Evidence references are required.' }
    }
    $validUntil = [DateTimeOffset]::ParseExact(
        (Read-Host 'Approval expiry UTC (yyyy-MM-ddTHH:mm:ssZ)'),"yyyy-MM-dd'T'HH:mm:ss'Z'",
        [Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::AssumeUniversal)
    if ($validUntil -le [DateTimeOffset]::UtcNow -or $validUntil -gt [DateTimeOffset]::UtcNow.AddHours(24)) { throw 'Choose an expiry within 24 hours.' }
    $record = [ordered]@{
        kind='account-deletion-arm-intent-v1'; caseId=$CaseId.ToString(); subject=$scope.subject
        endpoint=$Endpoint; port=$Port; database=$Database; owner=$Owner; serverVersion=$ServerVersion
        recordedUtc=[DateTimeOffset]::UtcNow.ToString('o'); expiresUtc=$validUntil.UtcDateTime.ToString('o')
        authorizationRef=$approval; dispositionRef=$disposition; custodyRef=$custody
        scopeSha256=$scope.scopeSha256; scope=$scope.scope
    }
    $bytes = $utf8.GetBytes((ConvertTo-Json -InputObject $record -Depth 16 -Compress) + "`n")
    $stream = [IO.FileStream]::new($path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
    try { $stream.Write($bytes,0,$bytes.Length); $stream.Flush($true) } finally { $stream.Dispose() }
    if ((Get-IntentHash ([IO.File]::ReadAllBytes($path))) -cne (Get-IntentHash $bytes)) { throw 'Intent read-back failed.' }
    Write-Output "ARM_INTENT_RECORDED $(Get-IntentHash $bytes)"
    return
}

if (!$IntentSha256) { throw 'Supply the independently verified intent SHA-256.' }
$bytes = [IO.File]::ReadAllBytes($path)
if ((Get-IntentHash $bytes) -cne $IntentSha256) { throw 'Arm intent digest mismatch.' }
$record = ConvertFrom-Json -InputObject ($utf8.GetString($bytes))
if ($record.kind -cne 'account-deletion-arm-intent-v1' -or $record.caseId -cne $CaseId.ToString() -or
    $record.endpoint -cne $Endpoint -or $record.port -ne $Port -or $record.database -cne $Database -or
    $record.owner -cne $Owner -or $record.serverVersion -ne $ServerVersion -or
    $record.subject -cnotmatch '^[A-Za-z0-9_-]{1,128}$' -or $record.scopeSha256 -cnotmatch '^[a-f0-9]{64}$' -or
    !$record.authorizationRef -or !$record.dispositionRef -or !$record.custodyRef) {
    throw 'Intent and approved target differ.'
}

switch ($Action) {
    'Arm' {
        $confirmation = Read-Host 'Type VERIFIED ARM INTENT after the backup custodian confirms the exact bytes'
        if ($confirmation -cne 'VERIFIED ARM INTENT') { throw 'No database arm attempted.' }
        $snapshot = ConvertFrom-Json -InputObject (Invoke-CaseSql "SELECT public.account_deletion_arm_scope(:'case_id'::uuid);")
        if ($snapshot.subject -cne $record.subject -or $snapshot.scopeSha256 -cne $record.scopeSha256 -or
            (ConvertTo-Json -InputObject $snapshot.scope -Compress -Depth 16) -cne
            (ConvertTo-Json -InputObject $record.scope -Compress -Depth 16)) {
            throw 'Current scope and retained intent differ. No database arm attempted.'
        }
        $id = Invoke-CaseSql "SELECT public.account_deletion_arm(:'case_id'::uuid, :'subject', :'scope_sha', :'intent_sha', :'valid_until'::timestamptz);"
        if ($id -cne $CaseId.ToString()) { throw 'Database arming outcome unconfirmed.' }
        'ARMED'
    }
    'Disarm' {
        $result = Invoke-CaseSql "SELECT public.account_deletion_disarm(:'case_id'::uuid, :'intent_sha');"
        if ($result -cne 't') { throw 'Disarm not confirmed. Check the receipt and preserve the external intent.' }
        'DISARMED'
    }
    'Status' {
        Invoke-CaseSql @'
SELECT CASE
 WHEN EXISTS (SELECT FROM public.account_deletion_receipt_store WHERE id=:'case_id'::uuid AND arm_intent_sha256=:'intent_sha')
   THEN 'ERASURE_RECEIPT_PRESENT'
 WHEN EXISTS (SELECT FROM public.account_deletion_receipt_store WHERE id=:'case_id'::uuid)
   THEN 'DIFFERENT_RECEIPT_INTENT'
 WHEN EXISTS (SELECT FROM public.account_deletion_request WHERE id=:'case_id'::uuid AND arm_intent_sha256=:'intent_sha')
   THEN CASE WHEN EXISTS (SELECT FROM public.account_deletion_request WHERE id=:'case_id'::uuid
       AND armed_until>transaction_timestamp() AND expires_at>transaction_timestamp()) THEN 'ARM_MATCH' ELSE 'ARM_EXPIRED' END
 WHEN EXISTS (SELECT FROM public.account_deletion_request WHERE id=:'case_id'::uuid AND :'intent_sha'=ANY(revoked_arm_intents))
   THEN 'ARM_REVOKED'
 WHEN EXISTS (SELECT FROM public.account_deletion_request WHERE id=:'case_id'::uuid AND arm_intent_sha256 IS NOT NULL)
   THEN 'DIFFERENT_INTENT'
 WHEN EXISTS (SELECT FROM public.account_deletion_request WHERE id=:'case_id'::uuid)
   THEN 'REQUEST_PRESENT_UNARMED'
 ELSE 'OUTCOME_UNKNOWN'
END;
'@
    }
}
