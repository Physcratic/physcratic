import "server-only";
import { communityProfilesEnabled } from "./profile-route";
import { profileReply } from "./profile-api";
import { externalMedalVerificationEnabled } from "./external-medals";

export function communityAchievementsEnabled(env: Record<string, string | undefined> = process.env) {
  return communityProfilesEnabled(env) && env.COMMUNITY_ACHIEVEMENTS_ENABLED === "true";
}
// Disabled routes never import session/database bindings or touch any new table.
export function createCommunityAchievementsRoute(enabled = communityShowcaseEnabled, load = () => import("./achievements-server")) {
  return async (request: Request) => {
    if (!enabled()) return profileReply({ error: "Achievements are disabled." }, 503);
    try { return await (await load()).communityAchievementsApi(request); }
    catch { return profileReply({ error: "Achievements are temporarily unavailable." }, 503); }
  };
}
export const communityAchievementsRoute = createCommunityAchievementsRoute();

export function medalShowcaseEnabled(env:Record<string,string|undefined>=process.env){return communityAchievementsEnabled(env)&&env.COMMUNITY_MEDALS_ENABLED==='true'&&env.COMMUNITY_STAFF_ENABLED==='true'&&env.COMMUNITY_MEDAL_SHOWCASE_ENABLED==='true';}

export function externalMedalShowcaseEnabled(env: Record<string, string | undefined> = process.env) {
  return communityProfilesEnabled(env) && externalMedalVerificationEnabled(env);
}

export function communityShowcaseEnabled(env: Record<string, string | undefined> = process.env) {
  return communityAchievementsEnabled(env) || externalMedalShowcaseEnabled(env);
}
