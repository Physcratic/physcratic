"use client";

import { useState } from "react";

/**
 * The booking button. The form itself is Tally's, so this only controls how it opens: in a new tab, with the same
 * link a middle-click would use. If the tab cannot open (a blocked pop-up, or no connection), the button is replaced by
 * a plain message and a real link, which opens the form on the next tap. The page never shows a dead button.
 */
export function BookingButton({ href, label, onOpen, className = "coaching-button", id, describedBy }: {
  href: string; label: string; onOpen?: () => void; className?: string; id?: string; describedBy?: string;
}) {
  const [failed, setFailed] = useState(false);
  const open = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onOpen?.();
    // A modified click (new tab, new window) is the browser's own job.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    // No "noopener" here: window.open returns null when the browser blocks the tab, and that is how a failure is seen.
    const tab = offline ? null : window.open(href, "_blank");
    if (!tab) { setFailed(true); return; }
    try { tab.opener = null; } catch { /* The tab is already open. Nothing to undo. */ }
  };
  if (failed) {
    return <div role="alert" className="flex flex-col items-start gap-3">
      <p className="text-base font-semibold leading-snug">The booking form didn&apos;t load. Open it in a new tab.</p>
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={onOpen}>Open the booking form in a new tab</a>
    </div>;
  }
  return <a id={id} href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={open} onAuxClick={(event) => { if (event.button === 1) onOpen?.(); }} aria-describedby={describedBy}>{label}</a>;
}
