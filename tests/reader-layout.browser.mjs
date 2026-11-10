// Real built practice/Arena pages. Use the existing loopback production guest-grader adapter.
// BROWSER_TEST_ORIGIN=http://127.0.0.1:port AUTHORING_BROWSER_TOOLS=/external/tools CHROMIUM_PATH=/usr/bin/chromium node tests/reader-layout.browser.mjs
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {readFile} from 'node:fs/promises';
const require=createRequire(join(process.env.AUTHORING_BROWSER_TOOLS||'/tmp/physcratic-editor-test','package.json'));
const {chromium}=require('playwright'),{default:AxeBuilder}=require('@axe-core/playwright');
const arenaIndex=JSON.parse(await readFile(new URL('../lib/arena/index.json',import.meta.url),'utf8'));
const origin=process.env.BROWSER_TEST_ORIGIN||'http://127.0.0.1:3000';assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
let checks=0;const errors=[];
const visibleValue=element=>element.value;
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks++;}
async function shape(page,mobile,leftSelector){
 const result=await page.locator('[data-answer-workspace]').evaluate((rail,leftSelector)=>{
  const left=document.querySelector(leftSelector).getBoundingClientRect(),right=rail.getBoundingClientRect(),style=getComputedStyle(rail);
  return {left:{x:left.x,right:left.right,bottom:left.bottom},right:{x:right.x,top:right.top,width:right.width,height:right.height},position:style.position,overflow:style.overflowY,maxHeight:style.maxHeight,viewport:innerHeight};
 },leftSelector);
 if(mobile){assert.equal(result.position,'static');assert.equal(result.maxHeight,'none');assert.equal(result.overflow,'visible');assert.ok(result.right.top>=result.left.bottom-1);}
 else{assert.equal(result.position,'sticky');assert.ok(result.right.x>=result.left.right+20);assert.ok(result.right.width>=350&&result.right.width<=370);assert.ok(result.right.height<=result.viewport-38);}
 checks++;
}
async function axe(page){const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(result.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);checks++;}
try{
 for(const mobile of [false,true])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width:mobile?375:1440,height:900},isMobile:mobile,hasTouch:mobile});await context.addInitScript(theme=>localStorage.setItem('theme',theme),theme);
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/dashboard/problems/incline');await page.getByRole('button',{name:'Check answer',exact:true}).waitFor();
  await shape(page,mobile,'#step-read');await noOverflow(page);
  await page.getByRole('textbox',{name:/Final answer/}).fill('1');await page.getByRole('button',{name:'Check answer',exact:true}).click();await page.getByText('Not correct yet',{exact:false}).waitFor();
  await page.getByRole('button',{name:'See hint',exact:true}).click();await page.locator('#problem-hint').waitFor();
  await page.getByRole('textbox',{name:/Final answer/}).fill('4.9');await page.getByRole('button',{name:'Check answer',exact:true}).click();await page.locator('#worked-solution').waitFor();if(!mobile){const layout=await page.locator('#step-solution').evaluate(solution=>({solutionRight:solution.getBoundingClientRect().right,railLeft:document.querySelector('[data-answer-workspace]').getBoundingClientRect().left}));assert.ok(layout.solutionRight<=layout.railLeft-20,'sticky rail must not cover the solution');}checks++;
  await page.screenshot({path:`work/layout-practice-${mobile?'375':'1440'}-${theme}.png`,fullPage:true});await axe(page);
  await page.goto(origin+'/dashboard/problems/arena-mind-the-gap');const field=page.locator('#step-answer math-field').first();await field.waitFor();
  await shape(page,mobile,'#arena-document');await noOverflow(page);
  const images=page.locator('#arena-document img');assert.ok(await images.count()>0,'original statement figure must remain');await images.first().scrollIntoViewIfNeeded();await images.first().evaluate(image=>image.decode());assert.equal(await images.first().evaluate(image=>image.complete&&image.naturalWidth>0),true);checks++;
  await field.click();await page.waitForTimeout(150);await page.keyboard.type('1');const id=await field.getAttribute('id');await page.evaluate(id=>{window.__layoutField=document.getElementById(id);},id);
  await page.getByRole('link',{name:'View worked solution',exact:true}).click();assert.equal(await page.getByRole('tab',{name:'Worked solution',exact:true}).getAttribute('aria-selected'),'true');assert.equal(await field.isVisible(),true);assert.equal(await field.evaluate(visibleValue),'1');assert.equal(await page.evaluate(id=>window.__layoutField===document.getElementById(id),id),true);checks++;
  await page.getByRole('list',{name:'Steps',exact:true}).getByRole('link').nth(0).click();assert.equal(await page.getByRole('tab',{name:'Problem statement',exact:true}).getAttribute('aria-selected'),'true');
  await page.getByRole('list',{name:'Steps',exact:true}).getByRole('link').nth(3).click();assert.equal(await page.getByRole('tab',{name:'Worked solution',exact:true}).getAttribute('aria-selected'),'true');
  await page.getByRole('link',{name:'Back to statement',exact:true}).click();assert.equal(await field.evaluate(visibleValue),'1');checks++;
  await page.getByRole('button',{name:'Check answer',exact:true}).click();await page.getByText(/to revisit|Not correct/).first().waitFor();checks++;
  const expression='r+'.repeat(100)+'r';await field.evaluate((element,value)=>{element.value=value;element.dispatchEvent(new Event('input',{bubbles:true}));},expression);await noOverflow(page);
  await page.reload();const restored=page.locator(`[id=${JSON.stringify(id)}]`);await restored.waitFor();assert.equal(await restored.evaluate(visibleValue),expression);checks++;
  await noOverflow(page);await axe(page);await page.screenshot({path:`work/layout-arena-${mobile?'375':'1440'}-${theme}.png`,fullPage:true});
  await context.close();
 }
 // Eighteen-part real problem: sticky viewport bounds and keyboard access to its full rail.
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:{width:mobile?375:1440,height:900},isMobile:mobile,hasTouch:mobile});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const path='/dashboard/problems/arena-the-cosmic-kitchen',html=await(await fetch(origin+path)).text();assert.ok(html.includes(arenaIndex.problems.find(problem=>problem.id==='arena-the-cosmic-kitchen').title),'actual title must remain in server HTML');assert.ok(html.includes('<span class="katex-mathml"'),'original rendered mathematics must remain in server HTML');checks++;
  await page.goto(origin+path);await page.getByRole('button',{name:'Check answer',exact:true}).waitFor();await shape(page,mobile,'#arena-document');await noOverflow(page);
  const rail=page.locator('[data-answer-workspace]');
  if(!mobile){
   await page.evaluate(()=>{const rail=document.querySelector('[data-answer-workspace]');window.scrollTo(0,scrollY+rail.getBoundingClientRect().top+350);});await page.waitForTimeout(150);
   let bounds=await rail.boundingBox();assert.ok(bounds.y>=18&&bounds.y<=22);assert.ok(bounds.y+bounds.height<=902);
   await page.evaluate(()=>window.scrollBy(0,300));await page.waitForTimeout(100);bounds=await rail.boundingBox();assert.ok(bounds.y>=18&&bounds.y<=22);checks++;
   const before=await rail.evaluate(element=>({scroll:element.scrollTop,window:scrollY}));await rail.focus();await page.keyboard.press('End');await page.waitForTimeout(150);const after=await rail.evaluate(element=>({scroll:element.scrollTop,window:scrollY}));assert.ok(after.scroll>before.scroll+100);assert.ok(Math.abs(after.window-before.window)<3);checks++;
   await page.getByRole('button',{name:'Check answer',exact:true}).scrollIntoViewIfNeeded();assert.equal(await page.getByRole('button',{name:'Check answer',exact:true}).isVisible(),true);checks++;
  }else{assert.equal(await rail.evaluate(element=>getComputedStyle(element).position),'static');assert.equal(await rail.evaluate(element=>element.scrollHeight>element.clientHeight+1),false);checks++;}
  await page.screenshot({path:`work/layout-multipart-${mobile?'375':'1440'}.png`,fullPage:false});await axe(page);await context.close();
 }
 assert.deepEqual(errors,[]);console.log(`PASS built reader layout ${checks} checks: real practice/Arena source, figures and server HTML, desktop columns/sticky/keyboard rail scrolling, mobile normal flow, MathLive typing/long recovery, hints/grading/solution navigation and live field preservation, light/dark 375/1440 axe/overflow. Guests with loopback production grader, no live provider qualification.`);
}finally{await browser.close();}
