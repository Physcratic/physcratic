import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import arena from './arena/index.json'
import { getEstimatedProblemElo } from './problem-archive'
import { createUnifiedArenaApi } from './unified-arena-api';
import { compareByRating,problemKey,problemHref,problemKeySchema,unifiedArenaPageSchema } from './unified-arena';
import { achievementFixtures,installAchievementFixtures } from '../tests/community-achievement-fixtures';
test('namespaces preserve old readers and reject unknown identities',()=>{
 const id=randomUUID();assert.notEqual(problemKey({kind:'arena',id}),problemKey({kind:'authored',id}));
 assert.equal(problemHref({kind:'authored',id}),'/dashboard/authored/'+id);
 assert.equal(problemHref({kind:'arena',id:'arena-mind-the-gap'}),'/dashboard/problems/arena-mind-the-gap');
 assert.ok(problemKeySchema.safeParse('arena:arena-mind-the-gap').success);
 for(const key of ['arena:unknown','authored:unknown',id])assert.ok(!problemKeySchema.safeParse(key).success);
});
test('disabled community integration never queries missing tables; authored errors are explicit',async()=>{
 const pool={query:async()=>{throw Error('PRIVATE database error');}} as unknown as Pool;
 const api=createUnifiedArenaApi(pool);const r=await api(new Request('https://test/?q=mind'));
 assert.equal(r.status,200);const page=unifiedArenaPageSchema.parse(await r.json());assert.ok(page.problems.some(p=>p.id==='arena-mind-the-gap'));assert.equal(page.authoredUnavailable,true);assert.ok(!JSON.stringify(page).includes('PRIVATE'));
 assert.equal((await api(new Request('https://test/?ownerId=private'))).status,400);
});
test('rating filter URLs accept current bands and retired ranges without querying private data', async () => {
 const pool = { query: async () => { throw Error('Unexpected database query') } } as unknown as Pool
 const api = createUnifiedArenaApi(pool)
 for (const [difficulty, min, max] of [
  ['beginner-olympiad', 0, 801], ['intermediate-olympiad', 801, 1801],
  ['advanced', 1801, 2601], ['mastery', 2601, Infinity],
  ['fundamentals', 0, 200], ['under-1200', 0, 1200],
  ['1200-1599', 1200, 1600], ['1600-plus', 1600, Infinity],
 ] as const) {
  const response = await api(new Request('https://test/?' + new URLSearchParams({ source: 'arena', difficulty })))
  assert.equal(response.status, 200, difficulty)
  const page = unifiedArenaPageSchema.parse(await response.json())
  // Library order: rating from low to high, then id.
  const expected = arena.problems.filter(p => getEstimatedProblemElo(p.id) >= min && getEstimatedProblemElo(p.id) < max).map(p => p.id).sort((a, b) => getEstimatedProblemElo(a) - getEstimatedProblemElo(b) || (a < b ? -1 : 1))
  assert.deepEqual(page.problems.map(p => p.id), expected, difficulty)
 }
})
const url=process.env.AUTHORING_TEST_DATABASE_URL;
test('library order: rating from low to high, unrated last, Physcratic before community at the same rating, then id',()=>{
 const rows=[{kind:'authored',id:'b',rating:null},{kind:'arena',id:'z',rating:900},{kind:'authored',id:'a',rating:900},{kind:'authored',id:'a',rating:null},{kind:'arena',id:'y',rating:900},{kind:'authored',id:'c',rating:0},{kind:'arena',id:'x',rating:2600}] as const;
 assert.deepEqual([...rows].sort(compareByRating).map(r=>`${r.kind}:${r.id}:${r.rating}`),['authored:c:0','arena:y:900','arena:z:900','authored:a:900','arena:x:2600','authored:a:null','authored:b:null']);
});
test('with no community problems the Arena pages run from the lowest rating to the highest',async()=>{
 const pool={query:async()=>{throw Error('Unexpected database query');}} as unknown as Pool;const api=createUnifiedArenaApi(pool);
 const seen:{id:string;elo?:number}[]=[];let after:string|undefined;
 for(let page=0;page<5;page++){const r=await api(new Request('https://test/?'+new URLSearchParams({source:'arena',...(after?{after}:{})})));const body=unifiedArenaPageSchema.parse(await r.json());seen.push(...body.problems);if(!body.nextCursor)break;after=body.nextCursor;}
 assert.equal(seen.length,arena.problems.length);assert.equal(new Set(seen.map(p=>p.id)).size,seen.length);
 assert.equal(seen[0].id,'arena-cat-on-a-plank');assert.equal(seen[0].elo,500);
 for(let i=1;i<seen.length;i++)assert.ok(seen[i-1].elo!<seen[i].elo!||(seen[i-1].elo===seen[i].elo&&seen[i-1].id<seen[i].id),`${seen[i-1].id} before ${seen[i].id}`);
});
test('mixed library on PostgreSQL is in rating order across pages, with unrated community problems last',{skip:!url},async()=>{
 const target=new URL(url!);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/physcratic_authoring_test');
 const schema='unified_sort_'+randomUUID().replaceAll('-',''),admin=new Pool({connectionString:url});await admin.query(`CREATE SCHEMA ${schema}`);
 const pool=new Pool({connectionString:url,options:`-c search_path=${schema},public`});
 try{
  await installAchievementFixtures(pool);const f=achievementFixtures(pool),owner=await f.user();
  const made:Record<string,number|null>={};
  for(const label of ['700','2,500','~ 900','0','1200','1200'])made[(await f.problem(owner,undefined,true,label)).id]=Number(label.replace(/[^0-9]/g,''));
  // Older publications can carry a label that is not a rating. Publishing now needs a number, so write the labels
  // straight into this throwaway schema.
  const legacy=[await f.problem(owner),await f.problem(owner),await f.problem(owner)];
  await pool.query('ALTER TABLE authored_revision DISABLE TRIGGER USER');
  for(const [index,label] of ['Hard','4001',null].entries()){await pool.query("UPDATE authored_revision SET content=jsonb_set(content,'{estimatedDifficulty}',$2::jsonb) WHERE problem_id=$1",[legacy[index].id,JSON.stringify(label)]);made[legacy[index].id]=null;}
  await pool.query('ALTER TABLE authored_revision ENABLE TRIGGER USER');
  const api=createUnifiedArenaApi(pool);
  const walk=async(params:Record<string,string>={})=>{const seen:{kind:'arena'|'authored';id:string;rating:number|null}[]=[];let after:string|undefined,pages=0;
   for(;pages<10;pages++){const r=await api(new Request('https://test/?'+new URLSearchParams({...params,...(after?{after}:{})})));assert.equal(r.status,200);const body=unifiedArenaPageSchema.parse(await r.json());assert.equal(body.authoredUnavailable,false);
    seen.push(...body.problems.map(p=>({kind:p.kind,id:p.id,rating:p.kind==='arena'?p.elo!:made[p.id]})));if(!body.nextCursor)break;assert.equal(body.problems.length,24);after=body.nextCursor;}
   return {seen,pages:pages+1};};
  const all=await walk();
  assert.equal(all.seen.length,arena.problems.length+9);assert.equal(all.pages,2);assert.equal(new Set(all.seen.map(p=>p.kind+p.id)).size,all.seen.length);
  assert.deepEqual(all.seen,[...all.seen].sort(compareByRating));
  assert.deepEqual(all.seen[0],{kind:'authored',id:all.seen[0].id,rating:0});
  assert.ok(all.seen.slice(-3).every(p=>p.kind==='authored'&&p.rating===null));assert.deepEqual(all.seen.slice(-3).map(p=>p.id),legacy.map(p=>p.id).sort());
  const at=(rating:number)=>all.seen.filter(p=>p.rating===rating).map(p=>p.kind);
  assert.deepEqual(at(700),['arena','authored']);assert.deepEqual(at(900),['arena','arena','arena','authored']);assert.deepEqual(at(2500),['authored']);
  // The community-only view and a search keep the same order.
  const authored=await walk({source:'authored'});assert.deepEqual(authored.seen.map(p=>p.rating),[0,700,900,1200,1200,2500,null,null,null]);
  const found=await walk({q:'fixture'});assert.deepEqual(found.seen,authored.seen);
  // A cursor that is no longer published falls back to the unrated tail and never repeats a problem.
  await pool.query("UPDATE authored_problem SET state='draft' WHERE id=$1",[authored.seen[1].id]);
  const gone=unifiedArenaPageSchema.parse(await (await api(new Request('https://test/?after=authored:'+authored.seen[1].id))).json());
  assert.ok(gone.problems.every(p=>p.kind==='authored'&&made[p.id]===null));
 }finally{await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
});
test('mixed collection paginates complete filtered discovery and respects live authorship', {skip:!url},async()=>{
 const target=new URL(url!);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/physcratic_authoring_test');
 const schema='unified_'+randomUUID().replaceAll('-',''),admin=new Pool({connectionString:url});await admin.query(`CREATE SCHEMA ${schema}`);
 const pool=new Pool({connectionString:url,options:`-c search_path=${schema},public`});
 try{
 await installAchievementFixtures(pool);const f=achievementFixtures(pool),owner=await f.user(),other=await f.user();const items=[];
 for(let i=0;i<26;i++)items.push(await f.problem(owner));await f.problem(other,undefined,false);
 await pool.query("INSERT INTO community_badge_selection(user_id,badge_ids) VALUES($1,ARRAY['first-spark','problem-weaver'])",[owner]);
 const api=createUnifiedArenaApi(pool,()=>({authors:true,badges:true,medals:false}));
 const list=async(params:Record<string,string>={})=>{const r=await api(new Request('https://test/?'+new URLSearchParams(params)));assert.equal(r.status,200);return unifiedArenaPageSchema.parse(await r.json());};
 const first=await list();assert.ok(first.problems.some(p=>p.kind==='arena'));assert.ok(first.problems.some(p=>p.kind==='authored'));assert.ok(first.nextCursor);
 const second=await list({after:first.nextCursor!});assert.equal(new Set([...first.problems,...second.problems].map(p=>p.key)).size,first.problems.length+second.problems.length);
 const search=await list({q:'fixture'});assert.equal(search.problems.length,24);const rest=await list({q:'fixture',after:search.nextCursor!});assert.equal(rest.problems.length,2);assert.equal(rest.nextCursor,null);
 assert.equal((await list({difficulty:'under-1200'})).problems.filter(p=>p.kind==='authored').length,0);
 assert.equal((await list({difficulty:'unrated'})).problems.length,24);
 // Publication/privacy changes between metadata discovery and author enrichment are rechecked.
 let intercepted=false;
 const racingPool={query:async(config:Parameters<Pool['query']>[0])=>{const result=await pool.query(config);if(!intercepted){intercepted=true;await pool.query('UPDATE community_profile SET public_visibility=false WHERE user_id=$1',[owner]);}return result;}} as unknown as Pool;
 const racing=createUnifiedArenaApi(racingPool,()=>({authors:true,badges:true,medals:false}));
 const raced=await (await racing(new Request('https://test/?q=fixture'))).json();assert.ok(raced.problems.every((p:{author:unknown})=>p.author===null));
 await pool.query('UPDATE community_profile SET public_visibility=true WHERE user_id=$1',[owner]);
 const author=search.problems[0].author!;assert.equal(author.selectedIds.length,2);assert.ok(!JSON.stringify(search).includes(owner));
 await pool.query('UPDATE community_profile SET public_visibility=false WHERE user_id=$1',[owner]);assert.ok((await list({q:'fixture'})).problems.every(p=>p.author===null));
 await pool.query('UPDATE community_profile SET public_visibility=true WHERE user_id=$1',[owner]);
 for(const p of items.slice(1))await pool.query("UPDATE authored_problem SET state='draft' WHERE id=$1",[p.id]);
 const remaining=await list({q:'fixture'});assert.equal(remaining.problems.length,1);assert.deepEqual(remaining.problems[0].author!.selectedIds,['first-spark']);
 // Missing optional medal migration degrades author metadata, never discovery or private details.
 const medals=createUnifiedArenaApi(pool,()=>({authors:true,badges:true,medals:true}));const fallback=await (await medals(new Request('https://test/?q=fixture'))).json();assert.equal(fallback.problems.length,1);assert.equal(fallback.attributionUnavailable,true);
 // Install optional medal extension and exercise current approval against the same selected slots.
 for(const id of ['0010_community_medals','0011_community_medal_showcase'])await pool.query('BEGIN;'+await readFile(`migrations/${id}.up.sql`,'utf8')+'COMMIT;');
 await pool.query("INSERT INTO community_staff(user_id,role,reason) VALUES($1,'admin','fixture')",[other]);const medal=randomUUID();
 await pool.query(`INSERT INTO community_medal_claim(id,user_id,competition,award,year,country,competition_name,certificate_name,pathname,bytes,sha256) VALUES($1,$2,'IPhO','bronze',2025,'','','PRIVATE_CERTIFICATE',$3,10,$4)`,[medal,owner,`community-medal-proof/${medal}.pdf`,'a'.repeat(64)]);
 await pool.query("UPDATE community_medal_claim SET state='pending',version=2 WHERE id=$1",[medal]);await pool.query("UPDATE community_medal_claim SET state='approved',version=3,reviewer_id=$2,reason='verified' WHERE id=$1",[medal,other]);
 await pool.query('UPDATE community_badge_selection SET badge_ids=$2 WHERE user_id=$1',[owner,['medal:'+medal,'first-spark']]);
 const approved=await (await medals(new Request('https://test/?q=fixture'))).json();assert.equal(approved.problems[0].author.medals[0].award,'bronze');assert.ok(!JSON.stringify(approved).includes('PRIVATE_CERTIFICATE'));
 await pool.query("UPDATE community_medal_claim SET state='revoked',version=4,reviewer_id=$2,reason='withdrawn' WHERE id=$1",[medal,other]);const revoked=await (await medals(new Request('https://test/?q=fixture'))).json();assert.deepEqual(revoked.problems[0].author.selectedIds,['first-spark']);assert.deepEqual(revoked.problems[0].author.medals,[]);
 }finally{await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
});
