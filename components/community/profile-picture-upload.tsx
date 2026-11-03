"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, RotateCcw, Trash2, Upload, UserRound } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProfileImage } from "./profile-image";
import { profileMediaPolicy, type ProfileMediaSet } from "@/lib/community/profile-media-contracts";
import { defaultProfilePictureCrop, isSupportedProfileImage, profilePictureCropBounds, type ProfilePictureCrop } from "@/lib/community/profile-picture-crop";

function PictureCropEditor({ file, busy, onUpload, onCancel }: {
  file: File; busy: boolean; onUpload: (file: File, crop: ProfilePictureCrop) => Promise<boolean>; onCancel: () => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState(defaultProfilePictureCrop);
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    const picture = new window.Image();
    picture.crossOrigin = "anonymous";
    let url: string | undefined;
    async function load() {
      try {
        const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
        if (!active) return;
        if (!isSupportedProfileImage(bytes)) throw new Error("Unsupported image");
        url = URL.createObjectURL(file);
        picture.src = url;
        await picture.decode();
        profilePictureCropBounds(picture.naturalWidth, picture.naturalHeight, defaultProfilePictureCrop);
        if (active) setImage(picture);
      } catch {
        if (active) setError("Choose a valid PNG, JPEG or WebP image. Use 32 to 8192 pixels per side and no more than 20 megapixels.");
      }
    }
    void load();
    return () => { active = false; picture.src = ""; if (url) URL.revokeObjectURL(url); };
  }, [file]);
  useEffect(() => {
    if (!image || !canvas.current) return;
    const context = canvas.current.getContext("2d");
    if (!context) { setError("Image preview is unavailable in this browser. Choose another browser to adjust your picture."); return; }
    const bounds = profilePictureCropBounds(image.naturalWidth, image.naturalHeight, crop);
    context.clearRect(0, 0, 512, 512);
    context.drawImage(image, bounds.left, bounds.top, bounds.width, bounds.height, 0, 0, 512, 512);
  }, [image, crop]);

  return <div className="flex flex-col gap-4">
    {error ? <Alert variant="destructive"><AlertCircle aria-hidden="true" /><AlertDescription>{error}</AlertDescription></Alert>
      : !image ? <p role="status" className="text-sm text-muted-foreground">Preparing picture preview…</p>
      : <>
        <figure className="flex flex-col items-center gap-2">
          <canvas ref={canvas} width={512} height={512} role="img" aria-label="Profile picture crop preview" className="size-56 max-w-full rounded-full border bg-muted" />
          <figcaption className="max-w-full break-words text-center text-sm text-muted-foreground [overflow-wrap:anywhere]">{file.name}</figcaption>
        </figure>
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3">
          <legend className="sr-only">Adjust profile picture crop</legend>
          {([
            ["zoom", "Zoom", 1, 3, 0.1],
            ["horizontal", "Horizontal position", 0, 100, 1],
            ["vertical", "Vertical position", 0, 100, 1],
          ] as const).map(([key, label, min, max, step]) => <label key={key} htmlFor={`avatar-crop-${key}`} className="flex flex-col gap-1 text-sm">
            <span className="flex items-center justify-between gap-2"><span>{label}</span><output htmlFor={`avatar-crop-${key}`} className="tabular-nums text-muted-foreground">{crop[key]}{key === "zoom" ? "×" : "%"}</output></span>
            <input id={`avatar-crop-${key}`} type="range" min={min} max={max} step={step} value={crop[key]} onChange={event => setCrop(previous => ({ ...previous, [key]: Number(event.target.value) }))} className="h-11 w-full cursor-pointer accent-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed" />
          </label>)}
        </fieldset>
        <p className="text-sm leading-6 text-muted-foreground">Only this crop is saved. Your current picture stays until you save.</p>
      </>}
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={busy || !image || Boolean(error)} onClick={async () => { if (await onUpload(file, crop)) onCancel(); }}><Upload aria-hidden="true" data-icon="inline-start" />Save picture</Button>
      {image && <Button type="button" variant="outline" disabled={busy} onClick={() => setCrop(defaultProfilePictureCrop)}><RotateCcw aria-hidden="true" data-icon="inline-start" />Reset crop</Button>}
      <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>Cancel selection</Button>
    </div>
  </div>;
}

export function ProfilePictureUpload({ media, busy, onUpload, onRemove }: {
  media: ProfileMediaSet["avatar"]; busy: boolean;
  onUpload: (file: File, crop: ProfilePictureCrop) => Promise<boolean>; onRemove: () => void;
}) {
  const [selection, setSelection] = useState<{ file: File; id: number } | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const version = useRef(0);
  function cancel() { setSelection(null); setError(""); if (input.current) input.current.value = ""; }
  return <section aria-labelledby="avatar-label" className="flex min-w-0 flex-col gap-4 rounded-xl border p-4">
    <header className="flex items-center gap-3">
      <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
        {media ? <ProfileImage src={media.url} avatar /> : <UserRound aria-hidden="true" className="size-6 text-muted-foreground" />}
      </div>
      <div className="flex min-w-0 flex-col gap-1"><h3 id="avatar-label" className="text-base font-medium">Profile picture</h3><p className="text-sm text-muted-foreground">{media ? "Your saved picture" : "No picture uploaded"}</p></div>
    </header>
    <fieldset disabled={busy} className="flex min-w-0 flex-col gap-2">
      <legend className="sr-only">Choose profile picture</legend>
      <label htmlFor="avatar-file" className="text-sm font-medium">{media ? "Choose a replacement" : "Choose a picture"}</label>
      <Input ref={input} id="avatar-file" type="file" accept="image/png,image/jpeg,image/webp" aria-describedby="avatar-help" aria-invalid={Boolean(error)} className="h-auto min-h-11 max-w-full py-2 text-sm file:mr-2 file:text-sm" onChange={event => {
        const file = event.target.files?.[0];
        setError(""); setSelection(null);
        if (!file) return;
        if (file.size > profileMediaPolicy.avatar.inputBytes || file.size === 0) {
          event.target.value = ""; setError("Choose a nonempty image up to 2 MB."); return;
        }
        setSelection({ file, id: ++version.current });
      }} />
      <p id="avatar-help" className="text-sm leading-6 text-muted-foreground">Single-frame PNG, JPEG or WebP, up to 2 MB. Adjust the crop before saving at 512 × 512 pixels.</p>
    </fieldset>
    {error && <Alert variant="destructive"><AlertCircle aria-hidden="true" /><AlertDescription>{error}</AlertDescription></Alert>}
    {selection && <PictureCropEditor key={selection.id} file={selection.file} busy={busy} onUpload={onUpload} onCancel={cancel} />}
    {media && !selection && <div><Button type="button" variant="outline" disabled={busy} onClick={onRemove}><Trash2 aria-hidden="true" data-icon="inline-start" />Remove picture</Button></div>}
  </section>;
}
