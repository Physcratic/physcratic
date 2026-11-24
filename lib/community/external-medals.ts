import "server-only";

/** The external workflow can be launched independently of earned badges and internal verification. */
export function externalMedalVerificationEnabled(env: Record<string, string | undefined> = process.env) {
  return env.COMMUNITY_EXTERNAL_MEDALS_ENABLED === "true";
}

export function medalVerificationForm(env: Record<string, string | undefined> = process.env) {
  const url = env.COMMUNITY_MEDAL_TALLY_URL;
  return externalMedalVerificationEnabled(env) && url && url === url.trim() && /^https:\/\/tally\.so\/r\/[A-Za-z0-9]{1,64}$/.test(url)
    ? url
    : undefined;
}

/** Fixed SQL sources with the same public projection. A disabled source is never queried. */
export function approvedMedalSource(legacy: boolean, external: boolean) {
  if (legacy && external) return "(SELECT * FROM community_approved_medal UNION ALL SELECT * FROM community_external_approved_medal)";
  if (legacy) return "community_approved_medal";
  if (external) return "community_external_approved_medal";
  return undefined;
}
