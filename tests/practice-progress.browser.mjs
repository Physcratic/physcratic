// Actual solving/history components, production API/grader factories and disposable PG.
// Session and surrounding dashboard-contest data are synthetic, not live provider qualification.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { Pool } from 'pg';
import { createPracticeCheckRoute } from '../lib/practice-check-route.ts';
import { createPracticeCheckApi } from '../lib/practice-check-api.ts';
import { practiceCheckCatalog } from '../lib/practice-check-catalog.ts';
import { dashboardAccountMatches, dashboardPracticeCounts } from '../lib/dashboard-practice.ts';
import { handleArchiveGrade } from '../lib/archive-grading-request.ts';
import { isAllowedSubmissionOrigin } from '../lib/submission-security.ts';
const require=createRequire(import.meta.url), external=createRequire(join(process.env.AUTHORING_BROWSER_TOOLS||'/tmp/physcratic-editor-test','package.json'));
const {chromium}=external('playwright'),{default:AxeBuilder}=external('@axe-core/playwright');
const {build}=createRequire(require.resolve('tsx'))('esbuild');
const target=new URL(process.env.AUTHORING_TEST_DATABASE_URL||'http://invalid');assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/physcratic_authoring_test');
const schema='progress_ui_'+randomUUID().replaceAll('-',''),admin=new Pool({connectionString:target.href});await admin.query(`CREATE SCHEMA ${schema}`);
const pool=new Pool({connectionString:target.href,options:`-c search_path=${schema},public`,max:5});
const temp=await mkdtemp(join(tmpdir(),'physcratic-b2b-'));
const catalog=practiceCheckCatalog();let browser,server,origin,dropNext=false,holdNext=false,releaseHeld,unavailable=false,enabled=true,posts=0,guestPosts=0,progressReads=0;
const bodies=[],errors=[];
const user=request=>{const id=request.headers.get('cookie')?.match(/viewer=([A-Za-z0-9]+)/)?.[1];return id?{id,emailVerified:id!=='U'}:null;};
const api=createPracticeCheckApi({pool,user:async r=>user(r),origin:r=>isAllowedSubmissionOrigin(r,[origin])});
const gatedApi=createPracticeCheckRoute(()=>enabled,async()=>({practiceCheckApi:api}));
async function actor(id){await pool.query('INSERT INTO "user" VALUES($1) ON CONFLICT DO NOTHING',[id]);}
async function session(page,id,verified=true,pending=false){await actor(id||'unused');await page.evaluate(({id,verified,pending})=>window.__setPracticeSession(id,verified,pending),{id,verified,pending});}
async function count(id){return Number((await pool.query('SELECT count(*) AS n FROM practice_check_attempt WHERE user_id=$1',[id])).rows[0].n);}
async function grade(page,value){await page.locator('input[inputmode="decimal"]').fill(value);await page.getByRole('button',{name:'Check answer',exact:true}).click();}
async function waitText(page,text){await page.getByText(text,{exact:false}).first().waitFor();}
try{
 await pool.query('CREATE TABLE "user"(id text PRIMARY KEY)');await pool.query('BEGIN;'+await readFile('migrations/0017_practice_checks.up.sql','utf8')+'COMMIT;');
 const built=await build({entryPoints:['tests/practice-progress-harness.tsx'],outdir:temp,entryNames:'bundle',chunkNames:'lazy-[name]-[hash]',bundle:true,splitting:true,metafile:true,format:'esm',platform:'browser',jsx:'automatic',alias:{'@':process.cwd(),'@/lib/auth-client':resolve('tests/practice-session-fixture.ts')},define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},logLevel:'silent'});
 const assets=new Set(Object.keys(built.metafile.outputs).map(p=>'/'+basename(p)));
 execFileSync('node_modules/.bin/tailwindcss',['-i','app/globals.css','-o',join(temp,'style.css')],{stdio:'pipe'});
 server=createServer(async(req,res)=>{try{
  const path=new URL(req.url,origin).pathname;res.setHeader('cache-control','no-store');
  if(assets.has(path)||path==='/style.css'){res.setHeader('content-type',path.endsWith('.css')?'text/css':'application/javascript');res.end(await readFile(join(temp,basename(path))));return;}
  if(path.startsWith('/corpus/grading/')){const entry=catalog.find(e=>path.endsWith('/'+e.metadata.problemId+'.json'));res.setHeader('content-type','application/json');res.end(JSON.stringify(entry.metadata));return;}
  if(path.startsWith('/api/')){
   const chunks=[];for await(const c of req)chunks.push(c);const headers=new Headers();for(const[k,v]of Object.entries(req.headers))if(typeof v==='string')headers.set(k,v);
   const request=new Request(new URL(req.url,origin),{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
   let response;
   if(path==='/api/dashboard'){
    const viewer=user(request);if(!dashboardAccountMatches(request,viewer?.id??null))response=Response.json({error:'Account changed'},{status:409});
    else{const progress=unavailable?{practiceProgressAvailable:false,practiceAttempts:null,solvedProblems:null}:await dashboardPracticeCounts(pool,viewer?.id??null,()=>enabled);response=Response.json({user:viewer?{name:'Synthetic student'}:null,savedAttempts:0,archiveReviewed:0,legacyPracticeAttempts:0,ratings:[],contests:[],...progress});}
   }else if(path==='/api/archive-grade'){guestPosts++;response=await handleArchiveGrade(request,[origin]);}
   else if(unavailable)response=Response.json({error:'Save unavailable',saveState:'unconfirmed'},{status:503});
   else{
    if(req.method==='POST'){posts++;bodies.push(JSON.parse(Buffer.concat(chunks)));}
    if(path==='/api/practice-progress')progressReads++;
    response=await gatedApi(path==='/api/practice-progress'?'progress':req.method==='POST'?'submit':'history',request);
    if(req.method==='POST'&&holdNext){holdNext=false;await new Promise(r=>{releaseHeld=r;});}
    if(req.method==='POST'&&dropNext){dropNext=false;res.writeHead(200,{'content-type':'application/json'});res.end('{');return;}
   }
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Progress test</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>');
 }catch(error){res.writeHead(500);res.end(String(error));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 for(const mobile of [false,true])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width:mobile?375:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  await context.addInitScript(theme=>document.addEventListener('DOMContentLoaded',()=>document.documentElement.classList.toggle('dark',theme==='dark')),theme);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);
  await grade(page,'4.9');await waitText(page,'Checked without saving.');assert.ok(guestPosts>0);assert.equal(await page.getByText(/Nothing is saved\./).count(),1);
  const id=`T${mobile?1:0}${theme}`;await session(page,id);await page.locator('input[inputmode="decimal"]').waitFor();assert.equal(await page.locator('input[inputmode="decimal"]').inputValue(),'');
  await grade(page,'1');await waitText(page,'Saved to your account. Your dashboard will update.');assert.equal(await page.getByText(/Nothing is saved\./).count(),0,'durable receipt feedback must not claim unsaved');
  await page.locator('[data-testid="dashboard"]').filter({hasText:'0 solved, 1 saved'}).waitFor();
  await page.getByRole('heading',{name:'Not yet solved 1',exact:true}).waitFor();
  dropNext=true;await grade(page,'4.9');await waitText(page,'The save is unconfirmed.');assert.equal(await count(id),2);
  const original=bodies.at(-1);await page.locator('input[inputmode="decimal"]').fill('2');
  await page.reload();await session(page,id);await page.getByRole('button',{name:'Retry pending save',exact:true}).waitFor();
  assert.equal(await page.locator('input[inputmode="decimal"]').inputValue(),'2');const before=posts;await page.waitForTimeout(100);assert.equal(posts,before,'reload never automatically posts');
  await page.getByRole('button',{name:'Retry pending save',exact:true}).click();await waitText(page,'The original pending check is saved. Your current answers have not been checked.');
  assert.equal(await page.getByText(/Correct within this part/).count(),0,'old receipt must not grade the edited visible input');
  assert.deepEqual(bodies.at(-1),original);assert.equal(await count(id),2);
  await page.locator('[data-testid="dashboard"]').filter({hasText:'1 solved, 2 saved'}).waitFor();await page.getByRole('heading',{name:'Solved correctly 1',exact:true}).waitFor();
  await page.getByRole('link',{name:/A block on an incline.*Practice/}).waitFor();assert.equal(await page.getByRole('link',{name:/A block on an incline.*Practice/}).getAttribute('href'),'/dashboard/problems/incline');
  await grade(page,'1');await waitText(page,'Saved to your account. Your dashboard will update.');await page.getByRole('heading',{name:'Solved correctly 1',exact:true}).waitFor();
  await session(page,id+'B');assert.equal(await page.locator('input[inputmode="decimal"]').inputValue(),'');await page.getByRole('heading',{name:'Solved correctly 0',exact:true}).waitFor();
  await session(page,null);await waitText(page,'Sign in to save progress');await session(page,id);assert.equal(await page.locator('input[inputmode="decimal"]').inputValue(),'1');
  await page.screenshot({path:`work/progress-${mobile?'375':'1440'}-${theme}.png`,fullPage:true});
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await context.close();
 }
 // Actual installed-schema OFF gate must not write, report saved or retry POSTs in the background.
 // Actual combined ProblemReader + B4 rail must clear draft fields without remounting or losing a pending save.
 const real=await browser.newContext({viewport:{width:1440,height:950}}),realPage=await real.newPage();await realPage.goto(origin+'?reader=1');await session(realPage,'RealReader');
 await realPage.locator('[data-answer-workspace]').waitFor();dropNext=true;await grade(realPage,'4.9');await waitText(realPage,'The save is unconfirmed.');
 const realOriginal=bodies.at(-1);await realPage.locator('input[inputmode="decimal"]').fill('3');
 await realPage.locator('input[inputmode="decimal"]').evaluate(el=>{window.__combinedResetField=el;});
 await realPage.getByRole('button',{name:'Start over',exact:true}).click();
 assert.equal(await realPage.locator('input[inputmode="decimal"]').inputValue(),'');
 assert.equal(await realPage.locator('input[inputmode="decimal"]').evaluate(el=>el===window.__combinedResetField),true,'resetToken must preserve the live field node');
 await realPage.getByRole('button',{name:'Retry pending save',exact:true}).click();await waitText(realPage,'The original pending check is saved. Your current answers have not been checked.');
 assert.deepEqual(bodies.at(-1),realOriginal);assert.equal(await count('RealReader'),1);await real.close();
 const off=await browser.newContext(),offPage=await off.newPage();enabled=false;await offPage.goto(origin);await session(offPage,'Disabled');
 await waitText(offPage,'No completion count is available.');await grade(offPage,'4.9');await waitText(offPage,'Saved practice checks are disabled.');
 assert.equal(await offPage.getByText('Saved to your account. Your dashboard will update.',{exact:true}).count(),0);assert.equal(await count('Disabled'),0);
 const disabledPosts=posts;await offPage.getByRole('button',{name:'Check without saving',exact:true}).click();await waitText(offPage,'Checked without saving.');
 await offPage.clock.install();const readsBefore=progressReads;await offPage.clock.fastForward(45000);await offPage.waitForTimeout(50);
 assert.equal(posts,disabledPosts,'no automatic save retry');assert.ok(progressReads-readsBefore<=2,'read retries remain bounded');assert.equal(await count('Disabled'),0);
 await off.close();enabled=true;
 // Initial auth resolution must preserve actively typed text and focus.
 const boot=await browser.newContext(),bootPage=await boot.newPage();await bootPage.goto(origin+'?pending=1');
 const bootInput=bootPage.locator('input[inputmode="decimal"]');await bootInput.fill('3.14');await bootInput.focus();
 await session(bootPage,'Bootstrap');assert.equal(await bootInput.inputValue(),'3.14');assert.equal(await bootInput.evaluate(el=>el===document.activeElement),true);
 await bootPage.reload();await session(bootPage,'Bootstrap');assert.equal(await bootInput.inputValue(),'3.14');await boot.close();
 const mathBoot=await browser.newContext(),mathPage=await mathBoot.newPage();await mathPage.goto(origin+'?pending=1');await mathPage.getByLabel('Problem',{exact:true}).selectOption('arena-mind-the-gap');
 const math=mathPage.locator('math-field').first();await math.waitFor();await math.click();await mathPage.keyboard.type('x^2');const mathText=await math.evaluate(el=>el.value);
 await session(mathPage,'MathBootstrap');assert.equal(await math.evaluate(el=>el.value),mathText);assert.equal(await math.evaluate(el=>el===document.activeElement),true);await mathBoot.close();
 const conflict=await browser.newContext(),conflictPage=await conflict.newPage();await conflictPage.goto(origin+'?pending=1');await session(conflictPage,'Conflict');
 await conflictPage.locator('input[inputmode="decimal"]').fill('old account draft');await conflictPage.goto(origin+'?pending=1');
 await conflictPage.locator('input[inputmode="decimal"]').fill('new provisional work');await session(conflictPage,'Conflict');await waitText(conflictPage,'Choose your draft');
 assert.equal(await conflictPage.locator('input[inputmode="decimal"]').inputValue(),'new provisional work');
 await conflictPage.getByRole('button',{name:'Restore account draft',exact:true}).click();assert.equal(await conflictPage.locator('input[inputmode="decimal"]').inputValue(),'old account draft');await conflict.close();
 // Provider/storage outage must preserve working guest feedback and an immutable pending save.
 const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);unavailable=true;await session(page,'Failure');
 await grade(page,'4.9');await waitText(page,'The save is unconfirmed.');await waitText(page,'No completion count is available.');
 await page.getByRole('button',{name:'Check without saving',exact:true}).click();await waitText(page,'Checked without saving.');assert.equal(await count('Failure'),0);
 unavailable=false;await page.getByRole('button',{name:'Retry pending save',exact:true}).click();await waitText(page,'Saved to your account. Your dashboard will update.');assert.equal(await count('Failure'),1);
 await page.getByRole('button',{name:'Start over fixture',exact:true}).click();assert.equal(await page.locator('input[inputmode="decimal"]').inputValue(),'');
 await session(page,'Unverified',false);const beforeGuest=guestPosts;await grade(page,'4.9');await waitText(page,'Checked without saving.');assert.ok(guestPosts>beforeGuest);assert.equal(await count('Unverified'),0);
 await session(page,'Invalid');await grade(page,'banana');await waitText(page,'Saved to your account.');await page.getByRole('heading',{name:'Not graded 1',exact:true}).waitFor();
 await session(page,'Storage');await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('physcratic.practice.v1:'))throw Error('quota fixture');return original.call(this,key,value);};});
 const beforePosts=posts;await grade(page,'4.9');await waitText(page,'Recovery could not prepare a safe retry.');assert.equal(posts,beforePosts);assert.equal(await page.locator('input[inputmode="decimal"]').inputValue(),'4.9');
 await page.getByRole('button',{name:'Check without saving',exact:true}).click();await waitText(page,'Checked without saving.');assert.equal(await count('Storage'),0);
 await page.reload();await session(page,'Slow');holdNext=true;await grade(page,'4.9');
 for(let n=0;!releaseHeld&&n<100;n++)await new Promise(r=>setTimeout(r,20));assert.equal(typeof releaseHeld,'function');
 await session(page,'SlowB');assert.equal(await page.locator('input[inputmode="decimal"]').inputValue(),'');releaseHeld();releaseHeld=undefined;
 await page.waitForTimeout(100);assert.equal(await page.getByText('Saved to your account. Your dashboard will update.',{exact:true}).count(),0);assert.equal(await count('SlowB'),0);
 await session(page,'Slow');await page.getByRole('button',{name:'Retry pending save',exact:true}).click();await waitText(page,'Saved to your account.');assert.equal(await count('Slow'),1);
 await session(page,'Version');await page.locator('input[inputmode="decimal"]').fill('123');
 await page.route('**/api/practice-checks',route=>route.fulfill({status:409,json:{error:'The grading version changed. Reload the problem.',saveState:'rejected'}}));
 await page.getByRole('button',{name:'Check answer',exact:true}).click();await waitText(page,'The grading version changed.');
 assert.equal(await page.locator('input[inputmode="decimal"]').inputValue(),'123');
 const changed={...catalog.find(e=>e.metadata.problemId==='incline').metadata,version:'b'.repeat(64)};
 await page.route('**/corpus/grading/incline.json',route=>route.fulfill({json:changed}));
 await page.getByRole('button',{name:'Refresh answer fields',exact:true}).click();await page.waitForFunction(()=>document.querySelector('input[inputmode="decimal"]')?.value==='');
 assert.equal(await page.getByRole('button',{name:'Retry pending save',exact:true}).count(),0,'old-version intent cannot attach to the new fields');
 await page.unroute('**/api/practice-checks');await page.unroute('**/corpus/grading/incline.json');await page.reload();await session(page,'Version');
 await page.getByRole('button',{name:'Retry pending save',exact:true}).waitFor();assert.equal(await page.locator('input[inputmode="decimal"]').inputValue(),'123');assert.equal(await count('Version'),0);
 await session(page,'Arena');await page.getByLabel('Problem',{exact:true}).selectOption('arena-mind-the-gap');
 await page.locator('input[inputmode="decimal"]').fill('0');await page.getByRole('button',{name:'Check answer',exact:true}).click();await waitText(page,'Saved to your account.');
 const arenaLink=page.getByRole('link',{name:/Mind the Gap.*Arena/});await arenaLink.waitFor();assert.equal(await arenaLink.getAttribute('href'),'/dashboard/problems/arena-mind-the-gap');
 await context.close();assert.deepEqual(errors,[]);
 console.log('PASS B2B actual solver/history/dashboard-hook browser: guest and account checks, exact-body lost-response retry after reload, dashboard refresh, monotonic completion, cross-account/sign-out isolation, practice/Arena links, provider outage with unsaved checking, 375/1440 light/dark axe and overflow. Sessions/dashboard wrapper synthetic.');
}finally{if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();await rm(temp,{recursive:true,force:true});}
