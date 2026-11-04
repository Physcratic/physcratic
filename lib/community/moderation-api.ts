import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {z} from 'zod';
import {profileReply} from './profile-api';
import {readRequestBytes,RequestBodyTimeoutError} from '../submission-request';
import {reportInput,appealInput,decisionInput,ownCasesQuery,staffQuery} from './moderation-contracts';
import type {ModerationArea} from './moderation-route';
type Deps={pool:Pool;user:(r:Request)=>Promise<{id:string;emailVerified?:boolean}|null|undefined>;origin:(r:Request)=>boolean;ip:(r:Request)=>string;profiles?:()=>boolean;commentsPublic?:()=>boolean};
class Fault extends Error{constructor(public status:number,message:string){super(message);}}
const reportProjection='id,subject,reason,details,state,version,resolution,created_at AS "createdAt",updated_at AS "updatedAt"';
const appealProjection='id,comment_id AS "commentId",content_version AS "contentVersion",review_version AS "reviewVersion",reason,state,version,resolution,created_at AS "createdAt",updated_at AS "updatedAt"';
export function createModerationApi(deps:Deps){
 async function tx<T>(fn:(c:PoolClient)=>Promise<T>){const c=await deps.pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='4s'; SET LOCAL lock_timeout='2s'");const v=await fn(c);await c.query('COMMIT');return v;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
 async function staff(c:PoolClient,id:string){const role=(await c.query('SELECT community_staff_role_locked($1) AS role',[id])).rows[0].role;if(!['admin','moderator'].includes(role))throw new Fault(403,'Staff permission required.');return role;}
 async function charge(bucket:string,max:number,reports=0,appeals=0){const q={text:`INSERT INTO community_moderation_limit(bucket,minute,requests,day,reports,appeals) VALUES($1,date_trunc('minute',clock_timestamp()),1,(clock_timestamp() AT TIME ZONE 'UTC')::date,$2,$3)
 ON CONFLICT(bucket) DO UPDATE SET requests=CASE WHEN community_moderation_limit.minute=date_trunc('minute',clock_timestamp()) THEN least(121,community_moderation_limit.requests+1) ELSE 1 END,minute=date_trunc('minute',clock_timestamp()),
 reports=CASE WHEN community_moderation_limit.day=(clock_timestamp() AT TIME ZONE 'UTC')::date THEN least(11,community_moderation_limit.reports+$2) ELSE $2 END,
 appeals=CASE WHEN community_moderation_limit.day=(clock_timestamp() AT TIME ZONE 'UTC')::date THEN least(4,community_moderation_limit.appeals+$3) ELSE $3 END,day=(clock_timestamp() AT TIME ZONE 'UTC')::date RETURNING requests,reports,appeals`,values:[bucket,reports,appeals],query_timeout:5000};const {rows}=await deps.pool.query(q);if(rows[0].requests>max||rows[0].reports>10||rows[0].appeals>3)throw new Fault(429,'Moderation request limit reached. Retry later.');}
 async function publication(c:PoolClient,key:string){if(key.startsWith('authored:')&&!(await c.query(`SELECT p.id FROM authored_problem p JOIN authored_revision r ON r.id=p.published_revision_id AND r.problem_id=p.id WHERE p.id=$1 AND p.state='published' FOR SHARE OF p`,[key.slice(9)])).rows[0])throw new Fault(404,'Subject not found.');}
 return async(area:ModerationArea,request:Request)=>{try{
  if(!['GET','POST'].includes(request.method))throw new Fault(405,'Method not allowed.');const user=await deps.user(request);if(!user)throw new Fault(401,'Sign in to continue.');if(!user.emailVerified)throw new Fault(403,'Verified session required.');if(request.method==='POST'&&!deps.origin(request))throw new Fault(403,'Request not permitted.');
  // Authorization is checked before staff limits/private queries, then locked again in the operation transaction.
  if(area==='staff')await tx(c=>staff(c,user.id));await charge('user:'+user.id,area==='staff'?60:30);if(request.method==='POST')await charge('ip:'+deps.ip(request),120);
  const url=new URL(request.url);if(request.url.length>4096||[...url.searchParams.keys()].some(k=>url.searchParams.getAll(k).length!==1))throw new Fault(400,'Invalid request.');
  if(request.method==='GET'){
   if(area!=='staff'){const params=ownCasesQuery.parse(Object.fromEntries(url.searchParams)),table=area==='reports'?'community_report':'community_moderation_appeal',owner=area==='reports'?'reporter_id':'user_id',projection=area==='reports'?reportProjection:appealProjection;
    const q={text:`SELECT ${projection} FROM ${table} WHERE ${owner}=$1 AND ($2::uuid IS NULL OR id=$2) AND ($3::uuid IS NULL OR id>$3) ORDER BY id LIMIT 21`,values:[user.id,params.id??null,params.after??null],query_timeout:5000};const {rows}=await deps.pool.query(q);if(params.id&&!rows[0])throw new Fault(404,'Case not found.');return profileReply({cases:rows.slice(0,20),nextCursor:rows.length>20?rows[19].id:null});
   }
   const params=staffQuery.parse(Object.fromEntries(url.searchParams));return await tx(async c=>{const role=await staff(c,user.id);
    if(!params.item){const queue=params.queue??'reports',table=queue==='reports'?'community_report':queue==='appeals'?'community_moderation_appeal':'community_comment_review',id=queue==='held'?'comment_id':'id',filter=queue==='reports'?"state IN ('open','triaged')":queue==='appeals'?"state='open'":"state='held'";
     const projection=queue==='reports'?reportProjection:queue==='appeals'?appealProjection:'comment_id AS id,content_version AS "contentVersion",version,state,codes,policy_version AS "policyVersion",updated_at AS "updatedAt"';
     const {rows}=await c.query(`SELECT ${projection} FROM ${table} WHERE ${filter} AND ($1::uuid IS NULL OR ${id}>$1) ORDER BY ${id} LIMIT 21`,[params.after??null]);return profileReply({role,cases:rows.slice(0,20),nextCursor:rows.length>20?rows[19].id:null});
    }
    let record;
    if(params.item==='report')record=(await c.query(`SELECT ${reportProjection} FROM community_report WHERE id=$1`,[params.id])).rows[0];
    else if(params.item==='appeal')record=(await c.query(`SELECT ${appealProjection} FROM community_moderation_appeal WHERE id=$1`,[params.id])).rows[0];
    else if(params.item==='thread')record=(await c.query('SELECT root_id AS id,problem_key AS key,locked,version,reason FROM community_thread_lock WHERE root_id=$1',[params.id])).rows[0];
    else record=(await c.query('SELECT r.comment_id AS id,c.parent_id AS "parentId",rt.id AS "rootId",coalesce(tl.version,0) AS "threadVersion",coalesce(tl.locked,false) AS "threadLocked",c.problem_key AS key,c.version AS "contentVersion",c.deleted_at IS NOT NULL AS deleted,r.version,r.state,r.codes,r.policy_version AS "policyVersion",r.reason FROM community_comment_review r JOIN community_comment c ON c.id=r.comment_id CROSS JOIN LATERAL (SELECT community_thread_root(c.id) AS id) rt LEFT JOIN community_thread_lock tl ON tl.root_id=rt.id WHERE r.comment_id=$1',[params.id])).rows[0];
    if(!record)throw new Fault(404,'Case not found.');const target=params.item+':'+params.id;
    const audit=(await c.query('SELECT id::text,actor_id AS "actorId",action,version,reason,data,created_at AS "createdAt" FROM community_moderation_audit WHERE target=$1 AND ($2::bigint IS NULL OR id<$2) ORDER BY id DESC LIMIT 51',[target,params.beforeAudit??null])).rows;
    const evidence=params.item==='comment'?(await c.query('SELECT content_version AS "contentVersion",body,deleted,created_at AS "createdAt" FROM community_comment_evidence WHERE comment_id=$1 AND ($2::integer IS NULL OR content_version<$2) ORDER BY content_version DESC LIMIT 21',[params.id,params.beforeContent??null])).rows:[];
    return profileReply({role,record,audit:audit.slice(0,50),nextAudit:audit.length>50?audit[49].id:null,evidence:evidence.slice(0,20),nextContent:evidence.length>20?evidence[19].contentVersion:null});
   });
  }
  if(url.search)throw new Fault(400,'Invalid request.');if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new Fault(415,'Send JSON.');const json=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readRequestBytes(request,12000,5000)));
  if(area==='staff'){const input=decisionInput.parse(json);return await tx(async c=>{await staff(c,user.id);await c.query('SELECT community_moderation_decide($1,$2,$3,$4,$5,$6,$7,$8)',[user.id,input.action,input.id,input.version,input.action==='comment'?input.contentVersion:0,input.action==='thread'?(input.locked?'locked':'open'):input.state,input.reason,input.action==='thread'?input.key:null]);return profileReply({id:input.id});});}
  if(area==='reports'){const input=reportInput.parse(json),requestHash=createHash('sha256').update(JSON.stringify({subject:input.subject,reason:input.reason,details:input.details})).digest('hex');await charge('reports:'+user.id,121,1);
   return await tx(async c=>{await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,14))',['community-report:'+user.id]);const old=(await c.query('SELECT id,request_hash,state FROM community_report WHERE reporter_id=$1 AND request_id=$2',[user.id,input.requestId])).rows[0];if(old){if(old.request_hash!==requestHash)throw new Fault(409,'Request reference already used.');return profileReply({id:old.id,state:old.state});}
    let subjectKey:string;const subject=input.subject;
    if(subject.kind==='profile'){if(!deps.profiles?.())throw new Fault(404,'Subject not found.');const p=(await c.query('SELECT user_id FROM community_profile WHERE lower(handle)=$1 AND public_visibility=true',[subject.handle])).rows[0];if(!p)throw new Fault(404,'Subject not found.');subjectKey='profile:'+p.user_id;}
    else{if(subject.kind==='comment'&&deps.commentsPublic?.()===false)throw new Fault(404,'Subject not found.');await publication(c,subject.key);if(subject.kind==='comment'){const p=(await c.query(`SELECT c.id FROM community_comment c JOIN community_comment_review r ON r.comment_id=c.id WHERE c.id=$1 AND c.problem_key=$2 AND c.deleted_at IS NULL AND r.state='visible' FOR SHARE OF c`,[subject.id,subject.key])).rows[0];if(!p)throw new Fault(404,'Subject not found.');subjectKey='comment:'+subject.id;}else subjectKey='problem:'+subject.key;}
    const id=randomUUID();await c.query('INSERT INTO community_report(id,reporter_id,request_id,subject,subject_key,reason,details,request_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,user.id,input.requestId,JSON.stringify(subject),subjectKey,input.reason,input.details,requestHash]);return profileReply({id,state:'open'},201);
   });
  }
  const input=appealInput.parse(json);await charge('appeals:'+user.id,121,0,1);return await tx(async c=>{await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,14))',['community-appeal:'+user.id]);const old=(await c.query('SELECT id,comment_id,reason,state FROM community_moderation_appeal WHERE user_id=$1 AND request_id=$2',[user.id,input.requestId])).rows[0];if(old){if(old.comment_id!==input.commentId||old.reason!==input.reason)throw new Fault(409,'Request reference already used.');return profileReply({id:old.id,state:old.state});}
   await publication(c,input.key);const root=(await c.query('SELECT community_thread_root($1) AS id',[input.commentId])).rows[0].id;await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,14))',['community-thread:'+root]);
   const comment=(await c.query('SELECT id,version FROM community_comment WHERE id=$1 AND problem_key=$2 AND user_id=$3 AND deleted_at IS NULL FOR UPDATE',[input.commentId,input.key,user.id])).rows[0];if(!comment)throw new Fault(404,'Comment not found.');const review=(await c.query("SELECT version,state FROM community_comment_review WHERE comment_id=$1 AND state IN ('held','hidden')",[input.commentId])).rows[0];if(!review)throw new Fault(409,'No restricted decision to appeal.');
   const id=randomUUID();await c.query('INSERT INTO community_moderation_appeal(id,user_id,request_id,comment_id,content_version,review_version,reason) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,user.id,input.requestId,comment.id,comment.version,review.version,input.reason]);return profileReply({id,state:'open'},201);
  });
 }catch(e){const code=(e as {code?:string}).code;const status=e instanceof Fault?e.status:e instanceof z.ZodError||e instanceof SyntaxError||e instanceof TypeError?400:e instanceof RangeError?413:e instanceof RequestBodyTimeoutError?408:code==='42501'?403:code==='23505'||code==='23514'?409:503;const r=profileReply({error:e instanceof Fault?e.message:status===403?'Staff permission or independent reviewer required.':status===409?'Case changed or already exists. Reload before retrying.':status===503?'Moderation is temporarily unavailable.':'Invalid moderation request.'},status);if(status===429)r.headers.set('Retry-After','60');return r;}
 };
}
