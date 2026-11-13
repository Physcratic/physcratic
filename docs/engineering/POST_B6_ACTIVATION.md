# Batch A: favourites and statistics activation package

14 November 2026. **Prepared for owner review, not authorized to activate.**
Supersedes temporary `/workspace` activation notes for this first batch. B6 is
owner-confirmed complete: all 18 records verified, 0016 preserved, 0019 absent.
Do not run migration SQL, B6 preflight or either historical operator again.

Scope is only `COMMUNITY_PROBLEM_STATS_ENABLED=true`. The code correction in this
package rejects stale displayed accounts before personalized reads/writes.
All other new feature gates remain false, particularly profiles, authorship,
media, achievements, staff, medals/showcase/verification UI, moderation/UI,
comments, actions, deletion and practice persistence. No account canary gate
exists. Authorization must acknowledge that the setting is deployment-wide.

## Release evidence to complete before any mutation

The reviewed source base is `31941d0ea1feca6bac93834d1b8fa75ce051ca5c`.
The new code must be reviewed/merged through the owner process before selecting
its final deployable SHA. The **currently deployed SHA and runtime role are
unknown**, not inferred from main or the successful migration. Complete this
record in a private owner release note, using actual observations:

```text
Reviewed final source SHA:
Existing passing CI run links for that SHA:
Observed current serving deployment ID / SHA / Production alias:
Proposed serving deployment ID / SHA after approved release:
Neon project: divine-mode-82940461
Branch: br-quiet-dawn-b7m2zrt3
Endpoint: ep-snowy-heart-b7c1220y
Database: neondb
Actual runtime role and connection binding reference, never its URL:
Read-only ledger/privilege evidence reference:
Current flags / proposed only stats=true:
Current rollback deployment/configuration reference:
Privacy/erasure/support owner and actual backup/restore evidence:
Approved synthetic account A / B / unverified account:
Observation interval, acceptable error/latency/quota budgets:
Activation owner / rollback owner / approval reference and scope:
```

Blank, mismatched or unknown fields stop execution. Attach existing CI, do not
re-run the full suite. GitHub API access returned Forbidden during preparation;
open PRs and current CI links need owner confirmation. Recheck source main and
concurrent auth/community/deletion work before choosing the release SHA.

## Exact owner execution order

1. **Read-only authority and evidence.** Confirm the selected Neon IDs in console
   and retain completed B6 postcommit/ledger evidence. Inspect Vercel's actual
   served SHA, effective Production server flags and private binding metadata,
   not merely settings saved for a future deployment. Production firewall is
   owner-reported Log. Inspect Integration separately; do not release its possible
   Deny hold without separate authority. No Blob provisioning is needed here.
2. **Runtime audit.** Review [the permission model](B6_RUNTIME_PERMISSIONS.md).
   Use psql16+ with TLS verification, a private transcript-free PowerShell7
   session, and the authorized connection's host/database/user/port as nonsecret
   arguments. Obtain the exact direct hostname and user from the independently
   checked binding. Load only the password via the hidden prompt below. Do not
   type a URL/password into a command or commit an environment file.

```powershell
$ErrorActionPreference = 'Stop'
$DbHost = 'ep-snowy-heart-b7c1220y.c-13.us-east-1.aws.neon.tech'
$RuntimeRole = Read-Host 'Actual independently verified runtime role'
$ReaderRole = Read-Host 'Authorized metadata reader role'
$env:PGSSLMODE = 'verify-full'
# Install/select the trusted provider CA through the approved local setup first.
# Do not downgrade TLS if certificate verification fails.
$Secret = Read-Host 'Metadata reader password (hidden)' -AsSecureString
$Pointer = [IntPtr]::Zero
try {
  $Pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secret)
  $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Pointer)
  psql -X -w -h $DbHost -p 5432 -U $ReaderRole -d neondb -v ON_ERROR_STOP=1 -v "runtime_role=$RuntimeRole" -f scripts/activation/runtime-readonly.sql
  if ($LASTEXITCODE -ne 0) { throw 'Read-only audit failed. No GO.' }
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  if ($Pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Pointer) }
  $Secret.Dispose()
}
```

   Use a separate hidden password prompt with the actual runtime credential and
   `-U $RuntimeRole` to run `BEGIN READ ONLY; SELECT current_database(),current_user,
   session_user,current_setting('transaction_read_only'); SELECT ssl,version FROM
   pg_stat_ssl WHERE pid=pg_backend_pid(); COMMIT;`. Check that both identities
   match the deployed binding. A direct endpoint audit does not by itself prove
   pooled application transport or the selected Vercel credential. Inspect that
   binding and normal client certificate settings privately as well. Never use
   the upgrade owner's URL as evidence of application role separation.
3. **Permission decision, separate approval.** Require no owner/schema-CREATE/
   privileged-service inheritance and exactly the needed effective permissions.
   The metadata SQL exposes column-grant bypasses as well as table grants.
   If changes are necessary, stop for approval of target, actual role and SHA-256
   of `scripts/activation/favourites-grants.review.sql`. The owner may later run
   it with the same psql options and `-v runtime_role=...`; ON_ERROR_STOP and the
   explicit transaction prevent partial GRANT success. A new-role bootstrap or
   DATABASE_URL cutover needs the separate role-transition decision first.
   Never paste the whole future-feature grant template into Production.
