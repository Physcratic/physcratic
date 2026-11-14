// Production server only. LEARN_EQUATION_FIXTURE optionally supplies an isolated SSR
// Mechanics article while it is unpublished. No preview route or source flag changes.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
const require=createRequire(join(process.env.AUTHORING_BROWSER_TOOLS,'package.json'));
const {chromium,webkit}=require('playwright');const {default:AxeBuilder}=require('@axe-core/playwright');
const origin=process.env.BROWSER_TEST_ORIGIN??'http://127.0.0.1:3138';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const out=process.env.LEARN_EQUATION_EVIDENCE??'/tmp/learn-equation-evidence';mkdirSync(out,{recursive:true});
const results=[];let unavailable=[];
const luminance=s=>{const c=s.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;});return .2126*c[0]+.7152*c[1]+.0722*c[2];};
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 let browser;
 try{browser=await engine.launch({headless:true,...(name==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});}
 catch(e){if(name==='chromium')throw e;unavailable.push({engine:name,error:String(e)});continue;}
 try{for(const width of [375,768,1440])for(const theme of ['light','dark'])for(const js of [false,true]){
  const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:js,colorScheme:theme});const page=await context.newPage();
  await page.goto(origin+'/learn',{waitUntil:'networkidle'});
  if(process.env.LEARN_EQUATION_FIXTURE){
   const css=await page.locator('link[rel="stylesheet"]').evaluateAll(es=>es.map(e=>e.outerHTML).join(''));
   await page.setContent(`<html lang="en"><head><base href="${origin}/">${css}</head><body><main class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">${readFileSync(process.env.LEARN_EQUATION_FIXTURE,'utf8')}</main></body></html>`,{waitUntil:'networkidle'});
  }else{const response=await page.goto(origin+'/learn/mechanics-olympiad-problem-solving',{waitUntil:'networkidle'});assert.equal(response.status(),200);}
  await page.locator('html').evaluate((e,t)=>e.classList.toggle('dark',t==='dark'),theme);
  assert.equal(await page.locator('article math').count(),10);
  const violations=js?(await new AxeBuilder({page}).include('article').analyze()).violations:[];
  const groups=page.locator('article [role="group"][aria-label="Equation"]');
  let scrolling=0;
  if(!process.env.LEARN_EQUATION_BASELINE){
   assert.equal(await groups.count(),10);
   for(const group of await groups.all()){
    await group.focus();await page.keyboard.press('Tab');
    assert.ok(await group.evaluate(e=>e!==document.activeElement),'Tab exits the equation');
    await page.keyboard.press('Shift+Tab');
    assert.ok(await group.evaluate(e=>e===document.activeElement));
    const outline=await group.evaluate(e=>({width:getComputedStyle(e).outlineWidth,style:getComputedStyle(e).outlineStyle}));
    assert.notEqual(outline.width,'0px');assert.notEqual(outline.style,'none');
    const colors=await group.evaluate(e=>[getComputedStyle(e).outlineColor,getComputedStyle(document.body).backgroundColor]);
    const levels=colors.map(luminance).sort((a,b)=>b-a);assert.ok((levels[0]+.05)/(levels[1]+.05)>=3,'Focus outline contrast is at least3:1');
    if(await group.evaluate(e=>e.scrollWidth>e.clientWidth+1)){
     await group.evaluate(e=>e.scrollLeft=0);await page.keyboard.press('ArrowRight');await page.waitForTimeout(250);
     assert.ok(await group.evaluate(e=>e.scrollLeft>0),'ArrowRight scrolls the equation');
     const right=await group.evaluate(e=>e.scrollLeft);
     await page.keyboard.press('ArrowLeft');await page.waitForTimeout(250);
     assert.ok(await group.evaluate((e,x)=>e.scrollLeft<x,right),'ArrowLeft scrolls back');scrolling++;
    }
   }
  }
  if(!process.env.LEARN_EQUATION_BASELINE&&width===375)assert.ok(scrolling>0,'Mobile scrolling was exercised');
  assert.ok(await page.locator('body').evaluate(e=>e.scrollWidth<=innerWidth));
  for(const image of await page.locator('article figure img').all()){await image.scrollIntoViewIfNeeded();await image.evaluate(e=>e.decode());}
  await page.screenshot({path:join(out,`${name}-${width}-${theme}-${js}.png`),fullPage:true});
  results.push({engine:name,width,theme,js,scrolling,violations:violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length}))});await context.close();
 }}finally{await browser.close();}
}
writeFileSync(join(out,'results.json'),JSON.stringify({results,unavailable},null,2));console.log(JSON.stringify({results,unavailable}));
if(!process.env.LEARN_EQUATION_BASELINE)assert.ok(results.every(r=>r.violations.length===0),'axe audit failed');
