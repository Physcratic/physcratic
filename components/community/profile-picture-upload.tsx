"use client";

import React, { useRef, useState } from "react";
import { AlertCircle, Trash2, UserRound } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProfileImage } from "./profile-image";
import { profileMediaPolicy, type ProfileMediaSet } from "@/lib/community/profile-media-contracts";
import type { ProfilePictureCrop } from "@/lib/community/profile-picture-crop";
import { ProfileImageCropEditor } from "./profile-image-crop-editor";

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
    {selection && <ProfileImageCropEditor key={selection.id} kind="avatar" file={selection.file} busy={busy} onUpload={onUpload} onCancel={cancel} />}
    {media && !selection && <div><Button type="button" variant="outline" disabled={busy} onClick={onRemove}><Trash2 aria-hidden="true" data-icon="inline-start" />Remove picture</Button></div>}
  </section>;
}
