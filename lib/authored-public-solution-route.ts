import "server-only";
import { publicSolutionsEnabled } from "./authored-solution-policy";
import { publicSolutionReply } from "./authored-public-solution-api";
export function createPublicSolutionRoute(enabled = publicSolutionsEnabled, load = () => import("./authored-public-solution-server")) {
  return async (request: Request, problem: string, media?: string) => {
    if (!enabled()) return publicSolutionReply({ error: "Public worked solutions are not available." }, 503);
    try { return await (await load()).publicAuthoredSolutionApi(request, problem, media); }
    catch { return publicSolutionReply({ error: "Worked solution temporarily unavailable." }, 503); }
  };
}
export const publicSolutionRoute = createPublicSolutionRoute();
