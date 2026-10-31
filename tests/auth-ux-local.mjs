// Local QA launcher: node tests/auth-ux-local.mjs /tmp/terms-browser [dev|build|build-network]
// Requires the disposable Docker fixture documented in AUTH_UX_QA.md. Never uses ambient DB/mail settings.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { Pool } from 'pg';
import { getMigrations } from 'better-auth/db/migration';
const toolsDir = resolve(process.argv[2] || '/tmp/terms-browser');
const mode = process.argv[3] || 'dev';
assert.ok(['dev', 'build', 'build-network'].includes(mode));
assert.ok(!readdirSync('.').some(name => /^\.env(?:$|\.)/.test(name) && !/example|sample/.test(name)), 'Use a clean checkout without Next .env files');
const database = 'postgresql://postgres:disposable-qa@127.0.0.1:55418/physcratic_test';
if (mode === 'dev') {
  const pool = new Pool({ connectionString: database, connectionTimeoutMillis: 2000 });
  try {
    const migration = await getMigrations({ database: pool, rateLimit: { storage: 'database' }, user: { additionalFields: { termsAcceptedVersion: { type: 'string', required: false, input: false }, termsAcceptedAt: { type: 'date', required: false, input: false } } } });
    await migration.runMigrations();
  } finally { await pool.end(); }
}
const temp = mkdtempSync(join(tmpdir(), 'auth-next-font-'));
const env = Object.fromEntries(['PATH', 'HOME', 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
Object.assign(env, {
  DATABASE_URL: database,
  BETTER_AUTH_SECRET: 'local-disposable-browser-fixture-only-123456789',
  BETTER_AUTH_URL: 'http://127.0.0.1:3218',
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: 'browser-fixture',
  NEXT_TELEMETRY_DISABLED: '1',
});
if (mode !== 'build-network') {
  const font = join(toolsDir, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2');
  assert.ok(existsSync(font), 'Install the isolated Inter fixture first');
  const css = `/* latin */\n@font-face { font-family: Inter; font-style: normal; font-weight: 100 900; font-display: swap; src: url(${font}) format('woff2'); }`;
  const mock = join(temp, 'font.cjs');
  writeFileSync(mock, `module.exports = ${JSON.stringify({ 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap': css })};\n`);
  env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES = mock;
}
const child = spawn('pnpm', mode === 'dev' ? ['dev', '--hostname', '127.0.0.1', '--port', '3218'] : ['build'], { env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); rmSync(temp, { recursive: true, force: true }); process.exitCode = 1; });
child.on('exit', code => { rmSync(temp, { recursive: true, force: true }); process.exitCode = code ?? 1; });
