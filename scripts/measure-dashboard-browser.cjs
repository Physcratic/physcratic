// External Playwright tooling only. No dependency is added to the application.
// Optional P1_ROUNDS=5 P1_NAMES=overview,problems for repeated local samples. Timings are diagnostic, not network-latency estimates.
// node scripts/measure-dashboard-browser.cjs http://127.0.0.1:3000 resources.json
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const browserTools = process.env.AUTHORING_BROWSER_TOOLS ? createRequire(path.join(process.env.AUTHORING_BROWSER_TOOLS, 'package.json')) : require;
const { chromium } = browserTools('playwright');
const fs = require('node:fs');
const origin = process.argv[2], out = process.argv[3];
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname));
assert.ok(out, 'Pass an output JSON path.');
const dashboard = { user: null, savedAttempts: 0, practiceAttempts: 0, solvedProblems: 0, archiveReviewed: 0, ratings: [], contests: [] };
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox']});
 const results=[];
 const rounds=Number(process.env.P1_ROUNDS || 1);
 const scenarios=process.env.P1_CALCULATOR==='1' ? [['calculator','/dashboard?view=problems&collection=pilot']] : [['overview','/dashboard'],['problems','/dashboard?view=problems'],['practice','/dashboard/problems/incline'],['arena','/dashboard/problems/arena-mind-the-gap'],['imported','/dashboard/problems/ipho-2025-t1']];
 const selected=process.env.P1_NAMES?.split(',');
 try {
  for (let round=0;round<rounds;round++) for (const [name,path] of scenarios.filter(([name])=>!selected||selected.includes(name))) {
   const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
   await context.route('**/*', async route=>{
    const r=route.request(), u=new URL(r.url());
    if(u.origin!==origin) return route.abort();
    if(u.pathname==='/api/auth/get-session') return route.fulfill({json:null});
    if(u.pathname==='/api/dashboard') return route.fulfill({json:dashboard});
    if(u.pathname==='/api/rankings') return route.fulfill({json:{rankings:[]}});
    if(u.pathname==='/api/authored-problems/library') return route.fulfill({json:{problems:[],nextCursor:null}});
    if(u.pathname.startsWith('/api/') && u.pathname!=='/api/archive-grade') return route.fulfill({status:401,json:{error:'Sign in required.'}});
    if(!['GET','HEAD'].includes(r.method()) && u.pathname!=='/api/archive-grade') return route.fulfill({status:204,body:''});
    return route.continue();
   });
   context.setDefaultTimeout(30000);
   const page=await context.newPage(), seen=new Set(), errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{const u=new URL(r.url());if(u.origin===origin&&u.pathname.startsWith('/_next/')&&/\.m?js$/.test(u.pathname)&&r.status()===200)seen.add(decodeURIComponent(u.pathname.slice('/_next/'.length)));});
   const cdp=await context.newCDPSession(page);
   await cdp.send('Performance.enable');
   await page.addInitScript(()=>{
    window.__p1={shifts:0,largest:0};
    new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__p1.shifts+=e.value;}).observe({type:'layout-shift',buffered:true});
    new PerformanceObserver(list=>{for(const e of list.getEntries())window.__p1.largest=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
   });
   const start=Date.now(); await page.goto(origin+path,{waitUntil:'networkidle'});await page.waitForTimeout(200);
   const initial=[...seen], milestones=[];
   const step=async(label,act)=>{const before=new Set(seen),t=Date.now();await act();const readyMs=Date.now()-t;await page.waitForLoadState('networkidle');await page.waitForTimeout(100);milestones.push({label,readyMs,additional:[...seen].filter(x=>!before.has(x)),cumulative:[...seen]});};
   const perf=await page.evaluate(()=>({fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,lcp:window.__p1.largest,cls:window.__p1.shifts,domContentLoaded:performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd}));
   const metrics=await cdp.send('Performance.getMetrics');
   perf.scriptMs=metrics.metrics.find(x=>x.name==='ScriptDuration')?.value*1000;
   if(name==='overview') await step('enter Problems',async()=>{await page.locator('a[href="/dashboard?view=problems"]').first().evaluate(e=>e.click());await page.getByLabel('Find a problem',{exact:true}).waitFor();});
   if(name==='problems') await step('open Arena reader',async()=>{await page.locator('#arena-results a[href^="/dashboard/problems/"]').first().evaluate(e=>e.click());await page.getByRole('tab',{name:'Problem statement',exact:true}).waitFor();});
   if(name==='imported') {
    await step('open Your solution',async()=>{await page.getByRole('tab',{name:'Your solution',exact:true}).click();await page.getByText('Equation calculator',{exact:true}).first().waitFor();});
    await step('open calculator',async()=>{await page.getByText('Equation calculator',{exact:true}).first().click();await page.getByLabel('Equation',{exact:true}).first().waitFor();});
    await step('calculate',async()=>{await page.getByLabel('Equation',{exact:true}).first().fill('a = g*sin(theta)');await page.getByLabel('Variable values',{exact:true}).first().fill('g = 9.81\ntheta = pi/6');await page.getByRole('button',{name:'Calculate',exact:true}).first().click();await page.getByText('Calculated result',{exact:true}).first().waitFor();});
   }
   if(name==='calculator') {
    await page.locator('#guided-results').getByRole('button',{name:/^Exercise:/}).first().click();
    await page.getByText('Equation calculator',{exact:true}).first().waitFor();
    await step('immediate first calculation',async()=>{await page.getByText('Equation calculator',{exact:true}).first().click();await page.getByLabel('Equation',{exact:true}).first().fill('2+2');await page.getByRole('button',{name:'Calculate',exact:true}).first().click();await page.getByText('result = 4',{exact:true}).waitFor();});
    await step('warm calculation',async()=>{await page.getByLabel('Equation',{exact:true}).first().fill('2+3');await page.getByRole('button',{name:'Calculate',exact:true}).first().click();await page.getByText('result = 5',{exact:true}).waitFor();});
   }
   assert.deepEqual(errors, [], name);
   results.push({name,path,round,initial,milestones,perf,elapsedMs:Date.now()-start,errors});
   fs.writeFileSync(out,JSON.stringify(results,null,2));
   console.error(JSON.stringify({round,name,perf,steps:milestones.map(s=>({label:s.label,readyMs:s.readyMs}))}));
   await context.close();
  }
 } finally {await browser.close();}
 fs.writeFileSync(out,JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(x=>({name:x.name,initial:x.initial.length,steps:x.milestones.map(s=>({label:s.label,chunks:s.additional.length,readyMs:s.readyMs})),errors:x.errors,perf:x.perf})),null,2));
})().catch(e=>{console.error(e);process.exit(1)});
