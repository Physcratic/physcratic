// Real random-discovery card. Storage and account cookies are synthetic. All API requests are forbidden.
import axeSettle from "./axe-settle.cjs";
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const require = createRequire(import.meta.url);
const external = createRequire(join(process.env.AUTHORING_BROWSER_TOOLS || '/tmp/physcratic-editor-test', 'package.json'));
const { chromium } = external('playwright'), { default: AxeBuilder } = external('@axe-core/playwright');
axeSettle.settleAxeBuilder(AxeBuilder);
const { build } = createRequire(require.resolve('tsx'))('esbuild');
const arena = JSON.parse(await readFile('lib/arena/index.json', 'utf8')).problems;
const temp = await mkdtemp(join(tmpdir(), 'physcratic-discovery-'));
let browser, server;
const apiRequests = [], errors = [];
try {
  await build({ entryPoints: ['tests/random-discovery-harness.tsx'], outfile: join(temp, 'bundle.js'), bundle: true, platform: 'browser', jsx: 'automatic', alias: { '@': process.cwd() }, define: { 'process.env.NODE_ENV': '"development"', 'process.env': '{}' }, logLevel: 'silent' });
  execFileSync(process.execPath, [require.resolve('tailwindcss/lib/cli.js'), '-i', 'app/globals.css', '-o', join(temp, 'style.css')], { stdio: 'pipe' });
  server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://127.0.0.1').pathname;
    if (path.startsWith('/api/')) { apiRequests.push(path); res.writeHead(503); res.end('Progress unavailable'); return; }
    if (path === '/bundle.js' || path === '/style.css') {
      res.setHeader('content-type', path.endsWith('.js') ? 'text/javascript' : 'text/css'); res.end(await readFile(join(temp, path.slice(1)))); return;
    }
    res.setHeader('content-type', 'text/html'); res.end('<!doctype html><html lang="en"><head><title>Discovery test</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body class="bg-background text-foreground"><div id="root"></div><script src="/bundle.js"></script></body></html>');
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  for (const width of [375, 1440]) for (const theme of ['light', 'dark']) for (const stored of ['empty', 'some', 'all', 'blocked']) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(({ ids, stored, theme }) => {
      document.addEventListener('DOMContentLoaded', () => document.documentElement.classList.toggle('dark', theme === 'dark'));
      Math.random = () => 0;
      localStorage.setItem('physcratic.solved.v1', JSON.stringify(stored === 'all' ? ids : stored === 'some' ? [ids[0]] : []));
      if (stored === 'blocked') Storage.prototype.getItem = () => { throw Error('Storage blocked'); };
    }, { ids: arena.map(p => p.id), stored, theme });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin); await page.getByRole('heading', { name: 'Random Arena problem', exact: true }).waitFor();
    const link = page.getByRole('link', { name: 'Solve problem', exact: true });
    assert.equal(await link.getAttribute('href'), `/dashboard/problems/${arena[0].id}`);
    // Account changes in a shared tab and a second browser context have the same progress-independent behavior.
    for (const actor of ['A', 'B', '']) {
      await context.addCookies([{ name: 'viewer', value: actor, url: origin }]);
      const another = page.getByRole('button', { name: 'Another problem', exact: true });
      const before = await link.getAttribute('href'); await another.focus(); await page.keyboard.press('Enter');
      await page.waitForFunction(before => document.querySelector('a[href^="/dashboard/problems/"]')?.getAttribute('href') !== before, before);
      assert.notEqual(await link.getAttribute('href'), before);
    }
    await page.reload(); await page.getByRole('heading', { name: 'Random Arena problem', exact: true }).waitFor();
    assert.equal(await link.getAttribute('href'), `/dashboard/problems/${arena[0].id}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (stored === 'all') { const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); assert.deepEqual(result.violations.filter(v => ['serious', 'critical'].includes(v.impact)), []); }
    await context.close();
  }
  assert.deepEqual(apiRequests, []); assert.deepEqual(errors, []);
  console.log('Random discovery passed: empty/partial/all/blocked storage, shared-tab cookies, fresh contexts, reload, keyboard shuffle, mobile/desktop light/dark and axe. No account-progress requests.');
} finally { await browser?.close(); await new Promise(r => server ? server.close(r) : r()); await rm(temp, { recursive: true, force: true }); }
