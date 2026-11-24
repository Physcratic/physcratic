import "server-only";
import { completionReply } from "./personal-completions-contracts";

export function personalCompletionsEnabled(env: Record<string, string | undefined> = process.env) {
  return env.PERSONAL_COMPLETIONS_ENABLED === "true";
}

export function createPersonalCompletionsRoute(
  enabled = personalCompletionsEnabled,
  load = () => import("./personal-completions-server"),
) {
  return async (request: Request) => {
    if (!enabled()) return completionReply({ error: "Personal completions are disabled." }, 503);
    try {
      return await (await load()).personalCompletionsApi(request);
    } catch {
      return completionReply({ error: "Personal completions are temporarily unavailable." }, 503);
    }
  };
}

export const personalCompletionsRoute = createPersonalCompletionsRoute();
