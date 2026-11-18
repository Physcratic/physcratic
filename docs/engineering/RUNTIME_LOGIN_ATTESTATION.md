# Temporary in-band serving LOGIN assertion

18 November 2026. Separate code-only change, stacked on the Phase C audit fix.
This is an implementation proposal, not deployment or configuration authority.
No provider telemetry tools are available here. Prior generic logs/direct LOGIN
were inconclusive; they have not been repeatedly inspected or treated as proof.
Existing evidence does not reliably correlate the serving Function with LOGIN.

## Mechanism and limits

The existing application pool gains an observer only when one strict temporary
configuration is valid. It observes an acquisition in an active Next request, then reserves a connection
from that same application pool in Next after(), and validates session_user against the fixed physcratic_runtime_app role,
current_user=session_user (no assumed role), and current_database()=neondb.
There is no separate observer credential/pool, SQL write, function grant,
authentication change, grading change, HTTP endpoint or identity response.

The metadata query runs after the response on its own reserved physical
application-pool connection, which may reuse an idle connection. It never shares
an in-flight request transaction. Next after() retains its completion without
changing the HTTP response. It adds one pool acquisition (using the existing
five-second connection timeout) and a metadata query per pool/instance, with a
one-second client query deadline. A failed probe connection is discarded. The application already enforces its normal
server-side statement timeout. A failed observation is never retried for that
pool and never fails or changes the ordinary request. No claim of zero overhead
or deployment-wide exactly-once execution is made. Multiple Function instances
may each emit one record during the approved window, capped at15 minutes.

The server-only helper ignores builds, imports and background acquisitions by
requiring an active Next headers() request context. Invalid/missing configuration,
wrong source SHA, absent/invalid deployment ID, Preview and expired windows do no
query or logging. It detaches after one in-band attempt or observed expiry.

Only authenticated owner-controlled Vercel runtime logs receive the fixed record:
`event`, `version`, random nonsecret `runId`, deployment ID, source commit SHA,
observation timestamp and `outcome`. verified asserts the exact fixed role and
database above. mismatch never reports the unexpected identity; unavailable
never reports an exception. No raw LOGIN, personal/account information, headers,
credential/URL, SQL text, query results or database error is logged or returned.
No caller can obtain identity through HTTP. Provider log access/retention must
be restricted and approved; this does not create public diagnostic access.

If Vercel does not expose its deployment ID and full commit SHA to the actual
Function, the mechanism stays inactive. Do not substitute caller headers, saved
settings, a guessed deployment or an operator-run local LOGIN for those fields.
The evidence must appear under authenticated runtime invocation metadata for the
actual served alias/deployment, not a build log or an unrelated Function.

## Required independent review and owner approval

Before any Production use, independently review the exact commit, passing CI,
code/query/output fields, window, log access/retention, allowed public read,
per-instance volume, latency/error budget and removal release. Owner approval
must explicitly cover the instrumentation deployment AND the temporary nonsecret
configuration. This document grants neither. Existing Production credentials,
provider integrations, feature flags and Batch A settings remain unchanged.

After approval only, the owner sets the Production-scoped environment value
PHYSCRATIC_RUNTIME_LOGIN_ATTESTATION to JSON containing exactly:

```json
{"runId":"<32 lowercase hex characters>","commitSha":"<reviewed full 40-character SHA>","notBefore":"<UTC ISO timestamp>","expiresAt":"<UTC ISO timestamp within 15 minutes of notBefore>"}
```

These placeholders are intentionally invalid. First record the reviewed final
release SHA and an independently usable deployment AND persistent-configuration
recovery reference through owner access outside the app. The recovery target
must preserve the restricted binding, active Batch A and all future gates OFF.
Verify the existing Function duration leaves room for the normal request plus
up to five seconds acquiring a pool connection and one second for the probe.
Do not change Function settings to force this test to succeed.

Choose a notBefore time far enough in the future to finish the normal approved
build/deployment, then expiresAt at most15 minutes later. Deploying before
notBefore is allowed and does not consume the attempt. Confirm Ready status,
actual alias/source and owner runtime-log access before the window opens; issue
the approved collection read during that window. The observation window is not
a15-minute deadline starting when configuration is saved. If deployment is late,
stop with UNPROVEN and obtain a newly approved window/release, never silently
extend the old one. Use a fresh nonsecret run ID.
The source SHA must match VERCEL_GIT_COMMIT_SHA; VERCEL_ENV must be production and
VERCEL_DEPLOYMENT_ID a real provider ID. Do not add/decrypt/copy a connection URL,
change a credential or modify provider system-variable settings to force a pass.
If necessary runtime metadata is unavailable, stop for a separate design review.

The owner uses only their normal approved release mechanism, confirms the actual
physcratic.com alias/deployment/SHA, and performs one existing collection read
within the window. In authenticated Vercel runtime logs, correlate the single
record to that invocation/deployment and run ID. Require verified, matching
source/deployment and provider runtime context. The public collection request
must succeed normally. Retain only metadata/outcome and a private evidence link.
A verified record proves only the sampled Function's actual application pool.
It does not prove every Function/region/warm instance uses that LOGIN, nor that
old deployments have drained. The owner must reconcile the served alias and
shared Production binding scope independently; any further samples need their
own approved existing request scope. Do not expand to private journeys/writes
under this collection-read approval.
A mismatch, unavailable, missing record, wrong context or expiry means UNPROVEN;
stop B1 rather than widening permissions, changing credentials or logging more.

## Expiry, rollback and removal

The time window disables future observations automatically. This does not remove
code or saved environment configuration. Under the preapproved removal scope,
the owner removes only the temporary configuration and releases that removal,
then an independent code-only cleanup PR deletes the helper, tests, import and
observer registration. Verify no new records and normal existing reads. Keep
credential/binding, schema, grants, normal feature flags and Batch A unchanged.
Any early rollback uses the separately recorded owner-approved deployment/config
recovery reference through owner access outside the new app. Restoring an alias
alone does not remove the saved temporary configuration: independently remove
that value under the preapproved removal scope and verify the serving source,
restricted binding and unchanged Batch A/future-gate state. Do not use a historical
owner-bound deployment as the recovery target. A code merge alone is not permission to deploy it.

## Qualification

Unit tests cover disabled/malformed configuration, source/deployment/window
bounds, no build/background evidence, one attempt, wrong role/database, bounded
output, raw-error suppression, late results and logger failures. The PG18.7 test
uses actual LOGIN connections, verifies no additional grants, ordinary query
results, a successful assertion and mismatch under the owner connection. It also
exhausts a one-slot pool and proves the probe acquisition times out without
releasing/modifying the request client or leaving a pending waiter.

Run the PG test with the existing disposable runner. Setting the test-only
ATTESTATION_SERVING_SMOKE=1 additionally launches an already-built local Next
production server and verifies the existing collection request emits the
assertion through the actual Next request adapter. It creates only synthetic
neondb/LOGIN inside that uniquely owned disposable container. Never pass a
shared/Production test URL. CI runs the core connection test in its existing
PG18.7 job; the production-serving smoke is a focused local check after build.

After this evidence is accepted, follow PHASE_C_B1_OWNER_HANDOFF.md for separate
role/target validation, independently approved id revoke, post-revoke audit,
independently approved profiles grant, post-grant audit, privacy/support readiness,
feature activation approval, synthetic acceptance and profiles-OFF rollback.
Serving identity remains UNPROVEN here until the owner authorizes and obtains
actual Production evidence. B1 remains NO-GO.
