"use client";
import React,{createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {Heart} from 'lucide-react';
import {authClient} from '@/lib/auth-client';
import {Button} from '@/components/ui/button';
import {statsPageSchema,type ProblemStat} from '@/lib/community/problem-stats-contracts';
type Value={stats:Map<string,ProblemStat>;loading:boolean;error:string;busy:Set<string>;verified:boolean;signedIn:boolean;save:(key:string,value:boolean)=>void;reload:()=>void};
const Context=createContext<Value|null>(null);
export function ProblemStatsBatch({keys,children}:{keys:string[];children:ReactNode}){
 const {data,isPending,error}=authClient.useSession();
 return <StatsSession key={JSON.stringify([keys,data?.user.id??null,isPending,Boolean(error)])} keys={keys} signedIn={Boolean(data?.user)&&!error} verified={data?.user.emailVerified===true&&!error} pending={isPending} accountId={!error?data?.user.id??null:null} >{children}</StatsSession>;
}
function StatsSession({keys,children,signedIn,verified,pending,accountId}:{keys:string[];children:ReactNode;signedIn:boolean;verified:boolean;pending:boolean;accountId:string|null}){
 const [refresh,setRefresh]=useState(0),[result,setResult]=useState<{version:number;stats:Map<string,ProblemStat>}>(),[error,setError]=useState(''),[busy,setBusy]=useState(new Set<string>());
 const actions=useRef(new Map<string,AbortController>()),keysJson=JSON.stringify(keys);
 useEffect(()=>()=>{for(const c of actions.current.values())c.abort();},[]);
 useEffect(()=>{if(pending||!keys.length)return;const c=new AbortController();setError('');
 fetch('/api/community/problem-stats?'+new URLSearchParams({keys:keysJson}),{cache:'no-store',credentials:'same-origin',headers:accountId?{'X-Community-Account':accountId}:{},signal:AbortSignal.any([c.signal,AbortSignal.timeout(15000)])}).then(async r=>{if(r.status===409&&!c.signal.aborted)setResult(undefined);if(!r.ok)throw Error();const page=statsPageSchema.parse(await r.json());if(!c.signal.aborted)setResult({version:refresh,stats:new Map(page.problems.map(s=>[s.key,s]))});}).catch(()=>{if(!c.signal.aborted)setError('Statistics are unavailable. Reload to check saved favourites.');});return()=>c.abort();
 },[keysJson,refresh,pending,keys.length,accountId]);
 async function save(key:string,favourite:boolean){if(actions.current.has(key)||!verified)return;const c=new AbortController();actions.current.set(key,c);setBusy(new Set(actions.current.keys()));setError('');
 try{const r=await fetch('/api/community/problem-stats',{method:'PUT',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...(accountId?{'X-Community-Account':accountId}:{})},body:JSON.stringify({key,favourite}),signal:AbortSignal.any([c.signal,AbortSignal.timeout(15000)])});if(r.status===409&&!c.signal.aborted)setResult(undefined);if(!r.ok)throw Error(r.status===409?'Your account changed. Reload the page before continuing.':r.status===429?'Too many changes. Wait a minute, then reload.':'The change could not be confirmed. Reload before retrying.');if(!c.signal.aborted)setRefresh(n=>n+1);}
 catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:'Reload before retrying.');}finally{actions.current.delete(key);if(!c.signal.aborted)setBusy(new Set(actions.current.keys()));}}
 const stats=result?.stats??new Map<string,ProblemStat>();
 return <Context.Provider value={{stats,loading:(!result||result.version!==refresh)&&!error,error,busy,signedIn,verified,save,reload:()=>setRefresh(n=>n+1)}}>{children}</Context.Provider>;
}
export function ProblemStatsControl({problemKey}:{problemKey:string}){
 const value=useContext(Context);if(!value)return null;const s=value.stats.get(problemKey);
 return <div className="space-y-2 text-sm" aria-label="Problem statistics" aria-busy={value.loading||value.busy.has(problemKey)}>
  {s?<div className="flex flex-wrap items-center gap-3"><span>{s.favourites.toLocaleString('en-US')} {s.favourites===1?'favourite':'favourites'}</span><span>{s.solves===null?'Verified solves unavailable':`${s.solves.toLocaleString('en-US')} verified ${s.solves===1?'solve':'solves'}`}</span>
   {value.signedIn?<Button className="min-h-11" size="sm" variant="outline" aria-pressed={s.favourite} disabled={!value.verified||value.busy.has(problemKey)||value.loading} onClick={()=>value.save(problemKey,!s.favourite)}><Heart aria-hidden="true" className={s.favourite?'fill-current':''}/>{s.favourite?'Favourited':'Favourite'}</Button>:<Link className="inline-flex min-h-11 items-center underline" href="/sign-in">Sign in to favourite</Link>}
   {value.signedIn&&!value.verified&&<span>Verify your email to save favourites.</span>}
  </div>:<p role="status">{value.loading?'Loading statistics…':value.error?'Statistics unavailable.':'Problem is no longer public or statistics are unavailable.'}</p>}
  {s?.solves===null&&<p className="text-xs text-muted-foreground">{problemKey.startsWith('arena:')?'This Arena problem has no authoritative full-problem grading.':'A verified solve count could not be established within the read budget.'}</p>}
  {s&&value.loading&&<p role="status">Refreshing statistics…</p>}
  {value.error&&<p role="alert">{value.error}</p>}
  <Button className="min-h-11" size="sm" variant="ghost" disabled={value.loading} onClick={value.reload}>Reload statistics</Button>
 </div>;
}
export function ProblemStatsPanel({problemKey}:{problemKey:string}){return <ProblemStatsBatch keys={[problemKey]}><div className="mx-auto w-full max-w-4xl rounded-xl border p-4"><ProblemStatsControl problemKey={problemKey}/></div></ProblemStatsBatch>;}
