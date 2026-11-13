# Post-B6 release-engineer review

14 November 2026. Second-pass security/release review of the two bounded batches.
This records the implementing agent's challenge pass, not independent human
approval. Independent code/owner review remains a release gate. No review label
or passing local test authorizes live SQL, grants, credentials or activation.

| Failure mode | Safeguard / finding | Remaining review or evidence |
| --- | --- | --- |
| Owner binding passes every positive grant check | Source has no named Production runtime role. Audit effective ownership/membership/schema CREATE and forbidden table/column/function rights as well as allowed ones. Keep function ownership during first runtime cutover. | Actual binding unknown. A real LOGIN rehearsal proves the proposal, not live separation. |
| Existing auth breaks during role cutover | Representative actual sign-in, authoring/publish/grade and contest registration pass with existing-feature grants and minimal delta. | An injected signup credential-link failure rolls the new user back without ordinary user DELETE. No grant widening is needed for that case. Live mail, existing sessions and the actual full deployment remain owner checks. |
| Cookie changes before the UI learns a new account | Reproduced stats personalized read under the new session and first-profile creation/publication for the wrong displayed account. Both fixed with rejection-only account headers, before feature queries/quota. | Mixed old JS fails409; release code with flags OFF, verify served SHA, require reload before activation. |
| Header spoofing becomes authorization | Session identity remains the source; mismatch only rejects. Public profile reads remain a separate allowlisted projection. Origin and verified-write checks remain. | Review proxy/log handling to avoid storing stable account header IDs unnecessarily. |
| Public solves silently count wrong evidence | Existing query binds current publication/revision, supported authoritative engines, verified distinct non-author users, all parts and no assistance; fixed budget returns null. | Production volume/latency unknown. No import of local hints or saved static practice into public counts. |
| Concurrent favourite writes or unpublication | Existing desired-state uniqueness/advisory locking, publication row locks and trusted trigger totals, covered by existing CI. | Unknown acknowledgements require authoritative reload; do not blindly toggle or manually repair counts. |
| Stale consent shown as current | Text profiles private by default; authorship joins current opted-in profile. Next-read withdrawal passes actual routes. Reader freshness bounded to 15 seconds and clears on blur/hidden/error. | Collection/profile snapshots and previously copied content cannot be recalled. Owner accepts this precise contract, not an instant global revocation claim. |
| Private profile form consent crosses accounts | New own-profile guard rejects before first creation/read/limiter; client sends known displayed identity and handles ACCOUNT_CHANGED separately. | Manual two-device/session/phone journeys on exact serving configuration. |
| Missing SELECT, disabled flag or schema mismatch looks successful | Local revocation tests yield503; disabled stats route503; profile/publication fail closed. New package requires status plus authoritative state and served-config evidence. | Inspect effective Vercel scope/aliases. Saved future settings and environment presence do not establish deployment readiness. |
| Owner-only trigger routines called directly | No new EXECUTE grants in either feature delta. Definer search paths pinned, privileged erasure denied, PUBLIC boolean permit probe retained. | Inspect actual owners/ACLs/default ACLs; no automatic ownership transfer or broad REASSIGN. |
| Unqualified erasure while practice saves accumulate | Persistence/erasure code exists, but current deletion HTTP routes share the OFF flag. Practice stays blocked without a qualified delivery channel and backup facts. | Explicit owner process/values/provider evidence. No silent support-email substitute or automatic deletion activation. |
| Flag rollback mistaken for data rollback | Exposure rollback retains data and immutable history. GRANT delta is transactional, external Vercel rollout is not a database transaction. | Confirm rollback deployment/config actually serves. No down migration, counter edit, automatic restore or resurrection. |
| Version skew or concurrent work | B6 graph18 and PG18.7 used only in isolated rehearsal;0019 remains absent/actions OFF. Review final main/source and compare immutable migration bytes. | GitHub API Forbidden prevents open-PR/remote CI review here. Owner supplies exact-head CI and concurrent-work confirmation. |

## Ranked unresolved release issues

1. **All stages:** actual serving SHA/effective flags and ordinary runtime identity,
   ownership and grants remain external evidence. If owner-bound, role cutover
   must be separately approved/qualified before enabling new features.
2. **Code release:** both reproduced account-binding fixes need independent
   review, normal merge/deployment authorization and existing exact-head CI.
   This task neither merges nor deploys. GitHub API access is unavailable here.
3. **Batch A:** owner must approve its precise flag delta, global exposure,
   synthetic-write scope, privacy/support/recovery facts, observation budgets and
   tested rollback ownership. Integration's possible Deny is a separate decision.
4. **Profiles/authorship:** named abuse/takedown response and actual consent/
   withdrawal acceptance on the serving configuration. Keep images/medals/
   achievements/moderation/discussions OFF. No new storage work is needed.
5. **Practice:** qualified erasure delivery while deletion remains OFF, actual
   approved policy/service/provider/backup and restore-erasure evidence. No
   persistence algorithm defect was identified. Public deletion/discussions are
   not authorized workarounds.

## Delivery boundaries

Batch A commit contains stats account isolation, narrow permissions proposal,
metadata SQL and operator runbook. Batch B contains profile account isolation,
the profile grant proposal and next-stage/practice decision. No historical
migration, frozen B6 operator package, auth implementation, grader, schema file,
dependency manifest or feature-selection rule was rewritten.

GO for owner/code review of these prepared packages. NO-GO for all live
activations until their stated evidence and separate approvals close. Saved
practice and discussions have additional explicit gates. No third engineering
batch, speculative feature or broad CI replacement is proposed.

## Recorded focused results

- Disposable PG18.7 real-LOGIN/actual-route rehearsal: **5/5 pass**, no skips.
  Includes new account guards, representative existing routes, signup-link fault
  rollback without user DELETE, actual profile consent/withdrawal, metadata SQL,
  privilege denials and missing-rights failure.
- Targeted no-DB account guards and profile client conflict handling: **3/3 pass**.
- ESLint on changed implementation/test files: zero warnings/errors.
- Full unit, integration, browser, typecheck and build suites were not repeated.
  Exact-head GitHub CI and independent review remain external release evidence.
- Canonical SQL and frozen B6 package integrity are compared with base main
  before delivery. No live environment has been probed or changed.
