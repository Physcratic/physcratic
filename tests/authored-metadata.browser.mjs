import { installProfilePublicationFixture } from "./profile-publication-fixtures.ts";
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
const handle = 'public_author_1234567890';
const byline = page => page.locator('p').filter({hasText: `By @${handle}`});
const authorLink = page => page.getByRole('link', {name: `@${handle}`, exact: true});
async function noPublisher(page){await page.locator('a[href^="/u/"]').waitFor({state:'hidden'});}
async function neutral(page){await text(page, 'By Community author');await noPublisher(page);}
async function profileLink(page){
  await byline(page).waitFor();
  await authorLink(page).waitFor();
  assert.equal(await authorLink(page).getAttribute('href'), `/u/${handle}`);
}
const require=createRequire(import.meta.url),external=createRequire(join(process.env.AUTHORING_BROWSER_TOOLS||'/tmp/physcratic-editor-test','package.json'));
const {chromium}=external('playwright'),{default:AxeBuilder}=external('@axe-core/playwright'),{build}=createRequire(require.resolve('tsx'))('esbuild');
const target=new URL(process.env.AUTHORING_TEST_DATABASE_URL||'http://invalid');assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/physcratic_authoring_test');
const schema='metadata_'+randomUUID().replaceAll('-',''),admin=new Pool({connectionString:target.href});await admin.query(`CREATE SCHEMA ${schema}`);
const pool=new Pool({connectionString:target.href,options:`-c search_path=${schema},public`,statement_timeout:5000});
const temp=await mkdtemp(join(tmpdir(),'physcratic-b3-')),problemId=randomUUID(),partId=randomUUID();
const title='Oscillations Near an Extended Equilibrium '+ 'LongTitle'.repeat(12);
let revision={id:randomUUID(),problemId,number:1,schemaVersion:1,publishedAt:new Date().toISOString(),content:{title,topicTags:['Mechanics'],methodTags:['Energy methods'],estimatedDifficulty:'1200',context:[],sections:[{id:randomUUID(),title:'Motion',blocks:[],parts:[{id:partId,label:'A',answerMode:'numeric',blocks:[]}]}],attachments:[],provenance:{kind:'original',source:'',rightsDeclaration:'Synthetic test content'}}};
let browser,server,origin,enabled=true,unavailable=false,holdNext=false,releaseHeld,published=true,overrideAttribution,checks=0;
const errors=[];
const route=createAuthoredAttributionRoute(()=>enabled,async()=>({authoredAttributionApi:createAuthoredAttributionApi(pool)}));
async function visibility(value,name='Public Author'){await pool.query('UPDATE "user" SET "emailVerified"=$1',[value]);await pool.query('UPDATE community_profile SET display_name=$1',[name]);}
async function focus(page){await page.bringToFront();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));}
async function text(page,value){await page.getByText(value,{exact:true}).waitFor();}
try{
 await pool.query('CREATE TABLE authored_problem(id uuid PRIMARY KEY,owner_id text,state text,published_revision_id uuid); CREATE TABLE authored_revision(id uuid PRIMARY KEY,problem_id uuid); CREATE TABLE "user"(id text PRIMARY KEY)');
 await pool.query(await readFile('migrations/0007_community_profile.up.sql','utf8'));await installProfilePublicationFixture(pool);
 await pool.query(`INSERT INTO "user"(id) VALUES('PRIVATE_OWNER_ID')`);
 await pool.query('INSERT INTO authored_problem VALUES($1,$2,$3,$4)',[problemId,'PRIVATE_OWNER_ID','published',revision.id]);await pool.query('INSERT INTO authored_revision VALUES($1,$2)',[revision.id,problemId]);await pool.query("INSERT INTO community_profile(user_id,handle,display_name,bio,publication_basis,publication_policy_version,publication_recorded_at) VALUES('PRIVATE_OWNER_ID',$1,'Public Author','PRIVATE_BIO','legacy_acknowledgement','b1-v1',now())",[handle]);
 const built=await build({entryPoints:['tests/authored-student-harness.tsx'],outdir:temp,entryNames:'bundle',chunkNames:'lazy-[name]-[hash]',bundle:true,splitting:true,metafile:true,format:'esm',platform:'browser',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},logLevel:'silent'});
 const assets=new Set(Object.keys(built.metafile.outputs).map(p=>'/'+basename(p)));execFileSync('node_modules/.bin/tailwindcss',['-i','app/globals.css','-o',join(temp,'style.css')],{stdio:'pipe'});
 server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,origin),path=url.pathname;res.setHeader('cache-control','no-store');
  if(assets.has(path)||path==='/style.css'){res.setHeader('content-type',path.endsWith('.css')?'text/css':'application/javascript');res.end(await readFile(join(temp,basename(path))));return;}
  if(path.endsWith('/attribution')){
   const response=unavailable?Response.json({error:'unavailable'},{status:503}):overrideAttribution?Response.json(overrideAttribution):await route(new Request(url),problemId);
   if(holdNext){holdNext=false;await new Promise(r=>{releaseHeld=r;});}
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
  }
  if(path===`/u/${handle}`){res.setHeader('content-type','text/html');res.end(`<h1>@${handle}</h1>`);return;}
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
  await page.getByRole('heading',{level:1,name:title,exact:true}).waitFor();await text(page,'1,200 Intermediate');await text(page,'Community-authored problem');await profileLink(page);checks++;
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.doesNotMatch(await page.locator('body').innerText(), /PRIVATE_|Public Author/);
  assert.ok(await authorLink(page).evaluate(link => {
    const heading = link.closest('header')?.querySelector('h1');
    return heading && heading.getBoundingClientRect().bottom <= link.getBoundingClientRect().top && link.getBoundingClientRect().height >= 44;
  }));
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await neutral(page);await focus(page);await profileLink(page);checks++;
  await visibility(false);holdNext=true;await focus(page);await neutral(page);
  for(let n=0;!releaseHeld&&n<100;n++)await new Promise(r=>setTimeout(r,10));assert.equal(typeof releaseHeld,'function');assert.equal(await authorLink(page).count(),0);releaseHeld();releaseHeld=undefined;await neutral(page);checks++;
  await visibility(true);await focus(page);await profileLink(page);unavailable=true;await focus(page);await neutral(page);unavailable=false;checks++;
  await visibility(true,'Earlier Public Name');holdNext=true;await focus(page);for(let n=0;!releaseHeld&&n<100;n++)await new Promise(r=>setTimeout(r,10));assert.equal(typeof releaseHeld,'function');
  await visibility(false);await focus(page);await neutral(page);releaseHeld();releaseHeld=undefined;await page.waitForTimeout(100);assert.equal(await authorLink(page).count(),0);checks++;
  enabled=false;await visibility(true);await focus(page);await neutral(page);enabled=true;await focus(page);await profileLink(page);
  await page.screenshot({path:join(temp,`metadata-${mobile?'375':'1440'}-${theme}.png`),fullPage:true});
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);checks++;
  if (mobile) {
    await authorLink(page).tap();
  } else {
    for (let n=0; n<12 && !(await authorLink(page).evaluate(link => link === document.activeElement)); n++) await page.keyboard.press('Tab');
    assert.ok(await authorLink(page).evaluate(link => link.matches(':focus-visible') && getComputedStyle(link).outlineStyle !== 'none'));
    await page.keyboard.press('Enter');
  }
  await page.waitForURL(`${origin}/u/${handle}`);
  await page.getByRole('heading',{name:`@${handle}`,exact:true}).waitFor();checks++;
  await context.close();
 }
 const offContext=await browser.newContext(),offPage=await offContext.newPage(),offRequests=[];offPage.on('request',request=>{if(request.url().includes('/attribution?'))offRequests.push(request.url());});await offPage.goto(origin+'?off=1');await text(offPage,'Published by Community author');await noPublisher(offPage);await offPage.waitForTimeout(100);assert.equal(offRequests.length,0,'default-off reader must not poll attribution');await offContext.close();checks++;
 const context=await browser.newContext(),page=await context.newPage();await visibility(true);await page.goto(origin);await focus(page);await profileLink(page);
 for (const invalid of [
   { problemId, revisionId: revision.id, author: { displayName: 'No handle' } },
   { problemId, revisionId: revision.id, author: { displayName: 'Malformed handle', handle: '../private' } },
   { problemId: randomUUID(), revisionId: revision.id, author: { displayName: 'Wrong problem', handle } },
   { problemId, revisionId: randomUUID(), author: { displayName: 'Wrong revision', handle } },
 ]) {
   overrideAttribution = invalid;
   const response = page.waitForResponse(res => res.url().includes('/attribution?'));
   await focus(page);
   await (await response).finished();
   await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
   await neutral(page);
   overrideAttribution = undefined;
   await focus(page);
   await profileLink(page);
   checks++;
 }
 await pool.query("UPDATE authored_problem SET owner_id='__physcratic_deleted_principal_v1__'");
 await focus(page);await text(page,'Published by Deleted user');await noPublisher(page);checks++;
 await pool.query("UPDATE authored_problem SET owner_id='PRIVATE_OWNER_ID'");
 await focus(page);await profileLink(page);
 await page.clock.install();unavailable=true;await page.clock.fastForward(16000);await neutral(page);unavailable=false;checks++;
 revision={...revision,id:randomUUID(),number:2,content:{...revision.content,title:'Published Replacement Title',estimatedDifficulty:'Intermediate'}};await pool.query('INSERT INTO authored_revision VALUES($1,$2)',[revision.id,problemId]);await pool.query('UPDATE authored_problem SET published_revision_id=$1',[revision.id]);await visibility(false);
 await focus(page);await page.getByRole('button',{name:'Reload current problem',exact:true}).waitFor();await noPublisher(page);
 await page.getByRole('button',{name:'Reload current problem',exact:true}).click();await page.getByRole('heading',{level:1,name:'Published Replacement Title',exact:true}).waitFor();await text(page,'Intermediate');await noPublisher(page);assert.equal(await page.getByText(/~1,200/).count(),0);checks++;
 published=false;await pool.query("UPDATE authored_problem SET state='archived'");await focus(page);await page.getByText('This problem is unpublished, deleted or unavailable.',{exact:false}).waitFor();await noPublisher(page);checks++;
 await context.close();assert.deepEqual(errors,[]);console.log(`PASS authored metadata browser ${checks} checks: public username link, private/deleted/default-off fallbacks, delayed/failed/malformed/late reads, freshness expiry, current publication/revision, keyboard and touch navigation, 375/1440 light/dark axe and overflow. Synthetic statement/viewer and disposable PG projection.`);
}finally{releaseHeld?.();if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();await rm(temp,{recursive:true,force:true});}
