"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {authClient} from '@/lib/auth-client';
import {deletionReceiptSchema} from '@/lib/account-deletion/contracts';
const journalKey='physcratic.account-deletion.pending.v1';
type Pending={requestToken:string;accountId?:string};
export function AccountDeletionSection({accountId,verified}:{accountId?:string;verified:boolean}){
 const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[pending,setPending]=useState<Pending|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[complete,setComplete]=useState(false);
 useEffect(()=>{try{const raw=sessionStorage.getItem(journalKey);if(raw){const parsed=JSON.parse(raw);if(/^[a-f0-9]{64}$/.test(parsed.requestToken))setPending(parsed);}}catch{setMessage('Recovery is unavailable. Account deletion cannot start in this browser.');}},[]);
 async function send(statusOnly=false){
  if(busy)return;let attempt=pending;
  try{
   if(!statusOnly){
    if(!accountId||!verified||confirmation!=='DELETE MY ACCOUNT'||!password){setMessage('Sign in, verify your email, enter your current password and type DELETE MY ACCOUNT.');return;}
    if(attempt&&attempt.accountId!==accountId){setMessage('Check the previous request before starting a deletion for this account.');return;}
    if(!attempt){attempt={requestToken:Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join(''),accountId};sessionStorage.setItem(journalKey,JSON.stringify(attempt));setPending(attempt);}
   }
   if(!attempt){setMessage('There is no pending deletion request.');return;}
   setBusy(true);setMessage('');
   const response=await fetch('/api/account-deletion',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json',...(!statusOnly&&attempt.accountId?{'X-Account-Deletion-Account':attempt.accountId}:{})},signal:AbortSignal.timeout(30000),body:JSON.stringify(statusOnly?{requestToken:attempt.requestToken}:{...attempt,accountId:undefined,password,confirmation})});
   const body=await response.json();
   if(!response.ok){setMessage((body.error??'No completion is confirmed.')+(body.requestId?` Operator review reference: ${body.requestId}`:''));return;}
   const receipt=deletionReceiptSchema.parse(body);setComplete(receipt.state==='complete');
   const priorAccount=attempt.accountId;
   try{if(priorAccount){for(const storage of [sessionStorage,localStorage])for(const key of Object.keys(storage))if(key.startsWith(`physcratic.practice.v1:${encodeURIComponent(priorAccount)}:`)||key.startsWith(`physcratic:solve:v1:${priorAccount}:`))storage.removeItem(key);}}catch{/* Server receipt remains authoritative when local storage is unavailable. */}
   const receiptOnly={requestToken:attempt.requestToken};try{sessionStorage.setItem(journalKey,JSON.stringify(receiptOnly));}catch{/* Keep the receipt in memory. */}setPending(receiptOnly);
   setMessage(receipt.state==='complete'?'The original deletion request is complete. Sign-in and ordinary private account data and registered private objects have been deleted. Approved case evidence can remain under reviewed limits.':'The original request erased sign-in and ordinary private account data. Approved case evidence can remain under reviewed limits. Private object deletion is pending. Check this receipt for completion.');
   setConfirmation('');try{await authClient.getSession({query:{disableCookieCache:true}});}catch{/* Receipt is authoritative even if refreshing current sign-in fails. */}
  }catch{setMessage('No completion is confirmed. Keep this tab and check the original request status before trying again.');}
  finally{setPassword('');setBusy(false);}
 }
 return <section id="delete-account" aria-labelledby="delete-account-heading" className="space-y-4 rounded-2xl border bg-card p-5 sm:p-7">
  <h2 id="delete-account-heading" className="text-lg font-semibold">Delete account</h2>
  <p className="text-sm text-muted-foreground">This permanently removes your sign-in, private work and progress. Published problems may remain as Deleted user. Uncertain publication rights restrict public display. Necessary case evidence may have reviewed, limited retention. Private object deletion can require retries.</p>
  {accountId&&<form className="space-y-4" onSubmit={event=>{event.preventDefault();void send();}}>
   <label className="block space-y-2"><span>Current password</span><Input type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} maxLength={128} required disabled={busy}/></label>
   <label className="block space-y-2"><span>Type DELETE MY ACCOUNT to confirm</span><Input value={confirmation} onChange={event=>setConfirmation(event.target.value)} autoComplete="off" required disabled={busy}/></label>
   <Button type="submit" variant="destructive" disabled={busy||!verified||confirmation!=='DELETE MY ACCOUNT'||!password}>Permanently delete my account</Button>
  </form>}
  <p className="text-sm"><Link className="inline-flex min-h-11 items-center underline" href="/sign-in?returnTo=%2Fsettings">Sign in again before deletion</Link></p>
  {pending&&<Button type="button" variant="outline" disabled={busy} onClick={()=>{void send(true);}}>Check previous deletion status</Button>}
  {pending&&complete&&<Button type="button" variant="outline" disabled={busy} onClick={()=>{try{sessionStorage.removeItem(journalKey);setPending(null);setComplete(false);setMessage('Completed receipt forgotten. You can start a new request.');}catch{setMessage('The completed receipt could not be forgotten in this browser.');}}}>Forget completed receipt</Button>}
  {message&&<p role="status" className="break-words text-sm">{message}</p>}
 </section>;
}
