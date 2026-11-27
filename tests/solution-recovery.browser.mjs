// Actual written-solution component, synthetic sessions and submission transport. No database or provider access.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve, delimiter } from 'node:path';
import { tmpdir } from 'node:os';
const require = createRequire(import.meta.url);
const external = createRequire(join(process.env.AUTHORING_BROWSER_TOOLS || '/tmp/physcratic-editor-test', 'package.json'));
const { chromium } = external('playwright');
const axe = process.env.AXE_CORE_PATH || createRequire(external.resolve('@axe-core/playwright')).resolve('axe-core/axe.min.js');
const { build } = createRequire(require.resolve('tsx'))('esbuild');
const temp = await mkdtemp(join(tmpdir(), 'physcratic-written-recovery-'));
let server, browser, origin, version = 'a'.repeat(64), loseNext = false, holdNext = false, sourceDown = false, release;
const requests = [], saved = new Map();
function reply(res, value, status = 200) { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(value)); }
try {
  await build({ entryPoints: ['tests/solution-recovery-harness.tsx'], outfile: join(temp, 'bundle.js'), bundle: true, platform: 'browser', format: 'esm', jsx: 'automatic', alias: { '@': process.cwd(), '@/lib/auth-client': resolve('tests/practice-session-fixture.ts') }, nodePaths: (process.env.NODE_PATH || '').split(delimiter).filter(Boolean), define: { 'process.env.NODE_ENV': '"development"', 'process.env': '{}' }, logLevel: 'silent' });
  console.log('Written recovery: component bundle built.');
  execFileSync(process.execPath, [require.resolve('tailwindcss/lib/cli.js'), '-i', 'app/globals.css', '-o', join(temp, 'style.css')], { env: process.env, stdio: 'pipe' });
  console.log('Written recovery: styles built.');
  server = createServer(async (req, res) => {
    const path = new URL(req.url, origin).pathname;
    res.setHeader('cache-control', 'no-store');
    if (path === '/bundle.js' || path === '/style.css') { res.setHeader('content-type', path.endsWith('.js') ? 'text/javascript' : 'text/css'); res.end(await readFile(join(temp, path.slice(1)))); return; }
    if (path.startsWith('/api/submission-info/')) { if (sourceDown) reply(res, { error: 'Source unavailable' }, 503); else reply(res, { problemVersion: version, gradingEnabled: false, ratedEnabled: false, rating: null, parts: [] }); return; }
    if (path === '/api/individual-rating') { reply(res, { rating: null, ratedAttempts: 0, initialRating: 1200, history: [] }); return; }
    if (path === '/api/solution-evidence') { reply(res, { id: randomUUID(), filename: 'work.png', mediaType: 'image/png', bytes: 8, sha256: 'b'.repeat(64) }); return; }
    if (path === '/api/submissions') {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const actor = req.headers.cookie?.match(/viewer=([^;]+)/)?.[1], expected = req.headers['x-practice-account'];
      const body = JSON.parse(raw); requests.push({ actor, expected, body });
      if (actor !== expected) { reply(res, { error: 'Account changed' }, 409); return; }
      const key = `${actor}:${body.idempotencyKey}`;
      let receipt = saved.get(key);
      if (!receipt && body.problemVersion !== version) { reply(res, { error: 'The source version changed. Reload the problem before saving.' }, 409); return; }
      if (!receipt) { receipt = { id: randomUUID(), status: 'awaiting-reference', check: null, ratingEvent: null }; saved.set(key, receipt); }
      if (holdNext) { holdNext = false; await new Promise(r => { release = r; }); }
      if (loseNext) { loseNext = false; reply(res, { error: 'Reply interrupted after commit' }, 503); return; }
      reply(res, receipt); return;
    }
    res.setHeader('content-type', 'text/html');
    res.end('<!doctype html><html lang="en"><head><title>Solution recovery test</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body class="bg-background text-foreground"><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>');
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r)); origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  console.log('Written recovery: browser launched.');
  const page = await browser.newPage(); page.on('dialog', d => void d.accept());
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const working = page.locator('textarea[id$="-working"]');
  const part = page.locator('input[id$="-part"]');
  const answer = page.locator('textarea[id$="-answer"]');
  const wait = async () => page.getByRole('button', { name: 'Save attempt', exact: true }).waitFor();
  const fill = async text => { await part.fill('A.1'); await working.fill(text); await answer.fill('2'); };
  await page.goto(origin); await wait(); await fill('Student A working: α = 2');
  await page.reload(); await wait(); assert.equal(await working.inputValue(), 'Student A working: α = 2');
  assert.equal(await part.inputValue(), 'A.1'); assert.equal(await answer.inputValue(), '2');
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download working' }).click();
  const download = await downloadPromise; assert.match(await readFile(await download.path(), 'utf8'), /Student A working: α = 2/);
  loseNext = true;
  await page.getByRole('button', { name: 'Save attempt', exact: true }).click();
  await page.getByText('Reply interrupted after commit').waitFor(); assert.equal(await working.isDisabled(), true);
  const original = requests.at(-1).body;
  await page.reload(); await page.getByRole('button', { name: 'Retry original save' }).waitFor();
  assert.equal(await working.inputValue(), 'Student A working: α = 2');
  await page.getByRole('button', { name: 'Retry original save' }).click(); await page.getByText('Attempt saved, awaiting reference').waitFor();
  assert.deepEqual(requests.at(-1).body, original); assert.equal(saved.size, 1);
  await page.reload(); await page.getByText('Attempt saved, awaiting reference').waitFor(); assert.equal(requests.length, 2, 'reload does not resubmit');
  console.log('Written recovery: reload, export and lost-receipt replay passed.');
  await page.getByRole('button', { name: 'Start another attempt' }).click(); await fill('Work with attached page');
  await page.locator('input[type="file"]').setInputFiles({ name: 'work.png', mimeType: 'image/png', buffer: Buffer.from([137,80,78,71,13,10,26,10]) });
  await page.locator('textarea[id$="-transcript"]').fill('The attached page says alpha = 2.');
  await page.getByRole('checkbox').check(); loseNext = true;
  await page.getByRole('button', { name: 'Save attempt', exact: true }).click(); await page.getByText('Reply interrupted after commit').waitFor();
  const withEvidence = requests.at(-1).body; assert.equal(withEvidence.evidence.length, 1);
  await page.reload(); await page.getByRole('button', { name: 'Retry original save' }).click(); await page.getByText('Attempt saved, awaiting reference').waitFor();
  assert.deepEqual(requests.at(-1).body, withEvidence, 'retry keeps original attachment metadata and confirmed transcription');
  await page.getByRole('button', { name: 'Start another attempt' }).click(); await fill('A private unfinished work');
  await page.evaluate(() => window.__setPracticeSession('B')); await wait(); assert.equal(await working.inputValue(), '');
  assert.ok(!(await page.locator('body').innerText()).includes('A private unfinished work'));
  await fill('B independent working');
  await page.evaluate(() => window.__setPracticeSession('A')); await wait(); assert.equal(await working.inputValue(), 'A private unfinished work');
  const beforeStale = saved.size;
  await page.evaluate(() => { document.cookie = 'viewer=B; Path=/'; });
  await page.getByRole('button', { name: 'Save attempt', exact: true }).click(); await page.getByText('Account changed', { exact: true }).waitFor();
  assert.equal(saved.size, beforeStale, 'stale client account cannot save as cookie account B');
  await page.evaluate(() => window.__setPracticeSession('A')); await page.getByRole('button', { name: 'Retry original save' }).click();
  await page.getByText('Attempt saved, awaiting reference').waitFor();
  await page.getByRole('button', { name: 'Start another attempt' }).click(); await fill('Delayed A attempt');
  holdNext = true; await page.getByRole('button', { name: 'Save attempt', exact: true }).click();
  for (let n = 0; !release && n < 1000; n++) await new Promise(r => setTimeout(r, 10));
  assert.ok(release, 'the held request reached the server');
  await page.evaluate(() => window.__setPracticeSession('B')); await wait(); release(); release = undefined;
  assert.equal(await working.inputValue(), 'B independent working'); assert.equal(await page.getByText('Attempt saved, awaiting reference').count(), 0);
  await page.evaluate(() => window.__setPracticeSession('A')); await page.getByRole('button', { name: 'Retry original save' }).click(); await page.getByText('Attempt saved, awaiting reference').waitFor();
  await page.getByRole('button', { name: 'Start another attempt' }).click(); await fill('Old version working');
  version = 'c'.repeat(64); await page.getByRole('button', { name: 'Refresh fixture source' }).click(); await page.getByText('Problem version changed', { exact: true }).waitFor();
  assert.equal(await working.inputValue(), 'Old version working'); assert.equal(await working.isDisabled(), true);
  await page.reload(); await wait(); assert.equal(await working.inputValue(), '', 'old-version draft is never silently reassigned');
  console.log('Written recovery: account and version boundaries passed.');
  await page.evaluate(() => window.__setPracticeSession(null)); await page.getByRole('link', { name: 'Sign in to submit' }).waitFor();
  assert.equal(await working.count(), 0, 'guest tools expose no private working');
  await page.getByText('Equation calculator', { exact: true }).first().click();
  await page.getByLabel('Equation', { exact: true }).first().fill('2+2');
  await page.getByRole('button', { name: 'Calculate', exact: true }).first().click(); await page.getByText('result = 4', { exact: true }).waitFor();
  await page.evaluate(() => window.__setPracticeSession('A', true, true)); await page.getByText('Checking your account.', { exact: true }).waitFor();
  assert.equal(await page.getByText('Equation calculator', { exact: true }).count(), 1);
  assert.equal(await working.count(), 0);
  sourceDown = true;
  await page.evaluate(() => window.__setPracticeSession('C')); await page.getByText('Source verification failed', { exact: true }).waitFor();
  assert.equal(await page.getByText('Equation calculator', { exact: true }).count(), 1, 'source failure retains public calculator');
  sourceDown = false; await page.getByRole('button', { name: 'Retry verification', exact: true }).click(); await wait();
  console.log('Written recovery: guest and unavailable-account/source calculator access passed.');
  for (const width of [375, 1440]) for (const dark of [false, true]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
    // Theme colors transition for 150 ms. Check the settled theme, not an intermediate blend.
    await page.waitForTimeout(300);
    await page.addScriptTag({ path: axe });
    const result = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    assert.deepEqual(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, html: n.html, failure: n.failureSummary })) })), [], `axe ${width} dark=${dark}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v) { if (k.startsWith('physcratic.solution.v1:')) throw new DOMException('full', 'QuotaExceededError'); return set.call(this, k, v); }; });
  const blockedPage = await blocked.newPage(); await blockedPage.goto(origin); await blockedPage.locator('input[id$="-part"]').fill('A.1'); await blockedPage.locator('textarea[id$="-working"]').fill('Keep this text');
  await blockedPage.getByText('Tab recovery is unavailable.', { exact: false }).waitFor(); const before = requests.length;
  await blockedPage.getByRole('button', { name: 'Save attempt', exact: true }).click(); await blockedPage.getByText('Could not preserve this save', { exact: false }).waitFor();
  assert.equal(requests.length, before); assert.equal(await blockedPage.locator('textarea[id$="-working"]').inputValue(), 'Keep this text');
  assert.deepEqual(errors, []); console.log('Written recovery browser passed: reload, exact retry, receipts, export, account switching, delayed replies, version boundaries, storage failure, mobile/desktop and axe.');
} finally { release?.(); await browser?.close(); if (server) { server.closeAllConnections(); await new Promise(r => server.close(r)); } await rm(temp, { recursive: true, force: true }); }
