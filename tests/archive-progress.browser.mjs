// Actual route and hook, real HTTP/Drizzle/PostgreSQL, synthetic session cookies only.
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {drizzle} from 'drizzle-orm/node-postgres';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {archiveProgress} from '../lib/db/schema.ts';
import {iphoSubproblems} from '../lib/ipho-archive.ts';
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('tsx'))('esbuild');
const {chromium}=createRequire(join(process.env.AUTHORING_BROWSER_TOOLS||'/tmp/physcratic-editor-test','package.json'))('playwright');
const target=new URL(process.env.AUTHORING_TEST_DATABASE_URL);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/physcratic_authoring_test');
const admin=new Pool({connectionString:target.href}),schema='archive_guard_'+randomUUID().replaceAll('-','');
await admin.query(`CREATE SCHEMA ${schema}`);
const pool=new Pool({connectionString:target.href,options:`-c search_path=${schema},public`});
const temp=await mkdtemp(join(tmpdir(),'archive-progress-'));
let origin,server,browser,queries=0,holdNext=false,uncertainNext=false;
const held=[],requests=[];
const query=pool.query.bind(pool);pool.query=(...args)=>{queries++;const pending=query(...args);const text=typeof args[0]==='string'?args[0]:args[0].text;if(uncertainNext&&/insert into \"archive_progress\"/i.test(text)){uncertainNext=false;return pending.then(()=>{throw Error('Synthetic lost acknowledgement after autocommit');});}return pending;};
const taskId=iphoSubproblems[0].id;
async function until(check){for(let i=0;i<200;i++){if(check())return;await new Promise(r=>setTimeout(r,25));}throw Error('Expected request did not arrive');}
try {
 await pool.query('CREATE TABLE archive_progress("userId" text,"taskId" text,notes text,answer text,reviewed boolean,"updatedAt" timestamptz DEFAULT now(),PRIMARY KEY("userId","taskId"))');
 await pool.query('INSERT INTO archive_progress VALUES($1,$2,$3,\'\',false,now()),($4,$2,$5,\'\',false,now())',['A',taskId,'A note','B','B note']);
 globalThis.__archiveGuardDb=drizzle(pool,{schema:{archiveProgress}});
 globalThis.__archiveGuardUser=request=>{const id=request.headers.get('cookie')?.match(/viewer=([AB])/)?.[1];return id?{id,emailVerified:true}:null;};
 globalThis.__archiveGuardOrigin=request=>request.headers.get('origin')===origin;
 await build({entryPoints:['app/api/archive-progress/route.ts'],bundle:true,platform:'node',format:'cjs',packages:'external',outfile:join(temp,'route.cjs'),logLevel:'silent',plugins:[{name:'synthetic-bindings',setup(build){
  build.onResolve({filter:/^@\/lib\/(db|submission-server)$/},args=>({path:args.path,namespace:'synthetic'}));
  build.onLoad({filter:/.*/,namespace:'synthetic'},args=>({loader:'js',contents:args.path.endsWith('/db')?'export const db=globalThis.__archiveGuardDb;':'export const submissionUser=(r)=>globalThis.__archiveGuardUser(r); export const isSubmissionOrigin=(r)=>globalThis.__archiveGuardOrigin(r); export const submissionError=(error,status)=>Response.json({error},{status});'}));
 }}]});
 // Resolve external dependencies from this worktree, not the temporary output directory.
 const {createRequire:makeRequire}=await import('node:module');
 const {Module}=await import('node:module');const routeModule=new Module(join(temp,'route.cjs'));routeModule.paths=makeRequire(import.meta.url).resolve.paths('pg');routeModule._compile(await readFile(join(temp,'route.cjs'),'utf8'),join(temp,'route.cjs'));
 const {GET,POST}=routeModule.exports;
 const mockAuth=`import {useState} from 'react';export const authClient={useSession(){const [state,set]=useState({data:{user:{id:'A'}},isPending:false,error:null});window.__archiveSession=(id,pending=false)=>set({data:id?{user:{id}}:null,isPending:pending,error:null});return {...state,refetch:()=>{}};}};`;
 await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {SWRConfig} from 'swr';import {useArchiveProgress} from './hooks/use-archive-progress';function App(){const s=useArchiveProgress();const [note,setNote]=useState('edited note');return <main><h1>Archive progress fixture</h1><label>Notes<input value={note} onChange={e=>setNote(e.target.value)}/></label><button disabled={Boolean(s.saving||s.progress.isLoading||s.progress.error||s.session.isPending||!s.session.data?.user)} onClick={()=>{const run=window.__archiveSaveStarted=(window.__archiveSaveStarted??0)+1;void s.saveTask({taskId:${JSON.stringify(taskId)},notes:note,answer:'',reviewed:false}).finally(()=>{window.__archiveSaveFinished=[...(window.__archiveSaveFinished??[]),run]});}}>Save notes</button><button onClick={()=>s.progress.mutate()}>Refresh notes</button><div data-testid="stored">{Object.values(s.stored).map(p=>p.notes).join('|')}</div><div data-testid="save">{s.saving?'Saving':s.saveError|| (s.savedTask?'Saved':'Idle')}</div><div role="alert">{s.progress.error?.message||''}</div></main>}createRoot(document.getElementById('root')).render(<SWRConfig value={{provider:()=>new Map(),dedupingInterval:0,errorRetryCount:0}}><App/></SWRConfig>);`},bundle:true,platform:'browser',format:'iife',outfile:join(temp,'client.js'),define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent',plugins:[{name:'synthetic-auth',setup(build){build.onResolve({filter:/^@\/lib\/auth-client$/},()=>({path:'auth',namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:mockAuth,loader:'js',resolveDir:process.cwd()}));}}]});
 server=createServer(async(req,res)=>{
  try{
   if(req.url==='/client.js'){res.setHeader('content-type','application/javascript');res.end(await readFile(join(temp,'client.js')));return;}
   if(!req.url.startsWith('/api/')){res.setHeader('content-type','text/html');res.end('<html lang="en"><title>Archive fixture</title><div id="root"></div><script src="/client.js"></script></html>');return;}
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const request=new Request(origin+req.url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});
   if(req.url==='/api/dashboard'){res.setHeader('content-type','application/json');res.end('{}');return;}
   requests.push({method:req.method,account:request.headers.get('x-practice-account')});
   const response=await(req.method==='POST'?POST(request):GET(request));
   if(req.method==='POST'&&holdNext){holdNext=false;await new Promise(resolve=>held.push(resolve));}
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
  }catch(error){res.writeHead(500);res.end(String(error));}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
 const input={taskId,notes:'A displayed input',answer:'',reviewed:false};
 const call=(cookie,account,body,requestOrigin=origin)=>fetch(origin+'/api/archive-progress',{method:body?'POST':'GET',headers:{cookie:cookie?`viewer=${cookie}`:'',...(account?{'X-Practice-Account':account}:{}),origin:requestOrigin,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 assert.equal((await call(null,'A')).status,401);
 const before=queries;
 for(const account of ['A',undefined])for(const body of [undefined,input]){const r=await call('B',account,body);assert.equal(r.status,409);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(r.headers.get('vary'),'Cookie, X-Practice-Account');}
 assert.equal(queries,before,'Account mismatch must precede archive-note SQL');
 assert.equal((await call('A','A',input,'https://wrong.invalid')).status,403);
 assert.equal((await call('A','A',input)).status,200);
 const own=await(await call('B','B')).json();assert.equal(own.progress[0].notes,'B note');assert.deepEqual(Object.keys(own.progress[0]).sort(),['answer','notes','reviewed','taskId']);
 console.log('PASS actual route: missing/stale account rejected before archive-note SQL, own read/write, origin and private projection');
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 for(const width of [375,1440])for(const theme of ['light','dark']){
  await pool.query('UPDATE archive_progress SET notes="userId"||\' note\'');
  const context=await browser.newContext({viewport:{width,height:900},colorScheme:theme});
  const cookie=async id=>{await context.clearCookies();if(id)await context.addCookies([{name:'viewer',value:id,url:origin}]);};
  await cookie('A');const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);
  const stored=page.getByTestId('stored'),status=page.getByTestId('save'),notes=page.getByLabel('Notes');
  await page.waitForFunction(()=>document.querySelector('[data-testid=stored]')?.textContent==='A note');
  const first=requests.length;await cookie('B');await notes.fill('A stale edit');await page.getByRole('button',{name:'Save notes',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-testid=save]')?.textContent.includes('confirm your account'));
  assert.equal((await pool.query('SELECT notes FROM archive_progress WHERE "userId"=\'B\'')).rows[0].notes,'B note');assert.ok(requests.slice(first).some(r=>r.method==='POST'&&r.account==='A'));
  await page.getByRole('button',{name:'Refresh notes',exact:true}).click();await page.getByRole('alert').filter({hasText:'confirm your account'}).waitFor();assert.equal(await stored.textContent(),'');
  await page.evaluate(()=>window.__archiveSession('B'));await page.waitForFunction(()=>document.querySelector('[data-testid=stored]')?.textContent==='B note');assert.equal(await status.textContent(),'Idle');
  holdNext=true;await notes.fill('B saved before switch');await page.getByRole('button',{name:'Save notes',exact:true}).click();await until(()=>held.length===1);const releaseB=held.shift(),oldB=await page.evaluate(()=>window.__archiveSaveStarted);
  await cookie('A');await page.evaluate(()=>window.__archiveSession('A'));await page.waitForFunction(()=>document.querySelector('[data-testid=stored]')?.textContent==='A note');releaseB();await page.waitForFunction(id=>window.__archiveSaveFinished?.includes(id),oldB);assert.equal(await status.textContent(),'Idle');assert.equal(await stored.textContent(),'A note');
  holdNext=true;await notes.fill('A first save');await page.getByRole('button',{name:'Save notes',exact:true}).click();await until(()=>held.length===1);const releaseOldA=held.shift(),oldA=await page.evaluate(()=>window.__archiveSaveStarted);
  await cookie('B');await page.evaluate(()=>window.__archiveSession('B'));await page.waitForFunction(()=>document.querySelector('[data-testid=stored]')?.textContent==='B saved before switch');
  await cookie('A');await page.evaluate(()=>window.__archiveSession('A'));await page.waitForFunction(()=>document.querySelector('[data-testid=stored]')?.textContent==='A first save');
  holdNext=true;await notes.fill('A second save');await page.getByRole('button',{name:'Save notes',exact:true}).click();await until(()=>held.length===1);const releaseNewA=held.shift();releaseOldA();await page.waitForFunction(id=>window.__archiveSaveFinished?.includes(id),oldA);assert.equal(await status.textContent(),'Saving','Old A completion must not clear the new A request');releaseNewA();await page.waitForFunction(()=>document.querySelector('[data-testid=save]')?.textContent==='Saved');
  await page.evaluate(()=>window.__archiveSession(null));assert.equal(await stored.textContent(),'');assert.equal(await status.textContent(),'Idle');
  await page.evaluate(()=>window.__archiveSession('B',true));assert.equal(await stored.textContent(),'');await cookie('B');await page.evaluate(()=>window.__archiveSession('B'));await page.waitForFunction(()=>document.querySelector('[data-testid=stored]')?.textContent==='B saved before switch');
  uncertainNext=true;await notes.fill('B uncertain save');await page.getByRole('button',{name:'Save notes',exact:true}).click();await until(()=>!uncertainNext);await page.waitForFunction(()=>document.querySelector('[data-testid=save]')?.textContent.includes('could not be confirmed'));assert.equal(await notes.inputValue(),'B uncertain save');
  await page.getByRole('button',{name:'Save notes',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-testid=save]')?.textContent==='Saved');assert.equal((await pool.query('SELECT count(*)::int n FROM archive_progress WHERE "userId"=\'B\'')).rows[0].n,1);
  await page.reload();await cookie('A');await page.getByRole('button',{name:'Refresh notes',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-testid=stored]')?.textContent==='A second save');assert.deepEqual(errors,[]);
  await context.close();console.log(`PASS archive hook ${width}px ${theme}: stale-cookie rejection, own reload, sign-out/pending, B→A and A→B→A delayed saves, unconfirmed retry`);
 }
}finally{for(const release of held)release();await browser?.close();server?.closeAllConnections();await new Promise(resolve=>server?server.close(resolve):resolve());await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();await rm(temp,{recursive:true,force:true});delete globalThis.__archiveGuardDb;delete globalThis.__archiveGuardUser;delete globalThis.__archiveGuardOrigin;}
