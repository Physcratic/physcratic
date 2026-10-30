import { and, asc, desc, eq, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contests, contestRatings } from "@/lib/db/schema";
import { submissionError } from "@/lib/submission-server";

export const runtime = "nodejs";
export async function GET() {
  try {
    const latest = db
      .selectDistinctOn([contestRatings.userId], {
        userId: contestRatings.userId,
        handle: contestRatings.publicHandle,
        rating: contestRatings.rating,
        change: contestRatings.change,
        updatedAt: contestRatings.createdAt,
        contests:
          sql<number>`count(*) over (partition by ${contestRatings.userId})::int`.as(
            "contests",
          ),
      })
      .from(contestRatings)
      .innerJoin(contests, eq(contests.id, contestRatings.contestId))
      .where(and(eq(contests.published, true), eq(contests.rated, true)))
      .orderBy(asc(contestRatings.userId), desc(contestRatings.createdAt))
      .as("latest_ratings");
    const rows = await db
      .select({
        handle: latest.handle,
        rating: latest.rating,
        change: latest.change,
        updatedAt: latest.updatedAt,
        contests: latest.contests,
      })
      .from(latest)
      .where(and(isNotNull(latest.handle), ne(latest.handle, "")))
      .orderBy(desc(latest.rating), asc(latest.handle))
      .limit(100);
    return Response.json(
      { rankings: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return submissionError(
      "Rankings are temporarily unavailable. Please retry.",
      503,
    );
  }
}
