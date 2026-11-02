# Offline acceptance on released main

Run from this worktree with Python 3 and existing Node/PostgreSQL 18.6 binaries:

```
py -3 -B scripts/phase-c-offline/run.py self-test
py -3 -B scripts/phase-c-offline/run.py safety
py -3 -B scripts/phase-c-offline/run.py install
py -3 -B scripts/phase-c-offline/run.py pure
py -3 -B scripts/phase-c-offline/run.py pg
py -3 -B scripts/phase-c-offline/run.py suite
py -3 -B scripts/phase-c-offline/run.py app-suite
py -3 -B scripts/phase-c-offline/run.py types
py -3 -B scripts/phase-c-offline/run.py lint
py -3 -B scripts/phase-c-offline/run.py lint-ci
py -3 -B scripts/phase-c-offline/run.py build
```

`install` requires cached pnpm matching main (10.34.9), uses frozen/offline/
ignore-scripts and changes neither manifest nor lockfile. No downloading toolchain.
`pg` reuses main's CI test discovery and assertions. It creates a fresh owned
cluster/database at a generated 127.0.0.1 port. Existing test fixtures initialize
SQL 0001?0006 only there, including rollback/upgrade fixtures. Never supply a URL
or run this against an existing service. Stop/remove is bounded to that owned
cluster in finally. Interrupt/timeout kills the owned Windows process tree.

The environment is allowlisted: inherited DB/provider/proxy/NODE_OPTIONS values
are discarded. Root dotenv files, .vercel and a preexisting runner pgpass path
cause refusal. The generated pgpass override prevents personal libpq passwords.
Child Node transports permit only that generated literal loopback PG port.
The exact current parent's tsx local named pipe is the only IPC connection
exception; suffixes, other PIDs, remote UNC and unrelated pipes are rejected.
DNS, UDP, HTTP(S), other TCP and native shell escapes are rejected. Only Node
with the same preload and this checkout's esbuild executable can be spawned.
This is defense in depth for reviewed tests, not an OS sandbox for hostile code
or arbitrary native addons. Never execute unreviewed test imports through it.

`pure`, `pg`, `suite`, `app-suite`, lint/types/build run safety first. The Node
unit runner uses main's server-only shim and parallel default, not a global
serialization workaround. `suite` includes everything and retains actual
blocked/failing results. `app-suite` explicitly excludes deploy-watch.test.ts
and smoke-workflow.test.ts, which execute native Bash. No native-shell exemption
is added just to make these pass. It is not advertised as the complete suite.

Lint also checks that the ImageResponse-only image-rule exception stays narrow.

Logs/results append under ignored build/phase-c-offline; retain failed attempts.
Run one mode at a time. For diagnosis only, `pg --pg-test authored-solution-api.test.ts`
selects one existing vetted file; it does not replace the default parallel PG run. Reports distinguish offline checks from live acceptance.
No browser/deployed requests, real mail/Blob, migrations on shared DBs, GitHub
operations, release operator commands or deployment commands are provided.
