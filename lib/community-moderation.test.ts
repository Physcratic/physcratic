import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {evaluateComment,contentPolicy} from './community/content-policy';
import {communityModerationEnabled,createModerationRoute} from './community/moderation-route';
import {communityCommentsEnabled,communityDiscussionReady} from './community/comments-route';
import {createCommentsApi} from './community/comments-api';
import {createModerationApi} from './community/moderation-api';
import {achievementFixtures,achievementMigrations,achievementRequest as req,achievementParsed as parsed} from '../tests/community-achievement-fixtures';
test('token policy: threats, evasion, links, configurable educational allowlist and false positives',()=>{
 for(const text of ['Classical mass assumptions in a dielectric','Scattering, analysis and Gaussian fermions','Niggardly numerical precision','sin(x) = 0; \u03b1 and k are variables'])assert.equal(evaluateComment(text).state,'visible',text);
 for(const text of ['nigger','n!gger','N1GG3R','n\u200bigg\u200ber','n\u00edgger','i will kill you'])assert.equal(evaluateComment(text).state,'blocked',text);
 for(const text of ['n i g g e r','sh!t','evil.arxiv.org','this is shit','https://evil.example/track','javascript:alert(1)','www.arxiv.org.evil.com','word '.repeat(40)])assert.equal(evaluateComment(text).state,'held',text);
 assert.equal(evaluateComment('See https://arxiv.org/abs/1234.5678').state,'visible');assert.equal(evaluateComment('HTTPS://ARXIV.ORG/abs/1').state,'visible');
 assert.equal(evaluateComment('shit',{...contentPolicy,allowWords:new Set(['shit'])}).state,'visible');
 assert.equal(evaluateComment('nigger',{...contentPolicy,allowWords:new Set(['nigger'])}).state,'blocked');
 assert.equal(communityModerationEnabled({}),false);assert.equal(communityModerationEnabled({COMMUNITY_MODERATION_ENABLED:'true'}),false);
 assert.equal(communityCommentsEnabled({COMMUNITY_COMMENTS_ENABLED:'true',NODE_ENV:'production',VERCEL_ENV:'production',COMMUNITY_MODERATION_ENABLED:'true',COMMUNITY_STAFF_ENABLED:'true'}),false);assert.equal(typeof communityDiscussionReady,'function');
});
test('disabled moderation routes do not load missing bindings',async()=>{let loaded=false;for(const area of ['reports','appeals','staff'] as const){const route=createModerationRoute(area,()=>false,async()=>{loaded=true;throw Error();});for(const method of ['GET','POST'])assert.equal((await route(new Request('https://test',{method}))).status,503);}assert.equal(loaded,false);});
const url=process.env.AUTHORING_TEST_DATABASE_URL;
test('0014 moderation/report/appeal permissions, state, audits and races',{skip:!url},async()=>{
 const target=new URL(url!);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/physcratic_authoring_test');const schema='moderation_'+randomUUID().replaceAll('-',''),role=schema+'_runtime';const admin=new Pool({connectionString:url});await admin.query(`CREATE SCHEMA ${schema};CREATE ROLE ${role} NOLOGIN`);const pool=new Pool({connectionString:url,options:`-c search_path=${schema},public`});let runtime:Pool|undefined;
 try{
 await pool.query('CREATE TABLE "user"(id text PRIMARY KEY)');for(const name of [...achievementMigrations,'0010_community_medals','0013_community_comments'])await pool.query('BEGIN;'+await readFile(`migrations/${name}.up.sql`,'utf8')+'COMMIT;');
 const up=await readFile('migrations/0014_community_moderation.up.sql','utf8'),down=await readFile('migrations/0014_community_moderation.down.sql','utf8');for(const sql of [up,down])await pool.query('BEGIN;'+sql+'COMMIT;');const legacy=randomUUID();await pool.query("INSERT INTO \"user\"(id) VALUES('legacy_user')");await pool.query("INSERT INTO community_comment(id,problem_key,user_id,request_id,body) VALUES($1,'arena:arena-mind-the-gap','legacy_user',$2,'Legacy discussion stays private until review')",[legacy,randomUUID()]);await pool.query('BEGIN;'+up+'COMMIT;');assert.equal((await pool.query('SELECT state FROM community_comment_review WHERE comment_id=$1',[legacy])).rows[0].state,'held');
 const f=achievementFixtures(pool),owner=await f.user(),other=await f.user(),mod=await f.user(),reviewer=await f.user(),second=await f.user();await f.user('unverified');
 for(const [id,r]of[[mod,'moderator'],[reviewer,'admin'],[second,'admin']])await pool.query('INSERT INTO community_staff(user_id,role,reason) VALUES($1,$2,\'fixture\')',[id,r]);
 await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role};GRANT SELECT,INSERT ON community_comment,community_report,community_moderation_appeal TO ${role};GRANT UPDATE(body,version,deleted_at) ON community_comment TO ${role};GRANT SELECT,INSERT,DELETE ON community_comment_like,community_comment_spam TO ${role};GRANT UPDATE(last_post) ON community_comment_spam TO ${role};GRANT SELECT,INSERT,UPDATE ON community_comment_limit,community_moderation_limit,community_content_limit TO ${role};GRANT SELECT ON community_comment_review,community_comment_evidence,community_thread_lock,community_moderation_audit,community_profile,authored_problem,authored_revision TO ${role};GRANT UPDATE(id) ON authored_problem TO ${role};GRANT EXECUTE ON FUNCTION community_staff_role_locked(text),community_thread_root(uuid),community_apply_content_policy(uuid,text,text,text[],text),community_moderation_decide(text,text,uuid,integer,integer,text,text,text) TO ${role}`);
 runtime=new Pool({connectionString:url,options:`-c search_path=${schema},public -c role=${role}`});const deps={...f.deps,pool:runtime,ip:()=> 'unknown',profiles:()=>true},comments=createCommentsApi({...deps,moderation:()=>true}),api=createModerationApi(deps);
 const key='arena:arena-mind-the-gap',reset=()=>pool.query('DELETE FROM community_comment_limit;DELETE FROM community_moderation_limit;DELETE FROM community_content_limit');
 const post=(who:string,text:string,parent:string|null=null,requestId:string=randomUUID())=>comments(req(who,{action:'create',key,parent,body:text,requestId}));
 const list=(who?:string)=>comments(req(who,undefined,'GET','/api?'+new URLSearchParams({key})));
 const write=(who:string|undefined,body:unknown,area:'reports'|'appeals'|'staff'='staff')=>api(area,req(who,body));
 const get=(who:string,query:Record<string,string>={},area:'reports'|'appeals'|'staff'='staff')=>api(area,req(who,undefined,'GET','/api?'+new URLSearchParams(query)));
 const detail=async(id:string)=> (await parsed(await get(reviewer,{item:'comment',id}))).record;
 assert.equal((await write(undefined,{})).status,401);assert.equal((await write('unverified',{})).status,403);assert.equal((await get(owner)).status,403);const shadow=await runtime.connect();await shadow.query('CREATE TEMP TABLE community_staff(user_id text,role text)');await shadow.query("INSERT INTO pg_temp.community_staff VALUES($1,'admin')",[owner]);assert.equal((await shadow.query('SELECT community_staff_role_locked($1) AS role',[owner])).rows[0].role,'none');await shadow.query('DROP TABLE pg_temp.community_staff');shadow.release();
 const visible=(await parsed(await post(owner,'Classical mass assumptions'),201)).id;
 assert.equal((await parsed(await list())).comments[0].body,'Classical mass assumptions');
 assert.equal((await post(owner,'i will kill you')).status,422);
 const held=(await parsed(await post(owner,'A questionable shit phrase'),201)).id;
 const publicHeld=(await parsed(await list())).comments.find((c:{id:string})=>c.id===held);assert.equal(publicHeld.body,'[Comment unavailable pending review]');assert.equal(publicHeld.author,null);assert.equal((await parsed(await list(owner))).comments.find((c:{id:string})=>c.id===held).body,'A questionable shit phrase');
 const heldReview=await detail(held);assert.equal(heldReview.state,'held');
 assert.equal((await comments(req(other,{action:'like',key,id:held,liked:true}))).status,403);
 await parsed(await comments(req(owner,{action:'edit',key,id:held,version:1,body:'Clean correction stays restricted'})));assert.equal((await detail(held)).state,'held');
 const current=await detail(held);assert.equal((await write(mod,{action:'comment',id:held,version:current.version,contentVersion:current.contentVersion,state:'visible',reason:'restore'})).status,403);
 await parsed(await write(reviewer,{action:'comment',id:held,version:current.version,contentVersion:current.contentVersion,state:'visible',reason:'Educational correction reviewed'}));assert.equal((await detail(held)).state,'visible');
 // Reports: strict subjects, own-only status, idempotency and active duplicate prevention.
 const reportBody={requestId:randomUUID(),subject:{kind:'comment',key,id:visible},reason:'abuse',details:'<script>private report text</script>'};const report=(await parsed(await write(other,reportBody,'reports'),201)).id;assert.equal((await parsed(await write(other,reportBody,'reports'))).id,report);
 assert.equal((await write(other,{...reportBody,details:'changed'},'reports')).status,409);assert.equal((await write(other,{...reportBody,requestId:randomUUID()},'reports')).status,409);
 assert.equal((await get(owner,{id:report},'reports')).status,404);assert.ok(!JSON.stringify(await parsed(await get(other,{id:report},'reports'))).includes('actorId'));
 assert.equal((await write(other,{...reportBody,subject:{kind:'comment',key:'arena:arena-the-bubble-treaty',id:visible},requestId:randomUUID()},'reports')).status,404);
 assert.equal((await write(other,{...reportBody,role:'admin'},'reports')).status,400);
 const closedReports=createModerationApi({...deps,commentsPublic:()=>false});assert.equal((await closedReports('reports',req(other,{...reportBody,requestId:randomUUID()}))).status,404);
 await reset();const profileHandle=(await pool.query('SELECT handle FROM community_profile WHERE user_id=$1',[owner])).rows[0].handle;
 await parsed(await write(other,{...reportBody,requestId:randomUUID(),subject:{kind:'profile',handle:profileHandle}},'reports'),201);await pool.query('UPDATE community_profile SET public_visibility=false WHERE user_id=$1',[owner]);assert.equal((await write(other,{...reportBody,requestId:randomUUID(),subject:{kind:'profile',handle:profileHandle}},'reports')).status,404);
 const p=await f.problem(owner);await parsed(await write(other,{...reportBody,requestId:randomUUID(),subject:{kind:'problem',key:'authored:'+p.id}},'reports'),201);await pool.query("UPDATE authored_problem SET state='draft' WHERE id=$1",[p.id]);assert.equal((await write(other,{...reportBody,requestId:randomUUID(),subject:{kind:'problem',key:'authored:'+p.id}},'reports')).status,404);
 await reset();
 assert.equal((await write(other,{action:'report',id:report,version:1,state:'triaged',reason:'forged role'})).status,403);
 const csrf=req(mod,{action:'report',id:report,version:1,state:'triaged',reason:'bad origin'});csrf.headers.set('origin','https://evil.test');assert.equal((await api('staff',csrf)).status,403);
 const race=await Promise.all([write(mod,{action:'report',id:report,version:1,state:'triaged',reason:'Triage'}),write(reviewer,{action:'report',id:report,version:1,state:'dismissed',reason:'Independent review'})]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
 // Hide/restore and appeal correction stay tied to the content+review version.
 let r=await detail(visible);await parsed(await write(mod,{action:'comment',id:visible,version:r.version,contentVersion:r.contentVersion,state:'hidden',reason:'Review required'}));
 const appealBody={requestId:randomUUID(),key,commentId:visible,reason:'Please review this physics explanation'};const appeal=(await parsed(await write(owner,appealBody,'appeals'),201)).id;assert.equal((await parsed(await write(owner,appealBody,'appeals'))).id,appeal);
 assert.equal((await write(other,{...appealBody,requestId:randomUUID()},'appeals')).status,404);assert.equal((await get(other,{id:appeal},'appeals')).status,404);
 assert.equal((await write(mod,{action:'appeal',id:appeal,version:1,state:'accepted',reason:'Self-correction'})).status,403);
 await parsed(await write(reviewer,{action:'appeal',id:appeal,version:1,state:'accepted',reason:'Legitimate educational content'}));assert.equal((await detail(visible)).state,'visible');
 r=await detail(visible);await parsed(await write(mod,{action:'comment',id:visible,version:r.version,contentVersion:r.contentVersion,state:'hidden',reason:'Second review'}));
 await reset();const stale=(await parsed(await write(owner,{...appealBody,requestId:randomUUID()},'appeals'),201)).id;await parsed(await comments(req(owner,{action:'edit',key,id:visible,version:1,body:'New content requires new review'})));assert.equal((await write(reviewer,{action:'appeal',id:stale,version:1,state:'accepted',reason:'Old evidence'})).status,409);await parsed(await write(reviewer,{action:'appeal',id:stale,version:1,state:'rejected',reason:'Superseded content version'}));
 // Locks serialize with all thread writes; deleting own text remains allowed.
 await parsed(await write(mod,{action:'thread',id:visible,key,version:0,locked:true,reason:'Pause discussion'}));assert.equal((await post(other,'Locked reply',visible)).status,423);assert.equal((await comments(req(owner,{action:'edit',key,id:visible,version:2,body:'Locked edit'}))).status,423);assert.equal((await write(mod,{action:'thread',id:visible,key,version:1,locked:false,reason:'Unlock'})).status,403);await parsed(await write(reviewer,{action:'thread',id:visible,key,version:1,locked:false,reason:'Reviewed and reopened'}));
 // Staff-authored comments still require an independent reviewer, and appeal corrections require a different reviewer.
 await reset();const staffComment=(await parsed(await post(reviewer,'Staff also follows independent review'),201)).id;let sr=await detail(staffComment);
 assert.equal((await write(reviewer,{action:'comment',id:staffComment,version:sr.version,contentVersion:1,state:'hidden',reason:'Self review'})).status,403);
 await parsed(await write(second,{action:'comment',id:staffComment,version:sr.version,contentVersion:1,state:'hidden',reason:'Independent restriction'}));
 const staffAppeal=(await parsed(await write(reviewer,{requestId:randomUUID(),key,commentId:staffComment,reason:'Independent appeal requested'},'appeals'),201)).id;
 assert.equal((await write(second,{action:'appeal',id:staffAppeal,version:1,state:'accepted',reason:'Original reviewer'})).status,403);
 assert.equal((await write(reviewer,{action:'appeal',id:staffAppeal,version:1,state:'accepted',reason:'Own appeal'})).status,403);
 // Held queue and content history are bounded with usable cursors; no rows disappear between pages.
 for(let i=0;i<22;i++)await pool.query('INSERT INTO community_comment(id,problem_key,user_id,request_id,body) VALUES($1,$2,$3,$4,$5)',[randomUUID(),key,owner,randomUUID(),'Held fixture '+i]);
 const page1=await parsed(await get(reviewer,{queue:'held'}));assert.equal(page1.cases.length,20);assert.ok(page1.nextCursor);const page2=await parsed(await get(reviewer,{queue:'held',after:page1.nextCursor}));assert.ok(page2.cases.length>0);assert.ok(!page2.cases.some((b:{id:string})=>page1.cases.some((a:{id:string})=>a.id===b.id)));
 // Policy runs on edits too: blocked edits preserve the prior body, uncertain edits become held.
 await reset();assert.equal((await comments(req(owner,{action:'edit',key,id:held,version:2,body:'i will kill you'}))).status,422);assert.equal((await detail(held)).contentVersion,2);
 await parsed(await comments(req(owner,{action:'edit',key,id:held,version:2,body:'https://unknown.example/private-link'})));assert.equal((await detail(held)).state,'held');
 // Soft deletion cannot be undone by staff restoration, and private evidence remains.
 await parsed(await comments(req(owner,{action:'delete',key,id:visible,version:2})));r=await detail(visible);assert.equal((await write(reviewer,{action:'comment',id:visible,version:r.version,contentVersion:r.contentVersion,state:'visible',reason:'Cannot resurrect'})).status,409);assert.ok((await parsed(await get(reviewer,{item:'comment',id:visible}))).evidence.some((e:{body:string})=>e.body==='Classical mass assumptions'));
 await assert.rejects(runtime.query('UPDATE community_comment_review SET state=\'visible\''));await assert.rejects(runtime.query('INSERT INTO community_moderation_audit(actor_id,action,target,version,reason,data) VALUES($1,\'forged\',\'x\',1,\'x\',\'{}\')',[owner]));
 await assert.rejects(pool.query("UPDATE community_moderation_audit SET reason='tampered'"));await assert.rejects(pool.query('DELETE FROM community_comment_evidence'));await assert.rejects(pool.query('TRUNCATE community_moderation_audit'));await assert.rejects(pool.query('TRUNCATE community_comment_evidence'));
 // Revocation waits for an already authorized transaction; afterwards all staff reads/writes fail.
 const lock=await runtime.connect();await lock.query('BEGIN');assert.equal((await lock.query('SELECT community_staff_role_locked($1) AS role',[mod])).rows[0].role,'moderator');let revoked=false;const revoke=pool.query("UPDATE community_staff SET role='none',reason='revoked' WHERE user_id=$1",[mod]).then(()=>{revoked=true;});await new Promise(r=>setTimeout(r,50));assert.equal(revoked,false);await lock.query('COMMIT');lock.release();await revoke;assert.equal((await get(mod)).status,403);
 await reset();await pool.query("INSERT INTO community_moderation_limit(bucket,minute,requests,day,reports,appeals) VALUES($1,date_trunc('minute',clock_timestamp()),30,current_date,0,0)",['user:'+other]);assert.equal((await get(other,{},'reports')).status,429);
 await reset();await pool.query("INSERT INTO community_content_limit(user_id,day,writes) VALUES($1,current_date,100)",[owner]);assert.equal((await post(owner,'Content quota exceeded')).status,429);
 await reset();await pool.query("INSERT INTO community_moderation_limit(bucket,minute,requests,day,reports,appeals) VALUES($1,date_trunc('minute',clock_timestamp()),1,(clock_timestamp() AT TIME ZONE 'UTC')::date,10,0)",['reports:'+other]);assert.equal((await write(other,{...reportBody,requestId:randomUUID()},'reports')).status,429);
 await reset();await pool.query("INSERT INTO community_moderation_limit(bucket,minute,requests,day,reports,appeals) VALUES($1,date_trunc('minute',clock_timestamp()),1,(clock_timestamp() AT TIME ZONE 'UTC')::date,0,3)",['appeals:'+owner]);assert.equal((await write(owner,{...appealBody,requestId:randomUUID()},'appeals')).status,429);
 await reset();await pool.query("INSERT INTO community_moderation_limit(bucket,minute,requests,day,reports,appeals) VALUES('ip:unknown',date_trunc('minute',clock_timestamp()),120,current_date,0,0)");assert.equal((await write(other,{...reportBody,requestId:randomUUID()},'reports')).status,429);
 await assert.rejects(pool.query('BEGIN;'+down+'COMMIT;'));await pool.query('ROLLBACK');
 }finally{await runtime?.end();await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE;DROP ROLE ${role}`);await admin.end();}
});
