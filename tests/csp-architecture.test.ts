import assert from 'node:assert/strict';
import test from 'node:test';
import { digest, hashPolicy, inlineScripts, nonceMiddleware, staticHeaderProposal,publicArtifact,verifyArtifact,verifyStaticResponse } from '../scripts/csp/policy-artifact.mjs';
import { AttributionBudget, attribution, routeTemplate } from '../scripts/csp/attribution.mjs';
import { providerReadiness } from '../scripts/csp/providers.mjs';

test('static CSP hashes exact trusted executable text, excluding external scripts and data blocks', () => {
  const html = '<script>hello\r\nworld</script><script src="/safe.js"></script><script type="application/ld+json">{"x":1}</script>';
  assert.deepEqual(inlineScripts(html), ['hello\nworld']);
  const policy = hashPolicy([digest('hello\nworld')]);
  assert.ok(policy.includes(`'sha256-${digest('hello\nworld')}'`));
  assert.ok(!policy.split(';')[1].includes('unsafe-inline'));
  assert.ok(!policy.includes('unsafe-eval'));
  assert.notEqual(digest('hello'), digest('hello '));
  assert.throws(() => inlineScripts('<script>missing end'));
  const proposal = staticHeaderProposal({ routes: { '/learn': { policy } } });
  assert.equal(proposal[0].src, '^/learn/?$');
  assert.equal(proposal[0].continue, true);
});

test('attribution strips private routes, query tokens, raw samples, remote sources and identities', () => {
  const context = { origin: 'https://local.example', build: 'abcdef1234', sources: new Map([['/_next/static/chunks/a.js', 'a:' + '1'.repeat(24)]]) };
  const event = { documentURL: 'https://local.example/u/private-person?token=secret', sourceFile: 'https://local.example/_next/static/chunks/a.js?token=secret', sample: 'private content', userId: 'private-user', effectiveDirective: 'script-src', blockedURI: 'https://private.example/secret', disposition: 'report', lineNumber: 1, columnNumber: 2 };
  const result = attribution(event, context);
  assert.equal(result.route, '/u/:handle');
  assert.equal(result.source, 'a:' + '1'.repeat(24));
  assert.ok(!/private|secret|token|https:/.test(JSON.stringify(result)));
  assert.equal(attribution({ ...event, sourceFile: 'https://elsewhere.example/_next/static/chunks/a.js' }, context).source, 'unknown');
  assert.equal(routeTemplate('https://local.example/dashboard/authored/secret?token=x', context.origin), '/dashboard/:workspace/:id');
});

test('aggregation has a fixed cardinality, event budget and expiry, without user/IP keys', () => {
  let now = 0;
  const budget = new AttributionBudget({ origin: 'https://local.example', build: 'abcdef1', sources: new Map() }, () => now);
  for (let i = 0; i < 1500; i++) budget.add({ lineNumber: i });
  assert.equal(budget.snapshot().counts.length, 256);
  assert.ok(budget.snapshot().dropped > 0);
  now = 300000; assert.equal(budget.snapshot().counts.length, 0); budget.add({});
  assert.equal(budget.snapshot().counts.length, 1);
  assert.equal(budget.snapshot().received, 1);
});

