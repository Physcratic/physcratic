// Server-side HTTP/application boundary. No auth globals: production injects Better Auth;
// integration tests inject sessions and a disposable PostgreSQL pool into these same handlers.
import { replaceDraftMedia, MediaReferenceError } from "./author-media-references";
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { authoredDraftSchema, authoredDocumentSchema, privatePartSchema, publishableDraftSchema, publicAuthoredContent, publicAuthoredRevision, type AuthoredDocument, type PrivatePart } from "./problem-authoring";
import { readSubmissionJson, RequestBodyTimeoutError } from "./submission-request";

type Action = "create" | "list" | "read" | "update" | "delete" | "preview" | "publish" | "unpublish" | "public";
type Dependencies = { pool: Pool; user: (request: Request) => Promise<{ id: string; emailVerified?: boolean } | null | undefined>; origin: (request: Request) => boolean };
const uuid = z.uuid().transform(v => v.toLowerCase());
const version = z.number().int().positive().max(2_147_483_646);
const saveSchema = z.strictObject({ content: authoredDocumentSchema, privateParts: z.array(privatePartSchema).max(1500) });
const updateSchema = saveSchema.extend({ version });
const versionSchema = z.strictObject({ version });
const writes = new Set<Action>(["create", "update", "delete", "publish", "unpublish"]);
class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
const reply = (body: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
interface LockedDraft { id: string; slug: string; state: string; publishedRevisionId: string | null; version: number; content: AuthoredDocument }
async function lockedDraft(client: PoolClient, id: string, owner: string) {
  const { rows } = await client.query<LockedDraft>(`SELECT p.id,p.slug,p.state,p.published_revision_id AS "publishedRevisionId",d.version,d.content
    FROM authored_problem p JOIN authored_draft d ON d.problem_id=p.id WHERE p.id=$1 AND p.owner_id=$2 FOR UPDATE OF p,d`, [id, owner]);
  if (!rows[0]) throw new HttpError(404, "Draft not found.");
  const { rows: keys } = await client.query<{ data: PrivatePart }>("SELECT data FROM authored_draft_private_part WHERE problem_id=$1 ORDER BY part_id", [id]);
  return { problem: rows[0], draft: authoredDraftSchema.parse({ problemId: id, version: rows[0].version, content: rows[0].content, privateParts: keys.map(k => k.data) }) };
}
async function storeKeys(client: PoolClient, id: string, keys: PrivatePart[]) {
  await client.query("DELETE FROM authored_draft_private_part WHERE problem_id=$1", [id]);
  for (const part of keys) await client.query("INSERT INTO authored_draft_private_part(problem_id,part_id,data) VALUES($1,$2,$3)", [id, part.partId, JSON.stringify(part)]);
}

export function createProblemAuthoringApi(deps: Dependencies) {
  return async function handle(action: Action, request: Request, rawId?: string): Promise<Response> {
    let client: PoolClient | undefined;
    let inTransaction = false;
    try {
      let owner: string | undefined;
      if (action !== "public") {
        const user = await deps.user(request);
        if (!user) throw new HttpError(401, "Sign in to access author drafts.");
        if (user.emailVerified !== true) throw new HttpError(403, "Verify your email before authoring problems.");
        owner = user.id;
      }
      if (writes.has(action) && !deps.origin(request)) throw new HttpError(403, "Request origin rejected.");
      const id = rawId === undefined ? undefined : uuid.parse(rawId);
      // Atomic, bounded storage (one bucket per author), shared across instances; no process-memory limiter.
      if (writes.has(action)) {
        const { rows } = await deps.pool.query<{ requests: number }>(`INSERT INTO authored_write_limit(user_id,window_start,requests) VALUES($1,date_trunc('minute',clock_timestamp()),1)
          ON CONFLICT(user_id) DO UPDATE SET
          requests=CASE WHEN authored_write_limit.window_start=date_trunc('minute',clock_timestamp()) THEN least(authored_write_limit.requests+1,61) ELSE 1 END,
          window_start=date_trunc('minute',clock_timestamp()) RETURNING requests`, [owner]);
        if (rows[0].requests > 60) return new Response(JSON.stringify({ error: "Authoring write limit reached. Retry next minute." }), { status: 429, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store", "Retry-After": "60" } });
      }
      let body: unknown;
      if (writes.has(action)) {
        if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new HttpError(415, "Send JSON.");
        body = await readSubmissionJson(request, 2_000_000);
      }
      if (action === "public") {
        const { rows } = await deps.pool.query(`SELECT r.id,r.problem_id AS "problemId",r.number,r.schema_version AS "schemaVersion",r.content,r.published_at AS "publishedAt"
          FROM authored_problem p JOIN authored_revision r ON r.problem_id=p.id AND r.id=p.published_revision_id
          WHERE p.id=$1 AND p.state='published'`, [id]);
        if (!rows[0]) throw new HttpError(404, "Problem not found.");
        return reply(publicAuthoredRevision(rows[0]));
      }
      if (action === "list") {
        const cursorValue = new URL(request.url).searchParams.get("after");
        const cursor = cursorValue ? uuid.parse(cursorValue) : null;
        const { rows } = await deps.pool.query(`SELECT p.id AS "problemId",p.slug,p.state,d.version,d.content->>'title' AS title,d.updated_at AS "updatedAt"
          FROM authored_problem p JOIN authored_draft d ON d.problem_id=p.id WHERE p.owner_id=$1 AND ($2::uuid IS NULL OR p.id>$2::uuid) ORDER BY p.id LIMIT 51`, [owner, cursor]);
        return reply({ drafts: rows.slice(0, 50), nextCursor: rows.length > 50 ? rows[49].problemId : null });
      }
      client = await deps.pool.connect();
      await client.query("BEGIN"); inTransaction = true;
      // Bound lock/statement waits even if called with a differently configured pool.
      await client.query("SET LOCAL statement_timeout='10s'");
      await client.query("SET LOCAL lock_timeout='5s'");
      let result: unknown;
      let status = 200;
      if (action === "create") {
        const input = saveSchema.parse(body);
        const problemId = randomUUID();
        const draft = authoredDraftSchema.parse({ ...input, problemId, version: 1 });
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,1))", [`author-create:${owner}`]);
        const { rows } = await client.query<{ total: number }>("SELECT count(*)::integer AS total FROM authored_problem WHERE owner_id=$1", [owner]);
        if (rows[0].total >= 100) throw new HttpError(429, "Author problem quota reached.");
        const slug = `problem-${problemId}`;
        await client.query("INSERT INTO authored_problem(id,slug,owner_id) VALUES($1,$2,$3)", [problemId, slug, owner]);
        await client.query("INSERT INTO authored_draft(problem_id,content) VALUES($1,$2)", [problemId, JSON.stringify(draft.content)]);
        await storeKeys(client, problemId, draft.privateParts);
        await replaceDraftMedia(client, problemId, owner!, draft.content, draft.privateParts);
        result = { ...draft, slug, state: "draft" }; status = 201;
      } else {
        const { problem, draft } = await lockedDraft(client, id!, owner!);
        if (writes.has(action)) {
          const input = action === "update" ? updateSchema.parse(body) : versionSchema.parse(body);
          if (input.version !== draft.version) throw new HttpError(409, "Draft changed. Reload before saving or publishing.");
          if (action === "update") {
            const save = updateSchema.parse(input);
            const next = authoredDraftSchema.parse({ problemId: id, version: draft.version + 1, content: save.content, privateParts: save.privateParts });
            await replaceDraftMedia(client, id!, owner!, next.content, next.privateParts);
            await client.query("UPDATE authored_draft SET content=$2,version=version+1,updated_at=now() WHERE problem_id=$1", [id, JSON.stringify(next.content)]);
            await storeKeys(client, id!, next.privateParts);
            result = { ...next, slug: problem.slug, state: problem.state };
          } else if (action === "delete") {
            if (problem.state === "published") throw new HttpError(409, "Unpublish before deleting the working draft.");
            await client.query("DELETE FROM authored_draft WHERE problem_id=$1", [id]);
            await client.query("DELETE FROM authored_problem p WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM authored_revision r WHERE r.problem_id=p.id) AND NOT EXISTS(SELECT 1 FROM author_media m WHERE m.problem_id=p.id)", [id]);
            status = 204;
          } else if (action === "publish") {
            const published = publishableDraftSchema.parse(draft);
            const mediaRefs = await replaceDraftMedia(client, id!, owner!, published.content, published.privateParts);
            const revisionId = randomUUID();
            const { rows } = await client.query<{ number: number }>("SELECT coalesce(max(number),0)+1 AS number FROM authored_revision WHERE problem_id=$1", [id]);
            // Phase 1 sealing: parts + keys FIRST, revision LAST; one transaction, no savepoints.
            for (const section of published.content.sections) for (const part of section.parts) {
              await client.query("INSERT INTO authored_revision_part(revision_id,part_id,answer_mode) VALUES($1,$2,$3)", [revisionId, part.id, part.answerMode]);
              const key = published.privateParts.find(k => k.partId === part.id)!;
              await client.query("INSERT INTO authored_revision_private_part(revision_id,part_id,answer_mode,data) VALUES($1,$2,$3,$4)", [revisionId, part.id, part.answerMode, JSON.stringify(key)]);
            }
            for (const ref of mediaRefs) await client.query("INSERT INTO author_revision_media(revision_id,problem_id,media_id,purpose) VALUES($1,$2,$3,$4)", [revisionId, id, ref.id, ref.purpose]);
            const revision = await client.query(`INSERT INTO authored_revision(id,problem_id,number,content) VALUES($1,$2,$3,$4)
              RETURNING id,problem_id AS "problemId",number,schema_version AS "schemaVersion",content,published_at AS "publishedAt"`, [revisionId, id, rows[0].number, JSON.stringify(published.content)]);
            await client.query("UPDATE authored_problem SET state='published',published_revision_id=$2,updated_at=now() WHERE id=$1", [id, revisionId]);
            await client.query("UPDATE authored_draft SET version=version+1,updated_at=now() WHERE problem_id=$1", [id]);
            result = { version: draft.version + 1, revision: publicAuthoredRevision(revision.rows[0]) };
          } else if (action === "unpublish") {
            await client.query("UPDATE authored_problem SET state='archived',published_revision_id=NULL,updated_at=now() WHERE id=$1", [id]);
            await client.query("UPDATE authored_draft SET version=version+1,updated_at=now() WHERE problem_id=$1", [id]);
            result = { problemId: id, version: draft.version + 1, state: "archived" };
          }
        } else if (action === "preview") {
          result = { problemId: id, version: draft.version, content: publicAuthoredContent(draft.content) };
        } else result = { ...draft, slug: problem.slug, state: problem.state };
      }
      await client.query("COMMIT"); inTransaction = false;
      return reply(result, status);
    } catch (error) {
      if (client && inTransaction) await client.query("ROLLBACK").catch(() => {});
      if (error instanceof MediaReferenceError) return reply({ error: error.message }, 400);
      if (error instanceof HttpError) return reply({ error: error.message }, error.status);
      if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError) return reply({ error: "Invalid authoring request." }, 400);
      if (error instanceof RangeError) return reply({ error: "Authoring request too large." }, 413);
      if (error instanceof RequestBodyTimeoutError) return reply({ error: "Authoring request timed out." }, 408);
      if ((error as { code?: string }).code === "23505") return reply({ error: "Conflicting authoring change. Reload and retry." }, 409);
      return reply({ error: "Authoring is temporarily unavailable. Retry without discarding your draft." }, 503);
    } finally { client?.release(); }
  };
}
