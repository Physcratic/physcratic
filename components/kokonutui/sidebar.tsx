"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BookOpen,
  FilePenLine,
  LayoutGrid,
  Menu,
  Trophy,
  ChartNoAxesCombined,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { problems, topics, type View } from "@/lib/physics";
import { catalogProblems } from "@/lib/corpus-catalog";
import { cn } from "@/lib/utils";

export default function Sidebar({
  view,
  topic,
}: {
  view: View;
  topic?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainItems = [
    { view: "overview", label: "Lobby", icon: LayoutGrid },
    { view: "problems", label: "Problems", icon: BookOpen },
    { view: "contests", label: "Contests", icon: Trophy },
    { view: "rankings", label: "Rankings", icon: ChartNoAxesCombined },
  ];

  const navigation = (
    <div className="flex h-full flex-col bg-sidebar text-foreground">
      <Link
        href="/dashboard"
        onClick={() => setMobileOpen(false)}
        className="flex h-[76px] shrink-0 items-center gap-2.5 px-6"
        aria-label="Physcratic home"
      >
        <BrandMark size={36} className="rounded-lg" />
        <span className="text-2xl font-semibold tracking-[-0.065em]">
          Physcratic
        </span>
      </Link>

      <nav
        aria-label="Main navigation"
        className="flex flex-1 flex-col gap-8 overflow-y-auto px-4"
      >
        <Link
          href="/dashboard/author"
          onClick={() => setMobileOpen(false)}
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <FilePenLine className="size-[18px]" strokeWidth={1.7} />
          Problem studio
        </Link>
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
                  href={`/dashboard${itemView === "overview" ? "" : `?view=${itemView}`}`}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                    active
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={1.7} />
                  {label}
                  {itemView === "problems" && (
                    <span className="ml-auto text-sm opacity-70">
                      {(
                        problems.length + catalogProblems.length
                      ).toLocaleString("en-US")}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="px-3 text-base font-semibold tracking-tight text-foreground">
            Explore
          </h2>
          <div className="flex flex-col gap-1">
            {topics.map(({ name, icon: Icon }) => (
              <Link
                key={name}
                href={`/dashboard?view=problems&topic=${encodeURIComponent(name)}`}
                onClick={() => setMobileOpen(false)}
                aria-current={topic === name ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                  topic === name
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-[18px]" strokeWidth={1.7} />
                {name}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r lg:block">
        {navigation}
      </aside>
      <div className="fixed left-4 top-3.5 z-30 lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
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
