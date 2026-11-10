import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import arena from './arena/index.json'
import { getEstimatedProblemElo } from './problem-archive'
import { createUnifiedArenaApi } from './unified-arena-api';
import { problemKey,problemHref,problemKeySchema,unifiedArenaPageSchema } from './unified-arena';
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
  const expected = arena.problems.filter(p => getEstimatedProblemElo(p.id) >= min && getEstimatedProblemElo(p.id) < max).map(p => p.id).sort()
  assert.deepEqual(page.problems.map(p => p.id), expected, difficulty)
 }
})
const url=process.env.AUTHORING_TEST_DATABASE_URL;
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
