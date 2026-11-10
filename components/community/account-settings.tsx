"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, KeyRound, LockKeyhole, Palette, UserRound, Image as ImageIcon, Eye, Check, CircleHelp } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { physicsTopics } from "@/lib/physics-taxonomy";
import { profilePatchSchema, profileEducationLevels } from "@/lib/community/profile-contracts";
import { educationLabels, ownProfileResponse, profileRequest, ProfileRequestError, dismissProfileSetup, type OwnProfile, type PublicProfile } from "@/lib/community/profile-client";
import { emptyProfileMedia } from "@/lib/community/profile-media-contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SkipLink } from "@/components/skip-link";
import { AppearanceSettings } from "./appearance-settings";
import { ReplayTours } from "@/components/tour/tour-help";
import { ProfileCard } from "./profile-card";
import { ProfileMediaControls } from "./profile-media-controls";
import { VerificationSettings } from "./verification-settings";
import { AchievementSettings } from "./achievement-settings";
import type { BadgeId, PublicMedal } from "@/lib/community/achievements";

import {ModerationHistory} from "./moderation-history";
import { AccountSecurity } from "@/components/account/account-security";

type Form = PublicProfile & { publicVisibility: boolean };
const initialForm: Form = { handle: "", displayName: "", bio: "", educationLevel: "prefer-not-to-say", favoriteTopicIds: [], publicVisibility: false };
// Accounts without a community profile start from their sign-up name. It only becomes the display name once saved here.
function fromProfile(profile: OwnProfile | null, fallbackName = ""): Form {
  if (!profile) return { ...initialForm, displayName: [...fallbackName.trim()].slice(0, 80).join("") };
  const { handle, displayName, bio, educationLevel, favoriteTopicIds, publicVisibility } = profile;
  return { handle, displayName, bio, educationLevel, favoriteTopicIds, publicVisibility };
}

