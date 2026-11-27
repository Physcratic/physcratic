import "server-only";
import { favouriteReply } from "./favourite-history-contracts";

export function favouriteHistoryEnabled(env: Record<string, string | undefined> = process.env) {
  return env.FAVOURITE_HISTORY_ENABLED === "true" && env.COMMUNITY_PROBLEM_STATS_ENABLED === "true";
}
export function createFavouriteHistoryRoute(
  enabled = favouriteHistoryEnabled,
  load = () => import("./favourite-history-server"),
) {
  return async (request: Request) => {
    if (!enabled()) return favouriteReply({ error: "Favourite history is disabled." }, 503);
    try { return await (await load()).favouriteHistoryApi(request); }
    catch { return favouriteReply({ error: "Your favourites are temporarily unavailable." }, 503); }
  };
}
export const favouriteHistoryRoute = createFavouriteHistoryRoute();
