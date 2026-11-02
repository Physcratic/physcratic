# Smoke tests and deploy alerts

## What runs and when

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `.github/workflows/smoke.yml` | A Vercel deployment succeeds (`deployment_status`), or a manual run | Runs `scripts/smoke.mjs` against the deployment URL and posts a commit status named "Smoke tests" on the deployed commit, so it shows on the PR. |
| `.github/workflows/deploy-watch.yml` | Push to `main`, and any commit status event | On a push it polls the commit status "Vercel – financial-dashboard" once a minute for up to 20 minutes. If it fails, errors, or never appears, it opens an issue. When the status is `success` (on the push, or later on a status event for a commit already on `main`), it closes the open `deploy-blocked` issues whose commit is that commit or one of its ancestors, with the comment "Live in `<short sha>`." (`scripts/close-deploy-blocked.sh`). |

Both workflows run from the default branch, so edits to them only take effect once merged. Neither is a required check.

### Which deployments

`smoke.yml` only runs when the deployment state is `success` and the environment name contains `financial-dashboard`. The `physcratic-integration` project is ignored. The environment is `production` when the name starts with "Production", otherwise `preview`.

### Preview deployments and the bypass secret

Previews sit behind Vercel Deployment Protection. The repository secret `VERCEL_AUTOMATION_BYPASS_SECRET` (Vercel, Project Settings, Deployment Protection, Protection Bypass for Automation) is sent as the `x-vercel-protection-bypass` header. A preview run without it fails with a message saying so. Production runs send it only if it is set.

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
