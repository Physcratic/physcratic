#!/usr/bin/env node
// Smoke tests for a deployed Physcratic site. Node 22, no dependencies.
//
//   SMOKE_ENV=production node scripts/smoke.mjs https://physcratic.com
//
// Env:
//   SMOKE_ENV                        "preview" or "production" (required)
//   VERCEL_AUTOMATION_BYPASS_SECRET  sent as x-vercel-protection-bypass when set
//   GITHUB_STEP_SUMMARY              when set, the markdown table is appended to it
//   SMOKE_USER_AGENT                 optional override of the request User-Agent
//
// Each check prints one PASS, FAIL or SKIP line. Exit code 1 if any check fails.
// To add a check, see docs/engineering/SMOKE_TESTS.md.

import { appendFileSync } from 'node:fs'

const CANONICAL_ORIGIN = 'https://physcratic.com'
const TIMEOUT_MS = 20_000
// next.config.ts sets htmlLimitedBots to match every User-Agent, so metadata is always
// rendered into <head> and a plain identifying User-Agent is enough.
const USER_AGENT = process.env.SMOKE_USER_AGENT || 'PhyscraticSmoke/1.0 (+https://physcratic.com)'

const baseArg = process.argv[2]
const smokeEnv = process.env.SMOKE_ENV
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET

function usage(message) {
  console.error(message)
  console.error('Usage: SMOKE_ENV=preview|production node scripts/smoke.mjs <base-url>')
  process.exit(2)
}

if (!baseArg) usage('Missing base URL.')
if (smokeEnv !== 'preview' && smokeEnv !== 'production') usage('SMOKE_ENV must be "preview" or "production".')
let base
try {
  base = new URL(baseArg)
} catch {
  usage(`Not a valid URL: ${baseArg}`)
}
if (base.protocol !== 'https:' && base.protocol !== 'http:') usage('Base URL must be http(s).')

/** Fetch a path without following redirects, so a redirect is never mistaken for a 200. */
async function get(path) {
  const headers = { 'user-agent': USER_AGENT, accept: '*/*' }
  if (bypass) headers['x-vercel-protection-bypass'] = bypass
  const res = await fetch(new URL(path, base), {
    redirect: 'manual',
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const bytes = new Uint8Array(await res.arrayBuffer())
  return {
    status: res.status,
    headers: res.headers,
    bytes: bytes.length,
    text: new TextDecoder().decode(bytes),
    contentType: (res.headers.get('content-type') || '').toLowerCase(),
  }
}

class Skip extends Error {}

function fail(message) {
  throw new Error(message)
}

function expectStatus(res, wanted) {
  if (res.status !== wanted) {
    const where = res.headers.get('location')
    fail(`status ${res.status}, wanted ${wanted}${where ? ` (redirects to ${where})` : ''}`)
  }
}

/** The text of <head>...</head>, or null when the page has none. */
function headOf(html) {
  const match = html.match(/<head[\s>][\s\S]*?<\/head>/i)
  return match ? match[0] : null
}

function titleIn(head) {
  const match = head.match(/<title[^>]*>([^<]*)<\/title>/i)
  return match && match[1].trim() ? match[1].trim() : null
}

function hasTag(head, tag, attr, value) {
  const tagPattern = new RegExp(`<${tag}\\b[^>]*>`, 'gi')
  const attrPattern = new RegExp(`\\b${attr}\\s*=\\s*["']${value}["']`, 'i')
  return (head.match(tagPattern) || []).some((t) => attrPattern.test(t))
}

/** Every <script type="application/ld+json"> block in a page, parsed. Fails on the first block that is not JSON. */
function jsonLdBlocks(html) {
  const raw = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1])
  return raw.map((text, index) => {
    try {
      return JSON.parse(text)
    } catch (err) {
      return fail(`JSON-LD block ${index + 1} is not valid JSON: ${err.message}`)
    }
  })
}

