// Synthetic data and schema on an explicitly disposable localhost database only.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Client} from 'pg';
export const root=new URL('../../../',import.meta.url);
export const q=x=>'"'+x.replaceAll('"','""')+'"';
export const hash=x=>createHash('sha256').update(x).digest('hex');
export const baseline=JSON.parse(await readFile(new URL('baselines/production-preauthoring.json',import.meta.url),'utf8'));
export const catalogSQL=await readFile(new URL('catalog-readonly.sql',import.meta.url),'utf8');
export async function local(database='neondb',role='neondb_owner'){
 const u=new URL(process.env.AUTHORING_TEST_DATABASE_URL||'http://invalid');
 assert.equal(u.hostname,'127.0.0.1');assert.equal(u.pathname,'/physcratic_authoring_test');
 assert.ok(['neondb','physcratic_authoring_test','physcratic_restore_test'].includes(database));
 const passwords={postgres:'local-test-only',neondb_owner:'synthetic-owner-only',physcratic_integration_app:'synthetic-app-only'};
 assert.ok(role in passwords);
 const c=new Client({host:'127.0.0.1',port:Number(u.port),database,user:role,password:passwords[role],connectionTimeoutMillis:5000,query_timeout:30000});await c.connect();assert.equal((await c.query('SHOW server_version_num')).rows[0].server_version_num,'180006');return c;
}
export async function schema(c){await c.query('SET search_path=pg_catalog,public');return(await c.query(catalogSQL)).rows[0].report;}
export async function schemaHash(c){const r=(await c.query(`SELECT encode(sha256(convert_to((report-'identity'-'database')::text,'UTF8')),'hex') AS sha FROM(${catalogSQL.trim().replace(/;$/,'')})s`)).rows[0];return r.sha;}
export function fixtureDDL(){
 const b=baseline.catalog;assert.equal(b.functions.length,0);assert.equal(b.sequences.length,0);assert.equal(b.views.length,0);assert.equal(b.types.length,0);assert.equal(b.policies.length,0);
 const statements=[];
 for(const t of b.tables){assert.equal(t.kind,'r');assert.equal(t.rls,false);assert.equal(t.force_rls,false);assert.equal(t.triggers.length,0);
  const cols=t.columns.map(c=>{assert.equal(c.identity,'');assert.equal(c.generated,'');const nn=t.constraints.find(k=>k.type==='n'&&k.definition===`NOT NULL ${q(c.name)}`)||t.constraints.find(k=>k.type==='n'&&k.definition===`NOT NULL ${c.name}`);return `${q(c.name)} ${c.type}${c.default?' DEFAULT '+c.default:''}${c.not_null?(nn?' CONSTRAINT '+q(nn.name):'')+' NOT NULL':''}`;});
  statements.push(`CREATE TABLE public.${q(t.name)}(${cols.join(',')})`);
 }
 for(const type of ['p','u','c','f'])for(const t of b.tables)for(const k of t.constraints.filter(k=>k.type===type)){assert.ok(k.validated);statements.push(`ALTER TABLE public.${q(t.name)} ADD CONSTRAINT ${q(k.name)} ${k.definition}`);}
 for(const t of b.tables)for(const i of t.indexes){assert.ok(i.valid&&i.ready);if(!i.constraint_index)statements.push(i.definition);}
 return statements;
}
export async function install(c){await c.query('SET search_path=public,pg_catalog');for(const s of fixtureDDL())await c.query(s);await c.query('SET search_path=pg_catalog,public');assert.equal(await schemaHash(c),baseline.structural_schema_sha256,'exact representative table/function/index/constraint catalog');const d=(await schema(c)).database;for(const k of ['encoding','provider','locale','ctype','collation_version'])assert.equal(d[k],baseline.catalog.database[k]);}
export async function insert(c,table,row){const keys=Object.keys(row);await c.query(`INSERT INTO public.${q(table)}(${keys.map(q).join(',')})VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')})`,keys.map(k=>row[k]));}
export async function seed(c){
 const stamp='2026-01-01T00:00:00.000Z',version='c'.repeat(64),uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
 for(let i=0;i<9;i++){const id='synthetic-user-'+i;await insert(c,'user',{id,name:'Synthetic user '+i,email:`synthetic-${i}@example.invalid`,emailVerified:i===0,createdAt:stamp,updatedAt:stamp,termsAcceptedVersion:'synthetic-terms',termsAcceptedAt:stamp});await insert(c,'account',{id:'synthetic-account-'+i,accountId:id,providerId:'credential',userId:id,password:'SYNTHETIC-NOT-A-REAL-PASSWORD-HASH',createdAt:stamp,updatedAt:stamp});}
 for(let i=0;i<3;i++){await insert(c,'session',{id:'synthetic-session-'+i,expiresAt:'2030-01-01T00:00:00Z',token:'SYNTHETIC-NONFUNCTIONAL-SESSION-'+i,userId:'synthetic-user-'+i,createdAt:stamp,updatedAt:stamp});await insert(c,'solution_evidence',{id:uuid(20+i),userId:'synthetic-user-0',pathname:'synthetic-local-only/'+i,filename:'synthetic.txt',mediaType:'text/plain',bytes:10,sha256:'d'.repeat(64),createdAt:stamp});}
 for(let i=0;i<4;i++)await insert(c,'solution_attempt',{id:uuid(10+i),userId:'synthetic-user-0',problemId:'synthetic-problem',problemVersion:version,partId:'A',payload:JSON.stringify({synthetic:true,unicode:'retained α',negative:-2}),status:'awaiting-reference',idempotencyKey:uuid(30+i),createdAt:stamp});
 await insert(c,'archive_progress',{userId:'synthetic-user-0',taskId:'synthetic-task',reviewed:true,notes:'Retained synthetic notes',answer:'-1/2',updatedAt:stamp});
 await insert(c,'practice_attempt',{id:uuid(1),userId:'synthetic-user-0',problemId:'synthetic-practice',idempotencyKey:uuid(2),answer:-0.5,working:'Synthetic working',correct:true,createdAt:stamp});
 await insert(c,'coaching_inquiry',{id:uuid(3),pathway:'synthetic',audience:'synthetic',current_level:'synthetic',goals:'Retained synthetic inquiry',contact:'synthetic@example.invalid',created_at:stamp});
 const checks=[{partId:'A',expected:'m*g',variables:['m','g'],maxPoints:2}];
 for(let i=0;i<100;i++)await insert(c,'problem_rating',{problemId:'synthetic-config-'+i,sourceVersion:version,rating:1200,ratingVersion:1,ratedEnabled:true,checks:JSON.stringify(checks),reviewedBy:'Synthetic fixture',updatedAt:stamp});
 // Additional sentinels populate otherwise-empty Production tables to exercise preservation.
 await insert(c,'contest',{id:'synthetic-contest',name:'Synthetic contest',description:'Synthetic preserved contest',startsAt:stamp,durationMinutes:60,published:false,rated:false,registrationOpen:false,problemIds:'[]',creators:'[]',createdAt:stamp});
 await insert(c,'contest_registration',{userId:'synthetic-user-0',contestId:'synthetic-contest',createdAt:stamp});
 await insert(c,'contest_rating',{id:uuid(4),userId:'synthetic-user-0',contestId:'synthetic-contest',publicHandle:'synthetic-handle',rating:1200,change:0,createdAt:stamp});
 await insert(c,'individual_rating',{userId:'synthetic-user-0',rating:1200,ratedAttempts:1,updatedAt:stamp});
 await insert(c,'individual_rating_event',{id:uuid(5),userId:'synthetic-user-0',attemptId:uuid(10),problemId:'synthetic-event',sourceVersion:version,ratingVersion:1,problemRating:1200,beforeRating:1200,afterRating:1200,change:0,score:0.5,expectedScore:0.5,kFactor:32,createdAt:stamp});
 await insert(c,'solution_check',{attemptId:uuid(10),userId:'synthetic-user-0',problemId:'synthetic-event',partId:'A',sourceVersion:version,ratingVersion:1,matched:true,maxPoints:2,awardedPoints:2,createdAt:stamp});
 await insert(c,'verification',{id:'synthetic-verification',identifier:'synthetic@example.invalid',value:'SYNTHETIC-NONFUNCTIONAL-VERIFICATION',expiresAt:'2030-01-01T00:00:00Z',createdAt:stamp,updatedAt:stamp});
}
export async function fingerprints(c){const out={};for(const t of baseline.catalog.tables){const r=(await c.query(`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex') AS sha256 FROM public.${q(t.name)} r`)).rows[0];out[t.name]=r;}return out;}
