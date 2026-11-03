import React from "react";
import { GraduationCap, UserRound } from "lucide-react";
import { physicsTopics } from "@/lib/physics-taxonomy";
import { educationLabels, type PublicProfile } from "@/lib/community/profile-client";
import { emptyProfileMedia, type ProfileMediaSet } from "@/lib/community/profile-media-contracts";
import { ProfileImage } from "./profile-image";
import { AchievementShowcase } from "./achievement-badge";
import type { BadgeId, PublicMedal } from "@/lib/community/achievements";

export function ProfileCard({ profile, media = emptyProfileMedia, badgeIds = [], medals = [], compact = false, headingLevel = 1 }: {
  profile: PublicProfile; media?: ProfileMediaSet; badgeIds?: BadgeId[]; medals?:PublicMedal[]; compact?: boolean; headingLevel?: 1 | 3;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h3";
  return <article className="min-w-0 overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm" aria-label={compact ? "Profile preview" : "Public profile"}>
    <div className="relative aspect-[4/1] bg-gradient-to-br from-sky-200 via-slate-200 to-indigo-200 dark:from-slate-700 dark:via-slate-800 dark:to-indigo-950">
      {media.banner && <ProfileImage src={media.banner.url} />}
    </div>
    <div className={compact ? "relative px-5 pb-6" : "relative px-5 pb-8 sm:px-8"}>
      <div className={`relative -mt-10 mb-4 flex items-center justify-center overflow-hidden rounded-full border-4 border-card bg-muted ${compact ? "size-20" : "size-20 sm:-mt-12 sm:size-24"}`}>
        {media.avatar ? <ProfileImage src={media.avatar.url} avatar />
          : <UserRound aria-hidden="true" className="size-9 text-muted-foreground" />}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-3"><Heading className={`${compact ? "text-xl" : "text-2xl sm:text-3xl"} min-w-0 break-words font-semibold tracking-tight [overflow-wrap:anywhere]`}>{profile.displayName || profile.handle || "Your display name"}</Heading><AchievementShowcase ids={badgeIds} medals={medals} /></div>
      <p className="mt-1 break-all text-sm text-muted-foreground">@{profile.handle || "username"}</p>
      {profile.bio && <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere]">{profile.bio}</p>}
      {profile.educationLevel !== "prefer-not-to-say" && <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><GraduationCap aria-hidden="true" className="size-4 shrink-0" />{educationLabels[profile.educationLevel]}</p>}
      {profile.favoriteTopicIds.length > 0 && <div className="mt-6 space-y-3"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Favourite physics topics</p><ul className="flex flex-wrap gap-2" aria-label="Favourite physics topics">{profile.favoriteTopicIds.map(id => <li key={id} className="rounded-full border bg-muted/30 px-3 py-1.5 text-xs">{physicsTopics.find(topic => topic.id === id)?.label}</li>)}</ul></div>}
    </div>
  </article>;
}
