// Actual StudentWorkspace and current-consent API projection on disposable PostgreSQL.
// Published statement/session fixtures are synthetic. No live providers or private user data.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {basename,join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {Pool} from 'pg';
import {createAuthoredAttributionApi} from '../lib/authored-attribution-api.ts';
import {createAuthoredAttributionRoute} from '../lib/authored-attribution-route.ts';
const require=createRequire(import.meta.url),external=createRequire(join(process.env.AUTHORING_BROWSER_TOOLS||'/tmp/physcratic-editor-test','package.json'));
const {chromium}=external('playwright'),{default:AxeBuilder}=external('@axe-core/playwright'),{build}=createRequire(require.resolve('tsx'))('esbuild');
const target=new URL(process.env.AUTHORING_TEST_DATABASE_URL||'http://invalid');assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/physcratic_authoring_test');
const schema='metadata_'+randomUUID().replaceAll('-',''),admin=new Pool({connectionString:target.href});await admin.query(`CREATE SCHEMA ${schema}`);
const pool=new Pool({connectionString:target.href,options:`-c search_path=${schema},public`,statement_timeout:5000});
const temp=await mkdtemp(join(tmpdir(),'physcratic-b3-')),problemId=randomUUID(),partId=randomUUID();
const title='Oscillations Near an Extended Equilibrium '+ 'LongTitle'.repeat(12);
let revision={id:randomUUID(),problemId,number:1,schemaVersion:1,publishedAt:new Date().toISOString(),content:{title,topicTags:['Mechanics'],methodTags:['Energy methods'],estimatedDifficulty:'1200',context:[],sections:[{id:randomUUID(),title:'Motion',blocks:[],parts:[{id:partId,label:'A',answerMode:'numeric',blocks:[]}]}],attachments:[],provenance:{kind:'original',source:'',rightsDeclaration:'Synthetic test content'}}};
let browser,server,origin,enabled=true,unavailable=false,holdNext=false,releaseHeld,published=true,checks=0;
const errors=[];
const route=createAuthoredAttributionRoute(()=>enabled,async()=>({authoredAttributionApi:createAuthoredAttributionApi(pool)}));
async function visibility(value,name='Public Author'){await pool.query('UPDATE community_profile SET public_visibility=$1,display_name=$2',[value,name]);}
async function focus(page){await page.bringToFront();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));}
async function text(page,value){await page.getByText(value,{exact:true}).waitFor();}
try{
 await pool.query('CREATE TABLE authored_problem(id uuid PRIMARY KEY,owner_id text,state text,published_revision_id uuid); CREATE TABLE authored_revision(id uuid PRIMARY KEY,problem_id uuid); CREATE TABLE community_profile(user_id text PRIMARY KEY,display_name text,public_visibility boolean,bio text)');
 await pool.query('INSERT INTO authored_problem VALUES($1,$2,$3,$4)',[problemId,'PRIVATE_OWNER_ID','published',revision.id]);await pool.query('INSERT INTO authored_revision VALUES($1,$2)',[revision.id,problemId]);await pool.query("INSERT INTO community_profile VALUES('PRIVATE_OWNER_ID','Public Author',true,'PRIVATE_BIO')");
 const built=await build({entryPoints:['tests/authored-student-harness.tsx'],outdir:temp,entryNames:'bundle',chunkNames:'lazy-[name]-[hash]',bundle:true,splitting:true,metafile:true,format:'esm',platform:'browser',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},logLevel:'silent'});
 const assets=new Set(Object.keys(built.metafile.outputs).map(p=>'/'+basename(p)));execFileSync('node_modules/.bin/tailwindcss',['-i','app/globals.css','-o',join(temp,'style.css')],{stdio:'pipe'});
 server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,origin),path=url.pathname;res.setHeader('cache-control','no-store');
  if(assets.has(path)||path==='/style.css'){res.setHeader('content-type',path.endsWith('.css')?'text/css':'application/javascript');res.end(await readFile(join(temp,basename(path))));return;}
  if(path.endsWith('/attribution')){
   const response=unavailable?Response.json({error:'unavailable'},{status:503}):await route(new Request(url),problemId);
   if(holdNext){holdNext=false;await new Promise(r=>{releaseHeld=r;});}
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
  }
  if(path.startsWith('/api/')){
   res.setHeader('content-type','application/json');
   if(path.endsWith('/submission-info'))res.end(JSON.stringify({problemId,revisionId:revision.id,parts:[{partId,answerMode:'numeric',symbols:[],attemptsUsed:'0',attemptsRemaining:null}],limits:{requestsPerMinute:60,submissionsPerMinute:20,attemptsPerDay:100,attemptsPerPart:null,spoilerPolicy:'no-reveal-v1',reveal:'disabled'}}));
   else if(path.includes('/attempts'))res.end(JSON.stringify({attempts:[],nextCursor:null}));
   else if(!published){res.statusCode=404;res.end(JSON.stringify({error:'not published'}));}
   else res.end(JSON.stringify(revision));return;
  }
  res.setHeader('content-type','text/html');res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Metadata test</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script>window.__student=${JSON.stringify({problemId,viewer:{state:'guest'},...(!url.searchParams.has('off')?{attributionEnabled:true}:{})})}</script><script type="module" src="/bundle.js"></script></body></html>`);
 }catch(error){res.writeHead(500);res.end(String(error));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 for(const mobile of [false,true])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width:mobile?375:1440,height:950},isMobile:mobile,hasTouch:mobile});await context.addInitScript(theme=>document.addEventListener('DOMContentLoaded',()=>document.documentElement.classList.toggle('dark',theme==='dark')),theme);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await visibility(true);enabled=true;await page.goto(origin);await focus(page);
  await page.getByRole('heading',{level:1,name:title,exact:true}).waitFor();await text(page,'~1,200 · Intermediate olympiad (estimate)');await text(page,'Community-authored problem');await text(page,'Published by Public Author');checks++;
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal((await page.locator('body').innerText()).includes('PRIVATE_'),false);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await text(page,'Published by Community author');await focus(page);await text(page,'Published by Public Author');checks++;
  await visibility(false);holdNext=true;await focus(page);await text(page,'Published by Community author');
  for(let n=0;!releaseHeld&&n<100;n++)await new Promise(r=>setTimeout(r,10));assert.equal(typeof releaseHeld,'function');assert.equal(await page.getByText('Published by Public Author',{exact:true}).count(),0);releaseHeld();releaseHeld=undefined;await text(page,'Published by Community author');checks++;
  await visibility(true);await focus(page);await text(page,'Published by Public Author');unavailable=true;await focus(page);await text(page,'Published by Community author');unavailable=false;checks++;
  await visibility(true,'Earlier Public Name');holdNext=true;await focus(page);for(let n=0;!releaseHeld&&n<100;n++)await new Promise(r=>setTimeout(r,10));assert.equal(typeof releaseHeld,'function');
  await visibility(false);await focus(page);await text(page,'Published by Community author');releaseHeld();releaseHeld=undefined;await page.waitForTimeout(100);assert.equal(await page.getByText('Published by Earlier Public Name',{exact:true}).count(),0);checks++;
  enabled=false;await visibility(true);await focus(page);await text(page,'Published by Community author');enabled=true;await focus(page);await text(page,'Published by Public Author');
  await page.screenshot({path:`work/metadata-${mobile?'375':'1440'}-${theme}.png`,fullPage:true});
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);checks++;
  await context.close();
 }
 const offContext=await browser.newContext(),offPage=await offContext.newPage(),offRequests=[];offPage.on('request',request=>{if(request.url().includes('/attribution?'))offRequests.push(request.url());});await offPage.goto(origin+'?off=1');await text(offPage,'Published by Community author');await offPage.waitForTimeout(100);assert.equal(offRequests.length,0,'default-off reader must not poll attribution');await offContext.close();checks++;
 const context=await browser.newContext(),page=await context.newPage();await visibility(true);await page.goto(origin);await focus(page);await text(page,'Published by Public Author');await page.clock.install();unavailable=true;await page.clock.fastForward(16000);await text(page,'Published by Community author');unavailable=false;checks++;
 revision={...revision,id:randomUUID(),number:2,content:{...revision.content,title:'Published Replacement Title',estimatedDifficulty:'Intermediate'}};await pool.query('INSERT INTO authored_revision VALUES($1,$2)',[revision.id,problemId]);await pool.query('UPDATE authored_problem SET published_revision_id=$1',[revision.id]);await visibility(false);
 await focus(page);await page.getByRole('button',{name:'Reload current problem',exact:true}).waitFor();assert.equal(await page.getByText('Published by Public Author',{exact:true}).count(),0);
 await page.getByRole('button',{name:'Reload current problem',exact:true}).click();await page.getByRole('heading',{level:1,name:'Published Replacement Title',exact:true}).waitFor();await text(page,'Intermediate');await text(page,'Published by Community author');assert.equal(await page.getByText(/~1,200/).count(),0);checks++;
 published=false;await pool.query("UPDATE authored_problem SET state='archived'");await focus(page);await page.getByText('This problem is unpublished, deleted or unavailable.',{exact:false}).waitFor();assert.equal(await page.getByText('Published by Public Author',{exact:true}).count(),0);checks++;
 await context.close();assert.deepEqual(errors,[]);console.log(`PASS authored metadata browser ${checks} checks: actual heading/title/estimate/tags, public/private/withdrawn/default-off names, delayed/failed/late reads, freshness expiry, current publication/revision, 375/1440 light/dark axe and overflow. Synthetic statement/viewer and disposable PG projection.`);
}finally{releaseHeld?.();if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();await rm(temp,{recursive:true,force:true});}
