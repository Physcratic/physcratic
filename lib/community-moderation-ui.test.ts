import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {communityModerationUiEnabled} from './community/moderation-route';
import {communityCommentsEnabled} from './community/comments-route';
import {evaluateComment} from './community/content-policy';
import {pruneModerationPage} from './community/moderation-maintenance';
import {casePageSchema,caseTitle,ModerationRequestError} from './community/moderation-client';
import {achievementMigrations} from '../tests/community-achievement-fixtures';
test('moderation UI is default-deny and cannot release the production discussion lock',()=>{
 assert.equal(communityModerationUiEnabled({}),false);
 assert.equal(communityModerationUiEnabled({COMMUNITY_MODERATION_UI_ENABLED:'true'}),false);
 const flags={COMMUNITY_MODERATION_UI_ENABLED:'true',COMMUNITY_MODERATION_ENABLED:'true',COMMUNITY_STAFF_ENABLED:'true',COMMUNITY_COMMENTS_ENABLED:'true',NODE_ENV:'production',VERCEL_ENV:'production'};
 assert.equal(communityModerationUiEnabled(flags),true);assert.equal(communityCommentsEnabled(flags),false);
 const id=randomUUID();assert.equal(caseTitle(casePageSchema.parse({cases:[{id,state:'open',version:1,reason:'spam',resolution:'',createdAt:'now',updatedAt:'now',details:'<script>plain text</script>',subject:{kind:'profile',handle:'public_user'}}],nextCursor:null}).cases[0]),'Profile @public_user');
 assert.match(new ModerationRequestError(409).message,/Reload/);assert.match(new ModerationRequestError(403).message,/independent/);
});
test('physics terminology and ordinary data labels stay visible while executable URL signals are held',()=>{
 for(const text of ['Experimental data: 1, 2, 3','Classical mass, susceptibility and dielectric scattering','Killing vectors and homogeneous Gaussian fields','Dick and Feynman discuss bosons','sin x = x, class assumptions','See https://doi.org/10.1000/example'])assert.equal(evaluateComment(text).state,'visible',text);
 for(const text of ['data:text/html,<script>attack</script>','data:image/svg+xml;base64,abc','javascript:alert(1)','n i g g e r'])assert.equal(evaluateComment(text).state,'held',text);
});
const url=process.env.AUTHORING_TEST_DATABASE_URL;
test('operator maintenance scans bounded keyset pages, preserves live quotas/history and rolls back safely',{skip:!url},async()=>{
 const target=new URL(url!);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/physcratic_authoring_test');
 const schema='maintenance_'+randomUUID().replaceAll('-',''),admin=new Pool({connectionString:url});await admin.query(`CREATE SCHEMA ${schema}`);const pool=new Pool({connectionString:url,options:`-c search_path=${schema},public`}),c=await pool.connect();
 try{
 await c.query('CREATE TABLE "user"(id text PRIMARY KEY)');for(const name of [...achievementMigrations,'0010_community_medals','0013_community_comments','0014_community_moderation'])await c.query('BEGIN;'+await readFile(`migrations/${name}.up.sql`,'utf8')+'COMMIT;');
 await c.query("INSERT INTO community_moderation_limit(bucket,minute,requests,day) SELECT 'old:'||lpad(n::text,4,'0'),clock_timestamp()-interval '31 days',1,current_date-31 FROM generate_series(1,405) n");
 await c.query("INSERT INTO community_moderation_limit(bucket,minute,requests,day) VALUES('live',clock_timestamp(),30,current_date)");
 let cursor:string[]|null=[],scanned=0,removed=0;
 do{await c.query('BEGIN');const result=await pruneModerationPage(c,'moderation',cursor);assert.ok(result.scanned<=200);scanned+=result.scanned;removed+=result.removed;cursor=result.next;await c.query('COMMIT');}while(cursor);
 assert.equal(scanned,406);assert.equal(removed,405);assert.equal((await c.query('SELECT requests FROM community_moderation_limit')).rows[0].requests,30);
 await c.query("INSERT INTO \"user\" VALUES('old'),('live')");
 await c.query("INSERT INTO community_content_limit VALUES('old',current_date-31,100),('live',current_date,100)");
 await c.query('BEGIN');assert.equal((await pruneModerationPage(c,'content')).removed,1);await c.query('ROLLBACK');assert.equal((await c.query('SELECT count(*) FROM community_content_limit')).rows[0].count,'2');
 await c.query('BEGIN');assert.equal((await pruneModerationPage(c,'content')).removed,1);await c.query('COMMIT');
 await c.query("INSERT INTO community_comment_spam VALUES('old',repeat('a',64),clock_timestamp()-interval '31 days'),('live',repeat('a',64),clock_timestamp())");
 await c.query('BEGIN');assert.equal((await pruneModerationPage(c,'spam')).removed,1);await c.query('COMMIT');
 await c.query("INSERT INTO community_comment_limit(bucket,minute,requests,post_minute,day) VALUES('old',clock_timestamp()-interval '31 days',1,clock_timestamp()-interval '31 days',current_date-31),('live',clock_timestamp(),30,clock_timestamp(),current_date)");
 await c.query('BEGIN');assert.equal((await pruneModerationPage(c,'comments')).removed,1);await c.query('COMMIT');
 // A concurrent quota refresh locks its row. Maintenance skips it, then preserves the refreshed window.
 await c.query("INSERT INTO community_moderation_limit(bucket,minute,requests,day) VALUES('race',clock_timestamp()-interval '31 days',1,current_date-31)");
 const writer=await pool.connect();try{await writer.query('BEGIN');await writer.query("INSERT INTO community_moderation_limit(bucket,minute,requests,day) VALUES('race',clock_timestamp(),60,current_date) ON CONFLICT(bucket) DO UPDATE SET minute=excluded.minute,day=excluded.day,requests=excluded.requests");await c.query('BEGIN');assert.equal((await pruneModerationPage(c,'moderation')).removed,0);await c.query('COMMIT');await writer.query('COMMIT');await c.query('BEGIN');assert.equal((await pruneModerationPage(c,'moderation')).removed,0);await c.query('COMMIT');assert.equal((await c.query("SELECT requests FROM community_moderation_limit WHERE bucket='race'")).rows[0].requests,60);}finally{await writer.query('ROLLBACK');writer.release();}
 await assert.rejects(pruneModerationPage(c,'spam',['bad']));
 assert.equal((await c.query('SELECT count(*) FROM community_moderation_audit')).rows[0].count,'0');
 }finally{c.release();await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
});
