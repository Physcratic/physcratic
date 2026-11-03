import React from "react";
import { Flame, Layers, Shapes, Crown, Lightbulb, Compass, Mountain } from "lucide-react";
import { achievementDefinitions, achievementIdSchema, type BadgeId, type PublicMedal, type AchievementId } from "@/lib/community/achievements";

import { MedalBadge } from "./medal-badge";
const colors = {
  slate: "border-slate-400 bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100",
  teal: "border-teal-500 bg-teal-50 text-teal-900 dark:bg-teal-950 dark:text-teal-100",
  indigo: "border-indigo-400 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100",
  amber: "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  green: "border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100",
  blue: "border-blue-400 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
  violet: "border-violet-400 bg-violet-50 text-violet-900 dark:bg-violet-950 dark:text-violet-100",
};
const icons = [Flame, Layers, Shapes, Crown, Lightbulb, Compass, Mountain];

// Static styling also works with reduced motion. A native disclosure is touch/keyboard accessible.
export function AchievementBadge({ id }: { id: AchievementId }) {
  const index = achievementDefinitions.findIndex(badge => badge.id === id);
  const definition = achievementDefinitions[index], Icon = icons[index];
  if (!definition) return null;
  return <details className="group max-w-full text-xs">
    <summary className={`flex w-fit max-w-full cursor-pointer list-none items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden ${colors[definition.tone]} ${definition.rare ? "shadow-sm ring-1 ring-inset ring-current/10" : ""}`} aria-label={`${definition.name}: badge details`}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0" /><span className="break-words">{definition.name}</span>
    </summary>
    <p className="mt-2 max-w-64 rounded-lg border bg-card p-3 leading-5 text-card-foreground">{definition.description} Eligibility reflects current publications and verified unassisted work.</p>
  </details>;
}

export function AchievementShowcase({ ids, medals=[] }: { ids: readonly BadgeId[]; medals?:PublicMedal[] }) {
  if (!ids.length) return null;
  return <div aria-label="Achievement showcase" className="flex min-w-0 flex-wrap items-start gap-2">{[...new Set(ids)].slice(0, 2).map(id => {const earned=achievementIdSchema.safeParse(id),medal=medals.find(m=>m.id===id);return earned.success?<AchievementBadge key={id} id={earned.data} />:medal?<MedalBadge key={id} medal={medal}/>:null;})}</div>;
}
