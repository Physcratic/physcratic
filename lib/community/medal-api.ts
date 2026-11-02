import 'server-only';
import { createHash,randomUUID } from 'node:crypto';
import type { Pool,PoolClient } from 'pg';
import { z } from 'zod';
import { profileReply,profileHeaders } from './profile-api';
import { medalClaimSchema,medalReviewSchema } from './medal-contracts';
import type { MedalAction } from './medal-route';
import type { MedalStorage } from './medal-storage';
import { readRequestBytes,RequestBodyTimeoutError } from '../submission-request';
import { detectAuthorMedia } from '../author-media-validation';
class Fault extends Error {constructor(public status:number){super();}}
const publicColumns='id,competition,award,year,country,competition_name AS "competitionName",certificate_name AS "certificateName",state,version,reason,created_at AS "createdAt",updated_at AS "updatedAt"';
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export async function validateMedalPdf(bytes:Uint8Array){
 if(bytes.length>5242880)throw new RangeError();
 const source=Buffer.from(bytes).toString('latin1').replace(/#([a-f0-9]{2})/gi,(_,n)=>String.fromCharCode(parseInt(n,16)));
 if(detectAuthorMedia(bytes)!=='application/pdf'||!source.includes('startxref')||!source.includes('/Root')||!source.includes('/Type /Catalog')||/\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia|OpenAction|AA|Encrypt|ObjStm)\b/.test(source))throw new Fault(400);
 const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
 (globalThis as unknown as {pdfjsWorker:unknown}).pdfjsWorker=await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
 const task=getDocument({data:new Uint8Array(bytes),disableFontFace:true,useSystemFonts:false,stopAtErrors:true});
 try{const doc=await task.promise;if(doc.numPages<1||doc.numPages>20||await doc.getJSActions())throw new Fault(400);for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i);if(await page.getJSActions())throw new Fault(400);}}catch{throw new Fault(400);}finally{await task.destroy();}
}
export function createMedalApi(deps:{pool:Pool;storage:MedalStorage;user:(r:Request)=>Promise<{id:string;emailVerified?:boolean}|null|undefined>;origin:(r:Request)=>boolean}){
 async function tx<T>(fn:(c:PoolClient)=>Promise<T>){const c=await deps.pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='5s'; SET LOCAL lock_timeout='2s'");const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
 async function admin(c:PoolClient,userId:string){if(!(await c.query("SELECT community_admin_locked($1) AS allowed",[userId])).rows[0].allowed)throw new Fault(403);}
 return async(action:MedalAction,request:Request,id?:string):Promise<Response>=>{try{
  const user=await deps.user(request);if(!user)throw new Fault(401);if(!user.emailVerified)throw new Fault(403);
  const write=action==='submit'||action==='review';if(request.method!==(write?'POST':'GET'))throw new Fault(405);
  if(write&&!deps.origin(request))throw new Fault(403);
  const params=new URL(request.url).searchParams;
  if([...params.keys()].some(k=>action!=='queue'||k!=='after')||params.getAll('after').length>1)throw new Fault(400);
  if(action==='review'||action==='proof'||action==='detail')id=z.uuid().parse(id);
  if(action==='queue'||action==='review'||action==='proof'||action==='detail')await tx(c=>admin(c,user.id));
  // Shared limits also bound certificate reads and queue access across instances.
  const limit=await deps.pool.query(`INSERT INTO community_medal_limit(user_id,minute,requests,day,uploads) VALUES($1,date_trunc('minute',clock_timestamp()),1,(clock_timestamp() AT TIME ZONE 'UTC')::date,$2)
   ON CONFLICT(user_id) DO UPDATE SET requests=CASE WHEN community_medal_limit.minute=date_trunc('minute',clock_timestamp()) THEN least(31,community_medal_limit.requests+1) ELSE 1 END,minute=date_trunc('minute',clock_timestamp()),uploads=CASE WHEN community_medal_limit.day=(clock_timestamp() AT TIME ZONE 'UTC')::date THEN least(6,community_medal_limit.uploads+$2) ELSE $2 END,day=(clock_timestamp() AT TIME ZONE 'UTC')::date RETURNING requests,uploads`,[user.id,action==='submit'?1:0]);
  if(limit.rows[0].requests>30||(action==='submit'&&limit.rows[0].uploads>5)){const r=profileReply({error:'Verification request limit reached.'},429);r.headers.set('Retry-After','60');return r;}
  if(action==='own')return profileReply({claims:(await deps.pool.query(`SELECT ${publicColumns} FROM community_medal_claim WHERE user_id=$1 ORDER BY created_at DESC,id LIMIT 20`,[user.id])).rows});
  if(action==='queue'){const after=params.get('after');if(after)z.uuid().parse(after);return await tx(async c=>{await admin(c,user.id);return profileReply({claims:(await c.query(`SELECT ${publicColumns} FROM community_medal_claim WHERE state IN ('pending','more-info') AND ($1::uuid IS NULL OR id>$1) ORDER BY id LIMIT 50`,[after])).rows});});}
  if(action==='detail')return await tx(async c=>{await admin(c,user.id);const claim=(await c.query(`SELECT ${publicColumns} FROM community_medal_claim WHERE id=$1`,[id])).rows[0];if(!claim)throw new Fault(404);return profileReply({claim,audit:(await c.query('SELECT version,actor_id AS \"actorId\",state,reason,created_at AS \"createdAt\" FROM community_medal_audit WHERE claim_id=$1 ORDER BY version',[id])).rows});});
  if(action==='submit'){
   if(request.headers.get('content-type')?.split(';')[0]!=='application/pdf')throw new Fault(415);
   const metadata=request.headers.get('x-medal-claim')??'';if(Buffer.byteLength(metadata)>4096)throw new RangeError();
   const input=medalClaimSchema.parse(JSON.parse(metadata));const bytes=await readRequestBytes(request,5242880,10000);await validateMedalPdf(bytes);
   const claimId=randomUUID(),path=`community-medal-proof/${claimId}.pdf`;
   await tx(async c=>{await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,10))',[user.id]);if(Number((await c.query('SELECT count(*) FROM community_medal_claim WHERE user_id=$1',[user.id])).rows[0].count)>=20)throw new Fault(409);
    await c.query(`INSERT INTO community_medal_claim(id,user_id,competition,award,year,country,competition_name,certificate_name,pathname,bytes,sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[claimId,user.id,input.competition,input.award,input.year,input.country,input.competitionName,input.certificateName,path,bytes.length,hash(bytes)]);});
   // Reserve before PUT; ambiguous failures retain a bounded, inaccessible tracked object.
   await deps.storage.put(path,bytes);
   const result=await deps.pool.query(`UPDATE community_medal_claim SET state='pending',version=version+1 WHERE id=$1 AND state='uploading' RETURNING ${publicColumns}`,[claimId]);
   return profileReply({claim:result.rows[0]},201);
  }
  if(action==='review'){
   if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw new Fault(415);
   const body=medalReviewSchema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readRequestBytes(request,8192,5000))));
   return await tx(async c=>{await admin(c,user.id);const claim=(await c.query('SELECT user_id,version FROM community_medal_claim WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!claim)throw new Fault(404);if(claim.user_id===user.id)throw new Fault(403);if(claim.version!==body.version)throw new Fault(409);
    const result=await c.query(`UPDATE community_medal_claim SET state=$2,version=version+1,reviewer_id=$3,reason=$4 WHERE id=$1 RETURNING ${publicColumns}`,[id,body.decision,user.id,body.reason]);return profileReply({claim:result.rows[0]});});
  }
  const proof=await tx(async c=>{await admin(c,user.id);const row=(await c.query("SELECT user_id,pathname,bytes,sha256,version FROM community_medal_claim WHERE id=$1 AND state<>'uploading'",[id])).rows[0];if(!row)throw new Fault(404);if(row.user_id===user.id)throw new Fault(403);return row;});
  const stream=await deps.storage.get(proof.pathname);if(!stream)throw new Fault(503);
  const bytes=await readRequestBytes(new Request('https://proof.internal',{method:'POST',body:stream,duplex:'half'} as RequestInit),5242880,10000);
  if(bytes.length!==proof.bytes||hash(bytes)!==proof.sha256)throw new Fault(503);
  // Buffer a bounded proof and recheck after storage I/O; never return an SDK URL or unchecked stream.
  return await tx(async c=>{await admin(c,user.id);if(!(await c.query('SELECT 1 FROM community_medal_claim WHERE id=$1 AND version=$2',[id,proof.version])).rowCount)throw new Fault(409);return new Response(Buffer.from(bytes),{headers:{...profileHeaders,'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="medal-proof.pdf"','Content-Security-Policy':"sandbox; default-src 'none'",'Content-Length':String(bytes.length)}});});
 }catch(e){const code=(e as {code?:string}).code;const status=e instanceof Fault?e.status:e instanceof z.ZodError||e instanceof SyntaxError||e instanceof TypeError?400:e instanceof RangeError?413:e instanceof RequestBodyTimeoutError?408:code==='23505'||code==='23514'?409:code==='42501'?403:503;
 return profileReply({error:status===503?'Medal verification unavailable.':status===409?'Claim conflict. Reload before retrying.':'Verification request rejected.'},status);}};
}
