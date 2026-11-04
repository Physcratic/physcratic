import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {evaluateComment} from './community/content-policy';
import {createCommentsApi} from './community/comments-api';
import {achievementRequest as request} from '../tests/community-achievement-fixtures';

test('v3 holds confusable words and bare domains without matching physics words or files',()=>{
 for(const text of ['I will kıll you','nıgger','n ı g g e r','Shıt','I will k𝚤ll you','shop.example.shop','offer.example.dev','offer.example.education','offer.example.xn--p1ai','münchen.shop','例子.中国','evil.arxiv.org','arxiv.org.evil.shop','https://evil.example/notes.pdf','www.evil.pdf'])
  assert.equal(evaluateComment(text).state,'held',text);
 for(const text of ['Classical mass and dielectric scattering','Gaussian fermions and Killing vectors','The Turkish word ışık means light','Experimental data: 1, 2, 3','v.x = 3.14 and Eq. (2) gives 10.25 m/s','solution.pdf notes.tex data.csv output.json figure.png photo.jpg image.webp vector.svg notes.txt','arxiv.org','https://arxiv.org/abs/1234.5678','HTTPS://DOI.ORG/10.1000/example','en.wikipedia.org','physics.stackexchange.com','physcratic.com'])
  assert.equal(evaluateComment(text).state,'visible',text);
 for(const text of ['i will kill you','nigger','i will kill you and ışık'])assert.equal(evaluateComment(text).state,'blocked',text);
 assert.equal(evaluateComment('one.shop two.dev three.education').codes.includes('link-volume'),true);
 assert.equal(evaluateComment('A physics explanation').policyVersion,'community-text-v3');
});

