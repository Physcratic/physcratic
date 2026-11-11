import { and, asc, count, countDistinct, eq, sql } from "drizzle-orm";
import { dashboardAccountMatches } from "@/lib/dashboard-practice";
import { problemProgressApi } from "@/lib/problem-progress-api";
import { problemProgressSchema } from "@/lib/problem-progress-contracts";
import { db } from "@/lib/db";
import {
  archiveProgress,
  contests,
  contestRatings,
  contestRegistrations,
  contestProblems,
  practiceAttempts,
  solutionAttempts,
} from "@/lib/db/schema";
import { submissionError, submissionUser } from "@/lib/submission-server";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await submissionUser(request);
    if (!dashboardAccountMatches(request, user?.id ?? null)) return Response.json({ error: "Your account changed. Refresh your sign-in." }, { status: 409, headers: { "Cache-Control": "private, no-store", Vary: "Cookie, X-Practice-Account" } });
    const response = user?.emailVerified ? await problemProgressApi(request) : null;
    const summary = response?.ok ? problemProgressSchema.parse(await response.json()) : null;
    const complete = summary?.sources.practice && summary.sources.authored;
    const checked = { practiceAttempts: complete ? summary.savedChecks : null, solvedProblems: complete ? summary.solvedProblems : null,
      inProgressProblems: complete ? summary.inProgressProblems : null, practiceProgressAvailable: Boolean(complete) };
    const published = await db
      .select({
        id: contests.id,
        name: contests.name,
        description: contests.description,
        startsAt: contests.startsAt,
        durationMinutes: contests.durationMinutes,
        rated: contests.rated,
        registrationOpen: contests.registrationOpen,
        problemIds: contests.problemIds,
        creators: contests.creators,
        interactive: sql<boolean>`exists(select 1 from ${contestProblems} where ${contestProblems.contestId} = ${contests.id})`,
        participants: sql<number>`(select count(*)::int from ${contestRegistrations} where ${contestRegistrations.contestId} = ${contests.id})`,
      })
      .from(contests)
      .where(eq(contests.published, true))
      .orderBy(asc(contests.startsAt))
      .limit(100);
    const registrations = user
      ? await db
          .select({ contestId: contestRegistrations.contestId })
          .from(contestRegistrations)
          .where(eq(contestRegistrations.userId, user.id))
      : [];
    const [saved] = user
      ? await db
          .select({ total: count() })
          .from(solutionAttempts)
          .where(eq(solutionAttempts.userId, user.id))
      : [{ total: 0 }];
    const [practice] = user
      ? await db
          .select({ total: count() })
          .from(practiceAttempts)
          .where(eq(practiceAttempts.userId, user.id))
      : [{ total: 0 }];
    const [solved] = user
      ? await db
          .select({ total: countDistinct(practiceAttempts.problemId) })
          .from(practiceAttempts)
          .where(
            and(
              eq(practiceAttempts.userId, user.id),
              eq(practiceAttempts.correct, true),
            ),
          )
      : [{ total: 0 }];
    const [reviewed] = user
      ? await db
          .select({ total: count() })
          .from(archiveProgress)
          .where(
            and(
              eq(archiveProgress.userId, user.id),
              eq(archiveProgress.reviewed, true),
            ),
          )
      : [{ total: 0 }];
    const ratings = user
      ? await db
          .select({
            rating: contestRatings.rating,
            change: contestRatings.change,
            createdAt: contestRatings.createdAt,
            contestName: contests.name,
          })
          .from(contestRatings)
          .innerJoin(contests, eq(contestRatings.contestId, contests.id))
          .where(
            and(
              eq(contestRatings.userId, user.id),
              eq(contests.published, true),
            ),
          )
          .orderBy(asc(contestRatings.createdAt))
      : [];
    return Response.json(
      {
        user: user ? { name: user.name } : null,
        savedAttempts: saved.total,
        ...checked,
        legacyPracticeAttempts: practice.total,
        legacySolvedProblems: solved.total,
        archiveReviewed: reviewed.total,
        ratings,
        contests: published.map((contest) => ({
          ...contest,
          registered: registrations.some(
            (entry) => entry.contestId === contest.id,
          ),
        })),
      },
      { headers: { "Cache-Control": "private, no-store", Vary: "Cookie, X-Practice-Account" } },
    );
  } catch {
    return submissionError(
      "Dashboard data is temporarily unavailable. Please retry.",
      503,
    );
  }
}
