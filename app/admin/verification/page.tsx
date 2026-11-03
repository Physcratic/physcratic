import React from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { medalRoute,verificationUiEnabled } from '@/lib/community/medal-route';
import { VerificationDashboard } from '@/components/community/verification-dashboard';
export const dynamic='force-dynamic';
export const metadata={title:'Medal verification review',robots:{index:false,follow:false}};
export default async function VerificationPage(){
 let allowed=false,message='Verification review is not available yet.';
 if(verificationUiEnabled()){
  const response=await medalRoute('queue',new Request('https://verification.internal/api/community/medals/review',{headers:await headers()}));
  allowed=response.ok;message=response.status===401?'Sign in with an authorized admin account.':response.status===403?'Admin permission is required.':'Verification review is temporarily unavailable.';
 }
 return <main className="min-h-dvh bg-background px-5 py-8 text-foreground [--border:240_5%_46%] dark:[--border:240_4%_44%]"><div className="mx-auto max-w-6xl space-y-7"><nav className="flex flex-wrap justify-between gap-3" aria-label="Verification navigation"><Link className="underline" href="/settings">Account Settings</Link><Link className="underline" href="/dashboard">Back to Arena</Link></nav><header className="space-y-2"><p className="text-xs uppercase tracking-widest text-muted-foreground">Private administration</p><h1 className="text-3xl font-semibold">Medal verification</h1><p className="text-sm text-muted-foreground">Review certificate evidence and keep a reason for every decision.</p></header>{allowed?<VerificationDashboard/>:<div className="space-y-3 rounded-xl border p-5"><p role="status">{message}</p>{verificationUiEnabled()&&<Link className="underline" href="/sign-in">Sign in</Link>}</div>}</div></main>;
}
