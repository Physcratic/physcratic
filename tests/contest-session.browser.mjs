// Real contest components, SWR and Better Auth client. Synthetic loopback responses only.
// AUTHORING_BROWSER_TOOLS=/path/to/tools CHROMIUM_PATH=/path/to/chromium node tests/contest-session.browser.mjs
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('tsx'))('esbuild');
const {chromium}=process.env.AUTHORING_BROWSER_TOOLS
  ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS,'package.json'))('playwright')
  : require('playwright');
const compiled=await build({entryPoints:['tests/contest-session-harness.tsx'],bundle:true,platform:'browser',jsx:'automatic',write:false,alias:{'@':process.cwd()},define:{'process.env.NODE_ENV':'"production"','process.env':'{}'},logLevel:'silent'});
const now=new Date().toISOString(),startsAt=new Date(Date.now()-60000).toISOString(),endsAt=new Date(Date.now()+3600000).toISOString();
const problem={id:'incline',title:'Fixture problem',topic:'Mechanics',statement:'A synthetic statement.',metadata:{version:'a'.repeat(64),parts:[{id:'a',label:'Part a',kind:'numeric',symbols:[],help:'',unit:'N'}]}};
let user='A',sessionError=false,holdNext=false,releaseRead,registered=true,dashboardReads=0;
const errors=[],checks=[];
const server=createServer((req,res)=>{
  res.setHeader('Cache-Control','private, no-store');
  const json=(body,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
  if(req.url.startsWith('/api/auth/get-session'))return json(sessionError?{message:'Synthetic session outage'}:user?{user:{id:user,name:user,email:user+'@example.invalid',emailVerified:true},session:{id:user,token:'synthetic',userId:user,expiresAt:endsAt,createdAt:now,updatedAt:now}}:null,sessionError?500:200);
  if(req.url==='/api/dashboard'){dashboardReads++;return json({});}
  if(req.url==='/api/contests/registration'){registered=true;return json({registered:true});}
  if(req.url==='/api/contests/admin')return user?json({contests:[],problems:[]}):json({error:'Sign in required'},401);
  if(req.url==='/api/contests/fixture'){
    const identity=user;
    const respond=()=>json({contest:{id:'fixture',name:'Fixture contest',description:'Synthetic contest.',startsAt,durationMinutes:120,problemIds:['incline']},serverNow:now,endsAt,phase:'live',signedIn:!!identity,emailVerified:!!identity,registered:!!identity&&registered,canJoin:!!identity,problems:identity&&registered?[problem]:[],attempts:identity==='A'?[{id:'private-A',problemId:'incline',createdAt:now,answers:[{partId:'a',latex:'PRIVATE_A_ANSWER'}],results:[{partId:'a',status:'correct',message:'Private result A'}]}]:[],earnedParts:identity==='A'?['incline:a']:[],score:identity==='A'?1:0,maxScore:1,submissionCount:identity==='A'?1:0});
    if(holdNext){holdNext=false;releaseRead=respond;return;}
    return respond();
  }
  if(req.url==='/bundle.js'){res.writeHead(200,{'Content-Type':'application/javascript'});return res.end(compiled.outputFiles[0].text);}
  res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html lang="en"><head><title>Contest session test</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  const refresh=()=>page.evaluate(()=>window.refreshContestAccount());
  const viewer=identity=>page.locator('#viewer').getByText(identity,{exact:true}).waitFor();
  const answer=()=>page.locator('#incline-a');
  const noPrivateA=async()=>assert.ok(!(await page.locator('body').innerText()).includes('Private result A'));
  for(const width of [1440,375]){
    user='A';sessionError=false;await page.setViewportSize({width,height:1000});await page.goto(origin);
    await answer().waitFor();assert.equal(await answer().inputValue(),'PRIVATE_A_ANSWER');
    user='B';await refresh();await viewer('B');await page.getByText('0 / 1',{exact:true}).waitFor();
    assert.equal(await answer().inputValue(),'');await noPrivateA();checks.push(`saved answer cleared on account switch at ${width}px`);
    await answer().fill('B_UNSAVED');await refresh();await viewer('B');
    assert.equal(await answer().inputValue(),'B_UNSAVED');checks.push(`same-account refresh preserves draft at ${width}px`);
    // An old account's read may complete after the new account has rendered.
    user='A';holdNext=true;releaseRead=undefined;await refresh();await viewer('A');
    await page.waitForFunction(()=>document.body.innerText.includes('Loading contest'));
    user='B';await refresh();await viewer('B');await answer().waitFor();assert.equal(await answer().inputValue(),'');
    assert.ok(releaseRead,'The old account read must actually be in flight');releaseRead();releaseRead=undefined;
    await page.waitForTimeout(150);assert.equal(await answer().inputValue(),'');await noPrivateA();checks.push(`late prior-account response isolated at ${width}px`);
    user=null;await refresh();await viewer('guest');await noPrivateA();assert.equal(await page.locator('input').count(),0);checks.push(`sign-out clears forms at ${width}px`);
  }
  user='A';await page.goto(origin+'/manage');await page.getByLabel('Contest name',{exact:true}).fill('PRIVATE_ADMIN_DRAFT');
  user='B';await refresh();await viewer('B');await page.getByLabel('Contest name',{exact:true}).waitFor();
  assert.notEqual(await page.getByLabel('Contest name',{exact:true}).inputValue(),'PRIVATE_ADMIN_DRAFT');checks.push('admin draft cleared on account switch');
  sessionError=true;await refresh();await page.getByRole('button',{name:'Retry account',exact:true}).waitFor();assert.equal(await page.locator('input').count(),0);checks.push('failed session check removes private form');
  sessionError=false;await page.getByRole('button',{name:'Retry account',exact:true}).click();await page.getByLabel('Contest name',{exact:true}).waitFor();checks.push('session retry recovers');
  registered=false;user='B';await page.goto(origin);await page.getByRole('button',{name:/Join contest/}).waitFor();
  const readsBefore=dashboardReads;await page.getByRole('button',{name:/Join contest/}).click();await answer().waitFor();
  assert.ok(dashboardReads>readsBefore,'Joining must still invalidate the outer dashboard cache');checks.push('join refreshes dashboard outside private cache');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'PASS',browser:'chromium',checks},null,2));
}finally{releaseRead?.();await browser?.close();await new Promise(r=>server.close(r));}
