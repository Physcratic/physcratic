import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "./db";
import {
  contestAdmins,
  contestAttempts,
  contestProblems,
  contestRegistrations,
  contests,
} from "./db/schema";
import {
  contestEnd,
  contestPhase,
  type ContestDraftInput,
  type ContestRoomData,
  type ContestSubmissionInput,
  type ContestSummary,
} from "./contest-contracts";
import {
  contestProblemOptions,
  contestProblemSnapshot,
} from "./contest-catalog";
import { checkArchivePart } from "./archive-grading";
import type { ArchivePartResult } from "./archive-grading-contracts";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export class ContestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const summaryColumns = {
  id: contests.id,
  name: contests.name,
  description: contests.description,
  startsAt: contests.startsAt,
  durationMinutes: contests.durationMinutes,
  launchOnPublish: contests.launchOnPublish,
  published: contests.published,
  version: contests.version,
  problemIds: contests.problemIds,
};
function summary(
  row: Omit<ContestSummary, "startsAt"> & { startsAt: Date },
): ContestSummary {
  return { ...row, startsAt: row.startsAt.toISOString() };
}
async function databaseNow(transaction: Transaction) {
  const [clock] = await transaction
    .select({ now: sql<string>`clock_timestamp()::text` })
    .from(sql`(values (1)) as clock(value)`);
  return new Date(clock.now);
}
async function adminLock(
  transaction: Transaction,
  userId: string,
  exclusive = false,
) {
  const [admin] = await transaction
    .select({ userId: contestAdmins.userId })
    .from(contestAdmins)
    .where(eq(contestAdmins.userId, userId))
    .for(exclusive ? "update" : "share")
    .limit(1);
  if (!admin)
    throw new ContestError("Contest administrator access is required.", 403);
}
export function createContestService(database: typeof db) {
  async function isContestAdmin(userId: string) {
    const [admin] = await database
      .select({ userId: contestAdmins.userId })
      .from(contestAdmins)
      .where(eq(contestAdmins.userId, userId))
      .limit(1);
    return Boolean(admin);
  }
  async function getContestAdminData(userId: string) {
    return database.transaction(async (transaction) => {
      await adminLock(transaction, userId);
      const rows = await transaction
        .select(summaryColumns)
        .from(contests)
        .where(eq(contests.creatorUserId, userId))
        .orderBy(desc(contests.createdAt))
        .limit(50);
      return { contests: rows.map(summary), problems: contestProblemOptions() };
    });
  }
  function snapshots(input: ContestDraftInput) {
    return input.problemIds.map((id, position) => {
      const snapshot = contestProblemSnapshot(id);
      if (!snapshot)
        throw new ContestError(
          "Select archive problems with fully checked answer parts.",
        );
      return { ...snapshot, position };
    });
  }
  function checkSchedule(
    input: { launchOnPublish: boolean; startsAt: string | Date | null },
    now: Date,
  ) {
    if (
      !input.launchOnPublish &&
      (!input.startsAt || new Date(input.startsAt).getTime() <= now.getTime())
    )
      throw new ContestError("Choose a future UTC start time.");
  }
  async function createContest(userId: string, input: ContestDraftInput) {
    const problems = snapshots(input);
    return database.transaction(async (transaction) => {
      await adminLock(transaction, userId, true);
      const now = await databaseNow(transaction);
      checkSchedule(input, now);
      const [total] = await transaction
        .select({ total: count() })
        .from(contests)
        .where(
          and(
            eq(contests.creatorUserId, userId),
            eq(contests.published, false),
          ),
        );
      if (total.total >= 50)
        throw new ContestError(
          "The limit of 50 unpublished contests has been reached.",
          409,
        );
      const id = `contest-${randomUUID()}`;
      const [row] = await transaction
        .insert(contests)
        .values({
          ...input,
          id,
          startsAt: input.launchOnPublish ? now : new Date(input.startsAt!),
          creatorUserId: userId,
          creators: ["Physcratic"],
          published: false,
          rated: false,
          registrationOpen: false,
        })
        .returning(summaryColumns);
      await transaction
        .insert(contestProblems)
        .values(problems.map((problem) => ({ ...problem, contestId: id })));
      return summary(row);
    });
  }
  async function updateContest(
    userId: string,
    id: string,
    version: number,
    input: ContestDraftInput,
  ) {
    const problems = snapshots(input);
    return database.transaction(async (transaction) => {
      await adminLock(transaction, userId);
      const [row] = await transaction
        .select(summaryColumns)
        .from(contests)
        .where(and(eq(contests.id, id), eq(contests.creatorUserId, userId)))
        .for("update")
        .limit(1);
      if (!row) throw new ContestError("Contest not found.", 404);
      if (row.published || row.version !== version)
        throw new ContestError(
          "This contest is published or has changed. Reload before editing.",
          409,
        );
      const now = await databaseNow(transaction);
      checkSchedule(input, now);
      const [saved] = await transaction
        .update(contests)
        .set({
          ...input,
          startsAt: input.launchOnPublish ? now : new Date(input.startsAt!),
          version: row.version + 1,
        })
        .where(and(eq(contests.id, id), eq(contests.creatorUserId, userId)))
        .returning(summaryColumns);
      await transaction
        .delete(contestProblems)
        .where(eq(contestProblems.contestId, id));
      await transaction
        .insert(contestProblems)
        .values(problems.map((problem) => ({ ...problem, contestId: id })));
      return summary(saved);
    });
  }
  async function publishContest(userId: string, id: string, version: number) {
    return database.transaction(async (transaction) => {
      await adminLock(transaction, userId);
      const [row] = await transaction
        .select(summaryColumns)
        .from(contests)
        .where(and(eq(contests.id, id), eq(contests.creatorUserId, userId)))
        .for("update")
        .limit(1);
      if (!row) throw new ContestError("Contest not found.", 404);
      if (row.published) return summary(row);
      if (row.version !== version)
        throw new ContestError(
          "The draft has changed. Reload before publishing.",
          409,
        );
      const problems = await transaction
        .select({ id: contestProblems.problemId })
        .from(contestProblems)
        .where(eq(contestProblems.contestId, id))
        .orderBy(asc(contestProblems.position));
      if (
        !problems.length ||
        JSON.stringify(problems.map((item) => item.id)) !==
          JSON.stringify(row.problemIds)
      )
        throw new ContestError(
          "Save the problem selection again before publishing.",
          409,
        );
      const now = await databaseNow(transaction);
      checkSchedule(row, now);
      const [published] = await transaction
        .update(contests)
        .set({
          published: true,
          publishedAt: now,
          registrationOpen: true,
          rated: false,
          startsAt: row.launchOnPublish ? now : row.startsAt,
          version: row.version + 1,
        })
        .where(and(eq(contests.id, id), eq(contests.creatorUserId, userId)))
        .returning(summaryColumns);
      return summary(published);
    });
  }

  async function getContestRoom(
    id: string,
    user?: { id: string; emailVerified?: boolean } | null,
  ): Promise<ContestRoomData> {
    return database.transaction(async (transaction) => {
      const [row] = await transaction
        .select({
          ...summaryColumns,
          registrationOpen: contests.registrationOpen,
        })
        .from(contests)
        .where(and(eq(contests.id, id), eq(contests.published, true)))
        .limit(1);
      if (!row) throw new ContestError("Contest not found.", 404);
      const now = await databaseNow(transaction);
      const phase = contestPhase(
        row.startsAt,
        row.durationMinutes,
        now.getTime(),
      );
      const [registration] = user
        ? await transaction
            .select({ userId: contestRegistrations.userId })
            .from(contestRegistrations)
            .where(
              and(
                eq(contestRegistrations.userId, user.id),
                eq(contestRegistrations.contestId, id),
              ),
            )
            .limit(1)
        : [];
      const allParts = await transaction
        .select({ metadata: contestProblems.metadata })
        .from(contestProblems)
        .where(eq(contestProblems.contestId, id));
      const canRead = Boolean(registration) && phase !== "upcoming";
      const problems = canRead
        ? await transaction
            .select({
              id: contestProblems.problemId,
              title: contestProblems.title,
              topic: contestProblems.topic,
              statement: contestProblems.statement,
              metadata: contestProblems.metadata,
            })
            .from(contestProblems)
            .where(eq(contestProblems.contestId, id))
            .orderBy(asc(contestProblems.position))
        : [];
      const ownAttempts = and(
        eq(contestAttempts.userId, user?.id ?? ""),
        eq(contestAttempts.contestId, id),
      );
      const attemptColumns = {
        id: contestAttempts.id,
        problemId: contestAttempts.problemId,
        answers: contestAttempts.answers,
        results: contestAttempts.results,
        createdAt: contestAttempts.createdAt,
      };
      const history =
        user && registration
          ? await transaction
              .select(attemptColumns)
              .from(contestAttempts)
              .where(ownAttempts)
              .orderBy(
                desc(contestAttempts.createdAt),
                desc(contestAttempts.id),
              )
              .limit(50)
          : [];
      const latest =
        user && registration
          ? await transaction
              .selectDistinctOn([contestAttempts.problemId], attemptColumns)
              .from(contestAttempts)
              .where(ownAttempts)
              .orderBy(
                asc(contestAttempts.problemId),
                desc(contestAttempts.createdAt),
                desc(contestAttempts.id),
              )
          : [];
      const attempts = [
        ...new Map(
          [...history, ...latest].map((attempt) => [attempt.id, attempt]),
        ).values(),
      ].sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() ||
          b.id.localeCompare(a.id),
      );
      const correctParts =
        user && registration
          ? await transaction
              .selectDistinct({
                key: sql<string>`${contestAttempts.problemId} || ':' || (part->>'partId')`,
              })
              .from(contestAttempts)
              .innerJoin(
                sql`jsonb_array_elements(${contestAttempts.results}) AS part`,
                sql`true`,
              )
              .where(and(ownAttempts, sql`part->>'status'='correct'`))
          : [];
      const [total] =
        user && registration
          ? await transaction
              .select({ total: count() })
              .from(contestAttempts)
              .where(ownAttempts)
          : [{ total: 0 }];
      return {
        contest: summary(row),
        serverNow: now.toISOString(),
        endsAt: contestEnd(row.startsAt, row.durationMinutes),
        phase,
        signedIn: Boolean(user),
        emailVerified: user?.emailVerified === true,
        registered: Boolean(registration),
        canJoin:
          row.registrationOpen && phase !== "ended" && allParts.length > 0,
        problems,
        attempts: attempts.map((attempt) => ({
          ...attempt,
          createdAt: attempt.createdAt.toISOString(),
        })),
        earnedParts: correctParts.map((part) => part.key),
        submissionCount: total.total,
        score: correctParts.length,
        maxScore: allParts.reduce(
          (total, problem) =>
            total +
            problem.metadata.parts.filter((part) => part.kind !== "self-review")
              .length,
          0,
        ),
      };
    });
  }
  async function setContestRegistration(
    userId: string,
    id: string,
    registered: boolean,
  ) {
    return database.transaction(async (transaction) => {
      const [row] = await transaction
        .select({
          startsAt: contests.startsAt,
          durationMinutes: contests.durationMinutes,
          registrationOpen: contests.registrationOpen,
        })
        .from(contests)
        .where(and(eq(contests.id, id), eq(contests.published, true)))
        .for("update")
        .limit(1);
      const now = await databaseNow(transaction);
      if (
        !row ||
        !row.registrationOpen ||
        contestPhase(row.startsAt, row.durationMinutes, now.getTime()) ===
          "ended"
      )
        throw new ContestError(
          "Registration is not open for this contest.",
          409,
        );
      if (registered)
        await transaction
          .insert(contestRegistrations)
          .values({ userId, contestId: id })
          .onConflictDoNothing();
      else {
        if (
          contestPhase(row.startsAt, row.durationMinutes, now.getTime()) !==
          "upcoming"
        )
          throw new ContestError(
            "You cannot cancel participation after the contest starts.",
            409,
          );
        await transaction
          .delete(contestRegistrations)
          .where(
            and(
              eq(contestRegistrations.userId, userId),
              eq(contestRegistrations.contestId, id),
            ),
          );
      }
      return { registered };
    });
  }
  async function submitContestAnswer(
    userId: string,
    id: string,
    input: ContestSubmissionInput,
  ) {
    return database.transaction(async (transaction) => {
      const [contest] = await transaction
        .select({
          startsAt: contests.startsAt,
          durationMinutes: contests.durationMinutes,
        })
        .from(contests)
        .where(and(eq(contests.id, id), eq(contests.published, true)))
        .for("share")
        .limit(1);
      if (!contest) throw new ContestError("Contest not found.", 404);
      const [registration] = await transaction
        .select({ userId: contestRegistrations.userId })
        .from(contestRegistrations)
        .where(
          and(
            eq(contestRegistrations.userId, userId),
            eq(contestRegistrations.contestId, id),
          ),
        )
        .for("update")
        .limit(1);
      if (!registration)
        throw new ContestError(
          "Join this contest before submitting answers.",
          403,
        );
      const [existing] = await transaction
        .select({
          id: contestAttempts.id,
          problemId: contestAttempts.problemId,
          version: contestAttempts.version,
          answers: contestAttempts.answers,
          results: contestAttempts.results,
          createdAt: contestAttempts.createdAt,
        })
        .from(contestAttempts)
        .where(
          and(
            eq(contestAttempts.userId, userId),
            eq(contestAttempts.contestId, id),
            eq(contestAttempts.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1);
      if (existing) {
        if (
          existing.problemId !== input.problemId ||
          existing.version !== input.version ||
          existing.answers.length !== input.answers.length ||
          existing.answers.some(
            (answer, index) =>
              answer.partId !== input.answers[index]?.partId ||
              answer.latex !== input.answers[index]?.latex,
          )
        )
          throw new ContestError(
            "This request key already belongs to a different submission.",
            409,
          );
        return {
          ...existing,
          createdAt: existing.createdAt.toISOString(),
          replayed: true,
        };
      }
      const now = await databaseNow(transaction);
      if (
        contestPhase(
          contest.startsAt,
          contest.durationMinutes,
          now.getTime(),
        ) !== "live"
      )
        throw new ContestError(
          "Answers are accepted only while the contest is live.",
          409,
        );
      const [problem] = await transaction
        .select()
        .from(contestProblems)
        .where(
          and(
            eq(contestProblems.contestId, id),
            eq(contestProblems.problemId, input.problemId),
          ),
        )
        .limit(1);
      if (!problem)
        throw new ContestError(
          "This problem is not part of this contest.",
          400,
        );
      if (input.version !== problem.version)
        throw new ContestError(
          "The problem version does not match. Reload the contest.",
          409,
        );
      const parts = new Set(input.answers.map((answer) => answer.partId));
      if (
        parts.size !== input.answers.length ||
        input.answers.some(
          (answer) =>
            !problem.definition.parts.some((part) => part.id === answer.partId),
        ) ||
        !input.answers.some((answer) => answer.latex.trim())
      )
        throw new ContestError(
          "Send at least one nonempty answer with unique, valid part IDs.",
        );
      const [recent] = await transaction
        .select({ total: count() })
        .from(contestAttempts)
        .where(
          and(
            eq(contestAttempts.userId, userId),
            eq(contestAttempts.contestId, id),
            gte(contestAttempts.createdAt, new Date(now.getTime() - 60_000)),
          ),
        );
      const [total] = await transaction
        .select({ total: count() })
        .from(contestAttempts)
        .where(
          and(
            eq(contestAttempts.userId, userId),
            eq(contestAttempts.contestId, id),
          ),
        );
      if (recent.total >= 12 || total.total >= 2000)
        throw new ContestError(
          "Submission limit reached. Wait one minute before retrying. The contest limit is 2000 submissions.",
          429,
        );
      const deadline = performance.now() + 1500;
      const results: ArchivePartResult[] = input.answers.map((answer) => {
        const part = problem.definition.parts.find(
          (item) => item.id === answer.partId,
        )!;
        return {
          partId: part.id,
          ...(performance.now() > deadline
            ? {
                status: "inconclusive" as const,
                message:
                  "The checker reached its time limit. Retry this part separately.",
              }
            : checkArchivePart(part, answer.latex)),
        };
      });
      const savedAt = await databaseNow(transaction);
      if (
        contestPhase(
          contest.startsAt,
          contest.durationMinutes,
          savedAt.getTime(),
        ) !== "live"
      )
        throw new ContestError(
          "The contest ended before this answer could be saved.",
          409,
        );
      const [saved] = await transaction
        .insert(contestAttempts)
        .values({
          id: randomUUID(),
          userId,
          contestId: id,
          problemId: problem.problemId,
          idempotencyKey: input.idempotencyKey,
          version: problem.version,
          answers: input.answers,
          results,
          createdAt: savedAt,
        })
        .returning({
          id: contestAttempts.id,
          problemId: contestAttempts.problemId,
          answers: contestAttempts.answers,
          results: contestAttempts.results,
          createdAt: contestAttempts.createdAt,
        });
      return {
        ...saved,
        createdAt: saved.createdAt.toISOString(),
        replayed: false,
      };
    });
  }
  return {
    isContestAdmin,
    getContestAdminData,
    createContest,
    updateContest,
    publishContest,
    getContestRoom,
    setContestRegistration,
    submitContestAnswer,
  };
}
export const {
  isContestAdmin,
  getContestAdminData,
  createContest,
  updateContest,
  publishContest,
  getContestRoom,
  setContestRegistration,
  submitContestAnswer,
} = createContestService(db);
