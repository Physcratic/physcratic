// Test-only reverse proxy: applies the unchanged policy as an enforcing header
// to a LOCAL production build. Never imported by the deployed application.
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { buildCsp } from '../../lib/security/csp.ts';
import { childEnvironment, localOrigin, safeViolation } from './support.mjs';
import { codecPdf } from './fixtures.mjs';
import { collectionFixture } from './collection-fixture.mjs';
import { verifyStaticResponse,decodeStaticBody } from './policy-artifact.mjs';
import { documentFixtureEnvironment } from './document-fixtures.mjs';
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('tsx'))('esbuild');
const dashboard = { user: null, savedAttempts: 0, practiceAttempts: 0, solvedProblems: 0, archiveReviewed: 0, ratings: [], contests: [] };

export async function cleanRoot(root) {
  const names = await readdir(root);
  assert.ok(!names.some(name => name.startsWith('.env') || name === '.vercel'), 'Use a clean worktree without dotenv or Vercel configuration');
}
async function listen(server) {
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  return server.address().port;
}
export async function productionBuild(root = process.cwd()) {
  await cleanRoot(root);
  await mkdir(resolve(root, 'build/csp'), { recursive: true });
  const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], { cwd: root, env: childEnvironment(root), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; child.stdout.on('data', b => { log += b; }); child.stderr.on('data', b => { log += b; });
  const [code] = await once(child, 'exit');
  await writeFile(resolve(root, 'build/csp/production-build.log'), log);
  assert.equal(code, 0, log.slice(-5000));
  return log;
}

