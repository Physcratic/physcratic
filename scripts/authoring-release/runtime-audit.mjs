// Pure in-memory audit. No network, DB, SDK, secret hashes or credential output.
const endpoint = "ep-green-waterfall-b7qaw260";
const origin = "https://financial-dashboard-git-codex-physcr-54d12a-neuterions-projects.vercel.app";
const urlKeys = ["DATABASE_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL", "POSTGRES_URL_NON_POOLING", "POSTGRES_URL_NO_SSL", "POSTGRES_PRISMA_URL"];
export function binding(value) {
  if (!value) return { present: false };
  try {
    const url = new URL(value);
    const found = url.hostname.match(/^(ep-[a-z0-9-]+?)(-pooler)?\./);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !found || !url.hostname.endsWith(".neon.tech")) return { present: true, parseable_neon_binding: false };
    return { present: true, parseable_neon_binding: true, endpoint_id: found[1], pooled: Boolean(found[2]),
      expected_endpoint: found[1] === endpoint, database_is_neondb: decodeURIComponent(url.pathname) === "/neondb", credentials_present: Boolean(url.username && url.password), tls_mode_valid: ["require", "verify-full"].includes(url.searchParams.get("sslmode")) };
  } catch { return { present: true, parseable_neon_binding: false }; }
}
export function auditRuntime(preview, production) {
  const aliases = Object.fromEntries(urlKeys.map(key => [key, binding(preview[key])]));
  const productionBinding = binding(production.DATABASE_URL);
  const hostAliases = Object.fromEntries(["PGHOST", "PGHOST_UNPOOLED", "POSTGRES_HOST"].map(key => {
    const value = preview[key];
    return [key, value ? binding(`postgresql://placeholder:placeholder@${value}/neondb`) : { present: false }];
  }));
  const potentiallyExposed = [...Object.entries(aliases), ...Object.entries(hostAliases)].filter(([, value]) => value.present && !value.expected_endpoint).map(([key]) => key);
  const otherCredentials = Object.keys(preview).filter(k => /^(PG|POSTGRES_)/.test(k) && !urlKeys.includes(k) && !Object.hasOwn(hostAliases, k));
  const known = new Set([...urlKeys, ...Object.keys(hostAliases), ...otherCredentials]);
  const unknownAliases = Object.keys(preview).filter(k => /DATABASE|POSTGRES|^PG[A-Z_]/.test(k) && !known.has(k));
  const stagingIdentity = preview.VERCEL === "1" && preview.VERCEL_ENV === "preview" &&
    preview.VERCEL_PROJECT_ID === "prj_phm4794zl2QBICu5MMbLFxcHAfFq" &&
    preview.VERCEL_GIT_COMMIT_REF === "codex/physcratic-authoring-completion" && preview.AUTHORING_STAGING_BLOB_ENABLED === "1";
  const stagingAuthValid = stagingIdentity && preview.BETTER_AUTH_URL === origin &&
    (!preview.BETTER_AUTH_TRUSTED_ORIGINS || preview.BETTER_AUTH_TRUSTED_ORIGINS === origin);
  const blockedAliases = Object.keys(preview).filter(key => Boolean(preview[key]) && /^(PG[A-Z_0-9]*|POSTGRES(?:_|$)|DATABASE_URL_)/.test(key)).sort();
  return {
    deployment_identity: { vercel: preview.VERCEL === "1", preview: preview.VERCEL_ENV === "preview",
      project_matches: preview.VERCEL_PROJECT_ID === "prj_phm4794zl2QBICu5MMbLFxcHAfFq",
      branch_matches: preview.VERCEL_GIT_COMMIT_REF === "codex/physcratic-authoring-completion",
      node_env_is_production: preview.NODE_ENV === "production" },
    preview_binding: aliases.DATABASE_URL, production_binding: productionBinding,
    distinct_endpoints: Boolean(aliases.DATABASE_URL.parseable_neon_binding && productionBinding.parseable_neon_binding && aliases.DATABASE_URL.endpoint_id !== productionBinding.endpoint_id),
    auth_secrets_present_and_different: Boolean(preview.BETTER_AUTH_SECRET && production.BETTER_AUTH_SECRET && preview.BETTER_AUTH_SECRET !== production.BETTER_AUTH_SECRET),
    aliases, host_aliases: hostAliases, non_target_or_unverifiable_aliases: potentiallyExposed,
    additional_credential_names_requiring_binding_review: otherCredentials, unknown_database_alias_names: unknownAliases,
    auth_base_matches: preview.BETTER_AUTH_URL === origin, site_base_matches: preview.NEXT_PUBLIC_SITE_URL === origin,
    effective_trusted_origins: stagingAuthValid ? [origin] : [],
    staging_auth_configuration_valid: stagingAuthValid,
    nonempty_aliases_blocking_staging_database: blockedAliases,
    staging_database_configuration_valid: Boolean(stagingIdentity && aliases.DATABASE_URL.expected_endpoint && aliases.DATABASE_URL.database_is_neondb && aliases.DATABASE_URL.credentials_present && aliases.DATABASE_URL.tls_mode_valid && blockedAliases.length === 0),
    trusted_origin_calculation_scope: "reviewed local staging code; invalid identity/origin configuration refuses startup; deployment SHA must be verified separately",
    staging_blob_enabled: preview.AUTHORING_STAGING_BLOB_ENABLED === "1", staging_blob_store_matches: preview.AUTHORING_STAGING_BLOB_STORE_ID === "store_3XHvtHs2UM4ZFD5d",
    legacy_blob_token_present: Boolean(preview.BLOB_READ_WRITE_TOKEN),
    email_allowlist_present: Boolean(preview.STAGING_VERIFICATION_EMAIL_ALLOWLIST),
    application_email_allowlist_enforced: true,
    application_email_allowlist_scope: "reviewed local code, exact authoring Preview only; verify deployed SHA before sending",
    mail_recipient_restriction_status: "server-side exact-recipient check before Resend; missing/empty/malformed list refuses delivery; effective values and deployed SHA still require operator verification",
  };
}
