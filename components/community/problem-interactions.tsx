"use client";
import React,{createContext,useContext,useEffect,useLayoutEffect,useRef,useState} from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { interactionsSchema,type ProblemStats } from '@/lib/community/problem-interactions';
const Context=createContext<{data?:{problems:ProblemStats[];viewer:string};loading:boolean;error:boolean;disabled:boolean;busy:boolean;refresh:()=>void;save:(key:string,favourite:boolean)=>void}|null>(null);
export function ProblemInteractionsProvider({keys,children}:{keys:string[];children:React.ReactNode}){
 const {data:session,isPending,error:sessionError}=authClient.useSession();
 const [reload,setReload]=useState(0);
 const fingerprint=JSON.stringify([keys,session?.user.id??'guest',session?.user.emailVerified??false,isPending,!!sessionError,reload]);
 // Render-phase state is discarded with abandoned work. Shared refs must only
 // track committed selections, or a suspended render could cancel the live GET.
 const [selection,setSelection]=useState({fingerprint,generation:0});
 if(selection.fingerprint!==fingerprint)setSelection({fingerprint,generation:selection.generation+1});
 const requestKey=JSON.stringify([fingerprint,selection.generation]);
 const active=useRef<string|null>(requestKey);
 useLayoutEffect(()=>{active.current=requestKey;return()=>{active.current=null;};},[requestKey]);
 const [result,setResult]=useState<{key:string;data?:ReturnType<typeof interactionsSchema.parse>;error?:boolean;disabled?:boolean;busy?:boolean}>();
 const current=result?.key===requestKey?result:undefined;
 const selected=JSON.stringify(keys);
 useEffect(()=>{
  if(isPending)return;
  const controller=new AbortController();
  (async()=>{try{
   const response=await fetch('/api/community/problem-stats?'+new URLSearchParams({keys:JSON.parse(selected).join(',')}),{cache:'no-store',headers:{'X-Expected-Viewer':session?.user.id?encodeURIComponent(session.user.id):'guest'},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});
   if(controller.signal.aborted||active.current!==requestKey)return;
   if(response.status===503){const body=await response.json();if(body.disabled===true){if(!controller.signal.aborted&&active.current===requestKey)setResult({key:requestKey,disabled:true});return;}throw Error();}
   if(!response.ok)throw Error();
   const data=interactionsSchema.parse(await response.json());
   if(JSON.stringify(data.problems.map(p=>p.key))!==selected)throw Error();
   if(!controller.signal.aborted&&active.current===requestKey)setResult({key:requestKey,data});
  }catch{if(!controller.signal.aborted&&active.current===requestKey)setResult({key:requestKey,error:true});}})();
  return()=>controller.abort();
 },[requestKey,selected,isPending,sessionError,session?.user.id]);
 async function save(key:string,favourite:boolean){
  if(!current?.data||current.busy)return;
  const epoch=requestKey;
  setResult({...current,key:epoch,busy:true});
  try{
   const response=await fetch('/api/community/problem-stats',{method:'PUT',cache:'no-store',headers:{'Content-Type':'application/json','X-Expected-Viewer':session?.user.id?encodeURIComponent(session.user.id):'guest'},body:JSON.stringify({key,favourite}),signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error();
   const data=interactionsSchema.parse(await response.json());if(data.problems.length!==1||data.problems[0].key!==key)throw Error();
   if(active.current===epoch)setResult({key:epoch,data:{...current.data,problems:current.data.problems.map(p=>p.key===key?data.problems[0]:p)}});
  }catch{if(active.current===epoch)setResult({key:epoch,error:true});}
 }
 return <Context.Provider value={{data:current?.data,loading:!current,error:!!current?.error||!!current?.data&&!!sessionError,disabled:!!current?.disabled,busy:!!current?.busy,refresh:()=>setReload(n=>n+1),save}}>{children}</Context.Provider>;
}
export function ProblemInteractionControls({problemKey}:{problemKey:string}){
 const context=useContext(Context);if(!context||context.disabled)return null;
 if(context.error)return <div role="alert" className="space-y-2 text-sm"><p>Statistics or favourite update could not be confirmed.</p><Button variant="outline" size="sm" onClick={context.refresh}>Refresh statistics</Button></div>;
 if(context.loading)return null;
 const stats=context.data?.problems.find(p=>p.key===problemKey);if(!stats)return null;
 return <div role="group" className="space-y-2 text-sm" aria-label="Problem statistics" aria-busy={context.busy}>
  <p>{stats.favourites===null?'Favourite count unavailable':`${stats.favourites} ${stats.favourites===1?'favourite':'favourites'}`}</p>
  <p>{stats.completed===null?'Verified completion count unavailable':`${stats.completed} verified independent ${stats.completed===1?'completion':'completions'}`}</p>
  {context.data?.viewer==='guest'?<Link className="underline" href="/sign-in">Sign in to save favourites</Link>:context.data?.viewer==='unverified'?<p>Verify your email to save favourites.</p>:stats.canFavourite||stats.favourite?<Button variant="outline" size="sm" aria-pressed={stats.favourite} disabled={context.busy} onClick={()=>context.save(problemKey,!stats.favourite)}>{stats.favourite?'Remove favourite':'Save favourite'}</Button>:<p>Favourites are unavailable for this problem.</p>}
 </div>;
}
export function ProblemInteractions({problemKey}:{problemKey:string}){return <ProblemInteractionsProvider keys={[problemKey]}><ProblemInteractionControls problemKey={problemKey}/></ProblemInteractionsProvider>;}
