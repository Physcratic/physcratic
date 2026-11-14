// Actual cards, SVG flag images and current production CSS. Loopback fixtures only.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { readFile, readdir, mkdtemp, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
const require = createRequire(import.meta.url)
const browserTools = createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, 'package.json'))
const { chromium } = browserTools('playwright')
const { default: AxeBuilder } = browserTools('@axe-core/playwright')
const { build } = createRequire(require.resolve('tsx'))('esbuild')
const temp = await mkdtemp(join(tmpdir(), 'physcratic-host-flags-'))
const screenshots = process.env.BROWSER_SCREENSHOTS || 'work/olympiad-host-flags'
let server, browser
try {
  await mkdir(screenshots, { recursive: true })
  await build({ stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
    import React from 'react'
    import {createRoot} from 'react-dom/client'
    import {OlympiadProblemCard} from './components/physics/olympiad-problem-card'
    import {catalogProblems} from './lib/corpus-catalog'
    const ids=['ipho-2025-t1','apho-2025-t1','eupho-2025-t1','ipho-2016-t1','apho-2016-t1','ipho-2021-t1','eupho-2020-t1','apho-2022-t1']
    const entries=ids.map(id=>catalogProblems.find(p=>p.id===id)!)
    entries.push({...entries[0],year:2027})
    window.opened=[]
    createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-4xl p-4"><h1>Olympiad cards</h1><h2>Collection</h2><h3>Problems</h3><div className="space-y-4">{entries.map(p=><OlympiadProblemCard key={p.id+p.year} problem={p} onOpen={id=>window.opened.push(id)} />)}</div></main>)
  ` }, bundle: true, outfile: join(temp, 'bundle.js'), platform: 'browser', format: 'esm', jsx: 'automatic', define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"' } })
  const styles = await readdir('.next/static/css')
  server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://127.0.0.1').pathname
    if (path === '/bundle.js') {
      res.setHeader('content-type', 'text/javascript')
      res.end(await readFile(join(temp, 'bundle.js')))
      return
    }
    if (/^\/flags\/[a-z]{2}\.svg$/.test(path)) {
      res.setHeader('content-type', 'image/svg+xml')
      res.end(await readFile('public' + path))
      return
    }
    if (path.startsWith('/_next/static/') && !path.includes('..')) {
      res.setHeader('content-type', path.endsWith('.css') ? 'text/css' : 'application/octet-stream')
      res.end(await readFile('.next/static/' + path.slice('/_next/static/'.length)))
      return
    }
    res.setHeader('content-type', 'text/html')
    res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Host flags</title>${styles.map(s=>`<link rel="stylesheet" href="/_next/static/css/${s}">`).join('')}</head><body class="font-sans"><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>`)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' })
  for (const width of [375, 1440]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 950 } })
    const page = await context.newPage()
    await page.addInitScript(theme => document.addEventListener('DOMContentLoaded', () => document.documentElement.classList.toggle('dark', theme === 'dark')), theme)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(origin)
    await page.waitForTimeout(500)
    assert.deepEqual(errors, [])
    await page.getByRole('img', { name: 'Hosted by France', exact: true }).waitFor()
    assert.equal(await page.getByRole('img').count(), 8)
    const joint = page.getByRole('img', { name: 'Hosted by Switzerland and Liechtenstein', exact: true })
    await joint.waitFor()
    await page.getByRole('img', { name: 'Hosted by India (online)', exact: true }).waitFor()
    await page.getByRole('img', { name: 'Hosted by Estonia (online)', exact: true }).waitFor()
    assert.equal(await page.locator('[data-problem-card="ipho-2025-t1"]').last().getByRole('img').count(), 0)
    // No host flag may render as text: each is image-only and every image loaded with real size
    const flagInfo = await page.locator('[data-host-flag]').evaluateAll(els => els.map(el => ({ text: el.textContent.trim(), imgs: [...el.querySelectorAll('img')].map(i => ({ ok: i.complete && i.naturalWidth > 0, h: i.getBoundingClientRect().height, w: i.getBoundingClientRect().width, border: getComputedStyle(i).borderTopWidth })), font: parseFloat(getComputedStyle(el).fontSize), focusable: el.tabIndex })))
    assert.equal(flagInfo.length, 8)
    for (const f of flagInfo) {
      assert.equal(f.text, '')
      assert.ok(f.imgs.length >= 1)
      assert.equal(f.focusable, -1)
      for (const i of f.imgs) { assert.ok(i.ok); assert.ok(i.h >= 14 && i.h <= 18 && i.w > 10); assert.equal(i.border, '1px') }
    }
    assert.equal(flagInfo.find(f => f.imgs.length === 2) !== undefined, true)
    assert.equal(await page.evaluate(() => /[\u{1F1E6}-\u{1F1FF}]/u.test(document.body.textContent)), false)
    for (const flag of await page.getByRole('img').all()) {
      const position = await flag.evaluate(el => {
        const badge = el.nextElementSibling
        const a = el.getBoundingClientRect(), b = badge.getBoundingClientRect()
        return { before: !!(el.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING), left: a.right <= b.left + 1, aligned: Math.abs((a.top+a.bottom-b.top-b.bottom)/2) < 2 }
      })
      assert.deepEqual(position, { before: true, left: true, aligned: true })
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.keyboard.press('Tab')
    assert.match(await page.locator(':focus').getAttribute('aria-label'), /^Open problem:/)
    const focused = await page.locator(':focus').evaluate(el => ({ outline: getComputedStyle(el).outlineStyle, shadow: getComputedStyle(el).boxShadow }))
    assert.ok(focused.outline !== 'none' || focused.shadow !== 'none')
    await page.keyboard.press('Enter')
    assert.deepEqual(await page.evaluate(() => window.opened), ['ipho-2025-t1'])
    const axe = await new AxeBuilder({ page }).analyze()
    assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)), [])
    await page.screenshot({ path: join(screenshots, `cards-${width}-${theme}.png`), fullPage: true })
    await context.close()
  }
  console.log('PASS 4 card browser combinations, 9 cards each: labelled hosts, online/joint/missing metadata, placement, wrapping, keyboard activation/focus, axe and screenshots')
} finally {
  await browser?.close()
  if (server) {
    server.closeAllConnections()
    await new Promise(resolve=>server.close(resolve))
  }
  await rm(temp, { recursive: true, force: true })
}
