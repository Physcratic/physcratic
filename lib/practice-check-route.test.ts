import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { createPracticeCheckRoute, practiceChecksEnabled } from './practice-check-route';

test('practice persistence requires an exact explicit server flag', () => {
  for (const flag of [undefined, '', 'false', '1', 'TRUE', ' true ']) {
    assert.equal(practiceChecksEnabled({ PRACTICE_CHECKS_ENABLED: flag }), false);
  }
  assert.equal(practiceChecksEnabled({ NEXT_PUBLIC_PRACTICE_CHECKS_ENABLED: 'true' }), false);
  assert.equal(practiceChecksEnabled({ NODE_ENV: 'production', PRACTICE_CHECKS_ENABLED: 'true' }), true);
});

test('disabled practice routes reject before loading any database/session bindings and ignore client switches', async () => {
  let loads = 0;
  const route = createPracticeCheckRoute(() => practiceChecksEnabled({}), async () => {
    loads++;
    throw new Error('PRIVATE_BINDING_SENTINEL');
  });
  for (const action of ['submit', 'history', 'progress'] as const) {
    const response = await route(action, new Request('https://physcratic.test/api?PRACTICE_CHECKS_ENABLED=true&enabled=true', {
      method: action === 'submit' ? 'POST' : 'GET',
      headers: { 'PRACTICE_CHECKS_ENABLED': 'true', 'X-Practice-Checks-Enabled': 'true', cookie: 'PRACTICE_CHECKS_ENABLED=true', 'X-Practice-Account': 'victim' },
    }));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'Saved practice checks are disabled.', ...(action === 'submit' ? { saveState: 'unconfirmed' } : {}) });
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('vary'), 'Cookie, X-Practice-Account');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
  assert.equal(loads, 0);
});

test('enabled practice route delegates unchanged and safely handles a binding failure', async () => {
  const request = new Request('https://physcratic.test/api');
  const expected = Response.json({ synthetic: true });
  const route = createPracticeCheckRoute(() => practiceChecksEnabled({ PRACTICE_CHECKS_ENABLED: 'true' }), async () => ({
    practiceCheckApi: async (action, actual) => {
      assert.equal(action, 'history');
      assert.equal(actual, request);
      return expected;
    },
  }));
  assert.equal(await route('history', request), expected);
  const failed = createPracticeCheckRoute(() => true, async () => { throw new Error('PRIVATE_BINDING_SENTINEL'); });
  const response = await failed('submit', request);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Saved practice checks are temporarily unavailable.', saveState: 'unconfirmed' });
});

test('actual disabled endpoint exports never import database/session/server bindings in a fresh process', () => {
  const script = `
    const assert = require('node:assert/strict');
    const Module = require('node:module');
    const original = Module._load;
    Module._load = function (id, ...args) {
      if (/practice-check-server|submission-server/.test(id) || /(?:^|[\\/])lib[\\/](?:db|auth)(?:[\\/.]|$)/.test(id)) throw Error('Disabled route imported a private binding: ' + id);
      return original.call(this, id, ...args);
    };
    delete process.env.PRACTICE_CHECKS_ENABLED;
    const checks = require('./app/api/practice-checks/route.ts');
    const progress = require('./app/api/practice-progress/route.ts');
    (async () => {
      for (const handler of [checks.GET, checks.POST, progress.GET]) {
        const response = await handler(new Request('https://physcratic.test/api?enabled=true', {headers:{cookie:'PRACTICE_CHECKS_ENABLED=true','PRACTICE_CHECKS_ENABLED':'true'}}));
        assert.equal(response.status,503);
        assert.equal((await response.json()).error,'Saved practice checks are disabled.');
      }
    })().catch(error => { console.error(error); process.exitCode=1; });
  `;
  execFileSync(process.execPath, ['--require', './tests/server-only-register.cjs', '--import', 'tsx', '-e', script], {
    cwd: process.cwd(), encoding: 'utf8', env: { PATH: process.env.PATH, NODE_ENV: 'test', DATABASE_URL: 'postgresql://local:local@127.0.0.1:1/unavailable' },
  });
});