test('provider preflight fails closed and never claims mocked or configured services verified', () => {
  assert.ok(Object.values(providerReadiness({})).every(item => item.state === 'BLOCKED'));
  const result = providerReadiness({ X3C_PROVIDER_ORIGIN: 'https://physcratic.com', X3C_DISPOSABLE_RESOURCES_ACK: 'reviewed-disposable-only', X3C_VERCEL_PROJECT_ID: 'prj_phm4794zl2QBICu5MMbLFxcHAfFq', X3C_AUTH_DATABASE_URL: 'postgresql://user:secret@remote.example/db' });
  assert.ok(Object.values(result).every(item => item.blockers.includes('PRODUCTION_PROJECT_REJECTED')));
  assert.ok(!JSON.stringify(result).includes('secret'));
  const configured = providerReadiness({ X3C_PROVIDER_ORIGIN: 'https://disposable.example', X3C_DISPOSABLE_RESOURCES_ACK: 'reviewed-disposable-only', X3C_PROVIDER_EGRESS_ACK: 'reviewed-provider-egress',
    X3C_AUTH_DATABASE_URL: 'postgresql://local:local@127.0.0.1:1234/physcratic_authoring_test', X3C_AUTH_SECRET: 'synthetic', X3C_RECAPTCHA_SITE_KEY: 'synthetic', X3C_RECAPTCHA_SECRET_KEY: 'synthetic', X3C_RECAPTCHA_ALLOWED_HOSTNAME: 'disposable.example',
    X3C_RESEND_API_KEY: 'synthetic', X3C_RESEND_EMAIL_DOMAIN: 'mail.example', X3C_MAIL_RECIPIENT: 'fixture@example.invalid', X3C_BLOB_READ_WRITE_TOKEN: 'synthetic', X3C_BLOB_STORE_ISOLATION_ACK: 'distinct-disposable-private-store', X3C_VERCEL_PROJECT_ID: 'synthetic-project', X3C_ANALYTICS_READ_ACCESS_ACK: 'disposable-project-read-access' });
  assert.ok(Object.values(configured).every(item => item.state === 'PREPARED_NOT_VERIFIED'));
});

test('nonce prototype uses scoped middleware without reading headers in the root layout', () => {
  const source = nonceMiddleware(digest('fixed theme'));
  assert.ok(source.includes('crypto.getRandomValues'));
  assert.ok(source.includes('/dashboard/authored/:path*'));
  assert.ok(!source.includes('/learn'));
  assert.ok(!source.includes('unsafe-eval'));
});

test('trusted static artifacts reject stale builds and mismatched bytes, never hash private documents',async()=>{
 const {mkdtemp,mkdir,writeFile,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path');
 const root=await mkdtemp(join(tmpdir(),'csp-artifact-'));
 try{
  await mkdir(join(root,'.next/server/app'),{recursive:true});
  await writeFile(join(root,'.next/BUILD_ID'),'synthetic-build');
  await writeFile(join(root,'.next/prerender-manifest.json'),JSON.stringify({routes:{'/learn':{},'/terms':{},'/_not-found':{},'/settings':{},'/admin/moderation':{},'/':{}}}));
  const html='<script>localStorage; colorScheme;</script><script>trusted framework</script>';
  for(const name of ['learn','terms','_not-found'])await writeFile(join(root,'.next/server/app/'+name+'.html'),html);
  const a=await publicArtifact(root);
  assert.deepEqual(Object.keys(a.routes),['/learn','/terms','/_not-found']);
  await verifyArtifact(root,a);
  await assert.rejects(verifyArtifact(root,{...a,buildId:'old-build'}),/mismatch/);
  verifyStaticResponse(a.routes['/_not-found'],404,html);
  assert.throws(()=>verifyStaticResponse(a.routes['/_not-found'],200,html),/status mismatch/);
  assert.throws(()=>verifyStaticResponse(a.routes['/learn'],200,html+' '),/build mismatch/);
  assert.throws(()=>verifyStaticResponse({...a.routes['/learn'],hashes:[digest('other build')]},200,html),/hashes\/build mismatch/);
  await writeFile(join(root,'.next/server/app/learn.html'),html+'<script>new framework</script>');
  await assert.rejects(verifyArtifact(root,a),/differs from trusted build/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('synthetic document gates cannot be activated outside their detached fixture',async()=>{
 const {documentFixtureEnvironment}=await import('../scripts/csp/document-fixtures.mjs');
 await assert.rejects(documentFixtureEnvironment(process.cwd()),/Only detached/);
 const source=nonceMiddleware(digest('theme'),['/dashboard/contests/manage']);
 assert.ok(source.includes('["/dashboard/contests/manage"].includes(request.nextUrl.pathname)'));
});
