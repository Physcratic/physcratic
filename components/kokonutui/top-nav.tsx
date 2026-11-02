"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, Search } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { FeedbackLink } from "@/components/feedback-link";
import { AccountNav } from "@/components/account-nav";
import { viewTitles, type View } from "@/lib/physics";

export default function TopNav({
  view,
  topic,
}: {
  view: View;
  topic?: string;
}) {
  const router = useRouter();
  useEffect(() => {
    function handleSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        router.push("/dashboard?view=problems&search=1");
      }
    }
    window.addEventListener("keydown", handleSearch);
    return () => window.removeEventListener("keydown", handleSearch);
  }, [router]);

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b bg-background px-5 pl-16 sm:px-8 sm:pl-16 lg:pl-8 xl:px-10">
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-2 text-sm sm:gap-3"
      >
        <Link
          href="/dashboard"
          className="hidden text-muted-foreground transition-colors hover:text-foreground sm:block"
        >
          Workspace
        </Link>
        <ChevronRight className="hidden size-3.5 text-muted-foreground sm:block" />
        <span className="truncate font-medium" aria-current="page">
          {topic || viewTitles[view]}
        </span>
      </nav>
      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard?view=problems&search=1")}
          aria-label="Search problems"
        >
          <Search data-icon="inline-start" />
          <span className="hidden font-normal text-muted-foreground md:inline">
            Search problems...
          </span>
          <kbd className="hidden rounded border px-1.5 py-0.5 font-sans text-sm text-muted-foreground xl:inline">
            ⌘ K
          </kbd>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/learn" aria-label="Learn">
            <BookOpen aria-hidden="true" />
            <span className="hidden font-normal md:inline">Learn</span>
          </Link>
        </Button>
        <Link
          href="/coaching"
          className="hidden rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline"
        >
          Coaching
        </Link>
        <FeedbackLink variant="nav" />
        <ThemeToggle />
        <span className="hidden h-5 border-l sm:block" />
        <AccountNav />
      </div>
    </header>
  );
}
