// Real Next production HTML/assets and public APIs on the existing disposable session fixture.
// Only Blob bytes are injected. Auth, publication, SSR, PDF.js worker and browser rendering are real.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createProblemAuthoringApi} from '../lib/problem-authoring-api.ts';
import {createAuthorMediaApi} from '../lib/author-media-api.ts';
import {newProblem} from '../lib/problem-authoring-editor.ts';
import {authorMediaPath} from '../lib/author-media.ts';
import {memoryAuthorStorage,statementPdfFixture} from './author-media-fixtures.ts';
export async function runPdfStudioProduction({origin,pool,owner,sessionCookie}) {
 assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
 const tools=createRequire(join(process.env.AUTHORING_BROWSER_TOOLS,'package.json')),{chromium}=tools('playwright'),{default:AxeBuilder}=tools('@axe-core/playwright');
 const deps={pool,user:async()=>({id:owner,emailVerified:true}),origin:r=>r.headers.get('origin')===origin,storage:memoryAuthorStorage().storage};
 const api=createProblemAuthoringApi(deps),media=createAuthorMediaApi(deps),input=newProblem(),partId=crypto.randomUUID(),pdf=statementPdfFixture();
 Object.assign(input.content,{title:'Moving Cart',estimatedDifficulty:'1200',provenance:{kind:'original',source:'',rightsDeclaration:'Synthetic owned fixture'},sections:[{id:crypto.randomUUID(),title:'',blocks:[],parts:[{id:partId,label:'a',blocks:[],answerMode:'manual'}]}]});
 input.privateParts=[{partId,key:{kind:'manual'},hints:[],solution:[]}];
 const request=body=>new Request(origin+'/api/authored-problems/drafts',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
 const created=await api('create',request(input));assert.equal(created.status,201);const id=(await created.json()).problemId;
 let statement,secret;
 for(const purpose of ['statement-pdf','solution-pdf']) {
  const form=new FormData();form.set('purpose',purpose);form.set('file',new File([pdf],purpose+'.pdf',{type:'application/pdf'}));
  const r=await media('upload',new Request(origin+'/api',{method:'POST',headers:{origin},body:form}),id);assert.equal(r.status,201);const file=await r.json();input.content.attachments.push({id:file.id,purpose});if(purpose==='statement-pdf')statement=file.id;else secret=file.id;
 }
 assert.equal((await api('update',request({version:1,...input}),id)).status,200);
 const publication=await api('publish',request({version:2}),id);assert.equal(publication.status,200);const revision=(await publication.json()).revision.id;
 const path='/dashboard/authored/'+id,response=await fetch(origin+path),html=await response.text();assert.equal(response.status,200);assert.match(html,/noindex/);assert.equal(html.includes(authorMediaPath(id,statement,revision).replaceAll('&','&amp;')),true);assert.equal(html.includes(secret),false);
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try {
  const nojs=await browser.newContext({javaScriptEnabled:false});const staticPage=await nojs.newPage();await staticPage.goto(origin+path);await staticPage.getByRole('link',{name:'Download statement PDF 1',exact:true}).waitFor();await nojs.close();
  for(const width of [375,1440])for(const theme of ['light','dark']) {
   const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await context.addInitScript(theme=>localStorage.setItem('theme',theme),theme);
   await page.route('**/api/authored-problems/'+id+'/media/'+statement+'*',route=>route.fulfill({status:200,contentType:'application/pdf',headers:{'cache-control':'private, no-store','content-disposition':'attachment; filename="statement.pdf"','content-security-policy':"sandbox; default-src 'none'"},body:pdf}));
   await page.goto(origin+path);const read=page.getByRole('button',{name:'Read statement PDF 1',exact:true});await read.focus();await page.keyboard.press('Enter');
   await page.getByText('Synthetic statement page one',{exact:true}).waitFor();await page.locator('[data-pdf-rendered=true]').waitFor();
   await page.getByRole('button',{name:'Next page',exact:true}).focus();await page.keyboard.press('Enter');await page.getByText('Synthetic statement page two',{exact:true}).waitFor();
   await page.waitForFunction(theme=>document.documentElement.classList.contains('dark')===(theme==='dark'),theme);assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('dark')),theme==='dark');assert.equal(await page.locator('.react-pdf__Page__textContent').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(result.violations.filter(v=>['serious','critical'].includes(v.impact)),[]);assert.deepEqual(errors,[]);
   if(process.env.PDF_STUDIO_PRODUCTION_SCREENSHOTS){await mkdir(process.env.PDF_STUDIO_PRODUCTION_SCREENSHOTS,{recursive:true});await page.screenshot({path:join(process.env.PDF_STUDIO_PRODUCTION_SCREENSHOTS,`pdf-studio-${width}-${theme}.png`),fullPage:true});}
   await context.close();console.log(`PASS production PDF Studio ${width}px ${theme}: real SSR/noindex, lazy worker, selectable text, keyboard pages, overflow and axe`);
  }
  assert.equal((await fetch(origin+authorMediaPath(id,secret,revision))).status,404);
  if(process.env.PDF_STUDIO_SWEEP === '1') for(const cookie of ['',sessionCookie]) {
    const child=spawn(process.execPath,['tests/solve-contrast.browser.mjs'],{stdio:'inherit',env:{...process.env,SWEEP:'1',BROWSER_TEST_ORIGIN:origin,SESSION_COOKIE:cookie}});
    assert.equal(await new Promise(resolve=>child.on('close',resolve)),0,cookie?'Signed-in sweep':'Guest sweep');
  }
 } finally {await browser.close();await api('unpublish',request({version:3}),id);}
}
