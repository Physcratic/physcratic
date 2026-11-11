import {accountDeletionEnabled} from "@/lib/account-deletion/route";
import React from "react";
import type { Metadata } from "next";
import { verificationUiEnabled } from "@/lib/community/medal-route";
import { AccountSettings } from "@/components/community/account-settings";
import { communityProfilesEnabled } from "@/lib/community/profile-route";
import { profileMediaEnabled } from "@/lib/community/profile-media-route";
import { communityAchievementsEnabled } from "@/lib/community/achievements-route";
import {communityModerationUiEnabled} from '@/lib/community/moderation-route';
import { authEmailReady } from "@/lib/auth-email-transport";
export const metadata: Metadata = { title: "Account Settings", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AccountSettings deletionEnabled={accountDeletionEnabled()} moderationEnabled={communityModerationUiEnabled()} verificationEnabled={verificationUiEnabled()} profilesEnabled={communityProfilesEnabled()} mediaEnabled={profileMediaEnabled()} achievementsEnabled={communityAchievementsEnabled()} onboarding={(await searchParams).onboarding === "1"} emailReady={authEmailReady()} />;
}
