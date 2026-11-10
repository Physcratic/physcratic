# Local UI development without production credentials

Use Node 22 and pnpm 10. Work in a clean checkout of codex/ui-overhaul.
Do not copy a production environment file or pull Vercel environment variables.

## Local environment

Create an ignored .env.local in the repository root:

```dotenv
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:local-dev-only@127.0.0.1:54329/physcratic_dev
# Replace this placeholder with a newly generated local secret.
BETTER_AUTH_SECRET=REPLACE_WITH_A_NEW_LOCAL_SECRET
# Capture account email in process memory. Does not send through Resend.
AUTH_EMAIL_TRANSPORT=memory
```

Generate the local secret with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Leave VERCEL*, V0_*, AUTHORING_STAGING*, RESEND*, BLOB_READ_WRITE_TOKEN and production provider credentials unset.
Use a clean terminal without inherited production DATABASE_URL or PG* variables.
The repository already ignores .env* files. Never commit .env.local.

## Optional local database

For database-backed screens, create a dedicated local database:

```sh
docker run --name physcratic-ui-dev -e POSTGRES_PASSWORD=local-dev-only -e POSTGRES_DB=physcratic_dev -p 127.0.0.1:54329:5432 -d postgres:18.6-alpine
```

This creates an empty database, not an initialized application schema or test account.
Do not import production data. Schema initialization and synthetic account seeding must be prepared and verified against the current migration requirements before using signed-in screens.
The existing scripts/test-problem-authoring.sh separately provisions a disposable database for tests and must not be treated as a persistent development database.

## Run

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000 for the guest interface.
Public static content can be inspected without a production account. Database-backed routes require the initialized local database.

## Current limitations

This configuration is a starting point, not a verified full local account setup.

- Signup currently requires valid reCAPTCHA configuration. Arbitrary local strings cannot replace provider keys.
- Verification email can be captured with the existing memory transport, but no browser-accessible local mailbox has been provided. A separate Node process cannot read the running server's in-memory outbox.
- Development auth currently specifies secure SameSite=None cookies for v0 previews. Local HTTP session behaviour needs verification and potentially a localhost-only configuration correction.
- Private media needs separate development storage or synthetic fixtures. Production Blob credentials are unnecessary for a guest UI preview.
- Production feature gates stay unchanged. Do not enable gated community or persistence features merely to preview the UI.

Before claiming signed-in local development is ready, initialize only the local schema, seed synthetic accounts, verify local cookies and test a complete signed-in flow. Never weaken production signup or verification to achieve this.
