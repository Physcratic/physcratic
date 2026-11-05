"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, GraduationCap, Search } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FeedbackLink } from "@/components/feedback-link";
import { AccountNav } from "@/components/account-nav";
import { coachingEntryHandlers } from "@/lib/coaching/analytics";
import { viewTitles, type View } from "@/lib/physics";
import { TourHelpButton } from "@/components/tour/tour-help";

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
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b bg-background pl-4 pr-[68px] sm:px-8 sm:pl-16 lg:pl-8 xl:px-10">
      <Link href="/dashboard" className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden" aria-label="Physcratic home">
        <BrandMark size={32} className="shrink-0 rounded-md" />
        <span className="truncate text-xl font-semibold tracking-[-0.05em]">Physcratic</span>
      </Link>
      <nav
        aria-label="Breadcrumb"
        className="hidden min-w-0 items-center gap-2 text-sm sm:flex sm:gap-3"
      >
        <Link
          href="/dashboard"
          className="hidden min-h-11 items-center text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
        >
          Workspace
        </Link>
        <ChevronRight className="hidden size-3.5 text-muted-foreground sm:block" />
        <span className="truncate font-medium" aria-current="page">
          {topic || viewTitles[view]}
        </span>
      </nav>
      <div className="flex shrink-0 items-center gap-1 sm:gap-5">
        <div className="hidden sm:contents">
        <Button
          variant="ghost"
          size="sm"
          className="min-w-11 px-2 sm:px-3"
          onClick={() => router.push("/dashboard?view=problems&search=1")}
          aria-label="Search problems"
        >
          <Search data-icon="inline-start" />
          <span className="hidden font-normal text-muted-foreground xl:inline">
            Search problems...
          </span>
          <kbd className="hidden rounded border px-1.5 py-0.5 font-sans text-sm text-muted-foreground xl:inline">
            ⌘ K
          </kbd>
        </Button>
        <Button asChild variant="ghost" size="sm" className="px-2 sm:px-3">
          <Link href="/learn" aria-label="Learn">
            <BookOpen aria-hidden="true" />
            <span className="hidden font-normal md:inline">Learn</span>
          </Link>
        </Button>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="size-11 border-accent-foreground p-0 text-accent-foreground hover:bg-accent hover:text-accent-foreground sm:h-11 sm:w-auto sm:px-3"
        >
          <Link
            href="/coaching"
            aria-label="Coaching"
            data-tour="nav-coaching"
            {...coachingEntryHandlers("topbar")}
          >
            <GraduationCap aria-hidden="true" />
            <span className="hidden font-medium sm:inline">Coaching</span>
          </Link>
        </Button>
        <TourHelpButton tourId="welcome" />
        <div className="hidden sm:contents">
          <FeedbackLink variant="nav" />
          <span className="h-5 border-l" />
          <AccountNav />
        </div>
      </div>
    </header>
  );
}
