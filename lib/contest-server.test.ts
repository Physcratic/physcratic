import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema";
import { createContestService, ContestError } from "./contest-server";
import {
  testContestDraft,
  type ContestSubmissionInput,
} from "./contest-contracts";

type Database = Parameters<typeof createContestService>[0];
export async function exerciseContestLifecycle(database: Database) {
  const api = createContestService(database);
  const organiser = `contest-test-admin-${randomUUID()}`;
  const other = `contest-test-other-${randomUUID()}`;
  const student = `contest-test-student-${randomUUID()}`;
  const student2 = `contest-test-student-${randomUUID()}`;
  const reject = (promise: Promise<unknown>, status: number) =>
    assert.rejects(
      promise,
      (error: unknown) =>
        error instanceof ContestError && error.status === status,
    );
  await reject(api.createContest(organiser, testContestDraft), 403);
  await database
    .insert(schema.contestAdmins)
    .values([{ userId: organiser }, { userId: other }]);
  assert.equal(await api.isContestAdmin(student), false);
  const draft = await api.createContest(organiser, {
    ...testContestDraft,
    problemIds: ["incline", "circuit"],
  });
  assert.equal(draft.published, false);
  await reject(api.getContestRoom(draft.id), 404);
  await reject(
    api.updateContest(other, draft.id, draft.version, testContestDraft),
    404,
  );
  await reject(
    api.updateContest(organiser, draft.id, 99, testContestDraft),
    409,
  );
  const saved = await api.updateContest(organiser, draft.id, draft.version, {
    ...testContestDraft,
    problemIds: ["incline", "circuit"],
  });
  const published = await api.publishContest(
    organiser,
    saved.id,
    saved.version,
  );
  assert.equal(published.published, true);
  assert.equal(published.durationMinutes, 10080);
  const duplicatePublish = await api.publishContest(
    organiser,
    saved.id,
    saved.version,
  );
  assert.equal(duplicatePublish.startsAt, published.startsAt);
  await reject(
    api.updateContest(
      organiser,
      published.id,
      published.version,
      testContestDraft,
    ),
    409,
  );
  const anonymous = await api.getContestRoom(published.id);
  assert.equal(anonymous.problems.length, 0);
  assert.equal(anonymous.phase, "live");
  assert.equal(anonymous.maxScore, 2);
  const input: ContestSubmissionInput = {
    problemId: "incline",
    version: "a".repeat(64),
    idempotencyKey: randomUUID(),
    answers: [{ partId: "answer", latex: "4.9" }],
  };
  await reject(api.submitContestAnswer(student, published.id, input), 403);
  await api.setContestRegistration(student, published.id, true);
  await api.setContestRegistration(student2, published.id, true);
  await reject(api.setContestRegistration(student, published.id, false), 409);
  const room = await api.getContestRoom(published.id, {
    id: student,
    emailVerified: true,
  });
  assert.equal(room.problems.length, 2);
  assert.equal(room.score, 0);
  assert.equal(
    Date.parse(room.endsAt) - Date.parse(room.contest.startsAt),
    604800000,
  );
  const publicProblem = room.problems[0];
  assert.deepEqual(Object.keys(publicProblem).sort(), [
    "id",
    "metadata",
    "statement",
    "title",
    "topic",
  ]);
  assert.ok(
    publicProblem.metadata.parts.every(
      (part) => !("target" in part) && !("canonical" in part),
    ),
  );
  input.version = publicProblem.metadata.version;
  await reject(
    api.submitContestAnswer(student, published.id, {
      ...input,
      version: "a".repeat(64),
    }),
    409,
  );
  await reject(
    api.submitContestAnswer(student, published.id, {
      ...input,
      problemId: "string",
    }),
    400,
  );
  await reject(
    api.submitContestAnswer(student, published.id, {
      ...input,
      answers: [{ partId: "fake", latex: "4.9" }],
    }),
    400,
  );
  await reject(
    api.submitContestAnswer(student, published.id, {
      ...input,
      answers: [{ partId: "answer", latex: "" }],
    }),
    400,
  );
  await reject(
    api.submitContestAnswer(student, published.id, {
      ...input,
      answers: [input.answers[0], input.answers[0]],
    }),
    400,
  );
  const first = await api.submitContestAnswer(student, published.id, input);
  assert.equal(first.results[0].status, "correct");
  const replay = await api.submitContestAnswer(student, published.id, input);
  assert.equal(replay.id, first.id);
  assert.equal(replay.replayed, true);
  await reject(
    api.submitContestAnswer(student, published.id, {
      ...input,
      answers: [{ partId: "answer", latex: "9" }],
    }),
    409,
  );
  await api.submitContestAnswer(student, published.id, {
    ...input,
    idempotencyKey: randomUUID(),
    answers: [{ partId: "answer", latex: "100" }],
  });
  const after = await api.getContestRoom(published.id, { id: student });
  assert.equal(after.score, 1);
  assert.equal(after.attempts.length, 2);
  const otherRoom = await api.getContestRoom(published.id, { id: student2 });
  assert.equal(otherRoom.score, 0);
  assert.equal(otherRoom.attempts.length, 0);
  const pastDraft = await api.createContest(organiser, {
    ...testContestDraft,
    problemIds: ["incline"],
    launchOnPublish: false,
    startsAt: new Date(Date.now() + 86400000).toISOString(),
  });
  const upcoming = await api.publishContest(
    organiser,
    pastDraft.id,
    pastDraft.version,
  );
  await api.setContestRegistration(student, upcoming.id, true);
  assert.equal(
    (await api.getContestRoom(upcoming.id, { id: student })).problems.length,
    0,
  );
  await reject(
    api.submitContestAnswer(student, upcoming.id, {
      ...input,
      idempotencyKey: randomUUID(),
    }),
    409,
  );
  await api.setContestRegistration(student, upcoming.id, false);
  for (let index = 0; index < 10; index++)
    await api.submitContestAnswer(student, published.id, {
      ...input,
      idempotencyKey: randomUUID(),
    });
  await reject(
    api.submitContestAnswer(student, published.id, {
      ...input,
      idempotencyKey: randomUUID(),
    }),
    429,
  );
  assert.equal(
    (await api.getContestRoom(published.id, { id: student })).score,
    1,
  );
  await database.insert(schema.contestAttempts).values(
    Array.from({ length: 60 }, (_, index) => ({
      id: randomUUID(),
      userId: student,
      contestId: published.id,
      problemId: input.problemId,
      idempotencyKey: randomUUID(),
      version: input.version,
      answers: [{ partId: "answer", latex: "100" }],
      results: [
        {
          partId: "answer",
          status: "incorrect" as const,
          message: "Incorrect",
        },
      ],
      createdAt: new Date(Date.now() + index + 1),
    })),
  );
  const bounded = await api.getContestRoom(published.id, { id: student });
  assert.equal(bounded.submissionCount, 72);
  assert.equal(bounded.attempts.length, 50);
  assert.equal(bounded.score, 1);
  assert.deepEqual(bounded.earnedParts, ["incline:answer"]);
  await database
    .update(schema.contests)
    .set({ startsAt: new Date(Date.now() - 604800000 - 10000) })
    .where(eq(schema.contests.id, published.id));
  await reject(
    api.submitContestAnswer(student2, published.id, {
      ...input,
      idempotencyKey: randomUUID(),
    }),
    409,
  );
  await reject(api.setContestRegistration(student2, published.id, true), 409);
  assert.equal(
    (await api.getContestRoom(published.id, { id: student })).phase,
    "ended",
  );
  assert.equal(
    (await api.submitContestAnswer(student, published.id, input)).id,
    first.id,
  );
  await database
    .delete(schema.contestAdmins)
    .where(eq(schema.contestAdmins.userId, organiser));
  await reject(api.getContestAdminData(organiser), 403);
  return {
    checks:
      "permissions, ownership, version conflicts, publication, timing, registration, grading, idempotency, privacy, scoring, rate limits and closed contests",
  };
}

