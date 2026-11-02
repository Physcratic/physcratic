"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, GraduationCap, LayoutGrid, Menu, Settings } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { SettingsDialog } from "@/components/settings-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { coachingEntryHandlers } from "@/lib/coaching/analytics";

const rowClass =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** One row: logo and name on the left, the Coaching and menu buttons on the right. Everything else is in the menu. */
export function LearnHeader() {
  const [open, setOpen] = React.useState(false);
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2.5 rounded-md font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandMark size={32} className="shrink-0" />
          <span className="truncate text-lg">Physcratic</span>
          <span className="sr-only">, back to the dashboard</span>
        </Link>
        <nav aria-label="Site" className="flex shrink-0 items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/learn">Learn</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="size-11 border-accent-foreground p-0 text-accent-foreground hover:bg-accent hover:text-accent-foreground sm:h-9 sm:w-auto sm:px-3"
          >
            <Link href="/coaching" aria-label="Coaching" {...coachingEntryHandlers("topbar")}>
              <GraduationCap aria-hidden="true" />
              <span className="hidden font-medium sm:inline">Coaching</span>
            </Link>
          </Button>
          <div className="hidden sm:block">
            <SettingsDialog>
              <Button variant="ghost" size="icon" className="size-11" aria-label="Settings">
                <Settings aria-hidden="true" />
              </Button>
            </SettingsDialog>
          </div>
          <div className="sm:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-11" aria-label="Open menu">
                  <Menu aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription className="sr-only">Site links and settings.</SheetDescription>
                <div className="mt-4 flex flex-col gap-1">
                  <Link href="/learn" onClick={() => setOpen(false)} className={rowClass}>
                    <BookOpen className="size-[18px]" aria-hidden="true" />
                    Learn
                  </Link>
                  <Link href="/dashboard" onClick={() => setOpen(false)} className={rowClass}>
                    <LayoutGrid className="size-[18px]" aria-hidden="true" />
                    Dashboard
                  </Link>
                  <SettingsDialog>
                    <button type="button" className={rowClass}>
                      <Settings className="size-[18px]" aria-hidden="true" />
                      Settings
                    </button>
                  </SettingsDialog>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </header>
  );
}
