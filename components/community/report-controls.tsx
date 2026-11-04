"use client";
import React,{useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {z} from 'zod';
import {authClient} from '@/lib/auth-client';
import {reportInput,appealInput,type reportSubject} from '@/lib/community/moderation-contracts';
import {ModerationRequestError,moderationFetch} from '@/lib/community/moderation-client';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
type Subject=z.infer<typeof reportSubject>;
const reasons={abuse:'Abuse or harassment',hate:'Hateful content',threat:'Threats',spam:'Spam or misleading links',privacy:'Private information',rights:'Copyright or other rights',other:'Other concern'} as const;
const ack=z.object({id:z.uuid(),state:z.string()});
export function ReportControl({subject}:{subject:Subject}){return <CaseControl subject={subject}/>;}
export function AppealControl({problemKey,commentId}:{problemKey:string;commentId:string}){return <CaseControl appeal={{key:problemKey,commentId}}/>;}
function CaseControl({subject,appeal}:{subject?:Subject;appeal?:{key:string;commentId:string}}){
 const {data,isPending,error}=authClient.useSession();
 return <Submission key={JSON.stringify([data?.user.id,isPending,Boolean(error),subject,appeal])} subject={subject} appeal={appeal} verified={!isPending&&!error&&data?.user.emailVerified===true}/>;
}
function Submission({subject,appeal,verified}:{subject?:Subject;appeal?:{key:string;commentId:string};verified:boolean}){
 const [open,setOpen]=useState(false),[reason,setReason]=useState<keyof typeof reasons>('abuse'),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(''),[uncertain,setUncertain]=useState(false);
 const controller=useRef<AbortController|null>(null),intent=useRef<unknown>(null),flight=useRef(false);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const label=appeal?'Appeal restriction':subject?.kind==='profile'?'Report profile':subject?.kind==='problem'?'Report problem':'Report comment';
 async function submit(e:FormEvent){e.preventDefault();if(flight.current)return;const body=appeal?appealInput.safeParse({...appeal,reason:text,requestId:crypto.randomUUID()}):reportInput.safeParse({subject,reason,details:text,requestId:crypto.randomUUID()});
  if(!body.success){setError(appeal?'Give a reason of 1 to 1000 characters.':'Choose a reason and use at most 1000 characters.');return;}
  if(!intent.current)intent.current=body.data;const c=new AbortController();controller.current=c;flight.current=true;setBusy(true);setError('');
  try{const value=ack.parse(await moderationFetch('/api/community/'+(appeal?'appeals':'reports'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(intent.current),signal:c.signal}));if(!c.signal.aborted){setSaved(value.id);intent.current=null;setUncertain(false);}}
  catch(e){if(!c.signal.aborted){setError(e instanceof Error?e.message:'Could not confirm the request.');const ambiguous=!(e instanceof ModerationRequestError)||e.status>=500||e.status===408;setUncertain(ambiguous);if(!ambiguous)intent.current=null;}}
  finally{if(!c.signal.aborted){setBusy(false);flight.current=false;}}
 }
 return <div className="min-w-0 space-y-3"><Button variant="ghost" className="min-h-11" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'Close '+label.toLowerCase():label}</Button>{open&&<div className="space-y-3 rounded-xl border bg-background p-4">
  {!verified?<p className="text-sm">Use a verified account to submit a concern. <Link className="underline" href="/sign-in">Sign in</Link></p>:saved?<p role="status" className="break-words text-sm">{appeal?'Appeal':'Report'} received. Reference {saved}. <Link className="underline" href="/settings#moderation-history">View your status and feedback</Link></p>:<form onSubmit={submit} aria-label={label} className="space-y-3">
   <p className="text-sm text-muted-foreground">{appeal?'Explain why this restriction needs independent review. Editing does not remove a restriction.':'Your report is private to you and authorized reviewers. Do not include certificates, passwords or unrelated personal information.'}</p>
   {!appeal&&<label className="block space-y-2 text-sm">Report reason<select aria-label="Report reason" disabled={busy||uncertain} value={reason} onChange={e=>setReason(e.target.value as typeof reason)} className="min-h-11 w-full rounded border bg-background px-3">{Object.entries(reasons).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>}
   <label className="block space-y-2 text-sm">{appeal?'Appeal reason':'Details (optional)'}<Textarea aria-label={appeal?'Appeal reason':'Report details'} required={Boolean(appeal)} value={text} readOnly={uncertain} disabled={busy} maxLength={1000} rows={3} onChange={e=>setText(e.target.value)}/></label>
   <p className="text-xs text-muted-foreground">{text.length}/1000 characters</p>{error&&<p role="alert" className="text-sm">{error}</p>}
   {uncertain&&<p className="text-sm">Retry keeps the same request reference and text. Check <Link className="underline" href="/settings#moderation-history">your history</Link> before starting another request.</p>}
   <Button type="submit" className="min-h-11" disabled={busy}>{busy?'Sending…':uncertain?'Retry same request':appeal?'Submit appeal':'Submit report'}</Button>
  </form>}
 </div>}</div>;
}