const url = process.env.AUTHORING_TEST_DATABASE_URL;
test(
  "contest lifecycle stays isolated from practice and ratings",
  { skip: !url },
  async () => {
    const target = new URL(url!);
    assert.equal(target.hostname, "127.0.0.1");
    assert.equal(target.pathname, "/physcratic_authoring_test");
    const name = `contest_${randomUUID().replaceAll("-", "")}`;
    const admin = new Pool({ connectionString: url });
    await admin.query(`CREATE SCHEMA ${name}`);
    const pool = new Pool({
      connectionString: url,
      options: `-c search_path=${name},public`,
    });
    try {
      await pool.query(
        `CREATE TABLE contest (id text PRIMARY KEY,name text NOT NULL,description text NOT NULL,"startsAt" timestamptz NOT NULL,"durationMinutes" integer NOT NULL,published boolean NOT NULL DEFAULT false,rated boolean NOT NULL DEFAULT false,"registrationOpen" boolean NOT NULL DEFAULT false,"problemIds" jsonb NOT NULL DEFAULT '[]',creators jsonb NOT NULL DEFAULT '[]',"createdAt" timestamptz NOT NULL DEFAULT now()); CREATE TABLE contest_registration ("userId" text NOT NULL,"contestId" text NOT NULL,"createdAt" timestamptz NOT NULL DEFAULT now(),PRIMARY KEY("userId","contestId"))`,
      );
      await pool.query(
        await readFile("migrations/0014_contest_participation.up.sql", "utf8"),
      );
      await exerciseContestLifecycle(drizzle(pool, { schema }));
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${name} CASCADE`);
      await admin.end();
    }
  },
);
