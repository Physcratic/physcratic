import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { Pool } from 'pg';
import { communityActionsEnabled } from './community/action-policy';
import { actionDecision, actionLookup, actionDetail } from './community/actions-contracts';
import { createActionsRoute } from './community/actions-route';
import { createActionsApi } from './community/actions-api';
import { accountIsBanned } from './community/account-restriction';

test('staff actions require all gates and disabled routes never load database/session bindings', async () => {
  assert.equal(communityActionsEnabled({}), false);
  assert.equal(communityActionsEnabled({ COMMUNITY_ACTIONS_ENABLED: 'true', COMMUNITY_STAFF_ENABLED: 'true' }), false);
  assert.equal(communityActionsEnabled({ COMMUNITY_ACTIONS_ENABLED: 'true', COMMUNITY_STAFF_ENABLED: 'true', COMMUNITY_MODERATION_ENABLED: 'true' }), true);
  const saved = { ...process.env };
  try {
    delete process.env.COMMUNITY_ACTIONS_ENABLED;
    assert.equal(await accountIsBanned({ query: async () => { throw Error('must not query'); } } as unknown as Pool, 'user'), false);
    const route = createActionsRoute(() => false, async () => { throw Error('must not load'); });
    for (const method of ['GET', 'POST']) assert.equal((await route(new Request('https://test', { method }))).status, 503);
    process.env.COMMUNITY_ACTIONS_ENABLED = process.env.COMMUNITY_STAFF_ENABLED = process.env.COMMUNITY_MODERATION_ENABLED = 'true';
  } finally { process.env = saved; }
});

test('strict decisions bind the exact target and version, and require a bounded reason', () => {
  const input = { kind: 'problem', id: randomUUID(), version: 0, restricted: true, reason: 'Reviewed spam' };
  assert.equal(actionDecision.safeParse(input).success, true);
  for (const changed of [{ reason: '' }, { reason: '\u0001bad' }, { reason: 'x'.repeat(1001) }, { version: -1 }, { version: 2147483647 }, { id: 'bad' }, { role: 'admin' }, { restricted: 'true' }])
    assert.equal(actionDecision.safeParse({ ...input, ...changed }).success, false);
  assert.equal(actionLookup.safeParse({ kind: 'user', id: 'public_student', by: 'handle' }).success, true);
  assert.equal(actionLookup.safeParse({ kind: 'problem', id: input.id, by: 'handle' }).success, false);
});

