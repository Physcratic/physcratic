import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Pool } from 'pg';
import { createMedalApi,validateMedalPdf } from './community/medal-api';
import { createMedalRoute,medalsEnabled } from './community/medal-route';
function pdf(){let s='%PDF-1.4\n';const offsets=[0];for(const [i,body] of ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>'].entries()){offsets.push(s.length);s+=`${i+1} 0 obj\n${body}\nendobj\n`;}const x=s.length;s+='xref\n0 4\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;return Buffer.from(s);}
const metadata={competition:'IPhO',award:'gold',year:2025,certificateName:'Private certificate name'};
const req=(who:string,body?:unknown)=>new Request('https://test.local/api',{method:body===undefined?'GET':'POST',headers:{'x-user':who,origin:'https://test.local','content-type':body instanceof Uint8Array?'application/pdf':'application/json','x-medal-claim':JSON.stringify(metadata)},body:body===undefined?undefined:body instanceof Uint8Array?Buffer.from(body):JSON.stringify(body)});
test('medal gates and PDF abuse',async()=>{
 assert.equal(medalsEnabled({COMMUNITY_MEDALS_ENABLED:'true'}),false);let loaded=false;const off=createMedalRoute(()=>false,async()=>{loaded=true;throw Error();});assert.equal((await off('own',req('x'))).status,503);assert.equal(loaded,false);
 await validateMedalPdf(pdf());for(const bytes of [Buffer.from('<html>fake</html>'),Buffer.from('%PDF-1.4\nstartxref /Root /Type /Catalog %%EOF'),Buffer.concat([pdf(),Buffer.from('/JavaScript')]),Buffer.alloc(5242881)])await assert.rejects(validateMedalPdf(bytes));
});
const url=process.env.AUTHORING_TEST_DATABASE_URL;
test('medal permissions, immutable audits, races and storage failures', {skip:!url},async t=>{
 const target=new URL(url!);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/physcratic_authoring_test');
 const schema='medal_'+randomUUID().replaceAll('-',''),role=schema+'_runtime',admin=new Pool({connectionString:url});await admin.query(`CREATE SCHEMA ${schema};CREATE ROLE ${role} NOLOGIN`);
 const pool=new Pool({connectionString:url,options:`-c search_path=${schema},public`});let runtime:Pool|undefined;
 try{
 await pool.query('CREATE TABLE "user"(id text PRIMARY KEY); INSERT INTO "user" VALUES(\'owner\'),(\'admin\'),(\'other\'),(\'mod\')');const up=await readFile('migrations/0010_community_medals.up.sql','utf8'),down=await readFile('migrations/0010_community_medals.down.sql','utf8');await pool.query('BEGIN;'+up+'COMMIT;');await pool.query('BEGIN;'+down+'COMMIT;');await pool.query('BEGIN;'+up+'COMMIT;');
 await pool.query('BEGIN;'+await readFile('migrations/0015_community_security_s1.up.sql','utf8')+'COMMIT;');
 await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role};GRANT SELECT,INSERT,UPDATE ON community_medal_claim,community_medal_limit TO ${role};GRANT SELECT ON community_medal_audit TO ${role};GRANT EXECUTE ON FUNCTION community_admin_locked(text) TO ${role}`);
 runtime=new Pool({connectionString:url,options:`-c search_path=${schema},public -c role=${role}`});
 await pool.query("INSERT INTO community_staff(user_id,role,reason) VALUES('admin','admin','operator test'),('mod','moderator','operator test')");
 const objects=new Map<string,Uint8Array>();let failPut=false,afterGet:(()=>Promise<void>)|undefined;
 const deps={pool:runtime,user:async(r:Request)=>{const id=r.headers.get('x-user');return id?{id,emailVerified:true}:null;},origin:(r:Request)=>r.headers.get('origin')==='https://test.local',storage:{put:async(path:string,b:Uint8Array)=>{objects.set(path,b);if(failPut)throw Error('SECRET_STORAGE_ERROR');},get:async(path:string)=>{if(afterGet)await afterGet();const bytes=objects.get(path);return bytes?new ReadableStream<Uint8Array>({start(c){c.enqueue(bytes);c.close();}}):null;},del:async(path:string)=>{objects.delete(path);}}};
 const api=createMedalApi(deps);let id='';
 await t.test('submission and own-only metadata; certificate is admin-only',async()=>{
 const r=await api('submit',req('owner',pdf()));assert.equal(r.status,201,await r.clone().text());id=(await r.json()).claim.id;
 assert.equal((await api('proof',req('owner'),id)).status,403);assert.equal((await api('proof',req('mod'),id)).status,403);assert.equal((await api('proof',req('admin'),randomUUID())).status,404);
 const proof=await api('proof',req('admin'),id);assert.equal(proof.status,200);assert.equal(proof.headers.get('content-disposition'),'attachment; filename="medal-proof.pdf"');assert.deepEqual(Buffer.from(await proof.arrayBuffer()),pdf());
 assert.deepEqual((await(await api('own',req('other'))).json()).claims,[]);const own=await(await api('own',req('owner'))).text();assert.ok(!own.includes('pathname')&&!own.includes('sha256')&&!own.includes('reviewer_id'));
 assert.equal((await api('submit',req('owner',pdf()))).status,409);
 const duplicate=req('owner',pdf());duplicate.headers.set('x-medal-claim',JSON.stringify({...metadata,country:'ID',competitionName:'alternate'}));assert.equal((await api('submit',duplicate)).status,409);
 assert.equal((await api('own',new Request('https://test.local/api'))).status,401);assert.equal((await api('detail',req('other'),id)).status,403);assert.equal((await api('detail',req('admin'),id)).status,200);
 });
 await t.test('role forgery, self approval, stale concurrent decisions and immutable audit',async()=>{
 await assert.rejects(runtime!.query("UPDATE community_staff SET role='admin' WHERE user_id='mod'"));await assert.rejects(runtime!.query("INSERT INTO community_staff_audit(user_id,new_role,reason,operator) VALUES('other','admin','fake','fake')"));
 await pool.query("INSERT INTO community_staff(user_id,role,reason) VALUES('owner','admin','test self review')");const body={version:2,decision:'approved',reason:'Reviewed certificate'};
 assert.equal((await api('review',req('owner',body),id)).status,403);assert.equal((await api('review',req('mod',body),id)).status,403);
 const responses=await Promise.all([api('review',req('admin',body),id),api('review',req('admin',{...body,decision:'rejected'}),id)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
 assert.equal(Number((await pool.query('SELECT count(*) FROM community_medal_audit WHERE claim_id=$1',[id])).rows[0].count),3);
 await assert.rejects(pool.query('DELETE FROM community_medal_audit WHERE claim_id=$1',[id]));await assert.rejects(runtime!.query('INSERT INTO community_medal_audit(claim_id,version,actor_id,state,reason) VALUES($1,9,\'admin\',\'approved\',\'fake\')',[id]));
 const current=(await pool.query('SELECT state,version FROM community_medal_claim WHERE id=$1',[id])).rows[0];if(current.state==='approved')assert.equal((await api('review',req('admin',{version:current.version,decision:'revoked',reason:'Withdrawn evidence'}),id)).status,200);
 });
 await t.test('role revocation during proof retrieval blocks bytes',async()=>{
 afterGet=async()=>{await pool.query("UPDATE community_staff SET role='none',reason='revoked during fetch' WHERE user_id='admin'");};assert.equal((await api('proof',req('admin'),id)).status,403);afterGet=undefined;assert.equal((await api('queue',req('admin'))).status,403);
 assert.equal(Number((await pool.query("SELECT count(*) FROM community_staff_audit WHERE user_id='admin'")).rows[0].count),2);
 });
 await t.test('ambiguous PUT remains tracked and inaccessible; quotas and forgery',async()=>{
 failPut=true;const r=await api('submit',req('other',pdf()));assert.equal(r.status,503);assert.ok(!(await r.text()).includes('SECRET'));
 const row=(await pool.query("SELECT id,state FROM community_medal_claim WHERE user_id='other'")).rows[0];assert.equal(row.state,'uploading');assert.equal(objects.size,2);
 const forged=req('mod',pdf());forged.headers.set('x-medal-claim',JSON.stringify({...metadata,userId:'owner',role:'admin'}));assert.equal((await api('submit',forged)).status,400);
 const cross=req('mod',pdf());cross.headers.set('origin','https://evil.test');assert.equal((await api('submit',cross)).status,403);
 for(let i=0;i<5;i++)await api('submit',req('mod',Buffer.from('bad')));assert.equal((await api('submit',req('mod',pdf()))).status,429);
 await pool.query("UPDATE community_medal_limit SET requests=30 WHERE user_id='owner'");assert.equal((await api('own',req('owner'))).status,429);
 await assert.rejects(pool.query('BEGIN;'+down+'COMMIT;'));await pool.query('ROLLBACK');
 });
 }finally{await runtime?.end();await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE;DROP ROLE ${role}`);await admin.end();}
});

