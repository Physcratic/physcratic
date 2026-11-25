import { readFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw Error('Local development only.');
try { await access('.env.local'); throw Error('Use a clean worktree without .env.local.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const env = Object.fromEntries((await readFile('.env.demo', 'utf8')).trim().split(/\r?\n/).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const target = new URL(env.DATABASE_URL);
if (target.hostname !== '127.0.0.1' || target.port !== '55432' || target.pathname !== '/physcratic_local_demo' || target.username !== 'physcratic_demo_app') throw Error('Unexpected demo database.');
// Do not inherit hosted service credentials or production feature flags.
const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(VERCEL|DATABASE|POSTGRES|PG[A-Z_]|RESEND|BLOB|BETTER_AUTH|AUTH_|COMMUNITY_|ACCOUNT_DELETION|RECAPTCHA|NEXT_PUBLIC_RECAPTCHA|AUTHORING_STAGING|V0_|STAGING_)/.test(key)));
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3000'], { stdio: 'inherit', env: { ...inherited, ...env, NODE_ENV: 'development' } });
// Warm page routes and their client bundles as soon as the dev server is ready.
const warmer = spawn(process.execPath, ['scripts/local-demo/warm.mjs'], { stdio: 'inherit', env: { ...inherited, NODE_ENV: 'development' }, windowsHide: true });
warmer.on('error', error => console.error('Local warm-up could not start:', error.message));
child.on('exit', () => { if (warmer.exitCode === null) warmer.kill(); });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
