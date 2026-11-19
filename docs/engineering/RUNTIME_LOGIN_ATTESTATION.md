# Temporary serving LOGIN assertion

The Phase C cutover needs evidence from the serving application pool. Neon
pooler connection logs identify PgBouncer, and the available log fields and
Vercel invocation metadata do not join a request to an authenticated PostgreSQL
role. A tagged active backend can disappear when its transaction ends. The
owner's pooled LOGIN checks already qualify the credentials. Migration 0021 and
the corrected ACL were separately verified.

The draft restores the probe removed by PR204 with two narrower gates. Only an
approved guest GET to the existing unfiltered Arena collection route can
schedule it. The owner signs the actual Vercel deployment ID after assignment,
so another deployment of the same SHA cannot accept the same request approval.
The runtime checks the exact approved SHA, Production environment and strict
UTC window. Without valid configuration the route keeps its ordinary behavior.

Next.js `after()` runs the probe in that invocation after the response. It takes
one connection from the ordinary app pool, with the existing 5s acquisition
cap. It uses one read-only transaction with a 1s local statement timeout and
a 1s client deadline for the batch. The fixed query checks the exact LOGIN,
unassumed effective role and database using three booleans. A failed probe
discards its connection. One signed request can schedule at most one probe per
pool instance, including failures. During the observation there may be an
additional reserved connection competing for a pool slot.

The log record contains only event name `runtime_login_attestation`, version
2, run ID, provider deployment ID, SHA, UTC time and `verified`, `mismatch` or
`unavailable`. The request key, approval header, SQL results, raw DB identities
and exceptions stay out of application logs and HTTP responses. The header is
a short-lived capability for the probe. Keep it out of command arguments,
history, transcripts, request-log capture and shared artifacts.

## Owner procedure

1. Obtain approval of the exact release SHA, Production binding change, temporary
   configuration, one guest request, private logs, observation budget and removal.
   Confirm the existing pooled host and `verify-full` settings, preserve Batch A
   and the other gates, and retain the prior READY owner-bound deployment and
   recoverable saved binding. Verify that runtime system variables expose
   `VERCEL_ENV`, full `VERCEL_GIT_COMMIT_SHA` and `VERCEL_DEPLOYMENT_ID`.
   The Function duration needs room for its normal response plus the probe.
2. Privately prepare a new 16-byte random lowercase hex `runId` and a separate
   32-byte random lowercase hex `requestKey`. Set the sensitive,
   Production-scoped `PHYSCRATIC_RUNTIME_LOGIN_ATTESTATION` value for the approved
   release. The JSON has exactly these fields. Use JS ISO UTC timestamps with
   milliseconds and a positive window of at most 15 minutes. Place the start
   after the expected release readiness.

   ```json
   {"runId":"<32 lowercase hex>","commitSha":"<40 lowercase hex>","notBefore":"<ISO UTC with milliseconds>","expiresAt":"<ISO UTC with milliseconds>","requestKey":"<64 lowercase hex>"}
   ```

3. Release through the approved owner process with the restricted pooled binding.
   Confirm the actual READY deployment and `physcratic.com` alias. In a private
   PowerShell 7.2+ session, use the approved run ID, SHA and actual deployment ID in
   the following command during the window. The request key is entered in a hidden
   prompt. The request sends neither a cookie nor an Authorization header and
   follows no redirects.

   ```powershell
   $RunId = Read-Host 'Approved run ID'
   $CommitSha = Read-Host 'Approved full serving SHA'
   $DeploymentId = Read-Host 'Actual approved serving deployment ID'
   if ($RunId -cnotmatch '^[a-f0-9]{32}$' -or $CommitSha -cnotmatch '^[a-f0-9]{40}$' -or
       $DeploymentId -cnotmatch '^dpl_[a-zA-Z0-9]{8,80}$') { throw 'Invalid observation reference' }
   $PrivateKey = Read-Host 'Temporary request key' -AsSecureString
   try {
     $KeyBytes = [Convert]::FromHexString((ConvertFrom-SecureString $PrivateKey -AsPlainText))
     if ($KeyBytes.Length -ne 32) { throw 'Invalid request key' }
     $Message = "physcratic-runtime-login-attestation-v2`n$RunId`n$CommitSha`n$DeploymentId"
     $Approval = [Convert]::ToHexString([Security.Cryptography.HMACSHA256]::HashData(
       $KeyBytes, [Text.Encoding]::UTF8.GetBytes($Message))).ToLowerInvariant()
     $Result = Invoke-RestMethod -Uri 'https://physcratic.com/api/arena/collection' -MaximumRedirection 0 `
       -Headers @{ 'x-physcratic-runtime-attestation' = $Approval } -TimeoutSec 20 -StatusCodeVariable StatusCode
     if ($StatusCode -ne 200 -or $Result.authoredUnavailable -ne $false -or $Result.attributionUnavailable -ne $false -or
         $Result.statsEnabled -ne $true) { throw 'Collection acceptance failed' }
   } finally {
     if ($KeyBytes) { [Array]::Clear($KeyBytes, 0, $KeyBytes.Length) }
     Remove-Variable -Name PrivateKey,KeyBytes,Approval,Result -ErrorAction SilentlyContinue
   }
   ```

4. Accept only a normal HTTP 200 collection read with the expected booleans
   and one private `verified` record correlated to that invocation's provider
   deployment metadata, exact run ID and SHA, and an in-window time. An absent
   record, mismatch, unavailable, late deployment or wrong context is unproven.
   Stop the cutover acceptance. A verified sample covers the sampled Function's
   pool. Reconcile Production configuration scope and warm instances separately.

## Rollback and removal

At expiry the probe stops accepting requests. If cutover fails, follow the
approved owner rollback for both routing and the persistent Production binding.
Use the recorded prior deployment and saved binding, then recheck role, alias,
Batch A and current sessions. Keep migrations, grants and data in place.

After acceptance or rollback, remove the temporary saved configuration through
the approved owner process. Verify the intended serving deployment and observe
the expiry boundary on any older deployment. A separate reviewed cleanup removes
the route wrapper, helper, tests, CI step and temporary package entries. Release
it with the accepted binding. No database or Vercel operation is part of this PR.

## Qualification

Unit tests cover exact deployment approval, OFF, Preview/build, method, route,
window, bounded request overhead, fixed output and failure. The isolated PG18.7
test uses real restricted and owner LOGINs, the shared pool contract and a
saturated pool. A local built-Next smoke can be enabled with
`ATTESTATION_SERVING_SMOKE=1` on the same disposable PG runner. It checks the
ordinary and approved HTTP responses and the post-response receipt. Actual
Vercel runtime logs and the pooled Production binding remain owner evidence.
