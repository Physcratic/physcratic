# Proposed draft PR

Title: Complete authored problem MVP: explicit solutions, library discovery and release hardening

Base: main
Head: codex/physcratic-authoring-completion
Draft: true

## Problem and resulting behavior

Published authored problems now appear in the existing library with bounded
public metadata search, exact filters and stable UUID pagination. Students open
the current revision, submit numeric/symbolic/manual answers and review immutable
own history. Worked solutions stay private until the author explicitly approves
an immutable part/media set and a verified student deliberately requests it.
Later new attempts are server-marked assisted; original attempts/retries retain
their original outcomes and assistance flags. Revocation, expiry and unpublication
deny future solution/media access.

## Scope and integration

Preserves completed6C-A/6C-B/7/8A and latest main's CI, Analytics, feedback and SEO.
Adds migrations0005 (permissions/reveal/assistance) and0006 (discovery indexes),
without changing0001–0004 or applying any shared migration. Privacy serializers,
private media proxies, account/revision guards and legacy archive/practice remain
intact. Pinned lint tooling/local licensed Inter and corpus seed reproduction
repair remove inherited blockers. No new social/contest/rating/payment features.

Phase8B adds read-only independent audits and gated release/migration runbooks;
only source correction is typing three incoming SEO test casts to restore lint.
One readiness-log merge conflict retained both sides. No rebase/force push.

## Validation

Node22/pnpm10 frozen install, typegen/TypeScript, zero-warning ESLint and actual
production build pass. Full merged PG17 suite252/252,0 failures/skips/TODOs.
Independent security83/83 and migration51/51; exact0001→0006/empty reverse/down/up
preserves legacy sentinels. Browser final outcomes are recorded in
AUTHORING_RELEASE_READINESS.md. Initial local disk-exhaustion attempts are not
counted as passes. Harnesses inject sessions and memory storage, not live login
or private Blob. Phase8A CI41208646313 verified; require fresh final-SHA CI.

## Release gates — do not merge or deploy automatically

Draft review can proceed, but controlled live staging is BLOCKED until the
financial-dashboard→Physcratic mapping, exact isolated Neon/Blob/auth/mail scope,
remote ledger/schema/backup and final CI are verified. Provider deployment READY/
Preview is user-reported; GitHub confirms its old-SHA Vercel status association,
not runtime readiness. Live auth/mail/origin and real Blob checks follow only
under separate staging-write authorization. No shared DB/user/storage/env write,
manual deployment or merge performed. No auto-merge.

See AUTHORING_RELEASE_READINESS.md, AUTHORING_RELEASE_RUNBOOK.md and
AUTHORING_RELEASE_BLOCKERS.md for checksums, policy limits and recovery gates.
Do not run destructive DOWN against retained history; prefer disabling exposure
and reviewed forward recovery. PR/merge approval is not migration/deploy approval.
