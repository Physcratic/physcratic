"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Upload, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mediaResponse, profileRequest, ProfileRequestError } from "@/lib/community/profile-client";
import { emptyProfileMedia, profileMediaPolicy, type ProfileMediaSet, type ProfileMediaKind } from "@/lib/community/profile-media-contracts";
import useSWR from "swr";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProfilePictureUpload } from "./profile-picture-upload";
import type { ProfilePictureCrop } from "@/lib/community/profile-picture-crop";

function ImageUpload({ kind, exists, busy, onUpload, onRemove }: {
  kind: ProfileMediaKind; exists: boolean; busy: boolean;
  onUpload: (kind: ProfileMediaKind, file: File) => Promise<boolean>; onRemove: (kind: ProfileMediaKind) => void;
}) {
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const label = kind === "avatar" ? "Profile picture" : "Banner image";
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <div className="min-w-0 space-y-3 rounded-xl border p-4">
    <label htmlFor={`${kind}-file`} className="block text-sm font-medium">{label}</label>
    <p id={`${kind}-help`} className="text-xs leading-5 text-muted-foreground">PNG, JPEG or WebP. Up to {kind === "avatar" ? "2" : "5"} MB. Saved as {profileMediaPolicy[kind].width} × {profileMediaPolicy[kind].height} pixels.</p>
    <Input ref={input} id={`${kind}-file`} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} aria-describedby={`${kind}-help`} className="h-auto min-h-11 max-w-full py-2 text-xs file:mr-2 file:text-xs" onChange={event => {
      const selected = event.target.files?.[0] ?? null;
      setError("");
      if (selected && selected.size > profileMediaPolicy[kind].inputBytes) { setFile(null); event.target.value = ""; setError("This image is too large. Choose a smaller file."); return; }
      setFile(selected);
    }} />
    {preview && <div className={`relative overflow-hidden rounded-lg border ${kind === "avatar" ? "size-20" : "aspect-[4/1] w-full"}`}><Image src={preview} alt={`Selected ${kind} preview`} fill unoptimized className="object-cover" sizes="320px" /></div>}
    <div className="flex flex-wrap gap-2">
      {file && <Button size="sm" disabled={busy} onClick={async () => { if (await onUpload(kind, file)) { setFile(null); if (input.current) input.current.value = ""; } }}><Upload aria-hidden="true" className="size-4" />{exists ? "Replace" : "Upload"} {kind === "avatar" ? "picture" : "banner"}</Button>}
      {file && <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setFile(null); if (input.current) input.current.value = ""; }}>Cancel selection</Button>}
      {exists && <Button size="sm" variant="outline" disabled={busy} onClick={() => onRemove(kind)}><Trash2 aria-hidden="true" className="size-4" />Remove {kind === "avatar" ? "picture" : "banner"}</Button>}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}

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
        headers: file ? { "Content-Type": file.type || "application/octet-stream", ...(crop ? { "X-Profile-Picture-Crop": JSON.stringify(crop) } : {}) } : undefined,
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
          <ImageUpload kind="banner" exists={Boolean(images.banner)} busy={unavailable} onUpload={change} onRemove={kind => void change(kind)} />
        </div>}
        {busy && <p role="status" className="text-sm text-muted-foreground">Saving image change…</p>}
        {(error || loadError) && <Alert variant="destructive"><AlertCircle aria-hidden="true" /><AlertDescription className="flex flex-col gap-3">
          <p>{error || "Profile images could not be loaded. You can still edit your profile details."}</p>
          {uncertain && <p>Reload to check the saved picture before making another change.</p>}
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
