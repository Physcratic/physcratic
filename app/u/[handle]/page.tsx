import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { communityProfilesEnabled, communityProfileRoute } from "@/lib/community/profile-route";
import { profileMediaEnabled, profileMediaRoute } from "@/lib/community/profile-media-route";
import { publicProfileSchema, mediaResponse } from "@/lib/community/profile-client";
import { emptyProfileMedia } from "@/lib/community/profile-media-contracts";
import { ProfileCard } from "@/components/community/profile-card";
import { communityAchievementsEnabled, communityAchievementsRoute } from "@/lib/community/achievements-route";
import { publicShowcaseSchema, type BadgeId, type PublicMedal } from "@/lib/community/achievements";

import {communityModerationUiEnabled} from '@/lib/community/moderation-route';
import {ReportControl} from '@/components/community/report-controls';

// No private identity, account dates, invented statistics or indexing in this first release.
export const metadata: Metadata = { title: "Community profile", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  if (!communityProfilesEnabled()) notFound();
  const { handle } = await params;
  // Reuse the same public authorization boundary without a network round trip or owner cookies.
  const response = await communityProfileRoute("public", new Request("https://profile.internal/api/community/profile"), handle);
  if (response.status === 404) notFound();
  if (!response.ok) return <main className="mx-auto max-w-xl space-y-4 px-5 py-20"><h1 className="text-2xl font-semibold">Profile unavailable</h1><p className="text-sm text-muted-foreground">Please try again later.</p><Link href="/dashboard" className="underline">Back to Arena</Link></main>;
  const profile = publicProfileSchema.parse((await response.json()).profile);
  let media = emptyProfileMedia;
  let badgeIds: BadgeId[] = [];
  let medals:PublicMedal[]=[];
  if (communityAchievementsEnabled()) {
    const badges = await communityAchievementsRoute(new Request(`https://profile.internal/api/community/achievements?handle=${encodeURIComponent(profile.handle)}`));
    if (badges.ok) {const showcase=publicShowcaseSchema.parse(await badges.json());badgeIds=showcase.selectedIds;medals=showcase.medals??[];}
  }
  if (profileMediaEnabled()) {
    const images = await profileMediaRoute("metadata", new Request(`https://profile.internal/api/community/profile-media?handle=${encodeURIComponent(profile.handle)}`));
    if (images.ok) media = mediaResponse.parse(await images.json()).media;
  }
  return <main className="min-h-dvh bg-muted/20 px-5 py-8 text-foreground sm:py-12"><div className="mx-auto max-w-3xl space-y-7"><nav aria-label="Profile navigation" className="flex flex-wrap items-center justify-between gap-3"><Link href="/dashboard" className="text-lg font-semibold tracking-tight">Physcratic</Link><Link href="/dashboard?view=problems" className="rounded px-1 py-2 text-sm text-muted-foreground underline underline-offset-4">Back to Arena</Link></nav><ProfileCard profile={profile} media={media} badgeIds={badgeIds} medals={medals} />{communityModerationUiEnabled()&&<ReportControl subject={{kind:'profile',handle:profile.handle}}/>}</div></main>;
}
