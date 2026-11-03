import "server-only";

import { and, asc, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import type { db } from "./db";
import { contests, contestRatings } from "./db/schema";
import {
  rankingsPagination,
  type RankingsQuery,
  type RankingsResponse,
} from "./rankings";

export function createRankingsService(database: typeof db) {
  return async function getRankings({
    search,
    page,
  }: RankingsQuery): Promise<RankingsResponse> {
    const latest = database.$with("latest_ratings").as(
      database
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
        .orderBy(
          asc(contestRatings.userId),
          desc(contestRatings.createdAt),
          desc(contestRatings.contestId),
        ),
    );
    // Rank public contestants before search or pagination, never private accounts.
    const standings = database.$with("public_standings").as(
      database
        .select({
          userId: latest.userId,
          handle: latest.handle,
          rating: latest.rating,
          change: latest.change,
          updatedAt: latest.updatedAt,
          contests: latest.contests,
          rank: sql<number>`rank() over (order by ${latest.rating} desc)::int`.as(
            "rank",
          ),
        })
        .from(latest)
        .where(
          and(
            isNotNull(latest.handle),
            sql`length(btrim(${latest.handle})) > 0`,
          ),
        ),
    );
    const matches = search
      ? sql`strpos(lower(${standings.handle}), lower(${search})) > 0`
      : undefined;

    return database.transaction(
      async (tx) => {
        const [result] = await tx
          .with(latest, standings)
          .select({ total: count() })
          .from(standings)
          .where(matches);
        const pagination = rankingsPagination(page, result.total);
        const rows = await tx
          .with(latest, standings)
          .select({
            handle: standings.handle,
            rating: standings.rating,
            change: standings.change,
            updatedAt: standings.updatedAt,
            contests: standings.contests,
            rank: standings.rank,
          })
          .from(standings)
          .where(matches)
          .orderBy(
            desc(standings.rating),
            asc(standings.handle),
            asc(standings.userId),
          )
          .limit(pagination.pageSize)
          .offset((pagination.page - 1) * pagination.pageSize);
        return {
          rankings: rows.map((row) => ({
            ...row,
            handle: row.handle!,
            updatedAt: row.updatedAt.toISOString(),
          })),
          pagination,
        };
      },
      { isolationLevel: "repeatable read", accessMode: "read only" },
    );
  };
}