test('medal storage uses explicit private binding and rejects namespace/configuration abuse',async()=>{
 const {createPrivateMedalStorage}=await import('./community/medal-storage');const calls:unknown[][]=[];
 const sdk={put:async(...args:unknown[])=>{calls.push(args);},get:async(...args:unknown[])=>{calls.push(args);return null;},del:async(...args:unknown[])=>{calls.push(args);}};
 const storage=createPrivateMedalStorage({sdk:sdk as never,env:()=>({COMMUNITY_MEDAL_BLOB_STORE_ID:'store_medals'}),oidc:async()=>'synthetic-oidc'});
 const path=`community-medal-proof/${randomUUID()}.pdf`;await storage.put(path,pdf());const options=calls[0][2] as Record<string,unknown>;assert.equal(options.access,'private');assert.equal(options.contentType,'application/pdf');assert.equal(options.allowOverwrite,false);assert.equal(options.storeId,'store_medals');
 await assert.rejects(storage.get('https://evil.invalid/proof.pdf'));await assert.rejects(storage.get('community-profile-media/x.webp'));assert.equal(calls.length,1);
 await assert.rejects(createPrivateMedalStorage({sdk:sdk as never,env:()=>({}),oidc:async()=>'synthetic'}).put(path,pdf()));assert.equal(calls.length,1);
});
