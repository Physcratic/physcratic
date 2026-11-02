// Production-build regression checks with external Playwright and local-only fixtures.
// BROWSER_TEST_ORIGIN=http://127.0.0.1:3000 CHROMIUM_PATH=/usr/bin/chromium node tests/dashboard-loading.browser.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
const require = process.env.AUTHORING_BROWSER_TOOLS ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, 'package.json')) : createRequire(import.meta.url);
const { chromium } = require('playwright');
const origin = process.env.BROWSER_TEST_ORIGIN || 'http://127.0.0.1:3000';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const dashboard = { user: null, savedAttempts: 0, practiceAttempts: 0, solvedProblems: 0, archiveReviewed: 0, ratings: [], contests: [] };
let checks = 0;
async function context(options = {}) {
  const c = await browser.newContext({ reducedMotion: 'reduce', ...options });
  c.setDefaultTimeout(15000);
  await c.route('**/*', async route => {
    const r = route.request(), u = new URL(r.url());
    if (u.origin !== origin) return route.abort();
    if (u.pathname === '/api/auth/get-session') return route.fulfill({ json: null });
    if (u.pathname === '/api/dashboard') return route.fulfill({ json: dashboard });
    if (u.pathname === '/api/rankings') return route.fulfill({ json: { rankings: [] } });
    if (u.pathname === '/api/authored-problems/library') return route.fulfill({ json: { problems: [], nextCursor: null } });
    if (u.pathname.startsWith('/api/') && u.pathname !== '/api/archive-grade') return route.fulfill({ status: 401, json: { error: 'Sign in required.' } });
    // The local archive grader is pure and does not save data. Every other write is blocked.
    if (!['GET', 'HEAD'].includes(r.method()) && u.pathname !== '/api/archive-grade') throw Error('Unexpected write: ' + u.pathname);
    return route.continue();
  });
  return c;
}
async function waitFor(page, predicate) { await page.waitForFunction(predicate); checks++; }
try {
  for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
    const c = await context({ viewport: { width, height: 1000 }, colorScheme: theme });
    await c.addInitScript(value => localStorage.setItem('theme', value), theme);
    const p = await c.newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    const response = await p.goto(origin + '/dashboard', { waitUntil: 'networkidle' });
    assert.ok((await response.text()).includes('Recommended problem'), 'Overview remains server rendered');
    await p.getByRole('heading', { name: 'Recommended problem', exact: true }).waitFor();
    assert.equal(await p.locator('html').evaluate(e => e.classList.contains('dark')), theme === 'dark');
    await p.keyboard.press('Tab');
    assert.match(await p.evaluate(() => document.activeElement.textContent), /Skip to content/);
    await p.keyboard.press('Enter');
    await waitFor(p, () => document.activeElement.id === 'main-content');
    if (process.env.P1_SCREENSHOTS) {
      await mkdir(process.env.P1_SCREENSHOTS, { recursive: true });
      await p.screenshot({ path: join(process.env.P1_SCREENSHOTS, `overview-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
    }
    const navigate = async (view, heading) => {
      if (width < 1024) await p.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await p.locator(`nav[aria-label="Main navigation"] a[href="/dashboard?view=${view}"]:visible`).click();
      await p.getByRole('heading', { name: heading, level: 1, exact: true }).waitFor();
    };
    await navigate('problems', 'Problems');
    await p.getByLabel('Find a problem', { exact: true }).waitFor();
    await p.waitForLoadState('networkidle');
    assert.equal(await p.getByRole('tab', { name: /Physcratic Arena/ }).getAttribute('aria-selected'), 'true');
    await p.getByLabel('Find a problem', { exact: true }).focus();
    if (process.env.P1_SCREENSHOTS) await p.screenshot({ path: join(process.env.P1_SCREENSHOTS, `problems-${width}-${theme}.png`), fullPage: true, animations: 'disabled' });
    const search = p.getByLabel('Find a problem', { exact: true });
    await search.fill('Mind the Gap');
    await waitFor(p, () => document.querySelectorAll('#arena-results [data-problem-card]').length === 1);
    assert.match(await p.locator('#arena-results').innerText(), /Mind the Gap/);
    await search.fill('');
    for (const tag of ['Mechanics', 'Energy conservation']) {
      await p.getByLabel('Tag', { exact: true }).click();
      await p.getByRole('option', { name: tag, exact: true }).focus();
      await p.keyboard.press('Enter');
      assert.ok((await p.locator('#arena-results [data-problem-card]').allTextContents()).every(t => t.includes(tag)));
      checks++;
    }
    await p.getByLabel('Tag', { exact: true }).click();
    await p.getByRole('option', { name: 'All tags', exact: true }).focus();
    await p.keyboard.press('Enter');
    await p.getByRole('tab', { name: /Olympiad archive/ }).click();
    await p.locator('#catalog-results [data-problem-card]').first().waitFor();
    const years = await p.locator('#catalog-results [data-problem-card]').evaluateAll(cards => cards.map(card => Number(card.dataset.problemCard.match(/-(\d{4})-/)?.[1])));
    assert.ok(years.length > 1 && years.every((y, i) => Number.isFinite(y) && (!i || years[i - 1] >= y)), 'Archive retains newest-first sorting: ' + JSON.stringify(years));
    await p.getByLabel('Competition', { exact: true }).fill('IPhO 2025');
    await search.fill('Hydrogen');
    await waitFor(p, () => document.querySelectorAll('#catalog-results [data-problem-card]').length === 1);
    assert.match(await p.locator('#catalog-results').innerText(), /Hydrogen/);
    await search.fill('');
    await p.getByLabel('Competition', { exact: true }).fill('');
    await p.getByRole('tab', { name: /Guided exercises/ }).click();
    await p.locator('#guided-results').getByRole('button', { name: /^Exercise:/ }).first().click();
    await p.locator('#corpus-title').waitFor();
    const working = p.getByLabel('Your working', { exact: true });
    await working.fill('Unsaved local working stays in the guided reader.');
    await p.getByRole('tab', { name: /Physcratic Arena/ }).click();
    await p.getByRole('tab', { name: /Guided exercises/ }).click();
    assert.equal(await working.inputValue(), 'Unsaved local working stays in the guided reader.');
    await p.getByRole('tab', { name: /Authored problems/ }).click();
    assert.equal(new URL(p.url()).searchParams.get('collection'), 'authored');
    await navigate('contests', 'Contests');
    await navigate('rankings', 'Rankings');
    await p.getByLabel('Search contestants', { exact: true }).fill('Nobody');
    await p.goto(origin + '/dashboard?view=guide', { waitUntil: 'networkidle' });
    await p.getByRole('heading', { name: 'Getting started', level: 1, exact: true }).waitFor();
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    checks += 12;
    await c.close();
  }
  // The overview still renders the signed-in chart and range controls.
  {
    const c = await context(), p = await c.newPage();
    const now = new Date().toISOString();
    await c.route('**/api/auth/get-session**', route => route.fulfill({ json: {
      session: { id: 'p1-session', userId: 'p1-user', expiresAt: '2099-01-01T00:00:00Z', createdAt: now, updatedAt: now },
      user: { id: 'p1-user', name: 'P1 fixture', email: 'p1@example.invalid', emailVerified: true, createdAt: now, updatedAt: now },
    } }));
    await c.route('**/api/dashboard', route => route.fulfill({ json: { ...dashboard, user: { name: 'P1 fixture' }, ratings: [1000, 1020, 1050].map((rating, i) => ({ rating, change: i ? 20 : 0, createdAt: new Date(Date.now() - (3 - i) * 86400000).toISOString(), contestName: 'Fixture contest' })) } }));
    await c.route('**/api/progress', route => route.fulfill({ json: { history: [] } }));
    await p.goto(origin + '/dashboard', { waitUntil: 'networkidle' });
    await p.locator('.recharts-area').first().waitFor();
    for (const range of ['1M', 'All']) {
      const control = p.getByLabel(range === 'All' ? 'All rating history' : 'Last month', { exact: true });
      await control.click();
      assert.equal(await control.getAttribute('data-state'), 'on');
    }
    checks += 3;
    await c.close();
  }
  // Arena statements and public worked solutions retain their existing tabs.
  {
    const c = await context(), p = await c.newPage();
    await p.goto(origin + '/dashboard/problems/arena-mind-the-gap', { waitUntil: 'networkidle' });
    await p.getByRole('tab', { name: 'Worked solution', exact: true }).click();
    await p.getByRole('tabpanel').getByText('Worked solution', { exact: true }).waitFor();
    await p.getByRole('tab', { name: 'Problem statement', exact: true }).click();
    await p.getByRole('heading', { name: 'Check your answers', exact: true }).waitFor();
    checks += 2;
    await c.close();
  }
  // Real local answer checking, with no persistence or remote service access.
  {
    const c = await context(), p = await c.newPage();
    await p.goto(origin + '/dashboard/problems/incline', { waitUntil: 'networkidle' });
    await p.getByPlaceholder('Number or LaTeX expression').first().fill('4.9');
    await p.getByRole('button', { name: 'Check answers', exact: true }).click();
    await p.getByText('Correct within this part’s numerical tolerance.', { exact: true }).waitFor();
    checks++;
    await c.close();
  }
  if (!process.env.P1_BASELINE) {
  // The calculator UI is immediate even if its engine is still downloading.
  {
    const c = await context(), p = await c.newPage(), before = new Set();
    p.on('response', r => { if (r.url().includes('/_next/') && r.url().endsWith('.js')) before.add(r.url()); });
    await p.goto(origin + '/dashboard/problems/ipho-2025-t1', { waitUntil: 'networkidle' });
    await p.getByRole('tab', { name: 'Your solution', exact: true }).click();
    await p.getByRole('link', { name: 'Sign in to submit', exact: true }).waitFor();
    await p.waitForLoadState('networkidle');
    const initial = new Set(before), extra = [];
    let release, block = new Promise(resolve => { release = resolve; });
    await c.route('**/_next/**/*.js', async route => {
      if (!initial.has(route.request().url())) { extra.push(route.request().url()); await block; }
      return route.continue();
    });
    await p.getByText('Equation calculator', { exact: true }).first().click();
    await p.getByLabel('Equation', { exact: true }).first().fill('1+1');
    await p.getByRole('button', { name: 'Calculate', exact: true }).first().click();
    await p.getByRole('button', { name: 'Calculating…', exact: true }).first().waitFor();
    assert.ok(extra.length > 0, 'Engine chunks are deferred until the calculator opens');
    await p.getByLabel('Equation', { exact: true }).first().fill('2+2');
    release();
    await p.getByRole('button', { name: 'Calculate', exact: true }).first().waitFor();
    assert.equal(await p.getByText('Calculated result', { exact: true }).count(), 0, 'Late results cannot overwrite edited input');
    await p.getByRole('button', { name: 'Calculate', exact: true }).first().click();
    await p.getByText('result = 4', { exact: true }).waitFor();
    await p.getByLabel('Equation', { exact: true }).first().fill('a = g*sin(theta)');
    await p.getByLabel('Variable values', { exact: true }).first().fill('g = 9.81\ntheta = pi/6');
    await p.getByRole('button', { name: 'Calculate', exact: true }).first().click();
    await p.getByText('a = 4.905', { exact: true }).waitFor();
    for (const [expression, values, text] of [['sqrt(-1)', '', 'finite and real'], ['a = x^2', '', 'Add values for: x'], ['2^(½)', '', '1.41421356237'], ['2+2', '', 'result = 4']]) {
      await p.getByLabel('Equation', { exact: true }).first().fill(expression);
      await p.getByLabel('Variable values', { exact: true }).first().fill(values);
      await p.getByRole('button', { name: 'Calculate', exact: true }).first().click();
      await p.getByText(text, { exact: false }).first().waitFor();
    }
    const fetched = before.size;
    await p.getByText('Equation calculator', { exact: true }).first().click();
    await p.getByText('Equation calculator', { exact: true }).first().click();
    await p.waitForLoadState('networkidle');
    assert.equal(before.size, fetched, 'Reopening reuses the engine');
    checks += 9;
    await c.close();
  }
  // Failed optional preloads must not poison the next calculation attempt.
  {
    const c = await context(), p = await c.newPage(), loaded = new Set();
    p.on('response', r => { if (r.url().includes('/_next/') && r.url().endsWith('.js')) loaded.add(r.url()); });
    await p.goto(origin + '/dashboard/problems/ipho-2025-t1', { waitUntil: 'networkidle' });
    await p.getByRole('tab', { name: 'Your solution', exact: true }).click();
    await p.waitForLoadState('networkidle');
    const initial = new Set(loaded);
    let fail = true;
    await c.route('**/_next/**/*.js', route => !initial.has(route.request().url()) && fail ? route.abort() : route.continue());
    await p.getByText('Equation calculator', { exact: true }).first().click();
    await p.getByLabel('Equation', { exact: true }).first().fill('2+2');
    await p.getByRole('button', { name: 'Calculate', exact: true }).first().click();
    await p.getByText('Could not load the calculator. Please retry.', { exact: true }).waitFor();
    fail = false;
    await p.getByRole('button', { name: 'Calculate', exact: true }).first().click();
    await p.getByText('result = 4', { exact: true }).waitFor();
    checks += 2;
    await c.close();
  }
  }
  console.log(`Dashboard loading: ${checks} checks passed, including four layout/theme combinations, SSR, navigation, filters, archive sorting, retained guided edits and local grading${process.env.P1_BASELINE ? " (baseline)" : ", delayed and failed calculator chunks"}.`);
} finally { await browser.close(); }
