import "server-only";
import { communityProfilesEnabled } from "./profile-route";
import { profileReply } from "./profile-api";

export function communityAchievementsEnabled(env: Record<string, string | undefined> = process.env) {
  return communityProfilesEnabled(env) && env.COMMUNITY_ACHIEVEMENTS_ENABLED === "true";
}
// Disabled routes never import session/database bindings or touch any new table.
export function createCommunityAchievementsRoute(enabled = communityAchievementsEnabled, load = () => import("./achievements-server")) {
  return async (request: Request) => {
    if (!enabled()) return profileReply({ error: "Achievements are disabled." }, 503);
    try { return await (await load()).communityAchievementsApi(request); }
    catch { return profileReply({ error: "Achievements are temporarily unavailable." }, 503); }
  };
}
export const communityAchievementsRoute = createCommunityAchievementsRoute();
