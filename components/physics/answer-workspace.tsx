import React, { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Desktop solving rail. Mobile uses normal document flow without a nested scroll area. */
export function AnswerWorkspace({ children, className }: { children: ReactNode; className?: string }) {
  return <aside aria-label="Answer workspace" data-answer-workspace tabIndex={0} className={cn("flex min-w-0 flex-col gap-4 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring xl:sticky xl:top-5 xl:max-h-[calc(100dvh-2.5rem)] xl:overflow-y-auto xl:overscroll-contain", className)}>
    {children}
  </aside>;
}
