import "server-only";
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { createAuthoredGrader } from "./authored-grading";
import {
  authoredAnswerSchema,
  gradeSelectionSchema,
  type AuthoredGradeInput,
} from "./authored-grading-contracts";
import {
  authoredAttemptPolicy as policy,
  studentSubmissionSchema,
  studentGradeSchema,
  attemptCursorSchema,
  type AuthoredAttempt,
  type StudentSubmission,
} from "./authored-attempt-contracts";
import {
  readRequestBytes,
  RequestBodyTimeoutError,
} from "./submission-request";
import {
  StudentAccessError as AttemptError,
  chargeStudentRequest as charge,
} from "./authored-student-security";
type User = { id: string; emailVerified?: boolean };
type Deps = {
  pool: Pool;
  user: (r: Request) => Promise<User | null | undefined>;
  origin: (r: Request) => boolean;
  grade?: (
    c: PoolClient,
    user: User,
    input: AuthoredGradeInput,
  ) => Promise<unknown>;
};
type Row = {
  id: string;
  user_id: string;
  problem_id: string;
  revision_id: string;
  part_id: string;
  idempotency_key: string;
  answer: unknown;
  status: string;
  reason: string;
  engine_version: string;
  attempt_number: string;
  created_at: Date;
  spoiler_policy: string;
  assisted: boolean;
};
const uuid = z.uuid().transform((v) => v.toLowerCase());
const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      Vary: "Cookie",
    },
  });
function view(row: Row): AuthoredAttempt {
  const selection = {
    problemId: row.problem_id,
    revisionId: row.revision_id,
    partId: row.part_id,
  };
  const parsed = studentGradeSchema.safeParse({
    status: row.status,
    reason: row.reason,
    engineVersion: row.engine_version,
    selection,
  });
  const answer = authoredAnswerSchema.safeParse(row.answer);
  if (!parsed.success || !answer.success) throw Error("Invalid stored attempt");
  const grade = parsed.data;
  if (
    row.spoiler_policy !== policy.spoilerPolicy ||
    typeof row.assisted !== "boolean"
  )
    throw Error("Invalid attempt policy");
  return {
    id: row.id,
    ...selection,
    answer: answer.data,
    status: grade.status,
    reason: grade.reason,
    engineVersion: grade.engineVersion,
    attemptNumber: row.attempt_number,
    createdAt: row.created_at.toISOString(),
    spoilerPolicy: policy.spoilerPolicy,
    assisted: row.assisted,
  };
}
function storedAnswer(value: unknown) {
  const parsed = authoredAnswerSchema.safeParse(value);
  if (!parsed.success) throw Error("Invalid stored answer");
  return parsed.data;
}
function same(row: Row, problem: string, input: StudentSubmission) {
  return (
    row.problem_id === problem &&
    row.revision_id === input.revisionId &&
    row.part_id === input.partId &&
    JSON.stringify(storedAnswer(row.answer)) === JSON.stringify(input.answer)
  );
}
/** Declared variable names from a stored key, and only valid names. Never anything else from the key. */
export function publicSymbolNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names = value.filter((name): name is string => typeof name === "string" && /^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(name));
  return [...new Set(names)].slice(0, 20);
}

