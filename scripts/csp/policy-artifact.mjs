// Local experimental tooling only. Never imported by application/middleware.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {gunzipSync,inflateSync,brotliDecompressSync} from 'node:zlib';
import { buildCsp } from '../../lib/security/csp.ts';
export const NONCE_MATCHERS = ['/', '/dashboard','/dashboard/author','/dashboard/authored/:path*','/dashboard/submissions','/dashboard/contests/:path*','/sign-in','/sign-up','/u/:path*','/coaching',
  '/settings', '/admin/moderation', '/admin/verification', '/forgot-password', '/reset-password', '/email-change'];
export const digest = text => createHash('sha256').update(text).digest('base64');

export function inlineScripts(html) {
  // Trusted Next-generated build HTML, not a sanitizer for arbitrary HTML.
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  assert.equal(scripts.length, (html.match(/<script\b/gi) || []).length, 'Unsupported script markup');
  return scripts.filter(([, attrs]) => !/\bsrc\s*=/i.test(attrs) && !/\btype\s*=\s*["']application\/ld\+json["']/i.test(attrs))
    .map(([, , body]) => body.replace(/\r\n?/g, '\n')).filter(Boolean);
}
export function hashPolicy(hashes) {
  assert.ok(hashes.length > 0 && hashes.every(hash => /^[A-Za-z0-9+/]{43}=$/.test(hash)));
  return buildCsp().replace("'unsafe-inline'", [...new Set(hashes)].map(hash => `'sha256-${hash}'`).join(' '));
}
export async function publicArtifact(root) {
  const buildId = (await readFile(resolve(root, '.next/BUILD_ID'), 'utf8')).trim();
  const manifest = JSON.parse(await readFile(resolve(root, '.next/prerender-manifest.json'), 'utf8'));
  const routes = /** @type {Record<string,{htmlDigest:string,hashes:string[],policy:string,htmlBytes:number,status:number}>} */ ({});
  for (const route of Object.keys(manifest.routes)) {
    if (route.endsWith('/opengraph-image')) continue; // metadata handler, not HTML
    // Explicitly reviewed public build artifacts only. New pages still fail the
    // inventory until reviewed here or in the scoped nonce matcher above.
    if (!/^\/(?:_not-found|learn(?:\/[a-z0-9-]+)?|terms|coaching\/(?:consultation|become-a-tutor)|problems(?:\/archive|\/topics\/[a-z0-9-]+)?|dashboard\/problems\/[a-z0-9-]+|dashboard\/contests\/manage)$/.test(route)) continue;
    const html = await readFile(resolve(root, '.next/server/app', route.slice(1) + '.html'), 'utf8');
    const scripts = inlineScripts(html), hashes = [...new Set(scripts.map(digest))];
    routes[route] = { htmlDigest: digest(html), hashes, policy: hashPolicy(hashes), htmlBytes: Buffer.byteLength(html), status: route === '/_not-found' ? 404 : 200 };
  }
  assert.ok(routes['/learn'] && routes['/terms'], 'Expected cached public pages');
  // next-themes' invariant bootstrap is the only non-framework executable
  // inline script. Framework scripts get request nonces on dynamic routes.
  const themes = inlineScripts(await readFile(resolve(root, '.next/server/app/learn.html'), 'utf8')).filter(text => text.includes('localStorage') && text.includes('colorScheme'));
  assert.equal(themes.length, 1, 'Review changed theme bootstrap before using hashes');
  const themeHash = digest(themes[0]);
  assert.ok(Object.values(routes).every(route => route.hashes.includes(themeHash)), 'Theme must be invariant on public routes');
  return { version: 1, buildId, themeHash, routes };
}
export async function verifyArtifact(root, artifact) {
  assert.equal(artifact.buildId, (await readFile(resolve(root, '.next/BUILD_ID'), 'utf8')).trim(), 'Build/manifest mismatch');
  const actual = await publicArtifact(root);
  assert.deepEqual(artifact, actual, 'Hash manifest differs from trusted build output');
}
export function verifyStaticResponse(data, status, html) {
  assert.equal(status, data.status, 'Static document status mismatch');
  assert.equal(digest(html), data.htmlDigest, 'Served HTML/build mismatch');
  assert.deepEqual([...new Set(inlineScripts(html).map(digest))], data.hashes, 'Served script hashes/build mismatch');
}
export function decodeStaticBody(bytes, encoding) {
  const decoders={gzip:gunzipSync,deflate:inflateSync,br:brotliDecompressSync};
  const decoder=decoders[encoding];
  assert.ok(decoder||!encoding||encoding==='identity','Unsupported static content encoding');
  return (decoder?decoder(bytes,{maxOutputLength:4*1024*1024}):bytes).toString('utf8');
}
export function staticHeaderProposal(artifact) {
  // Proposal fragment only. Never writes Vercel config or replaces adapter
  // output. A future adapter must preserve existing routing/cache semantics.
  return Object.entries(artifact.routes).map(([route, data]) => ({
    src: '^' + route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/?$',
    headers: { 'Content-Security-Policy': data.policy }, continue: true,
  }));
}

export function nonceMiddleware(themeHash, staticRoutes = []) {
  assert.match(themeHash, /^[A-Za-z0-9+/]{43}=$/);
  return `// ISOLATED EXPERIMENT ONLY. Never copy into the deployed app without review.
import { NextRequest, NextResponse } from 'next/server';
import { buildCsp } from './lib/security/csp';
export function middleware(request: NextRequest) {
 if(${JSON.stringify(staticRoutes)}.includes(request.nextUrl.pathname)) return NextResponse.next();
 const nonce=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
 const policy=buildCsp().replace("'unsafe-inline'", "'nonce-"+nonce+"' 'sha256-${themeHash}'");
 const headers=new Headers(request.headers);
 headers.set('Content-Security-Policy',policy);
 const response=NextResponse.next({request:{headers}});
 response.headers.set('Content-Security-Policy',policy);
 return response;
}
export const config={matcher:${JSON.stringify(NONCE_MATCHERS)}};
`;
}
