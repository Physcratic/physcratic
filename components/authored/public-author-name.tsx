"use client";
import React, { useEffect, useState } from "react";
import { authoredAttributionSchema } from "@/lib/authored-attribution-contracts";
const freshnessMs = 15_000;
/** Mutable public consent is never embedded in the immutable revision or a shared cache. */
export function PublicAuthorName({ problemId, revisionId }: { problemId: string; revisionId: string }) {
  const [author, setAuthor] = useState<{problemId: string; revisionId: string; name: string; expiresAt: number} | null>(null);
  useEffect(() => {
    let alive = true, serial = 0, controller: AbortController | undefined, expiry: ReturnType<typeof setTimeout> | undefined;
    const clear = () => { if (alive) setAuthor(null); if (expiry) clearTimeout(expiry); };
    const stop = () => { serial++; controller?.abort(); clear(); };
    const refresh = async () => {
      stop();
      if (document.visibilityState !== "visible" || !document.hasFocus()) return;
      const current = serial, started = Date.now();
      controller = new AbortController();
      try {
        const response = await fetch(`/api/authored-problems/${problemId}/attribution?revisionId=${revisionId}`, { cache: "no-store", credentials: "same-origin", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]) });
        if (!response.ok) throw Error("unavailable");
        const body = authoredAttributionSchema.parse(await response.json());
        if (!alive || current !== serial || body.problemId !== problemId || body.revisionId !== revisionId || document.visibilityState !== "visible" || !document.hasFocus()) return;
        const remaining = freshnessMs - (Date.now() - started);
        if (remaining <= 0) return;
        setAuthor(body.author?.displayName.trim() ? { problemId, revisionId, name: body.author.displayName.trim(), expiresAt: started + freshnessMs } : null);
        expiry = setTimeout(clear, remaining);
      } catch { if (alive && current === serial) clear(); }
    };
    void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); else stop(); };
    window.addEventListener("focus", refresh); window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", visible);
    const interval = setInterval(refresh, freshnessMs);
    return () => { alive = false; stop(); clearInterval(interval); window.removeEventListener("focus", refresh); window.removeEventListener("blur", stop); document.removeEventListener("visibilitychange", visible); };
  }, [problemId, revisionId]);
  const name = author?.problemId === problemId && author.revisionId === revisionId && author.expiresAt > Date.now() ? author.name : null;
  return name ? <p className="min-h-6 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">Published by {name}</p> : null;
}
