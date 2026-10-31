import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "./brand-mark";
import { links } from "./data";

const navLink =
  "inline-flex min-h-11 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none";

export function SiteHeader() {
  return (
    <header className="border-b border-border/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 px-4 py-1 sm:px-6">
        <Link
          href="/"
          className="mr-auto inline-flex min-h-11 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandMark size={28} className="size-7" />
          <span className="text-base font-semibold tracking-tight">Physcratic</span>
        </Link>
        <nav
          aria-label="Main"
          className="order-last -mx-3 flex w-[calc(100%+1.5rem)] items-center sm:order-none sm:mx-0 sm:w-auto"
        >
          <a href={links.problems} className={navLink}>
            Problems
          </a>
          <a href={links.contests} className={navLink}>
            Contests
          </a>
          <a href="/sign-in" className={navLink}>
            Sign in
          </a>
        </nav>
        <div className="flex size-11 items-center justify-center [&>button]:size-11">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
