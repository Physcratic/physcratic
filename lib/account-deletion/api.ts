import 'server-only';
import {createHash} from 'node:crypto';
import type {Pool} from 'pg';
import {deletionRequestSchema,deletionStatusSchema,deletionReceiptSchema,deletionReply} from './contracts';
import {readRequestBytes} from '../submission-request';
type Session={user:{id:string;emailVerified?:boolean};session:{token:string;createdAt:Date|string;expiresAt:Date|string}};
type Proof={hash:string;verified:boolean};
export type DeletionDependencies={pool:Pool;session:(request:Request)=>Promise<Session|null>;password:(userId:string,password:string)=>Promise<Proof>;origin:(request:Request)=>boolean};
export function createAccountDeletionApi(deps:DeletionDependencies){
 return async(request:Request)=>{
  if(request.method!=='POST')return deletionReply({error:'Use POST.'},405);
  if(!deps.origin(request))return deletionReply({error:'Request origin is not allowed.'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return deletionReply({error:'Use JSON.'},415);
  let input;let requestId:string|undefined;
  try{input=deletionRequestSchema.or(deletionStatusSchema).parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readRequestBytes(request,4096))));}catch{return deletionReply({error:'Confirm deletion and provide your password and original request token.'},400);}
  const nonce=createHash('sha256').update(input.requestToken).digest('hex');
  try{
   if(!('password' in input)){const {rows}=await deps.pool.query('SELECT account_deletion_receipt($1) AS receipt',[nonce]);return rows[0]?.receipt?deletionReply(deletionReceiptSchema.parse(rows[0].receipt)):deletionReply({error:'No completed database deletion is confirmed. Sign in and retry the original request.',code:'unconfirmed'},409);}
   const session=await deps.session(request);
   if(!session){
    // A high-entropy bearer capability permits only a non-identifying receipt after auth erasure.
    const {rows}=await deps.pool.query('SELECT account_deletion_receipt($1) AS receipt',[nonce]);
    return rows[0]?.receipt?deletionReply(deletionReceiptSchema.parse(rows[0].receipt)):deletionReply({error:'Sign in again before deleting your account.'},401);
   }
   const displayed=request.headers.get('x-account-deletion-account');
   if(!displayed||displayed.length>128||!/^[A-Za-z0-9_-]+$/.test(displayed)||displayed!==session.user.id)return deletionReply({error:'The signed-in account changed. Reload settings before confirming deletion.'},409);
   if(!session.user.emailVerified)return deletionReply({error:'Verify your email before deleting your account.'},403);
   if(!Number.isFinite(new Date(session.session.createdAt).getTime())||new Date(session.session.createdAt).getTime()>Date.now()||Date.now()-new Date(session.session.createdAt).getTime()>10*60*1000||!Number.isFinite(new Date(session.session.expiresAt).getTime())||new Date(session.session.expiresAt).getTime()<=Date.now())return deletionReply({error:'Sign in again, then confirm deletion within 10 minutes.'},403);
   // Charge before hashing. The dedicated SQL role can execute this bounded operation only.
   await deps.pool.query('SELECT account_deletion_charge($1,$2)',[session.user.id,session.session.token]);
   const proof=await deps.password(session.user.id,input.password);
   if(!proof.verified)return deletionReply({error:'The current password is required. Accounts without a password must set one and sign in again.'},403);
   const opened=await deps.pool.query('SELECT account_deletion_open_request($1,$2,$3,$4) AS id',[session.user.id,session.session.token,proof.hash,nonce]);requestId=opened.rows[0].id;
   const {rows}=await deps.pool.query('SELECT account_deletion_execute($1,$2,$3,$4) AS receipt',[session.user.id,session.session.token,proof.hash,nonce]);
   return deletionReply(deletionReceiptSchema.parse(rows[0].receipt));
  }catch(error){
   const code=(error as {code?:string}).code;
   if(code==='P0002')return deletionReply({error:'Evidence needs operator adjudication before deletion. No account data has been erased.',code:'review-required',requestId},409);
   if(code==='42501')return deletionReply({error:'Sign in again and use your current password.'},403);
   if(code==='P0003')return deletionReply({error:'Too many deletion checks. Try again later.'},429);
   return deletionReply({error:'No completion is confirmed. Keep the original request token and retry.'},503);
  }
 };
}
