import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { achievementFixtures,installAchievementFixtures,achievementRequest as req,achievementParsed as parsed } from '../tests/community-achievement-fixtures';
import { createCommunityAchievementsApi } from './community/achievements-api';
import { createMedalApi } from './community/medal-api';
import { medalShowcaseEnabled } from './community/achievements-route';
import { verificationUiEnabled } from './community/medal-route';
import { claimHeader,metadataCsv } from './community/medal-client';
test('independent default-off gates and safe Unicode/CSV metadata encoding',()=>{
 assert.equal(medalShowcaseEnabled({COMMUNITY_MEDAL_SHOWCASE_ENABLED:'true'}),false);assert.equal(verificationUiEnabled({COMMUNITY_MEDALS_ENABLED:'true',COMMUNITY_STAFF_ENABLED:'true'}),false);
 assert.equal(JSON.parse(claimHeader({certificateName:'李 Ω'})).certificateName,'李 Ω');assert.match(claimHeader({certificateName:'李'}),/\\u/);
 const csv=metadataCsv([{id:'=formula',competition:'IPhO',award:'gold',year:2025,country:'ID',state:'approved',certificateName:'SECRET',reason:'SECRET',version:2,createdAt:'',updatedAt:'',competitionName:''}]);assert.ok(csv.includes("'=formula"));assert.ok(!csv.includes('SECRET'));
});
const url=process.env.AUTHORING_TEST_DATABASE_URL;
test('0011 preserves ordered selections, guards medal ownership and filters revocation/privacy', {skip:!url},async()=>{
 const target=new URL(url!);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/physcratic_authoring_test');const schema='showcase_'+randomUUID().replaceAll('-',''),role=schema+'_runtime';const admin=new Pool({connectionString:url});await admin.query(`CREATE SCHEMA ${schema};CREATE ROLE ${role} NOLOGIN`);const pool=new Pool({connectionString:url,options:`-c search_path=${schema},public`});let runtime:Pool|undefined;
 try{
 await installAchievementFixtures(pool);const f=achievementFixtures(pool),owner=await f.user(),other=await f.user(),reviewer=await f.user();await f.problem(owner);
 const off=createCommunityAchievementsApi(f.deps);await parsed(await off(req(owner,{selectedIds:['first-spark']},'PATCH')));assert.equal((await parsed(await off(req(owner)))).selectedIds[0],'first-spark');assert.equal((await off(req(owner,{selectedIds:['medal:'+randomUUID()]},'PATCH'))).status,400);
 await pool.query('BEGIN;'+await readFile('migrations/0010_community_medals.up.sql','utf8')+'COMMIT;');
 const up=await readFile('migrations/0011_community_medal_showcase.up.sql','utf8'),down=await readFile('migrations/0011_community_medal_showcase.down.sql','utf8');await pool.query('BEGIN;'+up+'COMMIT;');await pool.query('BEGIN;'+down+'COMMIT;');await pool.query('BEGIN;'+up+'COMMIT;');assert.deepEqual((await parsed(await off(req(owner)))).selectedIds,['first-spark']);
 await pool.query("INSERT INTO community_staff(user_id,role,reason) VALUES($1,'admin','test')",[reviewer]);
 async function claim(who:string,state='approved'){
  const id=randomUUID();await pool.query(`INSERT INTO community_medal_claim(id,user_id,competition,award,year,country,competition_name,certificate_name,pathname,bytes,sha256) VALUES($1,$2,'National','silver',2025,'ID',$3,'SECRET_CERTIFICATE',$4,10,$5)`,[id,who,id,`community-medal-proof/${id}.pdf`,'a'.repeat(64)]);await pool.query("UPDATE community_medal_claim SET state='pending',version=2 WHERE id=$1",[id]);if(state==='approved')await pool.query("UPDATE community_medal_claim SET state='approved',version=3,reviewer_id=$2,reason='reviewed' WHERE id=$1",[id,reviewer]);return id;
 }
 const medal=await claim(owner),foreign=await claim(other),pending=await claim(owner,'pending');
 await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role};GRANT SELECT ON community_profile,authored_problem,authored_revision,authored_revision_part,authored_attempt,community_approved_medal TO ${role};GRANT SELECT,UPDATE ON community_medal_claim TO ${role};GRANT SELECT,INSERT,UPDATE ON community_badge_selection,community_achievement_write_limit TO ${role};GRANT EXECUTE ON FUNCTION community_achievement_progress(text),community_achievement_problem_solved(text,uuid),community_showcase_ids_valid(text[]) TO ${role}`);
 runtime=new Pool({connectionString:url,options:`-c search_path=${schema},public -c role=${role}`});const api=createCommunityAchievementsApi({...f.deps,pool:runtime,medalsEnabled:()=>true});const patch=(ids:string[])=>api(req(owner,{selectedIds:ids},'PATCH'));const handle=(await pool.query('SELECT handle FROM community_profile WHERE user_id=$1',[owner])).rows[0].handle;const publicRead=()=>api(req(undefined,undefined,'GET','/api?handle='+handle));
 const ids=['medal:'+medal,'first-spark'];await parsed(await patch(ids));assert.deepEqual((await parsed(await api(req(owner)))).selectedIds,ids);
 const visible=await parsed(await publicRead());assert.deepEqual(visible.selectedIds,ids);assert.equal(visible.medals[0].award,'silver');for(const secret of ['SECRET_CERTIFICATE','pathname','sha256','userId','reviewer','reason'])assert.ok(!JSON.stringify(visible).includes(secret));
 assert.equal((await patch(['medal:'+foreign])).status,409);assert.equal((await patch(['medal:'+pending])).status,409);assert.equal((await patch([...ids,'problem-weaver'])).status,400);assert.equal((await patch([ids[0],ids[0]])).status,400);
 await assert.rejects(runtime.query('UPDATE community_badge_selection SET badge_ids=$2 WHERE user_id=$1',[owner,['medal:'+foreign]]));
 await pool.query('UPDATE community_profile SET public_visibility=false WHERE user_id=$1',[owner]);assert.equal((await publicRead()).status,404);await pool.query('UPDATE community_profile SET public_visibility=true WHERE user_id=$1',[owner]);
 const medals=createMedalApi({...f.deps,storage:{put:async()=>{},get:async()=>null,del:async()=>{}}});assert.equal((await medals('review',req(owner,{version:3,decision:'revoked',reason:'spoofed'}),medal)).status,403);assert.equal((await medals('review',req(reviewer,{version:3,decision:'revoked',reason:'withdrawn'}),medal)).status,200);
 const revoked=await parsed(await publicRead());assert.deepEqual(revoked.selectedIds,['first-spark']);assert.deepEqual(revoked.medals,[]);assert.equal((await parsed(await api(req(owner)))).hiddenSelectionCount,1);
 // Installed extension with flag off keeps old reads functional, hides medal IDs and never exposes claim fields.
 assert.deepEqual((await parsed(await off(req(owner)))).selectedIds,['first-spark']);
 await assert.rejects(pool.query('BEGIN;'+down+'COMMIT;'));await pool.query('ROLLBACK');
 }finally{await runtime?.end();await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE;DROP ROLE ${role}`);await admin.end();}
});
