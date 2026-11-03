// Real component/API + disposable PostgreSQL; injected sessions, no provider claims.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFile,mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join,resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { createProblemInteractionsApi } from '../lib/community/problem-interactions-api.ts';
import { achievementMigrations } from './community-achievement-fixtures.ts';
const require=createRequire(import.meta.url),tools=createRequire(join(process.env.AUTHORING_BROWSER_TOOLS,'package.json'));
const {chromium}=tools('playwright'),{default:AxeBuilder}=tools('@axe-core/playwright'),{build}=createRequire(require.resolve('tsx'))('esbuild');
const url=new URL(process.env.AUTHORING_TEST_DATABASE_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.pathname,'/physcratic_authoring_test');
const schema='interactions_ui_'+randomUUID().replaceAll('-',''),admin=new Pool({connectionString:url.href}),pool=new Pool({connectionString:url.href,options:`-c search_path=${schema},public`});
const temp=await mkdtemp(join(tmpdir(),'interactions-ui-'));let server,browser,origin,viewer={id:'fixture-a',emailVerified:true},gate,held,readGate,releaseRead,fail=false,writes=0;const errors=[];
try{
 await admin.query(`CREATE SCHEMA ${schema}`);await pool.query('CREATE TABLE "user"(id text PRIMARY KEY,"emailVerified" boolean DEFAULT true); INSERT INTO "user"(id) VALUES(\'fixture-a\'),(\'fixture-b\')');
 for(const name of [...achievementMigrations.slice(0,6),'0012_community_problem_interactions'])await pool.query('BEGIN;'+await readFile(`migrations/${name}.up.sql`,'utf8')+'COMMIT;');
 const api=createProblemInteractionsApi({pool,user:async()=>({...viewer}),origin:r=>r.headers.get('origin')===origin});
 await build({entryPoints:['tests/problem-interactions-harness.tsx'],outfile:join(temp,'bundle.js'),bundle:true,platform:'browser',jsx:'automatic',alias:{'@/lib/auth-client':resolve('tests/problem-interactions-auth-fixture.ts'),'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},logLevel:'silent'});
 execFileSync('node_modules/.bin/tailwindcss',['-i','app/globals.css','-o',join(temp,'style.css')],{stdio:'pipe'});
 server=createServer(async(req,res)=>{try{
  const path=new URL(req.url,origin);
  if(path.pathname==='/fixture/viewer'){viewer={id:path.searchParams.get('id'),emailVerified:path.searchParams.get('verified')==='true'};res.end('ok');return;}
  if(path.pathname==='/fixture/hold-read'){readGate=new Promise(r=>{releaseRead=r;});res.end('ok');return;}
  if(path.pathname==='/fixture/release-read'){releaseRead?.();readGate=undefined;res.end('ok');return;}
  if(path.pathname==='/fixture/hold'){gate=new Promise(r=>{held=r;});res.end('ok');return;}
  if(path.pathname==='/fixture/release'){held?.();res.end('ok');return;}
  if(path.pathname==='/fixture/fail'){fail=true;res.end('ok');return;}
  if(path.pathname.startsWith('/api/')){
   const chunks=[];for await(const b of req)chunks.push(b);
   const write=req.method==='PUT',waiting=write?gate:undefined;if(write){writes++;gate=undefined;}
   const response=await api(new Request(path,{method:req.method,headers:req.headers,...(write?{body:Buffer.concat(chunks)}:{})}));
   if(waiting)await waiting;if(!write&&readGate)await readGate;
   if(write&&fail){fail=false;res.writeHead(500);res.end('{}');return;}
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
  }
  if(['/bundle.js','/style.css'].includes(path.pathname)){res.setHeader('content-type',path.pathname.endsWith('.js')?'application/javascript':'text/css');res.end(await readFile(join(temp,path.pathname.slice(1))));return;}
  res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="en"><head><title>Interaction fixture</title><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
 }catch(e){errors.push(String(e));res.writeHead(500);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.request.get(origin+'/fixture/hold-read');await page.goto(origin);
 await page.getByRole('button',{name:'Suspend filter',exact:true}).click();await page.waitForFunction(()=>window.__fixtureSuspended===true);await page.request.get(origin+'/fixture/release-read');
 // An abandoned concurrent render must not invalidate the committed GET.
 await page.getByText('0 favourites',{exact:true}).waitFor({timeout:3000});await page.reload();
 await page.getByText('0 favourites',{exact:true}).waitFor();await page.getByText('Verified completion count unavailable',{exact:true}).waitFor();
 await page.request.get(origin+'/fixture/hold');await page.getByRole('button',{name:'Save favourite',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[aria-pressed]')?.disabled===true);
 await page.getByRole('button',{name:'Account B',exact:true}).click();await page.getByRole('button',{name:'Save favourite',exact:true}).waitFor();await page.getByText('1 favourite',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Account A',exact:true}).click();await page.getByRole('button',{name:'Remove favourite',exact:true}).click();await page.getByText('0 favourites',{exact:true}).waitFor();
 await page.request.get(origin+'/fixture/release');await page.waitForTimeout(250);assert.equal(await page.getByRole('button',{name:'Save favourite',exact:true}).count(),1);await page.getByText('0 favourites',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Unverify A',exact:true}).click();await page.getByText('Verify your email to save favourites.',{exact:true}).waitFor();assert.equal(await page.locator('[aria-pressed]').count(),0);
 await page.getByRole('button',{name:'Account A',exact:true}).click();await page.getByRole('button',{name:'Save favourite',exact:true}).waitFor();
 await page.request.get(origin+'/fixture/fail');const before=writes;await page.getByRole('button',{name:'Save favourite',exact:true}).click();await page.getByRole('button',{name:'Refresh statistics',exact:true}).click();await page.getByRole('button',{name:'Remove favourite',exact:true}).waitFor();assert.equal(writes,before+1);
 for(const width of [1440,375])for(const theme of ['light','dark']){await page.setViewportSize({width,height:1000});await page.evaluate(theme=>document.documentElement.classList.toggle('dark',theme==='dark'),theme);
  // Check the settled theme, rather than intermediate transition colours.
  await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual((await new AxeBuilder({page}).analyze()).violations,[]);await page.screenshot({path:join(temp,`interactions-${width}-${theme}.png`),fullPage:true});}
 await page.getByRole('button',{name:'Remove favourite',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Save favourite',exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS: batched stats, abandoned concurrent renders, ABA delayed writes, verification transitions, uncertain writes/read recovery, keyboard and desktop/mobile light/dark accessibility.');console.log('Synthetic screenshots: '+temp);
}finally{held?.();releaseRead?.();await browser?.close();if(server)await new Promise(r=>server.close(r));await pool.end();await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();}
