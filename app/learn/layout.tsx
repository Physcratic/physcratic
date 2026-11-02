import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { SkipLink } from "@/components/skip-link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SkipLink targetId="main-content">Skip to main content</SkipLink>
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2 rounded-md font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandMark size={28} className="shrink-0" />
            <span className="truncate">Physcratic</span>
            <span className="sr-only">, back to the dashboard</span>
          </Link>
          <nav aria-label="Site" className="flex shrink-0 items-center gap-1 sm:gap-3">
            <Link
              href="/learn"
              className="rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Learn
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="focus:outline-none mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12"
      >
        {children}
      </main>
    </div>
  );
}
