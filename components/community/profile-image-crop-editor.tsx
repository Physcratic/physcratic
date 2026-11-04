"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, RotateCcw, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { profileMediaPolicy, type ProfileMediaKind } from "@/lib/community/profile-media-contracts";
import { defaultProfilePictureCrop, isSupportedProfileImage, profileImageCropBounds, type ProfilePictureCrop } from "@/lib/community/profile-picture-crop";
import { cn } from "@/lib/utils";

export function ProfileImageCropEditor({ kind, file, busy, onUpload, onCancel }: {
  kind: ProfileMediaKind; file: File; busy: boolean;
  onUpload: (file: File, crop: ProfilePictureCrop) => Promise<boolean>; onCancel: () => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState(defaultProfilePictureCrop);
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const label = kind === "avatar" ? "picture" : "banner";
  const { width, height } = profileMediaPolicy[kind];
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
        profileImageCropBounds(picture.naturalWidth, picture.naturalHeight, defaultProfilePictureCrop, kind);
        if (active) setImage(picture);
      } catch {
        if (active) setError("Choose a valid PNG, JPEG or WebP image. Use 32 to 8192 pixels per side and no more than 20 megapixels.");
      }
    }
    void load();
    return () => { active = false; picture.src = ""; if (url) URL.revokeObjectURL(url); };
  }, [file, kind]);
  useEffect(() => {
    if (!image || !canvas.current) return;
    const context = canvas.current.getContext("2d");
    if (!context) { setError("Image preview is unavailable in this browser. Choose another browser to adjust your image."); return; }
    const bounds = profileImageCropBounds(image.naturalWidth, image.naturalHeight, crop, kind);
    context.clearRect(0, 0, width, height);
    context.drawImage(image, bounds.left, bounds.top, bounds.width, bounds.height, 0, 0, width, height);
  }, [image, crop, kind, width, height]);

  return <div className="flex min-w-0 flex-col gap-4">
    {error ? <Alert variant="destructive"><AlertCircle aria-hidden="true" /><AlertDescription>{error}</AlertDescription></Alert>
      : !image ? <p role="status" className="text-sm text-muted-foreground">Preparing {label} preview…</p>
      : <>
        <figure className="flex min-w-0 flex-col items-center gap-2">
          <canvas ref={canvas} width={width} height={height} role="img" aria-label={kind === "avatar" ? "Profile picture crop preview" : "Banner crop preview"} className={cn("max-w-full border bg-muted", kind === "avatar" ? "size-56 rounded-full" : "aspect-[4/1] w-full rounded-lg")} />
          <figcaption className="max-w-full break-words text-center text-sm text-muted-foreground [overflow-wrap:anywhere]">{file.name}</figcaption>
        </figure>
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3">
          <legend className="sr-only">Adjust {kind === "avatar" ? "profile picture" : "banner"} crop</legend>
          {([
            ["zoom", "Zoom", 1, 3, 0.1],
            ["horizontal", "Horizontal position", 0, 100, 1],
            ["vertical", "Vertical position", 0, 100, 1],
          ] as const).map(([key, controlLabel, min, max, step]) => <label key={key} htmlFor={`${kind}-crop-${key}`} className="flex flex-col gap-1 text-sm">
            <span className="flex items-center justify-between gap-2"><span>{controlLabel}</span><output htmlFor={`${kind}-crop-${key}`} className="tabular-nums text-muted-foreground">{crop[key]}{key === "zoom" ? "×" : "%"}</output></span>
            <input id={`${kind}-crop-${key}`} type="range" min={min} max={max} step={step} value={crop[key]} onChange={event => setCrop(previous => ({ ...previous, [key]: Number(event.target.value) }))} className="h-11 w-full cursor-pointer accent-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed" />
          </label>)}
        </fieldset>
        <p className="text-sm leading-6 text-muted-foreground">Only this crop is saved. Your current {label} stays until you save.</p>
      </>}
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={busy || !image || Boolean(error)} onClick={async () => { if (await onUpload(file, crop)) onCancel(); }}><Upload aria-hidden="true" data-icon="inline-start" />Save {label}</Button>
      {image && <Button type="button" variant="outline" disabled={busy} onClick={() => setCrop(defaultProfilePictureCrop)}><RotateCcw aria-hidden="true" data-icon="inline-start" />Reset crop</Button>}
      <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>Cancel selection</Button>
    </div>
  </div>;
}
