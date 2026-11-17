"use client";
import React,{createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {Heart} from 'lucide-react';
import {authClient} from '@/lib/auth-client';
import {Button} from '@/components/ui/button';
import {statsPageSchema,type ProblemStat} from '@/lib/community/problem-stats-contracts';
import {applyFavouriteOverride,favouriteErrorMessage,favouriteNoun} from '@/lib/favourite-toggle';
type Value={stats:Map<string,ProblemStat>;overrides:Map<string,boolean>;loading:boolean;error:string;actionError:{key:string;message:string}|null;busy:Set<string>;verified:boolean;signedIn:boolean;save:(key:string,value:boolean)=>void};
const Context=createContext<Value|null>(null);
class SaveError extends Error{constructor(public status:number){super(favouriteErrorMessage(status));}}
export function ProblemStatsBatch({keys,children}:{keys:string[];children:ReactNode}){
 const {data,isPending,error}=authClient.useSession();
 return <StatsSession key={JSON.stringify([keys,data?.user.id??null,isPending,Boolean(error)])} keys={keys} signedIn={Boolean(data?.user)&&!error} verified={data?.user.emailVerified===true&&!error} pending={isPending} accountId={!error?data?.user.id??null:null} >{children}</StatsSession>;
}
function StatsSession({keys,children,signedIn,verified,pending,accountId}:{keys:string[];children:ReactNode;signedIn:boolean;verified:boolean;pending:boolean;accountId:string|null}){
 const [refresh,setRefresh]=useState(0),[result,setResult]=useState<{version:number;stats:Map<string,ProblemStat>}>(),[error,setError]=useState(''),[busy,setBusy]=useState(new Set<string>());
 // The change each person asked for, shown until confirmed statistics arrive. A failed write drops it, which rolls back.
 const [overrides,setOverrides]=useState(new Map<string,boolean>()),[actionError,setActionError]=useState<{key:string;message:string}|null>(null);
 const actions=useRef(new Map<string,AbortController>()),keysJson=JSON.stringify(keys);
 const without=(key:string)=>setOverrides(prev=>{if(!prev.has(key))return prev;const next=new Map(prev);next.delete(key);return next;});
 useEffect(()=>()=>{for(const c of actions.current.values())c.abort();},[]);
 useEffect(()=>{if(pending||!keys.length)return;const c=new AbortController();setError('');
 fetch('/api/community/problem-stats?'+new URLSearchParams({keys:keysJson}),{cache:'no-store',credentials:'same-origin',headers:accountId?{'X-Community-Account':accountId}:{},signal:AbortSignal.any([c.signal,AbortSignal.timeout(15000)])}).then(async r=>{if(r.status===409&&!c.signal.aborted)setResult(undefined);if(!r.ok)throw Error();const page=statsPageSchema.parse(await r.json());if(!c.signal.aborted){setResult({version:refresh,stats:new Map(page.problems.map(s=>[s.key,s]))});
  // Confirmed statistics replace every override that has no write still in flight.
  setOverrides(prev=>{const next=new Map([...prev].filter(([k])=>actions.current.has(k)));return next.size===prev.size?prev:next;});}}).catch(()=>{if(!c.signal.aborted)setError('Statistics are unavailable. Refresh the page to check saved favourites.');});return()=>c.abort();
 },[keysJson,refresh,pending,keys.length,accountId]);
 async function save(key:string,favourite:boolean){if(actions.current.has(key)||!verified)return;const c=new AbortController();actions.current.set(key,c);setBusy(new Set(actions.current.keys()));setActionError(prev=>prev?.key===key?null:prev);
 setOverrides(prev=>new Map(prev).set(key,favourite));
 try{const r=await fetch('/api/community/problem-stats',{method:'PUT',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...(accountId?{'X-Community-Account':accountId}:{})},body:JSON.stringify({key,favourite}),signal:AbortSignal.any([c.signal,AbortSignal.timeout(15000)])});if(r.status===409&&!c.signal.aborted)setResult(undefined);if(!r.ok)throw new SaveError(r.status);if(!c.signal.aborted)setRefresh(n=>n+1);}
 catch(e){if(!c.signal.aborted){without(key);setActionError({key,message:e instanceof SaveError?e.message:favouriteErrorMessage(undefined)});}}finally{actions.current.delete(key);if(!c.signal.aborted)setBusy(new Set(actions.current.keys()));}}
 const stats=result?.stats??new Map<string,ProblemStat>();
 return <Context.Provider value={{stats,overrides,loading:(!result||result.version!==refresh)&&!error,error,actionError,busy,signedIn,verified,save}}>{children}</Context.Provider>;
}
export type ProblemFavourite={stat:ProblemStat|undefined;loading:boolean;busy:boolean;signedIn:boolean;verified:boolean;loadError:string;actionError:string;toggle:()=>void};
/** Favourite state and the toggle for one problem. Null outside a ProblemStatsBatch, which is only mounted when statistics are enabled. */
export function useProblemFavourite(problemKey:string):ProblemFavourite|null{
 const value=useContext(Context);if(!value)return null;
 const base=value.stats.get(problemKey),stat=base&&applyFavouriteOverride(base,value.overrides.get(problemKey));
 return {stat,loading:value.loading,busy:value.busy.has(problemKey),signedIn:value.signedIn,verified:value.verified,loadError:value.error,
  actionError:value.actionError?.key===problemKey?value.actionError.message:'',toggle:()=>{if(stat)value.save(problemKey,!stat.favourite);}};
}
export function ProblemStatsControl({problemKey}:{problemKey:string}){
 const f=useProblemFavourite(problemKey);if(!f)return null;const s=f.stat,error=f.actionError||f.loadError;
 return <div className="space-y-2 text-sm" aria-label="Problem statistics" aria-busy={f.loading||f.busy}>
  {s?<div className="flex flex-wrap items-center gap-3"><span>{s.favourites.toLocaleString('en-US')} {favouriteNoun(s.favourites)}</span>{s.solves!==null&&<span>{`${s.solves.toLocaleString('en-US')} verified ${s.solves===1?'solve':'solves'}`}</span>}
   {f.signedIn?<Button className="min-h-11" size="sm" variant="outline" aria-pressed={s.favourite} disabled={!f.verified||f.busy||f.loading} onClick={f.toggle}><Heart aria-hidden="true" className={s.favourite?'fill-current':''}/>{s.favourite?'Favourited':'Favourite'}</Button>:<Link className="inline-flex min-h-11 items-center underline" href="/sign-in">Sign in to favourite</Link>}
   {f.signedIn&&!f.verified&&<span>Verify your email to save favourites.</span>}
  </div>:<p role="status">{f.loading?'Loading statistics…':f.loadError?'Statistics unavailable.':'Problem is no longer public or statistics are unavailable.'}</p>}
  {s&&f.loading&&<p role="status">Refreshing statistics…</p>}
  {error&&<p role="alert">{error}</p>}
 </div>;
}
export function ProblemStatsPanel({problemKey}:{problemKey:string}){return <ProblemStatsBatch keys={[problemKey]}><div className="mx-auto w-full max-w-4xl rounded-xl border p-4"><ProblemStatsControl problemKey={problemKey}/></div></ProblemStatsBatch>;}
