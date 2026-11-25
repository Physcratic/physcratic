// Explicit, disposable localhost setup. Never imported by the application.
import assert from 'node:assert/strict';
import { readFile, readdir, writeFile, access } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { hashPassword } from 'better-auth/crypto';
import { fixtureDDL } from '../authoring-release-production/package/test-fixture.mjs';

if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw Error('Local development only.');
try { await access('.env.local'); throw Error('Refusing a checkout with .env.local.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
// No inherited DATABASE_URL or external endpoint can select the target.
const client = new Client({ host: '127.0.0.1', port: 55432, database: 'physcratic_local_demo', user: 'postgres', password: 'local-demo-owner-only', connectionTimeoutMillis: 5000 });
await client.connect();
try {
  assert.equal((await client.query('SELECT current_database() AS name')).rows[0].name, 'physcratic_local_demo');
  await client.query("SELECT pg_advisory_lock(18324429)");
  const existing = (await client.query("SELECT to_regclass('public.local_demo_marker') AS marker")).rows[0].marker;
  if (existing) {
    assert.equal((await client.query('SELECT version FROM local_demo_marker')).rows[0].version, 1);
    await access('.env.demo');
    console.log('Existing local demo preserved.');
  } else {
    assert.equal(Number((await client.query("SELECT count(*) FROM pg_tables WHERE schemaname='public'")).rows[0].count), 0, 'Refusing a nonempty unrecognised database.');
    const password = randomBytes(24).toString('hex');
    const loginPassword = 'Physcratic-demo-2026!';
    const hashed = await hashPassword(loginPassword);
    await client.query('BEGIN');
    try {
      for (const ddl of fixtureDDL()) await client.query(ddl);
      await client.query(await readFile('migrations/20261031_auth_rate_limit.sql', 'utf8'));
      const files = (await readdir('migrations')).filter(name => /^\d{4}_.*\.up\.sql$/.test(name)).sort();
      for (const file of files) {
        // Two historical migrations own their transaction boundaries.
        const sql = (await readFile(`migrations/${file}`, 'utf8')).replace(/^\s*BEGIN;\s*/i, '').replace(/\bCOMMIT;\s*$/i, '');
        await client.query(sql);
      }
      await client.query(`CREATE ROLE physcratic_demo_app LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`);
      let grants = await readFile('scripts/production-upgrade/role-grants.sql', 'utf8');
      grants = grants.slice(grants.indexOf('-- Existing auth:'), grants.indexOf('-- B5 services'));
      await client.query('GRANT USAGE ON SCHEMA public TO physcratic_demo_app');
      await client.query(grants.replaceAll(':"runtime_role"', 'physcratic_demo_app'));
      await client.query('GRANT SELECT ON community_restriction TO physcratic_demo_app');
      await client.query('GRANT EXECUTE ON FUNCTION community_restriction_decide(text,text,text,integer,boolean,text) TO physcratic_demo_app');
      const terms = (await readFile('lib/terms.ts', 'utf8')).match(/TERMS_VERSION = "([^"]+)"/)[1];
      for (const [role, name] of [['user', 'Demo student'], ['moderator', 'Demo moderator'], ['admin', 'Demo admin']]) {
        const id = `local-demo-${role}`;
        await client.query('INSERT INTO "user"(id,name,email,"emailVerified","termsAcceptedVersion","termsAcceptedAt") VALUES($1,$2,$3,true,$4,now())', [id, name, `${role}@example.invalid`, terms]);
        await client.query('INSERT INTO account(id,"accountId","providerId","userId",password) VALUES($1,$2,\'credential\',$2,$3)', [randomUUID(), id, hashed]);
        if (role !== 'user') await client.query('INSERT INTO community_staff(user_id,role,reason) VALUES($1,$2,\'Local demo fixture\')', [id, role]);
        if (role === 'admin') await client.query('INSERT INTO contest_admin("userId") VALUES($1)', [id]);
      }
      await client.query('CREATE TABLE local_demo_marker(version integer PRIMARY KEY)');
      await client.query('INSERT INTO local_demo_marker VALUES(1)');
      // Write before COMMIT. A failed transaction can safely regenerate this file.
      const env = {
        DATABASE_URL: `postgresql://physcratic_demo_app:${password}@127.0.0.1:55432/physcratic_local_demo`,
        BETTER_AUTH_URL: 'http://localhost:3000', BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
        AUTH_EMAIL_TRANSPORT: 'memory',
        ...Object.fromEntries(['PROFILES', 'ACHIEVEMENTS', 'PROBLEM_STATS', 'COMMENTS', 'STAFF', 'MODERATION', 'MODERATION_UI', 'ACTIONS', 'MEDALS', 'VERIFICATION_UI'].map(key => [`COMMUNITY_${key}_ENABLED`, 'true'])),
      };
      await writeFile('.env.demo', Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600 });
      await client.query('COMMIT');
      console.log('Created local student, moderator and admin accounts. Password: ' + loginPassword);
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  }
} finally { await client.end(); }
