// Reuses the actual auth/schema/roles/API fixture in lib/account-deletion.test.ts.
// Browser identity changes are controlled. API requests use real signed fixture sessions.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const journal='physcratic.account-deletion.pending.v1';
export async function runAccountDeletionBrowser({api,origin:fixtureOrigin,actors,counts,privateCounts,cleanup,arm}) {
 const external=createRequire(join(process.env.AUTHORING_BROWSER_TOOLS,'package.json'));
 const {chromium}=external('playwright'),{default:AxeBuilder}=external('@axe-core/playwright');
 const {build}=createRequire(require.resolve('tsx'))('esbuild');
 const temp=await mkdtemp(join(tmpdir(),'deletion-browser-'));
 const known=new Map(),requests=[];let server,browser,origin,holdNext=false,unconfirmedNext=false;
 const held=new Set();
 try {
  await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {AccountDeletionSection} from './components/account/account-deletion';function App(){const [id,setId]=useState(window.__initialAccount);window.__deletionAccount=setId;return <main className="mx-auto max-w-2xl p-4"><h1 className="mb-4 text-xl">Deletion fixture</h1><span data-testid="account" className="sr-only">{id??'guest'}</span><AccountDeletionSection accountId={id} verified={Boolean(id)}/></main>}createRoot(document.getElementById('root')).render(<App/>);`},bundle:true,platform:'browser',jsx:'automatic',format:'iife',outfile:join(temp,'bundle.js'),define:{'process.env.NODE_ENV':'"production"','process.env':'{}'},logLevel:'silent',plugins:[{name:'fixture-auth-refresh',setup(build){build.onResolve({filter:/^@\/lib\/auth-client$/},()=>({path:'auth',namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},()=>({loader:'js',contents:'export const authClient={getSession:async()=>({data:null})};'}));}}]});
  execFileSync('node_modules/.bin/tailwindcss',['-i','app/globals.css','-o',join(temp,'style.css')],{stdio:'pipe'});
  server=createServer(async(req,res)=>{
   try {
    const url=new URL(req.url,origin),viewer=req.headers.cookie?.match(/viewer=([A-Za-z0-9_-]+)/)?.[1],actor=known.get(viewer);
    if(url.pathname==='/bundle.js'||url.pathname==='/style.css'){res.setHeader('content-type',url.pathname.endsWith('.css')?'text/css':'application/javascript');res.end(await readFile(join(temp,url.pathname.slice(1))));return;}
    if(url.pathname==='/api/account-deletion'){
     const chunks=[];for await(const part of req)chunks.push(part);const body=Buffer.concat(chunks).toString();const parsed=JSON.parse(body);
     const headers=new Headers({'content-type':req.headers['content-type']??'',origin:req.headers.origin===origin?fixtureOrigin:req.headers.origin??'',cookie:actor?.cookie??''});
     if(req.headers['x-account-deletion-account'])headers.set('X-Account-Deletion-Account',req.headers['x-account-deletion-account']);
     requests.push({token:parsed.requestToken,account:headers.get('x-account-deletion-account'),statusOnly:!('password'in parsed)});
     const response=await api(new Request(fixtureOrigin+'/api/account-deletion',{method:'POST',headers,body}));
     const shouldFail=unconfirmedNext;unconfirmedNext=false;
     if(holdNext){holdNext=false;await new Promise(resolve=>held.add(resolve));}
     if(shouldFail){res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({error:'Synthetic acknowledgement unavailable. No completion is confirmed.'}));return;}
     res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
    }
    const theme=url.searchParams.get('theme')==='dark'?'dark':'light';res.setHeader('content-type','text/html');
    res.end(`<!doctype html><html lang="en" class="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Deletion test</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script>window.__initialAccount=${JSON.stringify(actor?.id)};const raw=window.fetch;window.fetch=async(...args)=>{const response=await raw(...args),json=response.json.bind(response);response.json=async()=>{const data=await json();queueMicrotask(()=>window.__deletionResponses=(window.__deletionResponses??0)+1);return data;};return response;};</script><script src="/bundle.js"></script></body></html>`);
   }catch{res.writeHead(500);res.end('Fixture failure');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  for(const width of [375,1440])for(const theme of ['light','dark']) {
   const {a,b}=await actors(`browser-${width}-${theme}`);known.set(a.id,a);known.set(b.id,b);assert.equal(a.password===b.password,true,'Shared passwords make stale consent consequential');
   const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const cookie=async id=>{await context.clearCookies();if(id)await context.addCookies([{name:'viewer',value:id,url:origin}]);};
   const select=async id=>{await page.evaluate(id=>window.__deletionAccount(id),id);await page.waitForFunction(id=>document.querySelector('[data-testid=account]')?.textContent===(id??'guest'),id);};
   const password=page.getByLabel('Current password',{exact:true}),confirm=page.getByLabel('Type DELETE MY ACCOUNT to confirm',{exact:true}),submit=page.getByRole('button',{name:'Permanently delete my account',exact:true});
   const proof=async actor=>{await password.fill(actor.password);await confirm.fill('DELETE MY ACCOUNT');};
   const status=page.getByRole('status'),check=page.getByRole('button',{name:'Check previous deletion status',exact:true});
   const responses=()=>page.evaluate(()=>window.__deletionResponses??0);
   const settled=async before=>{await page.waitForFunction(before=>(window.__deletionResponses??0)>before,before);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
   const baseline=requests.length;await cookie(a.id);await page.goto(origin+'?theme='+theme);await page.getByRole('heading',{name:'Deletion fixture'}).waitFor();assert.deepEqual(errors,[]);await proof(a);await cookie(b.id);await select(b.id);
   assert.equal(await password.inputValue()==='',true,'Changing account must discard the previous password');assert.equal(await confirm.inputValue()==='',true,'Changing account must discard the previous confirmation');assert.equal(await submit.isDisabled(),true);assert.equal(requests.length,baseline,'Account change never deletes automatically');assert.equal((await counts(b.id)).users,1);
   await select(a.id);await proof(a);await submit.click();await status.filter({hasText:'account changed'}).waitFor();assert.equal((await counts(b.id)).users,1);
   const pending=await page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)),journal);assert.equal(pending.accountId,a.id);assert.equal(Object.keys(pending).some(key=>['password','confirmation'].includes(key)),false);
   await page.evaluate(({a,b})=>{for(const storage of [sessionStorage,localStorage]){storage.setItem('physcratic.practice.v1:'+encodeURIComponent(a)+':test','A private draft');storage.setItem('physcratic.practice.v1:'+encodeURIComponent(b)+':test','B private draft');}},{a:a.id,b:b.id});
   await cookie(a.id);await proof(a);await submit.click();
   await status.filter({hasText:'awaiting operator authorization'}).waitFor();
   const caseId=(await status.textContent()).match(/Operator review reference: ([a-f0-9-]{36})/)?.[1];
   assert.ok(caseId);
   assert.equal((await counts(a.id)).users,1,'A pending case must leave the account intact');
   await arm(caseId,a);
   await proof(a);holdNext=true;unconfirmedNext=true;const responseBefore=await responses();await submit.focus();await page.keyboard.press('Enter');
   for(let n=0;held.size===0&&n<200;n++)await new Promise(resolve=>setTimeout(resolve,25));assert.equal(held.size,1);
   assert.deepEqual(await counts(a.id),{users:0,credentials:0,sessions:0});assert.deepEqual(await privateCounts(a.id),{practice:0,authored:0});
   await cookie(b.id);await select(b.id);assert.equal(await password.inputValue()==='',true);await proof(b);
   for(const release of held)release();held.clear();await settled(responseBefore);
   assert.equal(await password.inputValue()===b.password,true,'A late completion must not clear B proof');assert.equal(await status.count(),0,'A late message must not become B feedback');assert.equal((await counts(b.id)).users,1);
   const beforeBlocked=requests.length;await submit.click();await status.filter({hasText:'previous request'}).waitFor();assert.equal(requests.length,beforeBlocked,'A pending request cannot be retargeted to B');
   await page.reload();await check.waitFor();await check.click();await status.filter({hasText:'Registered file cleanup is pending'}).waitFor();
   await page.getByRole('link',{name:'Help with account deletion'}).waitFor();
   assert.equal(await page.getByRole('link',{name:'Help with account deletion'}).getAttribute('href'),'/privacy#privacy-requests');
   assert.match(await status.textContent(),/The original request removed the account’s sign-in/);
   assert.match(await status.textContent(),/Tally submissions and retained copies/);
   const stored=await page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)),journal);assert.deepEqual(Object.keys(stored),['requestToken']);assert.equal(stored.requestToken,pending.requestToken);
   assert.equal(requests.slice(baseline).filter(r=>!r.statusOnly).every(r=>r.token===pending.requestToken&&r.account===a.id),true,'All delete attempts retain original nonce and owner');
   const drafts=await page.evaluate(({a,b})=>[sessionStorage.getItem('physcratic.practice.v1:'+encodeURIComponent(a)+':test'),localStorage.getItem('physcratic.practice.v1:'+encodeURIComponent(a)+':test'),sessionStorage.getItem('physcratic.practice.v1:'+encodeURIComponent(b)+':test'),localStorage.getItem('physcratic.practice.v1:'+encodeURIComponent(b)+':test')],{a:a.id,b:b.id});
   assert.deepEqual(drafts,[null,null,'B private draft','B private draft']);
   await cleanup(true);await check.click();await status.filter({hasText:'Registered file cleanup is pending'}).waitFor();
   await cleanup(false);await check.click();await status.filter({hasText:'Cleanup of files queued in this request is complete'}).waitFor();assert.equal((await counts(b.id)).users,1);assert.equal((await privateCounts(b.id)).practice,1);
   await page.getByRole('button',{name:'Forget completed receipt',exact:true}).click();assert.equal(await check.count(),0);assert.equal(await submit.isDisabled(),true);
   await proof(b);const beforeStorage=requests.length;await page.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('Synthetic storage unavailable');};});await submit.click();await status.filter({hasText:'No completion is confirmed'}).waitFor();assert.equal(requests.length,beforeStorage,'A recovery journal must exist before deletion POST');assert.equal((await counts(b.id)).users,1);
   assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);
   await context.close();console.log(`PASS deletion browser ${width}px ${theme}: account proof, pending authorization, erasure, lost response, receipt recovery, cleanup retry, isolation and axe`);
  }
 }finally{for(const release of held)release();await browser?.close();server?.closeAllConnections();await new Promise(resolve=>server?server.close(resolve):resolve());await rm(temp,{recursive:true,force:true});}
}
