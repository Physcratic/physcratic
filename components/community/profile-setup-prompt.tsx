"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { dismissProfileSetup, onboardingKey, ownProfileResponse, profileRequest } from "@/lib/community/profile-client";

export function ProfileSetupPrompt() {
  const { data } = authClient.useSession();
  const userId = data?.user.emailVerified === true ? data.user.id : undefined;
  const [offeredTo, setOfferedTo] = useState<string>();
  useEffect(() => {
    setOfferedTo(undefined);
    if (!userId) return;
    try { if (localStorage.getItem(onboardingKey(userId))) return; }
    catch { return; } // Without persistent storage, suppress the automatic invitation.
    const controller = new AbortController();
    const dismissed = () => setOfferedTo(undefined);
    window.addEventListener("community-profile-setup", dismissed);
    profileRequest("/api/community/profile", { signal: controller.signal }).then(result => {
      if (controller.signal.aborted || ownProfileResponse.parse(result).profile) return;
      try { if (!localStorage.getItem(onboardingKey(userId))) setOfferedTo(userId); } catch { /* Remain quiet. */ }
    }).catch(() => {});
    return () => { controller.abort(); window.removeEventListener("community-profile-setup", dismissed); };
  }, [userId]);
  if (!userId || offeredTo !== userId) return null;
  return <section className="mb-7 flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4" aria-labelledby="profile-setup-heading"><UserRound aria-hidden="true" className="size-5 text-muted-foreground" /><div className="min-w-0 flex-1"><h2 id="profile-setup-heading" className="text-sm font-medium">Set up your community profile</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Choose a permanent username and decide what to share. This is optional.</p></div><div className="flex flex-wrap gap-2"><Button size="sm" asChild><Link href="/settings?onboarding=1#profile-settings">Set up profile</Link></Button><Button size="sm" variant="ghost" onClick={() => dismissProfileSetup(userId)}>Skip for now</Button></div></section>;
}
