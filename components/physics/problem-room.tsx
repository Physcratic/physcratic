import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { SkipLink } from "@/components/skip-link";

/** Shared reading frame for published community, Practice, Arena and archive problems. */
export function ProblemRoom({ children, status, footer }: { children: ReactNode; status?: ReactNode; footer?: ReactNode }) {
  return <div className="min-h-dvh bg-background text-foreground">
    <SkipLink targetId="solver-main">Skip to problem content</SkipLink>
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <a href="/dashboard?view=problems" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><ArrowLeft aria-hidden="true" className="size-4" />Physcratic</a>
        <div className="flex flex-wrap items-center gap-4"><span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Problem room</span>{status}</div>
      </div>
    </header>
    <main id="solver-main" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-[1440px] space-y-7 px-4 py-6 focus:outline-none sm:px-8 sm:py-10">{children}</main>
    {footer && <footer className="mx-auto max-w-[1440px] border-t px-5 py-6 text-xs leading-relaxed text-muted-foreground sm:px-8">{footer}</footer>}
  </div>;
}
