import "server-only";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { authoredDocumentSchema } from "./problem-authoring";
import { workedSolutionSchema } from "./authored-solution-contracts";
import { mediaBytes } from "./authored-solution-api";
import type { AuthorStorage } from "./author-media-api";
import { publicSolutionPolicy, revisionSolutionColumns, storedSolutionPolicy } from "./authored-solution-policy";
import { publicSolutionPath, publicSolutionSchema } from "./authored-public-solution-contracts";
const id = z.uuid().transform(s => s.toLowerCase());
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
export const publicSolutionReply = (body: unknown, status = 200) => Response.json(body, { status, headers });
class AccessError extends Error { constructor(public status: number, message: string) { super(message); } }
type Media = { id: string; purpose: "solution-image" | "solution-pdf"; media_type: "image/png" | "image/jpeg" | "image/webp" | "application/pdf"; pathname: string; bytes: number };
/** Cookie-independent read. No session binding, reveal ledger or grading-key projection. */
export function createPublicAuthoredSolutionApi(deps: { pool: Pool; storage: Pick<AuthorStorage, "get"> }) {
  return async (request: Request, rawProblem: string, rawMedia?: string): Promise<Response> => {
    let c: PoolClient | undefined, transaction = false;
    try {
      if (request.method !== "GET") throw new AccessError(405, "Method not allowed.");
      const q = new URL(request.url).searchParams;
      if ([...q.keys()].some(k => k !== "revision") || q.getAll("revision").length !== 1) throw new AccessError(400, "Specify one revision.");
      const problem = id.parse(rawProblem), revision = id.parse(q.get("revision")), mediaId = rawMedia === undefined ? undefined : id.parse(rawMedia);
      c = await deps.pool.connect(); await c.query("BEGIN"); transaction = true;
      await c.query("SET LOCAL statement_timeout='5s'"); await c.query("SET LOCAL lock_timeout='2s'"); await c.query("SET LOCAL idle_in_transaction_session_timeout='10s'");
      const publication = await c.query(`SELECT p.published_revision_id,${revisionSolutionColumns},r.content->'sections' AS sections,r.content->'attachments' AS attachments FROM authored_problem p JOIN authored_revision r ON r.id=p.published_revision_id AND r.problem_id=p.id WHERE p.id=$1 AND p.state='published' FOR SHARE OF p`, [problem]);
      const current = publication.rows[0];
      if (!current) throw new AccessError(404, "Worked solution unavailable.");
      if (current.published_revision_id !== revision) throw new AccessError(409, "Published revision changed. Reload the problem.");
      if (storedSolutionPolicy(current) !== publicSolutionPolicy) throw new AccessError(404, "Worked solution unavailable.");
      const sections = authoredDocumentSchema.shape.sections.parse(current.sections);
      const attachments = authoredDocumentSchema.shape.attachments.parse(current.attachments);
      const solutions = await c.query<{ part_id: string; solution: unknown }>("SELECT part_id,data->'solution' AS solution FROM authored_revision_private_part WHERE revision_id=$1", [revision]);
      const imageIds = new Set<string>();
      const byPart = new Map(solutions.rows.map(r => [r.part_id, r]));
      const parts = sections.flatMap(s => s.parts.map(p => {
        const row = byPart.get(p.id);
        if (!row) throw Error("Missing stored solution part");
        const solution = workedSolutionSchema.parse(row.solution);
        for (const b of solution) if (b.kind === "image") imageIds.add(b.mediaId);
        return { partId: p.id, label: p.label, solution };
      }));
      const registered = await c.query<Media>(`SELECT m.id,m.purpose,m.media_type,m.pathname,m.bytes FROM author_revision_media rm JOIN author_media m ON m.id=rm.media_id AND m.problem_id=rm.problem_id AND m.purpose=rm.purpose WHERE rm.problem_id=$1 AND rm.revision_id=$2 AND m.state='ready' AND rm.purpose IN ('solution-image','solution-pdf')`, [problem, revision]);
      const media = registered.rows.filter(m => m.purpose === "solution-image" ? imageIds.has(m.id) : attachments.some(a => a.id === m.id && a.purpose === "solution-pdf"));
      if ([...imageIds].some(i => !media.some(m => m.id === i))) throw Error("Missing solution image");
      // Missing attachment data is an error, never silently substituted with another file.
      if (attachments.some(a => a.purpose === "solution-pdf" && !media.some(m => m.id === a.id))) throw Error("Missing solution PDF");
      let response: Response;
      if (mediaId) {
        const file = media.find(m => m.id === mediaId);
        if (!file) throw new AccessError(404, "Worked solution file unavailable.");
        const bytes = await mediaBytes(deps.storage, file.pathname, Number(file.bytes));
        response = new Response(bytes, { headers: { ...headers, "Content-Type": file.media_type, "Content-Length": String(bytes.byteLength), "Content-Disposition": `${file.purpose === "solution-pdf" ? "attachment" : "inline"}; filename="worked-solution.${file.purpose === "solution-pdf" ? "pdf" : file.media_type.split('/')[1]}"`, "Content-Security-Policy": "sandbox; default-src 'none'", "Cross-Origin-Resource-Policy": "same-origin" } });
      } else response = publicSolutionReply(publicSolutionSchema.parse({ problemId: problem, revisionId: revision, policy: publicSolutionPolicy, parts, media: media.map(m => ({ id: m.id, purpose: m.purpose, mediaType: m.media_type, url: publicSolutionPath(problem, revision, m.id) })) }));
      await c.query("COMMIT"); transaction = false; return response;
    } catch (error) {
      if (c && transaction) await c.query("ROLLBACK").catch(() => {});
      if (error instanceof AccessError) return publicSolutionReply({ error: error.message }, error.status);
      if (error instanceof z.ZodError) return publicSolutionReply({ error: "Invalid worked solution request or content." }, 400);
      return publicSolutionReply({ error: "Worked solution temporarily unavailable. Please retry." }, 503);
    } finally { c?.release(); }
  };
}
