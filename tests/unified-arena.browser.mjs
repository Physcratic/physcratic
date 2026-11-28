import axeSettle from "./axe-settle.cjs";
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {mkdtemp,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {createUnifiedArenaApi} from '../lib/unified-arena-api.ts';
import {achievementFixtures,installAchievementFixtures} from './community-achievement-fixtures.ts';
const req=createRequire(import.meta.url),tools=createRequire(join(process.env.AUTHORING_BROWSER_TOOLS,'package.json'));
const {chromium}=tools('playwright'),{default:AxeBuilder}=tools('@axe-core/playwright'),{build}=createRequire(req.resolve('tsx'))('esbuild');
axeSettle.settleAxeBuilder(AxeBuilder);
const url=new URL(process.env.AUTHORING_TEST_DATABASE_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.pathname,'/physcratic_authoring_test');
const schema='arena_ui_'+randomUUID().replaceAll('-',''),admin=new Pool({connectionString:url.href}),pool=new Pool({connectionString:url.href,options:`-c search_path=${schema},public`});
const temp=await mkdtemp(join(tmpdir(),'arena-ui-'));let browser,server;const errors=[];
try{
 await admin.query(`CREATE SCHEMA ${schema}`);await installAchievementFixtures(pool);const f=achievementFixtures(pool),owner=await f.user();for(let i=0;i<26;i++)await f.problem(owner);
 await pool.query("INSERT INTO community_badge_selection(user_id,badge_ids) VALUES($1,ARRAY['first-spark'])",[owner]);
 const api=createUnifiedArenaApi(pool,()=>({authors:true,badges:true,medals:false}));
 await build({entryPoints:['tests/unified-arena-harness.tsx'],outfile:join(temp,'bundle.js'),bundle:true,platform:'browser',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},logLevel:'silent'});
 execFileSync('node_modules/.bin/tailwindcss',['-i','app/globals.css','-o',join(temp,'style.css')],{stdio:'pipe'});
 server=createServer(async(req,res)=>{try{if(req.url.startsWith('/api/')){const r=req.url.startsWith('/api/auth/')?Response.json(null):await api(new Request('http://localhost'+req.url));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());}else if(['/bundle.js','/style.css'].includes(req.url)){res.setHeader('content-type',req.url.endsWith('.js')?'application/javascript':'text/css');res.end(await readFile(join(temp,req.url.slice(1))));}else{res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="en"><head><title>Arena test</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');}}catch(e){errors.push(String(e));res.writeHead(500);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(origin);await page.locator('[data-problem-card^="authored:"]').first().waitFor();assert.ok(await page.locator('[data-problem-card^="arena:"]').count());assert.ok(await page.getByText('Published by Physcratic',{exact:true}).count());
 await page.getByLabel('Search',{exact:true}).fill('fixture');await page.waitForFunction(()=>document.querySelectorAll('[data-problem-card]').length===24&& !document.querySelector('[data-problem-card^="arena:"]'));
 await page.getByRole('button',{name:'Next page',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[data-problem-card]').length===2);assert.equal(await page.locator('h2').evaluate(el=>document.activeElement===el),true);
 await page.getByRole('button',{name:'Previous page',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[data-problem-card]').length===24);
 assert.ok(await page.getByRole('link',{name:(await pool.query('SELECT handle FROM community_profile WHERE user_id=$1',[owner])).rows[0].handle,exact:true}).count());
 // The fixtures carry the author's rating 1200. A rating filter uses it, so none of them is unrated.
 await page.getByLabel('Difficulty',{exact:true}).selectOption('unrated');await page.getByText('No matching problems found.',{exact:true}).waitFor();
 await page.getByLabel('Difficulty',{exact:true}).selectOption('all');await page.locator('[data-problem-card^="authored:"]').first().waitFor();
 // Exercise the real cards with synthetic public medal data and an 80-character unbroken name.
 const layoutEndpoint='**/api/arena/collection?*';
 const layoutPage=await (await api(new Request('http://localhost/api/arena/collection?source=authored'))).json();
 const [shortCard,longCard]=layoutPage.problems;
 const medal={id:'medal:00000000-0000-4000-8000-000000000001',competition:'IPhO',award:'gold',year:2026,country:'ID',competitionName:''};
 const national={...medal,id:'medal:00000000-0000-4000-8000-000000000002',competition:'National',award:'bronze',competitionName:'Indonesian Physics Olympiad'};
 const longName='Long'.repeat(20);
 shortCard.author={...shortCard.author,displayName:'Lina',selectedIds:[medal.id],medals:[medal]};
 longCard.author={...longCard.author,displayName:longName,selectedIds:[national.id,medal.id],medals:[national,medal]};
 await page.route(layoutEndpoint,route=>route.fulfill({json:{...layoutPage,problems:[shortCard,longCard],nextCursor:null}}));
 await page.reload();
 const short=page.locator(`[data-problem-card="${shortCard.key}"]`);
 const long=page.locator(`[data-problem-card="${longCard.key}"]`);
 const name=short.getByRole('link',{name:'Lina',exact:true});
 const longLink=long.getByRole('link',{name:longName,exact:true});
 const summary=short.getByLabel('Gold IPhO 2026: medal details');
 const nationalSummary=long.getByLabel('Bronze National ID 2026: medal details');
 await summary.waitFor();
 assert.equal(await name.getAttribute('href'),'/u/'+shortCard.author.handle);
 assert.deepEqual(await long.locator('summary').allTextContents(),['Bronze National ID 2026','Gold IPhO 2026']);
 for(const theme of ['light','dark']) {
  await page.evaluate(theme=>{
   document.documentElement.classList.toggle('dark',theme==='dark');
   document.documentElement.style.colorScheme=theme;
  },theme);
  for(const width of [1440,375,320]) {
   await page.setViewportSize({width,height:1000});
   const [author,badge]=await Promise.all([name.boundingBox(),summary.boundingBox()]);
   assert.ok(badge.x>=author.x+author.width-1,`${theme} ${width}: badge follows the author on the same row`);
   assert.ok(Math.abs(author.y+author.height/2-badge.y-badge.height/2)<=2,`${theme} ${width}: vertically centered`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const card=await long.boundingBox();
   for(const control of [longLink,nationalSummary]) {
    const box=await control.boundingBox();
    assert.ok(box.x>=card.x&&box.x+box.width<=card.x+card.width,`${theme} ${width}: name and badge fit inside the card`);
   }
   if(width===320) {
    assert.ok(await longLink.evaluate(link=>link.getClientRects().length>1),`${theme}: long name wraps`);
    assert.ok(await longLink.evaluate(link=>{
     const by=document.createRange();
     by.selectNodeContents(link.previousSibling);
     return Math.abs(by.getBoundingClientRect().y-link.getClientRects()[0].y)<=1;
    }),`${theme}: attribution prefix stays with the name`);
    const [wrappedName,wrappedBadge]=await Promise.all([longLink.boundingBox(),nationalSummary.boundingBox()]);
    assert.ok(wrappedBadge.y>=wrappedName.y+wrappedName.height,`${theme}: badge wraps below the long name`);
   }
   // Measure contrast after theme and hover colours settle.
   await page.evaluate(async()=>{
    await new Promise(requestAnimationFrame);
    await Promise.all(document.getAnimations()
     .filter(animation=>Number.isFinite(animation.effect?.getComputedTiming().endTime))
     .map(animation=>animation.finished.catch(()=>{})));
   });
   assert.deepEqual((await new AxeBuilder({page}).analyze()).violations,[],`${theme} ${width}: axe`);
   await page.screenshot({path:join(temp,`arena-${theme}-${width}.png`),fullPage:true});
  }
 }
 await nationalSummary.focus();await nationalSummary.press('Enter');
 await long.getByText('Verified Bronze, Indonesian Physics Olympiad, 2026, ID. Certificate reviewed privately.',{exact:true}).waitFor();
 await nationalSummary.click();
 assert.equal(await nationalSummary.locator('..').getAttribute('open'),null);
 await page.unroute(layoutEndpoint);
 await pool.query('UPDATE "user" SET "emailVerified"=false WHERE id=$1',[owner]);await page.getByRole('button',{name:'Refresh collection'}).click();await page.getByText('By Community author',{exact:true}).first().waitFor();assert.equal(await page.getByRole('link',{name:/^@u_/}).count(),0);assert.equal(await page.getByLabel('Achievement showcase').count(),0);
 await page.getByLabel('Search',{exact:true}).fill('mind');await page.getByLabel('Difficulty',{exact:true}).selectOption('all');await page.locator('[data-problem-card="arena:arena-mind-the-gap"]').waitFor();assert.ok((await page.getByRole('link',{name:'Mind the Gap',exact:false}).first().getAttribute('href')).startsWith('/dashboard/problems/'));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'passed',views:6,artifacts:temp}));
}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));await pool.end();await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();}
