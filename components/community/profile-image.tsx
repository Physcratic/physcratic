"use client";
import React, { useState } from "react";
import Image from "next/image";
import { UserRound } from "lucide-react";

// Application image URLs must bypass the Next image cache so privacy changes revoke reads.
export function ProfileImage({ src, avatar = false }: { src: string; avatar?: boolean }) {
  const [failed, setFailed] = useState<string>();
  if (failed === src) return avatar ? <UserRound aria-hidden="true" className="size-9 text-muted-foreground" /> : null;
  return <Image src={src} alt={avatar ? "Profile picture" : ""} fill unoptimized
    sizes={avatar ? "96px" : "(max-width: 768px) 100vw, 768px"} className="object-cover" onError={() => setFailed(src)} />;
}
