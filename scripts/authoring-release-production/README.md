# Production Windows execution

This is an operator-only wrapper for the already reviewed Production transaction.
Nothing runs from application startup, a build, CI deployment or import. It never
connects through the Neon connector and cannot target staging or a pooler.

Required: the same Windows computer that passed the direct Production TLS test,
Git Bash, Node 22+, this exact reviewed commit and its frozen pnpm dependencies.
Use `corepack pnpm install --frozen-lockfile` only if dependencies are missing.
No Docker, WSL, PostgreSQL CLI, encryption tooling or new infrastructure is needed
on the execution host. Docker is used only for the disposable developer rehearsal.

The approved SQL SHA-256 remains
`afc68f3435b46e319329aa456d3e2249537aa5ac39b66a575c704bc53de4f5da`.
All six canonical migrations and the original staging package are immutable.
The SQL records source commit `2c35d61a5fcf6680a4054380a4bfcff1b71bc9e6`,
the original reviewed SQL source. The wrapper's newer execution commit is bound
separately in evidence. It does not silently rewrite that ledger history.

Invoke `WINDOWS_OPERATOR.sh` as a script with three explicit arguments:
`--read-only` or `--execute`, the full reviewed Git commit, and the SHA-256 of
this directory's `PACKAGE_SHA256SUMS`. The release report supplies exact values.
Do not substitute staging's package checksum for this Production wrapper checksum.
Do not run an execution command copied from a historical staging runbook.

Before either mode, keep other Codex/Claude sessions, developers, manual SQL,
DDL, cleanup and external jobs paused. Hold main pushes and Production deployments.
Reconfirm external controls explicitly. An idle activity view is not proof of a
writer pause. The operator types `HOLD AND LOCK CONFIRMED`, then privately enters
the direct Production owner URL from Neon. No URL appears in command history,
stdout, repository files or evidence. Never paste it into chat. The default mode
is not inferred: both scripts and Node require an explicit mode.

The script prints a fresh 30-minute UTC window and private evidence directory.
It verifies the clean exact checkout, every package file, all six canonical file
hashes and original staging package. A new certificate-verified TLS connection
checks Production owner/database/18.6/origin, exact sixteen-table schema, locale,
ledger absence and full-record digest against the retained recovery point.

`--execute` consumes the owner's existing full conditional execution authority.
It writes a durable attempt marker before BEGIN, takes the common transaction
advisory lock `hashtextextended('physcratic:authoring:migrations:v1',0)`, locks all
sixteen original tables in SHARE ROW EXCLUSIVE mode, and checks recovery coverage
again under those locks. The existing reviewed SQL repeats these same safeguards.
Only its outer BEGIN/COMMIT are supplied by the Node client; every interior SQL
byte is unchanged. Timeouts remain 5 seconds for locks and 120 seconds per SQL
statement. A hard connection close bounds the total transaction by window expiry.
An execution failure or disconnect is never retried automatically.

The common lock coordinates actors using that exact key. Table locks also block
ordinary writes to existing tables while migration is active. Neither an advisory
lock nor table locks prevent unrelated new-object DDL, app requests, deployment
changes or jobs resuming later. The explicit operator hold remains required.

After commit, a separate new TLS connection runs the published READ ONLY verifier:
exact canonical v6, six checksum/source/actor/result ledger rows, all original
table metadata and full-record fingerprints, validated constraints and enabled
internal triggers. Expected final line: `status: PASS`, `ledger_entries: 6`,
`canonical_version: 6`, `legacy_tables_preserved: 16`. Keep the evidence privately
and report only these nonsecret statuses. Evidence has schema metadata and hashes,
not raw business rows, passwords or connection strings. Windows NTFS access is
inherited from the private user temporary directory; POSIX mode is not an NTFS ACL.

On any STOP, preserve the evidence directory and keep the hold. Do not repeat
execution. Independently inspect actual schema/ledger using the read-only provider
audit before deciding recovery. A committed transaction with failed verification
must never be replayed. No DOWN migration or ledger repair is provided.

Recovery point `br-polished-heart-b7sfrgfi` and its independent copy
`br-weathered-shadow-b7rsjgvv` matched Production's sixteen-table schema and all
records. Both computes are suspended. This is a same-provider retained branch
copy, not a snapshot, cross-provider backup or rehearsed traffic failover. The
single manual snapshot slot remains staging's existing snapshot. If Production
rows changed after the recovery point, execution stops. Preserve both timelines
and establish a fresh verified recovery point before a future attempt.

Before any actual execution, the release agent also rechecks provider branch and
endpoint mapping, recovery branch existence, deployments/CI, real staging acceptance
and the hold. The Node runner cannot prove external actors are paused by querying
PostgreSQL. Schema success is not authorization to merge until the separate live
acceptance, fresh CI and Preview gates pass. Production privilege changes are not
part of this transaction; its existing application role is the owner and retains
ownership of new tables. No existing role or credential is reset.

Developer validation: `node --test scripts/authoring-release-production/core.test.mjs`
and `bash scripts/authoring-release-production/test-local.sh`. The latter creates
only its own labelled disposable PostgreSQL 18.6 container and synthetic data.
Its local descriptive datcollate alias differs from Neon; the test adapts only
that in-memory descriptor guard, never the approved remote SQL or package files.
