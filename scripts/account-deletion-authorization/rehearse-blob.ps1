[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$NativeCheckout,
    [Parameter(Mandatory)][string]$NativeRunner
)
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath $NativeCheckout).Path
$runner = (Resolve-Path -LiteralPath $NativeRunner).Path
$helper = Join-Path $PSScriptRoot 'prepare-blob-fixture.mjs'
$root = Join-Path $env:LOCALAPPDATA 'Physcratic-Phase5B-Blob'
$data = Join-Path $root 'data'
if (Test-Path -LiteralPath $root) { throw 'Preserve the existing fixture. Do not rerun against it.' }
$head = & git -C $repo rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $head -cnotin @(
    '02f09e0ce449c96d4da0d9dc36b27c3455db7766',
    'd0293333a56ce126982de5ac220a6730a6a64e69'
)) { throw 'Use the original native-kit checkout at its existing reviewed commit.' }
$changes = & git -C $repo status --porcelain
if ($LASTEXITCODE -ne 0 -or $changes -or (Get-ChildItem -LiteralPath $repo -Force -File |
    Where-Object { $_.Name -match '^\.env(?:$|\.)' -and $_.Name -ne '.env.example' })) {
    throw 'Use the clean native checkout without local environment files.'
}
foreach ($name in 'PHASE5B_BLOB_TOKEN','PHASE5B_BLOB_OIDC_TOKEN','VERCEL_BLOB_RETRIES',
    'VERCEL_OIDC_TOKEN','BLOB_READ_WRITE_TOKEN','BLOB_STORE_ID','NODE_OPTIONS') {
    if (Test-Path -LiteralPath "Env:$name") { throw "Open a fresh shell without $name." }
}
if ($env:VERCEL_ENV -eq 'production' -or $env:VERCEL_TARGET_ENV -eq 'production' -or
    $env:NODE_TLS_REJECT_UNAUTHORIZED -eq '0') { throw 'A clean nonproduction shell with TLS verification is required.' }
$node = (Get-Command node -CommandType Application | Select-Object -First 1).Source
$approval = Read-Host 'Type PREVIEW ONLY after confirming private store and included usage headroom'
if ($approval -cne 'PREVIEW ONLY') { throw 'Store and included usage have not been confirmed.' }
$secret = Read-Host 'Existing read-write token for physcratic-authoring-staging' -AsSecureString
$app = $null
$info = $null
try {
    $token = [System.Net.NetworkCredential]::new('', $secret).Password
    if ($token -cnotmatch '\Avercel_blob_rw_3XHvtHs2UM4ZFD5d_[A-Za-z0-9_-]+\z') {
        throw 'Token does not match the approved staging store.'
    }
    & $runner -Action Prepare -Repo $repo -ClusterRoot $root -Port 55440 -AppPort 3318
    $env:PHASE5B_BLOB_TOKEN = $token
    $env:VERCEL_BLOB_RETRIES = '0'
    & $node $helper $root prepare
    if ($LASTEXITCODE -ne 0) { throw 'Preparation unconfirmed. Preserve the private evidence.' }

    $state = Get-Content -LiteralPath (Join-Path $root 'fixture-state.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    if ([IO.Path]::GetFullPath($state.data) -cne $data -or
        [IO.Path]::GetFullPath($state.repo) -cne $repo -or
        $state.port -ne 55440 -or $state.appPort -ne 3318 -or $state.withCompletions) { throw 'Wrong local fixture.' }
    foreach ($key in 'runtime','eraser','operator','auth') {
        if ($state.secrets.$key -cnotmatch '\A[a-f0-9]{64}\z') { throw 'Malformed local fixture.' }
    }
    $info = [Diagnostics.ProcessStartInfo]::new()
    $info.FileName = $node
    $info.Arguments = 'node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3318'
    $info.WorkingDirectory = $repo
    $info.UseShellExecute = $false
    foreach ($name in @($info.EnvironmentVariables.Keys)) {
        if ($name -notmatch '^(Path|SystemRoot|WinDir|ComSpec|PathExt|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|ProgramFiles(?:\(x86\))?|ProgramData)$') {
            $info.EnvironmentVariables.Remove($name)
        }
    }
    $local = '@127.0.0.1:55440/physcratic_authoring_test'
    $info.EnvironmentVariables['DATABASE_URL'] = "postgresql://phase5b_runtime:$($state.secrets.runtime)$local"
    $info.EnvironmentVariables['ACCOUNT_DELETION_DATABASE_URL'] = "postgresql://phase5b_eraser:$($state.secrets.eraser)$local"
    $info.EnvironmentVariables['ACCOUNT_DELETION_OPERATOR_DATABASE_URL'] = "postgresql://phase5b_operator:$($state.secrets.operator)$local"
    $info.EnvironmentVariables['BETTER_AUTH_SECRET'] = $state.secrets.auth
    $info.EnvironmentVariables['BETTER_AUTH_URL'] = 'http://127.0.0.1:3318'
    $info.EnvironmentVariables['ACCOUNT_DELETION_ENABLED'] = 'true'
    $info.EnvironmentVariables['AUTH_EMAIL_TRANSPORT'] = 'memory'
    $info.EnvironmentVariables['NEXT_TELEMETRY_DISABLED'] = '1'
    $info.EnvironmentVariables['VERCEL_BLOB_RETRIES'] = '0'
    # The pinned app uses the standard SDK variable in its isolated child.
    $info.EnvironmentVariables['BLOB_READ_WRITE_TOKEN'] = $token
    Remove-Variable token
    $app = [Diagnostics.Process]::Start($info)
    $info.EnvironmentVariables.Remove('BLOB_READ_WRITE_TOKEN')

    $ready = $false
    $deadline = [DateTime]::UtcNow.AddSeconds(60)
    while (!$ready -and [DateTime]::UtcNow -lt $deadline) {
        if ($app.HasExited) { throw 'The loopback app exited.' }
        $socket = [Net.Sockets.TcpClient]::new()
        try {
            $socket.Connect('127.0.0.1', 3318)
            $ready = $true
        } catch [Net.Sockets.SocketException] {
            Start-Sleep -Milliseconds 300
        } finally { $socket.Dispose() }
    }
    if (!$ready -or $app.HasExited) { throw 'The local app did not become ready.' }
    foreach ($step in 'proxy-before','probe','proxy-after') {
        & $node $helper $root $step
        if ($LASTEXITCODE -ne 0) { throw "Stopped at $step. Preserve the fixture. Do not repeat provider writes." }
    }
    'BLOB_REHEARSAL_PASSED'
} finally {
    if ($info) { $info.EnvironmentVariables.Remove('BLOB_READ_WRITE_TOKEN') }
    Remove-Item Env:PHASE5B_BLOB_TOKEN,Env:VERCEL_BLOB_RETRIES -ErrorAction SilentlyContinue
    Remove-Variable token -ErrorAction SilentlyContinue
    $secret.Dispose()
    if ($app -and !$app.HasExited) {
        & "$env:SystemRoot\System32\taskkill.exe" /PID $app.Id /T /F | Out-Null
        if ($LASTEXITCODE -ne 0 -and !$app.HasExited) { Write-Warning 'Stop the reported local Next.js process before leaving this shell.' }
    }
    if ($app) { $app.Dispose() }
}
