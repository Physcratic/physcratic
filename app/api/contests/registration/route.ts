import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { contests, contestRegistrations } from "@/lib/db/schema";
import { readSubmissionJson } from "@/lib/submission-request";
import { isSubmissionOrigin, submissionError, submissionUser } from "@/lib/submission-server";

const schema = z.object({ contestId: z.string().min(1).max(100), registered: z.boolean() });
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (!isSubmissionOrigin(request)) return submissionError("Request origin rejected.", 403);
    const user = await submissionUser(request);
    if (!user) return submissionError("Sign in to register for a contest.", 401);
    const input = schema.safeParse(await readSubmissionJson(request));
    if (!input.success) return submissionError("Invalid registration request.", 400);
    return await db.transaction(async (transaction) => {
      const [contest] = await transaction.select({ id: contests.id }).from(contests)
        .where(and(eq(contests.id, input.data.contestId), eq(contests.published, true), eq(contests.registrationOpen, true), gt(contests.startsAt, new Date())))
        .for("update").limit(1);
      if (!contest) return submissionError("Registration is not open for this contest.", 409);
      if (input.data.registered) await transaction.insert(contestRegistrations).values({ userId: user.id, contestId: contest.id }).onConflictDoNothing();
      else await transaction.delete(contestRegistrations).where(and(eq(contestRegistrations.userId, user.id), eq(contestRegistrations.contestId, contest.id)));
      return Response.json({ registered: input.data.registered }, { headers: { "Cache-Control": "private, no-store" } });
    });
  } catch {
    return submissionError("Registration could not be saved. Please retry.", 503);
  }
}
