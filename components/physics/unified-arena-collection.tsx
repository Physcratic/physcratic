"use client";
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useProblemHistory } from '@/hooks/use-problem-history';
import { authClient } from '@/lib/auth-client';
import { completionChangedEvent } from '@/lib/personal-completions-client';
import { Button } from '@/components/ui/button';
import { unifiedArenaPageSchema, problemHref, type UnifiedArenaPage, type CollectionEntry } from '@/lib/unified-arena';
import { AchievementShowcase } from '@/components/community/achievement-badge';
import {ProblemStatsBatch,useProblemFavourite,type ProblemFavourite} from '@/components/community/problem-stats';
import { ProblemCard, ProblemCardSkeletonList } from './problem-card';
import { parseRating } from '@/lib/rating-bands';
import { arenaCardImage } from '@/lib/arena/card-image';

// Card props for the favourite control. Empty without statistics, so the card renders as it did before.
function likeProps(f:ProblemFavourite|null){
 if(!f)return {};
 const s=f.stat;
 return {likeCount:s?.favourites,liked:s?.favourite??false,onToggleLike:s?f.toggle:undefined,
  likeAccess:!f.signedIn?'signed-out' as const:!f.verified?'unverified' as const:'ready' as const,
  likeBusy:f.busy||f.loading,
  likeStatus:!s?(f.loading?'Loading statistics…':f.loadError?'Statistics unavailable.':'Problem is no longer public or statistics are unavailable.'):f.loading?'Refreshing statistics…':undefined,
  likeError:f.actionError||f.loadError||undefined};
}
// A community problem's rating is the author's difficulty, a whole number from 0 to 4000. The card gets it as the same `elo`
// an arena card gets, so the band, its tint and its tier name come from ratingBand in lib/rating-bands.ts. A free-text label is not a rating.
const cardRating=(p:CollectionEntry)=>p.kind==='arena'?p.elo:parseRating(p.estimatedDifficulty??'')??undefined;
export function UnifiedProblemCard({problem,attempted}:{problem:CollectionEntry;attempted?:boolean}) {
 const favourite=useProblemFavourite(problem.key),solves=favourite?.stat?.solves;
 return <ProblemCard id={problem.key} title={problem.title} source={problem.kind==='arena'?'Physcratic':'Community'}
  description={problem.summary} attempted={attempted} tags={problem.tags} elo={cardRating(problem)} href={problemHref(problem)} image={problem.kind==='arena'?arenaCardImage(problem.id):problem.image} {...likeProps(favourite)}
  attribution={problem.kind==='arena'?<>{solves!==undefined&&solves!==null&&<p className="text-sm">{`${solves.toLocaleString('en-US')} verified ${solves===1?'solve':'solves'}`}</p>}<p className="text-sm">Published by Physcratic</p></>:<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
   <p className="min-w-0 text-sm [overflow-wrap:anywhere]">
    {problem.author?<>By&nbsp;<Link className="underline" href={`/u/${problem.author.handle}`}>{problem.author.displayName||'@'+problem.author.handle}</Link></>:'By Community author'}
   </p>
   {problem.author&&<AchievementShowcase ids={problem.author.selectedIds} medals={problem.author.medals}/>}
  </div>}
  completed={problem.completed}/>;
}
type CollectionProps = { query:string; topic:string; difficulty:string; source?:'all'|'authored'; onReset:()=>void };

export function UnifiedArenaCollection({ completionsEnabled = false, ...props }: CollectionProps & { completionsEnabled?: boolean }) {
 return completionsEnabled ? <SessionArenaCollection {...props} /> : <ArenaPages {...props} />;
}

function SessionArenaCollection(props: CollectionProps) {
 const { data, error, isPending, isRefetching, refetch } = authClient.useSession();
 const account = error ? undefined : data?.user?.id;
 return <ArenaPages key={account ?? "guest"} {...props} account={account} resolving={isPending || isRefetching}
   onAccountChanged={refetch} />;
}

