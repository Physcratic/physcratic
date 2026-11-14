// node --require ./tests/server-only-register.cjs --import tsx tests/problem-insights.browser.mjs
// Uses isolated SSR fixtures for unpublished copy. Never introduces a preview URL.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
const external=createRequire(join(process.env.AUTHORING_BROWSER_TOOLS,'package.json'));
const {chromium}=external('playwright');const {default:AxeBuilder}=external('@axe-core/playwright');
const {problemInsights}=require('../lib/problem-insights.ts');
const {ProblemInsightContent}=require('../components/problems/problem-insight.tsx');
Object.assign(globalThis,{React});
const origin=process.env.BROWSER_TEST_ORIGIN??'http://127.0.0.1:3141';
assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
const out=process.env.INSIGHT_EVIDENCE??'/tmp/p5b-browser';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const results=[];
try{for(const insight of problemInsights){
 const response=await fetch(`${origin}/dashboard/problems/${insight.problemId}`);assert.equal(response.status,200);const html=await response.text();
 assert.ok(html.includes(`href="https://physcratic.com/dashboard/problems/${insight.problemId}"`));
 for(const draft of problemInsights)assert.ok(!html.includes(draft.title),'Draft absent from public HTML and RSC');
 for(const width of [375,768,1440])for(const theme of ['light','dark'])for(const js of [false,true]){
  const c=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:js});const p=await c.newPage();
  await p.goto(origin+'/learn',{waitUntil:'networkidle'});
  const css=await p.locator('link[rel="stylesheet"]').evaluateAll(es=>es.map(e=>e.outerHTML).join(''));
  const body=renderToStaticMarkup(React.createElement(ProblemInsightContent,{insight}));
  await p.setContent(`<html lang="en" class="${theme}"><head><base href="${origin}/">${css}</head><body><main class="mx-auto max-w-4xl px-4 py-8"><h1>${insight.problemId}: editorial draft</h1>${body}</main></body></html>`,{waitUntil:'networkidle'});
  const details=p.locator('details');assert.equal(await details.getAttribute('open'),null);
  assert.equal(await p.locator('[role="group"][aria-label="Equation"]').first().isVisible(),false);
  await p.locator('summary').focus();await p.keyboard.press('Space');assert.notEqual(await details.getAttribute('open'),null);
  assert.equal(await p.locator('math').count(),2);
  for(const equation of await p.locator('[role="group"][aria-label="Equation"]').all()){
   await equation.focus();await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');assert.ok(await equation.evaluate(e=>e===document.activeElement));
   assert.notEqual(await equation.evaluate(e=>getComputedStyle(e).outlineStyle),'none');
   if(await equation.evaluate(e=>e.scrollWidth>e.clientWidth+1)){await p.keyboard.press('ArrowRight');await p.waitForTimeout(250);assert.ok(await equation.evaluate(e=>e.scrollLeft>0));}
  }
  for(let i=1;i<=2;i++)assert.equal(await p.locator(`#source-${i}`).count(),1);
  assert.ok(await p.locator('body').evaluate(e=>e.scrollWidth<=innerWidth));
  const violations=js?(await new AxeBuilder({page:p}).include('main').analyze()).violations:[];assert.deepEqual(violations,[]);
  await p.screenshot({path:join(out,`${insight.problemId}-${width}-${theme}-${js}.png`),fullPage:true});
  await p.locator('summary').focus();await p.keyboard.press('Enter');assert.equal(await details.getAttribute('open'),null);
  results.push({id:insight.problemId,width,theme,js,nativeDisclosure:true,math:2,pageOverflow:false,axe:js?'zero violations':'not run without JS'});await c.close();
 }
}}finally{await browser.close();}writeFileSync(join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
