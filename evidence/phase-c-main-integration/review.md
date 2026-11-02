# Phase C integration review

Date: 2026-11-02. Scope: local offline preparation only. No live acceptance.

## Baselines and release evidence

Repository: Physcratic/physcratic. Dedicated worktree:
`C:\Users\THINKPAD\Desktop\physcratic-phase-c-main-integration`.
Local branch: `codex/phase-c-main-integration`.

Initial independently fetched main was `47a7fe180b2d83c1beef9f97d4fc2c901d702ef9`.
GitHub's PR27 metadata confirmed it merged into that commit. During verification,
main advanced to `bbcfe194b76a974b9587a8e11c3fc57668d7a530`. A fresh
ls-remote and fetch independently agreed. This worktree alone was fast-forwarded
to that baseline, retaining non-overlapping local changes. Eleven intervening
commits changed UI/copy, SEO, accessibility and lint warnings. Runtime auth,
DB/grading implementations, migration SQL, dependencies and lockfile did not change.
All final-baseline result rows identify their SHA. Older results are retained,
not relabelled as tests of the newer source.

The user's supplied Production READY/alias and completed-migration information
was not reverified through providers in this task. No shared migration was run.
`AUTHORING_ALPHA_RELEASE.md` contains pre-merge checkpoints as well as staging
acceptance. Its stale unmerged/Production-pending statements are historical,
not a reason to rerun release operations. Documented live checks at PR27 Preview
SHA `2c35d61a5fcf6680a4054380a4bfcff1b71bc9e6` used one verified actor.
They are attributed in coverage.md, not promoted to live PASS for the old
integration deployment or current Production.

## Selective integration

Verified local Phase C commit `893af8bb717127c79caf44666542f037575204fb`,
parent `36c6b8233024a111e8071b12813b5626c8230513`, exactly 28 additions.
It remains unchanged in its original worktree. No old application branch merge.

Adapted only network-guard.cjs, safety.test.mjs and the Windows runner from that
commit. Main already has stronger draft/attempt/solution/media/library tests,
valid fixtures, migration tests and CI discovery. The duplicate old workflow,
contract assertions, fixture framework, report generator and copied provider
planning archive were not transferred. transfer.json lists every old file.
Original evidence is preserved on the original commit/worktree.

Five new application regressions: two deterministic symbolic budget policies,
two mocked Resend failure/credential-fallback tests, and one real auth-hook Terms
rejection subtest (four invalid payloads, no identity or mail). Two additional
transport regressions check HTTP(S) fetch and forked-child guard inheritance.
Five original transport and two Python safety checks are reused. One additional ESLint-scope regression proves the Open Graph exemption does not disable the image rule on pages (eight genuinely new regression tests in total). Existing
symbolic semantic assertions are retained, with a deterministic clock for
semantic tests. The attack test's real elapsed-time assertion remains active.
No production grading timeout, assertion, dependency or application behavior is changed.

Added an LF attribute for migration files because Windows CRLF conversion broke
release byte checksums. All six committed up-SQL blobs already matched the
reviewed manifest. Restoring canonical checkout bytes makes unchanged assertions
valid; there is no migration SQL diff. ESLint now explicitly resolves Next's
already-declared plugins under pnpm's isolated node_modules layout. No package
or lockfile change. A narrow ImageResponse-only lint exemption addresses five
Open Graph raw-image warnings, with a regression test that the rule stays active
on pages. Ordinary application image linting is unchanged.

## Security review

Runner constructs an allowlisted environment, discarding inherited DATABASE_URL,
PG*, POSTGRES*, provider/OIDC credentials, proxies and NODE_OPTIONS. No dotenv,
provider secret pull or personal pgpass loading. Local env/.vercel presence
causes refusal. Only fresh generated literal 127.0.0.1 PG targets are accepted.
Existing CI fixtures initialize SQL only inside a newly owned disposable cluster.
No shared DB, Windows PostgreSQL service or operator release runner is used.
Clusters are stopped in finally, then removed only after checked ownership and
successful stop. Timeout/interrupt cleanup targets the owned Windows PID tree.

IPC exception is exact equality with the current parent's tsx named pipe inside
Windows' local `\\?\pipe\` namespace (or its exact local Unix socket).
No wildcard, arbitrary tempfile, alternate PID/user, remote UNC or other pipe.
TCP/TLS allow only the generated PG port on literal 127.0.0.1. No port-1 exception.
DNS lookup/resolve/reverse and UDP are rejected. Native shells and arbitrary
executables are rejected; only the current Node and this checkout's esbuild
are allowed. Spawn/fork cannot strip the preload, select another executable or
use shell/detached escapes. Fetch and a real fork/IPC handshake are tested.
Canonical preload spelling keeps protection in Next's option formatting.
This is defense in depth for inspected code, not a hostile-code OS sandbox.
Do not run arbitrary native add-ons or unreviewed imports through it.

## Symbolic parallel failure assessment

`lib/authored-expression-language.ts:27` creates an independent operation counter
and `performance.now()+100ms` deadline for each evaluation. Descheduling consumes
wall time. The earlier small identity can return correct without a pause and
needs-review/symbolic-resource-limit when the clock advances past the deadline.
New tests reproduce both outcomes and prove the next evaluation is unaffected.
A retained later parallel run also directly captured resource-limit instead of
inconclusive on the bounded-witness test, duration 166ms. This supplies concrete
support for the scheduling/budget explanation. The original historical failure
did not capture its reason, so its precise event cannot be proven retrospectively.
No shared evaluator state or false algebraic equality was found.

All semantic assertions, all 220 seeded cases and operation/bit/shape limits
remain. Only semantic test clocks are controlled, with independent deadline and
real attack-runtime checks. Default suites still run in parallel. No global
serialization, timeout increase or weakened assertion is used to obtain PASS.

