import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { signupPolicy } from './signup-policy';
import { signupCaptcha } from './signup-captcha';
import { readFile } from 'node:fs/promises';
import { createProblemAuthoringApi } from './problem-authoring-api';
import { TERMS_VERSION } from './terms';
const url = process.env.AUTH_TEST_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (!['127.0.0.1','localhost'].includes(parsed.hostname) || !parsed.pathname.endsWith('_test')) throw new Error('Disposable loopback *_test database required');
}
test('integrated auth/authoring: schema, real sessions, ownership and identity preservation', {skip: !url}, async t => {
  const admin = new Pool({connectionString:url});
  const schema = `verification_${randomUUID().replaceAll('-','')}`;
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const pool = new Pool({connectionString:url, options:`-c search_path=${schema}`});
  t.after(async()=>{await pool.end();await admin.query(`DROP SCHEMA "${schema}" CASCADE`);await admin.end();});
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {assert.equal(String(input),'https://www.google.com/recaptcha/api/siteverify');return Response.json({success:true,score:.9,action:'signup',hostname:'physcratic.com'});};
  t.after(()=>{globalThis.fetch=originalFetch;});
  const mails: {url:string}[]=[];
  const options = {
    database:pool, ...signupPolicy, baseURL:'https://physcratic.com', secret:'disposable-verification-test-secret-123456789',
    logger:{disabled:true}, plugins:[signupCaptcha({RECAPTCHA_SECRET_KEY:'fixture',RECAPTCHA_ALLOWED_HOSTNAMES:'physcratic.com'})],
    emailAndPassword:{enabled:true,autoSignIn:false,requireEmailVerification:true,minPasswordLength:8,maxPasswordLength:128},
    emailVerification:{sendOnSignUp:true,sendOnSignIn:true,autoSignInAfterVerification:false,expiresIn:3600,sendVerificationEmail:async(mail:{url:string})=>{mails.push(mail);}},
    rateLimit:{enabled:true,storage:'database' as const,window:60,max:60},
  };
  await (await getMigrations(options)).runMigrations();
  for (const name of ['0001_problem_authoring','0002_authored_write_limit','0003_author_media']) await pool.query('BEGIN;\n'+await readFile(`migrations/${name}.up.sql`,'utf8')+'\nCOMMIT;');
  const auth=betterAuth(options);
  let requestNumber = 0;
  const post=(path:string,email:string,extra={})=>auth.handler(new Request(`https://physcratic.com/api/auth${path}`,{method:'POST',headers:{'content-type':'application/json',origin:'https://physcratic.com','x-forwarded-for':`192.0.2.${++requestNumber}`,'x-captcha-response':randomUUID()},body:JSON.stringify({email,password:'fixture-password',name:'QA',termsAccepted:true,termsVersion:TERMS_VERSION,...extra})}));
  const email='known@example.test';
  assert.equal((await post('/sign-up/email',email)).status,200);
  assert.equal(mails.length,1);
  const audit=(await pool.query('SELECT "termsAcceptedVersion", "termsAcceptedAt" FROM "user"')).rows;
  assert.equal((await post('/sign-in/email',email,{password:'wrong-password'})).status,401);
  const unverified=await post('/sign-in/email',email);
  assert.equal((await unverified.json()).code,'EMAIL_NOT_VERIFIED');
  assert.equal(mails.length,2);
  assert.equal((await pool.query('SELECT * FROM session')).rowCount,0);
  const unknown=await post('/sign-in/email','unknown@example.test');
  assert.equal((await unknown.json()).code,'INVALID_EMAIL_OR_PASSWORD');
  const duplicateUnverified=await post('/sign-up/email',email);
  assert.equal(duplicateUnverified.status,200);assert.equal((await duplicateUnverified.json()).token,null);assert.equal(mails.length,2);
  assert.ok((await auth.handler(new Request(mails[0].url))).status<400);
  assert.equal((await pool.query('SELECT * FROM session')).rowCount,0);
  const duplicateVerified=await post('/sign-up/email',email);
  assert.equal(duplicateVerified.status,200);assert.equal((await duplicateVerified.json()).user.emailVerified,false,'synthetic response must not be used as account state');
  assert.equal(mails.length,2);
  for(const address of [email,'unknown@example.test']) {
    const response=await post('/send-verification-email',address);assert.equal(response.status,200);assert.deepEqual(await response.json(),{status:true});
  }
  assert.equal(mails.length,2,'verified/unknown resend never sends');
  await pool.query('UPDATE "user" SET "emailVerified"=false');
  assert.equal((await post('/send-verification-email',email)).status,200);assert.equal(mails.length,3);
  await pool.query('UPDATE "user" SET "emailVerified"=true');
  const login=await post('/sign-in/email',email);assert.equal(login.status,200);assert.ok((await login.json()).token);assert.equal(mails.length,3);
  const cookie=login.headers.get('set-cookie')!.split(';')[0];
  const session=await auth.handler(new Request('https://physcratic.com/api/auth/get-session',{headers:{cookie}}));
  assert.equal((await session.json()).user.emailVerified,true);
  const api=createProblemAuthoringApi({pool,user:async request=>(await auth.api.getSession({headers:request.headers}))?.user,origin:request=>request.headers.get('origin')==='https://physcratic.com'});
  const req=(cookie?:string,body?:unknown)=>new Request('https://physcratic.com/api/authored-problems/drafts',{method:body?'POST':'GET',headers:{origin:'https://physcratic.com','content-type':'application/json',...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});
  assert.equal((await api('list',req())).status,401);
  const part=randomUUID();
  const body={content:{title:'Integrated task',topicTags:['Mechanics'],methodTags:[],estimatedDifficulty:null,context:[{id:randomUUID(),kind:'text',spans:[{kind:'text',text:'Find the displacement.'}]}],sections:[{id:randomUUID(),title:'Motion',blocks:[],parts:[{id:part,label:'a',answerMode:'numeric',blocks:[]}]}],provenance:{kind:'original',source:'',rightsDeclaration:'I own this original work.'},attachments:[]},privateParts:[{partId:part,key:{kind:'numeric',value:12345,units:'m',absTol:0,relTol:0},hints:[],solution:[]}]};
  const owner=(await auth.api.getSession({headers:new Headers({cookie})}))!.user.id;
  const identityBefore=(await pool.query('SELECT * FROM "user" WHERE id=$1',[owner])).rows;
  const hashBefore=(await pool.query('SELECT password FROM account WHERE "userId"=$1',[owner])).rows;
  await pool.query('UPDATE "user" SET "emailVerified"=false WHERE id=$1',[owner]);
  assert.equal((await api('list',req(cookie))).status,403);
  await pool.query('UPDATE "user" SET "emailVerified"=true WHERE id=$1',[owner]);
  const created=await api('create',req(cookie,body));assert.equal(created.status,201,await created.clone().text());const draft=await created.json();
  const foreign='other@example.test';await post('/sign-up/email',foreign);await auth.handler(new Request(mails.at(-1)!.url));
  const otherLogin=await post('/sign-in/email',foreign);const otherCookie=otherLogin.headers.get('set-cookie')!.split(';')[0];
  assert.equal((await api('read',req(otherCookie),draft.problemId)).status,404);
  assert.equal((await api('preview',req(otherCookie),draft.problemId)).status,404);
  assert.equal((await api('publish',req(cookie,{version:1}),draft.problemId)).status,200);
  const published=await api('public',req(),draft.problemId);assert.equal(published.status,200);assert.doesNotMatch(await published.text(),/12345|privateParts|password|termsAccepted/);
  assert.deepEqual((await pool.query('SELECT * FROM "user" WHERE id=$1',[owner])).rows,identityBefore);
  assert.deepEqual((await pool.query('SELECT password FROM account WHERE "userId"=$1',[owner])).rows,hashBefore);
  assert.deepEqual((await pool.query('SELECT "termsAcceptedVersion", "termsAcceptedAt" FROM "user" WHERE email=$1',[email])).rows,audit);
});