const databaseUrl = process.env.AUTHORING_TEST_DATABASE_URL;
const pgliteModule = process.env.STAFF_ACTIONS_PGLITE_MODULE;
test('0019 staff decisions, bans, publication enforcement, audit, rollback and restricted runtime permissions', { skip: !databaseUrl && !pgliteModule }, async () => {
  const schema = 'staff_actions_' + randomUUID().replaceAll('-', '');
  const runtimeRole = schema + '_runtime';
  let admin: Pool, pool: Pool, embedded: { close(): Promise<void> } | undefined;
  if (databaseUrl) {
    const url = new URL(databaseUrl);
    assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.pathname, '/physcratic_authoring_test');
    admin = new Pool({ connectionString: databaseUrl });
    pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema},public` });
    await admin.query(`CREATE SCHEMA ${schema}`);
  } else {
    const { PGlite } = createRequire(import.meta.url)(pgliteModule!);
    const db = new PGlite(); embedded = db;
    const query = async (text: string | { text: string; values?: unknown[] }, values?: unknown[]) => {
      const result = typeof text === 'string' && !values && text.includes(';') ? (await db.exec(text)).at(-1) : await db.query(typeof text === 'string' ? text : text.text, values ?? (typeof text === 'string' ? undefined : text.values));
      return { rows: result?.rows ?? [], rowCount: result?.affectedRows ?? result?.rows?.length ?? 0 };
    };
    const adapter = { query, connect: async () => ({ query, release() {} }), end: async () => {} };
    admin = pool = adapter as unknown as Pool;
    await admin.query(`CREATE SCHEMA ${schema}; SET search_path=${schema},public`);
  }
  try {
    await pool.query(`CREATE TABLE "user"(id text PRIMARY KEY);
      CREATE TABLE "session"(id text PRIMARY KEY,"userId" text REFERENCES "user"(id));
      CREATE TABLE authored_problem(id uuid PRIMARY KEY,owner_id text REFERENCES "user"(id),state text NOT NULL,published_revision_id uuid,updated_at timestamptz DEFAULT now());
      CREATE TABLE authored_revision(id uuid PRIMARY KEY,problem_id uuid REFERENCES authored_problem(id),number integer,content jsonb);
      CREATE TABLE community_staff(user_id text PRIMARY KEY,role text);
      CREATE FUNCTION community_staff_role_locked(actor text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path FROM CURRENT AS $$ DECLARE r text; BEGIN SELECT role INTO r FROM ${schema}.community_staff WHERE user_id=actor FOR SHARE; RETURN coalesce(r,'none'); END $$;
      REVOKE ALL ON FUNCTION community_staff_role_locked(text) FROM PUBLIC;
      CREATE TABLE community_moderation_audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_id text,action text,target text,version integer,reason text,data jsonb,created_at timestamptz DEFAULT clock_timestamp());
      CREATE TABLE community_moderation_limit(bucket text PRIMARY KEY,minute timestamptz,requests integer,day date,reports integer,appeals integer);
      INSERT INTO "user" VALUES('owner'),('student'),('moderator'),('admin'),('visitor');
      INSERT INTO community_staff VALUES('moderator','moderator'),('admin','admin');`);
    await pool.query(await readFile('migrations/0019_staff_actions.up.sql', 'utf8'));
    const problem = randomUUID(), revision = randomUUID();
    await pool.query("INSERT INTO authored_problem(id,owner_id,state,published_revision_id) VALUES($1,'owner','published',$2)", [problem, revision]);
    await pool.query('INSERT INTO authored_revision VALUES($1,$2,1,$3)', [revision, problem, JSON.stringify({ title: 'Test Question' })]);
    await pool.query("INSERT INTO \"session\" VALUES('old-session','student')");
    // Application runtime can call the reviewed decision routine, but cannot forge
    // restriction records or audit history through direct table writes.
    await admin.query(`CREATE ROLE ${runtimeRole} NOLOGIN`);
    await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO ${runtimeRole};
      GRANT SELECT ON "user",authored_problem,authored_revision,community_restriction,community_moderation_audit TO ${runtimeRole};
      GRANT UPDATE(id) ON "user" TO ${runtimeRole};
      GRANT UPDATE(id,state,published_revision_id) ON authored_problem TO ${runtimeRole};
      GRANT SELECT,INSERT,UPDATE,DELETE ON "session" TO ${runtimeRole};
      GRANT SELECT,INSERT,UPDATE ON community_moderation_limit TO ${runtimeRole};
      GRANT EXECUTE ON FUNCTION community_staff_role_locked(text),community_restriction_decide(text,text,text,integer,boolean,text) TO ${runtimeRole};`);
    if (databaseUrl) {
      await pool.end();
      pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema},public -c role=${runtimeRole}` });
    } else await pool.query(`SET ROLE ${runtimeRole}`);
    const api = createActionsApi({ pool, user: async r => { const id = r.headers.get('x-user'); return id ? { id, emailVerified: id !== 'unverified' } : null; }, origin: r => r.headers.get('origin') === 'https://test', ip: () => 'synthetic' });
    const read = (who: string | null, kind: string, id: string, extra = '') => api(new Request(`https://test/api/community/actions?kind=${kind}&id=${id}${extra}`, { headers: who ? { 'x-user': who } : {} }));
    const decide = (who: string, kind: string, id: string, version: number, restricted: boolean, reason = 'Reviewed decision', origin = 'https://test') => api(new Request('https://test/api/community/actions', { method: 'POST', headers: { 'x-user': who, origin, 'content-type': 'application/json' }, body: JSON.stringify({ kind, id, version, restricted, reason }) }));
    assert.equal((await read(null, 'user', 'student')).status, 401);
    assert.equal((await read('visitor', 'user', 'student')).status, 403);
    assert.equal((await read('unverified', 'user', 'student')).status, 403);
    assert.equal((await decide('moderator', 'user', 'student', 0, true, 'Reason', 'https://evil')).status, 403);
    assert.equal((await decide('moderator', 'user', 'student', 0, true, '')).status, 400);
    assert.equal((await decide('moderator', 'user', 'admin', 0, true)).status, 403);
    assert.equal((await decide('moderator', 'user', 'moderator', 0, true)).status, 403);
    assert.equal((await decide('moderator', 'user', 'missing', 0, true)).status, 404);
    const before = actionDetail.parse(await (await read('moderator', 'problem', problem)).json());
    assert.equal(before.target.version, 0); assert.equal(before.target.label, 'Test Question');
    assert.equal((await decide('moderator', 'problem', problem, 0, true)).status, 200);
    await assert.rejects(pool.query("UPDATE authored_problem SET state='published' WHERE id=$1", [problem]), (e: unknown) => (e as { code: string }).code === '42501');
    assert.equal((await pool.query('SELECT state FROM authored_problem WHERE id=$1', [problem])).rows[0].state, 'archived');
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM authored_revision WHERE problem_id=$1', [problem])).rows[0].n, 1);
    assert.equal((await decide('moderator', 'problem', problem, 0, true)).status, 409);
    assert.equal((await decide('moderator', 'problem', problem, 1, false)).status, 403);
    assert.equal((await decide('admin', 'problem', problem, 1, false)).status, 200);
    assert.equal((await pool.query('SELECT state FROM authored_problem WHERE id=$1', [problem])).rows[0].state, 'archived');
    assert.equal((await decide('moderator', 'user', 'student', 0, true, '<script>literal reason</script>')).status, 200);
    assert.equal((await pool.query('SELECT * FROM "session" WHERE "userId"=$1', ['student'])).rows.length, 0);
    await assert.rejects(pool.query("INSERT INTO \"session\" VALUES('blocked','student')"), (e: unknown) => (e as { code: string }).code === '42501');
    assert.equal(await accountIsBanned(pool, 'student', true), true);
    assert.equal((await decide('moderator', 'user', 'student', 1, false)).status, 403);
    assert.equal((await decide('admin', 'user', 'student', 1, false)).status, 200);
    await pool.query("INSERT INTO \"session\" VALUES('new-session','student')");
    const after = actionDetail.parse(await (await read('admin', 'user', 'student')).json());
    assert.equal(after.target.version, 2); assert.equal(after.target.restricted, false);
    assert.deepEqual(after.audit.map(a => a.action), ['unban', 'ban']);
    assert.equal(after.audit[1].reason, '<script>literal reason</script>');
    for (let i = 0; i < 21; i++) await pool.query('SELECT community_restriction_decide($1,$2,$3,$4,$5,$6)', ['admin', 'user', 'student', 2 + i, i % 2 === 0, 'Pagination fixture']);
    const page = actionDetail.parse(await (await read('admin', 'user', 'student')).json());
    assert.equal(page.audit.length, 20); assert.ok(page.nextAudit);
    const older = actionDetail.parse(await (await read('admin', 'user', 'student', '&beforeAudit=' + page.nextAudit)).json());
    assert.equal(older.audit.length, 3);
    assert.ok(BigInt(page.audit.at(-1)!.id) > BigInt(older.audit[0].id));
    for (const query of ["UPDATE community_restriction SET restricted=false", "DELETE FROM community_restriction", "INSERT INTO community_moderation_audit(action) VALUES('forged')", "TRUNCATE community_restriction"])
      await assert.rejects(pool.query(query), (e: unknown) => (e as { code: string }).code === '42501');
    // An attacker-owned temporary table must not replace a privileged relation.
    await pool.query("CREATE TEMP TABLE community_staff(user_id text,role text);INSERT INTO community_staff VALUES('visitor','admin')");
    assert.equal((await decide('visitor', 'user', 'student', 2, true)).status, 403);
    await pool.query('DROP TABLE pg_temp.community_staff');
    await pool.query('RESET ROLE');
    await pool.query(await readFile('migrations/0019_staff_actions.down.sql', 'utf8'));
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM community_restriction")).rows[0].n, 2);
    await assert.rejects(pool.query("INSERT INTO \"session\" VALUES('rollback-blocked','student')"), (e: unknown) => (e as { code: string }).code === '42501');
    await admin.query(`UPDATE ${schema}.community_staff SET role='none' WHERE user_id='moderator'`);
    assert.equal((await read('moderator', 'user', 'student')).status, 403);
  } finally {
    await pool.query('RESET ROLE').catch(() => {});
    if (embedded) await embedded.close();
    else { await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE;DROP ROLE IF EXISTS ${runtimeRole}`); await admin.end(); }
  }
});
