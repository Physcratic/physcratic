"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpen,
  FilePenLine,
  Search,
  Settings,
  LayoutGrid,
  Menu,
  Trophy,
  ChartNoAxesCombined,
  GraduationCap,
} from "lucide-react";
import { AccountNav } from "@/components/account-nav";
import { BrandMark } from "@/components/brand-mark";
import { FeedbackLink } from "@/components/feedback-link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { coachingEntryHandlers } from "@/lib/coaching/analytics";
import { type View } from "@/lib/physics";
import { cn } from "@/lib/utils";

export default function Sidebar({
  view,
  topic,
}: {
  view: View;
  topic?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Below 640px the menu button sits on the right of the header, so the menu opens from the right.
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const entry = coachingEntryHandlers("sidebar");
  const mainItems = [
    { view: "overview", label: "Lobby", icon: LayoutGrid },
    { view: "problems", label: "Problems", icon: BookOpen },
    { view: "contests", label: "Contests", icon: Trophy },
    { view: "rankings", label: "Rankings", icon: ChartNoAxesCombined },
  ];

  const navigation = (
    <div className="flex h-full flex-col bg-sidebar text-foreground [&_svg]:!size-6 [&_svg]:shrink-0 [&_svg]:stroke-[1.7]">
      <Link
        href="/"
        onClick={() => setMobileOpen(false)}
        className="flex h-[76px] shrink-0 items-center gap-2.5 px-6 lg:hidden"
        aria-label="Physcratic home"
      >
        <BrandMark size={36} className="rounded-lg" />
        <span className="text-2xl font-semibold tracking-[-0.065em]">
          Physcratic
        </span>
      </Link>

      <nav
        aria-label="Main navigation"
        className="flex flex-1 flex-col gap-8 overflow-y-auto px-4 lg:pt-6"
      >
        
        <div className="flex flex-col gap-3">
          <h2 className="px-3 text-base font-semibold tracking-tight text-foreground">
            Workspace
          </h2>
          <div className="flex flex-col gap-1">
            {mainItems.map(({ view: itemView, label, icon: Icon }) => {
              const active = view === itemView && !topic;
              return (
                <Link
                  key={itemView}
                  href={itemView === "overview" ? "/" : `/dashboard?view=${itemView}`}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? "page" : undefined}
                  data-tour={itemView === "problems" ? "nav-problems" : undefined}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-lg px-3 text-base transition-colors",
                    active
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-6" strokeWidth={1.7} />
                  {label}
                </Link>
              );
            })}
            <Link
          href="/dashboard/author"
          onClick={() => setMobileOpen(false)}
          className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-base text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <FilePenLine className="size-6" strokeWidth={1.7} />
          Studio
        </Link>
            <Link
              href="/coaching"
              onClick={() => {
                setMobileOpen(false);
                entry.onClick();
              }}
              onAuxClick={entry.onAuxClick}
              className="flex min-h-12 items-center gap-3 rounded-lg px-3 py-1.5 text-base text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <GraduationCap className="size-6 shrink-0" strokeWidth={1.7} />
              <span>Coaching</span>
            </Link>
            <Link href="/learn" onClick={() => setMobileOpen(false)} className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-base text-muted-foreground hover:bg-muted hover:text-foreground"><BookOpen className="size-6" aria-hidden="true" />Guides</Link>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:hidden">
          <h2 className="px-3 text-base font-semibold tracking-tight text-foreground">
            More
          </h2>
          <div className="flex flex-col gap-1">
            <Link
              href="/dashboard?view=problems&search=1"
              onClick={() => setMobileOpen(false)}
              className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-base text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Search className="size-6" strokeWidth={1.7} />
              Search problems
            </Link>
            <div className="px-3 py-1">
              <FeedbackLink variant="inline" />
            </div>
          </div>
        </div>
      </nav>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t p-4">
          <div className="min-w-0 flex-1 [&>a]:w-full [&>button]:w-full">
            <AccountNav />
          </div>
          <Link
            href="/settings"
            data-tour="nav-settings"
            onClick={() => setMobileOpen(false)}
            aria-label="Settings"
            title="Settings"
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Settings className="size-6" strokeWidth={1.7} aria-hidden="true" />
            <span className="sr-only">Settings</span>
          </Link>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed bottom-0 left-0 top-[72px] z-40 hidden w-60 border-r bg-sidebar lg:block [&_svg]:!size-6 [&_svg]:shrink-0 [&_svg]:stroke-[1.7]">
        {navigation}
      </aside>
      <div className="fixed right-3 top-3.5 z-[42] sm:left-4 sm:right-auto lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" className="h-12 min-w-12 w-auto flex-col gap-0.5 px-2 py-1 text-xs font-medium leading-none sm:h-11 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm" data-tour="nav-open">
              <Menu aria-hidden="true" />
              <span>Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side={phone ? "right" : "left"} className="w-72 p-0">
            <SheetTitle className="sr-only">Physcratic navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Browse your physics workspace and topics.
            </SheetDescription>
            {navigation}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
