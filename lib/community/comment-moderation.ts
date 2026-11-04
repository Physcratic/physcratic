import 'server-only';
import type {PoolClient} from 'pg';
import {evaluateComment} from './content-policy';
import type {commentWriteSchema} from './comments-contracts';
import type {z} from 'zod';
export class ContentModerationError extends Error{constructor(public status:number,message:string){super(message);}}
export async function checkCommentWrite(c:PoolClient,key:string,body:z.infer<typeof commentWriteSchema>,actor:string){
 const target=body.action==='create'?body.parent:body.id;
 if(target){const found=(await c.query('SELECT id FROM community_comment WHERE id=$1 AND problem_key=$2',[target,key])).rows[0];if(!found)throw new ContentModerationError(404,'Comment not found.');const root=(await c.query('SELECT community_thread_root($1) AS id',[target])).rows[0].id;
 await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,14))',['community-thread:'+root]);
 const locked=(await c.query('SELECT locked FROM community_thread_lock WHERE root_id=$1',[root])).rows[0]?.locked;
 if(locked&&body.action!=='delete')throw new ContentModerationError(423,'This thread is locked.');
 const row=(await c.query(`SELECT c.deleted_at,coalesce(r.state,'held') AS state FROM community_comment c LEFT JOIN community_comment_review r ON r.comment_id=c.id WHERE c.id=$1 AND c.problem_key=$2 FOR UPDATE OF c`,[target,key])).rows[0];
 if((body.action==='like'||body.action==='create')&&!row.deleted_at&&row.state!=='visible')throw new ContentModerationError(403,'This comment is unavailable for reactions or replies.');
 }
 if(body.action==='create'||body.action==='edit'){const limit=await c.query(`INSERT INTO community_content_limit(user_id,day,writes) VALUES($1,(clock_timestamp() AT TIME ZONE 'UTC')::date,1) ON CONFLICT(user_id) DO UPDATE SET writes=CASE WHEN community_content_limit.day=(clock_timestamp() AT TIME ZONE 'UTC')::date THEN least(101,community_content_limit.writes+1) ELSE 1 END,day=(clock_timestamp() AT TIME ZONE 'UTC')::date RETURNING writes`,[actor]);if(limit.rows[0].writes>100)throw new ContentModerationError(429,'Daily content revision limit reached.');if(evaluateComment(body.body).state==='blocked')throw new ContentModerationError(422,'This text cannot be posted. Please revise it.');}
}
export async function recordCommentPolicy(c:PoolClient,id:string,actor:string,body:string){const decision=evaluateComment(body);if(decision.state==='blocked')throw new ContentModerationError(422,'This text cannot be posted.');await c.query('SELECT community_apply_content_policy($1,$2,$3,$4,$5)',[id,actor,decision.state,decision.codes,decision.policyVersion]);}
