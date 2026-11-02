import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "../components/theme-provider";
import { AccountSettings } from "../components/community/account-settings";
import { ProfileCard } from "../components/community/profile-card";
import { ProfileSetupPrompt } from "../components/community/profile-setup-prompt";
import ProfileNotFound from "../app/u/[handle]/not-found";
import { publicProfileSchema, profileRequest, mediaResponse, type PublicProfile } from "../lib/community/profile-client";
import { emptyProfileMedia } from "../lib/community/profile-media-contracts";
import { showcaseSchema, type AchievementId } from "../lib/community/achievements";
declare global { interface Window { __COMMUNITY_TEST_FLAGS__: { profiles: boolean; media: boolean; achievements?: boolean } } }
const flags = window.__COMMUNITY_TEST_FLAGS__;
function PublicHarness({ handle }: { handle: string }) {
  const [profile, setProfile] = useState<PublicProfile>(), [images, setImages] = useState(emptyProfileMedia), [failed, setFailed] = useState(false);
  const [badgeIds, setBadgeIds] = useState<AchievementId[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    profileRequest(`/api/community/profile/${handle}`, { signal: controller.signal }).then(async result => {
      if (controller.signal.aborted) return;
      setProfile(publicProfileSchema.parse(result.profile));
      if (flags.achievements) {
        const badges = await profileRequest(`/api/community/achievements?handle=${handle}`, { signal: controller.signal });
        if (!controller.signal.aborted) setBadgeIds(showcaseSchema.parse(badges).selectedIds);
      }
      if (flags.media) {
        const media = await profileRequest(`/api/community/profile-media?handle=${handle}`, { signal: controller.signal });
        if (!controller.signal.aborted) setImages(mediaResponse.parse(media).media);
      }
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [handle]);
  if (failed) return <ProfileNotFound />;
  return <main className="mx-auto max-w-3xl p-5">{profile ? <ProfileCard profile={profile} media={images} badgeIds={badgeIds} /> : <p role="status">Loading profile…</p>}</main>;
}
const handle = location.pathname.match(/^\/u\/([^/]+)$/)?.[1];
createRoot(document.getElementById("root")!).render(<React.StrictMode><ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
  {handle ? <PublicHarness handle={handle} /> : location.pathname === "/settings" ? <AccountSettings profilesEnabled={flags.profiles} mediaEnabled={flags.media} achievementsEnabled={flags.achievements} onboarding={location.search.includes("onboarding=1")} />
    : <main className="mx-auto max-w-5xl p-5"><h1 className="mb-6 text-2xl">Physcratic Arena</h1>{flags.profiles && <ProfileSetupPrompt />}</main>}
</ThemeProvider></React.StrictMode>);
