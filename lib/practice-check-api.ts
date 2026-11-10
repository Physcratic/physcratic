import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient, QueryResultRow } from 'pg';
import { z } from 'zod';
import { gradeArchiveAnswers, ArchiveGradeRequestError } from './archive-grading';
import { archiveGradeResponseSchema, archiveGradeRequestSchema, type ArchiveGradeRequest, type ArchiveGradeResponse } from './archive-grading-contracts';
import { practiceCheckCatalog, type PracticeCheckCatalogEntry } from './practice-check-catalog';
import { practiceCheckPolicy as policy, practiceCheckRequestSchema, practiceCheckSchema, practiceCheckReceiptSchema, practiceCheckHistorySchema, type PracticeCheckRequest } from './practice-check-contracts';
import { readSubmissionJson, RequestBodyTimeoutError } from './submission-request';
import { readPracticeProgress } from './practice-progress';

type User={id:string;emailVerified?:boolean};
type Dependencies={pool:Pool;user:(r:Request)=>Promise<User|null|undefined>;origin:(r:Request)=>boolean;catalog?:()=>PracticeCheckCatalogEntry[];grade?:(input:ArchiveGradeRequest)=>ArchiveGradeResponse};
export type PracticeCheckAction='submit'|'history'|'progress';
type Row={id:string;user_id:string;kind:'practice'|'arena';problem_id:string;version:string;answers:unknown;results:unknown;created_at:Date};
const headers={'Cache-Control':'private, no-store','Vary':'Cookie, X-Practice-Account','X-Content-Type-Options':'nosniff'};
class CheckError extends Error {constructor(public status:number,message:string,public retryAfter?:string){super(message);}}
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers});
function view(row:Row){return practiceCheckSchema.parse({id:row.id,kind:row.kind,problemId:row.problem_id,version:row.version,answers:row.answers,results:row.results,createdAt:row.created_at.toISOString()});}
function cursor(row:Row){return Buffer.from(JSON.stringify([row.created_at.toISOString(),row.id])).toString('base64url');}
function decodeCursor(raw:string):[string,string]{
  if(!/^[A-Za-z0-9_-]{1,256}$/.test(raw))throw new CheckError(400,'Invalid history cursor.');
  try {return z.tuple([z.iso.datetime(),z.uuid()]).parse(JSON.parse(Buffer.from(raw,'base64url').toString('utf8')));}
  catch{throw new CheckError(400,'Invalid history cursor.');}
}
function boundedQuery<R extends QueryResultRow=QueryResultRow>(pool:Pool,text:string,values:unknown[]){
  const config={text,values,query_timeout:5000};
  return pool.query<R>(config);
}
async function charge(pool:Pool,userId:string,submit:boolean){
  const {rows}=await boundedQuery(pool,`INSERT INTO practice_check_rate(user_id,window_start,requests,submissions) VALUES($1,date_trunc('minute',clock_timestamp()),1,$2)
   ON CONFLICT(user_id) DO UPDATE SET
    requests=CASE WHEN practice_check_rate.window_start>=EXCLUDED.window_start THEN least(practice_check_rate.requests+1,61) ELSE 1 END,
    submissions=CASE WHEN practice_check_rate.window_start>=EXCLUDED.window_start THEN least(practice_check_rate.submissions+$2,21) ELSE $2 END,
    window_start=greatest(practice_check_rate.window_start,EXCLUDED.window_start) RETURNING requests,submissions`,[userId,submit?1:0]);
  if(rows[0].requests>policy.requestsPerMinute||(submit&&rows[0].submissions>policy.submissionsPerMinute))throw new CheckError(429,'Checked-answer request limit reached. Retry next minute.','60');
}
function same(row:Row,input:PracticeCheckRequest){
  const stored=practiceCheckRequestSchema.parse({problemId:row.problem_id,version:row.version,answers:row.answers,idempotencyKey:input.idempotencyKey});
  return JSON.stringify(stored)===JSON.stringify(input);
}
export function createPracticeCheckApi(deps:Dependencies){
  return async(action:PracticeCheckAction,request:Request):Promise<Response>=>{
    let client:PoolClient|undefined,transaction=false;
    try {
      const user=await deps.user(request);
      if(!user)throw new CheckError(401,'Sign in to access saved checks.');
      if(action==='submit'){
        if(user.emailVerified!==true)throw new CheckError(403,'Verify your email before saving checks.');
        if(!deps.origin(request))throw new CheckError(403,'Request origin rejected.');
        if(request.method!=='POST')throw new CheckError(405,'Use POST to save a check.');
      }else if(request.method!=='GET')throw new CheckError(405,'Use GET to read saved checks.');
      // A consistency guard only. The authenticated session remains the SQL identity.
      // It prevents stale account-A clients from saving/reading account-B data after a cookie switch.
      if(request.headers.get('x-practice-account')!==user.id)throw new CheckError(409,'Your account changed. Recheck your sign-in before continuing.');
      const url=new URL(request.url);
      if(request.url.length>4096||[...url.searchParams.keys()].some(k=>url.searchParams.getAll(k).length!==1))throw new CheckError(400,'Invalid check query.');
      if(action!=='history'&&url.search)throw new CheckError(400,'Unexpected check query.');
      await charge(deps.pool,user.id,action==='submit');
      if(action==='history'){
        const parsed=z.strictObject({after:z.string().max(256).optional(),problemId:archiveGradeRequestSchema.shape.problemId.optional()}).safeParse(Object.fromEntries(url.searchParams));
        if(!parsed.success)throw new CheckError(400,'Invalid history filters.');
        const filters=parsed.data;
        const after=filters.after?decodeCursor(filters.after):null;
        const {rows}=await boundedQuery<Row>(deps.pool,`SELECT * FROM practice_check_attempt WHERE user_id=$1
          AND ($2::text IS NULL OR problem_id=$2)
          AND ($3::timestamptz IS NULL OR (created_at,id)<($3::timestamptz,$4::uuid)) ORDER BY created_at DESC,id DESC LIMIT 51`,[user.id,filters.problemId??null,after?.[0]??null,after?.[1]??null]);
        return reply(practiceCheckHistorySchema.parse({attempts:rows.slice(0,50).map(view),nextCursor:rows.length>50?cursor(rows[49]):null}));
      }
      if(action==='progress')return reply(await readPracticeProgress(deps.pool,user.id,(deps.catalog??practiceCheckCatalog)()));
      if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new CheckError(415,'Send JSON.');
      let input:PracticeCheckRequest;
      try {input=practiceCheckRequestSchema.parse(await readSubmissionJson(request,policy.maxBodyBytes));}
      catch(error){
        if(error instanceof RangeError)throw new CheckError(413,'Checked-answer body is too large.');
        if(error instanceof z.ZodError||error instanceof SyntaxError||error instanceof TypeError)throw new CheckError(400,'Invalid checked-answer request.');
        throw error;
      }
      client=await deps.pool.connect();await client.query('BEGIN');transaction=true;
      await client.query("SET LOCAL statement_timeout='5s'; SET LOCAL lock_timeout='2s'; SET LOCAL idle_in_transaction_session_timeout='10s'");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,17))",[`practice-check:${user.id}`]);
      const existing=await client.query<Row>('SELECT * FROM practice_check_attempt WHERE user_id=$1 AND idempotency_key=$2',[user.id,input.idempotencyKey]);
      if(existing.rows[0]){
        if(!same(existing.rows[0],input))throw new CheckError(409,'This retry key belongs to different work. Retry the original answer.');
        const result=practiceCheckReceiptSchema.parse({attempt:view(existing.rows[0]),saved:true,replayed:true});
        await client.query('COMMIT');transaction=false;return reply(result);
      }
      const entry=(deps.catalog??practiceCheckCatalog)().find(e=>e.metadata.problemId===input.problemId);
      if(!entry)throw new CheckError(404,'This problem cannot save checked answers.');
      if(entry.metadata.version!==input.version)throw new CheckError(409,'The grading version changed. Reload the problem before a new check.');
      const used=await client.query("SELECT count(*)::integer AS total FROM practice_check_attempt WHERE user_id=$1 AND created_at>clock_timestamp()-interval '24 hours'",[user.id]);
      if(used.rows[0].total>=policy.attemptsPerDay)throw new CheckError(429,'The rolling 24-hour save limit was reached. Keep your answer and retry later.');
      const {idempotencyKey,...gradeInput}=input;
      const grade=archiveGradeResponseSchema.parse((deps.grade??gradeArchiveAnswers)(gradeInput));
      const expectedIds=new Set(entry.metadata.parts.map(p=>p.id));
      if(grade.problemId!==input.problemId||grade.version!==input.version||grade.results.length!==expectedIds.size||new Set(grade.results.map(p=>p.partId)).size!==expectedIds.size||grade.results.some(p=>!expectedIds.has(p.partId)))throw Error('Mismatched trusted grade');
      const inserted=await client.query<Row>(`INSERT INTO practice_check_attempt(id,user_id,kind,problem_id,version,idempotency_key,answers,results)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[randomUUID(),user.id,entry.kind,input.problemId,input.version,idempotencyKey,JSON.stringify(input.answers),JSON.stringify(grade.results)]);
      const row=inserted.rows[0],required=entry.metadata.parts.filter(p=>p.kind!=='self-review').map(p=>p.id);
      await client.query(`INSERT INTO practice_check_part(user_id,kind,problem_id,version,part_id,correct,last_attempt_id,checked_at)
        SELECT $1,$2,$3,$4,r->>'partId',r->>'status'='correct',$5,$6 FROM jsonb_array_elements($7::jsonb) r
        WHERE r->>'status' IN ('correct','incorrect') AND r->>'partId'=ANY($8::text[])
        ON CONFLICT(user_id,kind,problem_id,version,part_id) DO UPDATE SET correct=practice_check_part.correct OR EXCLUDED.correct,
          last_attempt_id=EXCLUDED.last_attempt_id,checked_at=EXCLUDED.checked_at`,[user.id,entry.kind,input.problemId,input.version,row.id,row.created_at,JSON.stringify(grade.results),required]);
      const result=practiceCheckReceiptSchema.parse({attempt:view(row),saved:true,replayed:false});
      await client.query('COMMIT');transaction=false;return reply(result,201);
    }catch(error){
      if(transaction)try{await client?.query('ROLLBACK');}catch{/* Original request remains unconfirmed. */}
      if(error instanceof CheckError){const response=reply({error:error.message,saveState:[401,403,429].includes(error.status)?'unconfirmed':'rejected'},error.status);if(error.retryAfter)response.headers.set('Retry-After',error.retryAfter);return response;}
      if(error instanceof ArchiveGradeRequestError)return reply({error:error.message,saveState:'rejected'},error.status);
      if(error instanceof RequestBodyTimeoutError)return reply({error:'The save request timed out. Retry the original answer and key.',saveState:'unconfirmed'},408);
      return reply(action==='submit'?{error:'We could not confirm the save. Retry the original answer and key.',saveState:'unconfirmed'}:{error:'Your saved checks could not be loaded. Retry.'},503);
    }finally{client?.release();}
  };
}