/** The first link to tally.so in the page, without its query string, or null. */
function tallyLink(html) {
  const match = html.match(/href\s*=\s*["'](https:\/\/tally\.so\/[^"']*)["']/i)
  if (!match) return null
  return match[1].replace(/&amp;/g, '&').split(/[?#]/)[0]
}

/** A page with a head that has a title and a canonical link. Returns the head. */
function expectTitleAndCanonical(res) {
  const head = headOf(res.text)
  if (!head) fail('no <head> in the HTML')
  const missing = []
  if (!titleIn(head)) missing.push('title')
  if (!hasTag(head, 'link', 'rel', 'canonical')) missing.push('canonical link')
  if (missing.length) fail(`<head> is missing: ${missing.join(', ')}`)
  return head
}

const checks = [
  {
    name: '/',
    async run() {
      const res = await get('/')
      if (res.status === 200) return '200'
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location') || ''
        const target = new URL(location, base)
        if (target.pathname !== '/dashboard') fail(`redirects to ${location}, wanted /dashboard`)
        const next = await get('/dashboard')
        expectStatus(next, 200)
        return `redirects to /dashboard, which answers 200`
      }
      return fail(`status ${res.status}, wanted 200 or a redirect to /dashboard`)
    },
  },
  {
    name: '/dashboard',
    async run() {
      const res = await get('/dashboard')
      expectStatus(res, 200)
      const head = headOf(res.text)
      if (!head) fail('no <head> in the HTML')
      const title = titleIn(head)
      if (!title) fail('no <title> inside <head>')
      return `200, title "${title}"`
    },
  },
  {
    name: '/dashboard/problems/incline',
    async run() {
      const res = await get('/dashboard/problems/incline')
      expectStatus(res, 200)
      const head = headOf(res.text)
      if (!head) fail('no <head> in the HTML')
      const missing = []
      if (!titleIn(head)) missing.push('title')
      if (!hasTag(head, 'link', 'rel', 'canonical')) missing.push('canonical link')
      if (!hasTag(head, 'meta', 'property', 'og:image')) missing.push('og:image')
      if (missing.length) fail(`<head> is missing: ${missing.join(', ')}`)
      return '200, head has title, canonical and og:image'
    },
  },
  {
    name: '/coaching',
    async run() {
      expectStatus(await get('/coaching'), 200)
      return '200'
    },
  },
  {
    name: '/learn',
    async run() {
      const res = await get('/learn')
      expectStatus(res, 200)
      expectTitleAndCanonical(res)
      // The hub carries a CollectionPage graph (see learnHubGraph). Any JSON-LD on it has to parse.
      const blocks = jsonLdBlocks(res.text).length
      return `200, head has title and canonical${blocks ? `, ${blocks} JSON-LD block(s) parse` : ''}`
    },
  },
  {
    name: '/learn (first guide)',
    async run() {
      const hub = await get('/learn')
      expectStatus(hub, 200)
      const link = hub.text.match(/href\s*=\s*["'](\/learn\/[a-z0-9][a-z0-9-]*)["']/i)
      if (!link) fail('/learn links to no guide')
      const res = await get(link[1])
      expectStatus(res, 200)
      expectTitleAndCanonical(res)
      const blocks = jsonLdBlocks(res.text).length
      if (!blocks) fail('no JSON-LD block in the page')
      return `${link[1]}: 200, head has title and canonical, ${blocks} JSON-LD block(s) parse`
    },
  },
  {
    name: '/coaching/consultation',
    async run() {
      const res = await get('/coaching/consultation')
      expectStatus(res, 200)
      const link = tallyLink(res.text)
      if (!link) fail('no link to tally.so')
      return `200, links to ${link.replace('https://', '')}`
    },
  },
  {
    name: '/coaching/become-a-tutor',
    async run() {
      const res = await get('/coaching/become-a-tutor')
      expectStatus(res, 200)
      const link = tallyLink(res.text)
      if (!link) fail('no link to tally.so')
      return `200, links to ${link.replace('https://', '')}`
    },
  },
  {
    name: '/sign-in',
    async run() {
      if (smokeEnv === 'preview') throw new Skip('production only')
      const res = await get('/sign-in')
      expectStatus(res, 200)
      const head = headOf(res.text)
      if (!head) fail('no <head> in the HTML')
      const title = titleIn(head)
      if (!title) fail('no <title> inside <head>')
      return `200, title "${title}"`
    },
  },
  {
    name: '/this-page-does-not-exist',
    async run() {
      const res = await get('/this-page-does-not-exist')
      expectStatus(res, 404)
      if (!res.text.includes('Page not found')) fail('404 body does not contain "Page not found"')
      return '404 with "Page not found"'
    },
  },
  {
    name: '/sitemap.xml',
    async run() {
      const res = await get('/sitemap.xml')
      expectStatus(res, 200)
      if (!res.contentType.includes('xml')) fail(`content type "${res.contentType}" is not xml`)
      const raw = res.text.match(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i)
      if (raw) {
        const at = raw.index
        fail(`raw "&" outside an entity near: ${res.text.slice(Math.max(0, at - 40), at + 40).replace(/\s+/g, ' ')}`)
      }
      const locs = [...res.text.matchAll(/<loc>\s*([^<]*?)\s*<\/loc>/g)].map((m) => m[1])
      if (locs.length < 20) fail(`${locs.length} <loc> entries, wanted at least 20`)
      const off = locs.filter((u) => u !== CANONICAL_ORIGIN && !u.startsWith(`${CANONICAL_ORIGIN}/`))
      if (off.length) fail(`${off.length} <loc> entries do not start with ${CANONICAL_ORIGIN}, first: ${off[0]}`)
      return `200, ${locs.length} URLs, all under ${CANONICAL_ORIGIN}`
    },
  },
  {
    name: '/robots.txt',
    async run() {
      const res = await get('/robots.txt')
      expectStatus(res, 200)
      const lines = res.text.split(/\r?\n/).map((l) => l.trim())
      const bareDisallow = lines.some((l) => /^disallow:\s*\/$/i.test(l))
      if (smokeEnv === 'preview') {
        if (!bareDisallow) fail('preview robots.txt has no "Disallow: /" line')
        return 'preview blocks all crawlers'
      }
      const sitemap = `Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`
      if (!lines.includes(sitemap)) fail(`missing "${sitemap}"`)
      if (bareDisallow) fail('production robots.txt contains a bare "Disallow: /" line')
      return 'has the Sitemap line and no bare "Disallow: /"'
    },
  },
  {
    name: '/llms.txt',
    async run() {
      const res = await get('/llms.txt')
      expectStatus(res, 200)
      if (res.bytes >= 5 * 1024) fail(`${res.bytes} bytes, wanted under 5120`)
      return `200, ${res.bytes} bytes`
    },
  },
  {
    name: '/manifest.webmanifest',
    async run() {
      const res = await get('/manifest.webmanifest')
      expectStatus(res, 200)
      let json
      try {
        json = JSON.parse(res.text)
      } catch (err) {
        fail(`not valid JSON: ${err.message}`)
      }
      if (typeof json?.name !== 'string' || !json.name.trim()) fail('manifest has no name')
      return `200, name "${json.name}"`
    },
  },
  {
    name: '/opengraph-image',
    async run() {
      const res = await get('/opengraph-image')
      expectStatus(res, 200)
      if (!res.contentType.startsWith('image/png')) fail(`content type "${res.contentType}", wanted image/png`)
      return `200, image/png, ${res.bytes} bytes`
    },
  },
  {
    name: '/api/health',
    async run() {
      const res = await get('/api/health')
      if (res.status === 404) throw new Skip('arrives in Batch 7')
      expectStatus(res, 200)
      let json
      try {
        json = JSON.parse(res.text)
      } catch (err) {
        fail(`not valid JSON: ${err.message}`)
      }
      if (json?.ok !== true) fail(`ok is ${JSON.stringify(json?.ok)}, wanted true`)
      return '200, ok true'
    },
  },
]

const results = []
console.log(`Smoke tests: ${base.origin} (${smokeEnv})${bypass ? ', bypass header set' : ''}`)
for (const check of checks) {
  let status
  let detail
  try {
    detail = await check.run()
    status = 'PASS'
  } catch (err) {
    if (err instanceof Skip) {
      status = 'SKIP'
      detail = err.message
    } else {
      status = 'FAIL'
      const cause = err?.cause?.code || err?.cause?.message
      detail =
        err?.name === 'TimeoutError'
          ? `no answer within ${TIMEOUT_MS / 1000}s`
          : `${err?.message || String(err)}${cause ? ` (${cause})` : ''}`
    }
  }
  results.push({ name: check.name, status, detail })
  console.log(`${status}  ${check.name}  ${detail}`)
}

const count = (s) => results.filter((r) => r.status === s).length
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
const table = [
  `### Smoke tests: ${base.origin} (${smokeEnv})`,
  '',
  `${count('PASS')} passed, ${count('FAIL')} failed, ${count('SKIP')} skipped`,
  '',
  '| Check | Result | Detail |',
  '| --- | --- | --- |',
  ...results.map((r) => `| \`${r.name}\` | ${r.status} | ${cell(r.detail)} |`),
  '',
].join('\n')

console.log(`\n${table}`)
if (process.env.GITHUB_STEP_SUMMARY) {
  try {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${table}\n`)
  } catch (err) {
    console.error(`Could not write the step summary: ${err.message}`)
  }
}

process.exit(count('FAIL') > 0 ? 1 : 0)
