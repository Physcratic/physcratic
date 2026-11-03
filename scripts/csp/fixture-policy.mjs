// Optional preload for EXISTING disposable authenticated browser fixtures.
// Never import this from the application. Sessions are injected by those tests;
// this does not claim to test Better Auth login or real storage credentials.
import assert from 'node:assert/strict';
import { Server } from 'node:http';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { buildCsp } from '../../lib/security/csp.ts';
for (const name of ['AUTHORING_TEST_DATABASE_URL', 'DATABASE_URL']) {
  const url = new URL(process.env[name] || 'http://invalid');
  assert.equal(url.hostname, '127.0.0.1', 'Disposable loopback database required');
  assert.equal(url.pathname, '/physcratic_authoring_test');
}
const emit = Server.prototype.emit;
Server.prototype.emit = function (event, ...args) {
  if (event === 'request') args[1].setHeader('Content-Security-Policy', buildCsp());
  return emit.call(this, event, ...args);
};
assert.ok(process.env.AUTHORING_BROWSER_TOOLS, 'External fixture browser tools required');
const { chromium } = createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, 'package.json'))('playwright');
const launch = chromium.launch.bind(chromium);
chromium.launch = async function (options) {
  const browser = await launch(options), newContext = browser.newContext.bind(browser);
  browser.newContext = async function (options) {
    const context = await newContext({ ...options, serviceWorkers: 'block' });
    const route = context.route.bind(context);
    context.route = (pattern, handler, options) => route(pattern, (request, ...args) => {
      const url = new URL(request.request().url());
      return url.protocol === 'http:' && url.hostname === '127.0.0.1' ? handler(request, ...args) : request.abort();
    }, options);
    await context.route('**/*', request => request.continue());
    return context;
  };
  return browser;
};
