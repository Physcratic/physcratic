# Contributing to Physcratic

This guide is for people and for AI tools (Claude Code, Codex, v0). Claude Code also reads [CLAUDE.md](CLAUDE.md), which lists the commands and conventions.

## Golden rules

1. Always start from the latest `main`. Run `git fetch origin` first, then branch from `origin/main`.
2. Never build on an old branch. A `v0/*` branch more than a day behind `main` counts as old. v0 users start a new v0 chat from `main` instead.
3. One feature per PR. Small PRs get reviewed faster.
4. Don't edit another area's paths without asking its owner. If your task seems to need them, stop and ask.

## Ownership

| Area | Paths | Owner |
| --- | --- | --- |
| Accounts | `lib/auth*`, `lib/verification-*`, `lib/terms.ts`, `lib/signup-*`, `components/auth-form.tsx`, `components/verification-notice.tsx`, `components/account-nav.tsx`, `app/sign-in`, `app/sign-up`, `app/terms`, `app/api/auth` | TBD |
| Problem authoring | `app/api/authored-problems/**`, `app/dashboard/author`, `app/dashboard/authored`, `components/authoring/**`, `components/authored/**`, `lib/authored-*`, `lib/problem-authoring*`, `lib/author-media*` | TBD |
| Practice UI | `components/physics/**`, `components/kokonutui/sidebar.tsx`, `components/kokonutui/content.tsx`, `components/ui/**`, `app/globals.css`, `app/dashboard/problems/[id]/page.tsx`, `app/api/submissions` | TBD |
| Coaching | `app/coaching`, `components/coaching`, `lib/coaching`, `public/coaching` | TBD |
| Shared | `lib/db/schema.ts`, `migrations/**`, `package.json`, `pnpm-lock.yaml`, `WORK_STATUS.md`, ESLint config | TBD |

Reviewers can be requested automatically per path. See [.github/CODEOWNERS](.github/CODEOWNERS).

## Shared files

Shared files are `lib/db/schema.ts`, `migrations/`, `package.json` and `pnpm-lock.yaml`. Any change to them needs a line in the PR description saying what changed and why.

Before you create a migration, check the open PRs for the next free number. Numbers 0005 and 0006 are taken by PR #27. Two PRs with the same number will conflict.

## Quality gates

- CI is green.
- Run `pnpm build` locally for config, font or dependency changes. It needs network access because `next/font` downloads Inter.
- Check the Vercel preview on a phone.
- Smoke tests are green, once they exist.

The [PR template](.github/pull_request_template.md) has a checklist for all of this.

## Copy rules

For user-visible text:

- No em dashes, en dashes or semicolons. Use a full stop or a comma.
- Spelling: medallist, practise (the verb), honourable mention.
- Say what the page does, in plain words. Headings are short, and an intro is one functional line at most. No slogans, no aphorisms and no two-part poetic lines.
- Banned words and phrases: elegant, worth (as in "worth solving"), journey, unlock, craft, seamless, effortless, next-level, delve, elevate, game-changer, dive into, look no further.
- `lib/copy-rules.test.ts` scans every string literal and piece of JSX text in `app/` and `components/` for all of the above, so a new one fails CI. The Learn guides and `lib/coaching/content.ts` are reviewed separately.

Before and after:

| Before | After |
| --- | --- |
| "Create something worth solving" / "Your next physics problem." / "Build the statement in small blocks. Keep the reasoning elegant and the answer keys private." | Title "Problem Studio" and one line: "Write a problem, add a solution, then publish." |
| "Less memorizing. More understanding." (dashboard subtitle) | "Today's problem, your rating and recommended practice." |

## Production

The Vercel Hobby plan blocks deploys of commits made by anyone but the owner. After merging:

1. Check that physcratic.com has updated.
2. If it hasn't, stop and ask the Vercel owner. Do not redeploy a blocked commit, because that adds a paid seat.
