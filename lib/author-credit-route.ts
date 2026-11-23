import "server-only";
import { authorCreditReply } from "./author-credit-contracts";

export function authorCreditEnabled(env: Record<string, string | undefined> = process.env) {
  return env.COMMUNITY_AUTHOR_CREDIT_ENABLED === "true";
}

export function createAuthorCreditRoute(
  enabled = authorCreditEnabled,
  load = () => import("./author-credit-server"),
) {
  return async (request: Request) => {
    if (!enabled()) return authorCreditReply({ error: "Author credit is disabled." }, 503);
    try {
      return await (await load()).authorCreditApi(request);
    } catch {
      return authorCreditReply({ error: "Author credit is temporarily unavailable." }, 503);
    }
  };
}

export const authorCreditRoute = createAuthorCreditRoute();
