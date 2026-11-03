"use client";
import React, { useEffect, useRef, useState } from "react";
import { achievementDefinitions, achievementEligible, ownAchievementsSchema, showcaseSchema, type BadgeId, type PublicMedal, type OwnAchievements } from "@/lib/community/achievements";
import { profileRequest, ProfileRequestError } from "@/lib/community/profile-client";
import { Button } from "@/components/ui/button";
import { MedalBadge } from "./medal-badge";
import { AchievementBadge, AchievementShowcase } from "./achievement-badge";

export function AchievementSettings({ profileSaved, verified, onPreviewChange, onMedalsChange }: {
  profileSaved: boolean; verified: boolean; onPreviewChange: (ids: BadgeId[]) => void; onMedalsChange?: (medals:PublicMedal[])=>void;
}) {
  const [data, setData] = useState<OwnAchievements | null>(null), [selected, setSelected] = useState<BadgeId[]>([]);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [reload, setReload] = useState(0);
  const [error, setError] = useState(""), [success, setSuccess] = useState("");
  const saveController = useRef<AbortController | null>(null);
  useEffect(() => () => saveController.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setData(null); setError(""); setSuccess(""); onPreviewChange([]); onMedalsChange?.([]);
    profileRequest("/api/community/achievements", { signal: controller.signal }).then(value => {
      if (controller.signal.aborted) return;
      const next = ownAchievementsSchema.parse(value);
      setData(next); setSelected(next.selectedIds); onPreviewChange(next.selectedIds); onMedalsChange?.(next.medals??[]);
    }).catch(() => { if (!controller.signal.aborted) setError("Achievements could not be loaded. Progress is unavailable. Please retry."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload, profileSaved, onPreviewChange,onMedalsChange]);
  function choose(ids: BadgeId[]) { setSelected(ids); onPreviewChange(ids); setSuccess(""); }
  async function save() {
    const controller = new AbortController(); saveController.current = controller;
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = showcaseSchema.parse(await profileRequest("/api/community/achievements", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selectedIds: selected }), signal: controller.signal,
      }));
      if (controller.signal.aborted) return;
      choose(response.selectedIds); setSuccess("Achievement showcase saved.");
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof ProfileRequestError && e.status === 409
        ? "Eligibility changed or your profile is missing. Reload achievements before saving."
        : e instanceof ProfileRequestError && e.status === 429 ? "Too many showcase updates. Try again next minute."
          : "Your showcase could not be saved. Reload to check the saved selection before retrying.");
    } finally { if (!controller.signal.aborted) setSaving(false); }
  }
  return <section id="achievement-settings" aria-labelledby="achievement-heading" className="scroll-mt-6 space-y-5 rounded-2xl border bg-card p-5 sm:p-7">
    <header className="space-y-2"><h2 id="achievement-heading" className="text-lg font-semibold">Achievements</h2><p className="text-sm leading-6 text-muted-foreground">Choose up to two earned badges or verified medals. Selection order is the display order. Your showcase is public only when your profile is public.</p></header>
    <p className="text-xs leading-5 text-muted-foreground">Author progress counts current published problems. Solver progress requires every part of the current revision to be correctly graded without assistance. Self-authored, manual and static self-review problems do not count. Counts stop at 50. Unpublishing or replacing a revision can remove eligibility.</p>
    {loading ? <p role="status" className="text-sm">Loading achievements…</p> : data && <>
      {!data.profileExists && <p className="text-sm">Save your profile above before choosing a showcase.</p>}
      {!verified && <p className="text-sm">Verify your email before saving a showcase.</p>}
      {data.hiddenSelectionCount > 0 && <p className="text-sm">{data.hiddenSelectionCount} saved badge selection(s) no longer qualify and are hidden. They can return if eligibility returns. Saving replaces those selections.</p>}
      <fieldset disabled={saving || !verified || !data.profileExists} className="space-y-3">
        <legend className="sr-only">Select up to two earned achievements</legend>
        {achievementDefinitions.map(definition => {
          const eligible = achievementEligible(definition.id, data.progress), count = data.progress[definition.category];
          const checked = selected.includes(definition.id);
          return <div key={definition.id} className="flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-xl border p-4">
            <div className="min-w-0 space-y-2"><AchievementBadge id={definition.id} /><p className="text-xs leading-5 text-muted-foreground">{definition.description}</p><p className="text-xs">{count === null ? "Progress unavailable" : `${eligible ? "Earned" : "Locked"} · ${Math.min(count, definition.threshold)}/${definition.threshold}`}</p></div>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" aria-label={`Show ${definition.name}`} checked={checked} disabled={!eligible || (!checked && selected.length >= 2)} onChange={e => choose(e.target.checked ? [...selected, definition.id] : selected.filter(id => id !== definition.id))} className="size-4 accent-[hsl(var(--foreground))]" />Show{checked && <span className="text-xs">({selected.indexOf(definition.id) + 1})</span>}</label>
          </div>;
        })}
        {data.medals?.map(medal=><div key={medal.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><MedalBadge medal={medal}/><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" aria-label={`Show ${medal.competition} ${medal.award} ${medal.year}`} checked={selected.includes(medal.id)} disabled={!selected.includes(medal.id)&&selected.length>=2} onChange={e=>choose(e.target.checked?[...selected,medal.id]:selected.filter(id=>id!==medal.id))}/>Show{selected.includes(medal.id)&&` (${selected.indexOf(medal.id)+1})`}</label></div>)}
      </fieldset>
      <div className="space-y-3 rounded-xl border bg-muted/20 p-4"><h3 className="text-sm font-medium">Showcase preview</h3>{selected.length ? <AchievementShowcase ids={selected} medals={data.medals} /> : <p className="text-sm text-muted-foreground">No badges selected.</p>}{selected.length === 2 && <Button variant="outline" size="sm" disabled={saving} onClick={() => choose([...selected].reverse())}>Swap badge order</Button>}</div>
      <Button disabled={saving || !verified || !data.profileExists} onClick={save}>{saving ? "Saving showcase…" : "Save showcase"}</Button>
    </>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {success && <p role="status" className="text-sm">{success}</p>}
    {!loading && <Button variant="outline" disabled={saving} onClick={() => setReload(n => n + 1)}>Reload achievements</Button>}
  </section>;
}
