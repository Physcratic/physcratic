# Historical Phase B versus released main

All 23 cases remain **NOT TESTED live in this task**. Existing release evidence belongs to PR27
Preview commit `2c35d61a5fcf6680a4054380a4bfcff1b71bc9e6`, one actor,
not the old isolated integration deployment. Coverage labels describe relevant proofs,
not whole-case live PASS. Test file stems below are under `lib/` unless stated.

| Case | Scope | Classification | Existing/new proof and remaining limits |
|---|---|---|---|
| A01 | Offline regressions | Improved | terms; verification-email; numeric/symbolic grading; author-media-storage. No CAPTCHA implementation on main; old fixture/schema framework redundant. |
| B01 | Deployment/resource identity | Live required | authoring-staging; runtime-database transport guards. No fresh provider metadata or live DB inspection in this task. |
| B02 | Protection, public rendering and routing | Partial live evidence | tests/auth-form; dashboard-route; submission-security. PR27 signup/author flow documented; exact old Preview protection requires separate proof. |
| B03 | Public authored and legacy metadata | Partial live evidence | authored-library; problem-authoring-api; authored-attempt-api. Authored discovery/read/unpublish documented; old metadata target not rerun. |
| C01 | Terms/CAPTCHA rejection | Improved / missing CAPTCHA | terms; staging-auth-review new rejection subtest. No account/mail for invalid consent tested on disposable PG. CAPTCHA absent on released main. |
| C02 | Signup and audit fields | Partial live evidence / missing CAPTCHA | staging-auth-review. Real Terms/signup documented; token replay/action/score/hostname cannot be claimed. |
| C03 | Email verification | Improved / partial live evidence | staging-auth-review; verification-email new provider failure tests. PR27 real allowed email click documented. Current provider scope/allowlist still needs attestation. |
| C04 | Session login/logout/cookies | Partial live evidence | staging-auth-review; auth-form. Local verify/no-autologin/explicit signin; PR27 login/logout. Exact deployed cookie behavior requires browser. |
| C05 | Second user and enumeration | Live required | staging-auth-review; owner/API tests. Release used one verified actor; no live two-user claim. |
| C06 | Owner draft CRUD/isolation | Automated / partial live evidence | problem-authoring-api. Strong disposable PG owner-negative coverage; live single-owner creation documented. |
| C07 | Autosave and optimistic conflict | Automated / partial live evidence | problem-authoring-api; problem-authoring-editor. DB version races tested; live autosave/reload documented, two-tab live conflict not established. |
| C08 | Interrupted save and recovery | Automated / live required | problem-authoring-editor; tests/problem-authoring.browser.mjs. Unit recovery state covered. Browser harness not executed here. |
| C09 | Private media upload/read | Automated / partial live evidence | author-media-api; author-media-storage. Release OIDC private statement/solution bytes documented; live cross-user negative still separate. |
| C10 | Origin, owner and secret DTO boundaries | Automated / partial live evidence | problem-authoring-api; author-media-api; authored-solution-api. Release guest denials documented; two-user live boundary remains untested. |
| C11 | Publish immutable revisions/visibility | Automated / partial live evidence | problem-authoring-api; authored-library; authored-attempt-api; authored-solution-api. Release one retained revision; historical requirement for two revisions not satisfied by that evidence. |
| C12 | Draft delete | Automated | problem-authoring-api. Local delete/access controls. Exact old scratch fixture not executed. |
| C13 | Media deletion/retention | Automated | author-media-api. Local explicit delete/retention/failure/race tests; no remote cleanup performed. |
| C14 | Legacy practice idempotency/history | Automated / live required | practice; individual-rating.integration; submission-security. Authored attempts now also covered. Live legacy fixture unavailable in release evidence. |
| C15 | Legacy submission persistence | Automated / live required | individual-rating.integration; submission-request; authored-attempt-api. Released authored transport adds grading/attempts; do not replace historical legacy-route assertions with its PASS. |
| B04 | DB identity/schema/grants correlation | Automated / live required | authoring-migration-upgrade; individual-rating.integration; API PG fixtures. Fresh disposable upgrade/rollback/grants only. No shared ledger queried or modified. |
| C16 | Login rate limiting/recovery | Partial automated / live required | staging-auth-review. Local signup throttle tested. Main limiter memory default; cross-instance persistence not proven. |
| C17 | Unpublish and retained history | Automated / partial live evidence | problem-authoring-api; authored-library; authored-attempt-api; authored-solution-api; author-media-api. Release unpublish removes discovery/read; retains revision/attempts/media. Old two-revision budget not executed. |
| B05 | Cleanup/accounting | Partial live evidence | local cluster finally; release retained-fixture notes. All local cluster data removed. Release retains its own fixture set, not old Phase B expected counts. |
