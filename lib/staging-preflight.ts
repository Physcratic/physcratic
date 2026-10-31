// Pure validation; callers supply ONLY the explicitly selected environment file.
export function validateStagingEnvironment(env: Record<string,string|undefined>) {
  const required = ["DATABASE_URL","BETTER_AUTH_SECRET","BETTER_AUTH_URL","NEXT_PUBLIC_RECAPTCHA_SITE_KEY","RECAPTCHA_SECRET_KEY","RECAPTCHA_ALLOWED_HOSTNAMES","RESEND_API_KEY","RESEND_EMAIL_DOMAIN","STAGING_VERIFICATION_EMAIL_ALLOWLIST","EXPECTED_STAGING_DB_HOST","EXPECTED_STAGING_DB_NAME","EXPECTED_STAGING_DB_ROLE"];
  for (const name of required) if (!env[name]?.trim() || /\[SENSITIVE\]|\[REDACTED\]|<[^>]+>|PLACEHOLDER/i.test(env[name]!)) throw new Error(`Missing or placeholder configuration: ${name}`);
  if (env.VERCEL_ENV !== "preview" || env.DEPLOYMENT_STAGE !== "staging") throw new Error("Explicit Preview/staging selection required");
  let db: URL, origin: URL;
  try { db = new URL(env.DATABASE_URL!); origin = new URL(env.BETTER_AUTH_URL!); } catch { throw new Error("Invalid staging URL configuration"); }
  if (!["postgres:","postgresql:"].includes(db.protocol) || !db.password || !db.username || db.searchParams.has("host") || db.searchParams.has("service") || [...db.searchParams.keys()].some(key => !["sslmode","channel_binding","application_name"].includes(key))) throw new Error("Ambiguous database connection configuration");
  if (/\[SENSITIVE\]|\[REDACTED\]|PLACEHOLDER/i.test(decodeURIComponent(db.username+db.password+db.pathname))) throw new Error("Placeholder database identity");
  if (db.hostname !== env.EXPECTED_STAGING_DB_HOST || decodeURIComponent(db.pathname.slice(1)) !== env.EXPECTED_STAGING_DB_NAME || decodeURIComponent(db.username) !== env.EXPECTED_STAGING_DB_ROLE) throw new Error("Staging database identity configuration mismatch");
  if (origin.origin !== "https://staging.physcratic.com" || origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password) throw new Error("Expected exact staging origin");
  if (env.BETTER_AUTH_SECRET!.length < 32) throw new Error("Auth signing secret is too short");
  if (env.RECAPTCHA_ALLOWED_HOSTNAMES!.split(",").map(x=>x.trim()).some(x=>x!==origin.hostname)) throw new Error("Staging CAPTCHA hostname mismatch");
  // Independent host/name/role attestations must come from Neon metadata, not the URL itself.
  return { connectionString: env.DATABASE_URL!, database: env.EXPECTED_STAGING_DB_NAME!, role: env.EXPECTED_STAGING_DB_ROLE! };
}
