"use client";

import * as React from "react";
import type { MouseEvent, ReactNode } from "react";
import { focusSkipTarget } from "@/lib/skip-link";
import { cn } from "@/lib/utils";

/**
 * The one skip link for the whole site. It is visually hidden until it gets keyboard focus, so mouse
 * and touch users never see it. Activating it moves focus to the main region without touching the URL.
 * The target should be a <main> with tabIndex={-1}.
 */
export function SkipLink({
  targetId,
  children,
  className,
}: {
  targetId: string;
  children: ReactNode;
  className?: string;
}) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    focusSkipTarget(document.getElementById(targetId));
  }
  return (
    <a
      href={`#${targetId}`}
      onClick={onClick}
      className={cn(
        "sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-3 focus-visible:top-3 focus-visible:z-[100] focus-visible:rounded-md focus-visible:bg-background focus-visible:px-4 focus-visible:py-3 focus-visible:text-sm focus-visible:font-medium focus-visible:text-foreground focus-visible:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </a>
  );
}
