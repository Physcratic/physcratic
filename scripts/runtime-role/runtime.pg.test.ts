import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

const raw = process.env.AUTHORING_TEST_DATABASE_URL;
// Only the new proposal and uncovered dependencies. The existing activation
// LOGIN, account-guard and broad implementation suites remain authoritative.
test('current-feature runtime proposal on isolated PostgreSQL 18.7 LOGIN', { skip: !raw }, async t => {
  const root = new URL(raw!);
  assert.ok(['postgres:', 'postgresql:'].includes(root.protocol));
  assert.equal(root.hostname, '127.0.0.1');
  assert.equal(root.pathname, '/physcratic_authoring_test');
  assert.equal(root.search, ''); assert.equal(root.hash, '');
  const name = 'runtime_' + randomUUID().replaceAll('-', '');
  const owner = name + '_owner', role = name + '_app';
  const admin = new Pool({ connectionString: raw, max: 1 });
  let setup: Pool | undefined, app: Pool | undefined, created = false, ownerCreated = false, roleCreated = false;
  let closing = false;
  const idleErrors: Error[] = [];
  const idleError = (error: Error) => { if (!closing) idleErrors.push(error); };
  admin.on('error', idleError);
  const previous = { ...process.env };
  try {
    for (let attempt = 0; ; attempt++) {
      try { await admin.query('SELECT 1'); break; }
      catch (error) { if (attempt >= 20) throw error; await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.equal((await admin.query('SHOW server_version_num')).rows[0].server_version_num, '180007');
    await admin.query(`CREATE ROLE ${owner} NOLOGIN`); ownerCreated = true;
    await admin.query(`CREATE DATABASE ${name} OWNER ${owner}`); created = true;
    const database = new URL(root); database.pathname = '/' + name;
    setup = new Pool({ connectionString: database.href, max: 1 });
    setup.on('error', idleError);
    // Installation owner only for synthetic setup, never for runtime requests.
    await setup.query(`SET ROLE ${owner}; SET search_path=public,pg_catalog`);
    const { fixtureDDL, seed } = await import('../authoring-release-production/package/test-fixture.mjs');
    for (const ddl of fixtureDDL()) await setup.query(ddl);
    await seed(setup);
    await setup.query(await readFile('migrations/20261031_auth_rate_limit.sql', 'utf8'));
    const migrations = JSON.parse(await readFile('scripts/production-upgrade/migrations.json', 'utf8')) as { path: string }[];
    for (const migration of migrations) await setup.query(await readFile(migration.path, 'utf8'));
    const owners = async () => (await setup!.query(`SELECT c.relname,c.relowner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname`)).rows;
    const routineOwners = async () => (await setup!.query(`SELECT p.oid,p.proowner,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY p.oid`)).rows;
    const ownersBefore = await owners();
    const routineOwnersBefore = await routineOwners();
    await setup.query('RESET ROLE');
    const provision = await readFile('scripts/runtime-role/provision.review.sql', 'utf8');
    const bind = (sql: string, dbName = name) => sql.replaceAll(':"runtime_role"', role)
      .replaceAll(":'runtime_role'", "'" + role + "'")
      .replaceAll(':"database_name"', dbName).replaceAll(":'database_name'", "'" + dbName + "'");
    const audit = bind(await readFile('scripts/runtime-role/verify.readonly.sql', 'utf8'));
    const auditProblems = async () => {
      const results = await setup!.query(audit) as unknown as { rows: { kind: string }[] }[];
      return results.at(-2)!.rows;
    };
    assert.deepEqual((await auditProblems()).map(problem => problem.kind), ['role_absent']);
    await assert.rejects(setup.query(bind(provision, 'wrong_database')), { code: '22012' });
    await setup.query('ROLLBACK');
    await setup.query(bind(provision)); roleCreated = true;
    assert.deepEqual(await owners(), ownersBefore, 'No relation/sequence ownership change');
    assert.deepEqual(await routineOwners(), routineOwnersBefore, 'No function ownership/search-path change');
    await assert.rejects(setup.query(bind(provision)), { code: '42710' });
    await setup.query('ROLLBACK');
    // Synthetic password only; Production uses interactive owner-controlled SCRAM.
    await setup.query(`ALTER ROLE ${role} PASSWORD 'synthetic-runtime-only'`);
    const manifest = JSON.parse(await readFile('scripts/runtime-role/permissions.json', 'utf8')) as {
      tables: { name: string; privileges: string[]; updateColumns?: string[] }[];
    };
    assert.deepEqual(await auditProblems(), []);
    // Independently compare every effective column right with the JSON manifest.
    for (const table of manifest.tables) {
      const columns: { rows: { attname: string }[] } = await setup.query('SELECT attname FROM pg_attribute WHERE attrelid=$1::regclass AND attnum>0 AND NOT attisdropped', ['public."' + table.name + '"']);
      for (const { attname } of columns.rows) for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']) {
        const actual: boolean = (await setup.query('SELECT has_column_privilege($1,$2,$3,$4) AS allowed', [role, 'public."' + table.name + '"', attname, privilege])).rows[0].allowed;
        const expected: boolean = table.privileges.includes(privilege) || (privilege === 'UPDATE' && table.updateColumns?.includes(attname)) || false;
        assert.equal(actual, expected, `${table.name}.${attname} ${privilege}`);
      }
    }
    await setup.query(`GRANT UPDATE("userId") ON contest_admin TO ${role}`);
    assert.ok((await auditProblems()).length, 'Audit rejects an unexpected effective column grant');
    await setup.query(`REVOKE UPDATE("userId") ON contest_admin FROM ${role}`);
    assert.deepEqual(await auditProblems(), []);
    await setup.query(`GRANT SELECT ON authored_problem TO ${role} WITH GRANT OPTION`);
    assert.ok((await auditProblems()).length, 'Audit rejects delegation of an otherwise required privilege');
    await setup.query(`REVOKE GRANT OPTION FOR SELECT ON authored_problem FROM ${role}`);
    assert.deepEqual(await auditProblems(), []);

    const login = new URL(database); login.username = role; login.password = 'synthetic-runtime-only';
    for (const key of Object.keys(process.env)) if (/^(VERCEL|RESEND_|COMMUNITY_|ACCOUNT_DELETION_|AUTHORING_STAGING_|PG|POSTGRES)/.test(key)) delete process.env[key];
    Object.assign(process.env, { NODE_ENV: 'test', DATABASE_URL: login.href,
      BETTER_AUTH_URL: 'http://localhost:3000', BETTER_AUTH_SECRET: 'synthetic-runtime-auth-secret-at-least-32-characters', AUTH_EMAIL_TRANSPORT: 'memory' });
    const runtime = await import('../../lib/db'); app = runtime.pool;
    app.on('error', idleError);
    assert.deepEqual((await app.query('SELECT current_user,session_user')).rows[0], { current_user: role, session_user: role });
    const { betterAuth } = await import('better-auth');
    const { createAuthOptions } = await import('../../lib/auth-config');
    const pending: Promise<void>[] = [];
    const auth = betterAuth(createAuthOptions({ pool: app, defer: task => { pending.push(task()); } }));
    const flush = async () => { while (pending.length) await pending.shift(); };
    const req = (path: string, cookie = '', body?: unknown, method = body === undefined ? 'GET' : 'POST') => new Request('http://localhost:3000' + path, {
      method, headers: { origin: 'http://localhost:3000', cookie, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
    });
    const ok = async (response: Response, status = 200) => { assert.equal(response.status, status, await response.clone().text()); return response.status === 204 ? null : response.json(); };
    const { TERMS_VERSION } = await import('../../lib/terms');
    const { authEmailOutbox } = await import('../../lib/auth-email-transport');
    let userId = '', cookie = '';
    await t.test('successful signup, verification, refresh, reset and signout without user DELETE', async () => {
      const email = 'runtime@example.invalid', password = 'synthetic-password-123';
      const result = await auth.api.signUpEmail({ body: { name: 'Synthetic runtime', email, password, termsAccepted: true, termsVersion: TERMS_VERSION } as never });
      userId = result.user.id; await flush();
      const link = (needle: string) => {
        const text = authEmailOutbox().filter(mail => mail.to === email).at(-1)!.text;
        const url = text.split(/\s+/).find(word => word.startsWith('http://localhost:3000/api/auth/' + needle));
        assert.ok(url); return url;
      };
      const verified = await auth.handler(new Request(link('verify-email'), { headers: { origin: 'http://localhost:3000' } }));
      assert.equal(verified.status, 302);
      const signIn = async (pass: string) => {
        const response = await auth.handler(req('/api/auth/sign-in/email', '', { email, password: pass }));
        await ok(response); cookie = response.headers.getSetCookie().map(v => v.split(';')[0]).filter(v => v.includes('session_token')).join('; '); assert.ok(cookie);
      };
      await signIn(password);
      await setup!.query('UPDATE session SET "updatedAt"=now()-interval \'2 days\' WHERE "userId"=$1', [userId]);
      assert.equal((await ok(await auth.handler(req('/api/auth/get-session', cookie)))).user.id, userId);
      await ok(await auth.handler(req('/api/auth/request-password-reset', '', { email, redirectTo: '/reset-password' })));
      await flush();
      const opened = await auth.handler(new Request(link('reset-password/'), { headers: { origin: 'http://localhost:3000' } }));
      assert.equal(opened.status, 302);
      const token = new URL(opened.headers.get('location')!, 'http://localhost:3000').searchParams.get('token'); assert.ok(token);
      await ok(await auth.handler(req('/api/auth/reset-password', '', { token, newPassword: 'synthetic-new-password-123' })));
      assert.equal((await setup!.query('SELECT count(*)::int n FROM session WHERE "userId"=$1', [userId])).rows[0].n, 0);
      await signIn('synthetic-new-password-123');
      await ok(await auth.handler(req('/api/auth/sign-out', cookie, {})));
      await signIn('synthetic-new-password-123');
      await assert.rejects(app!.query('DELETE FROM "user" WHERE id=$1', [userId]), { code: '42501' });
    });

    await t.test('legacy rating FOR SHARE and immutable check/event inserts', async () => {
      const problemId = 'runtime-rating', version = 'a'.repeat(64), attemptId = randomUUID();
      await setup!.query('INSERT INTO problem_rating("problemId","sourceVersion",rating,"ratedEnabled",checks,"reviewedBy") VALUES($1,$2,1200,true,$3,$4)', [problemId, version, JSON.stringify([{ partId: 'A', expected: '2', variables: [], maxPoints: 1 }]), 'Synthetic fixture']);
      const { checkAndRateSubmission } = await import('../../lib/individual-rating-server');
      const { solutionAttempts } = await import('../../lib/db/schema');
      const submission = { problemId, problemVersion: version, partId: 'A', idempotencyKey: randomUUID(), finalAnswer: '2', working: '', evidence: [] };
      await runtime.db.transaction(async tx => {
        await tx.insert(solutionAttempts).values({ id: attemptId, userId, problemId, problemVersion: version, partId: 'A', payload: submission, status: 'awaiting-reference', idempotencyKey: submission.idempotencyKey });
        await checkAndRateSubmission(tx, userId, attemptId, submission);
      });
      assert.equal((await app!.query('SELECT count(*)::int n FROM individual_rating_event WHERE "userId"=$1', [userId])).rows[0].n, 1);
      await assert.rejects(app!.query('UPDATE problem_rating SET rating=999'), { code: '42501' });
    });

    await t.test('contest administrator locks, draft replacement, publish and participant lock', async () => {
      await setup!.query('INSERT INTO contest_admin("userId") VALUES($1)', [userId]);
      const { createContestService } = await import('../../lib/contest-server');
      const { contestProblemSnapshot } = await import('../../lib/contest-catalog');
      const service = createContestService(runtime.db);
      const data = await service.getContestAdminData(userId);
      const problemId = data.problems[0].id;
      const input = { name: 'Synthetic runtime contest', description: 'Synthetic isolated permission rehearsal', startsAt: null, launchOnPublish: true, durationMinutes: 60, problemIds: [problemId] };
      const made = await service.createContest(userId, input);
      const saved = await service.updateContest(userId, made.id, made.version, input);
      await service.publishContest(userId, made.id, saved.version);
      await service.setContestRegistration(userId, made.id, true);
      const snapshot = contestProblemSnapshot(problemId)!;
      await service.submitContestAnswer(userId, made.id, { problemId, version: snapshot.version, idempotencyKey: randomUUID(), answers: [{ partId: snapshot.metadata.parts[0].id, latex: '0' }] });
      assert.equal((await app!.query('SELECT count(*)::int n FROM contest_attempt WHERE "userId"=$1', [userId])).rows[0].n, 1);
      await assert.rejects(app!.query('UPDATE contest_admin SET "userId"=\'other\''), { code: '42501' });
    });

    await t.test('narrow authoring/media columns, deferred publication guards and private reads', async () => {
      const { createProblemAuthoringApi } = await import('../../lib/problem-authoring-api');
      const { createAuthorMediaApi } = await import('../../lib/author-media-api');
      const { submissionUser, isSubmissionOrigin } = await import('../../lib/submission-server');
      const author = createProblemAuthoringApi({ pool: app!, user: submissionUser, origin: isSubmissionOrigin });
      const objects = new Map<string, Uint8Array>();
      const storage = { put: async (path: string, bytes: Uint8Array) => { objects.set(path, bytes); }, get: async (path: string) => objects.get(path) as BodyInit | undefined ?? null, del: async (path: string) => { objects.delete(path); } };
      const media = createAuthorMediaApi({ pool: app!, user: submissionUser, origin: isSubmissionOrigin, storage });
      const partId = randomUUID(), text = () => ({ id: randomUUID(), kind: 'text', spans: [{ kind: 'text', text: 'Synthetic permission fixture' }] });
      const content = { title: 'Synthetic Runtime', topicTags: [], methodTags: [], estimatedDifficulty: '1200', context: [text()], sections: [{ id: randomUUID(), title: 'Part', blocks: [], parts: [{ id: partId, label: 'A', answerMode: 'numeric', blocks: [text()] }] }], attachments: [], provenance: { kind: 'original', source: '', rightsDeclaration: 'Synthetic owned work.' } };
      const privateParts = [{ partId, key: { kind: 'numeric', value: 2, units: '1', absTol: 0.00001, relTol: 0.000002 }, hints: [], solution: [text()] }];
      const made = await ok(await author('create', req('/api', cookie, { content, privateParts })), 201);
      const upload = async (purpose = 'statement-pdf') => {
        const form = new FormData(); form.set('purpose', purpose);
        form.set('file', new File(['%PDF-1.4\nSynthetic fixture\n%%EOF\n'], 'synthetic.pdf', { type: 'application/pdf' }));
        return ok(await media('upload', new Request('http://localhost:3000/api', { method: 'POST', headers: { origin: 'http://localhost:3000', cookie }, body: form }), made.problemId), 201);
      };
      const file = await upload();
      const read = await media('read', req('/api', cookie), made.problemId, file.id);
      assert.equal(read.status, 200, await read.clone().text());
      const deleted = await media('delete', req('/api', cookie, {}, 'DELETE'), made.problemId, file.id);
      await ok(deleted);
      const referenced = await upload('solution-pdf');
      const withMedia = { ...content, attachments: [{ id: referenced.id, purpose: 'solution-pdf' }] };
      const saved = await ok(await author('update', req('/api', cookie, { content: withMedia, privateParts, version: made.version }, 'PUT'), made.problemId));
      const published = await ok(await author('publish', req('/api', cookie, { version: saved.version }), made.problemId));
      await ok(await author('public', req('/api'), made.problemId));
      const { createAuthoredSolutionApi } = await import('../../lib/authored-solution-api');
      const solutions = createAuthoredSolutionApi({ pool: app!, user: submissionUser, origin: isSubmissionOrigin, storage });
      await ok(await solutions('permission-write', req('/api', cookie, { revisionId: published.revision.id, version: 0, enabled: true, mediaIds: [referenced.id] }, 'PUT'), made.problemId, partId));
      const permission = (await app!.query('SELECT authorization_id FROM authored_solution_permission WHERE revision_id=$1 AND part_id=$2', [published.revision.id, partId])).rows[0];
      await app!.query('INSERT INTO authored_solution_reveal(id,user_id,problem_id,revision_id,part_id,authorization_id) VALUES($1,$2,$3,$4,$5,$6)', [randomUUID(), 'synthetic-user-0', made.problemId, published.revision.id, partId, permission.authorization_id]);
      await ok(await solutions('permission-write', req('/api', cookie, { revisionId: published.revision.id, version: 1, enabled: false, mediaIds: [] }, 'PUT'), made.problemId, partId));
      await ok(await author('unpublish', req('/api', cookie, { version: saved.version + 1 }), made.problemId));
      const result = await author('delete', req('/api', cookie, { version: saved.version + 2 }, 'DELETE'), made.problemId);
      assert.equal(result.status, 204, await result.clone().text());
      assert.equal(objects.size, 1, 'Published historical media stays retained');
    });

    await t.test('existing progress/public reads and deny disabled/frozen capabilities', async () => {
      const archive = await import('../../app/api/archive-progress/route');
      const { iphoSubproblems } = await import('../../lib/ipho-archive');
      await ok(await archive.POST(req('/api/archive-progress', cookie, { taskId: iphoSubproblems[0].id, notes: 'Synthetic notes', answer: '2', reviewed: false })));
      await ok(await archive.POST(req('/api/archive-progress', cookie, { taskId: iphoSubproblems[0].id, notes: 'Updated', answer: '3', reviewed: true })));
      await ok(await archive.GET(req('/api/archive-progress', cookie)));
      for (const path of ['../../app/api/dashboard/route', '../../app/api/progress/route', '../../app/api/rankings/route', '../../app/api/arena/collection/route']) {
        const route = await import(path); await ok(await route.GET(req('/api', cookie)));
      }
      for (const sql of ['CREATE TABLE public.forbidden(x int)', 'SELECT * FROM coaching_inquiry', 'SELECT * FROM community_profile', 'SELECT * FROM community_favourite', 'INSERT INTO practice_attempt(id) VALUES(gen_random_uuid())', 'DELETE FROM authored_attempt', 'UPDATE authored_revision SET number=9', 'DELETE FROM solution_attempt', 'UPDATE solution_check SET matched=false', 'DELETE FROM individual_rating_event', 'UPDATE contest_rating SET rating=9', "SELECT account_deletion_execute('x','x','x','x')"])
        await assert.rejects(app!.query(sql), { code: '42501' });
      assert.deepEqual(await auditProblems(), []);
      assert.deepEqual(await owners(), ownersBefore);
      assert.deepEqual(await routineOwners(), routineOwnersBefore);
    });
    await flush();
    assert.deepEqual(idleErrors, []);
  } finally {
    closing = true;
    await app?.end(); await setup?.end();
    if (created) await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
    if (roleCreated) await admin.query(`DROP ROLE ${role}`);
    if (ownerCreated) await admin.query(`DROP ROLE ${owner}`);
    await admin.end();
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});
