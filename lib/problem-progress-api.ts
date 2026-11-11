import "server-only";
import { z } from "zod";
import { practiceProgressSchema } from "./practice-check-contracts";
import { problemProgressEntrySchema, problemProgressSchema } from "./problem-progress-contracts";
const authoredSchema = z.strictObject({ progress: z.array(problemProgressEntrySchema).max(1000), savedChecks: z.number().int().nonnegative() });
type Read = (request: Request) => Promise<Response>;
export function createProblemProgressApi(practice: Read, authored: Read) {
  return async (request: Request) => {
    const results = await Promise.allSettled([practice(request), authored(request)]);
    const values = await Promise.all(results.map(async (result, index) => {
      if (result.status !== "fulfilled" || !result.value.ok) return null;
      try { return (index === 0 ? practiceProgressSchema : authoredSchema).parse(await result.value.json()); } catch { return null; }
    }));
    const headers = { "Cache-Control": "private, no-store", Vary: "Cookie, X-Practice-Account", "X-Content-Type-Options": "nosniff" };
    // Never return one account's successful source alongside a rejected account boundary.
    const denied = results.find(r => r.status === "fulfilled" && [401,403,409].includes(r.value.status));
    if (denied?.status === "fulfilled") return Response.json({ error: "Sign in to the same verified account to read progress." }, { status: denied.value.status, headers });
    if (values.every(v => v === null)) return Response.json({ error: "Your progress is temporarily unavailable." }, { status: 503, headers });
    const progress = values.flatMap(v => v?.progress ?? []).sort((a,b) => b.lastCheckedAt.localeCompare(a.lastCheckedAt) || a.problemId.localeCompare(b.problemId));
    return Response.json(problemProgressSchema.parse({ progress, savedChecks: values.reduce((n,v) => n + (v?.savedChecks ?? 0), 0),
      solvedProblems: progress.filter(p => p.status === "solved").length, inProgressProblems: progress.filter(p => p.status === "in-progress").length,
      notGradedProblems: progress.filter(p => p.status === "not-graded").length, sources: { practice: values[0] !== null, authored: values[1] !== null },
    }), { headers });
  };
}
export const problemProgressApi = createProblemProgressApi(
  async request => (await import("./practice-check-route")).practiceCheckRoute("progress", request),
  async request => (await import("./authored-attempt-server")).authoredAttemptApi("progress", request),
);
