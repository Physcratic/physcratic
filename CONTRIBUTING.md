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

## Size and contrast rules

Every page follows these rules, and `SWEEP=1 node tests/solve-contrast.browser.mjs` checks them at 375, 390, 768 and 1440 in light and dark:

- Text is 4.5:1 or better. Borders of inputs, buttons and other controls are 3:1 or better.
- Standalone links, buttons, inputs and disclosure summaries are at least 44px tall. Icon-only buttons are at least 44px wide too.
- One h1 per page, headings in order, and nothing scrolls sideways.

Exemption, coaching pages only (owner decision, 5 November 2026): a link inside a sentence is exempt from the 44px rule, and a decorative border on a card or container is exempt from the 3:1 rule. Standalone coaching links and controls, such as "See all" and the header and footer links, are not exempt, and a border that is the only cue for a control still needs 3:1. The sweep applies the exemption only to the coaching routes.

## Copy rules

For user-visible text:

- No em dashes, en dashes or semicolons. Use a full stop or a comma.
- Spelling: medallist, practise (the verb), honourable mention.
- Say what the page does, in plain words. Headings are short, and an intro is one functional line at most. No slogans, no aphorisms and no two-part poetic lines.
- Banned words and phrases: elegant, worth (as in "worth solving"), journey, unlock, craft, seamless, effortless, next-level, delve, elevate, game-changer, dive into, look no further.
- `lib/copy-rules.test.ts` scans every string literal and piece of JSX text in `app/` and `components/` for all of the above, so a new one fails CI. The Learn guides and `lib/coaching/content.ts` are reviewed separately.

## Problem titles

Applies to Arena problems and to the title field in Problem Studio:

- 2 to 5 words, in title case, IPhO style. Name the physics or the object.
- A pun is fine when it is still about the physics.
- No story words such as riddle, conspiracy, treaty or "that answered back". Do not hint at the answer.
- The Studio title field shows the same rule as its placeholder.

| Good | Why |
| --- | --- |
| Mind the Gap | Names the gap between the lens and the plate, and the pun is the physics |
| A GRIN and a Wiggle | Graded-index (GRIN) optics, and the rays wiggle |
| Bubbles in Contact | Names the object |
| The Moving Capacitor | Names the object and what it does |

| Not this | Why |
| --- | --- |
| The Bending Beam Riddle | Story word |
| The String That Answered Back | Story phrase |
| Deflection of a loaded beam | Too long, and reads as a sentence |

Before and after:

| Before | After |
| --- | --- |
| "Create something worth solving" / "Your next physics problem." / "Build the statement in small blocks. Keep the reasoning elegant and the answer keys private." | Title "Problem Studio" and one line: "Write a problem, add a solution, then publish." |
| "Less memorizing. More understanding." (dashboard subtitle) | "Today's problem, your rating and recommended practice." |

## Ratings and difficulty

- The four visible rating bands live in `lib/rating-bands.ts`: Beginner (0 to 800), Intermediate (801 to 1,800), Advanced (IPhO level) (1,801 to 2,600) and Mastery (2,601+). The underlying scale remains 0 to 4000, including Mastery above 3200. Retained band IDs are unchanged. The retired `fundamentals` filter preserves 0 to 199 and the older numeric filter IDs preserve their original ranges, without appearing as new choices.
- Picking a band in Problem Studio retains its existing preset (500, 1200, 2100 or 2800). Players still start at 1200. The library, badges, Studio and rating-help popover use the shared band definitions.
- A problem's rating shows with its band name, such as "2,250 · Advanced (IPhO level)". An author's estimate reads "~1,200 · Intermediate (estimate)" and stays a plain number in the existing difficulty field. It never changes a rating, result or contest.
- Answers: a student writes `ln` for the natural log and `\log_{10}`, `log10` or `log_10` for base 10. A bare `log` is refused with one message, "Write ln for the natural log, or log₁₀ for base 10." This applies to student answers and to a new key written in Problem Studio. A key that was saved earlier keeps reading `log` as `ln`.

## Production

The Vercel Hobby plan blocks deploys of commits made by anyone but the owner. After merging:

1. Check that physcratic.com has updated.
2. If it hasn't, stop and ask the Vercel owner. Do not redeploy a blocked commit, because that adds a paid seat.
