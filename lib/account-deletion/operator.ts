import 'server-only';
import {z} from 'zod';
import type {DeletionDependencies} from './api';
import {readRequestBytes} from '../submission-request';
import {deletionReply} from './contracts';
const command=z.strictObject({password:z.string().min(1).max(128),action:z.enum(['identify','inventory','prepare','approve','read','restrict','dispose','cleanup']),payload:z.record(z.string(),z.unknown())});
const jobSchema=z.strictObject({id:z.uuid(),provider:z.enum(['author','profile','medal']),pathname:z.string().max(500),leaseToken:z.uuid()});
export type DeletionStorage={del:(provider:'author'|'profile'|'medal',pathname:string)=>Promise<void>};
export function createDeletionOperatorApi(deps:DeletionDependencies,storage:DeletionStorage){
 return async(request:Request)=>{
  if(request.method!=='POST'||!deps.origin(request))return deletionReply({error:'Request not allowed.'},403);
  let input;try{input=command.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readRequestBytes(request,16384))));}catch{return deletionReply({error:'Invalid operator request.'},400);}
  try{
   const session=await deps.session(request);if(!session?.user.emailVerified)return deletionReply({error:'Verified recent sign-in required.'},403);
   const created=new Date(session.session.createdAt).getTime();if(!Number.isFinite(created)||created>Date.now()||Date.now()-created>600000)return deletionReply({error:'Sign in again.'},403);
   await deps.pool.query('SELECT account_deletion_charge($1,$2,true)',[session.user.id,session.session.token]);
   const proof=await deps.password(session.user.id,input.password);if(!proof.verified)return deletionReply({error:'Current password required.'},403);
   const values=[session.user.id,session.session.token,proof.hash];
   if(input.action==='cleanup'){
    const {rows}=await deps.pool.query('SELECT account_deletion_cleanup($1,$2,$3,$4,$5) AS job',[...values,'claim',{}]);if(!rows[0].job)return deletionReply({processed:0});
    const job=jobSchema.parse(rows[0].job);
    // Validate the registered namespace again before any private provider operation.
    const allowed=job.provider==='profile'?/^community-profile-media\/[0-9a-f-]{36}\.webp$/:job.provider==='medal'?/^community-medal-proof\/[0-9a-f-]{36}\.pdf$/:/^(author-media|solution-evidence)\/[A-Za-z0-9/_.-]+$/;
    if(!allowed.test(job.pathname)||job.pathname.includes('..'))throw Error('Invalid registered object');
    let completed=false;try{await storage.del(job.provider,job.pathname);completed=true;}catch{/* Durable retry, no provider details in HTTP or SQL. */}
    await deps.pool.query('SELECT account_deletion_cleanup($1,$2,$3,$4,$5)',[...values,completed?'complete':'retry',{id:job.id,leaseToken:job.leaseToken}]);
    return deletionReply({processed:1,completed});
   }
   if(typeof input.payload.accessPurpose!=='string'||input.payload.accessPurpose.trim().length<5)return deletionReply({error:'Document the access purpose.'},400);
   const {rows}=await deps.pool.query('SELECT account_deletion_evidence_control($1,$2,$3,$4,$5) AS result',[...values,input.action,input.payload]);
   return deletionReply({result:rows[0].result});
  }catch(error){return deletionReply({error:'Operator action not confirmed.'},(error as {code?:string}).code==='42501'?403:503);}
 };
}
