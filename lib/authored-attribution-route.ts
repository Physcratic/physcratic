import "server-only";
import {accountDeletionEnabled} from "./account-deletion/route";
import { z } from "zod";
import { communityProfilesEnabled } from "./community/profile-route";
import { authoredAttributionSelectionSchema, attributionReply } from "./authored-attribution-contracts";
export const authoredAttributionEnabled = (env: Record<string, string | undefined> = process.env) => accountDeletionEnabled(env) || (env.COMMUNITY_AUTHORSHIP_ENABLED === "true" && communityProfilesEnabled(env));
export function createAuthoredAttributionRoute(enabled = authoredAttributionEnabled, load = () => import("./authored-attribution-server")) {
  return async (request: Request, rawId: string) => {
    const url = new URL(request.url);
    const params = z.strictObject({ revisionId: z.uuid() }).safeParse(Object.fromEntries(url.searchParams));
    const parsed = authoredAttributionSelectionSchema.safeParse({ problemId: rawId, revisionId: params.success ? params.data.revisionId : undefined });
    if (request.method !== "GET") return attributionReply({ error: "Use GET for attribution." }, 405);
    if (!params.success || !parsed.success || request.url.length > 4096 || [...url.searchParams.keys()].some(key => url.searchParams.getAll(key).length !== 1)) return attributionReply({ error: "Invalid attribution selection." }, 400);
    const neutral = () => attributionReply({ ...parsed.data, author: null });
    // Gate before even importing database/session bindings. No flag is enabled here.
    if (!enabled()) return neutral();
    try {
      const response = await (await load()).authoredAttributionApi(parsed.data);
      return enabled() ? response : neutral();
    } catch { return attributionReply({ error: "Public attribution is unavailable." }, 503); }
  };
}
export const authoredAttributionRoute = createAuthoredAttributionRoute();
