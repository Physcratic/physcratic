import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {createCommentsApi} from './community/comments-api';
import {communityCommentsEnabled,createCommentsRoute} from './community/comments-route';
import {trustedCommentIp} from './community/comments-ip';
import {commentBodySchema} from './community/comments-contracts';
import {achievementFixtures,achievementMigrations,achievementRequest as req,achievementParsed as parsed} from '../tests/community-achievement-fixtures';
const key='arena:arena-mind-the-gap',otherKey='arena:arena-the-bubble-treaty';
test('production lock, disabled import gate and trusted IP normalization',async()=>{
 assert.equal(communityCommentsEnabled({}),false);
 assert.equal(communityCommentsEnabled({NODE_ENV:'production',COMMUNITY_COMMENTS_ENABLED:'true'}),false);
 assert.equal(communityCommentsEnabled({NODE_ENV:'production',VERCEL_ENV:'production',COMMUNITY_COMMENTS_ENABLED:'true'}),false);
 assert.equal(communityCommentsEnabled({NODE_ENV:'production',VERCEL_ENV:'preview',COMMUNITY_COMMENTS_ENABLED:'true'}),true);
 let loaded=false;const r=await createCommentsRoute(()=>false,async()=>{loaded=true;throw Error();})(new Request('https://test'));assert.equal(r.status,503);assert.equal(loaded,false);
 const env={VERCEL:'1',BETTER_AUTH_SECRET:'synthetic'};
 const ip=(value:string,overrides={})=>trustedCommentIp(new Request('https://test',{headers:{'x-vercel-forwarded-for':value,'x-forwarded-for':'192.0.2.88'}}),{...env,...overrides});
 assert.equal(ip('192.0.2.1',{VERCEL:'0'}),'unknown');assert.equal(ip('192.0.2.1,192.0.2.2'),'unknown');assert.equal(ip('invalid'),'unknown');assert.equal(ip('192.0.2.1',{BETTER_AUTH_SECRET:''}),'unknown');
 assert.equal(ip('::ffff:192.0.2.1'),ip('::ffff:c000:201'));assert.equal(ip('192.0.2.1'),ip('::ffff:c000:201'));
 assert.equal(ip('2001:db8:abcd:1::1'),ip('2001:0db8:abcd:0001::ffff'));assert.equal(ip('::abcd:ef00:1111:2222:192.0.2.1'),ip('0:0:abcd:ef00:1111:2222:c000:201'));
 assert.ok(!ip('192.0.2.1').includes('192.0.2'));assert.ok(!commentBodySchema.safeParse('\u0000text').success);assert.ok(commentBodySchema.safeParse('<script>alert(1)</script> $\\input{file}$').success);
});
const url=process.env.AUTHORING_TEST_DATABASE_URL;
test('0013 threaded comments, pagination, ownership, races and runtime grants',{skip:!url},async()=>{
 const target=new URL(url!);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/physcratic_authoring_test');
 const schema='comments_'+randomUUID().replaceAll('-',''),role=schema+'_runtime';const admin=new Pool({connectionString:url});await admin.query(`CREATE SCHEMA ${schema};CREATE ROLE ${role} NOLOGIN`);const pool=new Pool({connectionString:url,options:`-c search_path=${schema},public`});let runtime:Pool|undefined;
 try{
 await pool.query('CREATE TABLE "user"(id text PRIMARY KEY)');for(const name of achievementMigrations.filter(n=>!n.startsWith('0007')))await pool.query('BEGIN;'+await readFile(`migrations/${name}.up.sql`,'utf8')+'COMMIT;');
 const up=await readFile('migrations/0013_community_comments.up.sql','utf8'),down=await readFile('migrations/0013_community_comments.down.sql','utf8');for(const s of [up,down,up])await pool.query('BEGIN;'+s+'COMMIT;');
 const f=achievementFixtures(pool),owner=await f.user(undefined,false),other=await f.user(undefined,false);await f.user('unverified',false);const problem=await f.problem(owner),authored='authored:'+problem.id;
 await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role};GRANT SELECT,INSERT ON community_comment TO ${role};GRANT UPDATE(body,version,deleted_at) ON community_comment TO ${role};GRANT SELECT,INSERT,DELETE ON community_comment_like,community_comment_spam TO ${role};GRANT UPDATE(last_post) ON community_comment_spam TO ${role};GRANT SELECT,INSERT,UPDATE ON community_comment_limit TO ${role};GRANT SELECT ON authored_problem,authored_revision TO ${role};GRANT UPDATE(id) ON authored_problem TO ${role}`);
 runtime=new Pool({connectionString:url,options:`-c search_path=${schema},public -c role=${role}`});const api=createCommentsApi({...f.deps,pool:runtime,ip:()=> 'unknown'});
 const write=(who:string|undefined,body:unknown)=>api(req(who,body));
 const post=(who=owner,text='A new discussion',parent:string|null=null,k=key,requestId:string=randomUUID())=>write(who,{action:'create',key:k,parent,body:text,requestId});
 const list=async(k=key,parent?:string,sort='newest',after?:string,who?:string)=>api(req(who,undefined,'GET','/api?'+new URLSearchParams({key:k,sort,...(parent?{parent}:{}),...(after?{after}:{})})));
 const reset=()=>pool.query('DELETE FROM community_comment_limit');
 assert.equal((await write(undefined,{})).status,401);assert.equal((await post('unverified')).status,403);
 const csrf=req(owner,{action:'create',key,parent:null,requestId:randomUUID(),body:'CSRF'});csrf.headers.set('origin','https://evil.test');assert.equal((await api(csrf)).status,403);
 assert.equal((await write(owner,{action:'create',key,parent:null,requestId:randomUUID(),body:'valid',role:'admin'})).status,400);assert.equal((await post(owner,'x'.repeat(2001))).status,400);assert.equal((await post(owner,'invalid key',null,'arena:fake')).status,400);
 assert.equal((await post(owner,'unknown public',null,'authored:'+randomUUID())).status,404);
 const reference=randomUUID(),root=(await parsed(await post(owner,'Initial text',null,key,reference),201)).id;
 assert.equal((await parsed(await post(owner,'Initial text',null,key,reference))).id,root);assert.equal((await post(owner,'Different intent',null,key,reference)).status,409);assert.equal((await post(owner,' Ｉｎｉｔｉａｌ  TEXT ')).status,409);
 const replyRequest=randomUUID(),reply=(await parsed(await post(other,'A thoughtful reply',root,key,replyRequest),201)).id;assert.equal((await parsed(await post(other,'A thoughtful reply',root.toUpperCase(),key,replyRequest.toUpperCase()))).id,reply);assert.equal((await post(other,'Cross problem',root,otherKey)).status,404);
 await reset();
 assert.equal((await write(other,{action:'edit',key,id:root,version:1,body:'Forged edit'})).status,403);
 assert.equal((await write(other,{action:'delete',key,id:root,version:1})).status,403);
 assert.equal((await write(owner,{action:'like',key:otherKey,id:root,liked:true})).status,404);
 const like=(who=other,liked=true)=>write(who,{action:'like',key,id:root,liked});
 await Promise.all(Array.from({length:12},()=>like()));let page=await parsed(await list(key,undefined,'top',undefined,other));assert.equal(page.comments[0].score,1);assert.equal(page.comments[0].liked,true);assert.ok(!JSON.stringify(page).includes(owner));assert.equal(page.comments[0].author,null);
 await Promise.all(Array.from({length:8},()=>like(other,false)));page=await parsed(await list());assert.equal(page.comments[0].score,0);
 await Promise.all([like(owner),like(other)]);assert.equal((await parsed(await list())).comments[0].score,2);await Promise.all([like(owner,false),like(other,false)]);
 const shadow=await runtime.connect();await shadow.query('CREATE TEMP TABLE community_comment(id uuid PRIMARY KEY,deleted_at timestamptz,score bigint CHECK(score=0))');await shadow.query('INSERT INTO pg_temp.community_comment VALUES($1,NULL,0)',[root]);await shadow.query('INSERT INTO community_comment_like(comment_id,user_id) VALUES($1,$2)',[root,other]);assert.equal(Number((await pool.query(`SELECT score FROM ${schema}.community_comment WHERE id=$1`,[root])).rows[0].score),1);await shadow.query('DELETE FROM community_comment_like WHERE comment_id=$1 AND user_id=$2',[root,other]);await shadow.query('DROP TABLE pg_temp.community_comment');shadow.release();
 await assert.rejects(runtime.query('UPDATE community_comment SET score=100 WHERE id=$1',[root]));await assert.rejects(runtime.query('DELETE FROM community_comment WHERE id=$1',[root]));
 await reset();const edits=await Promise.all(['Concurrent edit A','Concurrent edit B'].map(body=>write(owner,{action:'edit',key,id:root,version:1,body})));assert.deepEqual(edits.map(r=>r.status).sort(),[200,409]);
 const row=(await parsed(await list(key,undefined,'newest',undefined,owner))).comments.find((c:{id:string})=>c.id===root);assert.equal(row.version,2);assert.ok(row.editedAt);assert.equal(row.owned,true);
 await parsed(await write(owner,{action:'edit',key,id:root,version:2,body:row.body.toUpperCase()}));
 const races=await Promise.all([write(owner,{action:'delete',key,id:root,version:3}),write(owner,{action:'edit',key,id:root,version:3,body:'Racing final edit'}),like()]);assert.ok(races.some(r=>r.status===409));
 const current=(await pool.query('SELECT version,deleted_at FROM community_comment WHERE id=$1',[root])).rows[0];if(!current.deleted_at)await parsed(await write(owner,{action:'delete',key,id:root,version:current.version}));
 const deleted=(await parsed(await list(key,undefined,'newest',undefined,owner))).comments.find((c:{id:string})=>c.id===root);assert.equal(deleted.body,'');assert.equal(deleted.author,null);assert.equal(deleted.owned,false);assert.equal((await parsed(await list(key,root))).comments[0].id,reply);assert.equal((await like()).status,409);
 // Deep ancestry is stored correctly without unbounded visual indentation; SQL rejects depth 65.
 let parent=reply;for(let depth=2;depth<=64;depth++){const id=randomUUID();await pool.query('INSERT INTO community_comment(id,problem_key,user_id,parent_id,request_id,body) VALUES($1,$2,$3,$4,$5,$6)',[id,key,owner,parent,randomUUID(),'Deep reply '+depth]);parent=id;}
 await reset();assert.equal((await post(owner,'Too deep',parent)).status,409);
 const deep=(await pool.query('SELECT parent_id FROM community_comment WHERE id=$1',[parent])).rows[0].parent_id;assert.equal((await parsed(await list(key,deep))).comments[0].depth,64);
 // Independent root and direct-reply pages, same-millisecond tie breaking, strict cursor scope.
 await pool.query("INSERT INTO community_comment(id,problem_key,user_id,parent_id,request_id,body) SELECT gen_random_uuid(),$1,$2,NULL,gen_random_uuid(),'Page root '||n FROM generate_series(1,25)n",[key,owner]);
 const first=await parsed(await list());assert.equal(first.comments.length,20);assert.ok(first.nextCursor);const next=await parsed(await list(key,undefined,'newest',first.nextCursor));assert.equal(next.comments.length,6);assert.equal(new Set([...first.comments,...next.comments].map(c=>c.id)).size,26);
 assert.equal((await list(otherKey,undefined,'newest',first.nextCursor)).status,400);assert.equal((await list(key,root,'newest',first.nextCursor)).status,400);
 const boosted=first.comments[5].id;await pool.query('INSERT INTO community_comment_like(comment_id,user_id) VALUES($1,$2)',[boosted,other]);assert.equal((await parsed(await list(key,undefined,'top'))).comments[0].id,boosted);
 const topPage=await parsed(await list(key,undefined,'top'));const topNext=await parsed(await list(key,undefined,'top',topPage.nextCursor));assert.equal(new Set([...topPage.comments,...topNext.comments].map(c=>c.id)).size,26);
 await pool.query("INSERT INTO community_comment(id,problem_key,user_id,parent_id,request_id,body) SELECT gen_random_uuid(),$1,$2,$3,gen_random_uuid(),'Page reply '||n FROM generate_series(1,23)n",[key,owner,root]);const children=await parsed(await list(key,root));assert.equal(children.comments.length,20);assert.ok(children.nextCursor);assert.equal((await parsed(await list(key,root,'newest',children.nextCursor))).comments.length,4);
 // Optional public profile attribution is fresh and never copies account identity.
 await pool.query('BEGIN;'+await readFile('migrations/0007_community_profile.up.sql','utf8')+'COMMIT;');await pool.query('INSERT INTO community_profile(user_id,handle,display_name,public_visibility) VALUES($1,\'public_author\',\'Public Display\',true)',[owner]);await pool.query(`GRANT SELECT ON community_profile TO ${role}`);
 const profiles=createCommentsApi({...f.deps,pool:runtime,ip:()=> 'unknown',profiles:()=>true});const readProfiles=()=>profiles(req(undefined,undefined,'GET','/api?'+new URLSearchParams({key})));assert.equal((await parsed(await readProfiles())).comments[0].author.handle,'public_author');await pool.query('UPDATE community_profile SET public_visibility=false WHERE user_id=$1',[owner]);assert.equal((await parsed(await readProfiles())).comments[0].author,null);
 // Staff role does not authorize editing another member's text in this batch.
 await pool.query('BEGIN;'+await readFile('migrations/0010_community_medals.up.sql','utf8')+'COMMIT;');await pool.query("INSERT INTO community_staff(user_id,role,reason) VALUES($1,'admin','fixture')",[other]);await reset();assert.equal((await write(other,{action:'edit',key,id:boosted,version:1,body:'Staff forgery'})).status,403);
 const a=(await parsed(await post(owner,'Authored discussion',null,authored),201)).id;
 const lock=await pool.connect();await lock.query('BEGIN');await lock.query("UPDATE authored_problem SET state='draft' WHERE id=$1",[problem.id]);const inFlight=post(other,'Publication race',null,authored);await lock.query('COMMIT');lock.release();assert.equal((await inFlight).status,404);assert.equal((await list(authored)).status,404);assert.equal((await write(owner,{action:'edit',key:authored,id:a,version:1,body:'Withdrawn edit'})).status,404);
 const departed=await f.user(undefined,false);await reset();const departedComment=(await parsed(await post(departed,'Account-deletion comment'),201)).id;await write(departed,{action:'like',key,id:boosted,liked:true});
 const beforeScore=Number((await pool.query('SELECT score FROM community_comment WHERE id=$1',[boosted])).rows[0].score);await pool.query('DELETE FROM "user" WHERE id=$1',[departed]);
 assert.equal((await pool.query('SELECT user_id FROM community_comment WHERE id=$1',[departedComment])).rows[0].user_id,null);assert.equal(Number((await pool.query('SELECT score FROM community_comment WHERE id=$1',[boosted])).rows[0].score),beforeScore-1);
 await assert.rejects(runtime.query('UPDATE community_comment SET user_id=NULL WHERE id=$1',[boosted]));
 await reset();for(let n=0;n<6;n++)assert.equal((await post(owner,'Burst post '+n)).status,201);assert.equal((await post(owner,'Burst seventh')).status,429);
 await reset();await pool.query("INSERT INTO community_comment_limit(bucket,minute,requests,post_minute,minute_posts,day,posts) VALUES($1,clock_timestamp(),1,clock_timestamp(),0,(clock_timestamp() AT TIME ZONE 'UTC')::date,50)",['posts:'+owner]);assert.equal((await post(owner,'Daily excess')).status,429);
 await reset();for(let n=0;n<30;n++)await write(other,{action:'like',key,id:boosted,liked:true});assert.equal((await write(other,{action:'like',key,id:boosted,liked:true})).status,429);
 await reset();await pool.query("INSERT INTO community_comment_limit(bucket,minute,requests,post_minute,minute_posts,day,posts) VALUES('ip:unknown',date_trunc('minute',clock_timestamp()),120,clock_timestamp(),0,current_date,0)");assert.equal((await write(owner,{action:'like',key,id:boosted,liked:true})).status,429);
 await assert.rejects(pool.query('BEGIN;'+down+'COMMIT;'));await pool.query('ROLLBACK');
 }finally{await runtime?.end();await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE;DROP ROLE ${role}`);await admin.end();}
});
