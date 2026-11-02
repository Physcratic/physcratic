# Smoke tests and deploy alerts

## What runs and when

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `.github/workflows/smoke.yml` | Vercel's `repository_dispatch` events `vercel.deployment.success` and `vercel.deployment.ready`, or a manual run | Runs `scripts/smoke.mjs` against the deployment URL and posts a commit status named "Smoke tests" on the deployed commit, so it shows on the PR. |
| `.github/workflows/deploy-watch.yml` | Push to `main`, and any commit status event | On a push it polls the commit status "Vercel – financial-dashboard" once a minute for up to 20 minutes. If it fails, errors, or never appears, it opens an issue. When the status is `success` (on the push, or later on a status event for a commit already on `main`), it closes the open `deploy-blocked` issues whose commit is that commit or one of its ancestors, with the comment "Live in `<short sha>`." (`scripts/close-deploy-blocked.sh`). |

Both workflows run from the default branch, so edits to them only take effect once merged. Neither is a required check.

### Which deployments

Vercel does not create GitHub deployments for this repository, so there are no `deployment_status` events. Vercel's GitHub integration sends `repository_dispatch` events instead (schema: `github.com/vercel/repository-dispatch`, `packages/repository-dispatch/src/data`). `smoke.yml` listens for two of them: `vercel.deployment.success` (built and promoted to production) and `vercel.deployment.ready` (built, not promoted, which is how previews arrive). A production deployment can send both, so each type only counts for its own environment: `ready` when `client_payload.environment` is `preview`, `success` when it is `production`. One deployment starts one run. It reads these `client_payload` fields:

| Field | Used for |
| --- | --- |
| `client_payload.project.name` | Only `financial-dashboard` runs. `physcratic-integration` is ignored. |
| `client_payload.environment` | `production` runs the production checks. Anything else is a preview. |
| `client_payload.git.ref` | A ref that starts with `codex/` is skipped (below). |
| `client_payload.git.sha` | The commit that gets the "Smoke tests" status. A `repository_dispatch` run itself checks out the latest commit on `main`. |
| `client_payload.url` | The base URL to test. `https://` is added when it is missing. |

The payload's host must be a `*.vercel.app` host or `physcratic.com`, because anyone with write access can send a `repository_dispatch` and the bypass secret goes to the host. Anything else fails the "Work out what to test" step.

**Previews of `codex/` branches are skipped** (`client_payload.git.ref` starts with `codex/`). Those previews use the staging database, and the authoring team requires CI to stay isolated from it, so the smoke tests must not send requests to them. The run logs "Skipped: codex branch preview" and posts no "Smoke tests" status for that commit. A manual run ("Run it by hand on a preview") is still allowed, because someone chose that URL.

### Preview deployments and the bypass secret

Deployments on `*.vercel.app` URLs sit behind Vercel Deployment Protection, previews and the production deployment's own URL alike (the project protects everything except custom domains). The repository secret `VERCEL_AUTOMATION_BYPASS_SECRET` (Vercel, Project Settings, Deployment Protection, Protection Bypass for Automation) is sent as the `x-vercel-protection-bypass` header. A run against a `vercel.app` URL without it fails with a message saying so. A manual run against `physcratic.com` needs no secret.

### How to confirm it works on the next deploy

1. Push a commit or open a PR from a branch that does not start with `codex/`, and wait for the Vercel build to finish.
2. GitHub, Actions, "Smoke tests". A new run should appear with the event `repository_dispatch` within a minute of the build finishing (the first run ever means the trigger works). The run title shows the event, and its summary lists every check.
3. The PR (or the commit) gets a "Smoke tests" status: pending while it runs, then success or failure, with a link to the run.
4. In the run, the "Work out what to test" step logs `Testing https://... as preview (URL from the payload url)`. After a production deploy it says `as production`.
5. Push a branch called `codex/anything`: an "Skipped codex preview" job runs and prints "Skipped: codex branch preview", and no "Smoke tests" status is posted.
6. If no run appears at all, Vercel is not sending the event. Check Vercel, Project Settings, Git, that the GitHub integration is connected, and whether the project has an option for `repository_dispatch` events (the exact name is not something this repository can read). A blocked deployment (Hobby plan) never reaches `ready` or `success`, so it sends no event either.

### Blocked production deploys

On the Vercel Hobby plan, a commit made by anyone but the owner is blocked and Vercel posts a `failure` status ("Deployment was blocked"). `deploy-watch.yml` then opens the issue "Production deploy did not go live for `<short sha>`" with the label `deploy-blocked`. The Vercel owner opens the blocked deployment and clicks Redeploy. One issue per SHA, open or closed. The workflow run is also marked failed so it is visible in the Actions tab.

## Checks

Each prints one `PASS`, `FAIL` or `SKIP` line. Any `FAIL` makes the script exit 1.

- `/` answers 200, or redirects to `/dashboard` which answers 200
- `/dashboard` answers 200 and has a `<title>` inside `<head>`
- `/dashboard/problems/incline` answers 200 and its `<head>` has a title, a canonical link and `og:image`
- `/coaching` answers 200
- `/learn` answers 200 and its `<head>` has a title and a canonical link. Any JSON-LD on it must parse
- The first guide that `/learn` links to answers 200, its `<head>` has a title and a canonical link, and it has at least one JSON-LD block, and every block parses
- `/coaching/consultation` and `/coaching/become-a-tutor` answer 200, and each links to `https://tally.so/`
- `/sign-in` answers 200 in production. It is a SKIP on a preview, where the sign-in page can need setup the preview lacks
- `/this-page-does-not-exist` answers 404 and contains "Page not found"
- `/sitemap.xml` answers 200 with an xml content type, no raw `&` outside an entity, at least 20 `<loc>` entries, all starting with `https://physcratic.com`
- `/robots.txt`: preview contains `Disallow: /`. Production contains `Sitemap: https://physcratic.com/sitemap.xml` and no bare `Disallow: /` line
- `/llms.txt` answers 200 and is under 5 KB
- `/manifest.webmanifest` is JSON with a `name`
- `/opengraph-image` answers 200 as `image/png`
- `/api/health` answers 200 with `ok: true`. A 404 is a SKIP ("arrives in Batch 7")

Redirects are not followed (except the one allowed for `/`), so a redirect shows up as a failure. Requests send the User-Agent `PhyscraticSmoke/1.0 (+https://physcratic.com)`. `next.config.ts` sets `htmlLimitedBots` to match every User-Agent, so metadata is always rendered into `<head>`. Override the User-Agent with `SMOKE_USER_AGENT`.

## Run it locally

```bash
SMOKE_ENV=production node scripts/smoke.mjs https://physcratic.com
```

For a preview, set `SMOKE_ENV=preview` and `VERCEL_AUTOMATION_BYPASS_SECRET`.

## Run it by hand on a preview

GitHub, Actions, "Smoke tests", Run workflow. Choose the branch `main`, paste the preview URL into `base_url`, leave `env` as `preview`, and press Run workflow. Manual runs write the results to the step summary and post no commit status.

## Add a check

In `scripts/smoke.mjs`, add an object to the `checks` array:

```js
{
  name: '/path',
  async run() {
    const res = await get('/path')
    expectStatus(res, 200)
    if (!res.text.includes('something')) fail('missing something')
    return '200 with something' // the PASS detail
  },
},
```

Throw with `fail(...)` to fail, or `throw new Skip('reason')` to skip. Update the list above.
