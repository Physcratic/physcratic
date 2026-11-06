# Physcratic — notes for Claude Code

## Working rules
- Commit straight to main, after full local CI from a clean worktree (every step in `.github/workflows/ci.yml`, with the database tests on a throwaway Postgres). Never force-push.
- Never buy anything, change a plan or seat, or redeploy a blocked commit on Vercel or any other service. Stop and ask the owner.
- Never touch the Vercel, Neon, auth, email or Blob settings, any real database, `lib/db/schema.ts`, `migrations/` or `.env` files without explicit approval for that task.
- Copy rules: no em dashes, en dashes or semicolons. Casual is fine. No aphorisms or slogans. CONTRIBUTING.md has the full list.
- Every screen passes the sweep: `SWEEP=1 node tests/solve-contrast.browser.mjs`, signed in and guest.

Next.js 15.5 App Router, TypeScript, Tailwind, shadcn/ui (components/ui), Better Auth, Drizzle + Postgres, deployed on Vercel. Package manager: pnpm. Node 22.

Read CONTRIBUTING.md before starting.

## Commands
- Unit tests: `pnpm test` (node:test via tsx over lib/*.test.ts). One file: `pnpm exec tsx --conditions=react-server --test lib/<name>.test.ts`
- Typecheck and CI steps: `.github/workflows/ci.yml` is the source of truth.
- `pnpm build` needs network: next/font downloads Inter from Google Fonts.
- Do not run tests/*.browser.mjs suites unless asked.

## Parallel work: do not edit these paths (other branches own them)
- Account: lib/auth*, lib/verification-*, lib/terms.ts, lib/signup-*, components/auth-form.tsx, components/verification-notice.tsx, components/account-nav.tsx, app/sign-in, app/sign-up, app/terms, app/api/auth
- Problem authoring: app/api/authored-problems/**, app/dashboard/author, app/dashboard/authored, components/authoring/**, components/authored/**, lib/authored-*, lib/problem-authoring*, lib/author-media*
- Coaching: app/coaching, components/coaching, lib/coaching, public/coaching (owned by the v0 coaching work, edit only when the task says so)
- Shared: lib/db/schema.ts, migrations/**, package.json, pnpm-lock.yaml, WORK_STATUS.md, ESLint config
If a task seems to need one of these, stop and say so instead of editing.

## Token hygiene
- Never open, cat or grep inside public/corpus/**, public/ipho/** or lib/corpus/translations/** unless the task names a file there. They are large generated data.
- Read the files the task names first; widen only when needed. No subagents unless asked.

## Conventions
- UI: compose components/ui primitives and theme tokens (bg-background, text-muted-foreground, border). Dark is the default theme; check light too.
- Keep the existing a11y patterns: role="status"/"alert", aria-labels on icon buttons, the skip link, visible focus.
- Pure logic gets a node:test file next to it in lib/.
- Branches: claude/<topic> while working, then fast-forward main (see Working rules). Commits: conventional (feat:, fix:, ci:, docs:, chore:).
- Record each finished task as a dated section in docs/engineering/BETA_READINESS.md, never in WORK_STATUS.md.
