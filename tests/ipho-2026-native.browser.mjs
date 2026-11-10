// Production pages, loopback only, no persistent writes or external providers.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { createServer } from 'node:net'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { childEnvironment } from '../scripts/csp/support.mjs'

const require = createRequire(import.meta.url)
const browserTools = process.env.AUTHORING_BROWSER_TOOLS ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, 'package.json')) : require
const { chromium } = browserTools('playwright')
const { default: AxeBuilder } = browserTools('@axe-core/playwright')
const reservation = createServer()
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve))
const port = reservation.address().port
await new Promise(resolve => reservation.close(resolve))
const origin = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], { env: childEnvironment(process.cwd(), port), stdio: ['ignore', 'pipe', 'pipe'] })
let serverLog = ''
server.stdout.on('data', data => { serverLog += data })
server.stderr.on('data', data => { serverLog += data })
let browser
const out = 'work/ipho-2026-browser'
await mkdir(out, { recursive: true })
try {
  for (let attempt = 0; ; attempt++) {
    assert.equal(server.exitCode, null, serverLog)
    try { if ((await fetch(origin + '/api/health')).ok) break } catch {}
    assert.ok(attempt < 100, 'Production server did not start')
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) })
  const problems = [
    { id: 'ipho-2026-t1', prefix: 'T1', title: 'Three problems', codes: ['A1', 'B1', 'B2', 'C1', 'C2'], figures: [3, 1] },
    { id: 'ipho-2026-t2', prefix: 'T2', title: 'Cooking with sunlight?', codes: ['A1', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'C4'], figures: [7, 6] },
  ]
  for (const problem of problems) for (const width of [375, 1440]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    await context.addInitScript(theme => localStorage.setItem('theme', theme), theme)
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const response = await page.goto(origin + '/dashboard/problems/' + problem.id)
    const serverHtml = await response.text()
    assert.ok(serverHtml.includes(`<h4>${problem.prefix}-A1`))
    assert.match(serverHtml, /class="katex/)
    assert.equal(await page.getByRole('heading', { name: 'Statement as text', exact: true }).count(), 0)
    await page.getByRole('heading', { level: 1, name: problem.title, exact: true }).waitFor()
    for (const kind of ['statement', 'solution']) {
      if (kind === 'solution') await page.getByRole('tab', { name: /Worked solution/ }).click()
      const article = page.locator('.imported-source-content:visible')
      await article.waitFor()
      for (const code of problem.codes) assert.equal(await article.getByRole('heading', { name: new RegExp(`^${problem.prefix}-${code} `) }).count(), 1)
      if (kind === 'solution' && problem.prefix === 'T1') {
        assert.equal(await article.getByRole('heading', { name: 'SOLUTION 3:', exact: true }).count(), 1)
        assert.match(await article.innerText(), /Special case:/)
      }
      if (kind === 'solution' && problem.prefix === 'T2') {
        assert.match(await article.innerText(), /Alternative answer in terms of/)
        assert.match(await article.innerText(), /Alternative solution parametrized/)
      }
      const images = article.locator('img')
      assert.equal(await images.count(), problem.figures[kind === 'statement' ? 0 : 1])
      for (const img of await images.all()) {
        await img.scrollIntoViewIfNeeded()
        await img.evaluate(img => img.decode())
        assert.ok(await img.evaluate(img => img.naturalWidth > 300 && img.getBoundingClientRect().width <= innerWidth))
        assert.ok((await img.getAttribute('alt')).length > 30)
      }
      assert.equal(await article.locator('.katex-error').count(), 0)
      for (const equation of await article.locator('.katex-display').all()) {
        assert.equal(await equation.getAttribute('tabindex'), '0')
      }
      if (width === 375 && (problem.prefix === 'T1' || kind === 'solution')) {
        const overflow = await article.locator('.katex-display').evaluateAll(nodes => nodes.findIndex(el => el.scrollWidth > el.clientWidth + 1))
        assert.ok(overflow >= 0)
        const equation = article.locator('.katex-display').nth(overflow)
        await equation.focus()
        await page.keyboard.press('ArrowRight')
        await page.waitForTimeout(150)
        assert.ok(await equation.evaluate(el => el.scrollLeft > 0))
      }
      const link = page.getByRole('link', { name: new RegExp(`Open original ${kind} PDF`) })
      assert.match(await link.getAttribute('href'), new RegExp(`/${kind}\\.pdf$`))
      const response = await page.request.get(new URL(await link.getAttribute('href'), origin).href)
      assert.equal(response.status(), 200)
      assert.equal((await response.body()).subarray(0, 5).toString(), '%PDF-')
      await link.focus()
      assert.equal(await link.evaluate(el => el === document.activeElement), true)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      const axe = await new AxeBuilder({ page }).analyze()
      assert.deepEqual(axe.violations.filter(v => ['serious', 'critical'].includes(v.impact)), [])
      await page.screenshot({ path: `${out}/${problem.prefix}-${kind}-${width}-${theme}.png`, fullPage: true })
    }
    assert.deepEqual(errors, [])
    await context.close()
  }
  console.log('PASS 16 production native document combinations, complete questions, alternative solutions, maths, figures, original PDFs, focus, overflow and axe')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
  await writeFile(`${out}/server.log`, serverLog)
}
