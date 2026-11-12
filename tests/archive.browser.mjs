import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { allProblemPages } from '../lib/seo/problem-pages.ts';
import { catalogProblems } from '../lib/corpus-catalog.ts';
import { getEstimatedProblemElo } from '../lib/problem-archive.ts';
import { olympiadHost } from '../lib/olympiad-hosts.ts';
const require = createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, 'package.json'));
const {chromium} = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const origin = process.env.BROWSER_TEST_ORIGIN;
assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
const output = process.env.ARCHIVE_SCREENSHOTS ?? '/workspace/artifacts/physcratic-p4a';
await mkdir(output,{recursive:true});
const pages = allProblemPages().filter(p=>p.kind==='archive');
const expected = ['IPhO','APhO','EuPhO'].flatMap(c=>pages.filter(p=>p.competition===c).sort((a,b)=>b.year-a.year||a.number-b.number));
let checks=0;const ok=(condition,message)=>{assert.ok(condition,message);checks++;};
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
try {
 for(const theme of ['light','dark'])for(const width of [375,768,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await context.addInitScript(t=>localStorage.setItem('theme',t),theme);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/problems/archive');await page.locator('[data-problem-card]').first().waitFor();
  ok(await page.locator('[data-problem-card]').count()===103,'103 visible archive entries');
  assert.deepEqual(await page.locator('[data-problem-card]').evaluateAll(es=>es.map(e=>e.dataset.problemCard)),expected.map(p=>p.id));checks++;
  ok(await page.locator('main').count()===1 && await page.locator('h1').count()===1,'single main and h1');
  ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  ok(await page.locator('link[rel=canonical]').getAttribute('href')==='https://physcratic.com/problems/archive','canonical unchanged');
  await page.keyboard.press('Tab');ok(await page.evaluate(()=>document.activeElement.textContent.includes('Skip to content')),'keyboard skip first');
  await page.keyboard.press('Enter');ok(await page.evaluate(()=>document.activeElement.id==='main-content'),'skip focuses main');
  await page.getByRole('navigation',{name:'Olympiads',exact:true}).getByRole('link',{name:'APhO: Asian Physics Olympiad',exact:true}).click();
  ok(await page.locator('#h-APhO').evaluate(e=>e.getBoundingClientRect().top>=72),'fragment heading clears sticky header');
  await page.goto(origin+'/problems/archive');
  const result=await new AxeBuilder({page}).analyze();ok(!result.violations.some(v=>['serious','critical'].includes(v.impact)),JSON.stringify(result.violations));
  await page.screenshot({path:`${output}/after-${width}-${theme}.png`});
  ok(errors.length===0,errors.join(';'));
  await context.close();
 }
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:1000}});
 const page=await context.newPage();await page.goto(origin+'/problems/archive');
 const html=await page.content();await writeFile(`${output}/archive-server.html`,html);
 for(const p of expected){
  const card=page.locator(`[data-problem-card="${p.id}"]`);const c=catalogProblems.find(c=>c.id===p.id);
  ok(await card.getByRole('link',{name:/^Open problem/}).getAttribute('href')===p.path,`${p.id} crawlable reader`);
  ok((await card.textContent()).includes(p.title),`${p.id} retained title`);
  ok(await card.getAttribute('data-competition')===p.competition,`${p.id} source`);
  const host=olympiadHost(c.competition,c.year);if(host)ok(await card.getByRole('img',{name:`Hosted by ${host.country}${host.online?' (online)':''}`,exact:true}).count()===1,`${p.id} verified host`);
  const rating=getEstimatedProblemElo(p.id);if(rating!==undefined)ok((await card.textContent()).includes(rating.toLocaleString('en-US')),`${p.id} existing rating`);
  const response=await fetch(origin+p.path);const body=await response.text();
  ok(response.status===200 && body.includes(`href="https://physcratic.com${p.path}"`),`${p.id} live reader and canonical`);
 }
 for(const c of ['IPhO','APhO','EuPhO'])for(const y of new Set(pages.filter(p=>p.competition===c).map(p=>p.year)))ok(await page.locator(`[id="${c.toLowerCase()}-${y}"]`).count()===1,`${c} ${y} preserved fragment`);
 const graph=JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent());ok(JSON.stringify(graph).includes('ItemList'),'structured list');
 await page.locator('a[href="/dashboard/problems/ipho-2025-t2"]').click();ok(page.url().endsWith('/dashboard/problems/ipho-2025-t2'),'no-JS reader navigation');
 // Topic routes now share the Dashboard shell, with their own registry-derived directory.
 await page.goto(origin+'/problems/topics/mechanics');ok(await page.locator('aside').count()===1,'topic Dashboard shell');
 await context.close();console.log(`archive.browser: ${checks} checks passed; 103 reader URLs verified; ${output}`);
}finally{await browser.close();}
