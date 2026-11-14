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
 await page.goto(origin);await page.locator('[data-problem-card^="arena:"]').first().waitFor();assert.ok(await page.getByText('Published by Physcratic',{exact:true}).count());
 // Arena has 29 problems since the beginner set of 14 November 2026, more than one page of 24, so authored cards start on page two.
 await page.getByRole('button',{name:'Next page',exact:true}).click();await page.locator('[data-problem-card^="authored:"]').first().waitFor();
 await page.getByRole('button',{name:'Previous page',exact:true}).click();await page.locator('[data-problem-card^="arena:"]').first().waitFor();
 await page.getByLabel('Search',{exact:true}).fill('fixture');await page.waitForFunction(()=>document.querySelectorAll('[data-problem-card]').length===24&& !document.querySelector('[data-problem-card^="arena:"]'));
 await page.getByRole('button',{name:'Next page',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[data-problem-card]').length===2);assert.equal(await page.locator('h2').evaluate(el=>document.activeElement===el),true);
 await page.getByRole('button',{name:'Previous page',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[data-problem-card]').length===24);
 assert.ok(await page.getByRole('link',{name:'@'+(await pool.query('SELECT handle FROM community_profile WHERE user_id=$1',[owner])).rows[0].handle,exact:true}).count());
 await page.getByLabel('Difficulty',{exact:true}).selectOption('unrated');await page.locator('[data-problem-card]').first().waitFor();
 for(const width of [1440,375]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const axe=await new AxeBuilder({page}).analyze();assert.deepEqual(axe.violations,[]);await page.screenshot({path:join(temp,`arena-${width}.png`),fullPage:true});}
 await pool.query('UPDATE community_profile SET public_visibility=false WHERE user_id=$1',[owner]);await page.getByRole('button',{name:'Refresh collection'}).click();await page.getByText('By Community author',{exact:true}).first().waitFor();assert.equal(await page.getByRole('link',{name:/^@u_/}).count(),0);
 await page.getByLabel('Search',{exact:true}).fill('mind');await page.getByLabel('Difficulty',{exact:true}).selectOption('all');await page.locator('[data-problem-card="arena:arena-mind-the-gap"]').waitFor();assert.ok((await page.getByRole('link',{name:'Mind the Gap',exact:false}).first().getAttribute('href')).startsWith('/dashboard/problems/'));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'passed',views:2,artifacts:temp}));
}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));await pool.end();await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();}
