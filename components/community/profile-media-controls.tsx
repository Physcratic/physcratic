"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mediaResponse, profileRequest, ProfileRequestError } from "@/lib/community/profile-client";
import { emptyProfileMedia, profileMediaPolicy, profileMediaKinds, type ProfileMediaSet, type ProfileMediaKind } from "@/lib/community/profile-media-contracts";

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

export function ProfileMediaControls({ enabled, saved, verified, onChange }: {
  enabled: boolean; saved: boolean; verified: boolean; onChange: (media: ProfileMediaSet) => void;
}) {
  const [images, setImages] = useState(emptyProfileMedia), [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const alive = useRef(true), abort = useRef<AbortController | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; abort.current?.abort(); }; }, []);
  useEffect(() => {
    if (!enabled || !saved) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    profileRequest("/api/community/profile-media", { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      const result = mediaResponse.parse(data); setImages(result.media); setPending(result.cleanupPending ?? false); onChange(result.media); setError("");
    }).catch(() => { if (!controller.signal.aborted) setError("Profile images could not be loaded. You can still edit your profile details."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled, saved, onChange]);
  async function change(kind?: ProfileMediaKind, file?: File, cleanup = false) {
    if (busy) return false;
    setBusy(true); setError(""); setSuccess("");
    const controller = new AbortController(); abort.current = controller;
    try {
      const data = await profileRequest(`/api/community/profile-media/${cleanup ? "cleanup" : kind}`, {
        method: cleanup ? "POST" : file ? "PUT" : "DELETE", body: file,
        headers: file ? { "Content-Type": file.type || "application/octet-stream" } : undefined,
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
      });
      if (!alive.current) return false;
      const result = mediaResponse.parse(data); setImages(result.media); onChange(result.media); setPending(result.cleanupPending ?? false);
      setSuccess(cleanup ? "Image cleanup checked." : file ? "Profile image saved." : "Profile image removed."); return true;
    } catch (e) { if (alive.current) setError(e instanceof ProfileRequestError
      ? e.status === 409 ? "The image changed while saving. Reload profile images before trying again." : e.message
      : "Image change could not be completed. Reload your profile images before trying again."); return false; }
    finally { if (alive.current) setBusy(false); }
  }
  return <section id="image-settings" aria-labelledby="image-heading" className="scroll-mt-6 space-y-5 rounded-2xl border bg-card p-5 sm:p-7">
    <header className="space-y-1"><h2 id="image-heading" className="text-lg font-semibold">Profile customization</h2><p className="text-sm leading-6 text-muted-foreground">Add a picture and banner. Both follow your profile visibility.</p></header>
    {!enabled ? <p className="rounded-xl bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">Profile images are not available yet. You can save profile details without images.</p>
      : !saved ? <p className="text-sm text-muted-foreground">Save your profile before adding images.</p>
      : !verified ? <p className="text-sm text-muted-foreground">Verify your email before changing profile images.</p>
      : <>
        {loading ? <p role="status" className="text-sm">Loading profile images…</p> : <div className="grid gap-4 sm:grid-cols-2">{profileMediaKinds.map(kind => <ImageUpload key={kind} kind={kind} exists={Boolean(images[kind])} busy={busy} onUpload={change} onRemove={kind => void change(kind)} />)}</div>}
        {busy && <p role="status" className="text-sm text-muted-foreground">Saving image change…</p>}
        {error && <div role="alert" className="space-y-2 rounded-xl border border-destructive/50 p-4 text-sm"><p>{error}</p><Button size="sm" variant="outline" disabled={busy} onClick={async () => {
          setError(""); try { const data = mediaResponse.parse(await profileRequest("/api/community/profile-media")); setImages(data.media); onChange(data.media); setPending(data.cleanupPending ?? false); } catch { setError("Profile images are still unavailable. Try again later."); }
        }}>Reload profile images</Button></div>}
        {success && <p role="status" className="text-sm">{success}</p>}
        {pending && <div className="space-y-2 text-xs leading-5 text-muted-foreground"><p>An older image is awaiting cleanup. Interrupted uploads wait an hour before removal.</p><Button size="sm" variant="outline" disabled={busy} onClick={() => void change(undefined, undefined, true)}>Clean up old images</Button></div>}
      </>}
  </section>;
}
