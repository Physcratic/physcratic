import { completionHistorySchema, completionStatusSchema } from "./personal-completions-contracts";
import type { ProblemKey } from "./unified-arena";

export const completionsPath = "/api/personal-completions";
export const completionChangedEvent = "physcratic:completion-changed";
export const completionStatusKey = (account: string, key: ProblemKey, view: string) => [completionsPath, account, "status", key, view] as const;
export const completionHistoryKey = (account: string, cursor: string | undefined, view: string) => [completionsPath, account, "history", cursor, view] as const;

export class CompletionRequestError extends Error {
  constructor(readonly status: number) {
    super("Completion request failed.");
  }
}

async function completionRequest(account: string, search: URLSearchParams, write?: { key: ProblemKey; completed: boolean }) {
  const query = search.size ? `?${search}` : "";
  const headers = new Headers({ "X-Community-Account": account });
  if (write) headers.set("Content-Type", "application/json");
  const response = await fetch(completionsPath + query, {
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers,
    ...(write && { method: "PUT", body: JSON.stringify(write) }),
  });
  if (!response.ok) throw new CompletionRequestError(response.status);
  return response.json();
}

export async function readCompletionStatus([, account, , key]: ReturnType<typeof completionStatusKey>) {
  const status = completionStatusSchema.parse(await completionRequest(account, new URLSearchParams({ key })));
  if (status.key !== key) throw new Error("Unexpected completion key.");
  return status;
}

export async function readCompletionHistory([, account, , cursor]: ReturnType<typeof completionHistoryKey>) {
  return completionHistorySchema.parse(await completionRequest(account, new URLSearchParams(cursor ? { after: cursor } : {})));
}

export async function saveCompletion([, account, , key]: ReturnType<typeof completionStatusKey>, { arg: completed }: { arg: boolean }) {
  const status = completionStatusSchema.parse(await completionRequest(account, new URLSearchParams(), { key, completed }));
  if (status.key !== key || status.completed !== completed) throw new Error("Unexpected completion status.");
  return status;
}
