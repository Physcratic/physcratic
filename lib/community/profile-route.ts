import "server-only";
import { profileReply, type ProfileAction } from "./profile-api";

export function communityProfilesEnabled(env: Record<string, string | undefined> = process.env) {
  return env.COMMUNITY_PROFILES_ENABLED === "true";
}

// The gate precedes even importing auth/database bindings. Off means zero DB/session access.
export function createCommunityProfileRoute(
  enabled = communityProfilesEnabled,
  load = () => import("./profile-server"),
) {
  return async (action: ProfileAction, request: Request, handle?: string) => {
    if (!enabled()) return profileReply({ error: "Profiles are disabled." }, 503);
    try { return await (await load()).communityProfileApi(action, request, handle); }
    catch { return profileReply({ error: "Profiles are temporarily unavailable." }, 503); }
  };
}
export const communityProfileRoute = createCommunityProfileRoute();