export function createAuthoredAttemptApi(deps: Deps) {
  return async function handle(
    action: "submit" | "list" | "read" | "info",
    request: Request,
    rawId?: string,
  ): Promise<Response> {
    let client: PoolClient | undefined,
      inTransaction = false;
    try {
      const user = await deps.user(request);
      if (!user)
        throw new AttemptError(
          401,
          "Sign in to access your authored-problem attempts.",
        );
      if (user.emailVerified !== true)
        throw new AttemptError(
          403,
          "Verify your email before submitting or reading attempts.",
        );
      if (action === "submit" && !deps.origin(request))
        throw new AttemptError(403, "Request origin rejected.");
      await charge(deps.pool, user.id, action === "submit");
      const id = rawId ? uuid.parse(rawId) : undefined;
      if (action === "read") {
        const { rows } = await deps.pool.query<Row>(
          "SELECT * FROM authored_attempt WHERE id=$1 AND user_id=$2",
          [id, user.id],
        );
        if (!rows[0]) throw new AttemptError(404, "Attempt not found.");
        return reply({ attempt: view(rows[0]) });
      }
      if (action === "list") {
        const params = new URL(request.url).searchParams;
        if (
          [...params.keys()].some((k) => !["problemId", "after"].includes(k)) ||
          [...params.keys()].some((k) => params.getAll(k).length !== 1)
        )
          throw new AttemptError(400, "Invalid history query.");
        const problem = params.has("problemId")
            ? uuid.parse(params.get("problemId"))
            : null,
          raw = params.get("after");
        let cursor: z.infer<typeof attemptCursorSchema> | null = null;
        if (raw) {
          if (raw.length > 256 || !/^[A-Za-z0-9_-]+$/.test(raw))
            throw new AttemptError(400, "Invalid history cursor.");
          cursor = attemptCursorSchema.parse(
            JSON.parse(Buffer.from(raw, "base64url").toString("utf8")),
          );
        }
        const { rows } = await deps.pool.query<Row>(
          `SELECT * FROM authored_attempt WHERE user_id=$1 AND ($2::uuid IS NULL OR problem_id=$2) AND ($3::timestamptz IS NULL OR (created_at,id)<($3::timestamptz,$4::uuid)) ORDER BY created_at DESC,id DESC LIMIT 51`,
          [user.id, problem, cursor?.at ?? null, cursor?.id ?? null],
        );
        const visible = rows.slice(0, policy.historyPageSize),
          last = visible.at(-1);
        return reply({
          attempts: visible.map(view),
          nextCursor:
            rows.length > policy.historyPageSize && last
              ? Buffer.from(
                  JSON.stringify({
                    at: last.created_at.toISOString(),
                    id: last.id,
                  }),
                ).toString("base64url")
              : null,
        });
      }
      if (action === "info") {
        // One snapshot of the same published pointer used by the public reader. No private
        // content/solution join. The only key field read is the list of declared variable names.
        const { rows } = await deps.pool.query<{
          revision_id: string;
          part_id: string;
          answer_mode: string;
          used: string;
          symbols: unknown;
        }>(
          `SELECT p.published_revision_id AS revision_id,rp.part_id,rp.answer_mode,coalesce((SELECT a.attempt_number FROM authored_attempt a WHERE a.user_id=$2 AND a.revision_id=rp.revision_id AND a.part_id=rp.part_id ORDER BY a.attempt_number DESC LIMIT 1),0)::text AS used,coalesce((SELECT jsonb_agg(v.name) FROM authored_revision_private_part pp, jsonb_to_recordset(CASE WHEN jsonb_typeof(pp.data->'key'->'variables')='array' THEN pp.data->'key'->'variables' ELSE '[]'::jsonb END) AS v(name text) WHERE pp.revision_id=rp.revision_id AND pp.part_id=rp.part_id AND pp.data->'key'->>'kind'='expression'),'[]'::jsonb) AS symbols
     FROM authored_problem p JOIN authored_revision r ON r.problem_id=p.id AND r.id=p.published_revision_id JOIN authored_revision_part rp ON rp.revision_id=r.id WHERE p.id=$1 AND p.state='published' ORDER BY rp.part_id`,
          [id, user.id],
        );
        if (!rows[0])
          throw new AttemptError(404, "Published problem not found.");
        return reply({
          problemId: id,
          revisionId: rows[0].revision_id,
          parts: rows.map((r) => ({
            partId: r.part_id,
            answerMode: r.answer_mode,
            // Declared variable names only, for the answer palette. Never the expected expression, domains or exclusions.
            symbols: publicSymbolNames(r.symbols),
            attemptsUsed: r.used,
            attemptsRemaining: null, // No per-part lifetime cap.
          })),
          limits: policy,
          links: {
            problem: `/api/authored-problems/${id}`,
            submit: `/api/authored-problems/${id}/attempts`,
            history: `/api/authored-problems/attempts?problemId=${id}`,
          },
        });
      }
      if (
        request.headers
          .get("content-type")
          ?.split(";")[0]
          .trim()
          .toLowerCase() !== "application/json"
      )
        throw new AttemptError(415, "Send JSON.");
      const bytes = await readRequestBytes(
        request,
        policy.maxBodyBytes,
        policy.bodyTimeoutMs,
      );
      const input = studentSubmissionSchema.parse(
        JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
      );
      client = await deps.pool.connect();
      await client.query("BEGIN");
      inTransaction = true;
      await client.query("SET LOCAL statement_timeout='5s'");
      await client.query("SET LOCAL lock_timeout='2s'");
      await client.query("SET LOCAL idle_in_transaction_session_timeout='10s'");
      // Serialize this student's idempotency, rolling usage and ordinal allocation across problems.
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,6))",
        [`authored-student:${user.id}`],
      );
      const existing = await client.query<Row>(
        "SELECT * FROM authored_attempt WHERE user_id=$1 AND idempotency_key=$2",
        [user.id, input.idempotencyKey],
      );
      if (existing.rows[0]) {
        if (!same(existing.rows[0], id!, input))
          throw new AttemptError(
            409,
            "This idempotency key was used for different work.",
          );
        const attempt = view(existing.rows[0]);
        await client.query("COMMIT");
        inTransaction = false;
        return reply({ attempt, replayed: true });
      }
      // Locks publication through grading+insert+commit; publishing/unpublishing use
      // FOR UPDATE on this parent. A successful submission linearizes before them.
      const publication = await client.query<{ published_revision_id: string }>(
        "SELECT published_revision_id FROM authored_problem WHERE id=$1 AND state='published' FOR SHARE",
        [id],
      );
      if (!publication.rows[0])
        throw new AttemptError(404, "Published problem not found.");
      if (publication.rows[0].published_revision_id !== input.revisionId)
        throw new AttemptError(
          409,
          "Published revision changed. Reload the problem before a new attempt.",
        );
      const part = await client.query<{ answer_mode: string }>(
        "SELECT answer_mode FROM authored_revision_part WHERE revision_id=$1 AND part_id=$2",
        [input.revisionId, input.partId],
      );
      if (!part.rows[0])
        throw new AttemptError(404, "Published part not found.");
      // Both lookups stay bounded/indexed as immutable history grows. Count only
      // up to the rolling-day threshold; use the ordinal index, not COUNT(*),
      // for the next per-revision/part sequence number.
      const usage = await client.query<{ daily: number; last_number: string }>(
        `SELECT (SELECT count(*)::integer FROM (SELECT 1 FROM authored_attempt WHERE user_id=$1 AND created_at>=statement_timestamp()-interval '24 hours' LIMIT $4) recent) AS daily,
        coalesce((SELECT attempt_number FROM authored_attempt WHERE user_id=$1 AND revision_id=$2 AND part_id=$3 ORDER BY attempt_number DESC LIMIT 1),0)::text AS last_number`,
        [user.id, input.revisionId, input.partId, policy.attemptsPerDay],
      );
      if (usage.rows[0].daily >= policy.attemptsPerDay)
        throw new AttemptError(
          429,
          "Rolling 24-hour attempt limit reached. Submitting does not unlock private answers.",
        );
      const previous = BigInt(usage.rows[0].last_number);
      // This is a storage representation guard, not a practice policy limit.
      // Check before addition/grading; preserve retry/history at the bigint edge.
      if (previous < BigInt(0) || previous >= BigInt("9223372036854775807"))
        throw Error("Attempt ordinal exhausted");
      const nextNumber = (previous + BigInt(1)).toString();
      const selection = gradeSelectionSchema.parse({
          problemId: id,
          revisionId: input.revisionId,
          partId: input.partId,
        }),
        gradeInput = { ...selection, answer: input.answer };
      let outcome: unknown;
      try {
        outcome = deps.grade
          ? await deps.grade(client, user, gradeInput)
          : await createAuthoredGrader({
              pool: client,
              user: async () => user,
            })(gradeInput);
      } catch {
        outcome = {
          status: "needs-review",
          reason: "service-unavailable",
          engineVersion:
            part.rows[0].answer_mode === "expression"
              ? "symbolic-v1"
              : "numeric-v1",
          selection,
        };
      }
      const validatedGrade = studentGradeSchema.safeParse(outcome);
      if (!validatedGrade.success) throw Error("Invalid grading response");
      const grade = validatedGrade.data;
      if (JSON.stringify(grade.selection) !== JSON.stringify(selection))
        throw Error("Grading selection changed");
      const created = await client.query<Row>(
        `INSERT INTO authored_attempt(id,user_id,problem_id,revision_id,part_id,idempotency_key,answer,status,reason,engine_version,attempt_number) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [
          randomUUID(),
          user.id,
          id,
          input.revisionId,
          input.partId,
          input.idempotencyKey,
          JSON.stringify(input.answer),
          grade.status,
          grade.reason,
          grade.engineVersion,
          nextNumber,
        ],
      );
      const attempt = view(created.rows[0]);
      await client.query("COMMIT");
      inTransaction = false;
      return reply({ attempt, replayed: false }, 201);
    } catch (e) {
      if (client && inTransaction)
        await client.query("ROLLBACK").catch(() => {});
      if (e instanceof AttemptError) {
        const response = reply({ error: e.message }, e.status);
        if (e.retryAfter) response.headers.set("Retry-After", e.retryAfter);
        return response;
      }
      if (e instanceof RequestBodyTimeoutError)
        return reply(
          {
            error:
              "Submission body timed out. Retry with the same idempotency key.",
          },
          408,
        );
      if (e instanceof RangeError)
        return reply({ error: "Submission is too large." }, 413);
      if (
        e instanceof z.ZodError ||
        e instanceof SyntaxError ||
        e instanceof TypeError
      )
        return reply({ error: "Invalid attempt request." }, 400);
      return reply(
        {
          error:
            "Attempts are temporarily unavailable. Retry with the same idempotency key.",
        },
        503,
      );
    } finally {
      client?.release();
    }
  };
}