function ProfileEditor({ userId, fallbackName, verified, mediaEnabled, achievementsEnabled, onboarding }: {
  userId: string; fallbackName: string; verified: boolean; mediaEnabled: boolean; achievementsEnabled: boolean; onboarding: boolean;
}) {
  const [form, setForm] = useState(initialForm), [saved, setSaved] = useState<OwnProfile | null>(null);
  const [loading, setLoading] = useState(true), [loadFailed, setLoadFailed] = useState(false), [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const [images, setImages] = useState(emptyProfileMedia);
  const [medals, setMedals] = useState<PublicMedal[]>([]);
  const [badgeIds, setBadgeIds] = useState<BadgeId[]>([]);
  const alive = useRef(true), saveController = useRef<AbortController | null>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(fromProfile(saved, fallbackName));
  useEffect(() => { alive.current = true; return () => { alive.current = false; saveController.current?.abort(); }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadFailed(false); setError("");
    profileRequest("/api/community/profile", { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      const profile = ownProfileResponse.parse(data).profile;
      if (profile && profile.userId !== userId) throw new Error("Profile identity mismatch");
      setSaved(profile); setForm(fromProfile(profile, fallbackName));
    }).catch(() => { if (!controller.signal.aborted) { setLoadFailed(true); setError("Your profile could not be loaded. Appearance settings are still available."); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload, userId, fallbackName]);
  useEffect(() => {
    if (!dirty || loading) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, loading]);
  async function save(event: FormEvent) {
    event.preventDefault(); setError(""); setSuccess("");
    const parsed = profilePatchSchema.safeParse(form);
    if (!parsed.success) { setError("Check your username, name and biography limits. Choose only the listed topics."); return; }
    setSaving(true);
    const controller = new AbortController(); saveController.current = controller;
    try {
      const response = await profileRequest("/api/community/profile", { method: "PATCH",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
      if (!alive.current) return;
      const profile = ownProfileResponse.parse(response).profile;
      if (!profile || profile.userId !== userId) throw new Error("Profile response unavailable");
      setSaved(profile); setForm(fromProfile(profile)); setSuccess("Profile saved."); dismissProfileSetup(userId, "completed");
    } catch (e) { if (alive.current) setError(e instanceof ProfileRequestError ? e.message : "Your profile could not be saved. Reload to check your saved details before retrying."); }
    finally { if (alive.current) setSaving(false); }
  }
  if (loading) return <section id="profile-settings" className="rounded-2xl border bg-card p-7"><h2 className="text-lg font-semibold">Profile</h2><p role="status" className="mt-4 text-sm text-muted-foreground">Loading your profile…</p></section>;
  if (loadFailed) return <section id="profile-settings" className="space-y-4 rounded-2xl border bg-card p-7"><h2 className="text-lg font-semibold">Profile</h2><p role="alert" className="text-sm">{error}</p><Button variant="outline" onClick={() => setReload(n => n + 1)}>Retry profile</Button></section>;
  return <>
    <section id="profile-settings" aria-labelledby="profile-heading" className="scroll-mt-6 space-y-6">
      {onboarding && !saved && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4 text-sm"><p>Profile setup is optional. Share only what you choose.</p><Link href="/dashboard" onClick={() => dismissProfileSetup(userId)} className="rounded px-2 py-2 font-medium underline underline-offset-4">Skip for now</Link></div>}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <form onSubmit={save} className="min-w-0 space-y-6 rounded-2xl border bg-card p-5 sm:p-7">
          <header className="space-y-1"><h2 id="profile-heading" className="text-lg font-semibold">Profile</h2><p className="text-sm leading-6 text-muted-foreground">Choose your public identity and what others can see.</p></header>
          {!verified && <p className="rounded-lg border p-3 text-sm">Verify your email before saving a profile. Appearance settings are available now.</p>}
          <fieldset disabled={saving || !verified} className="min-w-0 space-y-5">
            <legend className="sr-only">Profile details</legend>
            <div className="space-y-2"><label htmlFor="profile-display-name" className="text-sm font-medium">Display name</label><Input id="profile-display-name" autoComplete="off" maxLength={160} value={form.displayName} placeholder="How you would like to appear" onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} aria-describedby="display-name-help" /><p id="display-name-help" className="text-xs leading-5 text-muted-foreground">The name other people see. Up to 80 characters.</p></div>
            <div className="space-y-2"><label htmlFor="profile-handle" className="flex items-center gap-2 text-sm font-medium">Permanent username {saved && <LockKeyhole aria-hidden="true" className="size-3.5" />}</label><Input id="profile-handle" required minLength={3} maxLength={24} pattern="[a-z0-9][a-z0-9_]{2,23}" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" value={form.handle} readOnly={Boolean(saved)} placeholder="e.g. orbital_mind" onChange={e => setForm(f => ({ ...f, handle: e.target.value.toLowerCase() }))} aria-describedby="handle-help" className="font-mono text-sm read-only:bg-muted/40" /><p id="handle-help" className="text-xs leading-5 text-muted-foreground">{saved ? "Your username is permanent. You can still edit your display name." : "Use 3 to 24 lowercase letters, numbers or underscores. Choose carefully. You cannot change this after your first save."}</p></div>
            <div className="space-y-2"><div className="flex items-center justify-between gap-3"><label htmlFor="profile-bio" className="text-sm font-medium">Biography</label><span className={`text-xs ${[...form.bio].length > 500 ? "text-destructive" : "text-muted-foreground"}`}>{[...form.bio].length}/500</span></div><Textarea id="profile-bio" value={form.bio} maxLength={1000} rows={4} className="resize-y" placeholder="A little about your interest in physics" onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} aria-describedby="bio-help" /><p id="bio-help" className="text-xs text-muted-foreground">Optional. Up to 500 characters.</p></div>
            <div className="space-y-2"><label htmlFor="profile-education" className="text-sm font-medium">Education level</label><select id="profile-education" value={form.educationLevel} onChange={e => setForm(f => ({ ...f, educationLevel: e.target.value as Form["educationLevel"] }))} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{profileEducationLevels.map(value => <option key={value} value={value}>{educationLabels[value]}</option>)}</select></div>
            <fieldset className="space-y-3"><legend className="text-sm font-medium">Favourite physics topics</legend><div className="grid gap-2 sm:grid-cols-2">{physicsTopics.map(topic => <label key={topic.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm"><input type="checkbox" className="size-4 shrink-0 accent-[hsl(var(--foreground))]" checked={form.favoriteTopicIds.includes(topic.id)} onChange={e => setForm(f => ({ ...f, favoriteTopicIds: e.target.checked ? [...f.favoriteTopicIds, topic.id] : f.favoriteTopicIds.filter(id => id !== topic.id) }))} />{topic.label}</label>)}</div></fieldset>
            <div className="rounded-xl border bg-muted/20 p-4"><label className="flex min-h-11 cursor-pointer items-start gap-3"><input type="checkbox" checked={form.publicVisibility} onChange={e => setForm(f => ({ ...f, publicVisibility: e.target.checked }))} aria-describedby="visibility-help" className="mt-0.5 size-5 shrink-0 accent-[hsl(var(--foreground))]" /><span className="text-sm font-medium">Make my profile public</span></label><p id="visibility-help" className="ml-8 mt-2 text-xs leading-5 text-muted-foreground">Anyone with your link can see your saved profile and images. Your public display name can also appear beside problems you publish. Profiles start private. Unchecking this hides them after you save. Open problem pages can keep a previously public name for up to 15 seconds. Copies already seen or saved cannot be recalled.</p></div>
          </fieldset>
          {error && <p role="alert" className="rounded-lg border border-destructive/50 p-3 text-sm text-destructive">{error}</p>}
          {success && <p role="status" className="flex items-center gap-2 text-sm"><Check aria-hidden="true" className="size-4" />{success}</p>}
          <div className="flex flex-wrap items-center gap-3 border-t pt-5"><Button type="submit" disabled={saving || !verified}>{saving ? "Saving…" : saved ? "Save changes" : "Create profile"}</Button>{dirty && <Button type="button" variant="ghost" disabled={saving} onClick={() => { setForm(fromProfile(saved, fallbackName)); setError(""); setSuccess(""); }}>Discard changes</Button>}{saved?.publicVisibility && <Link className="inline-flex items-center gap-2 rounded px-1 py-2 text-sm underline underline-offset-4" href={`/u/${saved.handle}`}><Eye aria-hidden="true" className="size-4" />View saved public profile</Link>}</div>
        </form>
        <section className="min-w-0 space-y-3 xl:sticky xl:top-6" aria-labelledby="preview-heading"><div className="flex items-center justify-between"><h2 id="preview-heading" className="text-sm font-medium">Live preview</h2><span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">{form.publicVisibility ? "Public after saving" : "Private"}</span></div><ProfileCard profile={form} media={images} badgeIds={badgeIds} medals={medals} compact headingLevel={3} /><p className="px-1 text-xs leading-5 text-muted-foreground">Details are a preview until you save. Uploaded images save separately.</p></section>
      </div>
    </section>
    {achievementsEnabled && <AchievementSettings profileSaved={Boolean(saved)} verified={verified} onPreviewChange={setBadgeIds} onMedalsChange={setMedals} />}
    <ProfileMediaControls ownerId={userId} enabled={mediaEnabled} saved={Boolean(saved)} verified={verified} onChange={setImages} />
  </>;
}

export function AccountSettings({ emailReady = true, moderationEnabled=false,profilesEnabled, mediaEnabled, achievementsEnabled = false, verificationEnabled = false, onboarding = false }: {
  emailReady?: boolean; moderationEnabled?:boolean;profilesEnabled: boolean; mediaEnabled: boolean; achievementsEnabled?: boolean; verificationEnabled?: boolean; onboarding?: boolean;
}) {
  const { data, isPending, error, refetch } = authClient.useSession();
  const user = data?.user;
  return <div className="min-h-dvh bg-background text-foreground">
    <SkipLink targetId="settings-main">Skip to settings</SkipLink>
    <header className="border-b"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8"><Link href="/dashboard" className="inline-flex min-h-11 items-center text-lg font-semibold tracking-tight">Physcratic</Link><Link href="/dashboard?view=problems" className="inline-flex min-h-11 items-center gap-2 rounded px-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft aria-hidden="true" className="size-4" />Back to Arena</Link></div></header>
    <main id="settings-main" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-8 focus:outline-none sm:px-8 sm:py-12"><div className="mb-8 space-y-2"><p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Your account</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Account Settings</h1><p className="text-sm leading-6 text-muted-foreground">Manage your profile, sign-in, privacy and appearance.</p></div>
      <div className="grid items-start gap-8 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10"><nav aria-label="Settings sections" className="flex flex-wrap gap-2 lg:sticky lg:top-6 lg:flex-col">{[...(moderationEnabled ? [["Reports and appeals", "#moderation-history", Check]] : []), ...(verificationEnabled && user ? [["Verification", "#verification-settings", Check]] : []), ["Profile", "#profile-settings", UserRound], ...(user ? [["Email and password", "#email-settings", KeyRound]] : []), ["Appearance", "#appearance-settings", Palette], ["Help and tours", "#tours-settings", CircleHelp], ...(profilesEnabled && user ? [["Images", "#image-settings", ImageIcon], ...(achievementsEnabled ? [["Achievements", "#achievement-settings", Check]] : [])] : [])].map(([label, href, Icon]) => {
        const SectionIcon = Icon as typeof UserRound;
        return <a key={label as string} href={href as string} className="flex min-h-11 items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm hover:border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><SectionIcon aria-hidden="true" className="size-4" />{label as string}</a>;
      })}</nav>
        <div className="min-w-0 space-y-8">
          {!profilesEnabled ? <section id="profile-settings" className="space-y-2 rounded-2xl border bg-card p-5 sm:p-7"><h2 className="text-lg font-semibold">Profile</h2><p className="text-sm leading-6 text-muted-foreground">Community profiles are not available yet. Your appearance settings and existing account features still work.</p>{user && <p className="text-sm">Display name: <span className="font-medium">{user.name}</span></p>}</section>
            : isPending ? <section id="profile-settings" className="rounded-2xl border p-7"><h2 className="text-lg font-semibold">Profile</h2><p role="status" className="mt-3 text-sm">Loading your account…</p></section>
            : error ? <section id="profile-settings" className="space-y-3 rounded-2xl border p-7"><h2 className="text-lg font-semibold">Profile</h2><p role="alert" className="text-sm">Your account could not be loaded.</p><Button variant="outline" onClick={() => refetch()}>Retry account</Button></section>
            : !user ? <section id="profile-settings" className="space-y-3 rounded-2xl border p-7"><h2 className="text-lg font-semibold">Profile</h2><p className="text-sm text-muted-foreground">Sign in to create or edit your profile.</p><Button asChild><Link href="/sign-in?returnTo=%2Fsettings">Sign in</Link></Button></section>
            : <ProfileEditor key={user.id} userId={user.id} fallbackName={user.name ?? ""} verified={user.emailVerified === true} mediaEnabled={mediaEnabled} achievementsEnabled={achievementsEnabled} onboarding={onboarding} />}
          {user && <AccountSecurity key={user.id} email={user.email} emailReady={emailReady} />}
          {verificationEnabled && user && <VerificationSettings key={user.id} verified={user.emailVerified === true} />}
          {moderationEnabled && <ModerationHistory/>}
          <AppearanceSettings />
          <ReplayTours />
        </div>
      </div>
    </main>
  </div>;
}
