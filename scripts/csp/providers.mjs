// Offline preflight only. Does not call providers, open a database, send mail,
// create an account, provision resources or execute a migration.
const required = {
  auth: ['X3C_AUTH_DATABASE_URL', 'X3C_AUTH_SECRET'],
  recaptcha: ['X3C_RECAPTCHA_SITE_KEY', 'X3C_RECAPTCHA_SECRET_KEY', 'X3C_RECAPTCHA_ALLOWED_HOSTNAME'],
  resend: ['X3C_RESEND_API_KEY', 'X3C_RESEND_EMAIL_DOMAIN', 'X3C_MAIL_RECIPIENT'],
  blob: ['X3C_BLOB_READ_WRITE_TOKEN', 'X3C_BLOB_STORE_ISOLATION_ACK'],
  analytics: ['X3C_VERCEL_PROJECT_ID', 'X3C_ANALYTICS_READ_ACCESS_ACK'],
};
/** @param {Record<string, string | undefined>} [env] */
export function providerReadiness(env = process.env) {
  const blockers = [];
  if (env.X3C_DISPOSABLE_RESOURCES_ACK !== 'reviewed-disposable-only') blockers.push('DISPOSABLE_RESOURCES_NOT_ATTESTED');
  if (env.X3C_PROVIDER_EGRESS_ACK !== 'reviewed-provider-egress') blockers.push('PROVIDER_EGRESS_NOT_APPROVED');
  let origin;
  try {
    origin = new URL(env.X3C_PROVIDER_ORIGIN);
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash || origin.hostname === 'physcratic.com' || origin.hostname.endsWith('.physcratic.com') || origin.hostname.startsWith('financial-dashboard-')) throw Error();
  } catch { blockers.push('ISOLATED_HTTPS_ORIGIN_REQUIRED'); }
  if (env.X3C_VERCEL_PROJECT_ID === 'prj_phm4794zl2QBICu5MMbLFxcHAfFq') blockers.push('PRODUCTION_PROJECT_REJECTED');
  if (env.X3C_RESEND_EMAIL_DOMAIN?.toLowerCase().endsWith('physcratic.com')) blockers.push('PRODUCTION_MAIL_DOMAIN_REJECTED');
  if (env.X3C_BLOB_STORE_ISOLATION_ACK && env.X3C_BLOB_STORE_ISOLATION_ACK !== 'distinct-disposable-private-store') blockers.push('BLOB_ISOLATION_NOT_ATTESTED');
  if (env.X3C_ANALYTICS_READ_ACCESS_ACK && env.X3C_ANALYTICS_READ_ACCESS_ACK !== 'disposable-project-read-access') blockers.push('ANALYTICS_READ_NOT_ATTESTED');
  if (env.X3C_AUTH_DATABASE_URL) {
    try {
      const database = new URL(env.X3C_AUTH_DATABASE_URL);
      if (!['postgres:', 'postgresql:'].includes(database.protocol) || database.hostname !== '127.0.0.1' || database.pathname !== '/physcratic_authoring_test') throw Error();
    } catch { blockers.push('DISPOSABLE_LOOPBACK_DATABASE_REQUIRED'); }
  }
  if (origin && env.X3C_RECAPTCHA_ALLOWED_HOSTNAME && env.X3C_RECAPTCHA_ALLOWED_HOSTNAME !== origin.hostname) blockers.push('CAPTCHA_HOSTNAME_MISMATCH');
  return Object.fromEntries(Object.entries(required).map(([provider, names]) => {
    const missing = names.filter(name => !env[name]);
    return [provider, { state: blockers.length || missing.length ? 'BLOCKED' : 'PREPARED_NOT_VERIFIED', missing, blockers }];
  }));
}
if (process.argv[1] === import.meta.filename) {
  const result = providerReadiness();
  console.log(JSON.stringify(result, null, 2));
  if (Object.values(result).some(value => value.state === 'BLOCKED')) process.exitCode = 2;
}
