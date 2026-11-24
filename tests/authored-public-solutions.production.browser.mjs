// Called by the existing production-mode auth/session fixture. No provider credentials.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createProblemAuthoringApi} from '../lib/problem-authoring-api.ts';
import {createAuthorMediaApi} from '../lib/author-media-api.ts';
import {memoryAuthorStorage,statementPdfFixture} from './author-media-fixtures.ts';
export async function runPublicSolutionProduction({pool,origin,userId,cookie}) {
 const tooling=createRequire(join(process.env.AUTHORING_BROWSER_TOOLS||'/workspace/work/p2-browser','package.json')),{chromium}=tooling('playwright');
 await pool.query('BEGIN;'+await readFile('migrations/0020_authored_public_solutions.up.sql','utf8')+'COMMIT');
 const user=async()=>({id:userId,emailVerified:true}),author=createProblemAuthoringApi({pool,user,origin:()=>true}),store=memoryAuthorStorage(),media=createAuthorMediaApi({pool,user,origin:()=>true,storage:store.storage});
 const text=s=>({id:randomUUID(),kind:'text',spans:[{kind:'text',text:s}]});
 const part=randomUUID(),content={title:'Public Solution Qualification',topicTags:[],methodTags:[],estimatedDifficulty:'1200',context:[text('Synthetic public statement')],sections:[{id:randomUUID(),title:'Motion',blocks:[],parts:[{id:part,label:'a',answerMode:'numeric',blocks:[text('Find the momentum.')]}]}],attachments:[],provenance:{kind:'original',source:'',rightsDeclaration:'Synthetic owned material.'}},privateParts=[{partId:part,key:{kind:'numeric',value:987654321,units:'1',absTol:0.00001,relTol:0.000002},hints:[text('PRIVATE_PUBLICATION_HINT_SENTINEL')],solution:[text('A server-rendered derivation uses momentum conservation.'),{id:randomUUID(),kind:'math',latex:'p=mv'}]}];
 const request=body=>new Request(origin+'/api',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
 let response=await author('create',request({content,privateParts}));assert.equal(response.status,201);const draft=await response.json();
 const pdf=statementPdfFixture(),form=new FormData();form.set('purpose','solution-pdf');form.set('file',new File([pdf],'solution.pdf',{type:'application/pdf'}));
 response=await media('upload',new Request(origin+'/api',{method:'POST',headers:{origin},body:form}),draft.problemId);assert.equal(response.status,201);const file=await response.json();content.attachments.push({id:file.id,purpose:'solution-pdf'});
 response=await author('update',new Request(origin+'/api',{method:'PUT',headers:{origin,'content-type':'application/json'},body:JSON.stringify({version:1,content,privateParts})}),draft.problemId);assert.equal(response.status,200);let version=(await response.json()).version;
 const previous=process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED;process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED='true';
 try{response=await author('publish',request({version}),draft.problemId);}finally{if(previous===undefined)delete process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED;else process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED=previous;}
 assert.equal(response.status,200,await response.clone().text());const published=await response.json();version=published.version;
 const url=`${origin}/dashboard/authored/${draft.problemId}`,htmlResponse=await fetch(url),html=await htmlResponse.text();
 assert.equal(htmlResponse.status,200);assert.match(htmlResponse.headers.get('cache-control'),/no-store/);assert.match(html,/<meta name="robots" content="noindex, nofollow"/);
 assert.ok(html.includes('A server-rendered derivation uses momentum conservation.'));assert.ok(html.includes('<math'));assert.ok(html.includes('<noscript>'));
 for(const secret of ['987654321','PRIVATE_PUBLICATION_HINT_SENTINEL','"absTol":','"relTol":'])assert.ok(!html.includes(secret),secret);
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{
   const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:900}}),page=await nojs.newPage();await page.goto(url);
   await page.getByText('A server-rendered derivation uses momentum conservation.',{exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'Open or download Solution PDF 1',exact:true}).count(),1);assert.ok(await page.locator('math').count()>0);await nojs.close();
   const screenshots=process.env.PUBLIC_SOLUTION_PRODUCTION_SCREENSHOTS||'work/public-solutions-production';await mkdir(screenshots,{recursive:true});
   for(const width of [375,1440])for(const theme of ['light','dark']){
     const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'}),member=await context.newPage();
     await context.addInitScript(theme=>localStorage.setItem('theme',theme),theme);
     await context.addCookies([{name:'better-auth.session_token',value:cookie.slice(cookie.indexOf('=')+1),url:origin}]);
     // Synthetic PDF bytes only. Real server media authorization is covered by PG tests.
     await member.route('**/public-solution/media/**',route=>route.fulfill({status:200,contentType:'application/pdf',body:pdf}));
     await member.goto(url);await member.waitForFunction(dark=>document.documentElement.classList.contains('dark')===dark,theme==='dark');
     await member.getByRole('tab',{name:'Worked solution',exact:true}).click();await member.getByText('A server-rendered derivation uses momentum conservation.',{exact:true}).waitFor();
     await member.waitForFunction(()=>document.querySelector('[data-pdf-rendered="true"]'));await member.getByRole('button',{name:'Next page',exact:true}).click();await member.getByText('Page 2 of 2',{exact:true}).waitFor();await member.getByText('Synthetic statement page two',{exact:true}).waitFor();
     await member.waitForFunction(()=>document.querySelector('[aria-label="Solution PDF 1, page 2"][data-pdf-rendered="true"]'));
     assert.equal(await member.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
     await member.screenshot({path:join(screenshots,`${width}-${theme}.png`),fullPage:true});await context.close();
   }
 }finally{await browser.close();await author('unpublish',request({version}),draft.problemId);}
 console.log('PASS production Next reader: guest SSR MathML/noindex/no-store/no keys, mobile no-JS native solution/PDF links, real signed session, inline PDF pagination (synthetic bytes only).');
}
