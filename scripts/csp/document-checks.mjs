// Actual document/header/browser checks for the detached prototype.
import assert from 'node:assert/strict';
import {digest, inlineScripts} from './policy-artifact.mjs';
import {checkResponse} from './route-inventory.mjs';
import {safeViolation} from './support.mjs';
import {evalAttribution} from './attribute.mjs';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

export async function documentHeaders(local, artifact, inventory, enforced) {
  const results=[];
  for(const route of ['/', '/_not-found', '/x3e-missing-document', '/learn/x3e-missing-slug', '/settings', '/admin/moderation', '/admin/verification', '/forgot-password', '/reset-password', '/email-change']) {
    const nonces=[];
    for(let i=0;i<2;i++) {
      const response=await fetch(local.origin+route,{redirect:'manual'}), html=await response.text();
      checkResponse(inventory,route,{status:response.status,contentType:response.headers.get('content-type'),body:html},artifact);
      const notFound=route.includes('missing')||route==='/_not-found';
      assert.equal(response.status,notFound?404:200,route);
      const policy=response.headers.get('content-security-policy'),cache=response.headers.get('cache-control');
      if(route!=='/_not-found')assert.ok(cache.includes('no-store'),route+': private/dynamic error isolation');
      if(enforced) {
        assert.ok(policy && !policy.split(';')[1].includes('unsafe-inline'),route+': enforcing script policy');
        const nonce=policy.match(/'nonce-([^']+)'/)?.[1];
        if(!notFound){assert.match(nonce,/^[A-Za-z0-9+/]{32}$/);nonces.push(nonce);}
        else {assert.equal(nonce,undefined);assert.equal(digest(html),artifact.routes['/_not-found'].htmlDigest);}
        // Every executable inline body must be authorised by an actual nonce
        // attribute or an exact hash. A nonce header alone is insufficient.
        for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
          if(!inlineScripts(match[0]).length)continue;
          assert.ok((nonce&&match[1].includes(`nonce="${nonce}"`))||policy.includes(`'sha256-${digest(match[2])}'`),route+': inline script lacks matching nonce/hash');
        }
      } else assert.equal(policy,null);
      if(i===0)results.push({route,status:response.status,cacheControl:cache,strategy:enforced?(notFound?'verified build hashes':'fresh request nonce'):'report-only'});
    }
    if(enforced&&nonces.length)assert.notEqual(nonces[0],nonces[1],'Nonce reused: '+route);
  }
  const redirect=await fetch(local.origin+'/settings/',{redirect:'manual'});
  assert.equal(checkResponse(inventory,'/settings/',{status:redirect.status,location:redirect.headers.get('location')}),'redirect');
  assert.equal(new URL(redirect.headers.get('location'),local.origin).pathname,'/settings');
  results.push({route:'/settings/',status:redirect.status,strategy:'redirect, destination tested separately'});
  return results;
}

export async function documentBrowsers({browser,name,local,root,artifact,inventory,enforced,fixtures=false}) {
  const results=[];
  const cases=fixtures?[
    ['/', 'member', 'Recommended problem'], ['/', 'error', null],
    ['/settings','member','Account Settings'], ['/settings','unverified','Account Settings'],
    ['/admin/moderation','anonymous','Sign in with an authorized staff account.'],
    ['/admin/moderation','unverified','Current moderator or admin permission is required.'],
    ['/admin/moderation','member','Moderation review is temporarily unavailable.'],
    ['/admin/verification','anonymous','Sign in with an authorized admin account.'],
    ['/admin/verification','unverified','Admin permission is required.'],
    ['/admin/verification','member','Verification review is temporarily unavailable.'],
  ]:[['/',null,null],['/_not-found',null,'Page not found'],['/x3e-missing-document',null,'Page not found'],
    ['/learn/x3e-missing-slug',null,'Page not found'],['/settings',null,'Account Settings'],
    ['/admin/moderation',null,'Moderation review is not available yet.'],['/admin/verification',null,'Verification review is not available yet.']];
  for(const [route,state,expected] of cases) {
    const context=await browser.newContext({serviceWorkers:'block',extraHTTPHeaders:state?{'x-csp-document-fixture':state,cookie:'better-auth.session_token=synthetic-document-fixture'}:{}});
    try{
      await context.route('**/*',r=>new URL(r.request().url()).origin===local.origin?r.continue():r.abort());
      await context.addInitScript(()=>{
        localStorage.setItem('theme','dark');window.__documentViolations=[];
        document.addEventListener('securitypolicyviolation',e=>window.__documentViolations.push({effectiveDirective:e.effectiveDirective,blockedURI:e.blockedURI,sourceFile:e.sourceFile,lineNumber:e.lineNumber,columnNumber:e.columnNumber,disposition:e.disposition}));
      });
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      const response=await page.goto(local.origin+route,{waitUntil:'networkidle'}),html=await response.text();
      checkResponse(inventory,route,{status:response.status(),contentType:response.headers()['content-type'],body:html},artifact);
      if(expected)await page.getByText(expected,{exact:true}).first().waitFor();
      assert.ok(await page.locator('h1:visible').count(),'Document heading did not render');
      assert.equal(await page.locator('html').evaluate(e=>e.classList.contains('dark')),true,'Theme bootstrap did not execute');
      if(route==='/settings'&&state==='member')await page.getByText('csp@example.invalid',{exact:true}).first().waitFor();
      if(route==='/settings'){
        // A real React control proves hydration, beyond server-rendered text.
        await page.getByRole('radio',{name:'Light',exact:true}).check();
        assert.equal(await page.locator('html').evaluate(e=>e.classList.contains('light')),true);
      }
      if(route.startsWith('/admin/')||route.includes('missing')||route==='/_not-found'){
        await page.locator('a[href="/dashboard"]').first().click();
        await page.waitForURL('**/dashboard');
        await page.getByRole('heading',{name:'Recommended problem',exact:true}).waitFor();
      }
      const before=await page.evaluate(()=>window.__documentViolations);
      for(const raw of before){
        assert.equal(raw.blockedURI,'eval','Unexpected violation before negative control: '+route);
        const e=safeViolation(raw,local.allowedAssets);
        const source=local.allowedAssets.includes(e.asset)?await readFile(resolve(root,'.next',e.asset.slice('/_next/'.length)),'utf8'):'';
        assert.notEqual(evalAttribution(e,source),'unexplained eval');
      }
      await page.evaluate(()=>{const s=document.createElement('script');s.textContent='window.__documentInjected=true';document.head.appendChild(s);});
      await page.waitForTimeout(100);
      assert.equal(Boolean(await page.evaluate(()=>window.__documentInjected)),!enforced);
      if(enforced)assert.ok((await page.evaluate(()=>window.__documentViolations)).some(e=>e.blockedURI==='inline'));
      assert.deepEqual(errors,[],'Document browser errors: '+route);
      results.push({browser:name,route,state:state||'gates off',status:'PASS',negativeInlineBlocked:enforced});
    }finally{await context.close();}
  }
  return results;
}
