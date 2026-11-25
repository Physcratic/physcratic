import { readdir, readFile, access } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

if (process.env.NODE_ENV === 'production' || process.env.VERCEL) throw Error('Local development only.');
try { await access('.env.local'); throw Error('Use the clean local demo worktree.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const origin = new URL(process.env.LOCAL_WARM_ORIGIN || 'http://localhost:3000');
if (origin.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(origin.hostname) || origin.port !== '3000') throw Error('Only the local demo on port 3000 can be warmed.');
const base = origin.origin;
const includeBundles = process.argv.includes('--include-bundles');
console.log(`Local warm-up: waiting for ${base}, then compiling all page routes.`);
async function request(path, options = {}) { return fetch(new URL(path, base), { ...options, redirect: 'manual', signal: AbortSignal.timeout(180000) }); }
for (let attempt = 0; ; attempt++) {
  try { await (await request('/')).arrayBuffer(); break; }
  catch (error) { if (attempt >= 30) throw error; await delay(2000); }
}
const cookies = {};
for (const role of ['user', 'admin']) {
  const response = await request('/api/auth/sign-in/email', { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ email: `${role}@example.invalid`, password: 'Physcratic-demo-2026!' }) });
  if (!response.ok) throw Error(`Local ${role} fixture login failed (${response.status}).`);
  cookies[role] = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  await response.arrayBuffer();
}
async function pages(dir = 'app', segments = []) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) found.push(...await pages(`${dir}/${entry.name}`, entry.name.startsWith('(') ? segments : [...segments, entry.name]));
    else if (/^page\.(tsx|ts|jsx|js)$/.test(entry.name)) found.push('/' + segments.join('/'));
  }
  return found;
}
const arena = JSON.parse(await readFile('lib/arena/index.json', 'utf8'));
const firstProblem = arena.problems[0]?.id || 'ipho-2025-t1';
const guideText = await readFile('lib/learn/guides/start-preparing.ts', 'utf8');
const guide = guideText.match(/slug:\s*["']([^"']+)/)?.[1];
if (!guide) throw Error('Guide fixture slug not found.');
function sample(path) {
  if (path === '/coaching/coaches/[slug]') return '/coaching/coaches/rishit-garg';
  if (path === '/learn/[slug]') return '/learn/' + guide;
  if (path === '/problems/topics/[slug]') return '/problems/topics/mechanics';
  if (path === '/dashboard/problems/[id]') return '/dashboard/problems/' + firstProblem;
  if (path === '/u/[handle]') return '/u/local-demo-user';
  return path.replace(/\[id\]/g, '00000000-0000-4000-8000-000000000001');
}
const templates = await pages();
const targets = [...templates.map(sample), ...['problems', 'contests', 'rankings', 'guide'].map(view => '/dashboard?view=' + view), '/api/auth/get-session', '/api/dashboard', '/api/submissions', '/api/problem-progress', '/api/rankings', '/api/contests/access', '/api/arena/collection', '/api/site-search?q='];
console.log(`Local warm-up: ${templates.length} page route templates and ${targets.length} total targets.`);
const chunks = new Set();
const chunkRequests = new Map();
const results = [];
async function warmTarget(index, path) {
  const start = performance.now();
  try {
    const guest = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password', '/email-change'].includes(path);
    const cookie = guest ? '' : cookies[path.startsWith('/admin') || path.includes('/contests/manage') ? 'admin' : 'user'];
    const response = await request(path, { headers: { cookie } });
    const body = await response.text();
    if (includeBundles && !path.startsWith('/api/')) {
      const assets = [...body.matchAll(/(?:src|href)="([^"<>]+)"/g)].map(match => match[1].replaceAll('&amp;', '&')).filter(url => url.startsWith('/_next/static/') && /\.(?:js|css)(?:\?|$)/.test(url));
      for (const url of assets) {
        // Dev appends a timestamp to common chunks. Compile each file only once.
        const asset = new URL(url, base).pathname;
        if (chunks.has(asset)) continue;
        if (!chunkRequests.has(asset)) chunkRequests.set(asset, (async () => {
          const chunk = await request(asset);
          await chunk.arrayBuffer();
          if (!chunk.ok) throw Error(`Client bundle returned ${chunk.status}`);
          chunks.add(asset);
        })());
        await chunkRequests.get(asset);
      }
    }
    const result = { path, status: response.status, milliseconds: Math.round(performance.now() - start) };
    results.push(result);
    console.log(`[${index + 1}/${targets.length}] ${response.status} ${path} ${result.milliseconds}ms`);
  } catch (error) { results.push({ path, status: 0 }); console.log(`[${index + 1}/${targets.length}] FAILED ${path}: ${error.message}`); }
}
// Bound compiler load. Visiting a page already generates its client bundles.
let nextTarget = 0;
await Promise.all(Array.from({ length: 1 }, async () => {
  while (nextTarget < targets.length) {
    const index = nextTarget++;
    await warmTarget(index, targets[index]);
  }
}));
for (const cookie of Object.values(cookies)) {
  try { await (await request('/api/auth/sign-out', { method: 'POST', headers: { cookie, origin: base } })).arrayBuffer(); } catch { /* Only temporary warm-up sessions. */ }
}
const failures = results.filter(result => result.status === 0 || result.status >= 500);
console.log(`Warmed ${templates.length} page route templates, ${targets.length} total targets and ${chunks.size} client bundles. ${failures.length} server failures.`);
if (failures.length) process.exitCode = 1;
