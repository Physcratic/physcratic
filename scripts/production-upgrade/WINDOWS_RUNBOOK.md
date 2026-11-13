# B6 Windows runbook: PostgreSQL 18.7 update

Apply these corrections to the owner-controlled Windows runbook before continuing.
No new window, firewall action or migration execution is authorized here.

1. Keep Windows PowerShell 7, Node22, pnpm10.34.9, direct TLS verification,
   private evidence storage and hidden `Read-Host -AsSecureString` URL entry.
   Never put the URL in a command, file, transcript or shell history.
2. Obtain the new reviewed candidate and package SHA-256 from this compatibility
   PR. The original `a3036ff1744c6a99d96e4ffb091879f115416294` and package
   `39ef06c7b5df3967089e5f37394d0052f1185103fc8475fd84b1d6dcb8ebb653`
   identify the superseded 18.6 release. Do not reuse them for 18.7 execution.
   In the existing clean LF checkout, use these nonsecret values:

```powershell
$Candidate = (Read-Host 'New explicitly reviewed candidate SHA from compatibility PR').Trim()
$Package = (Read-Host 'New reviewed package SHA-256 from compatibility PR').Trim()
if ($Candidate -cnotmatch '^[a-f0-9]{40}$') { throw 'Invalid candidate' }
if ($Package -cnotmatch '^[a-f0-9]{64}$') { throw 'Invalid package digest' }
git fetch origin
if ($LASTEXITCODE -ne 0) { throw 'Fetch failed' }
git checkout --detach $Candidate
if ($LASTEXITCODE -ne 0) { throw 'Checkout failed' }
if ((git rev-parse HEAD) -cne $Candidate) { throw 'Wrong candidate' }
if (git status --porcelain) { throw 'Dirty checkout' }
if ((Get-FileHash scripts/production-upgrade/PACKAGE_SHA256SUMS -Algorithm SHA256).Hash.ToLowerInvariant() -cne $Package) { throw 'Package mismatch' }
$env:B6_CANDIDATE = $Candidate
$env:B6_PACKAGE = $Package
```

3. Rerun the existing package integrity check and read-only identity collector
   from the new checkout. Archive earlier evidence and use new private output
   paths. The collector imports the reviewed B6 helpers and now requires
   **180007 / PostgreSQL18.7**. Do not change the legacy helper's 180006 checks:
   B6 imports its URL/TLS transport, not its legacy snapshot or executor.
4. Keep the exact Neon project/branch/endpoint/database/role. Retain the separate
   console evidence of project/branch binding. Both maintenance rules stay Log
   until an explicitly opened owner-authorized window: Production
   `rule_b6_maintenance_hold_6TpahO`, Integration
   `rule_b6_integration_maintenance_hold_sI1uqr`.
5. At the separately approved window, preserve the writer/DDL hold and one fresh
   recovery point. Capture current held baseline hashes. Copy the updated
   `approval-template.json` to a new private approval file with target.version
   **180007**, new candidate, actual evidence references and actual UTC times.
   Do not reuse an old approval hash, alter timestamps to bypass expiry or invent
   evidence. The maximum window/recovery-attestation age remains 30 minutes.
6. **STOP for separate explicit owner approval of the final approval-file SHA-256.**
   Only afterward use the unchanged `--inspect-reviewed-window` and
   `--execute-reviewed-window` commands with the new candidate/package and exact
   approved file/hash. Use distinct new private evidence directories.

Scope stays 0007–0015,0017,0018. Never replay0016 or install0019. Keep all feature,
deployment, grant and credential controls unchanged. Require independent
postcommit verification before releasing the hold. After any attempted execution
with uncertain outcome, stop and independently inspect; never retry blindly.
