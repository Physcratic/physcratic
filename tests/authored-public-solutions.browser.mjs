// Actual components/API/grader + owned disposable PostgreSQL and memory storage only.
import assert from 'node:assert/strict';
import { autoConfirm, setConfirmMode, confirmsAsked } from "./confirm-sheet.mjs";
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFile,mkdtemp,mkdir} from 'node:fs/promises';
import {join,basename,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import {installAchievementFixtures,achievementFixtures,achievementRequest as req,achievementParsed as parsed} from './community-achievement-fixtures.ts';
import {createPublicAuthoredSolutionApi} from '../lib/authored-public-solution-api.ts';
import {createAuthorMediaApi} from '../lib/author-media-api.ts';
import {createAuthoredAttemptApi} from '../lib/authored-attempt-api.ts';
import {createProblemProgressApi} from '../lib/problem-progress-api.ts';
import {publicSolutionPolicy, publicSolutionsEnabled} from '../lib/authored-solution-policy.ts';
import {memoryAuthorStorage,statementPdfFixture,png} from './author-media-fixtures.ts';
const require=createRequire(import.meta.url),tools=createRequire(join(process.env.AUTHORING_BROWSER_TOOLS||'/workspace/work/p2-browser','package.json'));
const {chromium}=tools('playwright'),{default:AxeBuilder}=tools('@axe-core/playwright'),{build}=createRequire(require.resolve('tsx'))('esbuild');
const u=new URL(process.env.AUTHORING_TEST_DATABASE_URL||'http://invalid');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.pathname,'/physcratic_authoring_test');
const admin=new Pool({connectionString:u.href}),schema='public_browser_'+randomUUID().replaceAll('-','');
await admin.query(`CREATE SCHEMA ${schema}`);
const pool=new Pool({connectionString:u.href,options:`-c search_path=${schema},public`,max:10}),store=memoryAuthorStorage();
const screenshotRoot=process.env.PUBLIC_SOLUTION_SCREENSHOTS||join(process.cwd(),'work');
await mkdir(screenshotRoot,{recursive:true});const temp=await mkdtemp(join(screenshotRoot,'public-solutions-browser-'));
let server,browser,origin,problem,version=1,fail=false,failStatement=false;const errors=[],requests=[];
try{
 await installAchievementFixtures(pool);const f=achievementFixtures(pool);await f.user('author');await f.user('student');await f.user('unverified');await f.user('other');
 delete process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED;
 problem=await f.problem('author');
 const legacyId=problem.revision.id;
 const mediaApi=createAuthorMediaApi({...f.deps,storage:store.storage});
 async function upload(purpose,bytes){const form=new FormData();form.set('purpose',purpose);form.set('file',new File([bytes],purpose==='solution-pdf'?'solution.pdf':'solution.png',{type:purpose==='solution-pdf'?'application/pdf':'image/png'}));return(await parsed(await mediaApi('upload',new Request('https://physcratic.test/api',{method:'POST',headers:{origin:'https://physcratic.test','x-test-user':'author'},body:form}),problem.id),201)).id;}
 const document=await upload('solution-pdf',statementPdfFixture()),image=await upload('solution-image',png);
 problem.privateParts[0].solution=[{id:randomUUID(),kind:'text',spans:[{kind:'text',text:'The public derivation follows conservation of momentum.'}]},{id:randomUUID(),kind:'math',latex:'p=mv'},{id:randomUUID(),kind:'image',mediaId:image,alt:'Synthetic solution diagram',caption:'Solution diagram'}];
 problem.content.attachments.push({id:document,purpose:'solution-pdf'});
 const updated=await parsed(await f.author('update',req('author',{version:problem.version,content:problem.content,privateParts:problem.privateParts}),problem.id));version=updated.version;
 await pool.query(`BEGIN; ${await readFile('migrations/0020_authored_public_solutions.up.sql','utf8')} COMMIT`);
 process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED='true';
 const published=await parsed(await f.author('publish',req('author',{version,solutionPolicy:publicSolutionPolicy}),problem.id));problem.revision=published.revision;version=published.version;
 const publicApi=createPublicAuthoredSolutionApi({pool,storage:store.storage});
 const attempts=createAuthoredAttemptApi(f.deps);
 const progressApi=createProblemProgressApi(async()=>Response.json({}, {status:503}),request=>attempts('progress',request));
 const output=await build({entryPoints:['tests/authored-public-solutions-harness.tsx'],outdir:temp,entryNames:'bundle',chunkNames:'lazy-[name]-[hash]',bundle:true,splitting:true,format:'esm',metafile:true,platform:'browser',jsx:'automatic',alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},logLevel:'silent'});
 execFileSync('node_modules/.bin/tailwindcss',['-i','app/globals.css','-o',join(temp,'style.css')],{stdio:'pipe'});
 const assets=new Set(Object.keys(output.metafile.outputs).map(p=>'/'+basename(p)));
 server=createServer(async(incoming,res)=>{try{
  const url=new URL(incoming.url,origin),chunks=[];for await(const chunk of incoming)chunks.push(chunk);
  const who=incoming.headers.cookie?.match(/test_user=([^;]+)/)?.[1];
  const headers=new Headers(incoming.headers);headers.set('origin','https://physcratic.test');if(who)headers.set('x-test-user',who);
  const request=new Request('https://physcratic.test'+url.pathname+url.search,{method:incoming.method,headers,body:['GET','HEAD'].includes(incoming.method)?undefined:Buffer.concat(chunks)});
  let response;
  const path=url.pathname.split('/');
  if(url.pathname==='/api/arena/collection'){
    response=Response.json({problems:[{key:'authored:'+problem.id,kind:'authored',id:problem.id,title:problem.content.title,tags:[],summary:'Community fixture',estimatedDifficulty:'1200',author:null}],nextCursor:null,authoredUnavailable:false,attributionUnavailable:false});
  }
  if(url.pathname==='/api/problem-progress')response=await progressApi(request);
  if(url.pathname.startsWith('/api/authored-problems/')){
    requests.push({path:url.pathname,method:incoming.method,body:Buffer.concat(chunks).toString(),who});
    if(path[4]==='public-solution')response=fail?Response.json({error:'synthetic unavailable'},{status:503}):await publicApi(request,path[3],path[6]);
    else if(path[3]==='drafts')response=await f.author(path[5]==='publish'?'publish':path[5]==='unpublish'?'unpublish':incoming.method==='PUT'?'update':'read',request,path[4]);
    else if(path[4]==='submission-info')response=await attempts('info',request,path[3]);
    else if(path[4]==='attempts')response=await attempts('submit',request,path[3]);
    else response=failStatement?Response.json({error:'synthetic unavailable'},{status:503}):await f.author('public',request,path[3]);
  }
  if(response){res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}
  if(url.pathname==='/pdfjs-dist/build/pdf.worker.min.mjs'){res.setHeader('content-type','text/javascript');res.end(await readFile(require.resolve('pdfjs-dist/build/pdf.worker.min.mjs')));return;}
  if(assets.has(url.pathname)||url.pathname==='/style.css'){res.setHeader('content-type',extname(url.pathname)==='.css'?'text/css':'text/javascript');res.end(await readFile(join(temp,basename(url.pathname))));return;}
  if(url.pathname==='/katex.css'){res.setHeader('content-type','text/css');res.end(await readFile(require.resolve('katex/dist/katex.min.css')));return;}
  if(url.pathname.startsWith('/fonts/')){res.end(await readFile(join(require.resolve('katex/dist/katex.min.css'),'../fonts',basename(url.pathname))));return;}
  if(url.pathname==='/api/auth/get-session'){res.setHeader('content-type','application/json');res.end(JSON.stringify(who?{user:{id:who,emailVerified:who!=='unverified'},session:{userId:who}}:null));return;}
  const draft=url.pathname==='/author'?await parsed(await f.author('read',req('author'),problem.id)):undefined;
  const fixture={problemId:url.searchParams.get('problem')||problem.id,viewer:who?{state:who==='unverified'?'unverified':'verified',id:who}:{state:'guest'},draft,publicSolutionsEnabled:publicSolutionsEnabled()};
  res.setHeader('content-type','text/html');res.end(`<!doctype html><html lang="en" class="${url.searchParams.get('theme')==='dark'?'dark':''}"><head><title>Public solution qualification</title><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/bundle.css"><link rel="stylesheet" href="/katex.css"></head><body><div id="root"></div><script>window.__publicFixture=${JSON.stringify(fixture).replaceAll('<','\\u003c')}</script><script type="module" src="/bundle.js"></script></body></html>`);
 }catch(e){console.error(e);res.statusCode=500;res.end('Synthetic harness error');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 for(const width of [375,1440])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${origin}/?theme=${theme}`);await page.getByRole('tab',{name:'Worked solution',exact:true}).waitFor();
  assert.equal(await page.getByRole('link',{name:'Your previous work',exact:true}).getAttribute('href'),'/dashboard#problem-history');
  assert.equal(await page.getByText('The public derivation follows conservation of momentum.').count(),0,'solution tab starts closed');
  await page.getByRole('tab',{name:'Problem statement',exact:true}).focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
  await page.getByText('The public derivation follows conservation of momentum.').waitFor();
  await page.getByRole('img',{name:'Synthetic solution diagram',exact:true}).waitFor();
  await page.getByRole('group',{name:'Solution PDF 1, page 1',exact:true}).locator('[data-pdf-rendered]').count();
  await page.waitForFunction(()=>document.querySelector('[data-pdf-rendered="true"]'));
  await page.getByRole('button',{name:'Next page',exact:true}).click();await page.getByText('Page 2 of 2',{exact:true}).waitFor();await page.getByText('Synthetic statement page two',{exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('[aria-label="Solution PDF 1, page 2"][data-pdf-rendered="true"]'));
  assert.equal(await page.getByRole('link',{name:'Open or download Solution PDF 1',exact:true}).count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const axe=await new AxeBuilder({page}).analyze();assert.deepEqual(axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]);
  await page.screenshot({path:join(temp,`${width}-${theme}.png`),fullPage:true});
  await context.close();
 }
 const cardStatus=(page,text)=>page.getByRole('article',{name:problem.content.title}).getByText(text,{exact:true});
 const checkArena=async(page,text)=>{
  await page.goto(origin+'/arena');await cardStatus(page,text).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 };
 for(const who of ['student','unverified']){
  const context=await browser.newContext();const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await context.addCookies([{name:'test_user',value:who,url:origin}]);await page.goto(origin);await page.getByRole('tab',{name:'Worked solution',exact:true}).click();await page.getByText('The public derivation follows conservation of momentum.').waitFor();
  if(who==='student'){
    await page.setViewportSize({width:375,height:950});
    await checkArena(page,'No saved attempt');
    await page.getByRole('link',{name:/Open problem/}).click();
    await page.getByRole('tab',{name:'Problem statement',exact:true}).click();
    await page.getByRole('textbox',{name:'Numerical answer',exact:true}).fill('1');await page.getByRole('textbox',{name:'Units',exact:true}).fill('1');await page.getByRole('button',{name:'Submit answer',exact:true}).click();
    await page.getByRole('heading',{name:'Incorrect, saved attempt 1',exact:true}).waitFor();
    assert.equal(await page.getByText(/assistance cannot be verified|unassisted/i).count(),0);
    await checkArena(page,'Saved attempt');
    await page.reload();await cardStatus(page,'Saved attempt').waitFor();
    await context.addCookies([{name:'test_user',value:'other',url:origin}]);
    await page.setViewportSize({width:1440,height:950});
    await checkArena(page,'No saved attempt');
    assert.equal(await cardStatus(page,'Saved attempt').count(),0);
  }
  await context.close();
 }
 {
  const faultContext=await browser.newContext();await faultContext.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw Error('synthetic storage failure')}}));await faultContext.addCookies([{name:'test_user',value:'student',url:origin}]);const faultPage=await faultContext.newPage();await faultPage.goto(origin);
    await faultPage.getByRole('tab',{name:'Problem statement',exact:true}).click();await faultPage.getByRole('textbox',{name:'Numerical answer',exact:true}).fill('42');
    failStatement=true;await faultPage.evaluate(()=>window.dispatchEvent(new Event('focus')));await faultPage.getByText('We could not confirm the current publication. New submissions are paused. Your local work is retained.',{exact:true}).waitFor();
    failStatement=false;await faultPage.getByRole('button',{name:'Recheck publication',exact:true}).click();await faultPage.getByRole('textbox',{name:'Numerical answer',exact:true}).waitFor();assert.equal(await faultPage.getByRole('textbox',{name:'Numerical answer',exact:true}).inputValue(),'42','in-memory answer survives publication failure without storage');
  await faultContext.close();
  const recovery=await browser.newContext(),p=await recovery.newPage();fail=true;await p.goto(origin);await p.getByRole('tab',{name:'Worked solution',exact:true}).click();await p.getByRole('button',{name:'Retry worked solution',exact:true}).waitFor();fail=false;await p.getByRole('button',{name:'Retry worked solution',exact:true}).click();await p.getByText('The public derivation follows conservation of momentum.').waitFor();await recovery.close();
  const empty=await f.problem('author',['numeric'],false);empty.privateParts[0].solution=[];
  const saved=await parsed(await f.author('update',req('author',{version:empty.version,content:empty.content,privateParts:empty.privateParts}),empty.id));
  await parsed(await f.author('publish',req('author',{version:saved.version,solutionPolicy:publicSolutionPolicy}),empty.id));
  const blankContext=await browser.newContext(),blank=await blankContext.newPage();await blank.goto(origin+'/?problem='+empty.id);await blank.getByRole('tab',{name:'Worked solution',exact:true}).click();await blank.getByText('No worked solution has been supplied for this revision.',{exact:true}).waitFor();await blankContext.close();
 }
 delete process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED;
 const context=await browser.newContext();await autoConfirm(context,'manual');const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await context.addCookies([{name:'test_user',value:'author',url:origin}]);await page.goto(origin+'/author');
 await page.getByRole('navigation',{name:'Steps'}).getByRole('button',{name:/^Review/}).click();const publishButton=page.getByRole('button',{name:'Publish new version',exact:true});
 await publishButton.waitFor();
 process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED='true';
 await publishButton.click();
 const sheet=page.getByRole('alertdialog');await sheet.waitFor();assert.match(await sheet.innerText(),/Its statement becomes public/);await sheet.getByRole('button',{name:'Publish',exact:true}).click();
 await page.getByRole('status',{name:'Problem status',exact:true}).filter({hasText:'Reload Problem Studio'}).waitFor();
 assert.deepEqual(JSON.parse(requests.filter(r=>r.path.endsWith('/publish')).at(-1).body),{version});
 assert.equal((await parsed(await f.author('public',req(),problem.id))).id,problem.revision.id);
 assert.equal((await parsed(await f.author('read',req('author'),problem.id))).version,version);
 await page.reload();
 await page.getByRole('navigation',{name:'Steps'}).getByRole('button',{name:/^Review/}).click();await publishButton.waitFor();
 await page.getByRole('button',{name:'Publish new version',exact:true}).click();await sheet.waitFor();await sheet.getByRole('button',{name:'Cancel',exact:true}).click();await sheet.waitFor({state:'detached'});
 await page.waitForTimeout(200);const before=requests.filter(r=>r.path.endsWith('/publish')).length;
 await page.getByRole('button',{name:'Publish new version',exact:true}).click();await sheet.waitFor();assert.match(await sheet.innerText(),/worked solution, including attached files, will be public/);await sheet.getByRole('button',{name:'Publish',exact:true}).click();await page.getByRole('status',{name:'Problem status',exact:true}).filter({hasText:'Published successfully'}).waitFor();
 assert.equal(requests.filter(r=>r.path.endsWith('/publish')).length,before+1);assert.deepEqual(JSON.parse(requests.filter(r=>r.path.endsWith('/publish')).at(-1).body),{version,solutionPolicy:publicSolutionPolicy});
 const current=(await parsed(await f.author('public',req(),problem.id))).id;
 assert.notEqual(current,problem.revision.id);
 await page.goto(origin);await page.getByRole('tab',{name:'Worked solution',exact:true}).click();
 await page.getByText('The public derivation follows conservation of momentum.').waitFor();
 await context.close();
 assert.equal(Number((await pool.query('SELECT count(*) n FROM authored_solution_reveal')).rows[0].n),0);
 assert.equal(requests.some(r=>r.path.includes('/solutions/')&&r.path.endsWith('/view')),false);
 assert.equal((await publicApi(req(undefined,undefined,'GET',`/api?revision=${legacyId}`),problem.id)).status,409);
 assert.deepEqual(errors,[]);
 console.log('PASS public-solutions browser: guest/verified/unverified, inline PDF pages/download, images/math, keyboard, 375/1440 light/dark axe, stale Studio rollout guard, publish without separate consent, private Arena attempt status after reload, no reveal writes.');console.log('Screenshots:',temp);
}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
