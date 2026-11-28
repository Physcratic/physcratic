import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Pool,type PoolClient} from 'pg';
import {createAccountDeletionRoute,accountDeletionEnabled} from './account-deletion/route';
import {createAccountDeletionApi} from './account-deletion/api';
import {createDeletionOperatorApi} from './account-deletion/operator';
import {createAuthorCreditApi} from './author-credit-api';
import {AUTHOR_CREDIT_POLICY_VERSION,authorCreditStatusSchema} from './author-credit-contracts';
import {acknowledgePrivateUpload,preparePrivateUploadReservation} from './private-upload';
import {readCaseRecord,writeCaseRecord} from '../scripts/account-deletion-authorization/case-record.mjs';
const url=process.env.AUTHORING_TEST_DATABASE_URL;
const token=()=>randomUUID().replaceAll('-','')+randomUUID().replaceAll('-','');
const nonce=(value:string)=>createHash('sha256').update(value).digest('hex');
test('account-deletion OFF is fail-closed before private bindings',async()=>{
 let imports=0;const route=createAccountDeletionRoute(()=>false,async()=>{imports++;throw Error('private binding');});
 assert.equal(accountDeletionEnabled({}),false);assert.equal(accountDeletionEnabled({ACCOUNT_DELETION_ENABLED:'TRUE'}),false);
 assert.equal((await route(new Request('https://synthetic.test/api/account-deletion',{method:'POST'}))).status,503);assert.equal(imports,0);
 const actual=await import('../app/api/account-deletion/route');const admin=await import('../app/api/admin/account-deletion/route');
 const previous=process.env.ACCOUNT_DELETION_ENABLED;delete process.env.ACCOUNT_DELETION_ENABLED;
 try{assert.equal((await actual.POST(new Request('https://synthetic.test/api/account-deletion',{method:'POST'}))).status,503);assert.equal((await admin.POST(new Request('https://synthetic.test/api/admin/account-deletion',{method:'POST'}))).status,503);}finally{if(previous!==undefined)process.env.ACCOUNT_DELETION_ENABLED=previous;}
});

