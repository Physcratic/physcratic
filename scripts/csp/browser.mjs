// node --import tsx scripts/csp/browser.mjs
// External Playwright tooling, same convention as the existing browser suites.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { startLocal } from './local.mjs';
import { safeViolation } from './support.mjs';
import { evalAttribution } from './attribute.mjs';
const require = createRequire(import.meta.url);
const tools = process.env.AUTHORING_BROWSER_TOOLS ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, 'package.json')) : require;
const playwright = tools('playwright');
const results = [], availability = [], output = resolve('build/csp/browser-results.json');
await mkdir(resolve('build/csp'), { recursive: true });
let failures = 0;
for (const name of (process.env.CSP_BROWSERS || 'chromium,firefox,webkit').split(',')) {
  assert.ok(['chromium', 'firefox', 'webkit'].includes(name));
  let browser;
  try {
    browser = await playwright[name].launch({ headless: true, ...(name === 'chromium' ? { args: ['--no-sandbox', '--disable-background-networking'], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) } : {}) });
    availability.push({ browser: name, version: browser.version(), status: 'available' });
  } catch (error) {
    availability.push({ browser: name, status: 'test environment limitation', reason: String(error).split('\n')[0] });
    continue;
  }
  try {
    for (const mode of (process.env.CSP_MODES || 'report,enforce').split(',')) {
      const local = await startLocal(mode);
      try {
        async function check(workflow, action) {
          const context = await browser.newContext({ serviceWorkers: 'block', reducedMotion: 'reduce' });
          context.setDefaultTimeout(20000);
          const network = [], errors = [], startReports = local.reports.length, start = performance.now();
          await context.route('**/*', route => {
            const url = new URL(route.request().url());
            // All foreign requests are answered locally or aborted BEFORE any
            // connection. No provider test token or event ever leaves loopback.
            if (url.origin === local.origin) return route.continue();
            if (url.origin === 'https://www.google.com' && url.pathname === '/recaptcha/api.js') return route.fulfill({ contentType: 'application/javascript', body: `window.grecaptcha={ready:cb=>cb(),execute:async()=>{await fetch('https://www.google.com/recaptcha/fixture');return 'synthetic-token'}};const f=document.createElement('iframe');f.src='https://recaptcha.google.com/recaptcha/fixture';document.body.appendChild(f);` });
            if (url.origin === 'https://www.google.com' && url.pathname === '/recaptcha/fixture') return route.fulfill({ body: '', headers: { 'access-control-allow-origin': local.origin } });
            if (url.origin === 'https://recaptcha.google.com' && url.pathname === '/recaptcha/fixture') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Synthetic CAPTCHA frame</title>' });
            if (url.origin === 'https://blocked.invalid') return route.fulfill({ contentType: 'application/javascript', body: 'window.__disallowedExecuted=true;' });
            return route.abort();
          });
          await context.addInitScript(() => {
            window.__csp = [];
            document.addEventListener('securitypolicyviolation', event => {
              if (window.__csp.length < 100) window.__csp.push({ effectiveDirective: event.effectiveDirective, blockedURI: event.blockedURI, sourceFile: event.sourceFile, lineNumber: event.lineNumber, columnNumber: event.columnNumber, disposition: event.disposition });
            });
          });
          const page = await context.newPage();
          page.on('pageerror', error => errors.push(error.name));
          page.on('response', response => {
            const url = new URL(response.url());
            if (url.origin === local.origin && url.pathname.startsWith('/_next/') && /\.m?js$/.test(url.pathname)) network.push({ asset: url.pathname, status: response.status() });
          });
          let classification = 'functional success', detail;
          try {
            detail = await action(page, local);
            assert.deepEqual(errors, [], 'Unhandled application errors');
          } catch (error) { classification = 'confirmed functional breakage'; detail = String(error).slice(0, 450); failures++; }
          const violations = (await page.evaluate(() => window.__csp || []).catch(() => [])).map(event => safeViolation(event, local.allowedAssets));
          const delivered = local.reports.slice(startReports);
          for (const event of [...violations, ...delivered]) {
            if (event.blocked === 'eval') {
              const source = local.allowedAssets.includes(event.asset) ? await readFile(resolve('.next', event.asset.slice('/_next/'.length)), 'utf8') : '';
              event.attribution = evalAttribution(event, source);
            }
          }
          const unexpected = [...violations, ...delivered].filter(event => {
            if (event.blocked === 'eval') return event.attribution === 'unexplained eval';
            if (event.blocked === 'wasm-eval') return !['worker WASM compilation control', 'PDF.js JPEG2000 WASM and JavaScript fallback'].includes(workflow);
            return true;
          });
          if (classification === 'functional success' && unexpected.length && workflow !== 'negative policy and report delivery') { classification = 'unexplained violation'; failures++; }
          if (classification === 'functional success' && [...violations, ...local.reports.slice(startReports)].some(event => event.disposition === 'enforce')) classification = 'expected blocked operation with successful fallback';
          results.push({ browser: name, mode, workflow, classification, detail, durationMs: performance.now() - start, violations, delivered: local.reports.slice(startReports), chunks: [...new Map(network.map(item => [item.asset, item])).values()] });
          console.log(JSON.stringify(results.at(-1)));
          await context.close();
        }
        await check('hydration, navigation, KaTeX and analytics loader', async (page, server) => {
          const response = await page.goto(server.origin + '/dashboard', { waitUntil: 'networkidle' });
          assert.equal(response.status(), 200);
          assert.equal(Boolean(response.headers()['content-security-policy']), mode !== 'report');
          await page.getByRole('heading', { name: 'Recommended problem', exact: true }).waitFor();
          await page.locator('nav[aria-label="Main navigation"] a[href="/dashboard?view=problems"]:visible').click();
          await page.getByLabel('Find a problem', { exact: true }).fill('Mind the Gap');
          await page.locator('#arena-results a[href="/dashboard/problems/arena-mind-the-gap"]').first().click();
          await page.getByRole('tab', { name: 'Problem statement', exact: true }).waitFor();
          assert.ok(await page.locator('.katex').count());
          assert.equal(await page.evaluate(() => window.__analyticsLoaded), true);
          assert.ok(server.analytics.length);
          return 'SSR, hydration, filtered navigation, local KaTeX and synthetic analytics transport succeed. Actual Vercel analytics asset/ingestion unavailable locally.';
        });
        await check('deferred MathJS and calculator results', async (page, server) => {
          await page.goto(server.origin + '/dashboard/problems/ipho-2025-t1', { waitUntil: 'networkidle' });
          await page.getByRole('tab', { name: 'Your solution', exact: true }).click();
          const before = await page.evaluate(() => performance.getEntriesByType('resource').filter(e => /\.js/.test(e.name)).map(e => e.name));
          await page.getByText('Equation calculator', { exact: true }).first().click();
          for (const [equation, bindings, expected] of [['a=g*sin(theta)', 'g=9.81\ntheta=pi/6', 'a = 4.905'], ['2^(½)', '', '1.41421356237'], ['sqrt(-1)', '', 'finite and real'], ['2+2', '', 'result = 4']]) {
            await page.getByLabel('Equation', { exact: true }).first().fill(equation);
            await page.getByLabel('Variable values', { exact: true }).first().fill(bindings);
            await page.getByRole('button', { name: 'Calculate', exact: true }).first().click();
            await page.getByText(expected, { exact: false }).first().waitFor();
          }
          const additional = await page.evaluate(before => performance.getEntriesByType('resource').filter(e => /\.js/.test(e.name) && !before.includes(e.name)).map(e => new URL(e.name).pathname), before);
          assert.ok(additional.length > 0, 'Engine must load after opening calculator');
          return { additional: [...new Set(additional)] };
        });
        await check('PDF.js actual reader and worker', async (page, server) => {
          await page.goto(server.origin + '/dashboard/problems/ipho-2025-t1', { waitUntil: 'networkidle' });
          await page.locator('[data-pdf-rendered="true"]').first().waitFor({ timeout: 45000 });
          assert.ok(await page.locator('canvas').count());
          return 'First original PDF page rendered. Codec/WASM coverage is separate; this PDF does not establish every codec path.';
        });
        await check('PDF.js JPEG2000 WASM and JavaScript fallback', async (page, server) => {
          const assets = [];
          page.on('response', response => { const path = new URL(response.url()).pathname; if (path.startsWith('/__csp/wasm/')) assets.push(path); });
          await page.goto(server.origin + '/__csp/pdf-fixture', { waitUntil: 'networkidle' });
          assert.deepEqual(await page.evaluate(() => window.runPdfCodec()), [20,150,80,255]);
          assert.ok(assets.includes('/__csp/wasm/openjpeg.wasm'));
          assert.equal(assets.includes('/__csp/wasm/openjpeg_nowasm_fallback.js'), mode === 'enforce');
          return { assets, note: 'Synthetic JPX PDF through real PDF.js and production worker. Test supplies same-origin codec assets; production viewer does not configure wasmUrl.' };
        });
        for (const jitless of [false, true]) await check(`Zod probe ${jitless ? 'jitless' : 'default'}`, async (page, server) => {
          await page.goto(server.origin + '/__csp/fixture' + (jitless ? '?jitless=1' : ''), { waitUntil: 'networkidle' });
          assert.deepEqual(await page.evaluate(() => window.runZod()), { valid: 4, invalid: false });
          await page.waitForTimeout(150);
          const events = await page.evaluate(() => window.__csp);
          assert.equal(events.some(event => event.blockedURI === 'eval'), !jitless);
          return 'Default probe reports eval; jitless avoids the probe. Both parse valid and invalid values correctly.';
        });
        await check('real CAPTCHA loader with synthetic provider', async (page, server) => {
          await page.goto(server.origin + '/__csp/fixture', { waitUntil: 'networkidle' });
          assert.equal(await page.evaluate(() => window.runCaptcha()), 'synthetic-token');
          await page.locator('iframe').waitFor();
          return 'Real client loader, script, connection and frame paths succeed with intercepted provider. Live CAPTCHA scoring/challenge/verification not tested.';
        });
        await check('worker WASM compilation control', async (page, server) => {
          await page.goto(server.origin + '/__csp/fixture', { waitUntil: 'networkidle' });
          const result = await page.evaluate(() => new Promise((resolve, reject) => { const worker = new Worker('/__csp/worker.js'); const timer = setTimeout(() => { worker.terminate(); reject(Error('worker response timed out')); }, 15000); worker.onmessage = event => { clearTimeout(timer); worker.terminate(); resolve(event.data); }; worker.onerror = () => { clearTimeout(timer); worker.terminate(); reject(Error('worker failed')); }; }));
          assert.equal(result, mode === 'enforce' ? 'wasm-blocked-fallback' : 'wasm-ok');
          return result;
        });
        await check('negative policy and report delivery', async (page, server) => {
          const before = server.reports.length;
          await page.goto(server.origin + '/__csp/fixture?jitless=1', { waitUntil: 'networkidle' });
          await page.evaluate(() => { const script = document.createElement('script'); script.src = 'https://blocked.invalid/disallowed.js'; document.head.appendChild(script); });
          await page.waitForFunction(() => window.__csp.some(event => event.blockedURI.includes('blocked.invalid')));
          assert.equal(Boolean(await page.evaluate(() => window.__disallowedExecuted)), mode === 'report');
          // Real browser report transport is separate from DOM event observation.
          for (let i = 0; server.reports.length === before && i < 50; i++) await page.waitForTimeout(100);
          assert.ok(server.reports.slice(before).some(event => event.directive.startsWith('script-src') && event.blocked === 'resource'), 'Browser report must arrive over HTTP');
          assert.ok(server.log().includes('[csp]'), 'Real local application collector must log a report');
          const media = await page.request.get(server.origin + '/__csp/private');
          assert.equal(media.headers()['content-security-policy'], "sandbox; default-src 'none'");
          assert.match(media.headers()['content-disposition'], /^attachment/);
          return 'Disallowed remote script executes only in report mode. Enforce blocks execution. Real report reaches local collector. Restrictive attachment header retained.';
        });
      } finally { await local.close(); }
    }
  } finally { await browser.close(); }
}
await writeFile(output, JSON.stringify({ availability, results }, null, 2));
assert.ok(availability.some(item => item.status === 'available'), 'No browser available');
if (process.env.CSP_REQUIRE_ALL === '1') assert.equal(availability.filter(item => item.status === 'available').length, 3, 'CI must run all three engines');
assert.equal(failures, 0, `${failures} functional failures or unexplained violations; inspect ${output}`);