function ArenaPages({query,topic,difficulty,source='all',onReset,account,resolving=false,onAccountChanged}: CollectionProps & {
 account?: string; resolving?: boolean; onAccountChanged?: () => void;
}) {
 const {progress}=useProblemHistory();
 const [cursors,setCursors]=useState<(string|undefined)[]>([undefined]);
 const [refresh,setRefresh]=useState(0),[result,setResult]=useState<{key:string;page?:UnifiedArenaPage;error?:boolean}>();
 const filters=JSON.stringify([query,topic,difficulty,source]);const [previous,setPrevious]=useState(filters);
 if(previous!==filters){setPrevious(filters);setCursors([undefined]);}
 const after=cursors.at(-1),key=JSON.stringify([account,filters,after,refresh]),current=!resolving&&result?.key===key?result:undefined;
 const heading=useRef<HTMLHeadingElement>(null),focus=useRef(false),accountRechecked=useRef(false);
 useEffect(()=>{
  if (!account) return;
  const reset = () => { setCursors([undefined]); setRefresh(n=>n+1); };
  const changed = (event: Event) => { if ((event as CustomEvent<string>).detail === account) reset(); };
  const restored = (event: PageTransitionEvent) => { if (event.persisted) reset(); };
  window.addEventListener(completionChangedEvent,changed);
  window.addEventListener("pageshow",restored);
  return ()=>{
   window.removeEventListener(completionChangedEvent,changed);
   window.removeEventListener("pageshow",restored);
  };
 },[account]);
 useEffect(()=>{
  if (resolving) return;
  const c=new AbortController();
  const timer=setTimeout(async()=>{
   try {
    const params=new URLSearchParams({q:query.trim(),tag:topic==='all'?'':topic,difficulty,source});
    if(after)params.set('after',after);
    const response=await fetch('/api/arena/collection?'+params,{
     cache:'no-store',headers:account?{'X-Community-Account':account}:undefined,
     signal:AbortSignal.any([c.signal,AbortSignal.timeout(15000)]),
    });
    if (!response.ok) {
     const code = response.status === 409 ? (await response.json()).code : undefined;
     if (c.signal.aborted) return;
     if (account && after && (code === "COMPLETION_ORDER_CHANGED" || response.status === 400)) {
      setCursors([undefined]);
      setRefresh(n=>n+1);
      return;
     }
     if (code === "ACCOUNT_CHANGED" && !accountRechecked.current) {
      accountRechecked.current = true;
      onAccountChanged?.();
     }
     throw Error("Collection request failed.");
    }
    const page=unifiedArenaPageSchema.parse(await response.json());
    if (page.personalization && !account) throw Error("Unexpected personalized collection.");
    if(!c.signal.aborted) {
     setResult({key,page});
     if(focus.current){heading.current?.focus();focus.current=false;}
    }
   } catch {
    if(!c.signal.aborted)setResult({key,error:true});
   }
  },250);
  return()=>{clearTimeout(timer);c.abort();};
 },[key,query,topic,difficulty,source,after,account,resolving,onAccountChanged]);
 const cards=current?.page?.problems.map(problem=>{
  const attemptedIds=problem.kind==='arena'?progress?.attemptedArenaIds:progress?.attemptedAuthoredIds;
  return <UnifiedProblemCard key={problem.key} problem={problem} attempted={attemptedIds?.includes(problem.id)}/>;
 });
 return <section id="arena-results" aria-labelledby="unified-arena-title" className="min-w-0 space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="unified-arena-title" tabIndex={-1} ref={heading} className="text-lg font-medium">{source==='authored'?'Published Authored Problems':'Physcratic Arena'}</h2><Button variant="outline" onClick={()=>{setCursors([undefined]);setRefresh(n=>n+1);}}>Refresh collection</Button></div>
  <p className="text-sm text-muted-foreground">{current?.page?.personalization==="active"
   ? "Unfinished problems appear first. Each group is sorted by rating."
   : "Physcratic originals and published community problems, sorted by rating from low to high. Problems without a rating come last. Search and tags apply before pagination. Refresh to include new publications."}</p>
  {!current&&<ProblemCardSkeletonList label="Loading collection…" count={3}/>}
  {current?.error&&<div role="alert"><p>The collection could not be loaded.</p><Button variant="outline" onClick={()=>setRefresh(n=>n+1)}>Retry collection</Button></div>}
  {current?.page&&<>
   {account && current.page.personalization !== "active" && <p role="status">Completion status is unavailable. Browsing by rating.</p>}
   {current.page.authoredUnavailable&&<div role="alert" className="flex flex-wrap items-center gap-3"><p>Community problems could not be loaded, so this list is incomplete.</p><Button variant="outline" className="min-h-11" onClick={()=>setRefresh(n=>n+1)}>Try again</Button></div>}
   {current.page.attributionUnavailable&&<p role="status">Public author details are temporarily unavailable.</p>}
   <p role="status" className="text-sm">{current.page.problems.length} {current.page.problems.length===1?'problem':'problems'} on this page</p>
   {!current.page.problems.length?<div className="space-y-3 rounded-xl border p-5"><p>No matching problems found.</p><Button variant="outline" onClick={onReset}>Clear filters</Button></div>:<div className="grid min-w-0 gap-6 [overflow-wrap:anywhere]">{current.page.statsEnabled?<ProblemStatsBatch keys={current.page.problems.map(p=>p.key)}>{cards}</ProblemStatsBatch>:cards}</div>}
  </>}
  <nav aria-label="Arena collection pages" className="flex flex-wrap gap-3"><Button variant="outline" disabled={cursors.length===1} onClick={()=>{focus.current=true;setCursors(p=>p.slice(0,-1));}}>Previous page</Button><Button variant="outline" disabled={!current?.page?.nextCursor} onClick={()=>{focus.current=true;setCursors(p=>[...p,current!.page!.nextCursor!]);}}>Next page</Button></nav>
 </section>;
}