test('complete account erasure on actual auth and installed graph, disposable PG only',{skip:!url&&'Use disposable PostgreSQL'},async t=>{
 const target=new URL(url!);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/physcratic_authoring_test');assert.equal(target.search,'');
 const previousBlobRetries=process.env.VERCEL_BLOB_RETRIES;
 Object.assign(process.env,{NODE_ENV:'test',AUTH_EMAIL_TRANSPORT:'memory',VERCEL_BLOB_RETRIES:'0'});
 for(const key of ['VERCEL_ENV','RESEND_API_KEY','RESEND_EMAIL_DOMAIN','BETTER_AUTH_URL','VERCEL_URL','VERCEL_PROJECT_PRODUCTION_URL','AUTHORING_STAGING_BLOB_ENABLED'])delete process.env[key];
 const {betterAuth}=await import('better-auth'),{getMigrations}=await import('better-auth/db/migration'),{verifyPassword}=await import('better-auth/crypto');
 const {createAuthOptions}=await import('./auth-config'),{TERMS_VERSION}=await import('./terms');
 const {getTableConfig,PgDialect}=await import('drizzle-orm/pg-core'),{SQL,is}=await import('drizzle-orm');
 const schema=await import('./db/schema');
 const name='deletion_'+randomUUID().replaceAll('-',''),owner=name+'_owner',ordinary=name+'_ordinary',executor=name+'_executor',staffRole=name+'_staff';
 const loginPassword=token();const admin=new Pool({connectionString:url,max:2});await admin.query(`CREATE ROLE ${owner} NOLOGIN;CREATE ROLE ${ordinary} LOGIN NOINHERIT PASSWORD '${loginPassword}';CREATE ROLE ${executor} LOGIN NOINHERIT PASSWORD '${loginPassword}';CREATE ROLE ${staffRole} LOGIN NOINHERIT PASSWORD '${loginPassword}';CREATE SCHEMA ${name} AUTHORIZATION ${owner}`);
 const connections:Pool[]=[];const connect=(role:string)=>{const login=new URL(url!);if(role!==owner){login.username=role;login.password=loginPassword;}const p=new Pool({connectionString:login.href,options:`-c search_path=${name}${role===owner?' -c role='+owner:''}`,max:5,statement_timeout:20000});connections.push(p);return p;};
 const setup=connect(owner),normal=connect(ordinary),erase=connect(executor),staff=connect(staffRole);
 const origin='http://localhost:3000';
 const buildAuth=(pool:Pool)=>betterAuth(createAuthOptions({pool,defer:task=>{void task();},overrides:{baseURL:origin,secret:'synthetic-account-deletion-test-secret-000000000000',logger:{disabled:true}}}));
 const setupAuth=buildAuth(setup);let auth:ReturnType<typeof buildAuth>;
 try{
  await setup.query(await readFile('migrations/20261031_auth_rate_limit.sql','utf8'));await(await getMigrations(setupAuth.options)).runMigrations();
  // Legacy tables are generated from current ORM column types/defaults, not a reduced owner-only fixture.
  const dialect=new PgDialect();const quote=(s:string)=>'"'+s.replaceAll('"','""')+'"';
  for(const table of [schema.solutionAttempts,schema.solutionEvidence,schema.problemRatings,schema.individualRatings,schema.individualRatingEvents,schema.solutionChecks,schema.practiceAttempts,schema.contests,schema.contestAdmins,schema.contestProblems,schema.contestAttempts,schema.contestRegistrations,schema.contestRatings,schema.archiveProgress,schema.coachingInquiries]){
   const config=getTableConfig(table);const columns=config.columns.map(column=>{
    let value='';if(column.default!==undefined){const d=column.default;value=' DEFAULT '+(is(d,SQL)?dialect.sqlToQuery(d).sql:typeof d==='boolean'?String(d):typeof d==='number'?String(d):"'"+JSON.stringify(d).replace(/^"|"$/g,'').replaceAll("'","''")+"'"+(column.getSQLType()==='jsonb'?'::jsonb':''));}
    return quote(column.name)+' '+column.getSQLType()+(column.notNull?' NOT NULL':'')+value+(column.primary?' PRIMARY KEY':'');
   });
   for(const pk of config.primaryKeys)columns.push('PRIMARY KEY('+pk.columns.map(c=>quote(c.name)).join(',')+')');
   for(const unique of config.uniqueConstraints)columns.push('UNIQUE('+unique.columns.map(c=>quote(c.name)).join(',')+')');
   await setup.query('CREATE TABLE '+quote(config.name)+'('+columns.join(',')+')');
  }
  for(const file of ['0001_problem_authoring','0002_authored_write_limit','0003_author_media','0004_authored_attempts','0005_authored_solution_access','0006_authored_discovery','0007_community_profile','0008_community_profile_media','0009_community_achievements','0010_community_medals','0011_community_medal_showcase','0012_community_problem_stats','0013_community_comments','0014_community_moderation','0015_community_security_s1','0016_contest_participation','0017_practice_checks','0018_account_deletion'])await setup.query(await readFile('migrations/'+file+'.up.sql','utf8'));
  const originals=(await setup.query('SELECT function_oid,definition FROM account_deletion_guard_backup ORDER BY function_oid')).rows;
  await setup.query(await readFile('migrations/0018_account_deletion.down.sql','utf8'));
  for(const original of originals)assert.equal((await setup.query('SELECT pg_get_functiondef($1) AS definition',[original.function_oid])).rows[0].definition,original.definition);
  await setup.query(await readFile('migrations/0018_account_deletion.up.sql','utf8'));
  await setup.query(await readFile('migrations/0019_staff_actions.up.sql','utf8'));
  const beforePublicMigration=(await setup.query("SELECT oid,pg_get_functiondef(oid) AS definition FROM pg_proc WHERE oid='authored_attempt_guard()'::regprocedure")).rows;
  await setup.query('BEGIN;'+await readFile('migrations/0020_authored_public_solutions.up.sql','utf8')+'COMMIT;');
  assert.deepEqual((await setup.query("SELECT oid,pg_get_functiondef(oid) AS definition FROM pg_proc WHERE oid='authored_attempt_guard()'::regprocedure")).rows,beforePublicMigration);

  await setup.query(`GRANT USAGE ON SCHEMA ${name} TO ${ordinary},${executor},${staffRole};GRANT SELECT,INSERT,UPDATE ON "user" TO ${ordinary};GRANT SELECT,INSERT,UPDATE,DELETE ON account,session,verification,"rateLimit" TO ${ordinary};GRANT EXECUTE ON FUNCTION account_deletion_charge(text,text,boolean),account_deletion_receipt(text),account_deletion_execute(text,text,text,text),account_deletion_open_request(text,text,text,text) TO ${executor};GRANT EXECUTE ON FUNCTION account_deletion_charge(text,text,boolean),account_deletion_evidence_control(text,text,text,text,jsonb),account_deletion_cleanup(text,text,text,text,jsonb) TO ${staffRole}`);
  await setup.query('CREATE TABLE physcratic_production_migrations(id text PRIMARY KEY,sha256 text,source_commit text,result text)');
  for(const file of ['preflight.readonly.sql','postflight.readonly.sql']) {
    const inspection=(await readFile('scripts/public-solutions-release/'+file,'utf8')).replaceAll('public.',name+'.').replaceAll(":'runtime_role'","'"+ordinary+"'");
    await setup.query(inspection);
  }
  await setup.query(await readFile('migrations/0021_arena_favourite_key_pattern.up.sql','utf8'));
  await setup.query((await readFile('migrations/0022_b1_profile_signup.up.sql','utf8')).replaceAll('public.',name+'.'));
  await setup.query((await readFile('migrations/0023_author_credit.up.sql','utf8')).replaceAll('public.',name+'.'));
  await setup.query('BEGIN;'+await readFile('migrations/0024_external_medal_verification.up.sql','utf8')+'COMMIT;');
  const routineInventory = `SELECT p.oid,p.proowner,p.proacl,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) AS definition
   FROM pg_proc p WHERE p.pronamespace=$1::regnamespace ORDER BY p.oid`;
  const beforeRoutines = (await setup.query(routineInventory, [name])).rows;
  const completionsMigration = (await readFile('migrations/0025_personal_completions.up.sql', 'utf8')).replaceAll('public.', name + '.');
  await setup.query(`BEGIN; ${completionsMigration} COMMIT;`);
  assert.deepEqual((await setup.query(routineInventory, [name])).rows, beforeRoutines);
  const eraserAcl = `SELECT oid,proowner,proacl,prosecdef,proconfig FROM pg_proc WHERE oid IN
   ('account_deletion_execute(text,text,text,text)'::regprocedure,'account_deletion_cleanup(text,text,text,text,jsonb)'::regprocedure) ORDER BY oid`;
  const beforeErasureAcl = (await setup.query(eraserAcl)).rows;
  const oldPath='solution-evidence/pre-upgrade/'+randomUUID()+'.png';
  await setup.query(`INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt")
   VALUES('pre-upgrade','Synthetic predecessor','pre-upgrade@example.invalid',false,now(),now())`);
  await setup.query(`INSERT INTO solution_evidence(id,"userId",pathname,filename,"mediaType",bytes,sha256)
   VALUES($1,'pre-upgrade',$2,'old.png','image/png',1,repeat('a',64))`,[randomUUID(),oldPath]);
  await setup.query(await readFile('migrations/0026_account_deletion_blockers.up.sql','utf8'));
  assert.deepEqual((await setup.query(eraserAcl)).rows,beforeErasureAcl);
  assert.deepEqual((await setup.query('SELECT provider,token_hash FROM account_deletion_pending_upload WHERE pathname=$1',[oldPath])).rows,
   [{provider:'author',token_hash:null}]);
  await assert.rejects(normal.query("SELECT account_deletion_upload_finished('author','unused',repeat('0',64))"),{code:'42501'});
  await setup.query(`GRANT EXECUTE ON FUNCTION account_deletion_upload_finished(text,text,text) TO ${ordinary}`);
  await setup.query(`GRANT SELECT,INSERT,UPDATE ON community_profile,community_profile_write_limit TO ${ordinary}`);
  auth=buildAuth(normal);
  const credit=createAuthorCreditApi({pool:normal,origin:req=>req.headers.get('origin')===origin,
    user:async req=>(await auth.api.getSession({headers:req.headers}))?.user});
  const creditRequest=(cookie:string,screenAccount:string,body:unknown)=>new Request(origin+'/api/authored-problems/author-credit',{
    method:'PATCH',headers:{origin,cookie,'content-type':'application/json','x-community-account':screenAccount},
    body:JSON.stringify(body),
  });
  await setup.query(`INSERT INTO account_deletion_policy VALUES(true,true,'Synthetic test purpose','Synthetic operator legal approval','Synthetic responsible operator','Synthetic restricted staff access','Synthetic review criteria','Synthetic disposal criteria',interval '1 hour',interval '1 day',interval '1 hour',interval '1 day','TEST-ONLY-NOT-A-PRODUCTION-APPROVAL',clock_timestamp())`);
  const calls=async(path:string,body:unknown,cookie?:string)=>auth.handler(new Request(origin+'/api/auth'+path,{method:'POST',headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)}));
  const cookieAccounts=new Map<string,string>();
  async function user(label:string){await setup.query('DELETE FROM "rateLimit"');const email=label+'@example.invalid',password='synthetic-password-123';await auth.api.signUpEmail({body:{email,password,name:'Synthetic '+label,termsAccepted:true,termsVersion:TERMS_VERSION} as never});await setup.query('UPDATE "user" SET "emailVerified"=true WHERE email=$1',[email]);const response=await calls('/sign-in/email',{email,password});assert.equal(response.status,200,await response.clone().text());const cookie=response.headers.getSetCookie().map(c=>c.split(';')[0]).filter(c=>c.includes('session_token')).join('; ');const id=(await setup.query('SELECT id FROM "user" WHERE email=$1',[email])).rows[0].id as string;cookieAccounts.set(cookie,id);return{id,email,password,cookie};}
  const dependencies=(pool:Pool)=>({pool,session:async(request:Request)=>(await auth.api.getSession({headers:request.headers}))??null,origin:(request:Request)=>request.headers.get('origin')===origin,password:async(id:string,password:string)=>{const {rows}=await normal.query('SELECT password FROM account WHERE "userId"=$1 AND "providerId"=\'credential\'',[id]);const hash=rows[0]?.password;return{hash:hash??'',verified:Boolean(hash)&&await verifyPassword({hash,password})};}});
  const api=createAccountDeletionApi(dependencies(erase));
  const request=(cookie:string,body:unknown,displayed?:string)=>new Request(origin+'/api/account-deletion',{method:'POST',headers:{origin,cookie,'content-type':'application/json',...(displayed?{'x-account-deletion-account':displayed}:cookie?{'x-account-deletion-account':cookieAccounts.get(cookie)!}:{})},body:JSON.stringify(body)});
  const counts=async(id:string)=>(await setup.query('SELECT (SELECT count(*)::int FROM "user" WHERE id=$1) AS users,(SELECT count(*)::int FROM account WHERE "userId"=$1) AS credentials,(SELECT count(*)::int FROM session WHERE "userId"=$1) AS sessions',[id])).rows[0];
  const {createProblemAuthoringApi}=await import('./problem-authoring-api'),{createAuthoredAttemptApi}=await import('./authored-attempt-api'),{createPracticeCheckApi}=await import('./practice-check-api'),{practiceCheckCatalog}=await import('./practice-check-catalog'),{createAuthoredAttributionApi}=await import('./authored-attribution-api');
  type Actor=Awaited<ReturnType<typeof user>>;
  const rawRequest=(body:unknown)=>new Request(origin+'/api',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
  const document=()=>{const part=randomUUID();return{content:{title:'Synthetic Motion',topicTags:[],methodTags:[],estimatedDifficulty:'1200',context:[{id:randomUUID(),kind:'text',spans:[{kind:'text',text:'Find the displacement.'}]}],sections:[{id:randomUUID(),title:'Motion',blocks:[],parts:[{id:part,label:'A',answerMode:'numeric',blocks:[]}]}],attachments:[],provenance:{kind:'original',source:'',rightsDeclaration:'Synthetic owned content.'}},privateParts:[{partId:part,key:{kind:'numeric',value:2,units:'',absTol:0.01,relTol:0},hints:[],solution:[{id:randomUUID(),kind:'text',spans:[{kind:'text',text:'Published solution to preserve.'}]}]}]};};
  async function publication(actor:Actor,publicConsent=false){const factory=createProblemAuthoringApi({pool:setup,user:async()=>({id:actor.id,emailVerified:true}),origin:()=>true});const input=document();const created=await factory('create',rawRequest(input));assert.equal(created.status,201,await created.clone().text());const draft=await created.json();const priorPublicFlag=process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED;if(publicConsent)process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED='true';let response:Response;try{response=await factory('publish',rawRequest({version:1,...(publicConsent?{publicSolutionConsent:true}:{})}),draft.problemId);}finally{if(priorPublicFlag===undefined)delete process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED;else process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED=priorPublicFlag;}assert.equal(response.status,200,await response.clone().text());return{problemId:draft.problemId,revision:(await response.json()).revision,partId:input.privateParts[0].partId};}
  async function authoredCheck(actor:Actor,p:Awaited<ReturnType<typeof publication>>){const factory=createAuthoredAttemptApi({pool:setup,user:async()=>({id:actor.id,emailVerified:true}),origin:()=>true});const response=await factory('submit',rawRequest({revisionId:p.revision.id,partId:p.partId,answer:{kind:'numeric',value:2,units:''},idempotencyKey:randomUUID()}),p.problemId);assert.equal(response.status,201,await response.clone().text());return response.json();}
  async function practiceCheck(actor:Actor){const metadata=practiceCheckCatalog().find(e=>e.metadata.problemId==='arena-mind-the-gap')!.metadata;const factory=createPracticeCheckApi({pool:setup,user:async()=>({id:actor.id,emailVerified:true}),origin:()=>true});const response=await factory('submit',new Request(origin+'/api/practice-checks',{method:'POST',headers:{origin,'content-type':'application/json','X-Practice-Account':actor.id},body:JSON.stringify({problemId:metadata.problemId,version:metadata.version,answers:[{partId:metadata.parts[0].id,latex:'0'}],idempotencyKey:randomUUID()})}));assert.equal(response.status,201,await response.clone().text());return response.json();}
  async function deleted(actor:Actor,recovery=token()){const response=await api(request(actor.cookie,{confirmation:'DELETE MY ACCOUNT',password:actor.password,requestToken:recovery}));if(response.status===503){const session=await auth.api.getSession({headers:new Headers({cookie:actor.cookie})});const proof=await dependencies(erase).password(actor.id,actor.password);await erase.query('SELECT account_deletion_execute($1,$2,$3,$4)',[actor.id,session!.session.token,proof.hash,nonce(recovery)]);}return response;}
  const operator=createDeletionOperatorApi(dependencies(staff),{del:async()=>{}});
  async function op(actor:Actor,action:string,payload:Record<string,unknown>){const response=await operator(new Request(origin+'/api/admin/account-deletion',{method:'POST',headers:{origin,cookie:actor.cookie,'content-type':'application/json'},body:JSON.stringify({password:actor.password,action,payload:{accessPurpose:'Synthetic case-specific operation',...payload}})}));assert.equal(response.status,200,await response.clone().text());return(await response.json()).result;}
  async function adminUser(label:string){const actor=await user(label);await setup.query("INSERT INTO community_staff(user_id,role,reason) VALUES($1,'admin','Synthetic operator appointment')",[actor.id]);return actor;}
  async function adjudicate(subject:Actor,first:Actor,second:Actor){const inventory=await op(first,'inventory',{subjectId:subject.id});for(const record of inventory){const retained=record.relation_name==='community_comment_evidence';const prepared=await op(first,'prepare',{subjectId:subject.id,relation:record.relation_name,key:record.record_key,digest:record.digest,retainFields:retained?['body']:[],replacement:record.relation_name==='contest'?{creators:['Another contributor']}:{},purpose:retained?'active-report':'erase',necessity:'Synthetic active case necessity',legalBasis:'Synthetic reviewed test basis only',responsibleOperator:'Synthetic responsible operator',reviewCriteria:'Synthetic review criteria',disposalCriteria:'Synthetic disposal criteria',reviewAt:new Date(Date.now()+1800000).toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString()});const denied=await operator(new Request(origin+'/api/admin/account-deletion',{method:'POST',headers:{origin,cookie:first.cookie,'content-type':'application/json'},body:JSON.stringify({password:first.password,action:'approve',payload:{accessPurpose:'Synthetic self approval denied',id:prepared.id}})}));assert.equal(denied.status,403);await op(second,'approve',{id:prepared.id});}return inventory;}
  await t.test('actual login roles cannot escalate, create trusted objects, delete users or inspect private deletion state',async()=>{
   for(const [pool,role] of [[normal,ordinary],[erase,executor],[staff,staffRole]] as const){
    assert.deepEqual((await pool.query('SELECT session_user,current_user')).rows[0],{session_user:role,current_user:role});
    for(const privileged of [owner,executor,staffRole].filter(candidate=>candidate!==role))await assert.rejects(pool.query('SET ROLE '+privileged),{code:'42501'});
    await assert.rejects(pool.query('CREATE TABLE forbidden_deletion_object(id int)'),{code:'42501'});
    await assert.rejects(pool.query('SELECT * FROM account_deletion_receipt_store'),{code:'42501'});
    await assert.rejects(pool.query('DELETE FROM "user" WHERE false'),{code:'42501'});
   }
   await assert.rejects(normal.query("SELECT account_deletion_execute('subject','session','proof','nonce')"),{code:'42501'});
   await assert.rejects(erase.query("SELECT account_deletion_cleanup('actor','session','proof','claim','{}')"),{code:'42501'});
   await assert.rejects(staff.query("SELECT account_deletion_execute('subject','session','proof','nonce')"),{code:'42501'});
  });
  await t.test('guest, unverified, bad-origin, malformed and expired requests cannot delete',async()=>{
   const a=await user('boundary-a');const input={confirmation:'DELETE MY ACCOUNT',password:a.password,requestToken:token()};
   assert.equal((await api(request('',input))).status,401);
   const crossOrigin=request(a.cookie,input);crossOrigin.headers.set('origin','https://untrusted.invalid');assert.equal((await api(crossOrigin)).status,403);
   assert.equal((await api(new Request(origin+'/api/account-deletion',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{'}))).status,400);
   await setup.query('UPDATE "user" SET "emailVerified"=false WHERE id=$1',[a.id]);assert.equal((await api(request(a.cookie,input))).status,403);
   await setup.query('UPDATE "user" SET "emailVerified"=true WHERE id=$1',[a.id]);await setup.query('UPDATE session SET "expiresAt"=now()-interval \'1 second\' WHERE "userId"=$1',[a.id]);assert.equal((await api(request(a.cookie,input))).status,401);
   assert.deepEqual(await counts(a.id),{users:1,credentials:1,sessions:0});
   assert.equal((await setup.query('SELECT count(*)::int AS n FROM account_deletion_request WHERE user_id=$1',[a.id])).rows[0].n,0);
  });
  await t.test('expired and account-switched signed sessions cannot claim credit or charge quota',async()=>{
   const a=await user('credit-session-a'),b=await user('credit-session-b');
   const claim={action:'claim',handle:'session_author'};
   assert.equal((await credit(creditRequest(b.cookie,a.id,claim))).status,409);
   await setup.query(`UPDATE session SET "expiresAt"=now()-interval '1 second' WHERE "userId"=$1`,[a.id]);
   assert.equal((await credit(creditRequest(a.cookie,a.id,claim))).status,401);
   for(const table of ['community_profile','community_profile_write_limit'])
    assert.equal((await setup.query(`SELECT count(*)::int AS n FROM ${table} WHERE user_id=ANY($1)`,[[a.id,b.id]])).rows[0].n,0);
  });
  await t.test('fresh signed session, confirmation and current password erase auth atomically and replay without auth',async()=>{
   const a=await user('basic-a'),b=await user('basic-b');const recovery=token();const beforeB=await counts(b.id);
   assert.equal((await api(request(b.cookie,{confirmation:'DELETE MY ACCOUNT',password:b.password,requestToken:token()},a.id))).status,409);assert.deepEqual(await counts(b.id),beforeB);assert.equal((await setup.query('SELECT count(*)::int AS n FROM account_deletion_rate WHERE user_id=$1',[b.id])).rows[0].n,0);
   assert.equal((await api(request(a.cookie,{confirmation:'DELETE MY ACCOUNT',password:'wrong',requestToken:recovery}))).status,403);
   assert.equal((await api(request(a.cookie,{confirmation:'DELETE MY ACCOUNT',password:a.password,requestToken:recovery,userId:b.id}))).status,400);
   const response=await api(request(a.cookie,{confirmation:'DELETE MY ACCOUNT',password:a.password,requestToken:recovery}));assert.equal(response.status,200,await response.clone().text());const receipt=await response.json();assert.equal(receipt.state,'complete');assert.deepEqual(await counts(a.id),{users:0,credentials:0,sessions:0});assert.equal((await setup.query('SELECT count(*)::int AS n FROM account_deletion_request WHERE user_id=$1',[a.id])).rows[0].n,0);assert.deepEqual(await counts(b.id),beforeB);
   const replay=await api(request('',{requestToken:recovery}));assert.equal(replay.status,200);assert.deepEqual(await replay.json(),receipt);
   const conflict=await api(request(b.cookie,{confirmation:'DELETE MY ACCOUNT',password:b.password,requestToken:recovery}));assert.equal(conflict.status,403);assert.deepEqual(await counts(b.id),beforeB);
  });
  await t.test('external awards, evidence references and badge selections erase without an object cleanup job',async()=>{
   const student=await user('external-medal-erasure');
   await setup.query("INSERT INTO community_profile(user_id,handle) VALUES($1,'external_erasure')",[student.id]);
   const award=(await setup.query("SELECT * FROM community_external_medal_award($1,'IPhO','gold',2025,'ID','','synthetic-erasure')",[student.id])).rows[0];
   const medal='medal:'+award.medal_id;
   await setup.query('INSERT INTO community_badge_selection(user_id,badge_ids) VALUES($1,$2)',[student.id,[medal]]);
   const jobs=()=>setup.query('SELECT id FROM account_deletion_outbox ORDER BY id');
   const before=await jobs();
   assert.equal((await deleted(student)).status,200);
   assert.deepEqual(await counts(student.id),{users:0,credentials:0,sessions:0});
   assert.equal((await setup.query('SELECT id FROM community_external_medal WHERE id=$1',[award.medal_id])).rowCount,0);
   assert.equal((await setup.query('SELECT medal_id FROM community_external_medal_audit WHERE medal_id=$1',[award.medal_id])).rowCount,0);
   assert.equal((await setup.query('SELECT id FROM community_external_approved_medal WHERE id=$1',[medal])).rowCount,0);
   assert.equal((await setup.query('SELECT user_id FROM community_badge_selection WHERE user_id=$1',[student.id])).rowCount,0);
   assert.deepEqual((await jobs()).rows,before.rows);
  });

  await t.test('private answers/drafts/practice erased while licensed publication and other students remain',async()=>{
   const a=await user('graph-a'),b=await user('graph-b');const owned=await publication(a),uncertain=await publication(a),foreign=await publication(b);
   const ownAuthorization=randomUUID(),foreignAuthorization=randomUUID();for(const [p,who,generation] of [[owned,a,ownAuthorization],[foreign,b,foreignAuthorization]] as const)await setup.query('INSERT INTO authored_solution_permission(problem_id,revision_id,part_id,approved_by,authorization_id,version,enabled) VALUES($1,$2,$3,$4,$5,1,true)',[p.problemId,p.revision.id,p.partId,who.id,generation]);
   for(const [who,p,generation] of [[a,foreign,foreignAuthorization],[b,owned,ownAuthorization]] as const)await setup.query('INSERT INTO authored_solution_reveal(id,user_id,problem_id,revision_id,part_id,authorization_id) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),who.id,p.problemId,p.revision.id,p.partId,generation]);
   await authoredCheck(b,owned);await authoredCheck(b,uncertain);await authoredCheck(a,foreign);await practiceCheck(a);await practiceCheck(b);
   await setup.query('INSERT INTO account_deletion_publication(problem_id,continuing_display_authorized,rights_basis,review_reference,reviewed_revision_id) VALUES($1,true,$2,$3,$4)',[owned.problemId,'Synthetic existing licence','TEST-REVIEW',owned.revision.id]);
   const privateFactory=createProblemAuthoringApi({pool:setup,user:async()=>({id:a.id,emailVerified:true}),origin:()=>true});const draft=await privateFactory('create',rawRequest(document()));assert.equal(draft.status,201);const privateId=(await draft.json()).problemId;
   const mediaId=randomUUID(),path='author-media/'+a.id+'/'+mediaId+'.png';await setup.query("INSERT INTO author_media(id,problem_id,purpose,pathname,filename,media_type,bytes,sha256,state) VALUES($1,$2,'statement-image',$3,'private.png','image/png',1,$4,'ready')",[mediaId,privateId,path,'a'.repeat(64)]);
   const beforeOther=(await setup.query('SELECT to_jsonb(t) AS row FROM authored_attempt t WHERE user_id=$1 ORDER BY id',[b.id])).rows;
   const publicOwned=await publication(a,true);
   const writeCredit=async(body:unknown)=>{
    const res=await credit(creditRequest(a.cookie,a.id,body));
    assert.equal(res.status,200,await res.clone().text());
    return authorCreditStatusSchema.parse(await res.json());
   };
   const handle='erased_author';
   const claimed=await writeCredit({action:'claim',handle});
   assert.equal(claimed.credit,'inactive');
   const agree=(revision:string|null)=>writeCredit({action:'acknowledge',handle,policyVersion:AUTHOR_CREDIT_POLICY_VERSION,revision});
   const active=await agree(claimed.revision);
   const inactive=await writeCredit({action:'withdraw',revision:active.revision});
   assert.equal(inactive.credit,'inactive');
   assert.deepEqual((await setup.query('SELECT state,published_revision_id FROM authored_problem WHERE id=$1',[owned.problemId])).rows[0],
    {state:'published',published_revision_id:owned.revision.id});
   assert.equal((await agree(inactive.revision)).credit,'active');
   const response=await deleted(a);assert.equal(response.status,200,await response.clone().text());const receipt=await response.json();assert.equal(receipt.state,'database-erased-cleanup-pending');assert.equal(receipt.pendingObjects,1);
   assert.equal((await setup.query('SELECT count(*)::int AS n FROM authored_attempt WHERE user_id=$1',[a.id])).rows[0].n,0);assert.equal((await setup.query('SELECT count(*)::int AS n FROM practice_check_attempt WHERE user_id=$1',[a.id])).rows[0].n,0);
   assert.equal((await setup.query('SELECT count(*)::int AS n FROM authored_draft WHERE problem_id=ANY($1)',[[owned.problemId,uncertain.problemId,privateId]])).rows[0].n,0);
   assert.equal((await setup.query('SELECT count(*)::int AS n FROM authored_problem WHERE id=$1',[privateId])).rows[0].n,0);assert.deepEqual((await setup.query('SELECT to_jsonb(t) AS row FROM authored_attempt t WHERE user_id=$1 ORDER BY id',[b.id])).rows,beforeOther);
   const publicRead=createProblemAuthoringApi({pool:setup,user:async()=>null,origin:()=>true});assert.equal((await publicRead('public',new Request(origin),owned.problemId)).status,200);assert.equal((await publicRead('public',new Request(origin),uncertain.problemId)).status,404);
   assert.equal((await setup.query('SELECT count(*)::int AS n FROM community_profile WHERE user_id=$1',[a.id])).rows[0].n,0);
   assert.equal((await credit(creditRequest(a.cookie,a.id,{action:'claim',handle}))).status,401);
   const attribution=await createAuthoredAttributionApi(setup,()=>false)({problemId:owned.problemId,revisionId:owned.revision.id});assert.equal(attribution.status,200);assert.equal((await attribution.json()).author.displayName,'Deleted user');
   assert.equal((await setup.query('SELECT count(*)::int AS n FROM authored_revision_private_part WHERE revision_id=$1',[owned.revision.id])).rows[0].n,1);
   assert.equal((await setup.query('SELECT count(*)::int AS n FROM authored_solution_reveal WHERE user_id=$1',[a.id])).rows[0].n,0);assert.equal((await setup.query('SELECT count(*)::int AS n FROM authored_solution_reveal WHERE user_id=$1',[b.id])).rows[0].n,1);assert.equal((await setup.query('SELECT approved_by FROM authored_solution_permission WHERE authorization_id=$1',[ownAuthorization])).rows[0].approved_by,'__physcratic_deleted_principal_v1__');
   assert.equal((await setup.query('SELECT solution_policy FROM authored_revision WHERE id=$1',[publicOwned.revision.id])).rows[0].solution_policy,'public-solutions-v1');
   assert.equal((await publicRead('public',new Request(origin),publicOwned.problemId)).status,404,'unapproved continuing display remains withdrawn after erasure');
   const principal='__physcratic_deleted_principal_v1__';await assert.rejects(setup.query(`INSERT INTO session(id,"userId",token,"expiresAt","createdAt","updatedAt") VALUES($1,$2,$3,now()+interval '1 hour',now(),now())`,[randomUUID(),principal,token()]));
  });
  await t.test('sequential and concurrent erasure preserves independent reports with distinct anonymous subjects', async () => {
   const reporter=await user('shared-reporter'), first=await adminUser('shared-report-preparer'), second=await adminUser('shared-report-approver');
   const preserved=await counts(reporter.id);
   for (const concurrent of [false,true]) {
    const a=await user('reported-a-'+concurrent), b=await user('reported-b-'+concurrent);
    const subjects=[a,b], reports=[randomUUID(),randomUUID()];
    async function report(id:string,subject:Actor) {
     await setup.query(`INSERT INTO community_report(id,reporter_id,request_id,subject,subject_key,reason,details,request_hash)
      VALUES($1,$2,$3,$4,$5,'privacy',$6,repeat('0',64))`,
      [id,reporter.id,randomUUID(),{kind:'profile',handle:'private-handle'},'profile:'+subject.id,subject.email]);
    }
    await report(reports[0],a);
    await report(reports[1],b);
    await assert.rejects(report(randomUUID(),a),{code:'23505',constraint:'community_report_active'});
    await setup.query("UPDATE community_report SET state='triaged',version=2 WHERE id=$1",[reports[1]]);
    for (const subject of subjects) await adjudicate(subject,first,second);
    const deleteAndRecover=async(subject:Actor)=>{
     const recovery=token(), response=await deleted(subject,recovery);
     assert.equal(response.status,200,await response.clone().text());
     assert.deepEqual(await (await api(request('',{requestToken:recovery}))).json(),await response.json());
    };
    if (concurrent) await Promise.all(subjects.map(deleteAndRecover));
    else for (const subject of subjects) await deleteAndRecover(subject);
    for (const [i,subject] of subjects.entries()) {
     assert.deepEqual(await counts(subject.id),{users:0,credentials:0,sessions:0});
     assert.deepEqual((await setup.query('SELECT reporter_id,subject_key,subject,state,version,details FROM community_report WHERE id=$1',[reports[i]])).rows[0],{
      reporter_id:reporter.id,subject_key:'profile:deleted:'+reports[i],subject:{kind:'profile',handle:'deleted-user'},
      state:i===0?'open':'triaged',version:i+1,details:'',
     });
    }
   }
   assert.deepEqual(await counts(reporter.id),preserved);
  });
  await t.test('revision-scoped rights serialize with republication and protect public routes and immutable history', async () => {
   const {createAuthorMediaApi}=await import('./author-media-api');
   const {createPublicAuthoredSolutionApi}=await import('./authored-public-solution-api');
   const {createCardImageApi}=await import('./authored-card-image-api');
   const {createAuthoredGrader}=await import('./authored-grading');
   const {default:sharp}=await import('sharp');
   const png=await sharp({create:{width:32,height:32,channels:3,background:'#336699'}}).png().toBuffer();
   const author=await user('revision-rights-author'), student=await user('revision-rights-student');
   const authorApi=createProblemAuthoringApi({pool:setup,user:async()=>({id:author.id,emailVerified:true}),origin:()=>true});
   const guest=createProblemAuthoringApi({pool:setup,user:async()=>null,origin:()=>true});
   const storagePaths=new Set<string>();
   const storage={
    get:async(path:string)=>storagePaths.has(path)?new Blob([new Uint8Array(png)]):null,
    put:async()=>{assert.fail('No upload expected');},
    del:async()=>{assert.fail('Historical media must survive');},
   };
   const publicMedia=createAuthorMediaApi({pool:setup,user:async()=>null,origin:()=>true,storage});
   const publicSolution=createPublicAuthoredSolutionApi({pool:setup,storage});
   const card=createCardImageApi({pool:setup,storage});
   const grade=createAuthoredGrader({pool:setup,user:async()=>({id:student.id,emailVerified:true})});
   const publicFlag=process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED;
   process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED='true';
   let latch:PoolClient|undefined;
   let publishing:Promise<Response>|undefined, erasing:Promise<unknown>|undefined;
   try {
    async function draft() {
     const response=await authorApi('create',rawRequest(document()));
     assert.equal(response.status,201,await response.clone().text());
     return (await response.json()).problemId as string;
    }
    async function edit(problemId:string,version:number) {
     const input=document(), media=[randomUUID(),randomUUID()];
     const image=(mediaId:string)=>({id:randomUUID(),kind:'image',mediaId,alt:'Synthetic diagram',caption:''});
     for (const [i,kind] of ['statement-image','solution-image'].entries()) {
      const path='author-media/'+author.id+'/'+media[i]+'.png';
      storagePaths.add(path);
      await setup.query(`INSERT INTO author_media(id,problem_id,purpose,pathname,filename,media_type,bytes,sha256,state)
       VALUES($1,$2,$3,$4,'diagram.png','image/png',$5,repeat('a',64),'ready')`,
       [media[i],problemId,kind,path,png.length]);
     }
     const content={...input.content,context:[...input.content.context,image(media[0])],attachments:[{id:media[0],purpose:'statement-image'}]};
     const privateParts=input.privateParts.map(part=>({...part,solution:[...part.solution,image(media[1])]}));
     const edited=await authorApi('update',rawRequest({version,content,privateParts}),problemId);
     assert.equal(edited.status,200,await edited.clone().text());
     return {media,partId:privateParts[0].partId};
    }
    const publish=(problemId:string,version:number)=>authorApi('publish',rawRequest({version,publicSolutionConsent:true}),problemId);
    async function published(problemId:string,version:number) {
     const response=await publish(problemId,version);
     assert.equal(response.status,200,await response.clone().text());
     return (await response.json()).revision.id as string;
    }
    const a=await draft(), b=await draft();
    const aOld=await edit(a,1), aOldRevision=await published(a,2);
    const aNew=await edit(a,3), aNewRevision=await published(a,4);
    const bOld=await edit(b,1), bOldRevision=await published(b,2);
    const bNew=await edit(b,3);
    const allow=async(problemId:string,reviewed:string)=>{
     await setup.query(`INSERT INTO account_deletion_publication(problem_id,continuing_display_authorized,rights_basis,review_reference,reviewed_revision_id)
      VALUES($1,true,'Synthetic revision-specific licence','TEST-EXACT-REVISION',$2)`,[problemId,reviewed]);
    };
    await assert.rejects(allow(b,aNewRevision),{code:'23503'});
    await allow(a,aNewRevision);
    await allow(b,bOldRevision);
    await authoredCheck(student,{problemId:a,revision:{id:aNewRevision},partId:aNew.partId});
    await authoredCheck(student,{problemId:b,revision:{id:bOldRevision},partId:bOld.partId});
    const otherAttempts=(await setup.query('SELECT id,problem_id,revision_id FROM authored_attempt WHERE user_id=$1 ORDER BY id',[student.id])).rows;
    const byRevision=(revision:string)=>new Request(origin+'/?revision='+revision);
    assert.equal((await publicMedia('read',byRevision(aOldRevision),a,aOld.media[0])).status,200);
    assert.equal((await publicSolution(byRevision(bOldRevision),b,bOld.media[1])).status,200);

    // Pause the real publish transaction after it locks the problem, then let
    // erasure queue behind that lock. Neither request relies on a timed sleep.
    await setup.query(`CREATE FUNCTION hold_republication() RETURNS trigger LANGUAGE plpgsql AS $$
     BEGIN IF NEW.state='published' AND OLD.published_revision_id IS DISTINCT FROM NEW.published_revision_id
     THEN PERFORM pg_advisory_xact_lock(hashtextextended(NEW.id::text,26)); END IF; RETURN NEW; END $$;
     CREATE TRIGGER hold_republication BEFORE UPDATE OF published_revision_id ON authored_problem
     FOR EACH ROW EXECUTE FUNCTION hold_republication()`);
    latch=await setup.connect();
    await latch.query('BEGIN');
    await latch.query('SELECT pg_advisory_xact_lock(hashtextextended($1,26))',[b]);
    async function waitForLock(role:string,query:string) {
     for (let attempt=0;attempt<80;attempt++) {
      const result=await admin.query(`SELECT 1 FROM pg_stat_activity WHERE usename=$1 AND wait_event_type='Lock' AND query LIKE $2`,[role,query]);
      if (result.rowCount) return;
      await new Promise(resolve=>setTimeout(resolve,25));
     }
     assert.fail('Expected PostgreSQL lock wait for '+role);
    }
    const authSession=(await auth.api.getSession({headers:new Headers({cookie:author.cookie})}))!;
    const password=(await dependencies(erase).password(author.id,author.password)).hash;
    publishing=publish(b,4);
    await waitForLock(new URL(url!).username,"UPDATE authored_problem SET state='published'%");
    erasing=erase.query('SELECT account_deletion_execute($1,$2,$3,$4) AS receipt',[author.id,authSession.session.token,password,nonce(token())]);
    await waitForLock(executor,'SELECT account_deletion_execute%');
    await latch.query('COMMIT');
    const reply=await publishing;
    assert.equal(reply.status,200,await reply.clone().text());
    const bNewRevision=(await reply.json()).revision.id;
    await erasing;
    assert.deepEqual((await setup.query('SELECT state,published_revision_id FROM authored_problem WHERE id=$1',[b])).rows[0],{state:'archived',published_revision_id:null});
    assert.deepEqual((await setup.query('SELECT prior_revision_id,reviewed_revision_id FROM account_deletion_publication WHERE problem_id=$1',[b])).rows[0],
     {prior_revision_id:bNewRevision,reviewed_revision_id:bOldRevision});
    await assert.rejects(setup.query("UPDATE authored_problem SET state='published',published_revision_id=$2 WHERE id=$1",[b,bNewRevision]),{code:'23514'});
    assert.deepEqual((await setup.query('SELECT id,problem_id,revision_id FROM authored_attempt WHERE user_id=$1 ORDER BY id',[student.id])).rows,otherAttempts);
    assert.equal((await setup.query('SELECT 1 FROM author_revision_media WHERE problem_id=ANY($1)',[[a,b]])).rowCount,8);

    for (const [problem,revision,files,status] of [
     [a,aOldRevision,aOld.media,404],[a,aNewRevision,aNew.media,200],
     [b,bOldRevision,bOld.media,404],[b,bNewRevision,bNew.media,404],
    ] as const) {
     assert.equal((await publicMedia('read',byRevision(revision),problem,files[0])).status,status);
     assert.equal((await card(problem,revision)).status,status);
     const solutionStatus=problem===a&&revision===aOldRevision?409:status;
     assert.equal((await publicSolution(byRevision(revision),problem)).status,solutionStatus);
     assert.equal((await publicSolution(byRevision(revision),problem,files[1])).status,solutionStatus);
    }
    assert.equal((await guest('public',new Request(origin),b)).status,404);
    assert.equal((await guest('public',new Request(origin),a)).status,200);
    assert.equal((await grade({problemId:a,revisionId:aOldRevision,partId:aOld.partId,answer:{kind:'numeric',value:2,units:''}})).reason,'revision-unavailable');
   } finally {
    if (latch) {await latch.query('ROLLBACK');latch.release();}
    await Promise.allSettled([publishing,erasing]);
    await setup.query('DROP TRIGGER IF EXISTS hold_republication ON authored_problem; DROP FUNCTION IF EXISTS hold_republication()');
    if (publicFlag===undefined)delete process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED;else process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED=publicFlag;
   }
  });
  await t.test('late failure rolls back auth, private records and durable cleanup together',async()=>{
   const a=await user('rollback-a'),b=await user('rollback-b');await practiceCheck(a);await setup.query('INSERT INTO archive_progress("userId","taskId",notes) VALUES($1,$2,$3)',[a.id,'synthetic-task','private notes']);
   await setup.query(`CREATE FUNCTION injected_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.id='${a.id}' THEN RAISE EXCEPTION 'Synthetic late failure';END IF;RETURN OLD;END $$;CREATE TRIGGER injected_failure BEFORE DELETE ON "user" FOR EACH ROW EXECUTE FUNCTION injected_failure()`);
   const before=await counts(a.id),other=await counts(b.id),recovery=token();const response=await api(request(a.cookie,{confirmation:'DELETE MY ACCOUNT',password:a.password,requestToken:recovery}));assert.equal(response.status,503);assert.deepEqual(await counts(a.id),before);assert.deepEqual(await counts(b.id),other);assert.equal((await setup.query('SELECT count(*)::int AS n FROM archive_progress WHERE "userId"=$1',[a.id])).rows[0].n,1);assert.equal((await setup.query('SELECT count(*)::int AS n FROM account_deletion_receipt_store WHERE nonce=$1',[nonce(recovery)])).rows[0].n,0);
   await setup.query('DROP TRIGGER injected_failure ON "user";DROP FUNCTION injected_failure()');assert.equal((await deleted(a,recovery)).status,200);
  });
  await t.test('freshness, session revocation, current credential and persistent password limits fail closed',async()=>{
   const a=await user('proof-a');const session=(await auth.api.getSession({headers:new Headers({cookie:a.cookie})}))!;const proof=await dependencies(erase).password(a.id,a.password);
   await setup.query('UPDATE session SET "createdAt"=now()-interval \'11 minutes\' WHERE token=$1',[session.session.token]);assert.equal((await deleted(a)).status,403);
   await setup.query('UPDATE session SET "createdAt"=now()+interval \'1 minute\' WHERE token=$1',[session.session.token]);assert.equal((await deleted(a)).status,403);
   await setup.query('UPDATE session SET "createdAt"=now() WHERE token=$1',[session.session.token]);
   await setup.query('UPDATE account SET password=$2 WHERE "userId"=$1',[a.id,'rotated-credential']);await assert.rejects(erase.query('SELECT account_deletion_execute($1,$2,$3,$4)',[a.id,session.session.token,proof.hash,nonce(token())]),{code:'42501'});
   await setup.query('UPDATE account SET password=$2 WHERE "userId"=$1',[a.id,proof.hash]);await setup.query('DELETE FROM session WHERE token=$1',[session.session.token]);assert.equal((await deleted(a)).status,401);assert.equal((await counts(a.id)).users,1);
   const b=await user('limits-b');for(let n=0;n<3;n++)assert.equal((await api(request(b.cookie,{confirmation:'DELETE MY ACCOUNT',password:'wrong',requestToken:token()}))).status,403);assert.equal((await api(request(b.cookie,{confirmation:'DELETE MY ACCOUNT',password:b.password,requestToken:token()}))).status,429);assert.equal((await counts(b.id)).users,1);
  });
  await t.test('concurrent deletion is idempotent and late FK-free writes cannot resurrect private history',async()=>{
   const a=await user('race-a'),recovery=token(),session=(await auth.api.getSession({headers:new Headers({cookie:a.cookie})}))!,proof=await dependencies(erase).password(a.id,a.password);
   const held=await erase.connect(),late=await setup.connect();try{await held.query('BEGIN');const erased=await held.query('SELECT account_deletion_execute($1,$2,$3,$4) AS receipt',[a.id,session.session.token,proof.hash,nonce(recovery)]);
    let settled=false;const write=late.query('INSERT INTO archive_progress("userId","taskId") VALUES($1,$2)',[a.id,'late-private-write']).then(()=>{settled=true;return null;},error=>{settled=true;return error;});
    await new Promise(resolve=>setTimeout(resolve,50));assert.equal(settled,false);const duplicate=erase.query('SELECT account_deletion_execute($1,$2,$3,$4) AS receipt',[a.id,session.session.token,proof.hash,nonce(recovery)]);await held.query('COMMIT');assert.equal((await write).code,'23503');assert.deepEqual((await duplicate).rows,erased.rows);assert.equal((await setup.query('SELECT count(*)::int AS n FROM archive_progress WHERE "userId"=$1',[a.id])).rows[0].n,0);
   }finally{await held.query('ROLLBACK');held.release();late.release();}
  });
  await t.test('account erasure cascades personal completions and rejects a concurrent mark from a stale session', async () => {
   const { createPersonalCompletionsApi } = await import('./personal-completions-api');
   const executeRoutine = beforeRoutines.find(row => row.definition.includes('FUNCTION '+name+'.account_deletion_execute('));
   assert.ok(executeRoutine?.prosecdef && executeRoutine.proconfig.some((setting: string) => setting.includes('pg_catalog')));
   assert.equal(executeRoutine.proowner,(await setup.query('SELECT oid FROM pg_roles WHERE rolname=$1',[owner])).rows[0].oid);
   for (const pool of [normal, erase, staff]) {
    await assert.rejects(pool.query('SELECT * FROM personal_problem_completion'), { code: '42501' });
    await assert.rejects(pool.query('SELECT * FROM personal_completion_write_limit'), { code: '42501' });
   }
   // Apply the exact reviewed delta in the disposable schema and connect as the real runtime LOGIN.
   const grants = (await readFile('scripts/personal-completions/runtime-grants.review.sql','utf8'))
    .replaceAll('public.', name+'.').replaceAll(':"runtime_role"',ordinary);
   const audit = (await readFile('scripts/personal-completions/runtime-delta.readonly.sql','utf8'))
    .replaceAll("'public'::regnamespace","'"+name+"'::regnamespace")
    .replaceAll(":'runtime_role'","'"+ordinary+"'").replaceAll(":'completion_owner'","'"+owner+"'");
   assert.ok((await setup.query(audit)).rows.length>0);
   await setup.query(`BEGIN; ${grants} COMMIT;`);
   assert.deepEqual((await setup.query(audit)).rows,[]);
   await setup.query(`GRANT SELECT ON personal_problem_completion TO ${executor};
    GRANT SELECT(requests) ON personal_completion_write_limit TO ${staffRole}`);
   assert.deepEqual((await setup.query(audit)).rows.map(row=>[row.kind,row.object]),[
    ['unexpected_grantee','personal_completion_write_limit.requests'],
    ['unexpected_grantee','personal_problem_completion'],
   ]);
   await setup.query(`REVOKE SELECT ON personal_problem_completion FROM ${executor};
    REVOKE SELECT(requests) ON personal_completion_write_limit FROM ${staffRole}`);
   assert.deepEqual((await setup.query(audit)).rows,[]);
   await setup.query(`GRANT SELECT ON authored_problem,authored_revision TO ${ordinary};
    GRANT UPDATE(state) ON authored_problem TO ${ordinary}`);
   await assert.rejects(normal.query('UPDATE personal_problem_completion SET completed_at=now()'), { code: '42501' });
   await assert.rejects(normal.query("INSERT INTO personal_problem_completion(user_id,problem_key,completed_at) VALUES('invalid','arena:arena-mind-the-gap',now())"), { code: '42501' });
   await assert.rejects(normal.query('TRUNCATE personal_problem_completion'), { code: '42501' });
   await assert.rejects(normal.query('DELETE FROM personal_completion_write_limit'), { code: '42501' });
   await assert.rejects(normal.query('DELETE FROM "user" WHERE false'), { code: '42501' });

   const a = await user('completion-erasure-a'), b = await user('completion-erasure-b');
   const published = await publication(b);
   const key = `authored:${published.problemId}`;
   const completionRequest = (actor: Actor, problemKey?: string) => new Request(`${origin}/api/personal-completions`, {
    method: problemKey ? 'PUT' : 'GET', headers: { origin, cookie: actor.cookie, 'x-community-account': actor.id, 'content-type': 'application/json' },
    body: problemKey ? JSON.stringify({ key: problemKey, completed: true }) : undefined,
   });
   const deps = { pool: normal, origin: (req: Request) => req.headers.get('origin') === origin };
   const completions = createPersonalCompletionsApi({ ...deps, user: async req => (await auth.api.getSession({ headers: req.headers }))?.user });
   const aMark = await completions(completionRequest(a, key));
   const bMark = await completions(completionRequest(b, key));
   assert.equal(aMark.status, 200, await aMark.clone().text());
   assert.equal(bMark.status, 200, await bMark.clone().text());
   const otherMark = await bMark.json();
   const session = (await auth.api.getSession({ headers: new Headers({ cookie: a.cookie }) }))!;
   const proof = await dependencies(erase).password(a.id, a.password);
   // Simulate a request that got a real authenticated user before deletion began.
   const stale = createPersonalCompletionsApi({ ...deps, user: async () => session.user });
   const held = await erase.connect();
   let pending: Promise<Response> | undefined;
   try {
    await held.query('BEGIN');
    await held.query('SELECT account_deletion_execute($1,$2,$3,$4)', [a.id, session.session.token, proof.hash, nonce(token())]);
    pending = stale(completionRequest(a, 'arena:arena-mind-the-gap'));
    let waiting = false;
    for (let attempt = 0; attempt < 80 && !waiting; attempt++) {
     const { rows } = await admin.query(`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE usename=$1
       AND wait_event_type='Lock' AND query LIKE '%INSERT INTO personal_completion_write_limit%') AS waiting`, [ordinary]);
     waiting = rows[0].waiting;
     if (!waiting) await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.equal(waiting, true, 'The completion write must wait for the erasure transaction');
    await held.query('COMMIT');
    assert.equal((await pending).status, 401);
   } finally {
    await held.query('ROLLBACK');
    held.release();
    await pending;
   }
   assert.equal((await completions(completionRequest(a))).status, 401);
   assert.equal((await stale(completionRequest(a))).status, 401);
   for (const table of ['personal_problem_completion', 'personal_completion_write_limit']) {
    assert.equal((await setup.query(`SELECT count(*)::int AS n FROM ${table} WHERE user_id=$1`, [a.id])).rows[0].n, 0);
   }
   const other = await completions(completionRequest(b));
   assert.equal(other.status, 200, await other.clone().text());
   const history = await other.json();
   assert.equal(history.count, 1);
   assert.deepEqual(history.items.map((item: { key: string; completedAt: string }) => ({ key: item.key, completedAt: item.completedAt })),
    [{ key, completedAt: otherMark.completedAt }]);
  });
  await t.test('ordinary role cannot erase immutable attempts or forge deletion permits and temp shadowing cannot change privileged tables',async()=>{
   const a=await user('privilege-a');await practiceCheck(a);
   await setup.query(`GRANT DELETE ON practice_check_attempt TO ${ordinary}`);await assert.rejects(normal.query('DELETE FROM practice_check_attempt WHERE user_id=$1',[a.id]));await assert.rejects(normal.query('INSERT INTO account_deletion_mutation VALUES(pg_backend_pid(),txid_current(),0,\'DELETE\',\'{}\',NULL)'));await assert.rejects(normal.query('SELECT account_deletion_permit_delete(\'practice_check_attempt\',\'true\',$1)',[a.id]));
   const conn=await erase.connect();try{await conn.query('CREATE TEMP TABLE account_deletion_policy(approved boolean)');await conn.query('INSERT INTO pg_temp.account_deletion_policy VALUES(false)');const session=(await auth.api.getSession({headers:new Headers({cookie:a.cookie})}))!,proof=await dependencies(erase).password(a.id,a.password);assert.ok((await conn.query('SELECT account_deletion_execute($1,$2,$3,$4) AS receipt',[a.id,session.session.token,proof.hash,nonce(token())])).rows[0].receipt);}finally{conn.release();}
   await assert.rejects(setup.query(await readFile('migrations/0018_account_deletion.down.sql','utf8')),/Populated account deletion/);await setup.query(`REVOKE DELETE ON practice_check_attempt FROM ${ordinary}`);
  });
  await t.test('legacy private history, profile objects, medals and independently owned contest records clean up together',async()=>{
   const a=await user('legacy-a'),b=await user('legacy-b'),first=await adminUser('legacy-op-one'),second=await adminUser('legacy-op-two');
   const legacy=['archive_progress','solution_attempt','solution_evidence','individual_rating','individual_rating_event','solution_check','practice_attempt','contest_admin','contest_attempt','contest_rating','contest_registration'];
   async function seed(actor:Actor){const id=randomUUID();const queries=[
    ['INSERT INTO archive_progress("userId","taskId",notes,answer) VALUES($1,\'synthetic\',\'private notes\',\'private answer\')',[actor.id]],
    ['INSERT INTO solution_attempt(id,"userId","problemId","problemVersion","partId",payload,status,"idempotencyKey") VALUES($1,$2,\'synthetic\',\'v1\',\'a\',\'{}\',\'awaiting-reference\',$3)',[id,actor.id,randomUUID()]],
    ['INSERT INTO solution_evidence(id,"userId",pathname,filename,"mediaType",bytes,sha256) VALUES($1,$2,$3,\'private.png\',\'image/png\',1,$4)',[randomUUID(),actor.id,'solution-evidence/'+actor.id+'/'+id+'.png','a'.repeat(64)]],
    ['INSERT INTO individual_rating("userId") VALUES($1)',[actor.id]],
    ['INSERT INTO individual_rating_event(id,"userId","attemptId","problemId","sourceVersion","ratingVersion","problemRating","beforeRating","afterRating",change,score,"expectedScore") VALUES($1,$2,$3,\'synthetic\',\'v1\',1,1200,1200,1216,16,1,0.5)',[randomUUID(),actor.id,id]],
    ['INSERT INTO solution_check("attemptId","userId","problemId","partId","sourceVersion","ratingVersion",matched,"maxPoints","awardedPoints") VALUES($1,$2,\'synthetic\',\'a\',\'v1\',1,true,1,1)',[id,actor.id]],
    ['INSERT INTO practice_attempt(id,"userId","problemId","idempotencyKey",answer,correct) VALUES($1,$2,\'synthetic\',$3,1,true)',[randomUUID(),actor.id,randomUUID()]],
    ['INSERT INTO contest_admin("userId") VALUES($1)',[actor.id]],
    ['INSERT INTO contest_attempt(id,"userId","contestId","problemId","idempotencyKey",version,answers,results) VALUES($1,$2,\'synthetic\',\'synthetic\',$3,\'v1\',\'[]\',\'[]\')',[randomUUID(),actor.id,randomUUID()]],
    ['INSERT INTO contest_rating(id,"userId","contestId","publicHandle",rating,change) VALUES($1,$2,\'synthetic\',$3,1200,0)',[randomUUID(),actor.id,actor.email]],
    ['INSERT INTO contest_registration("userId","contestId") VALUES($1,\'synthetic\')',[actor.id]]
   ] as [string,unknown[]][];for(const [sql,values] of queries)await setup.query(sql,values);}
   await seed(a);await seed(b);await setup.query('INSERT INTO problem_rating("problemId","sourceVersion","reviewedBy") VALUES(\'synthetic-rating\',\'v1\',$1)',[a.id]);const before=new Map<string,unknown>();for(const table of legacy)before.set(table,(await setup.query('SELECT to_jsonb(t) AS row FROM '+table+' t WHERE "userId"=$1',[b.id])).rows);
   await setup.query('INSERT INTO community_profile(user_id,handle,display_name,bio) VALUES($1,\'legacy_a\',$2,$3)',[a.id,'Private name','Private bio']);const media=randomUUID();await setup.query('INSERT INTO community_profile_media(id,user_id,kind,pathname,bytes,state) VALUES($1,$2,\'avatar\',$3,1,\'active\')',[media,a.id,'community-profile-media/'+media+'.webp']);
   const claim=randomUUID();await setup.query('INSERT INTO community_medal_claim(id,user_id,competition,award,year,country,competition_name,certificate_name,pathname,bytes,sha256) VALUES($1,$2,\'IPhO\',\'gold\',2020,\'\',\'\',$3,$4,1,$5)',[claim,a.id,'Private certificate name','community-medal-proof/'+claim+'.pdf','a'.repeat(64)]);
   // These fixture rows represent objects with independently confirmed terminal writes.
   await setup.query('DELETE FROM account_deletion_pending_upload WHERE pathname=$1 OR pathname IN (SELECT pathname FROM solution_evidence WHERE "userId"=ANY($2))',['community-medal-proof/'+claim+'.pdf',[a.id,b.id]]);
   await setup.query('INSERT INTO contest(id,name,description,"startsAt","durationMinutes","creatorUserId",creators) VALUES(\'owned-contest\',\'Synthetic\',\'Synthetic\',now(),60,$1,$2)',[a.id,JSON.stringify([a.email,'Another contributor'])]);await adjudicate(a,first,second);
   const response=await deleted(a);assert.equal(response.status,200,await response.clone().text());for(const table of legacy){assert.equal((await setup.query('SELECT count(*)::int AS n FROM '+table+' WHERE "userId"=$1',[a.id])).rows[0].n,0,table);assert.deepEqual((await setup.query('SELECT to_jsonb(t) AS row FROM '+table+' t WHERE "userId"=$1',[b.id])).rows,before.get(table),table);}
   assert.equal((await setup.query('SELECT "reviewedBy" FROM problem_rating WHERE "problemId"=\'synthetic-rating\'')).rows[0].reviewedBy,'Deleted user');assert.equal((await setup.query('SELECT count(*)::int AS n FROM community_profile WHERE user_id=$1',[a.id])).rows[0].n,0);assert.equal((await setup.query('SELECT count(*)::int AS n FROM community_medal_claim WHERE id=$1',[claim])).rows[0].n,0);assert.deepEqual((await setup.query('SELECT "creatorUserId",creators FROM contest WHERE id=\'owned-contest\'')).rows[0],{creatorUserId:null,creators:['Another contributor']});
  });
  await t.test('mixed evidence requires independent purpose-bound review, preserves selected evidence and disposes all expired vault fields',async()=>{
   const a=await user('evidence-a'),first=await adminUser('operator-one'),second=await adminUser('operator-two');
   const comment=randomUUID();await setup.query("INSERT INTO community_comment(id,problem_key,user_id,request_id,body) VALUES($1,'arena:arena-mind-the-gap',$2,$3,$4)",[comment,a.id,randomUUID(),'Synthetic case contact evidence-a@example.invalid']);
   const extra=(await setup.query("INSERT INTO community_moderation_audit(actor_id,action,target,version,reason,data) VALUES(NULL,'Synthetic case','unlinked-case',1,$1,'{}') RETURNING id",['Synthetic contact '+a.email])).rows[0].id;await op(first,'identify',{subjectId:a.id,relation:'community_moderation_audit',key:{id:Number(extra)}});
   const failed=await deleted(a);assert.equal(failed.status,409,await failed.clone().text());assert.equal((await counts(a.id)).users,1);
   const inventory=await op(first,'inventory',{subjectId:a.id});assert.ok(inventory.length>=3);await adjudicate(a,first,second);
   const response=await deleted(a);assert.equal(response.status,200,await response.clone().text());assert.equal((await setup.query('SELECT user_id,body FROM community_comment WHERE id=$1',[comment])).rows[0].user_id,null);assert.equal((await setup.query('SELECT body FROM community_comment_evidence WHERE comment_id=$1',[comment])).rows[0].body,'');
   assert.equal((await setup.query('SELECT reason FROM community_moderation_audit WHERE id=$1',[extra])).rows[0].reason,'');assert.equal((await setup.query('SELECT count(*)::int AS n FROM account_deletion_case_link WHERE subject_id=$1',[a.id])).rows[0].n,0);
   const retained=(await setup.query("SELECT id FROM account_deletion_evidence WHERE purpose='active-report' AND retained<>'{}' ORDER BY created_at DESC LIMIT 1")).rows[0].id;
   const view=await op(second,'read',{id:retained});assert.match(view.body,/Synthetic case contact/);
   await assert.rejects(normal.query('SELECT * FROM account_deletion_evidence'));
   await setup.query("UPDATE account_deletion_evidence SET review_at=now()-interval '2 minutes',expires_at=now()-interval '1 minute' WHERE id=$1",[retained]);
   await operator(new Request(origin+'/api/admin/account-deletion',{method:'POST',headers:{origin,cookie:second.cookie,'content-type':'application/json'},body:JSON.stringify({password:second.password,action:'cleanup',payload:{}})}));
   assert.equal((await setup.query('SELECT count(*)::int AS n FROM account_deletion_evidence WHERE id=$1',[retained])).rows[0].n,0);
  });
  await t.test('private-object failure remains pending, retries are idempotent and expired identifiers/paths are physically removed',async()=>{
   const operatorActor=await adminUser('cleanup-operator'),outsider=await user('cleanup-outsider');const pendingBefore=(await setup.query("SELECT count(*)::int AS n FROM account_deletion_outbox WHERE state<>'complete'")).rows[0].n;assert.ok(pendingBefore>=3);let calls=0;const failing=createDeletionOperatorApi(dependencies(staff),{del:async()=>{calls++;throw Error('Synthetic provider outage with private detail');}});
   const command=(actor:Actor)=>new Request(origin+'/api/admin/account-deletion',{method:'POST',headers:{origin,cookie:actor.cookie,'content-type':'application/json'},body:JSON.stringify({password:actor.password,action:'cleanup',payload:{}})});
   assert.equal((await failing(command(outsider))).status,403);const failure=await failing(command(operatorActor));assert.equal(failure.status,200);assert.deepEqual(await failure.json(),{processed:1,completed:false});assert.equal(calls,1);assert.ok((await setup.query("SELECT count(*)::int AS n FROM account_deletion_outbox WHERE state='pending' AND attempts=1 AND last_error='Private object deletion unavailable'")).rows[0].n>0);
   await setup.query('UPDATE account_deletion_outbox SET available_at=now()');const signed=(await auth.api.getSession({headers:new Headers({cookie:operatorActor.cookie})}))!,proof=await dependencies(staff).password(operatorActor.id,operatorActor.password),args=[operatorActor.id,signed.session.token,proof.hash];
   const claim=(await staff.query('SELECT account_deletion_cleanup($1,$2,$3,\'claim\',\'{}\') AS job',args)).rows[0].job;await assert.rejects(staff.query('SELECT account_deletion_cleanup($1,$2,$3,\'complete\',$4)',[...args,{id:claim.id,leaseToken:randomUUID()}]),{code:'42501'});await setup.query('UPDATE account_deletion_outbox SET lease_until=now()-interval \'1 second\' WHERE id=$1',[claim.id]);await assert.rejects(staff.query("SELECT account_deletion_cleanup($1,$2,$3,'complete',$4)",[...args,{id:claim.id,leaseToken:claim.leaseToken}]),{code:'42501'});const takeover=(await staff.query('SELECT account_deletion_cleanup($1,$2,$3,\'claim\',\'{}\') AS job',args)).rows[0].job;assert.equal(takeover.id,claim.id);assert.notEqual(takeover.leaseToken,claim.leaseToken);await assert.rejects(staff.query('SELECT account_deletion_cleanup($1,$2,$3,\'complete\',$4)',[...args,{id:claim.id,leaseToken:claim.leaseToken}]),{code:'42501'});await staff.query('SELECT account_deletion_cleanup($1,$2,$3,\'retry\',$4)',[...args,{id:takeover.id,leaseToken:takeover.leaseToken}]);await setup.query('UPDATE account_deletion_outbox SET available_at=now()');const paths:string[]=[];const success=createDeletionOperatorApi(dependencies(staff),{del:async(provider,path)=>{assert.ok(['author','profile','medal'].includes(provider));assert.ok(!path.includes('..'));paths.push(path);}});
   for(let n=0;n<10;n++){const response=await success(command(operatorActor));assert.equal(response.status,200);if((await response.json()).processed===0)break;}
   assert.equal(paths.length,pendingBefore);assert.equal((await setup.query("SELECT count(*)::int AS n FROM account_deletion_outbox WHERE state<>'complete'")).rows[0].n,0);
   await setup.query("UPDATE account_deletion_receipt_store SET expires_at=now()-interval '1 second';UPDATE account_deletion_access SET expires_at=now()-interval '1 second'");assert.equal((await success(command(operatorActor))).status,200);assert.equal((await setup.query('SELECT count(*)::int AS n FROM account_deletion_outbox')).rows[0].n,0);assert.equal((await setup.query('SELECT count(*)::int AS n FROM account_deletion_receipt_store')).rows[0].n,0);assert.equal((await setup.query('SELECT count(*)::int AS n FROM account_deletion_access')).rows[0].n,0);
  });
  await t.test('erasure waits for terminal writes across all private registries and keeps interrupted obligations', async () => {
   const {createAuthorMediaApi}=await import('./author-media-api');
   const {createProfileMediaApi}=await import('./community/profile-media-api');
   const {default:sharp}=await import('sharp');
   const png=await sharp({create:{width:32,height:32,channels:3,background:'#336699'}}).png().toBuffer();
   const a=await user('delayed-upload-owner'), b=await user('ambiguous-upload-owner');
   const first=await adminUser('upload-case-preparer'), second=await adminUser('upload-case-approver');
   await setup.query(`GRANT SELECT ON authored_draft,author_draft_media,author_revision_media TO ${ordinary};
    GRANT SELECT,INSERT ON author_media,author_media_usage,authored_write_limit,solution_evidence TO ${ordinary};
    GRANT UPDATE(state) ON author_media TO ${ordinary};
    GRANT UPDATE ON author_media_usage,authored_write_limit TO ${ordinary};
    GRANT DELETE ON solution_evidence TO ${ordinary};
    GRANT SELECT,INSERT,UPDATE,DELETE ON community_profile_media TO ${ordinary};
    GRANT SELECT,INSERT,UPDATE ON community_profile_media_limit TO ${ordinary};
    GRANT SELECT,INSERT ON community_medal_claim TO ${ordinary}`);
   const problem=await publication(a);
   await setup.query("INSERT INTO community_profile(user_id,handle) VALUES($1,'ambiguous_upload')",[b.id]);

   async function reserve(sql:string, values:unknown[]) {
    const client=await normal.connect();
    try {
     await client.query('BEGIN');
     const capability=await preparePrivateUploadReservation(client);
     await client.query(sql,values);
     await client.query('COMMIT');
     return capability;
    } finally {await client.query('ROLLBACK');client.release();}
   }
   const medalId=randomUUID(), evidenceId=randomUUID();
   const medalPath='community-medal-proof/'+medalId+'.pdf';
   const evidencePath='solution-evidence/'+b.id+'/'+evidenceId+'.png';
   let profilePath='';
   const profileUpload=createProfileMediaApi({pool:normal,user:async()=>({id:b.id,emailVerified:true}),origin:()=>true,
    storage:{put:async path=>{profilePath=path;throw Error('Synthetic ambiguous PUT acknowledgement');},
     get:async()=>null,del:async()=>{assert.fail('Unresolved upload must keep its registry');}}});
   const ambiguous=await profileUpload('upload',new Request(origin,{method:'PUT',headers:{'content-type':'image/png'},body:new Uint8Array(png)}),'avatar');
   assert.equal(ambiguous.status,503);
   assert.match(profilePath,/^community-profile-media\//);
   assert.equal((await setup.query('SELECT state FROM community_profile_media WHERE pathname=$1',[profilePath])).rows[0].state,'retired');
   // An interrupted process loses its acknowledgement, even if it never sent the PUT.
   await reserve(`INSERT INTO solution_evidence(id,"userId",pathname,filename,"mediaType",bytes,sha256)
    VALUES($1,$2,$3,'evidence.png','image/png',1,repeat('a',64))`,[evidenceId,b.id,evidencePath]);
   await assert.rejects(normal.query('DELETE FROM solution_evidence WHERE id=$1',[evidenceId]),{code:'55000'});
   await reserve(`INSERT INTO community_medal_claim(id,user_id,competition,award,year,country,competition_name,certificate_name,pathname,bytes,sha256)
    VALUES($1,$2,'IPhO','gold',2020,'','','Synthetic proof',$3,1,repeat('a',64))`,[medalId,b.id,medalPath]);
   await adjudicate(b,first,second);

   const objects=new Set<string>();
   let announcePut!:(path:string)=>void, releasePut!:()=>void;
   const putting=new Promise<string>(resolve=>{announcePut=resolve;});
   const paused=new Promise<void>(resolve=>{releasePut=resolve;});
   const uploader=createAuthorMediaApi({
    pool:normal, user:async()=>({id:a.id,emailVerified:true}),origin:()=>true,
    storage:{
     put:async path=>{announcePut(path);await paused;objects.add(path);},
     get:async()=>null,del:async path=>{objects.delete(path);},
    },
   });
   const form=new FormData();
   form.set('purpose','statement-image');
   form.set('file',new File([new Uint8Array(png)],'diagram.png',{type:'image/png'}));
   const upstream=uploader('upload',new Request(origin,{method:'POST',body:form}),problem.problemId);
   try {
    const authorPath=await Promise.race([putting,upstream.then(async response=>assert.fail('Upload did not reach provider: '+await response.text()))]);
    const recoveries=[token(),token()];
    const results=await Promise.all([deleted(a,recoveries[0]),deleted(b,recoveries[1])]);
    const receipts=await Promise.all(results.map(async response=>{
     assert.equal(response.status,200,await response.clone().text());
     return response.json();
    }));
    assert.deepEqual(receipts.map(r=>r.pendingObjects),[1,3]);
    for (const subject of [a,b]) assert.deepEqual(await counts(subject.id),{users:0,credentials:0,sessions:0});
    await assert.rejects(acknowledgePrivateUpload(normal,'author',authorPath,token()),{code:'42501'});
    for (const pool of [normal,erase,staff]) await assert.rejects(pool.query('DELETE FROM account_deletion_pending_upload'),{code:'42501'});
    for (const pool of [erase,staff]) await assert.rejects(acknowledgePrivateUpload(pool,'author',authorPath,token()),{code:'42501'});

    let deletes=0, failDelete=true;
    const cleanupApi=createDeletionOperatorApi(dependencies(staff),{del:async(_provider,path)=>{
     deletes++;
     assert.equal(path,authorPath);
     if(failDelete)throw Error('Synthetic ambiguous DELETE acknowledgement');
     objects.delete(path);
    }});
    const cleanup=async()=>{
     const response=await cleanupApi(new Request(origin+'/api/admin/account-deletion',{method:'POST',
      headers:{origin,cookie:first.cookie,'content-type':'application/json'},body:JSON.stringify({password:first.password,action:'cleanup',payload:{}})}));
     assert.equal(response.status,200,await response.clone().text());
     return response.json();
    };
    assert.deepEqual(await cleanup(),{processed:0});
    assert.equal(deletes,0,'An early missing object must never be acknowledged');
    objects.add(profilePath); // The provider can commit the ambiguous request after the client error.
    releasePut();
    assert.equal((await upstream).status,404);
    assert.equal(objects.has(authorPath),true);
    assert.deepEqual(await cleanup(),{processed:1,completed:false});
    assert.equal((await (await api(request('',{requestToken:recoveries[0]}))).json()).state,'database-erased-cleanup-pending');
    await setup.query('UPDATE account_deletion_outbox SET available_at=now() WHERE pathname=$1',[authorPath]);
    failDelete=false;
    assert.deepEqual(await cleanup(),{processed:1,completed:true});
    assert.equal(objects.has(authorPath),false);
    assert.equal((await (await api(request('',{requestToken:recoveries[0]}))).json()).state,'complete');

    // Elapsed time and a missing object do not resolve cases where the provider
    // outcome was never acknowledged.
    const jobs=(await setup.query("SELECT pathname,state FROM account_deletion_outbox WHERE deletion_id=$1 ORDER BY pathname",[receipts[1].deletionId])).rows;
    assert.deepEqual(jobs,[medalPath,profilePath,evidencePath].sort().map(pathname=>({pathname,state:'pending'})));
    await setup.query("UPDATE account_deletion_pending_upload SET recorded_at=now()-interval '10 days'");
    await setup.query("UPDATE account_deletion_receipt_store SET expires_at=now()-interval '1 second' WHERE id=$1",[receipts[1].deletionId]);
    assert.deepEqual(await cleanup(),{processed:0});
    assert.equal((await setup.query('SELECT 1 FROM account_deletion_outbox WHERE deletion_id=$1',[receipts[1].deletionId])).rowCount,3);
    assert.ok(objects.has(profilePath));
   } finally {
    releasePut();
    await upstream;
   }
  });
  await t.test('0027 verifies owner authorization, scope, no bypass and atomic consumption',async()=>{
   const a=await user('authorization-a'),b=await user('authorization-b');
   const path='solution-evidence/synthetic-authorization/'+randomUUID()+'.png';
   const authMigration=await readFile('migrations/0027_account_deletion_authorization.up.sql','utf8');
   const aclBefore=(await setup.query(eraserAcl)).rows;
   const predecessorDrift=await setup.connect();
   try{
    await assert.rejects(predecessorDrift.query(authMigration.replace('BEGIN;',`BEGIN;
      ALTER TABLE community_external_medal RENAME COLUMN tally_reference TO missing_tally_reference;`)),
    /Install the reviewed 0024 medal reference/);
    await predecessorDrift.query('ROLLBACK');
   }finally{predecessorDrift.release();}
   await setup.query(authMigration);
   assert.deepEqual((await setup.query(eraserAcl)).rows,aclBefore);
   const pendingToken=token(),input={confirmation:'DELETE MY ACCOUNT',password:a.password,requestToken:pendingToken};
   const result=await api(request(a.cookie,input));
   assert.equal(result.status,409);
   const {code,requestId}=await result.json();
   assert.equal(code,'authorization-required');
   assert.match(requestId,/^[a-f0-9-]{36}$/);
   const session=(await auth.api.getSession({headers:new Headers({cookie:a.cookie})}))!;
   const proof=await dependencies(erase).password(a.id,a.password);
   const subjectParams=[a.id,session.session.token,proof.hash,nonce(pendingToken)];
   const executeSql='SELECT account_deletion_execute($1,$2,$3,$4) AS receipt';
   const armSql='SELECT account_deletion_arm($1,$2,$3,$4,$5) AS id';
   const scopeSql='SELECT account_deletion_arm_scope($1) AS snapshot';
   await assert.rejects(erase.query(executeSql,subjectParams),{code:'P0027'});
   await assert.rejects(erase.query(executeSql,[a.id,session.session.token,null,nonce(pendingToken)]),{code:'42501'});
   const scope=async()=>(await setup.query(scopeSql,[requestId])).rows[0].snapshot;
   const expires=new Date(Date.now()+300000);
   const first=await scope(),intent=nonce(token());
   assert.equal(first.subject,a.id);
   for(const pool of [normal,erase,staff]){
    await assert.rejects(pool.query(armSql,[requestId,a.id,first.scopeSha256,intent,expires]),{code:'42501'});
    await assert.rejects(pool.query(scopeSql,[requestId]),{code:'42501'});
    await assert.rejects(pool.query('SELECT account_deletion_disarm($1,$2)',[requestId,intent]),{code:'42501'});
    await assert.rejects(pool.query('SELECT account_deletion_fence_restored_permits()'),{code:'42501'});
   }
   await assert.rejects(setup.query(armSql,[requestId,b.id,first.scopeSha256,intent,expires]),{code:'P0028'});
   await assert.rejects(setup.query(armSql,[requestId,a.id,first.scopeSha256,intent,new Date(0)]));
   assert.equal((await setup.query(armSql,[requestId,a.id,first.scopeSha256,intent,expires])).rows[0].id,requestId);
   assert.equal((await setup.query(armSql,[requestId,a.id,first.scopeSha256,intent,expires])).rows[0].id,requestId);
   await assert.rejects(setup.query(armSql,[requestId,a.id,first.scopeSha256,nonce(token()),expires]));
   await setup.query("INSERT INTO solution_evidence(id,\"userId\",pathname,filename,\"mediaType\",bytes,sha256) VALUES($1,$2,$3,'new.png','image/png',1,repeat('a',64))",[randomUUID(),a.id,path]);
   await assert.rejects(erase.query(executeSql,subjectParams),{code:'P0028'});
   assert.equal((await counts(a.id)).users,1);
   assert.equal((await setup.query('SELECT account_deletion_disarm($1,$2) AS ok',[requestId,nonce(token())])).rows[0].ok,false);
   assert.equal((await setup.query('SELECT account_deletion_disarm($1,$2) AS ok',[requestId,intent])).rows[0].ok,true);
   const firstReviewer=await adminUser('authorization-reviewer-a'),secondReviewer=await adminUser('authorization-reviewer-b');
   await setup.query("INSERT INTO community_comment(id,problem_key,user_id,request_id,body) VALUES($1,'arena:arena-mind-the-gap',$2,$3,'Synthetic mixed case')",[randomUUID(),a.id,randomUUID()]);
   const current=await scope(),second=nonce(token());
   await assert.rejects(setup.query(armSql,[requestId,a.id,current.scopeSha256,intent,expires]),/Arm intent was revoked/);
   assert.equal(current.scope.paths[0].pathname,path);
   assert.equal(current.scope.paths[0].held,true);
   assert.match(current.scope.paths[0].hold_sha256,/^[a-f0-9]{64}$/);
   await setup.query(armSql,[requestId,a.id,current.scopeSha256,second,expires]);
   await assert.rejects(erase.query(executeSql,subjectParams),{code:'P0002'});
   await setup.query("UPDATE account_deletion_pending_upload SET recorded_at=recorded_at+interval '1 second' WHERE pathname=$1",[path]);
   await assert.rejects(erase.query(executeSql,subjectParams),{code:'P0028'});
   await adjudicate(a,firstReviewer,secondReviewer);
   assert.equal((await setup.query('SELECT account_deletion_disarm($1,$2) AS ok',[requestId,second])).rows[0].ok,true);
   const finalScope=await scope(), finalIntent=nonce(token());
   await setup.query(armSql,[requestId,a.id,finalScope.scopeSha256,finalIntent,expires]);
   const locked=await setup.connect();
   try{
    await locked.query('BEGIN');
    await locked.query('LOCK solution_evidence IN ROW EXCLUSIVE MODE');
    await assert.rejects(erase.query(executeSql,subjectParams),{code:'55P03'});
    await locked.query('ROLLBACK');
   }finally{locked.release();}
   const transaction=await erase.connect();
   try{
    await transaction.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    await assert.rejects(transaction.query(executeSql,subjectParams),{code:'25000'});
    await transaction.query('ROLLBACK');
    await transaction.query('BEGIN');
    assert.equal((await transaction.query(executeSql,subjectParams)).rows[0].receipt.deletionId,requestId);
    await transaction.query('ROLLBACK');
   }finally{transaction.release();}
   assert.equal((await counts(a.id)).users,1);
   assert.equal((await setup.query('SELECT arm_intent_sha256 FROM account_deletion_request WHERE id=$1',[requestId])).rows[0].arm_intent_sha256,finalIntent);
   const otherNonce=nonce(token());
   await erase.query('SELECT account_deletion_open_request($1,$2,$3,$4)',[a.id,session.session.token,proof.hash,otherNonce]);
   const [committed,duplicate,competing]=await Promise.all([
    erase.query(executeSql,subjectParams),
    erase.query(executeSql,subjectParams),
    erase.query(executeSql,[a.id,session.session.token,proof.hash,otherNonce]).then(()=>null,e=>e.code),
   ]);
   assert.ok(['P0027','42501'].includes(competing));
   const receipt=committed.rows[0].receipt;
   assert.equal(receipt.deletionId,requestId);
   assert.deepEqual(duplicate.rows[0].receipt,receipt);
   assert.equal((await setup.query('SELECT arm_intent_sha256 FROM account_deletion_receipt_store WHERE id=$1',[requestId])).rows[0].arm_intent_sha256,finalIntent);
   assert.deepEqual(await (await api(request('',{requestToken:pendingToken}))).json(),receipt);
   assert.equal((await setup.query('SELECT 1 FROM account_deletion_request WHERE id=$1',[requestId])).rowCount,0);
   assert.equal((await counts(a.id)).users,0);
   assert.equal((await counts(b.id)).users,1);
   const bSession=(await auth.api.getSession({headers:new Headers({cookie:b.cookie})}))!;
   const bProof=await dependencies(erase).password(b.id,b.password);
   const newRequest=(await erase.query('SELECT account_deletion_open_request($1,$2,$3,$4) AS id',[
    b.id,bSession.session.token,bProof.hash,nonce(token()),
   ])).rows[0].id;
   const bScope=(await setup.query(scopeSql,[newRequest])).rows[0].snapshot;
   await assert.rejects(setup.query(armSql,[newRequest,b.id,bScope.scopeSha256,finalIntent,expires]),/Arm intent was consumed/);
  });
  await t.test('account proof and recovery browser against the actual deletion graph',{skip:process.env.ACCOUNT_DELETION_BROWSER!=='1'},async()=>{
   const {runAccountDeletionBrowser}=await import('../tests/account-deletion.browser.mjs');
   const worker=await adminUser('browser-cleanup-worker');
   await runAccountDeletionBrowser({api,origin,counts,
    arm:async(caseId:string,actor:Actor)=>{
     const snapshot=(await setup.query('SELECT account_deletion_arm_scope($1) AS snapshot',[caseId])).rows[0].snapshot;
     assert.equal(snapshot.subject,actor.id);
     const directory=await mkdtemp(join(tmpdir(),'synthetic-browser-case-'));
     const keyPath=join(directory,'recovered.key'), recordPath=join(directory,'case.enc');
     try {
      await writeFile(keyPath,randomBytes(32),{mode:0o600});
      const record={kind:'account-deletion-arm-intent-v2',...snapshot,tallyReview:{
       subjectFingerprint:snapshot.scope.subjectFingerprint,emailSha256:snapshot.scope.emailSha256,
       reference:'synthetic-browser-review',submissions:[],
      }};
      const digest=writeCaseRecord(recordPath,keyPath,Buffer.from(JSON.stringify(record)));
      assert.deepEqual(readCaseRecord(recordPath,keyPath,digest),record);
      await setup.query('SELECT account_deletion_arm($1,$2,$3,$4,$5)',[
       caseId,actor.id,snapshot.scopeSha256,digest,new Date(Date.now()+300000),
      ]);
     }finally{await rm(directory,{recursive:true,force:true});}
    },
    privateCounts:async(id:string)=>(await setup.query('SELECT (SELECT count(*)::int FROM practice_check_attempt WHERE user_id=$1) AS practice,(SELECT count(*)::int FROM authored_attempt WHERE user_id=$1) AS authored',[id])).rows[0],
    actors:async(label:string)=>{const a=await user(label+'-a'),b=await user(label+'-b');await practiceCheck(a);await practiceCheck(b);const foreign=await publication(b);await authoredCheck(a,foreign);const factory=createProblemAuthoringApi({pool:setup,user:async()=>({id:a.id,emailVerified:true}),origin:()=>true});const response=await factory('create',rawRequest(document()));assert.equal(response.status,201);const draft=await response.json(),id=randomUUID(),path='author-media/'+a.id+'/'+id+'.png';
     const client=await setup.connect();
     let capability:string;
     try {
      await client.query('BEGIN');
      capability=await preparePrivateUploadReservation(client);
      await client.query("INSERT INTO author_media(id,problem_id,purpose,pathname,filename,media_type,bytes,sha256,state) VALUES($1,$2,'statement-image',$3,'private.png','image/png',1,$4,'pending')",[id,draft.problemId,path,'a'.repeat(64)]);
      await client.query('COMMIT');
     }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
     await acknowledgePrivateUpload(normal,'author',path,capability);
     await setup.query("UPDATE author_media SET state='ready' WHERE id=$1",[id]);
     return{a,b};},
    cleanup:async(fail:boolean)=>{await setup.query("UPDATE account_deletion_outbox SET available_at=now() WHERE state='pending'");const service=createDeletionOperatorApi(dependencies(staff),{del:async()=>{if(fail)throw Error('Synthetic provider failure');}});const response=await service(new Request(origin+'/api/admin/account-deletion',{method:'POST',headers:{origin,cookie:worker.cookie,'content-type':'application/json'},body:JSON.stringify({password:worker.password,action:'cleanup',payload:{}})}));assert.equal(response.status,200);const result=await response.json();assert.equal(result.completed,!fail);},
   });
  });
 }finally{if(previousBlobRetries===undefined)delete process.env.VERCEL_BLOB_RETRIES;else process.env.VERCEL_BLOB_RETRIES=previousBlobRetries;await Promise.all(connections.map(p=>p.end()));await admin.query(`DROP SCHEMA ${name} CASCADE;DROP ROLE ${owner};DROP ROLE ${ordinary};DROP ROLE ${executor};DROP ROLE ${staffRole}`);await admin.end();}
});
