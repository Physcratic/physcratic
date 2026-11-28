// Actual feedback and completion components with synthetic mark transport. No database or provider access.
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
const { chromium } = external('playwright');
const { default: AxeBuilder } = external('@axe-core/playwright');
axeSettle.settleAxeBuilder(AxeBuilder);
const { build } = createRequire(require.resolve('tsx'))('esbuild');
const temp = await mkdtemp(join(tmpdir(), 'physcratic-feedback-'));
let browser, server, completed = false;
const key = 'arena:arena-mind-the-gap', completedAt = '2026-11-27T00:00:00.000Z';
try {
  await build({ entryPoints: ['tests/feedback-clarity-harness.tsx'], outfile: join(temp, 'bundle.js'), bundle: true, platform: 'browser', jsx: 'automatic', alias: { '@': process.cwd() }, define: { 'process.env.NODE_ENV': '"development"', 'process.env': '{}' }, logLevel: 'silent' });
  execFileSync(process.execPath, [require.resolve('tailwindcss/lib/cli.js'), '-i', 'app/globals.css', '-o', join(temp, 'style.css')], { stdio: 'pipe' });
  server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    res.setHeader('cache-control', 'no-store');
    if (url.pathname === '/bundle.js' || url.pathname === '/style.css') {
      res.setHeader('content-type', url.pathname.endsWith('.js') ? 'text/javascript' : 'text/css');
      res.end(await readFile(join(temp, url.pathname.slice(1)))); return;
    }
    if (url.pathname === '/api/personal-completions') {
      if (req.method === 'PUT') { let raw = ''; for await (const chunk of req) raw += chunk; completed = JSON.parse(raw).completed; }
      const status = { key, completed, completedAt: completed ? completedAt : null };
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(req.method === 'PUT' || url.searchParams.has('key') ? status : { count: Number(completed), items: completed ? [{ key, title: 'Mind the Gap', href: '/dashboard/problems/arena-mind-the-gap', completedAt }] : [], nextCursor: null })); return;
    }
    res.setHeader('content-type', 'text/html');
    res.end('<!doctype html><html lang="en"><head><title>Feedback test</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body class="bg-background text-foreground"><div id="root"></div><script src="/bundle.js"></script></body></html>');
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  for (const width of [375, 1440]) for (const theme of ['light', 'dark']) {
    completed = false;
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    const mark = page.getByRole('button', { name: 'Mark complete', exact: true });
    await mark.waitFor(); await mark.focus(); await page.keyboard.press('Enter');
    const marked = page.getByRole('button', { name: 'Marked complete', exact: true });
    await marked.waitFor(); assert.equal(await marked.getAttribute('aria-pressed'), 'true');
    await page.getByText('1 marked complete', { exact: true }).waitFor();
    await marked.click(); await mark.waitFor(); assert.equal(await mark.getAttribute('aria-pressed'), 'false');
    await page.getByText('0 marked complete', { exact: true }).waitFor();
    for (const i of [0, 1]) assert.doesNotMatch(await page.getByRole('region', { name: `Result ${i}`, exact: true }).innerText(), /Not correct yet|[1-9] incorrect/);
    assert.match(await page.getByRole('region', { name: 'Result 2', exact: true }).innerText(), /Review your working/);
    assert.match(await page.getByRole('region', { name: 'Result 3', exact: true }).innerText(), /All checkable answers correct.*1 part to check yourself/s);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.deepEqual(result.violations.filter(v => ['serious', 'critical'].includes(v.impact)), []);
    assert.deepEqual(errors, []); await context.close();
  }
  console.log('Feedback clarity passed: mark/unmark with keyboard, honest mixed results, mobile/desktop light/dark, overflow and axe.');
} finally { await browser?.close(); await new Promise(r => server ? server.close(r) : r()); await rm(temp, { recursive: true, force: true }); }
