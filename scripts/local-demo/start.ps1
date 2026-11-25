$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '../..'))
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker Desktop is required for the local demo database. Install and start it, then run this script again.'
}
if (Test-Path '.env.local') { throw 'Use a clean worktree without .env.local for this demo.' }
docker --context default compose -f scripts/local-demo/compose.yaml up -d --wait
if ($LASTEXITCODE -ne 0) { throw 'The local PostgreSQL container could not start.' }
pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
node scripts/local-demo/setup.mjs
if ($LASTEXITCODE -ne 0) { throw 'Demo database setup failed.' }
node scripts/local-demo/serve.mjs