## Remaining findings and gates

- MEDIUM: Full parallel disposable PG validation had intermittent failures in
  existing solution-lock and poolmax1 tests. Earlier solution tests passed;
  one diagnostic run passed all 12. Retained parallel runs show insert-gate
  observation failure, connection timeout, and 503s in tests with 500ms/1000ms
  fresh-pool connection deadlines. These are compatible with local load and
  brittle test synchronization, but an application defect is not excluded by
  a single diagnostic PASS. The final current-main parallel run passed all 76 checks, but that does not
  erase the retained intermittent failures. Do not silently serialize it. Reproduce on main's Linux/Node22 CI and improve synchronization
  separately if confirmed. See lib/authored-solution-api.test.ts:929 and :1230,
  lib/authored-attempt-api.test.ts:956.
- HIGH: Main has no signup reCAPTCHA validation implementation. CSP allowlisting
  is preparation, not enforcement (`lib/security/csp.ts:13`). Historical cases
  C01/C02 CAPTCHA/action/score/hostname/replay remain missing/product scope decisions.
  This work does not silently restore obsolete auth code.
- MEDIUM: Auth rateLimit config (`lib/auth.ts:73`) selects no database storage.
  Installed Better Auth context defaults to memory absent secondary storage.
  Local signup throttling does not establish cross-instance sign-in enforcement.
  Confirm scope before approving live rate-limit acceptance.
- MEDIUM: The complete workflow suite remains blocked on this guarded Windows
  host. Seven native Bash cases are refused; a workflow text assertion assumes LF,
  and the smoke workflow test cannot parse its CRLF-sensitive step. The full
  server run exits 1, nine failures. Revalidate those unchanged tests on main's
  isolated Linux/Node22 CI. No real gh issue command or smoke request was run.
- LOW: Inherited corpus punctuation test remains TODO, owned by translation work
  on PR2. It is unchanged here (`lib/corpus-translation.test.ts`).
- Live/browser NOT TESTED: protected Preview identity/cookies/provider metadata,
  real CAPTCHA/mail, two-user browser isolation, fault recovery and deployed
  private Blob behavior. Existing .browser.mjs harnesses were inspected but not
  run: reviewed browser tooling lacks @axe-core/playwright and native browser
  egress would need a separately verified loopback-only harness. SSR UI PASS is
  not browser PASS. No browser install or deployed request was made.

## Push, PR and live containment

No push, PR, merge into main, deployment, provider/config/credential change or
shared database access. CI's PG job uses disposable loopback resources, but this
new branch's automatic Vercel Preview resources were not proven isolated.
The staging guard in lib/authoring-staging.ts:11 is specific to the old release
branch/project. It does not establish safe DB/auth/Blob bindings on this new branch.
Therefore NO-GO for push/automatic Preview/live acceptance. Keep this work local.
Before any future push: independently establish effective Preview DB role/host,
auth origin, recipient restriction, Blob store and Git/deployment triggers for
this exact branch, or prove deployment creation is suppressed. Do not decrypt
unrelated credentials or weaken runtime guards to obtain that proof.

GO for local integration review of this offline contribution. NO-GO for push,
merge/release or live acceptance until Preview isolation and remaining gates
are established. Source compilation, lint, types, selected application tests and
the final parallel PG run passed, but the full native suite did not.
All 23 historical live cases remain NOT TESTED in this task. No wholesale rerun
of release acceptance is requested. A future live gate must select only remaining
cases, bind approved synthetic recipients/accounts and define retained audit data.

## Executed checks

| Check | Exit | Counts / result |
|---|---:|---|
| Frozen install | 0 | PASS |
| Python safety (2 tests) | 0 | 2 passed |
| Transport safety | 0 | tests=7, pass=7, fail=0, skipped=0, todo=0 |
| Selected offline | 0 | tests=82, pass=82, fail=0, skipped=0, todo=0 |
| Parallel application subset | 0 | tests=494, pass=484, fail=0, skipped=9, todo=1 |
| Full guarded server suite | 1 | tests=506, pass=487, fail=9, skipped=9, todo=1; native-shell/Windows workflow gate, not application PASS |
| UI rendering | 0 | tests=24, pass=24, fail=0, skipped=0, todo=0 |
| Parallel disposable PG | 0 | tests=76, pass=76, fail=0, skipped=0, todo=0 |
| ESLint scope regression | 0 | tests=1, pass=1, fail=0, skipped=0, todo=0 |
| ESLint CI zero warnings | 0 | PASS |
| Next typegen | 0 | PASS |
| TypeScript | 0 | PASS |
| Production build | 0 | PASS; 572.13s, guarded schema warnings, all 34 pages generated |

The application subset explicitly excludes only deploy-watch.test.ts and
smoke-workflow.test.ts. It does not stand in for full-suite PASS. All 76
PostgreSQL tests ran in parallel on a fresh loopback PostgreSQL 18.6 cluster.
Failed earlier parallel runs are retained. Build compilation took 4.5 minutes;
the complete optimized build exited 0 after 572.13 seconds. No Google Fonts
download was required. Five Better Auth schema validation warnings are expected
with no DB credentials and all build TCP denied; build PASS does not prove runtime
DB identity or provider readiness. Local Node is 24.22.2; main CI uses Node22.

Commands, exact exit codes/counts, baselines and retained failed-log hashes
are captured in results.json. Raw logs remain ignored under build/phase-c-offline;
no raw log or environment dump is a commit candidate. See coverage.md/json for all 23 cases,
transfer.json for the old 28-file reconciliation, isolation.json for preserved
worktree hashes/index/HEAD checks, and committed-files.txt for exact commit scope.
