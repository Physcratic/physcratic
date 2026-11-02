"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ProblemImage({ src, alt, className, width, height, enlargeHref, enlargeLabel }: {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  enlargeHref?: string;
  enlargeLabel?: string;
}) {
  const [result, setResult] = useState<{ src: string; status: "loaded" | "error" }>();
  const [retry, setRetry] = useState(0);
  const status = result?.src === src ? result.status : "loading";

  const image = <Image
    key={`${src}-${retry}`}
    src={retry ? `${src}${src.includes("?") ? "&" : "?"}retry=${retry}` : src}
    alt={alt}
    width={width ?? 0}
    height={height ?? 0}
    unoptimized={!width || !height}
    sizes="(max-width: 768px) 100vw, 900px"
    style={!width || !height ? { width: "auto", height: "auto" } : undefined}
    loading="lazy"
    decoding="async"
    onLoad={() => setResult({ src, status: "loaded" })}
    onError={() => setResult({ src, status: "error" })}
    className={cn(className, status !== "loaded" && "invisible h-0")}
  />;

  return (
    <span className="inline-grid w-full min-w-0 justify-items-center [&>*]:col-start-1 [&>*]:row-start-1" aria-busy={status === "loading"}>
      {status !== "loaded" && (
        <span role="status" className="relative flex min-h-48 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-border bg-muted p-6 text-center text-muted-foreground">
          {status === "loading" && <Skeleton className="absolute inset-0 size-full" aria-hidden="true" />}
          <ImageIcon className="relative size-6" aria-hidden="true" />
          <span className="relative text-sm">{status === "error" ? "This diagram could not be loaded." : "Loading problem diagram…"}</span>
          {status === "error" && <button type="button" className="rounded text-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setResult(undefined); setRetry((value) => value + 1); }}>Retry image</button>}
        </span>
      )}
      {enlargeHref ? <a href={enlargeHref} target="_blank" rel="noopener noreferrer" aria-label={enlargeLabel} className={cn("w-full", status !== "loaded" && "invisible h-0")}>{image}</a> : image}
    </span>
  );
}
