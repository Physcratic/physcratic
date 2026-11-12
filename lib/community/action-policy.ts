// Pure feature gate. Disabled deployments never reference migration 0019.
export const communityActionsEnabled = (env: Record<string, string | undefined> = process.env) =>
  env.COMMUNITY_ACTIONS_ENABLED === 'true' && env.COMMUNITY_STAFF_ENABLED === 'true' &&
  env.COMMUNITY_MODERATION_ENABLED === 'true';
