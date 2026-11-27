import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { SkipLink } from "@/components/skip-link";
import { ProblemBackLink } from "./problem-nav";

/**
 * Shared reading frame for published community, Practice, Arena and archive problems. The header has one way back,
 * first after the skip link, and the Physcratic wordmark, which links to the home page and says so in its name.
 * `backHref` is only for an archive problem, which returns to its archive list.
 */
export function ProblemRoom({ children, status, footer, backHref }: { children: ReactNode; status?: ReactNode; footer?: ReactNode; backHref?: string }) {
  return <div className="min-h-dvh bg-background text-foreground">
    <SkipLink targetId="solver-main">Skip to problem content</SkipLink>
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <nav aria-label="Problem navigation" className="flex flex-wrap items-center gap-4">
          <ProblemBackLink archiveHref={backHref} />
          <Link href="/dashboard#problem-history" className="inline-flex min-h-11 items-center rounded-md text-sm font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Your previous work</Link>
        </nav>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" aria-label="Physcratic home" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <BrandMark size={20} className="size-5" />
            Physcratic
          </Link>
          {status}
        </div>
      </div>
    </header>
    <main id="solver-main" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-[1440px] space-y-7 px-4 py-6 focus:outline-none sm:px-8 sm:py-10">{children}</main>
    {footer && <footer className="mx-auto max-w-[1440px] border-t px-5 py-6 text-xs leading-relaxed text-muted-foreground sm:px-8">{footer}</footer>}
  </div>;
}
