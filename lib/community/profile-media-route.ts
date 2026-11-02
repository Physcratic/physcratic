import "server-only";
import { communityProfilesEnabled } from "./profile-route";
import { profileReply } from "./profile-api";
import type { ProfileMediaAction } from "./profile-media-api";

export function profileMediaEnabled(env: Record<string, string | undefined> = process.env) {
  return communityProfilesEnabled(env) && env.COMMUNITY_PROFILE_MEDIA_ENABLED === "true";
}
export function createProfileMediaRoute(enabled = profileMediaEnabled, load = () => import("./profile-media-server")) {
  return async (action: ProfileMediaAction, request: Request, value?: string) => {
    if (!enabled()) return profileReply({ error: "Profile images are disabled." }, 503);
    try { return await (await load()).profileMediaApi(action, request, value); }
    catch { return profileReply({ error: "Profile images are temporarily unavailable." }, 503); }
  };
}
export const profileMediaRoute = createProfileMediaRoute();
