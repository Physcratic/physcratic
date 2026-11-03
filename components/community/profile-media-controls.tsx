"use client";
import React, { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mediaResponse, profileRequest, ProfileRequestError } from "@/lib/community/profile-client";
import { emptyProfileMedia, type ProfileMediaSet, type ProfileMediaKind } from "@/lib/community/profile-media-contracts";
import useSWR from "swr";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProfilePictureUpload } from "./profile-picture-upload";
import { ProfileBannerUpload } from "./profile-banner-upload";
import type { ProfilePictureCrop } from "@/lib/community/profile-picture-crop";

export function ProfileMediaControls({ ownerId, enabled, saved, verified, onChange }: {
  ownerId: string; enabled: boolean; saved: boolean; verified: boolean; onChange: (media: ProfileMediaSet) => void;
}) {
  const { data, error: loadError, isLoading, isValidating, mutate } = useSWR(
    enabled && saved ? ["/api/community/profile-media", ownerId] : null,
    async ([path]: [string, string]) => mediaResponse.parse(await profileRequest(path)),
    { shouldRetryOnError: false, revalidateOnFocus: false },
  );
  const images = data?.media ?? emptyProfileMedia;
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState(""), [success, setSuccess] = useState("");
  const alive = useRef(true), saving = useRef(false), abort = useRef<AbortController | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; abort.current?.abort(); }; }, []);
  useEffect(() => { onChange(data?.media ?? emptyProfileMedia); }, [data, onChange]);
  async function change(kind?: ProfileMediaKind, file?: File, cleanup = false, crop?: ProfilePictureCrop) {
    if (saving.current || uncertain || loadError || !data) return false;
    saving.current = true;
    setBusy(true); setError(""); setSuccess("");
    const controller = new AbortController(); abort.current = controller;
    try {
      const response = await profileRequest(`/api/community/profile-media/${cleanup ? "cleanup" : kind}`, {
        method: cleanup ? "POST" : file ? "PUT" : "DELETE", body: file,
        headers: file ? { "Content-Type": file.type || "application/octet-stream", ...(crop ? { [kind === "avatar" ? "X-Profile-Picture-Crop" : "X-Profile-Banner-Crop"]: JSON.stringify(crop) } : {}) } : undefined,
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
      });
      if (!alive.current) return false;
      const result = mediaResponse.parse(response);
      await mutate(result, { revalidate: false });
      if (!alive.current) return false;
      setSuccess(cleanup ? "Image cleanup checked." : file ? "Profile image saved." : "Profile image removed."); return true;
    } catch (e) {
      if (alive.current) {
        setUncertain(!(e instanceof ProfileRequestError) || e.status === 409 || e.status >= 500);
        setError(e instanceof ProfileRequestError
          ? e.status === 409 ? "The image changed while saving. Reload profile images before trying again." : e.message
          : "Image change could not be completed. Reload your profile images before trying again.");
      }
      return false;
    } finally { saving.current = false; if (alive.current) setBusy(false); }
  }
  const unavailable = busy || uncertain || Boolean(loadError) || isValidating;
  return <section id="image-settings" aria-labelledby="image-heading" aria-busy={busy || isLoading} className="flex scroll-mt-6 flex-col gap-5 rounded-2xl border bg-card p-5 sm:p-7">
    <header className="flex flex-col gap-1"><h2 id="image-heading" className="text-lg font-semibold">Profile customization</h2><p className="text-sm leading-6 text-muted-foreground">Add a picture and banner. Both follow your profile visibility.</p></header>
    {!enabled ? <p className="rounded-xl bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">Profile images are not available yet. You can save profile details without images.</p>
      : !saved ? <p className="text-sm text-muted-foreground">Save your profile before adding images.</p>
      : !verified ? <p className="text-sm text-muted-foreground">Verify your email before changing profile images.</p>
      : <>
        {isLoading ? <p role="status" className="text-sm">Loading profile images…</p> : data && <div className="grid items-start gap-4 sm:grid-cols-2">
          <ProfilePictureUpload media={images.avatar} busy={unavailable} onUpload={(file, crop) => change("avatar", file, false, crop)} onRemove={() => void change("avatar")} />
          <ProfileBannerUpload media={images.banner} busy={unavailable} onUpload={(file, crop) => change("banner", file, false, crop)} onRemove={() => void change("banner")} />
        </div>}
        {busy && <p role="status" className="text-sm text-muted-foreground">Saving image change…</p>}
        {(error || loadError) && <Alert variant="destructive"><AlertCircle aria-hidden="true" /><AlertDescription className="flex flex-col gap-3">
          <p>{error || "Profile images could not be loaded. You can still edit your profile details."}</p>
          {uncertain && <p>Reload to check the saved images before making another change.</p>}
          <div><Button type="button" size="sm" variant="outline" disabled={busy || isValidating} onClick={async () => {
            setError(""); setSuccess("");
            try { await mutate(); if (alive.current) setUncertain(false); }
            catch { if (alive.current) setError("Profile images are still unavailable. Try again later."); }
          }}>{isValidating ? "Reloading…" : "Reload profile images"}</Button></div>
        </AlertDescription></Alert>}
        {success && <p role="status" className="text-sm">{success}</p>}
        {data?.cleanupPending && <div className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground"><p>An older image is awaiting cleanup. Interrupted uploads wait an hour before removal.</p><div><Button type="button" size="sm" variant="outline" disabled={unavailable} onClick={() => void change(undefined, undefined, true)}>Clean up old images</Button></div></div>}
      </>}
  </section>;
}
