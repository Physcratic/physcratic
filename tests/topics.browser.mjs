import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {topicsWithProblems,problemsInTopic,topicPageCopy} from '../lib/seo/problem-pages.ts';
import {retiredPracticeIds} from '../lib/legacy-practice.ts';
const require=createRequire(join(process.env.AUTHORING_BROWSER_TOOLS,'package.json'));
const {chromium}=require('playwright'),AxeBuilder=require('@axe-core/playwright').default;
const origin=process.env.BROWSER_TEST_ORIGIN;
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const output=process.env.TOPIC_SCREENSHOTS??'/workspace/artifacts/physcratic-p4b';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
let checks=0;const ok=(condition,message)=>{assert.ok(condition,message);checks++;};const performance=[];
try{
 for(const topic of topicsWithProblems()){
  const expected=problemsInTopic(topic.slug);
  for(const theme of ['light','dark'])for(const width of [375,768,1440]){
   const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,reducedMotion:'reduce'});
   await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
   await context.addInitScript(t=>localStorage.setItem('theme',t),theme);
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
   const response=await page.goto(`${origin}/problems/topics/${topic.slug}`,{waitUntil:'networkidle'});
   ok(response.status()===200,`${topic.slug} 200`);
   const actual=await page.locator('[data-problem-card]').evaluateAll(es=>es.map(e=>e.dataset.problemCard));
   assert.deepEqual(actual.toSorted(),expected.map(p=>p.id).toSorted());checks++;
   ok(new Set(actual).size===topic.count,'no duplicates and correct count');
   ok(await page.locator('h1').count()===1 && await page.locator('h1').textContent()===`${topic.name} problems`,'topic h1');
   ok(await page.getByText(`${topic.count} problems on ${topic.name.toLowerCase()}.`,{exact:true}).count()===1,'visible count');
   ok(await page.locator('main a[href="/problems"]').count()===1,'public library return link');
   ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}/${theme} no overflow`);
   ok(await page.locator('link[rel=canonical]').getAttribute('href')===`https://physcratic.com/problems/topics/${topic.slug}`,'canonical');
   const copy=topicPageCopy(topic.name,topic.count);ok(await page.title()===`${copy.title} | Physcratic`,'title unchanged');
   ok(await page.locator('meta[name=description]').getAttribute('content')===copy.description,'description unchanged');
   ok((await page.locator('meta[property="og:image"]').getAttribute('content')).includes(`/problems/topics/${topic.slug}/opengraph-image`),'OG image route preserved');
   await page.keyboard.press('Tab');ok(await page.evaluate(()=>document.activeElement.textContent.includes('Skip to content')),'skip first');await page.keyboard.press('Enter');
   ok(await page.evaluate(()=>document.activeElement.id==='main-content'),'skip focuses main');
   const open=page.locator('[data-problem-card]').first().getByRole('link',{name:/^Open problem/});await open.focus();
   ok(await open.evaluate(e=>{const s=getComputedStyle(e);return s.outlineStyle!=='none'||s.boxShadow!=='none';}),'visible reader focus');
   const metrics=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
   performance.push({topic:topic.slug,width,theme,elements:await page.locator('*').count(),scriptMs:metrics.ScriptDuration*1000,taskMs:metrics.TaskDuration*1000});
   const axe=await new AxeBuilder({page}).analyze();ok(!axe.violations.some(v=>['serious','critical'].includes(v.impact)),JSON.stringify(axe.violations));
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${output}/after-${topic.slug}-${width}-${theme}.png`});
   for(const kind of ['arena','archive']){const p=expected.find(p=>p.kind===kind);if(!p)continue;await page.locator(`a[href="${p.path}"]`).click();await page.waitForURL(origin+p.path);ok((await page.locator('main h1').textContent()).length>0,`${kind} reader navigates`);await page.goBack();await page.locator('[data-problem-card]').first().waitFor();}
   ok(!errors.length,errors.join(';'));await context.close();
  }
  const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto(`${origin}/problems/topics/${topic.slug}`);
  await writeFile(`${output}/${topic.slug}-server.html`,await page.content());
  for(const p of expected)ok(await page.locator(`main a[href="${p.path}"]`).count()===1,`${topic.slug} SSR ${p.id}`);
  for(const id of retiredPracticeIds)ok(await page.locator(`a[href="/dashboard/problems/${id}"]`).count()===0,'no retired links');
  const robots=page.locator('meta[name=robots]');ok(!await robots.count()||!/noindex|none/i.test(await robots.getAttribute('content')),'indexable');
  const graph=JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent());ok(JSON.stringify(graph).includes('ItemList'),'structured data');
  await page.locator(`[data-problem-card] a[href="${expected[0].path}"]`).click();await page.waitForURL(origin+expected[0].path);checks++;
  await context.close();
 }
 ok((await fetch(origin+'/problems/topics/no-such-topic')).status===404,'invalid slug 404');
 const xml=await(await fetch(origin+'/sitemap.xml')).text();ok((xml.match(/<loc>/g)??[]).length===139,'139 sitemap URLs including the approved Mechanics guide');
 await writeFile(`${output}/performance.json`,JSON.stringify(performance,null,2));
 console.log(`topics.browser: ${checks} checks passed; counts ${JSON.stringify(topicsWithProblems())}`);
}finally{await browser.close();}