export async function startLocal(mode, root = process.cwd(), options = {}) {
  assert.ok(['report', 'enforce', 'native'].includes(mode));
  await cleanRoot(root);
  // Reserve a loopback port. Next binds only to loopback, never 0.0.0.0.
  const reservation = createServer(); const upstreamPort = await listen(reservation);
  await new Promise(resolve => reservation.close(resolve));
  const fixtureEnv = options.documentFixtures ? await documentFixtureEnvironment(root) : {};
  const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(upstreamPort)], { cwd: root, env: {...childEnvironment(root, upstreamPort), ...fixtureEnv}, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; child.stdout.on('data', b => { log = (log + b).slice(-100000); }); child.stderr.on('data', b => { log = (log + b).slice(-100000); });
  try {
    for (let i = 0; ; i++) {
      assert.ok(child.exitCode === null, log);
      try { if ((await fetch(`http://127.0.0.1:${upstreamPort}/api/health`)).ok) break; } catch { /* wait for bind */ }
      assert.ok(i < 100, 'Local Next failed to start: ' + log);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const bundle = await build({ stdin: { contents: `
      import {z} from 'zod';
      import {util} from 'zod/v4/core';
      import {getSignupCaptchaToken} from './lib/signup-captcha-client';
      if(new URLSearchParams(location.search).has('jitless')) z.config({jitless:true});
      const schema=z.object({value:z.number()});
      window.runZod=()=>({valid:schema.parse({value:4}).value,invalid:schema.safeParse({value:'bad'}).success});
      window.zodCapability=()=>util.allowsEval.value;
      window.runCaptcha=getSignupCaptchaToken;
    `, resolveDir: root }, bundle: true, write: false, platform: 'browser', format: 'iife', define: { 'process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY': '"synthetic-local-fixture"' } });
    const reports = [], analytics = [];
    const allowedAssets = (await readdir(resolve(root, '.next/static'), { recursive: true })).filter(name => /\.m?js$/.test(name)).map(name => '/_next/static/' + name);
    const worker = allowedAssets.find(name => name.includes('/pdf.worker.min.'));
    assert.ok(worker, 'Production PDF worker must be present');
    const codec = await build({ stdin: { contents: `
      import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
      pdfjs.GlobalWorkerOptions.workerSrc=${JSON.stringify(worker)};
      window.runPdfCodec=async()=>{
        const data=Uint8Array.from(atob('${codecPdf().toString('base64')}'),c=>c.charCodeAt(0));
        const task=pdfjs.getDocument({data,wasmUrl:'/__csp/wasm/'});
        const doc=await task.promise,page=await doc.getPage(1);
        const canvas=document.createElement('canvas'),viewport=page.getViewport({scale:1});
        canvas.width=viewport.width;canvas.height=viewport.height;
        await page.render({canvas,viewport}).promise;
        const pixel=Array.from(canvas.getContext('2d').getImageData(10,10,1,1).data);
        await task.destroy();return pixel;
      };
    `, resolveDir: root }, bundle: true, write: false, platform: 'browser', format: 'iife', logLevel: 'silent' });
    const policy = buildCsp();
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const headers = mode === 'enforce' ? { 'Content-Security-Policy': policy } : { 'Content-Security-Policy-Report-Only': policy };
      const send = (type, body, status = 200, extra = {}) => { res.writeHead(status, { ...headers, 'Content-Type': type, 'Cache-Control': 'no-store', ...extra }); res.end(body); };
      if (url.pathname === '/__csp/fixture') return send('text/html', '<!doctype html><title>Local CSP fixtures</title><script src="/__csp/zod.js"></script>');
      if (url.pathname === '/__csp/pdf-fixture') return send('text/html', '<!doctype html><title>Local PDF codec fixture</title><script src="/__csp/pdf-codec.js"></script>');
      if (url.pathname === '/__csp/pdf-codec.js') return send('application/javascript', codec.outputFiles[0].text);
      if (['/__csp/wasm/openjpeg.wasm', '/__csp/wasm/openjpeg_nowasm_fallback.js'].includes(url.pathname)) {
        const data = await (await import('node:fs/promises')).readFile(resolve(root, 'node_modules/pdfjs-dist/wasm', url.pathname.split('/').at(-1)));
        return send(url.pathname.endsWith('.wasm') ? 'application/wasm' : 'application/javascript', data);
      }
      if (url.pathname === '/__csp/zod.js') return send('application/javascript', bundle.outputFiles[0].text);
      if (url.pathname === '/__csp/worker.js') return send('application/javascript', `WebAssembly.compile(new Uint8Array([0,97,115,109,1,0,0,0])).then(()=>postMessage('wasm-ok')).catch(()=>postMessage('wasm-blocked-fallback'));`);
      if (url.pathname === '/__csp/private') return send('application/pdf', 'synthetic attachment', 200, { 'Content-Security-Policy': "sandbox; default-src 'none'", 'Content-Disposition': 'attachment; filename=fixture.pdf' });
      if (url.pathname === '/_vercel/insights/script.js') return send('application/javascript', `window.__analyticsLoaded=true;fetch('/__csp/analytics',{method:'POST',body:'synthetic-event'});`);
      if (url.pathname === '/__csp/analytics') { analytics.push(true); return send('text/plain', '', 204); }
      if (url.pathname === '/api/csp-report') {
        // Bound diagnostic memory independently of the real bounded collector.
        let body = '', bytes = 0;
        for await (const b of req) { bytes += b.length; if (bytes <= 8192) body += b; }
        if (bytes <= 8192) {
          try {
            const report = JSON.parse(body)['csp-report'];
            if (report && reports.length < 100) reports.push(safeViolation({ effectiveDirective: report['effective-directive'], blockedURI: report['blocked-uri'], sourceFile: report['source-file'], lineNumber: report['line-number'], columnNumber: report['column-number'], disposition: report.disposition }, allowedAssets));
          } catch { /* invalid diagnostic report */ }
        }
        // Deliver to the REAL local collector too, without reusing a consumed stream.
        const upstream = await fetch(`http://127.0.0.1:${upstreamPort}/api/csp-report`, { method: 'POST', headers: { 'content-type': req.headers['content-type'] || '' }, body: bytes <= 8192 ? body : '' });
        return send('text/plain', '', upstream.status);
      }
      if (url.pathname.startsWith('/api/')) {
        if (url.pathname === '/api/arena/collection') return send('application/json', JSON.stringify(collectionFixture(url.searchParams)));
        if (url.pathname === '/api/auth/get-session') {
          const state=options.documentFixtures && req.headers['x-csp-document-fixture'];
          if(state==='error')return send('application/json','{"error":"Synthetic session failure"}',503);
          const session=state&&state!=='anonymous'?{user:{id:'synthetic-csp-user',name:'Synthetic CSP user',email:'csp@example.invalid',emailVerified:state!=='unverified',createdAt:new Date(0),updatedAt:new Date(0)},session:{id:'synthetic-session',token:'synthetic',userId:'synthetic-csp-user',expiresAt:new Date('2099-01-01'),createdAt:new Date(0),updatedAt:new Date(0)}}:null;
          return send('application/json', JSON.stringify(session));
        }
        if (url.pathname === '/api/dashboard') return send('application/json', JSON.stringify(dashboard));
        if (url.pathname === '/api/rankings') return send('application/json', '{"rankings":[]}');
        if (url.pathname === '/api/authored-problems/library') return send('application/json', '{"problems":[],"nextCursor":null}');
        return send('application/json', '{"error":"Local fixture: service unavailable"}', 503);
      }
      if (!['GET', 'HEAD'].includes(req.method)) return send('text/plain', 'Local writes denied', 405);
      const upstream = request({ hostname: '127.0.0.1', port: upstreamPort, path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${upstreamPort}` } }, response => {
        const result = { ...response.headers };
        // Trusted, build-bound policies supplied only by isolated experiments.
        // Intersect with a route's existing stricter policy; never replace it.
        const html = String(response.headers['content-type'] || '').startsWith('text/html');
        const staticDocument = html && (options.staticArtifact?.routes[url.pathname] ||
          (response.statusCode === 404 && !result['content-security-policy'] ? options.staticArtifact?.routes['/_not-found'] : undefined));
        if (mode === 'enforce') {
          // Intersection, never replacement, of existing restrictive media CSP.
          result['content-security-policy'] = result['content-security-policy'] ? `${result['content-security-policy']}, ${policy}` : policy;
          delete result['content-security-policy-report-only'];
        }
        if (staticDocument) {
          // Local test assertion, not a publication adapter. Never hash a
          // response to make it pass: only exact trusted build bytes qualify.
          const chunks = []; let bytes = 0;
          response.on('data', chunk => { bytes += chunk.length; if (bytes > 4 * 1024 * 1024) response.destroy(new Error('Static fixture too large')); else chunks.push(chunk); });
          response.on('end', () => {
            try {
              const body = Buffer.concat(chunks);
              verifyStaticResponse(staticDocument, response.statusCode, decodeStaticBody(body,response.headers['content-encoding']));
              result['content-security-policy'] = result['content-security-policy'] ? `${result['content-security-policy']}, ${staticDocument.policy}` : staticDocument.policy;
              res.writeHead(response.statusCode, result); res.end(body);
            } catch { res.writeHead(502, {'Content-Type':'text/plain','Cache-Control':'no-store'}); res.end('Trusted static document mismatch'); }
          });
          response.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
        } else { res.writeHead(response.statusCode, result); response.pipe(res); }
      });
      upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
      req.pipe(upstream);
    });
    const port = await listen(server), origin = localOrigin(`http://127.0.0.1:${port}`);
    return { origin, reports, analytics, allowedAssets, processId: child.pid, log: () => log, close: async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); child.kill('SIGTERM'); await once(child, 'exit'); } };
  } catch (error) { child.kill(); throw error; }
}
if (process.argv[2] === '--build') console.log((await productionBuild()).slice(-2000));
