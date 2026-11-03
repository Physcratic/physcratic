// Reproducible isolated prototype. No app/middleware file is written in cwd.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, symlink, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { gzipSync } from 'node:zlib';
import { productionBuild, startLocal } from './local.mjs';
import { digest, publicArtifact, verifyArtifact, nonceMiddleware, staticHeaderProposal } from './policy-artifact.mjs';
import { sourceRegistry, attribution } from './attribution.mjs';
import { safeViolation } from './support.mjs';
import { evalAttribution } from './attribute.mjs';
const metricsOnly = process.env.CSP_METRICS_ONLY === '1';
const root = process.cwd(), output = resolve('build/csp', metricsOnly ? 'architecture-performance.json' : 'architecture-results.json');
const require = createRequire(import.meta.url);
const tools = process.env.AUTHORING_BROWSER_TOOLS ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, 'package.json')) : require;
const engines = tools('playwright');
const baseArtifact = await publicArtifact(root);
const reuse = process.env.CSP_REUSE_EXPERIMENT;
const experiment = reuse ? await realpath(reuse) : await mkdtemp(join(tmpdir(), 'physcratic-x3c-'));
assert.ok(experiment.startsWith(join(tmpdir(), 'physcratic-x3c-')), 'Only dedicated temporary experiments are accepted');
const result = { base: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), variants: [], browsers: [] };
const staticCount = async path => Object.keys(JSON.parse(await readFile(resolve(path, '.next/prerender-manifest.json'), 'utf8')).routes).length;
const clockTicks = process.platform === 'linux' ? Number(execFileSync('getconf', ['CLK_TCK'], { encoding: 'utf8' })) : null;
const cpu = async pid => {
  try { const s = (await readFile(`/proc/${pid}/stat`, 'utf8')).split(') ')[1].split(' '); return (Number(s[11]) + Number(s[12])) * 1000 / clockTicks; } catch { return null; }
};
try {
  if (!reuse) {
    execFileSync('git', ['worktree', 'add', '--detach', experiment, 'HEAD'], { stdio: 'pipe' });
    await symlink(await realpath(resolve(root, 'node_modules')), resolve(experiment, 'node_modules'));
    await writeFile(resolve(experiment, 'middleware.ts'), nonceMiddleware(baseArtifact.themeHash));
  } else {
    assert.equal(execFileSync('git', ['-C', experiment, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), result.base);
    assert.equal(await readFile(resolve(experiment, 'middleware.ts'), 'utf8'), nonceMiddleware(baseArtifact.themeHash));
  }
  assert.equal(await readFile(resolve(experiment, 'app/layout.tsx'), 'utf8'), await readFile(resolve(root, 'app/layout.tsx'), 'utf8'));
  // Only generated cache is removed, to fit two builds in small workspaces.
  await rm(resolve(root, '.next/cache'), { recursive: true, force: true });
  let compileMs = null;
  if (!reuse) {
    const compileStart = performance.now();
    const buildLog = await productionBuild(experiment);
    compileMs = performance.now() - compileStart;
    await writeFile(resolve(root, 'build/csp/hybrid-build.log'), buildLog);
  }
  const hybridArtifact = await publicArtifact(experiment);
  assert.equal(hybridArtifact.themeHash, baseArtifact.themeHash);
  assert.equal(await staticCount(root), await staticCount(experiment), 'Public prerendering must be retained');
  await verifyArtifact(experiment, hybridArtifact);
  await writeFile(resolve(root, 'build/csp/static-header-proposal.json'), JSON.stringify({ buildId: hybridArtifact.buildId, routes: staticHeaderProposal(hybridArtifact) }, null, 2));
  await assert.rejects(verifyArtifact(experiment, { ...hybridArtifact, buildId: 'stale-build' }), /mismatch/);
  for (const [variant, path, artifact] of [['report-only', root, baseArtifact], ['hybrid', experiment, hybridArtifact]]) {
    const local = await startLocal('native', path, { staticPolicies: variant === 'hybrid' ? Object.fromEntries(Object.entries(artifact.routes).map(([route, data]) => [route, data.policy])) : {} });
    try {
      const metrics = { variant, staticRoutes: await staticCount(path), compileMs: variant === 'hybrid' ? compileMs : null, maximumStaticHeaderBytes: Math.max(...Object.values(artifact.routes).map(data => Buffer.byteLength(data.policy))), paths: [], client: [] };
      const sources = await sourceRegistry(path);
      metrics.sourceIdentifiers = sources.size;
      assert.ok(metrics.maximumStaticHeaderBytes < 8192, 'Local policy header budget exceeded');
      metrics.verifiedStaticDocuments = 0;
      for (const [route, data] of Object.entries(artifact.routes)) {
        const response = await fetch(local.origin + route + '?source=synthetic');
        assert.equal(response.status, 200);
        assert.equal(digest(await response.text()), data.htmlDigest, 'Served HTML/build mismatch');
        assert.ok(response.headers.get('cache-control').includes('s-maxage'));
        metrics.verifiedStaticDocuments++;
      }
      for (const route of ['/learn', '/terms', '/dashboard']) {
        const samples = []; let cache, previousNonce; let fresh = true;
        const coldStart = performance.now(); await (await fetch(local.origin + route)).text();
        const coldResponseMs = performance.now() - coldStart;
        for (let i = 0; i < 5; i++) await (await fetch(local.origin + route)).text();
        const cpuBefore = await cpu(local.processId);
        for (let i = 0; i < 15; i++) {
          const start = performance.now(), response = await fetch(local.origin + route);
          samples.push(performance.now() - start); await response.text();
          cache = response.headers.get('cache-control');
          const nonce = response.headers.get('content-security-policy')?.match(/nonce-([^']+)/)?.[1];
          if (variant === 'hybrid' && route === '/dashboard' && (!nonce || nonce === previousNonce)) fresh = false;
          previousNonce = nonce;
        }
        const cpuAfter = await cpu(local.processId); samples.sort((a,b) => a-b);
        metrics.paths.push({ route, coldResponseMs, warmupRequests: 5, medianTtfbMs: samples[7], p95TtfbMs: samples[14], serverCpuMs: cpuBefore === null ? null : cpuAfter - cpuBefore, cacheControl: cache, freshDashboardNonces: route === '/dashboard' && variant === 'hybrid' ? fresh : null });
        if (route !== '/dashboard') assert.ok(cache.includes('s-maxage'), 'Public caching must remain');
        if (variant === 'hybrid' && route === '/dashboard') assert.ok(fresh);
      }
      for (const name of (metricsOnly ? [] : (process.env.CSP_BROWSERS || 'chromium,firefox,webkit').split(','))) {
        let browser;
        try { browser = await engines[name].launch({ headless: true, ...(name === 'chromium' ? { args: ['--no-sandbox'], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) } : {}) }); }
        catch { if (process.env.CSP_REQUIRE_ALL === '1') throw Error('Required browser unavailable: ' + name); result.browsers.push({ variant, browser: name, limitation: 'Executable unavailable' }); continue; }
        try {
          for (const initial of ['/learn?source=synthetic', '/dashboard']) {
            const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
            context.setDefaultTimeout(20000);
            await context.route('**/*', route => new URL(route.request().url()).origin === local.origin ? route.continue() : route.abort());
            await context.addInitScript(() => {
              localStorage.setItem('theme', 'dark'); window.__violations = []; window.__documentMark = Math.random();
              document.addEventListener('securitypolicyviolation', e => window.__violations.push({ effectiveDirective: e.effectiveDirective, blockedURI: e.blockedURI, sourceFile: e.sourceFile, lineNumber: e.lineNumber, columnNumber: e.columnNumber, disposition: e.disposition, documentURL: location.href }));
            });
            const page = await context.newPage(), errors = [];
            page.on('pageerror', error => errors.push(error.name));
            const response = await page.goto(local.origin + initial, { waitUntil: 'networkidle' });
            const documentMark = await page.evaluate(() => window.__documentMark);
            const policy = response.headers()['content-security-policy'];
            if (variant === 'hybrid') { assert.ok(policy); assert.ok(!policy.split(';')[1].includes('unsafe-inline')); }
            assert.equal(await page.locator('html').evaluate(e => e.classList.contains('dark')), true);
            if (name === 'chromium') {
              const paths = await page.evaluate(() => [...new Set(performance.getEntriesByType('resource').map(entry => new URL(entry.name).pathname).filter(path => path.startsWith('/_next/static/') && /\.m?js$/.test(path)))]);
              let raw = 0, gzip = 0;
              for (const file of paths) { const bytes = await readFile(resolve(path, '.next', decodeURIComponent(file.slice('/_next/'.length)))); raw += bytes.length; gzip += gzipSync(bytes, { level: 9 }).length; }
              metrics.client.push({ route: initial.split('?')[0], chunks: paths.length, raw, gzip });
            }
            const interactionStart = performance.now();
            if (initial.startsWith('/learn')) {
              await page.locator('a[href="/dashboard"]').first().click();
              await page.getByRole('heading', { name: 'Recommended problem', exact: true }).waitFor();
            }
            await page.locator('nav[aria-label="Main navigation"] a[href="/dashboard?view=problems"]:visible').click();
            await page.getByLabel('Find a problem', { exact: true }).fill('Mind the Gap');
            // SPA history boundary back to the original public document.
            if (initial.startsWith('/learn')) { await page.goBack(); await page.goBack(); await page.waitForURL('**/learn?source=synthetic'); }
            else { await page.locator('a[href="/learn"]:visible').first().click(); await page.waitForURL('**/learn'); }
            await page.locator('header a[href="/dashboard"]').first().waitFor();
            const interactionMs = performance.now() - interactionStart;
            assert.equal(await page.evaluate(() => window.__documentMark), documentMark, 'Route boundary must work without a full document reload');
            const beforeNegative = await page.evaluate(() => window.__violations);
            for (const raw of beforeNegative) {
              assert.equal(raw.blockedURI, 'eval', 'Unexpected blocking before negative control');
              const event = safeViolation(raw, local.allowedAssets);
              const source = local.allowedAssets.includes(event.asset) ? await readFile(resolve(path, '.next', event.asset.slice('/_next/'.length)), 'utf8') : '';
              assert.notEqual(evalAttribution(event, source), 'unexplained eval');
            }
            await page.evaluate(() => { const script = document.createElement('script'); script.textContent = 'window.__injected=true'; document.head.appendChild(script); });
            await page.waitForTimeout(100);
            assert.equal(Boolean(await page.evaluate(() => window.__injected)), variant === 'report-only');
            const violations = await page.evaluate(() => window.__violations);
            assert.ok(violations.every(event => event.blockedURI === 'eval' || event.blockedURI === 'inline'), 'Unexplained policy violation');
            if (variant === 'hybrid') assert.ok(violations.some(event => event.blockedURI === 'inline'));
            assert.deepEqual(errors, []);
            result.browsers.push({ variant, browser: name, initial: initial.split('?')[0], status: 'PASS', interactionMs, coldPolicy: variant === 'hybrid' ? (initial.startsWith('/learn') ? 'build hashes' : 'scoped nonce and theme hash') : 'report-only', negativeInlineBlocked: variant === 'hybrid', observations: violations.map(event => attribution(event, { origin: local.origin, build: result.base, sources })) });
            await context.close();
          }
        } finally { await browser.close(); }
      }
      result.variants.push(metrics);
    } finally { await local.close(); }
  }
  if (result.variants.every(variant => variant.client.length)) result.clientDelta = result.variants[1].client.map((metric, i) => ({ route: metric.route, chunks: metric.chunks - result.variants[0].client[i].chunks, raw: metric.raw - result.variants[0].client[i].raw, gzip: metric.gzip - result.variants[0].client[i].gzip }));
} finally {
  await writeFile(output, JSON.stringify(result, null, 2));
  if (process.env.CSP_KEEP_EXPERIMENT !== '1') execFileSync('git', ['worktree', 'remove', '--force', experiment], { stdio: 'pipe' });
}
console.log(JSON.stringify(result, null, 2));
