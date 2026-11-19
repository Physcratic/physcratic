# Serving LOGIN attestation record

## Owner-accepted Production evidence (19 November 2026)

The owner accepted the restricted serving LOGIN sample on
`dpl_4UWwiYwhWZs28XPuKo5mpSv3Jgbq` at source
`cd1e2c79b41e3d57e9eaa72bdef8e12a80014dc7`. The private
`runtime_login_attestation` version 2 receipt recorded `verified` at
`2026-11-19T11:47:47.606Z`, and the collection HTTP acceptance passed.
The receipt applies to that deployment and sampled application pool.

The owner confirmed that the window expired at `2026-11-19T12:00:00.000Z`
and the temporary Production environment variable was removed. The code
cleanup restores the ordinary Arena collection handler and removes the
observer, its tests and its CI step. Preserve the existing Production
`DATABASE_URL` binding to `physcratic_runtime_app`. Later releases still
require their own deployment and binding continuity checks.

## Archived PR #212 procedure

<details>
<summary>Historical operator runbook and pre-observation evidence</summary>

## Evidence and current decision

The [Phase B report](PHASE_B_OWNER_REPORT.md) records an earlier owner-accepted
sample from the serving application pool. The owner also confirmed the PR204
cleanup deployment `dpl_A4rYge5pwgYzVMhD6JYgabQ8NexB` from
`4f840e67f359e558d49f44a4b81966012638fc9a` and removal of the temporary variable.
The [historical instrumentation and removal record](https://github.com/Physcratic/physcratic/blob/e125a983c261baa9dc30d9f4928bcea2db38dd8a/docs/engineering/RUNTIME_LOGIN_ATTESTATION.md)
retains the original evidence and procedure.

At this review, Vercel resolved `physcratic.com` to READY Production deployment
`dpl_FGmJjtsCjiePTeiqGrDqPo3xWUGr`, from
`e125a983c261baa9dc30d9f4928bcea2db38dd8a`. This establishes the alias and source
only. The current serving LOGIN is unverified. Cutover remains **NO-GO** until
the owner reconciles the current binding and accepts a sample for the exact
candidate. Recheck the actual alias and source before any operation.

## Mechanism and limits

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

1. After exact-head review and passing required CI, obtain code-merge approval.
   Leave the temporary configuration absent and preserve the Production binding
   during the code merge. The normal Git deployment, if eligible, runs with the
   probe off. Record the actual final `main` release SHA after merge and verify
   its CI. Squash and merge commits can have a different SHA from the PR head.
   A blocked Git deployment is a stop under repository rules.
2. Before requesting the separately authorized cutover candidate, confirm the
   project, current `physcratic.com` assignment, exact release SHA and recovery
   references. The rollback deployment must be READY and independently usable.
   Record its exact saved binding privately and verify both recovery paths.
   Confirm the pooled target and `verify-full` settings, Batch A and all other
   gates, owner runtime-log access, and a Function duration that leaves room
   for the normal response plus the probe.

   **System variable preflight.** [Vercel documents](https://vercel.com/docs/environment-variables/system-environment-variables)
   `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA` and `VERCEL_DEPLOYMENT_ID` at runtime
   when system variables are exposed. Deployment metadata showed the project's
   Production Git SHA and deployment ID, but did not establish injection into
   the Function. The owner must verify that **Automatically expose System
   Environment Variables** is already enabled in the project and that the
   approved Git-backed release provides all three at runtime. Stop if availability
   cannot be established. Do not set substitute values, change the setting or
   use a prebuilt or otherwise unqualified deploy path to force the probe on.
3. Obtain explicit approval for the candidate deployment, restricted binding,
   temporary configuration, one guest read, private logs, window and removal.
   Generate a new 16-byte random lowercase hex `runId` and a separate 32-byte
   random lowercase hex `requestKey`. Set the sensitive Production-only
   `PHYSCRATIC_RUNTIME_LOGIN_ATTESTATION` value with the actual final SHA. Use
   ISO UTC timestamps with milliseconds. Set `notBefore` after the expected
   build and READY/alias verification, leaving a build buffer before the window.
   Set `expiresAt` at most 15 minutes after `notBefore`. The build buffer is
   outside the observation window. Use exactly these fields.

   ```json
   {"runId":"<32 lowercase hex>","commitSha":"<40 lowercase hex>","notBefore":"<ISO UTC with milliseconds>","expiresAt":"<ISO UTC with milliseconds>","requestKey":"<64 lowercase hex>"}
   ```

4. Save the approved candidate binding and temporary configuration before the
   new build starts. [Vercel applies environment edits only to new deployments](https://vercel.com/docs/environment-variables/managing-environment-variables).
   The owner uses the approved Vercel Git-backed Production redeploy of the
   eligible final-SHA deployment, keeping the original Git revision, or the
   equivalent authorized Git-backed release pinned to that SHA. Verify a new
   deployment ID, the exact SHA, READY and actual alias routing before the
   window opens. A promotion alone cannot pick up the configuration. If
   readiness or routing misses the planned start, stop and record UNPROVEN.
   Any later attempt needs a fresh approved window, run ID, request key and new
   deployment. Never redeploy a blocked commit.
5. During the approved window, use the actual serving deployment ID, final SHA
   and run ID in a private PowerShell 7.2+ session. The command prompts for the
   key privately, sends no cookie or Authorization header, and follows no redirects.

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

6. Accept only a normal HTTP 200 collection read with the expected booleans
   and one private `verified` record correlated to that invocation's provider
   deployment metadata, exact run ID and SHA, and an in-window time. An absent
   record, mismatch, unavailable, late deployment or wrong context is unproven.
   Stop the cutover acceptance. A verified sample covers the sampled Function's
   pool. Reconcile Production configuration scope and warm instances separately.

## Rollback and removal

At expiry the probe stops accepting requests. If cutover fails, follow the
approved owner rollback for both routing and the persistent Production binding.
Restore routing to the recorded prior READY deployment and restore its exact
saved Production binding. Then recheck alias, effective role evidence, Batch A
and current sessions. Keep migrations, grants and data in place.

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

</details>
