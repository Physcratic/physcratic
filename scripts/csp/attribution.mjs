// Unused privacy/aggregation prototype. The deployed collector is unchanged.
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
export async function sourceRegistry(root) {
  const names = (await readdir(resolve(root, '.next/static'), { recursive: true })).filter(name => /\.m?js$/.test(name));
  if (names.length > 2048) throw Error('Public source registry budget exceeded');
  const sources = new Map(), identities = new Map();
  for (const name of names) {
    const full = createHash('sha256').update(await readFile(resolve(root, '.next/static', name))).digest('hex');
    const id = 'a:' + full.slice(0, 24);
    if (identities.has(id) && identities.get(id) !== full) throw Error('Source identity collision');
    identities.set(id, full); sources.set('/_next/static/' + name, id);
  }
  return sources;
}
const directives = new Set(['script-src', 'script-src-elem', 'script-src-attr', 'style-src', 'style-src-elem', 'style-src-attr', 'img-src', 'font-src', 'worker-src', 'connect-src', 'frame-src', 'object-src', 'base-uri', 'form-action']);
const categories = new Set(['eval', 'wasm-eval', 'inline', 'data', 'blob']);
function url(value, origin) {
  if (typeof value !== 'string' || value.length > 2048) return;
  try { const parsed = new URL(value, origin); if (parsed.origin === origin && !parsed.username && !parsed.password) return parsed; } catch { /* reject */ }
}
export function routeTemplate(value, origin) {
  const path = url(value, origin)?.pathname;
  if (!path) return 'other';
  const exact = ['/', '/dashboard', '/sign-in', '/sign-up', '/settings', '/learn', '/terms', '/coaching', '/coaching/consultation', '/coaching/become-a-tutor'];
  if (exact.includes(path)) return path;
  for (const [pattern, template] of [
    [/^\/learn\/[^/]+$/, '/learn/:slug'], [/^\/u\/[^/]+$/, '/u/:handle'],
    [/^\/dashboard\/problems\/[^/]+$/, '/dashboard/problems/:id'],
    [/^\/dashboard\/(author|authored)\/[^/]+$/, '/dashboard/:workspace/:id'],
    [/^\/api\/auth\/[^/]+(?:\/[^/]+)?$/, '/api/auth/:operation'],
    [/^\/api\/authored-problems(?:\/[^/]+)*$/, '/api/authored-problems/:resource'],
    [/^\/api\/solution-evidence(?:\/[^/]+)?$/, '/api/solution-evidence/:resource'],
  ]) if (pattern.test(path)) return template;
  return 'other';
}
export function attribution(event, { origin, build, sources }) {
  const source = url(event.sourceFile, origin);
  const sourceId = source ? sources.get(source.pathname) : undefined;
  const number = value => Number.isInteger(value) && value >= 0 ? Math.min(value, 1000000) : 0;
  return {
    build: /^[a-f0-9]{7,40}$/.test(build) ? build : 'unknown',
    route: routeTemplate(event.documentURL, origin),
    source: /^a:[a-f0-9]{24}$/.test(sourceId || '') ? sourceId : 'unknown',
    directive: directives.has(event.effectiveDirective) ? event.effectiveDirective : 'other',
    blocked: categories.has(event.blockedURI) ? event.blockedURI : 'resource',
    disposition: ['enforce', 'report'].includes(event.disposition) ? event.disposition : 'unknown',
    line: number(event.lineNumber), column: number(event.columnNumber),
  };
}
export class AttributionBudget {
  #window = -1;
  #counts = new Map();
  #received = 0;
  #dropped = 0;
  constructor(context, now = Date.now) { this.context = context; this.now = now; }
  #rotate() {
    const window = Math.floor(this.now() / 300000);
    if (window !== this.#window) { this.#window = window; this.#counts.clear(); this.#received = 0; this.#dropped = 0; }
  }
  add(event) {
    this.#rotate();
    this.#received = Math.min(this.#received + 1, 1000000);
    if (this.#received > 1000) { this.#dropped = Math.min(this.#dropped + 1, 1000000); return false; }
    const key = JSON.stringify(attribution(event, this.context));
    if (!this.#counts.has(key) && this.#counts.size === 256) { this.#dropped = Math.min(this.#dropped + 1, 1000000); return false; }
    this.#counts.set(key, (this.#counts.get(key) || 0) + 1);
    return true;
  }
  snapshot() { this.#rotate(); return { window: this.#window, received: this.#received, dropped: this.#dropped, counts: [...this.#counts].map(([key, count]) => ({ ...JSON.parse(key), count })) }; }
}
