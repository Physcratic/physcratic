import 'server-only';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { readRequestBytes, RequestBodyTimeoutError } from '../submission-request';
import { profileReply } from './profile-api';
import { actionDecision, actionLookup } from './actions-contracts';

type Deps = {
  pool: Pool;
  user: (r: Request) => Promise<{ id: string; emailVerified?: boolean } | null | undefined>;
  origin: (r: Request) => boolean;
  ip: (r: Request) => string;
  profiles?: () => boolean;
};
class Fault extends Error { constructor(public status: number, message: string) { super(message); } }

export function createActionsApi(deps: Deps) {
  async function tx<T>(fn: (c: PoolClient) => Promise<T>) {
    const c = await deps.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL statement_timeout='4s'; SET LOCAL lock_timeout='2s'");
      const value = await fn(c);
      await c.query('COMMIT');
      return value;
    } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; }
    finally { c.release(); }
  }
  async function staff(c: PoolClient, id: string) {
    const role = (await c.query('SELECT community_staff_role_locked($1) AS role', [id])).rows[0]?.role;
    if (!['admin', 'moderator'].includes(role)) throw new Fault(403, 'Staff permission required.');
    const banned = (await c.query("SELECT 1 FROM community_restriction WHERE kind='user' AND user_id=$1 AND restricted", [id])).rows[0];
    if (banned) throw new Fault(403, 'Staff permission required.');
    return role as 'admin' | 'moderator';
  }
  async function charge(bucket: string, max: number) {
    // Share the existing moderation budget, so alternating endpoints cannot multiply it.
    const query = {
      text: `INSERT INTO community_moderation_limit(bucket,minute,requests,day,reports,appeals)
        VALUES($1,date_trunc('minute',clock_timestamp()),1,(clock_timestamp() AT TIME ZONE 'UTC')::date,0,0)
        ON CONFLICT(bucket) DO UPDATE SET requests=CASE WHEN community_moderation_limit.minute=date_trunc('minute',clock_timestamp())
        THEN least(121,community_moderation_limit.requests+1) ELSE 1 END,minute=date_trunc('minute',clock_timestamp()) RETURNING requests`,
      values: [bucket], query_timeout: 5000,
    };
    const { rows } = await deps.pool.query(query);
    if (rows[0].requests > max) throw new Fault(429, 'Staff action limit reached. Retry later.');
  }
  return async (request: Request) => {
    try {
      if (!['GET', 'POST'].includes(request.method)) throw new Fault(405, 'Method not allowed.');
      const user = await deps.user(request);
      if (!user) throw new Fault(401, 'Sign in to continue.');
      if (!user.emailVerified || (request.method === 'POST' && !deps.origin(request)))
        throw new Fault(403, 'Request not permitted.');
      await tx(c => staff(c, user.id));
      await charge('user:' + user.id, 60);
      if (request.method === 'POST') await charge('ip:' + deps.ip(request), 120);
      const url = new URL(request.url);
      if (request.url.length > 4096 || [...url.searchParams.keys()].some(k => url.searchParams.getAll(k).length !== 1))
        throw new Fault(400, 'Invalid request.');
      if (request.method === 'GET') {
        const input = actionLookup.parse(Object.fromEntries(url.searchParams));
        return await tx(async c => {
          const role = await staff(c, user.id);
          let id = input.id, label = '', owner = '', protectedTarget = false;
          if (input.kind === 'problem') {
            const row = (await c.query(`SELECT p.id,p.owner_id,r.title
              FROM authored_problem p JOIN LATERAL (SELECT content->>'title' AS title FROM authored_revision
              WHERE problem_id=p.id ORDER BY number DESC LIMIT 1) r ON true WHERE p.id=$1 FOR SHARE OF p`, [id])).rows[0];
            if (!row) throw new Fault(404, 'Published question not found.');
            id = row.id; label = row.title; owner = row.owner_id;
          } else {
            if (input.by === 'handle') {
              if (!deps.profiles?.()) throw new Fault(404, 'Public profile not found.');
              const row = (await c.query('SELECT user_id,handle FROM community_profile WHERE lower(handle)=$1 AND public_visibility=true', [id])).rows[0];
              if (!row) throw new Fault(404, 'Public profile not found.');
              id = row.user_id; label = '@' + row.handle;
            }
            if (!(await c.query('SELECT id FROM "user" WHERE id=$1 FOR SHARE', [id])).rows[0])
              throw new Fault(404, 'Account not found.');
            protectedTarget = ['admin', 'moderator'].includes((await c.query('SELECT community_staff_role_locked($1) AS role', [id])).rows[0]?.role);
            owner = id; label ||= id;
          }
          const restriction = (await c.query('SELECT restricted,version FROM community_restriction WHERE kind=$1 AND target_id=$2', [input.kind, id])).rows[0];
          const audit = (await c.query(`SELECT a.id::text,actor_id AS "actorId",action,version,reason,created_at AS "createdAt"
            FROM community_moderation_audit a WHERE target=$1 AND ($2::bigint IS NULL OR a.id<$2)
            ORDER BY a.id DESC LIMIT 21`, ['restriction-' + input.kind + ':' + id, input.beforeAudit ?? null])).rows;
          return profileReply({ role,
            target: { kind: input.kind, id, label, version: restriction?.version ?? 0, restricted: restriction?.restricted ?? false, protected: protectedTarget || owner === user.id },
            audit: audit.slice(0, 20), nextAudit: audit.length > 20 ? audit[19].id : null,
          });
        });
      }
      if (url.search) throw new Fault(400, 'Invalid request.');
      if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')
        throw new Fault(415, 'Send JSON.');
      const input = actionDecision.parse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readRequestBytes(request, 12000, 5000))));
      return await tx(async c => {
        await staff(c, user.id);
        const result = await c.query('SELECT community_restriction_decide($1,$2,$3,$4,$5,$6) AS version', [user.id, input.kind, input.id, input.version, input.restricted, input.reason]);
        return profileReply({ id: input.id, version: result.rows[0].version });
      });
    } catch (e) {
      const code = (e as { code?: string }).code;
      const status = e instanceof Fault ? e.status : e instanceof z.ZodError || e instanceof SyntaxError || e instanceof TypeError ? 400 :
        e instanceof RangeError ? 413 : e instanceof RequestBodyTimeoutError ? 408 : code === '42501' ? 403 : code === 'P0002' ? 404 : ['23514', '23505', '40001'].includes(code ?? '') ? 409 : 503;
      const response = profileReply({ error: e instanceof Fault ? e.message : status === 403 ? 'This action requires an independent staff member with current permission.' : status === 409 ? 'The target changed. Reload before retrying.' : status === 404 ? 'Target not found.' : status === 503 ? 'Staff actions are temporarily unavailable.' : 'Invalid staff action.' }, status);
      if (status === 429) response.headers.set('Retry-After', '60');
      return response;
    }
  };
}