4. **Code release, separate approval.** Preserve all flags OFF while the owner
   releases the reviewed code with the account guard through their normal
   deployment mechanism. Do not trigger a README deployment, buy a seat or
   redeploy a blocked commit. Record actual serving SHA/alias afterward. It must
   match the selected reviewed release. Old clients without the account header
   will fail with 409 when authenticated; require a page reload. Do not temporarily
   weaken the guard to support stale JavaScript.
5. **Activation approval.** Owner approves the completed release note, exact
   configuration delta, deployment-wide exposure, test identities and rollback.
   In Vercel's selected Production environment set only
   `COMMUNITY_PROBLEM_STATS_ENABLED` to exact lowercase `true`, then use the
   approved owner release/configuration mechanism. Saved settings alone are not
   evidence. Reconfirm the actual serving deployment and effective gates. If a
   configuration release fails or the SHA drifts, stop; do not call it enabled.
6. **Manual acceptance, separately authorized synthetic writes.** Guest opens
   Arena: counts/sign-in prompt, no personal selection. Unverified user cannot
   favourite. A favourites one existing Arena item, reloads, checks a second
   device and signs out/in. B sees its own unfavourited state, not A's. In two
   tabs switch the cookie to B while A's page is stale: request must reject409,
   no B preference or quota change, reload before retry. A unfavourites and
   reloads. Compare one already-approved synthetic authored fixture with known
   current server grading evidence. Do not create/publish/solve live fixtures
   unless separately included in the write scope. Verify real mailbox/origin/
   session delivery using designated accounts, not real student data.
7. **Observe and accept.** Record exact statuses and synthetic desired states,
   redacted endpoint503/409/429 rates, pool/query latency and provider quotas for
   the owner-selected interval/budgets. Require a matching successful write AND
   subsequent authoritative GET; an HTTP200 from an unrelated route, stale UI,
   saved environment setting or timeout is not confirmation. No passwords,
   tokens, submitted work, favouriter IDs or private response dumps in logs.
   Owner signs off before expansion to [Batch B](POST_B6_PROFILES_PRACTICE.md).
8. **Rollback, preauthorized in the release note.** Set only the stats flag false
   and owner-release the approved rollback configuration. Verify new route reads
   return disabled503 and controls are absent after reload. Keep favourites,
   totals, schema and audit/recovery evidence. Disabling exposure does not undo
   committed writes. Never edit counters, run DOWN, replay0016, install0019 or
   restore the database automatically. Do not change either firewall rule.

## Expected contract and stop conditions

Authenticated GET/PUT must send `X-Community-Account` equal to the displayed user.
It rejects mismatches, never authorizes a claimed identity. Guest GET sends none.
Responses are private/no-store, vary on Cookie and X-Community-Account and expose
only problem key, counts, caller's own boolean and nullable solve count.

Public solves count distinct verified non-author users with all required parts
of the current published authored revision checked correctly and independently
with supported authoritative engines. Assisted/manual/ungraded/old versions do
not become verified completions. Static Arena remains `solves:null`, including
after saved practice is eventually enabled. Withdrawing authored publication
removes it from new stats/favourite operations. No list of favouriters is public.

Missing/expired authentication gives401 for writes without a displayed-account
claim; invalid origin or unverified writes403; mismatch/missing authenticated
account guard409; rate cap429; unavailable data/grants503. Unknown write outcome
requires authoritative reload before a deliberate desired-state retry, not a
blind toggle. The new read/account guard stops before stats DB work or quota,
though authentication itself may refresh session state.

Privacy/authorization failure stops immediately. Wrong SHA/role, missing grants,
owner runtime, unexpected true gates, unexplained counts, repeated unconfirmed
writes, quota exhaustion or error/latency budget breach stop expansion and invoke
the approved rollback. If rollback release is not confirmed, retain the incident
state and owner escalation. Do not claim success based only on a setting change.

## Focused engineering evidence

The real-LOGIN PG18.7 rehearsal reproduced an original stale-cookie GET returning
B's private favourite state under A's displayed claim. The correction binds the
client's displayed account and rejects mismatched reads/writes before quota.
The focused unit regression proves zero stats DB calls for those rejections.
No migrations, role-selection rules, grading or authentication implementation
were changed. Existing broad CI remains authoritative.

Owner/reviewer can reproduce only this uncovered integration check with:

```sh
AUTHORING_TEST_POSTGRES_IMAGE=postgres:18.7-alpine bash scripts/test-problem-authoring.sh node --require ./tests/server-only-register.cjs --import tsx --test scripts/activation/runtime.pg.test.ts
```

Use Node22 and existing frozen pnpm10 dependencies. Strip real service credentials
from the rehearsal shell first. The runner supplies only its disposable loopback
URL. Do not set AUTHORING_TEST_DATABASE_URL to a shared/Production target.
No comprehensive unit, browser, database, lint or build sweep is requested here.