const url=process.env.AUTHORING_TEST_DATABASE_URL;
test('0015 reproduces then blocks temporary relation/trigger/view escalation with actual restricted login credentials',{skip:!url},async t=>{
 const target=new URL(url!);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/physcratic_authoring_test');
 const suffix=randomUUID().replaceAll('-',''),schema='s1_'+suffix,owner=schema+'_owner',role=schema+'_runtime';
 const admin=new Pool({connectionString:url});
 await admin.query(`CREATE ROLE ${owner} NOLOGIN;CREATE ROLE ${role} LOGIN PASSWORD 'disposable-s1-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;CREATE SCHEMA ${schema} AUTHORIZATION ${owner}`);
 const pool=new Pool({connectionString:url,options:`-c search_path=${schema},public,pg_catalog -c role=${owner}`});
 const deploy=new Pool({connectionString:url,options:`-c search_path=${schema},public,pg_catalog`});
 const runtimeUrl=new URL(url!);runtimeUrl.username=role;runtimeUrl.password='disposable-s1-only';
 const runtime=new Pool({connectionString:runtimeUrl.href,options:`-c search_path=${schema},public,pg_catalog`});
 try{
  await pool.query('CREATE TABLE "user"(id text PRIMARY KEY,"emailVerified" boolean DEFAULT true)');
  for(const name of (await readdir('migrations')).filter(n=>/^00(?:0[1-9]|1[0-4])_.*\.up\.sql$/.test(n)).sort())await pool.query('BEGIN;'+await readFile('migrations/'+name,'utf8')+'COMMIT;');
  await pool.query("INSERT INTO \"user\"(id) VALUES('owner'),('admin'),('mod'),('evil');INSERT INTO community_staff(user_id,role,reason) VALUES('admin','admin','fixture'),('mod','moderator','fixture'),('evil','none','fixture')");
  await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role};GRANT SELECT,INSERT,UPDATE ON community_medal_claim,community_medal_limit TO ${role};GRANT SELECT ON community_medal_audit,community_comment_review,community_thread_lock TO ${role};GRANT SELECT,INSERT ON community_comment TO ${role};GRANT UPDATE(body,version,deleted_at) ON community_comment TO ${role};GRANT SELECT,INSERT,DELETE ON community_comment_like,community_comment_spam TO ${role};GRANT UPDATE(last_post) ON community_comment_spam TO ${role};GRANT SELECT,INSERT,UPDATE ON community_comment_limit,community_content_limit TO ${role};GRANT EXECUTE ON FUNCTION community_admin_locked(text),community_staff_role_locked(text),community_thread_root(uuid),community_apply_content_policy(uuid,text,text,text[],text) TO ${role}`);
  const up=await readFile('migrations/0015_community_security_s1.up.sql','utf8'),down=await readFile('migrations/0015_community_security_s1.down.sql','utf8');
  const functions=async()=> (await pool.query("SELECT p.oid,p.proowner,p.proacl::text,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=$1 AND p.proname IN ('community_admin_locked','community_medal_log') ORDER BY p.proname",[schema])).rows;
  const original=await functions();
  const c=await runtime.connect();
  const auth=async(id:string)=>(await c.query('SELECT community_admin_locked($1) AS allowed',[id])).rows[0].allowed;
  const evilRole=async()=>(await pool.query("SELECT role FROM community_staff WHERE user_id='evil'")).rows[0].role;
  const resetEvil=()=>pool.query("UPDATE community_staff SET role='none',reason='reset disposable reproduction' WHERE user_id='evil'");
  let claimYear=2020;
  const insertClaim=async()=>{const id=randomUUID();await c.query("INSERT INTO community_medal_claim(id,user_id,competition,award,year,country,competition_name,certificate_name,pathname,bytes,sha256) VALUES($1,'owner','IPhO','gold',$3,'','','synthetic private certificate',$2,10,repeat('a',64))",[id,'community-medal-proof/'+id+'.pdf',claimYear++]);return id;};
  try{
   assert.equal((await c.query('SELECT current_user,session_user')).rows[0].current_user,role);
   assert.equal((await c.query('SELECT current_user,session_user')).rows[0].session_user,role);
   await assert.rejects(c.query("UPDATE community_staff SET role='admin' WHERE user_id='evil'"),{code:'42501'});
   await assert.rejects(c.query("INSERT INTO community_medal_audit(claim_id,version,actor_id,state,reason) VALUES($1,1,'evil','uploading','forged')",[randomUUID()]),{code:'42501'});
   await t.test('before patch, temporary table forges authorization',async()=>{
    await c.query(`CREATE TEMP TABLE community_staff(user_id text,role text);INSERT INTO pg_temp.community_staff VALUES('evil','admin');GRANT ALL ON pg_temp.community_staff TO ${owner}`);
    assert.equal(await auth('evil'),true);
    assert.equal((await c.query("SELECT community_staff_role_locked('evil') AS role")).rows[0].role,'none');
    await c.query('DROP TABLE pg_temp.community_staff');
   });
   await c.query(`CREATE FUNCTION pg_temp.escalate() RETURNS text LANGUAGE plpgsql AS $fn$ BEGIN UPDATE ${schema}.community_staff SET role='admin',reason='disposable exploit' WHERE user_id='evil';RETURN 'admin';END $fn$`);
   await c.query(`CREATE FUNCTION pg_temp.escalate_audit() RETURNS trigger LANGUAGE plpgsql AS $fn$ BEGIN PERFORM pg_temp.escalate();RETURN NEW;END $fn$`);
   await c.query(`GRANT EXECUTE ON FUNCTION pg_temp.escalate(),pg_temp.escalate_audit() TO ${owner}`);
   await t.test('before patch, temporary view executes as function owner',async()=>{
    await c.query(`CREATE TEMP TABLE anchor(id integer);INSERT INTO anchor VALUES(1);GRANT ALL ON pg_temp.anchor TO ${owner};CREATE TEMP VIEW community_staff AS SELECT 'evil'::text AS user_id,pg_temp.escalate() AS role FROM pg_temp.anchor;GRANT ALL ON pg_temp.community_staff TO ${owner}`);
    assert.equal(await auth('evil'),true);assert.equal(await evilRole(),'admin');await resetEvil();
    await c.query('DROP VIEW pg_temp.community_staff');
   });
   await c.query(`CREATE TEMP TABLE community_medal_audit(claim_id uuid,version integer,actor_id text,state text,reason text);GRANT ALL ON pg_temp.community_medal_audit TO ${owner};CREATE TRIGGER malicious BEFORE INSERT ON pg_temp.community_medal_audit FOR EACH ROW EXECUTE FUNCTION pg_temp.escalate_audit()`);
   await t.test('before patch, temporary audit trigger assigns real staff and suppresses the real audit',async()=>{
    const id=await insertClaim();assert.equal(await evilRole(),'admin');assert.equal((await pool.query('SELECT count(*) FROM community_medal_audit WHERE claim_id=$1',[id])).rows[0].count,'0');await resetEvil();await c.query('TRUNCATE pg_temp.community_medal_audit');
   });
   await t.test('up/down/up retains hardening, function ownership, OIDs and existing grants',async()=>{
    for(const sql of [up,down,up]){
     await deploy.query('BEGIN;'+sql+'COMMIT;');
     assert.deepEqual((await functions()).map(({proconfig,...r})=>r),original.map(({proconfig,...r})=>r));
     assert.equal(await auth('evil'),false);assert.equal(await auth('admin'),true);
    }
   });
   await t.test('after patch, temporary table/view/trigger attacks cannot forge authorization, assign staff or divert audits',async()=>{
    await c.query(`CREATE TEMP TABLE community_staff(user_id text,role text);INSERT INTO pg_temp.community_staff VALUES('evil','admin');GRANT ALL ON pg_temp.community_staff TO ${owner}`);
    assert.equal(await auth('evil'),false);await c.query('DROP TABLE pg_temp.community_staff');
    await c.query(`CREATE TEMP VIEW community_staff AS SELECT 'evil'::text AS user_id,pg_temp.escalate() AS role FROM pg_temp.anchor;GRANT ALL ON pg_temp.community_staff TO ${owner}`);
    assert.equal(await auth('evil'),false);assert.equal(await auth('admin'),true);assert.equal(await auth('mod'),false);
    const id=await insertClaim();assert.equal(await evilRole(),'none');assert.equal((await c.query('SELECT count(*) FROM pg_temp.community_medal_audit')).rows[0].count,'0');
    assert.equal((await c.query('SELECT count(*) FROM community_medal_audit WHERE claim_id=$1',[id])).rows[0].count,'0'); // Unqualified caller still sees its own shadow.
    assert.equal((await pool.query('SELECT count(*) FROM community_medal_audit WHERE claim_id=$1',[id])).rows[0].count,'1');
    await c.query("UPDATE community_medal_claim SET state='pending',version=version+1 WHERE id=$1",[id]);
    await c.query("UPDATE community_medal_claim SET state='approved',version=version+1,reviewer_id='admin',reason='legitimate review' WHERE id=$1",[id]);
    assert.equal((await pool.query('SELECT count(*) FROM community_medal_audit WHERE claim_id=$1',[id])).rows[0].count,'3');
    await assert.rejects(c.query("UPDATE community_medal_claim SET state='revoked',version=version+1,reviewer_id='evil',reason='forged role' WHERE id=$1",[id]),{code:'42501'});
    await assert.rejects(c.query('SELECT community_medal_log()'),{code:'42501'});
   });
  }finally{c.release();}
  await t.test('related SECURITY DEFINER routines all pin the trusted schema with pg_temp last',async()=>{
   const rows=(await pool.query("SELECT p.proname,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=$1 AND p.prosecdef ORDER BY p.proname",[schema])).rows;
   assert.equal(rows.length,9);for(const row of rows)assert.ok(row.proconfig.includes(`search_path=${schema}, pg_catalog, pg_temp`),row.proname);
  });
  await t.test('0015 fails without 0010 and needs no later migration or new runtime grants',async()=>{
   const minimal=schema+'_minimal';await admin.query(`CREATE SCHEMA ${minimal}`);
   const isolated=new Pool({connectionString:url,options:`-c search_path=${minimal},pg_catalog`});
   try{
    await assert.rejects(isolated.query('BEGIN;'+up+'COMMIT;'),/requires installed 0010/);await isolated.query('ROLLBACK');
    await isolated.query('CREATE TABLE "user"(id text PRIMARY KEY)');
    await isolated.query('BEGIN;'+await readFile('migrations/0010_community_medals.up.sql','utf8')+'COMMIT;');
    for(const sql of [up,down,up])await isolated.query('BEGIN;'+sql+'COMMIT;');
    assert.equal((await isolated.query("SELECT community_admin_locked('absent') AS allowed")).rows[0].allowed,false);
   }finally{await isolated.end();await admin.query(`DROP SCHEMA ${minimal} CASCADE`);}
  });
  await t.test('creation and editing hold v3 evasions, keep private evidence and never release an existing hold',async()=>{
   const api=createCommentsApi({pool:runtime,user:async r=>r.headers.get('x-test-user')?{id:r.headers.get('x-test-user')!,emailVerified:true}:null,origin:()=>true,ip:()=> 'synthetic',moderation:()=>true});
   const key='arena:arena-mind-the-gap';
   const create=async(body:string)=>{const r=await api(request('owner',{action:'create',key,parent:null,requestId:randomUUID(),body}));assert.equal(r.status,201,await r.clone().text());return (await r.json()).id;};
   const a=await create('I will kıll you'),b=await create('Visit offer.shop'),d=await create('Classical mass and dielectric physics');
   const edit=await api(request('owner',{action:'edit',key,id:d,version:1,body:'Edited evasion: nıgger'}));assert.equal(edit.status,200);
   const clean=await api(request('owner',{action:'edit',key,id:a,version:1,body:'A clean correction stays under review'}));assert.equal(clean.status,200);
   const rows=(await pool.query('SELECT state,restricted,policy_version FROM community_comment_review WHERE comment_id=ANY($1::uuid[])',[[a,b,d]])).rows;
   assert.equal(rows.length,3);assert.ok(rows.every(r=>r.state==='held'&&r.restricted&&r.policy_version==='community-text-v3'));
   const guest=await api(request(undefined,undefined,'GET','/api?key='+key));assert.equal(guest.status,200);assert.ok((await guest.json()).comments.every((r:{body:string})=>r.body==='[Comment unavailable pending review]'));
  });
 }finally{
  await runtime.end();await pool.end();await deploy.end();await admin.query(`DROP SCHEMA ${schema} CASCADE;DROP OWNED BY ${owner};DROP ROLE ${role};DROP ROLE ${owner}`);await admin.end();
 }
});
