"use client";
import React,{useRef,useState} from 'react';
import {authClient} from '@/lib/auth-client';
import {casePageSchema,caseTitle} from '@/lib/community/moderation-client';
import {Button} from '@/components/ui/button';
import {useModerationQuery} from './moderation-query';
export function ModerationHistory(){
 const {data,isPending,error}=authClient.useSession();
 return <section id="moderation-history" aria-labelledby="moderation-history-heading" className="scroll-mt-6 space-y-5 rounded-2xl border bg-card p-5 sm:p-7"><header className="space-y-2"><h2 id="moderation-history-heading" className="text-lg font-semibold">Reports and appeals</h2><p className="text-sm text-muted-foreground">Private status and reviewer feedback for your requests.</p></header>{isPending?<p role="status">Loading account…</p>:error||!data?.user.emailVerified?<p role="status">Sign in with a verified account to view your requests.</p>:<History key={data.user.id}/>}</section>;
}
function History(){
 const [area,setArea]=useState<'reports'|'appeals'>('reports'),[pages,setPages]=useState<(string|null)[]>([null]),[refresh,setRefresh]=useState(0);const heading=useRef<HTMLDivElement>(null);
 const after=pages.at(-1),query=useModerationQuery('/api/community/'+area+(after?'?after='+after:''),casePageSchema,refresh);
 return <div className="space-y-4" ref={heading} tabIndex={-1}><div className="flex flex-wrap items-center gap-3"><label className="text-sm">Request type <select aria-label="Request type" value={area} onChange={e=>{setArea(e.target.value as typeof area);setPages([null]);}} className="min-h-11 rounded border bg-background px-3"><option value="reports">My reports</option><option value="appeals">My appeals</option></select></label><Button variant="outline" onClick={()=>setRefresh(n=>n+1)}>Refresh status</Button></div>
  {query.loading&&<p role="status">Loading your requests…</p>}{query.error&&<p role="alert">{query.error.message}</p>}{query.data&&!query.data.cases.length&&<p className="text-sm text-muted-foreground">No {area} on this page.</p>}
  <ul className="space-y-3">{query.data?.cases.map(c=><li key={c.id} className="space-y-2 rounded-lg border p-4 [overflow-wrap:anywhere]"><p className="font-medium">{caseTitle(c)}</p><p className="text-sm capitalize">Status: {c.state}</p><p className="text-xs text-muted-foreground">Reference {c.id}</p>{'details'in c&&c.details&&<p className="whitespace-pre-wrap text-sm">{c.details}</p>}{'reason'in c&&<p className="whitespace-pre-wrap text-sm">Your reason: {c.reason}</p>}{'resolution'in c&&c.resolution&&<p className="whitespace-pre-wrap rounded border bg-muted/30 p-3 text-sm">Reviewer feedback: {c.resolution}</p>}</li>)}</ul>
  <nav aria-label="Your request pages" className="flex flex-wrap gap-3"><Button variant="outline" disabled={query.loading||pages.length===1} onClick={()=>{setPages(v=>v.slice(0,-1));heading.current?.focus();}}>Previous requests</Button><Button variant="outline" disabled={query.loading||!query.data?.nextCursor} onClick={()=>{setPages(v=>[...v,query.data!.nextCursor]);heading.current?.focus();}}>Next requests</Button></nav>
 </div>;
}
