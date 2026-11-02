import assert from "node:assert/strict";
import test from "node:test";
import { authoringStagingAuth, authoringStagingOrigin, isAuthoringStaging, verificationRecipient } from "./authoring-staging";
import { runtimeDatabaseOptions } from "./runtime-database";

function preview(): Record<string, string | undefined> {
  return { VERCEL: "1", VERCEL_ENV: "preview", VERCEL_PROJECT_ID: "prj_phm4794zl2QBICu5MMbLFxcHAfFq",
    VERCEL_GIT_COMMIT_REF: "codex/physcratic-authoring-completion", AUTHORING_STAGING_BLOB_ENABLED: "1",
    BETTER_AUTH_URL: authoringStagingOrigin,
    DATABASE_URL: "postgresql://physcratic_integration_app:synthetic-password@ep-green-waterfall-b7qaw260-pooler.c-13.us-east-1.aws.neon.tech/neondb?sslmode=require",
    STAGING_VERIFICATION_EMAIL_ALLOWLIST: "allowed@example.invalid, Second@example.invalid" };
}
const link = `${authoringStagingOrigin}/api/auth/verify-email?token=synthetic&callbackURL=%2Fsign-in`;
test("staging identity is explicit; normal Production and unrelated branches retain legacy policy", () => {
  assert.equal(isAuthoringStaging(preview()), true);
  const prod: Record<string, string | undefined> = { ...preview(), VERCEL_ENV: "production", AUTHORING_STAGING_BLOB_ENABLED: undefined };
  assert.equal(isAuthoringStaging(prod), false);
  assert.equal(verificationRecipient("outside@example.invalid", "https://production.invalid/link", prod), "outside@example.invalid");
  assert.deepEqual(runtimeDatabaseOptions(prod), { connectionString: prod.DATABASE_URL });
  assert.equal(authoringStagingAuth(prod), undefined);
  assert.equal(isAuthoringStaging({ ...preview(), VERCEL_GIT_COMMIT_REF: "other", AUTHORING_STAGING_BLOB_ENABLED: undefined }), false);
  for (const key of ["VERCEL", "VERCEL_ENV", "VERCEL_PROJECT_ID", "VERCEL_GIT_COMMIT_REF", "AUTHORING_STAGING_BLOB_ENABLED"]) {
    const missing = preview(); delete missing[key];
    assert.throws(() => isAuthoringStaging(missing), /configuration is unavailable/);
  }
  assert.throws(() => isAuthoringStaging({ ...preview(), VERCEL_ENV: "production" }));
  assert.throws(() => isAuthoringStaging({ ...preview(), VERCEL_GIT_COMMIT_REF: "other" }));
});
test("staging DB driver receives only the pinned endpoint and complete explicit credentials", () => {
  for (const pooled of [true, false]) {
    const env = preview();
    if (!pooled) env.DATABASE_URL = env.DATABASE_URL!.replace("-pooler", "");
    const config = runtimeDatabaseOptions(env);
    assert.equal(config.host, `ep-green-waterfall-b7qaw260${pooled ? "-pooler" : ""}.c-13.us-east-1.aws.neon.tech`);
    assert.equal(config.database, "neondb");
    assert.equal(config.user, "physcratic_integration_app");
    assert.equal(config.password, "synthetic-password");
    assert.equal("connectionString" in config, false);
    assert.deepEqual(config.ssl, { rejectUnauthorized: true });
    assert.equal(config.options, "-c search_path=public,pg_catalog");
  }
});
test("every inherited PostgreSQL alias fails before any connection and never leaks its value", () => {
  for (const key of ["DATABASE_URL_UNPOOLED", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL_NO_SSL", "POSTGRES_HOST", "POSTGRES_PASSWORD", "POSTGRES_USER", "POSTGRES_DATABASE", "PGHOST", "PGHOST_UNPOOLED", "PGUSER", "PGDATABASE", "PGPASSWORD", "PGOPTIONS", "PGSERVICE", "PGPASSFILE"]) {
    assert.throws(() => runtimeDatabaseOptions({ ...preview(), [key]: "legacy-production-credential" }), { message: "Authoring staging database is unavailable." });
    assert.ok(runtimeDatabaseOptions({ ...preview(), [key]: "" }).host);
  }
});
test("missing/incomplete/wrong-endpoint/wrong-database/non-TLS primary URL cannot fall back", () => {
  for (const url of [undefined, "", "bad", "postgresql://u:p@ep-production.aws.neon.tech/neondb?sslmode=require",
    "postgresql://u:p@ep-green-waterfall-b7qaw260.c-13.us-east-1.aws.neon.tech/other?sslmode=require",
    "postgresql://u:p@ep-green-waterfall-b7qaw260.c-13.us-east-1.aws.neon.tech/neondb",
    "postgresql://u@ep-green-waterfall-b7qaw260.c-13.us-east-1.aws.neon.tech/neondb?sslmode=require",
    "postgresql://u:p@ep-green-waterfall-b7qaw260.c-13.us-east-1.aws.neon.tech/neondb?sslmode=disable"]) {
    assert.throws(() => runtimeDatabaseOptions({ ...preview(), DATABASE_URL: url }), { message: "Authoring staging database is unavailable." });
  }
});
test("staging refuses owner credentials and any unverified hostname variant", () => {
  const good = preview().DATABASE_URL!;
  for (const value of [
    good.replace("physcratic_integration_app:", "neondb_owner:"),
    good.replace("physcratic_integration_app:", "other_role:"),
    good.replace(".c-13.us-east-1.aws.neon.tech", ".other-region.aws.neon.tech"),
    good.replace(".c-13.us-east-1.aws.neon.tech", ".c-13.us-east-1.aws.neon.tech.attacker.invalid"),
  ]) {
    assert.throws(() => runtimeDatabaseOptions({ ...preview(), DATABASE_URL: value }),
      { message: "Authoring staging database is unavailable." });
  }
});
test("only the stable staging origin is trusted; extra SDK origins and missing base fail closed", () => {
  assert.deepEqual(authoringStagingAuth(preview()), { baseURL: authoringStagingOrigin, trustedOrigins: [authoringStagingOrigin] });
  for (const value of [undefined, "", "https://production.invalid", authoringStagingOrigin + "/"])
    assert.throws(() => authoringStagingAuth({ ...preview(), BETTER_AUTH_URL: value }));
  for (const value of ["*", "https://production.invalid", `${authoringStagingOrigin},https://production.invalid`])
    assert.throws(() => authoringStagingAuth({ ...preview(), BETTER_AUTH_TRUSTED_ORIGINS: value }));
});
test("mail allows exact listed addresses, canonicalizes case, and refuses missing/malformed/wildcard lists", () => {
  assert.equal(verificationRecipient("ALLOWED@example.invalid", link, preview()), "allowed@example.invalid");
  assert.equal(verificationRecipient("second@example.invalid", link, { ...preview(), STAGING_VERIFICATION_EMAIL_ALLOWLIST: "allowed@example.invalid\nsecond@example.invalid" }), "second@example.invalid");
  for (const value of [undefined, "", " \n", "*", "@example.invalid", "allowed@example.invalid,", "not-an-email", "allowed@example.invalid,,other@example.invalid", "x".repeat(4097)])
    assert.throws(() => verificationRecipient("allowed@example.invalid", link, { ...preview(), STAGING_VERIFICATION_EMAIL_ALLOWLIST: value }), /email is unavailable/);
  for (const recipient of ["outside@example.invalid", "allowed+other@example.invalid", "allowed@example.invalid.attacker.invalid", "Allowed <allowed@example.invalid>", "allowed@example.invalid\r\nBcc:evil@example.invalid"])
    assert.throws(() => verificationRecipient(recipient, link, preview()), /email is unavailable/);
});
test("staging verification links and callbacks cannot point at Production or another deployment", () => {
  for (const url of ["bad", "https://production.invalid/api/auth/verify-email?token=x", `${authoringStagingOrigin}/other`,
    `${authoringStagingOrigin}/api/auth/verify-email?callbackURL=https%3A%2F%2Fproduction.invalid`,
    `${authoringStagingOrigin}/api/auth/verify-email?callbackURL=%2F%2Fproduction.invalid`,
    `${authoringStagingOrigin.replace("https://", "https://u:p@")}/api/auth/verify-email`])
    assert.throws(() => verificationRecipient("allowed@example.invalid", url, preview()), /email is unavailable/);
});
