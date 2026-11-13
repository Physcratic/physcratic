import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';

const raw=process.env.AUTHORING_TEST_DATABASE_URL;
// This fills one CI gap: a real LOGIN role through singleton app route exports,
// not an owner connection using SET ROLE or an injected session adapter.
test('activation LOGIN binding, real sessions and minimal favourites delta on PG18.7',
 {skip:!raw},async t=>{
 const u=new URL(raw!);
 assert.ok(['postgres:','postgresql:'].includes(u.protocol));
 assert.equal(u.hostname,'127.0.0.1');
 assert.equal(u.pathname,'/physcratic_authoring_test');
 assert.equal(u.search,'');assert.equal(u.hash,'');
 const admin=new Pool({connectionString:raw,max:1});
 admin.on('error',()=>{});
 const name='activation_'+randomUUID().replaceAll('-',''),owner=name+'_owner',runtime=name+'_app';
 let setup:Pool|undefined,app:Pool|undefined,created=false,roles=false;
 try {
  // The shared runner's Unix-socket readiness can precede final TCP startup.
  for(let attempt=0;;attempt++){
   try{await admin.query('SELECT 1');break;}
   catch(error){if(attempt>=20)throw error;await new Promise(resolve=>setTimeout(resolve,100));}
  }
  assert.equal((await admin.query('SHOW server_version_num')).rows[0].server_version_num,'180007');
  await admin.query(`CREATE ROLE ${owner} NOLOGIN; CREATE ROLE ${runtime} LOGIN PASSWORD 'synthetic-activation-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`);roles=true;
  await admin.query(`CREATE DATABASE ${name} OWNER ${owner}`);created=true;
  const databaseUrl=new URL(raw!);databaseUrl.pathname='/'+name;
  setup=new Pool({connectionString:databaseUrl.href,options:`-c role=${owner} -c search_path=public,pg_catalog`,max:1});
  setup.on('error',()=>{});
  const {fixtureDDL,seed}=await import('../authoring-release-production/package/test-fixture.mjs');
  for(const ddl of fixtureDDL())await setup.query(ddl);
  await seed(setup);
  await setup.query(await readFile('migrations/20261031_auth_rate_limit.sql','utf8'));
  const files=JSON.parse(await readFile('scripts/production-upgrade/migrations.json','utf8')) as {id:string;path:string;sha256:string}[];
  for(const file of files)await setup.query(await readFile(file.path,'utf8'));
  await setup.query('CREATE TABLE physcratic_production_migrations(id text PRIMARY KEY,sha256 text,source_commit text,applied_by text,applied_at timestamptz DEFAULT now(),result text)');
  for(const file of files)await setup.query("INSERT INTO physcratic_production_migrations(id,sha256,source_commit,applied_by,result) VALUES($1,$2,$3,current_user,'verified')",[file.id,file.sha256,'1'.repeat(40)]);
  // Reuse only the EXISTING-feature contract, not the template's future community
  // or deletion-service rights. It deliberately excludes ordinary user DELETE.
  const template=await readFile('scripts/production-upgrade/role-grants.sql','utf8');
  const legacy=template.slice(template.indexOf('-- Existing auth:'),template.indexOf('-- Community prerequisites'));
  await setup.query(legacy.replaceAll(':"runtime_role"',runtime));
  await setup.query((await readFile('scripts/activation/favourites-grants.review.sql','utf8')).replaceAll(':"runtime_role"',runtime));
  const audit=await setup.query((await readFile('scripts/activation/runtime-readonly.sql','utf8')).replaceAll(":'runtime_role'","'"+runtime+"'"));
  const auditResults=audit as unknown as {rows:unknown[]}[];
  assert.deepEqual(auditResults.at(-2)?.rows,[],'No effective forbidden column INSERT/UPDATE grants');
  const {hashPassword}=await import('better-auth/crypto');
  await setup.query('UPDATE account SET password=$1 WHERE "userId" IN ($2,$3)',[await hashPassword('synthetic-password-123'),'synthetic-user-0','synthetic-user-1']);
  await setup.query('UPDATE "user" SET "emailVerified"=true WHERE id=$1',['synthetic-user-1']);
  const loginUrl=new URL(databaseUrl);loginUrl.username=runtime;loginUrl.password='synthetic-activation-only';
  const previous={...process.env};
  t.after(()=>{for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);});
  for(const key of Object.keys(process.env))if(/^(VERCEL|RESEND_|COMMUNITY_|ACCOUNT_DELETION_|AUTHORING_STAGING_)/.test(key))delete process.env[key];
  Object.assign(process.env,{NODE_ENV:'test',DATABASE_URL:loginUrl.href,
   BETTER_AUTH_URL:'http://localhost:3000',BETTER_AUTH_SECRET:'synthetic-activation-auth-secret-at-least-32-characters',
   AUTH_EMAIL_TRANSPORT:'memory',COMMUNITY_PROBLEM_STATS_ENABLED:'true'});
  ({pool:app}=await import('../../lib/db'));
  app!.on('error',()=>{});
  assert.deepEqual((await app.query('SELECT current_user,session_user')).rows[0],{current_user:runtime,session_user:runtime});
  const {auth}=await import('../../lib/auth');
  const request=(path:string,cookie='',body?:unknown,account?:string,method=body===undefined?'GET':'POST')=>new Request('http://localhost:3000'+path,{method,headers:{origin:'http://localhost:3000',cookie,'content-type':'application/json',...(account?{'x-community-account':account}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const signIn=async(index:number)=>{
   const response=await auth.handler(request('/api/auth/sign-in/email','',{email:`synthetic-${index}@example.invalid`,password:'synthetic-password-123'}));
   assert.equal(response.status,200,await response.clone().text());
   const cookie=response.headers.getSetCookie().map(v=>v.split(';')[0]).filter(v=>v.includes('session_token')).join('; ');
   assert.ok(cookie);return cookie;
  };
  const a=await signIn(0),b=await signIn(1);
  const stats=await import('../../app/api/community/problem-stats/route');
  const key='arena:arena-mind-the-gap',query='/api/community/problem-stats?'+new URLSearchParams({keys:JSON.stringify([key])});
  const check=async(response:Response,status=200)=>{assert.equal(response.status,status,await response.clone().text());return response.json();};
  await check(await stats.GET(request(query)));
  await check(await stats.PUT(request('/api/community/problem-stats',a,{key,favourite:true},'synthetic-user-0','PUT')));
  assert.equal((await check(await stats.GET(request(query,a,undefined,'synthetic-user-0')))).problems[0].favourite,true);
  // Cookie changes to B before the UI has learned that A is gone. No B state may
  // be read or written for A's stale view, and no B limiter row may be charged.
  await check(await stats.GET(request(query,b,undefined,'synthetic-user-0')),409);
  await check(await stats.PUT(request('/api/community/problem-stats',b,{key,favourite:true},'synthetic-user-0','PUT')),409);
  assert.equal(Number((await setup.query('SELECT count(*) FROM community_favourite_limit WHERE user_id=$1',['synthetic-user-1'])).rows[0].count),0);
  assert.equal((await check(await stats.GET(request(query,b,undefined,'synthetic-user-1')))).problems[0].favourite,false);
  await t.test('existing authoring, grading and contest routes retain access',async()=>{
   const part=randomUUID(),text=()=>({id:randomUUID(),kind:'text',spans:[{kind:'text',text:'Synthetic activation problem'}]});
   const content={title:'Synthetic activation',topicTags:[],methodTags:[],estimatedDifficulty:'1200',
    context:[text()],sections:[{id:randomUUID(),title:'Part',blocks:[],parts:[{id:part,label:'A',answerMode:'numeric',blocks:[text()]}]}],attachments:[],provenance:{kind:'original',source:'',rightsDeclaration:'Synthetic owned work.'}};
   const drafts=await import('../../app/api/authored-problems/drafts/route');
   const made=await check(await drafts.POST(request('/api/authored-problems/drafts',a,{content,privateParts:[{partId:part,key:{kind:'numeric',value:2,units:'1',absTol:0.00001,relTol:0.000002},hints:[],solution:[text()]}]})),201);
   const params={params:Promise.resolve({id:made.problemId})};
   const publish=await import('../../app/api/authored-problems/drafts/[id]/publish/route');
   const published=await check(await publish.POST(request('/api/authored-problems/drafts/'+made.problemId+'/publish',a,{version:made.version}),params));
   const attempts=await import('../../app/api/authored-problems/[id]/attempts/route');
   await check(await attempts.POST(request('/api/authored-problems/'+made.problemId+'/attempts',b,{revisionId:published.revision.id,partId:part,answer:{kind:'numeric',value:2,units:'1'},idempotencyKey:randomUUID()}),params),201);
   const authoredKey='authored:'+made.problemId;
   await check(await stats.PUT(request('/api/community/problem-stats',b,{key:authoredKey,favourite:true},'synthetic-user-1','PUT')));
   const read='/api/community/problem-stats?'+new URLSearchParams({keys:JSON.stringify([authoredKey])});
   assert.equal((await check(await stats.GET(request(read)))).problems[0].solves,1);
   await setup!.query('UPDATE contest SET published=true,"registrationOpen"=true,"startsAt"=clock_timestamp()+interval \'1 day\' WHERE id=$1',['synthetic-contest']);
   const contests=await import('../../app/api/contests/registration/route');
   await check(await contests.POST(request('/api/contests/registration',a,{contestId:'synthetic-contest',registered:true})));
  });
  await t.test('fail closed on missing rights and forbidden privilege checks',async()=>{
   for(const sql of ['UPDATE community_problem_total SET favourites=99','CREATE TABLE public.activation_forbidden(x int)','DELETE FROM authored_attempt',"SELECT account_deletion_execute('x','x','x','x')"])
    await assert.rejects(app!.query(sql),{code:'42501'});
   await setup!.query(`REVOKE SELECT ON community_problem_total FROM ${runtime}`);
   await check(await stats.GET(request(query)),503);
   await setup!.query(`GRANT SELECT ON community_problem_total TO ${runtime}`);
   process.env.COMMUNITY_PROBLEM_STATS_ENABLED='false';
   await check(await stats.GET(request(query)),503);
   assert.equal((await setup!.query('SELECT count(*)::int n FROM community_favourite')).rows[0].n,2);
  });
 } catch(error) {
  console.error('Synthetic activation rehearsal failed:',error);
  throw error;
 } finally {
  await app?.end();await setup?.end();
  if(created)await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
  if(roles)await admin.query(`DROP ROLE ${runtime}; DROP ROLE ${owner}`);
  await admin.end();
 }
});
