import React from 'react';
import Link from 'next/link';
import {headers} from 'next/headers';
import {communityModerationUiEnabled,createModerationRoute} from '@/lib/community/moderation-route';
import {ModerationDashboard} from '@/components/community/moderation-dashboard';
import {communityActionsEnabled} from '@/lib/community/action-policy';
export const dynamic='force-dynamic';
export const metadata={title:'Moderation review',robots:{index:false,follow:false}};
export default async function ModerationPage(){
 let allowed=false,message='Moderation review is not available yet.';
 if(communityModerationUiEnabled()){
  const r=await createModerationRoute('staff')(new Request('https://moderation.internal/api/community/moderation',{headers:await headers()}));
  allowed=r.ok;message=r.status===401?'Sign in with an authorized staff account.':r.status===403?'Current moderator or admin permission is required.':'Moderation review is temporarily unavailable.';
 }
 return <main className="min-h-dvh bg-background px-5 py-8 text-foreground [--border:240_5%_46%] dark:[--border:240_4%_44%]"><div className="mx-auto max-w-6xl space-y-7"><nav aria-label="Moderation navigation" className="flex flex-wrap gap-5"><Link className="underline" href="/settings#moderation-history">My reports and appeals</Link><Link className="underline" href="/dashboard">Back to Arena</Link><Link className="underline" href="/admin/verification">Medal verification</Link></nav><header className="space-y-2"><p className="text-xs uppercase tracking-widest text-muted-foreground">Private administration</p><h1 className="text-3xl font-semibold">Moderation</h1><p className="text-sm text-muted-foreground">Review reports, held comments and appeals. Keep a reason for every decision.</p></header>{allowed?<ModerationDashboard actionsEnabled={communityActionsEnabled()}/>:<p role="status" className="rounded-xl border p-5">{message}</p>}</div></main>;
}
