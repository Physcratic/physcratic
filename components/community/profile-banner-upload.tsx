"use client";

import React, { useRef, useState } from "react";
import { AlertCircle, ImageIcon, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { profileMediaPolicy, type ProfileMediaSet } from "@/lib/community/profile-media-contracts";
import type { ProfilePictureCrop } from "@/lib/community/profile-picture-crop";
import { ProfileImage } from "./profile-image";
import { ProfileImageCropEditor } from "./profile-image-crop-editor";

export function ProfileBannerUpload({ media, busy, onUpload, onRemove }: {
  media: ProfileMediaSet["banner"]; busy: boolean;
  onUpload: (file: File, crop: ProfilePictureCrop) => Promise<boolean>; onRemove: () => void;
}) {
  const [selection, setSelection] = useState<{ file: File; id: number } | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const version = useRef(0);
  function cancel() { setSelection(null); setError(""); if (input.current) input.current.value = ""; }
  return <section aria-labelledby="banner-label" className="flex min-w-0 flex-col gap-4 rounded-xl border p-4">
    <header className="flex flex-col gap-1">
      <h3 id="banner-label" className="text-base font-medium">Banner image</h3>
      <p className="text-sm text-muted-foreground">{media ? "Your saved banner" : "No banner uploaded"}</p>
    </header>
    <div role="img" aria-label={media ? "Saved profile banner" : "No profile banner"} className="relative flex aspect-[4/1] w-full items-center justify-center overflow-hidden rounded-lg border bg-muted">
      {media ? <ProfileImage src={media.url} /> : <ImageIcon aria-hidden="true" className="size-6 text-muted-foreground" />}
    </div>
    <fieldset disabled={busy} className="flex min-w-0 flex-col gap-2">
      <legend className="sr-only">Choose profile banner</legend>
      <label htmlFor="banner-file" className="text-sm font-medium">{media ? "Choose a replacement banner" : "Choose a banner"}</label>
      <Input ref={input} id="banner-file" type="file" accept="image/png,image/jpeg,image/webp" aria-describedby="banner-help" aria-invalid={Boolean(error)} className="h-auto min-h-11 max-w-full py-2 text-sm file:mr-2 file:text-sm" onChange={event => {
        const file = event.target.files?.[0];
        setError(""); setSelection(null);
        if (!file) return;
        if (file.size > profileMediaPolicy.banner.inputBytes || file.size === 0) {
          event.target.value = ""; setError("Choose a nonempty image up to 5 MB."); return;
        }
        setSelection({ file, id: ++version.current });
      }} />
      <p id="banner-help" className="text-sm leading-6 text-muted-foreground">Single-frame PNG, JPEG or WebP, up to 5 MB. Adjust the wide crop before saving at 1600 × 400 pixels.</p>
    </fieldset>
    {error && <Alert variant="destructive"><AlertCircle aria-hidden="true" /><AlertDescription>{error}</AlertDescription></Alert>}
    {selection && <ProfileImageCropEditor key={selection.id} kind="banner" file={selection.file} busy={busy} onUpload={onUpload} onCancel={cancel} />}
    {media && !selection && <div><Button type="button" variant="outline" disabled={busy} onClick={onRemove}><Trash2 aria-hidden="true" data-icon="inline-start" />Remove banner</Button></div>}
  </section>;
}
