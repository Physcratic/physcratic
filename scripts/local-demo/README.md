# Local demo

Uses the existing application backend with a persistent disposable PostgreSQL database on port 55432. Requires Node, pnpm 10.34.9 and Docker Desktop using its local default context. Run from a clean worktree without environment files from another deployment.

```powershell
.\scripts\local-demo\start.ps1
```

Open http://localhost:3000/sign-in. All three seeded accounts use `Physcratic-demo-2026!`:

| Email | Permission |
| --- | --- |
| user@example.invalid | Ordinary verified user |
| moderator@example.invalid | Community moderator |
| admin@example.invalid | Community admin and contest admin |

Test /dashboard, /dashboard/author, /admin/moderation and /admin/verification. Sign out between accounts, or use separate browser profiles. Student access to staff endpoints must be refused.

With the app running, check real HTTP login, sessions, logout and moderation role boundaries from another terminal:

```powershell
node scripts/local-demo/check.mjs
```

The setup applies the repository's existing migrations to an empty demo database and reuses its baseline fixture schema and restricted runtime grants. It never reads an inherited DATABASE_URL, changes live settings or creates a role-switching endpoint. Repeated starts preserve demo data.

Limits: not yet runtime verified. Email is captured in process memory, so no messages reach an inbox. Seeded accounts are already verified. Signup still requires real CAPTCHA configuration and is not part of this demo. Private file uploads and medal proof uploads still require their storage integration. Account deletion is not enabled. Empty moderation queues need test activity to populate them. This is a functional local environment, not evidence of production permission parity.

To stop the app press Ctrl+C. To stop the database while preserving data:

```powershell
docker --context default compose -f scripts/local-demo/compose.yaml stop
```

No commits or deployment are performed by these commands. The generated .env.demo is ignored by Git.

## Precompile Local Pages

The demo launcher now warms every page route template, dashboard view and shared read API after startup. Next generates the page JS/CSS bundles during compilation. Warm routes stay in the development cache for an hour. To warm an already running demo manually:

```powershell
node scripts/local-demo/warm.mjs
```

Dynamic routes use representative sample URLs. An empty fixture can return 404 after its route has compiled. The script signs in only as the disposable local user/admin fixtures and signs out its temporary sessions afterward. No user work is submitted. Editing a route or restarting Next can still require recompilation.

The default pass requests each route once and lets Next generate its bundles. It uses one worker to keep compiler load bounded. Add --include-bundles only when explicit JS/CSS download checks are needed.

