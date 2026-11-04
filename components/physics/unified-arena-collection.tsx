"use client";
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { unifiedArenaPageSchema, problemHref, type UnifiedArenaPage, type CollectionEntry } from '@/lib/unified-arena';
import { AchievementShowcase } from '@/components/community/achievement-badge';
import {ProblemStatsBatch,ProblemStatsControl} from '@/components/community/problem-stats';
import { ProblemCard } from './problem-card';

export function UnifiedProblemCard({problem}:{problem:CollectionEntry}) {
 return <ProblemCard id={problem.key} title={problem.title} source={problem.kind==='arena'?'Physcratic':'Community'}
  description={problem.summary} tags={problem.tags} elo={problem.elo} href={problemHref(problem)}
  attribution={<><ProblemStatsControl problemKey={problem.key}/>{problem.kind==='arena'?<p className="text-sm">Published by Physcratic</p>:<>
   <p className="text-sm">By {problem.author?<Link className="underline" href={`/u/${problem.author.handle}`}>{problem.author.displayName||'@'+problem.author.handle}</Link>:'Community author'}</p>
   {problem.author&&<AchievementShowcase ids={problem.author.selectedIds} medals={problem.author.medals}/>}
   <p className="text-sm text-muted-foreground">Author-estimated difficulty: {problem.estimatedDifficulty||'Not specified'}</p>
   {problem.provenance&&<details className="text-sm"><summary className="cursor-pointer py-2">Attribution and rights</summary><p className="whitespace-pre-wrap break-words">{problem.provenance.kind==='original'?'Original':'Authorized source'}{problem.provenance.source&&` · ${problem.provenance.source}`}</p><p className="whitespace-pre-wrap break-words">{problem.provenance.rightsDeclaration}</p></details>}
  </>}</>}/>;
}
export function UnifiedArenaCollection({query,topic,difficulty,source='all',onReset}:{query:string;topic:string;difficulty:string;source?:'all'|'authored';onReset:()=>void}) {
 const [cursors,setCursors]=useState<(string|undefined)[]>([undefined]);
 const [refresh,setRefresh]=useState(0),[result,setResult]=useState<{key:string;page?:UnifiedArenaPage;error?:boolean}>();
 const filters=JSON.stringify([query,topic,difficulty,source]);const [previous,setPrevious]=useState(filters);
 if(previous!==filters){setPrevious(filters);setCursors([undefined]);}
 const after=cursors.at(-1),key=JSON.stringify([filters,after,refresh]),current=result?.key===key?result:undefined;
 const heading=useRef<HTMLHeadingElement>(null),focus=useRef(false);
 useEffect(()=>{const c=new AbortController();const timer=setTimeout(async()=>{
  try{const p=new URLSearchParams({q:query.trim(),tag:topic==='all'?'':topic,difficulty,source});if(after)p.set('after',after);
   const r=await fetch('/api/arena/collection?'+p,{cache:'no-store',signal:AbortSignal.any([c.signal,AbortSignal.timeout(15000)])});if(!r.ok)throw Error();
   const page=unifiedArenaPageSchema.parse(await r.json());if(!c.signal.aborted){setResult({key,page});if(focus.current){heading.current?.focus();focus.current=false;}}
  }catch{if(!c.signal.aborted)setResult({key,error:true});}
 },250);return()=>{clearTimeout(timer);c.abort();};},[key,query,topic,difficulty,source,after]);
 return <section id="arena-results" aria-labelledby="unified-arena-title" className="min-w-0 space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="unified-arena-title" tabIndex={-1} ref={heading} className="text-lg font-medium">{source==='authored'?'Published authored problems':'Physcratic Arena'}</h2><Button variant="outline" onClick={()=>{setCursors([undefined]);setRefresh(n=>n+1);}}>Refresh collection</Button></div>
  <p className="text-sm text-muted-foreground">Physcratic originals and published community problems. Stable order: Physcratic, then community by identity. Search and tags apply before pagination. Author labels have no numeric rating. Refresh to include new publications earlier in the list.</p>
  {!current&&<p role="status">Loading collection…</p>}
  {current?.error&&<div role="alert"><p>The collection could not be loaded.</p><Button variant="outline" onClick={()=>setRefresh(n=>n+1)}>Retry collection</Button></div>}
  {current?.page&&<>
   {current.page.authoredUnavailable&&<p role="alert">Community discovery is unavailable. Results are incomplete. Refresh to retry.</p>}
   {current.page.attributionUnavailable&&<p role="status">Public author details are temporarily unavailable.</p>}
   <p role="status" className="text-sm">{current.page.problems.length} {current.page.problems.length===1?'problem':'problems'} on this page</p>
   {!current.page.problems.length?<div className="space-y-3 rounded-xl border p-5"><p>No matching problems found.</p><Button variant="outline" onClick={onReset}>Clear filters</Button></div>:<div className="grid min-w-0 gap-5 [overflow-wrap:anywhere]">{current.page.statsEnabled?<ProblemStatsBatch keys={current.page.problems.map(p=>p.key)}>{current.page.problems.map(p=><UnifiedProblemCard key={p.key} problem={p}/>)}</ProblemStatsBatch>:current.page.problems.map(p=><UnifiedProblemCard key={p.key} problem={p}/>)}</div>}
  </>}
  <nav aria-label="Arena collection pages" className="flex flex-wrap gap-3"><Button variant="outline" disabled={cursors.length===1} onClick={()=>{focus.current=true;setCursors(p=>p.slice(0,-1));}}>Previous page</Button><Button variant="outline" disabled={!current?.page?.nextCursor} onClick={()=>{focus.current=true;setCursors(p=>[...p,current!.page!.nextCursor!]);}}>Next page</Button></nav>
 </section>;
}
