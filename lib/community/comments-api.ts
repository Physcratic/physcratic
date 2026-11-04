import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {z} from 'zod';
import {readRequestBytes,RequestBodyTimeoutError} from '../submission-request';
import {profileReply} from './profile-api';
import {commentWriteSchema,commentListSchema,commentCursorSchema,commentsPageSchema} from './comments-contracts';
import {checkCommentWrite,recordCommentPolicy,ContentModerationError} from './comment-moderation';
const normalizedText=(body:string)=>body.normalize('NFKC').toLowerCase().replace(/\s+/gu,' ').trim();
class Fault extends Error{constructor(public status:number,public message:string){super(message);}}
type Deps={pool:Pool;user:(r:Request)=>Promise<{id:string;emailVerified?:boolean}|null|undefined>;origin:(r:Request)=>boolean;ip:(r:Request)=>string;profiles?:()=>boolean;moderation?:()=>boolean};
export function createCommentsApi(deps:Deps){
 async function tx<T>(fn:(c:PoolClient)=>Promise<T>){const c=await deps.pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='4s'; SET LOCAL lock_timeout='2s'");const v=await fn(c);await c.query('COMMIT');return v;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
 async function publication(c:PoolClient,key:string){if(key.startsWith('authored:')){if(!(await c.query(`SELECT p.id FROM authored_problem p JOIN authored_revision r ON r.id=p.published_revision_id AND r.problem_id=p.id WHERE p.id=$1 AND p.state='published' FOR SHARE OF p`,[key.slice(9)])).rows[0])throw new Fault(404,'Problem not found.');}}
 async function charge(bucket:string,max:number,post=false){const query={text:`INSERT INTO community_comment_limit(bucket,minute,requests,post_minute,minute_posts,day,posts) VALUES($1,date_trunc('minute',clock_timestamp()),1,date_trunc('minute',clock_timestamp()),$2,(clock_timestamp() AT TIME ZONE 'UTC')::date,$2)
 ON CONFLICT(bucket) DO UPDATE SET requests=CASE WHEN community_comment_limit.minute=date_trunc('minute',clock_timestamp()) THEN least(121,community_comment_limit.requests+1) ELSE 1 END,minute=date_trunc('minute',clock_timestamp()),
 minute_posts=CASE WHEN community_comment_limit.post_minute=date_trunc('minute',clock_timestamp()) THEN least(7,community_comment_limit.minute_posts+$2) ELSE $2 END,post_minute=date_trunc('minute',clock_timestamp()),
 posts=CASE WHEN community_comment_limit.day=(clock_timestamp() AT TIME ZONE 'UTC')::date THEN least(51,community_comment_limit.posts+$2) ELSE $2 END,day=(clock_timestamp() AT TIME ZONE 'UTC')::date RETURNING requests,minute_posts,posts`,values:[bucket,post?1:0],query_timeout:5000};const {rows}=await deps.pool.query(query);if(rows[0].requests>max||rows[0].minute_posts>6||rows[0].posts>50)throw new Fault(429,'Discussion limit reached. Retry later.');}
 async function spam(c:PoolClient,user:string,body:string){const hash=createHash('sha256').update(normalizedText(body)).digest('hex');
  // A rolling ten-minute duplicate block, shared across problems and create/edit actions.
  const result=await c.query(`INSERT INTO community_comment_spam(user_id,body_hash,last_post) VALUES($1,$2,clock_timestamp()) ON CONFLICT(user_id,body_hash) DO UPDATE SET last_post=excluded.last_post WHERE community_comment_spam.last_post<clock_timestamp()-interval '10 minutes' RETURNING 1`,[user,hash]);if(!result.rows[0])throw new Fault(409,'Duplicate text. Wait or write a different comment.');
  await c.query("DELETE FROM community_comment_spam WHERE user_id=$1 AND last_post<clock_timestamp()-interval '10 minutes'",[user]);
 }
 return async(request:Request)=>{try{
  if(!['GET','POST'].includes(request.method))throw new Fault(405,'Method not allowed.');
  const url=new URL(request.url),user=await deps.user(request);
  if(request.method==='GET'){
   if(request.url.length>4096||[...url.searchParams.keys()].some(k=>url.searchParams.getAll(k).length!==1))throw new Fault(400,'Invalid discussion request.');
   const input=commentListSchema.parse(Object.fromEntries(url.searchParams));const parent=input.parent??null;
   const cursor=input.after?commentCursorSchema.parse(JSON.parse(input.after)):null;
   if(cursor&&(cursor.key!==input.key||cursor.parent!==parent||cursor.sort!==input.sort))throw new Fault(400,'Cursor does not match this discussion.');
   return await tx(async c=>{await publication(c,input.key);
    if(parent&&!(await c.query('SELECT id FROM community_comment WHERE id=$1 AND problem_key=$2',[parent,input.key])).rows[0])throw new Fault(404,'Comment not found.');
    const values:unknown[]=[input.key,user?.id??null];const bind=(v:unknown)=>{values.push(v);return '$'+values.length;};
    const where=["c.problem_key=$1",parent?`c.parent_id=${bind(parent)}::uuid`:"c.parent_id IS NULL"];
    if(cursor){const created=bind(cursor.created),id=bind(cursor.id);where.push(input.sort==='top'?`(c.score,c.created_at,c.id)<(${bind(cursor.score)}::bigint,${created}::timestamptz,${id}::uuid)`:`(c.created_at,c.id)<(${created}::timestamptz,${id}::uuid)`);}
    const profiles=deps.profiles?.()===true,moderated=deps.moderation?.()===true;
    const visible=moderated?"coalesce(cm.state,'held')='visible'":'true';
    const query={text:`SELECT c.id,c.parent_id AS "parentId",CASE WHEN c.deleted_at IS NOT NULL THEN '' WHEN (${visible}) OR c.user_id=$2 THEN c.body ELSE '[Comment unavailable pending review]' END AS body,c.version,c.score::text,c.depth,c.created_at AS "createdAt",c.edited_at AS "editedAt",c.deleted_at IS NOT NULL AS deleted,
     c.deleted_at IS NULL AND c.user_id=$2 AS owned,c.deleted_at IS NULL AND (${visible}) AND EXISTS(SELECT 1 FROM community_comment_like l WHERE l.comment_id=c.id AND l.user_id=$2) AS liked,
     EXISTS(SELECT 1 FROM community_comment ch WHERE ch.problem_key=c.problem_key AND ch.parent_id=c.id) AS "hasReplies",
     ${profiles?`CASE WHEN c.deleted_at IS NULL AND (${visible}) AND cp.user_id IS NOT NULL THEN jsonb_build_object('handle',cp.handle,'displayName',cp.display_name) END`:"NULL::jsonb"} AS author,
     ${profiles?`CASE WHEN pc.deleted_at IS NULL AND ${moderated?"coalesce(pm.state,'held')='visible'":'true'} AND pp.user_id IS NOT NULL THEN jsonb_build_object('handle',pp.handle,'displayName',pp.display_name) END`:"NULL::jsonb"} AS "replyAuthor"
     ${moderated?",coalesce(cm.state,'held') AS \"moderationState\"":''}
     FROM community_comment c ${moderated?'LEFT JOIN community_comment_review cm ON cm.comment_id=c.id':''} ${profiles?'LEFT JOIN community_profile cp ON cp.user_id=c.user_id AND cp.public_visibility=true LEFT JOIN community_comment pc ON pc.id=c.parent_id LEFT JOIN community_profile pp ON pp.user_id=pc.user_id AND pp.public_visibility=true':''} ${moderated&&profiles?'LEFT JOIN community_comment_review pm ON pm.comment_id=pc.id':''}
     WHERE ${where.join(' AND ')} ORDER BY ${input.sort==='top'?'c.score DESC,':''}c.created_at DESC,c.id DESC LIMIT 21`,values,query_timeout:5000};
    const {rows}=await c.query(query);const page=rows.slice(0,20),last=page.at(-1);
    const nextCursor=rows.length>20?JSON.stringify({key:input.key,parent,sort:input.sort,score:last.score,created:new Date(last.createdAt).toISOString(),id:last.id}):null;
    return profileReply(commentsPageSchema.parse({comments:page.map(r=>({...r,score:Number(r.score),owned:Boolean(r.owned),createdAt:new Date(r.createdAt).toISOString(),editedAt:r.editedAt?new Date(r.editedAt).toISOString():null})),nextCursor}));
   });
  }
  if(!user)throw new Fault(401,'Sign in to discuss.');if(!user.emailVerified||!deps.origin(request))throw new Fault(403,'Request not permitted.');
  await charge('ip:'+deps.ip(request),120);await charge('user:'+user.id,30);
  if(url.search)throw new Fault(400,'Invalid discussion request.');
  if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new Fault(415,'Send JSON.');
  const body=commentWriteSchema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readRequestBytes(request,12000,5000))));
  if(body.action==='create')await charge('posts:'+user.id,121,true);
  return await tx(async c=>{await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,13))',['community-comments:'+user.id]);await publication(c,body.key);if(deps.moderation?.())await checkCommentWrite(c,body.key,body,user.id);
   if(body.action==='create'){
    const old=(await c.query('SELECT id,problem_key,parent_id,body,deleted_at FROM community_comment WHERE user_id=$1 AND request_id=$2',[user.id,body.requestId])).rows[0];
    if(old){if(old.problem_key!==body.key||old.parent_id!==body.parent||(!old.deleted_at&&old.body!==body.body))throw new Fault(409,'Request reference already used.');return profileReply({id:old.id},200);}
    if(body.parent){const p=(await c.query('SELECT depth FROM community_comment WHERE id=$1 AND problem_key=$2 FOR SHARE',[body.parent,body.key])).rows[0];if(!p)throw new Fault(404,'Parent not found.');if(p.depth>=64)throw new Fault(409,'Maximum reply depth reached.');}
    await spam(c,user.id,body.body);const id=randomUUID();await c.query('INSERT INTO community_comment(id,problem_key,user_id,parent_id,request_id,body) VALUES($1,$2,$3,$4,$5,$6)',[id,body.key,user.id,body.parent,body.requestId,body.body]);if(deps.moderation?.())await recordCommentPolicy(c,id,user.id,body.body);return profileReply({id},201);
   }
   const row=(await c.query('SELECT id,user_id,version,body,deleted_at FROM community_comment WHERE id=$1 AND problem_key=$2 FOR UPDATE',[body.id,body.key])).rows[0];if(!row)throw new Fault(404,'Comment not found.');
   if(body.action==='like'){
    if(row.deleted_at)throw new Fault(409,'Comment is deleted.');
    if(body.liked)await c.query('INSERT INTO community_comment_like(comment_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[body.id,user.id]);else await c.query('DELETE FROM community_comment_like WHERE comment_id=$1 AND user_id=$2',[body.id,user.id]);
    return profileReply({id:body.id,liked:body.liked});
   }
   if(row.user_id!==user.id)throw new Fault(403,'Only your own comment can be changed.');
   if(row.deleted_at||row.version!==body.version||row.version===2147483647)throw new Fault(409,'Comment changed. Reload before editing.');
   if(body.action==='edit'){if(row.body===body.body)return profileReply({id:body.id});if(normalizedText(row.body)!==normalizedText(body.body))await spam(c,user.id,body.body);await c.query('UPDATE community_comment SET body=$2,version=version+1 WHERE id=$1',[body.id,body.body]);if(deps.moderation?.())await recordCommentPolicy(c,body.id,user.id,body.body);}
   else await c.query('UPDATE community_comment SET deleted_at=clock_timestamp(),version=version+1 WHERE id=$1',[body.id]);
   return profileReply({id:body.id});
  });
 }catch(e){const code=(e as {code?:string}).code;const status=e instanceof ContentModerationError?e.status:e instanceof Fault?e.status:e instanceof z.ZodError||e instanceof SyntaxError||e instanceof TypeError?400:e instanceof RangeError?413:e instanceof RequestBodyTimeoutError?408:code==='23505'||code==='23514'?409:503;const r=profileReply({error:e instanceof ContentModerationError||e instanceof Fault?e.message:status===409?'Comment conflict. Reload before retrying.':status===503?'Discussions are temporarily unavailable.':'Invalid discussion request.'},status);if(status===429)r.headers.set('Retry-After','60');return r;}
 };
}
