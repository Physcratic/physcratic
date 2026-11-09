// Real browser HTTP requests to production API/grader factories on disposable PostgreSQL.
// Viewer cookies are synthetic. No claim of live Better Auth or UI integration (B2B).
// AUTHORING_BROWSER_TOOLS=/external/tools CHROMIUM_PATH=/usr/bin/chromium bash scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server tests/practice-check.browser.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';
import { createPracticeCheckApi } from '../lib/practice-check-api.ts';
import { practiceCheckCatalog } from '../lib/practice-check-catalog.ts';
import { handleArchiveGrade } from '../lib/archive-grading-request.ts';
import { isAllowedSubmissionOrigin } from '../lib/submission-security.ts';
const require=createRequire(join(process.env.AUTHORING_BROWSER_TOOLS||'/tmp/physcratic-editor-test','package.json'));
const {chromium}=require('playwright');
const target=new URL(process.env.AUTHORING_TEST_DATABASE_URL||'http://invalid');
assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/physcratic_authoring_test');
const schema='practice_browser_'+randomUUID().replaceAll('-','');
const admin=new Pool({connectionString:target.href});await admin.query(`CREATE SCHEMA ${schema}`);
const pool=new Pool({connectionString:target.href,options:`-c search_path=${schema},public`,max:5});
let origin,browser,server;
const api=createPracticeCheckApi({pool,user:async request=>{
  const id=request.headers.get('cookie')?.match(/viewer=([ABU])/u)?.[1];
  return id?{id,emailVerified:id!=='U'}:null;
},origin:request=>isAllowedSubmissionOrigin(request,[origin])});
const metadata=practiceCheckCatalog().find(p=>p.metadata.problemId==='incline').metadata;
const body=value=>({problemId:'incline',version:metadata.version,answers:[{partId:'answer',latex:value}],idempotencyKey:randomUUID()});
async function cookie(context,user){await context.clearCookies();if(user)await context.addCookies([{name:'viewer',value:user,url:origin}]);}
async function call(page,path,input,account='A'){return page.evaluate(async({path,input,account})=>{
  const response=await fetch(path,input?{method:'POST',headers:{'Content-Type':'application/json','X-Practice-Account':account},body:JSON.stringify(input)}:{headers:{'X-Practice-Account':account}});
  return {status:response.status,cache:response.headers.get('cache-control'),vary:response.headers.get('vary'),body:await response.json()};
},{path,input,account});}
try{
  await pool.query('CREATE TABLE "user"(id text PRIMARY KEY); INSERT INTO "user" VALUES(\'A\'),(\'B\'),(\'U\')');
  await pool.query('BEGIN;'+await readFile('migrations/0017_practice_checks.up.sql','utf8')+'COMMIT;');
  server=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,origin);
      if(url.pathname.startsWith('/api/')){
        const chunks=[];for await(const c of req)chunks.push(c);
        const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(typeof v==='string')headers.set(k,v);
        const request=new Request(url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
        const response=url.pathname==='/api/archive-grade'?await handleArchiveGrade(request,[origin]):await api(url.pathname==='/api/practice-progress'?'progress':req.method==='POST'?'submit':'history',request);
        res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
      }
      res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="en"><title>Practice check API test</title><body><h1>Practice checks</h1></body></html>');
    }catch(error){res.writeHead(500);res.end(String(error));}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const context=await browser.newContext(),page=await context.newPage();await page.goto(origin);
  const guestBody=body('4.9');delete guestBody.idempotencyKey;
  const guest=await call(page,'/api/archive-grade',guestBody);assert.equal(guest.status,200);assert.equal(guest.body.results[0].status,'correct');
  assert.equal((await call(page,'/api/practice-checks',body('4.9'))).status,401);
  await cookie(context,'U');assert.equal((await call(page,'/api/practice-checks',body('4.9'))).status,403);
  await cookie(context,'A');const wrong=await call(page,'/api/practice-checks',body('1'));
  assert.equal(wrong.status,201);assert.equal(wrong.body.attempt.results[0].status,'incorrect');assert.equal(wrong.cache,'private, no-store');assert.equal(wrong.vary,'Cookie, X-Practice-Account');
  let progress=await call(page,'/api/practice-progress');assert.equal(progress.body.progress[0].status,'in-progress');
  const correctBody=body('4.9'),correct=await call(page,'/api/practice-checks',correctBody);assert.equal(correct.status,201);assert.equal(correct.body.saved,true);
  const replay=await call(page,'/api/practice-checks',correctBody);assert.equal(replay.status,200);assert.equal(replay.body.attempt.id,correct.body.attempt.id);
  await page.reload();progress=await call(page,'/api/practice-progress');assert.equal(progress.body.solvedProblems,1);assert.equal(progress.body.savedChecks,2);assert.equal(progress.body.progress[0].href,'/dashboard/problems/incline');
  await cookie(context,'B');assert.equal((await call(page,'/api/practice-progress')).status,409);assert.equal((await call(page,'/api/practice-checks',body('4.9'))).status,409);
  assert.deepEqual((await call(page,'/api/practice-progress',undefined,'B')).body.progress,[]);assert.deepEqual((await call(page,'/api/practice-checks',undefined,'B')).body.attempts,[]);
  await cookie(context);assert.equal((await call(page,'/api/practice-progress')).status,401);
  const phone=await browser.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true});await cookie(phone,'A');const mobile=await phone.newPage();await mobile.goto(origin);
  const sameAccount=await call(mobile,'/api/practice-progress');assert.equal(sameAccount.body.solvedProblems,1);assert.equal(sameAccount.body.savedChecks,2);
  const foreign=await phone.request.post(origin+'/api/practice-checks',{headers:{origin:'https://attacker.invalid'},data:body('4.9')});assert.equal(foreign.status(),403);
  const forged=await call(mobile,'/api/practice-checks',{...body('4.9'),correct:true});assert.equal(forged.status,400);assert.equal((await call(mobile,'/api/practice-progress')).body.savedChecks,2);
  await phone.close();await context.close();
  console.log('PASS practice-check browser HTTP: guest/verified/unverified, incorrect/correct/replay, reload, second-device read, account/sign-out isolation, private caching, origin and forged-result rejection. Viewer sessions are synthetic.');
}finally{
  await browser?.close();if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();
}
