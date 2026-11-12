# P2 and legacy retirement release, 12 November 2026

Conclusion: PARTIAL. Both authorized PRs are merged and the automatic production deployment is READY at the final main SHA. Production HTTP/browser smoke testing is blocked by this executor's outbound policy, so production functionality is not certified.

## Merge and CI evidence

- PR #143 head `db2430ea8dfa6bab29dcadc83500855cf555e648`, normal guarded merge `9f2228cc2e04b498fd0d49f5f96ec53d88fd4b42`. Exact-head CI346/browser70 passed. No unresolved review threads, conflicts or extra approval requirement in active ruleset26218033.
- PR #146 head `f38df6f46ec7cdc54af038bd90a013cd0e9b65e0`, retargeted to main after #143, normal guarded merge `677ccec43b4e34ba0482c8ee514d9b3847b64cbe`. Exact-head CI348/browser72 passed. The merge candidate tree equalled the tested head tree, so no reconciliation or code change was necessary.
- Final main `677ccec43b4e34ba0482c8ee514d9b3847b64cbe` has exactly the tested #146 tree. Main CI passed: https://github.com/Physcratic/physcratic/actions/runs/43152540364.
- Repository rules require a PR, permit normal merge and require zero additional approving reviews. No bypass, force push, disabled check or direct main push was used.

## Automatic production deployment

Vercel project financial-dashboard (`prj_phm4794zl2QBICu5MMbLFxcHAfFq`), team neuterions-projects. Existing Git integration created deployment `dpl_einsxkrPEdhu4Js7GfFCmnxuepeT`, target production, source Git, state READY. Its Git SHA is the final main SHA above. Read-only deployment-alias inspection confirms physcratic.com is assigned to this deployment.

Deployment: https://vercel.com/neuterions-projects/financial-dashboard/einsxkrPEdhu4Js7GfFCmnxuepeT

The separate physcratic-integration project's main deployments are canceled, as were its earlier main deployments. It is not the project owning physcratic.com. No manual deployment, promotion, settings, credentials, grants, database, billing or README trigger operation was performed.

## Verified model and limits

The actual registry still yields12 retired identities,121 static readers and138 sitemap URLs. All12 exact redirect definitions are permanent and target `/dashboard?view=problems&collection=arena`. The revised marking guide still has reviewedBy:null. P2 source files remain intact after retargeting. Previously verified built-server evidence includes2782 SEO/redirect checks,39 guide browser checks,207 homepage browser checks and734 combined session/journey checks. These are local/pre-release results, not production smoke results.

Production smoke was attempted with Python HTTPS and Chromium/Playwright. The inherited proxy rejects the destination with tunnel403 Forbidden, and Chromium reports ERR_TUNNEL_CONNECTION_FAILED. The separate web fetch tool also reports the home, robots and sitemap URLs inaccessible. Consequently production homepage, navigation, auth-entry links, all12 redirect statuses/query precedence, retained readers, Guided exercises, canonicals, robots, sitemap exclusions and anonymous privacy smoke checks are BLOCKED/UNKNOWN, not passed.

Owner action: allow outbound HTTPS to physcratic.com in the Codex execution environment, or run the read-only smoke checklist from the authorized release request on an approved network. Test only GET/navigation, use anonymous contexts, and do not create accounts or submit answers. The production deployment is already automatic and READY, so no redeploy or paid operation is required. Verify the SHA remains the intended release before running the checks.

The inherited native IPhO2026 T1 visible source-label mismatch remains open for separate remediation. A diff against pre-release main confirms imported reader/source and Arena/corpus data were not changed by this release. The broad historical SEO audit is not claimed as passing. Google indexation, rankings and Search Console remain UNKNOWN. Pending owner editorial approval for the changed worked example remains explicit.

Release records are committed on a documentation branch for review. Main is kept at the verified release SHA. No P3 or further development phase was started.
