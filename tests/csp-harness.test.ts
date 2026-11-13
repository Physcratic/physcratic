import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { childEnvironment, localOrigin, safeViolation, browserSelection } from '../scripts/csp/support.mjs';
import { collectionFixture } from '../scripts/csp/collection-fixture.mjs';
import { evalAttribution } from '../scripts/csp/attribute.mjs';

test('an unrelated eval is not attributed to Zod just because Zod is loaded', () => {
  const event = { blocked: 'eval', asset: '/_next/static/chunks/x.js', line: 1, column: 1 };
  assert.equal(evalAttribution(event, 'eval("something")'), 'unexplained eval');
  assert.equal(evalAttribution(event, 'try{return Function(""),!0}catch(t){return!1}'), 'Zod allowsEval caught probe');
});

test('required qualification rejects metrics-only, scoped and duplicate engine selections', () => {
  assert.deepEqual(browserSelection({CSP_REQUIRE_ALL:'1'}), ['chromium','firefox','webkit']);
  assert.throws(() => browserSelection({CSP_REQUIRE_ALL:'1'}, {metricsOnly:true}), /metrics-only/);
  assert.throws(() => browserSelection({CSP_REQUIRE_ALL:'1',CSP_BROWSERS:'chromium'}), /all three engines/);
  assert.throws(() => browserSelection({CSP_REQUIRE_ALL:'1',CSP_BROWSERS:'chromium,chromium,chromium'}), /Duplicate/);
  assert.throws(() => browserSelection({CSP_BROWSERS:'unknown'}), /Unknown/);
  assert.deepEqual(browserSelection({CSP_BROWSERS:'webkit'}), ['webkit']);
  assert.deepEqual(browserSelection({}, {metricsOnly:true}), []);
});

test('CSP harness rejects remote, credentialed and decorated origins', () => {
  for (const value of ['https://physcratic.com', 'http://127.0.0.1.evil', 'http://user@localhost', 'http://localhost/?token=x', 'file:///tmp/x']) assert.throws(() => localOrigin(value));
  assert.equal(localOrigin('http://127.0.0.1:1234'), 'http://127.0.0.1:1234');
  const env = childEnvironment(process.cwd());
  assert.equal(env.DATABASE_URL, 'postgresql://local:local@127.0.0.1:1/csp_unavailable');
  assert.equal('RESEND_API_KEY' in env, false);
  assert.equal('VERCEL_ENV' in env, false);
});

test('diagnostic attribution excludes private paths, samples, identifiers and query strings', () => {
  const event = { effectiveDirective: 'script-src', blockedURI: 'https://private.example/token', sourceFile: 'https://local/_next/static/chunks/123.abc.js?token=secret', lineNumber: 1, columnNumber: 44, disposition: 'enforce' };
  assert.equal(safeViolation(event, ['/_next/static/chunks/123.abc.js']).asset, '/_next/static/chunks/123.abc.js');
  assert.equal(safeViolation(event).asset, 'unknown');
  assert.equal(safeViolation({ ...event, sourceFile: 'http://local/__csp/private-user-id.js' }).asset, 'unknown');
  const result = safeViolation({ ...event, sourceFile: 'https://local/dashboard/authored/private-user-id?token=secret', sample: 'private content' });
  assert.equal(result.asset, 'unknown');
  assert.equal(safeViolation({ ...event, blockedURI: 'https://blocked.invalid/disallowed.js' }).blocked, 'negative-control');
  assert.ok(!/private|secret|token|example/.test(JSON.stringify(result)));
});

test('server guard rejects remote sockets and fetch before connecting', () => {
  const child = spawnSync(process.execPath, ['--require', './scripts/csp/network-guard.cjs', '-e', `
    const assert=require('node:assert/strict');
    assert.throws(()=>require('node:net').connect(443,'physcratic.com'),/denied/);
    assert.throws(()=>new (require('node:net').Socket)().connect({port:443,host:'physcratic.com'}),/denied/);
    assert.throws(()=>fetch('https://physcratic.com'),/denied/);
  `], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
});


test('local CSP collection fixture follows unified Arena filters without enabling community providers',()=>{
 const page=collectionFixture(new URLSearchParams({q:'Mind the Gap'}));
 assert.equal(page.problems.length,1);assert.equal(page.problems[0].key,'arena:arena-mind-the-gap');
 assert.equal(page.statsEnabled,undefined);assert.equal(page.authoredUnavailable,true);assert.equal(page.nextCursor,null);
 assert.ok(page.problems.every(p=>p.kind==='arena'&&p.author===null));
 assert.deepEqual(collectionFixture(new URLSearchParams({source:'authored'})).problems,[]);
 assert.throws(()=>collectionFixture(new URLSearchParams({userId:'private-selector'})));
});
