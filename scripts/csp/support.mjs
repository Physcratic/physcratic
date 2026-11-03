import assert from 'node:assert/strict';
import { resolve } from 'node:path';

export function localOrigin(value) {
  const url = new URL(value);
  assert.equal(url.protocol, 'http:');
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
  assert.equal(url.username + url.password + url.search + url.hash, '');
  assert.equal(url.pathname, '/');
  return url.origin;
}

export function childEnvironment(root, port = 1) {
  // Deliberately do not spread process.env. No dotenv, DB, Vercel, Blob, mail,
  // auth or proxy credentials can cross into the application under test.
  return {
    PATH: process.env.PATH,
    NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
    NODE_OPTIONS: `--require=${resolve(root, 'scripts/csp/network-guard.cjs')}`,
    DATABASE_URL: 'postgresql://local:local@127.0.0.1:1/csp_unavailable',
    BETTER_AUTH_SECRET: 'synthetic-csp-local-only-secret-000000000000000000',
    BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: 'synthetic-local-fixture-not-a-provider-key',
  };
}

const directives = new Set(['script-src', 'script-src-elem', 'script-src-attr', 'style-src', 'style-src-elem', 'style-src-attr', 'connect-src', 'worker-src', 'font-src', 'img-src', 'frame-src', 'object-src', 'base-uri', 'form-action', 'default-src']);
export function safeViolation(event, allowedAssets = []) {
  // Diagnostic proposal, NOT wired into the live collector. No arbitrary page
  // paths, blocked hostnames, script samples, stack strings or URL components.
  let asset = 'unknown';
  try {
    const path = new URL(event.sourceFile).pathname;
    if (allowedAssets.includes(path)) asset = path.slice(0, 160);
    if (['/__csp/zod.js', '/__csp/worker.js', '/__csp/pdf-codec.js'].includes(path)) asset = path;
  } catch { /* non-URL source */ }
  return {
    directive: directives.has(event.effectiveDirective) ? event.effectiveDirective : 'other',
    blocked: ['eval', 'wasm-eval', 'inline', 'data', 'blob'].includes(event.blockedURI) ? event.blockedURI : 'resource',
    disposition: event.disposition === 'enforce' ? 'enforce' : 'report', asset,
    line: Number.isInteger(event.lineNumber) && event.lineNumber >= 0 ? Math.min(event.lineNumber, 1000000) : 0,
    column: Number.isInteger(event.columnNumber) && event.columnNumber >= 0 ? Math.min(event.columnNumber, 1000000) : 0,
  };
}
