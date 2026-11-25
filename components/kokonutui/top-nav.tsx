"use client";

import Link from "next/link";
import { BookOpen, ChartNoAxesCombined, FilePenLine, GraduationCap, LayoutGrid, Settings, Trophy, Users, Layers, Video, CircleHelp } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { AccountNav } from "@/components/account-nav";
import { SiteSearch } from "@/components/site-search";
import { FeedbackLink } from "@/components/feedback-link";
import { Button } from "@/components/ui/button";
import { TourHelpButton } from "@/components/tour/tour-help";
import { coachingEntryHandlers } from "@/lib/coaching/analytics";
import { type View } from "@/lib/physics";
import { cn } from "@/lib/utils";

export default function TopNav({ view, topic, sticky = false, coaching = false, coachingBase = "" }: { view: View; topic?: string; sticky?: boolean; coaching?: boolean; coachingBase?: string }) {
  const links = coaching ? [
    { label: "Lobby", href: "/", icon: LayoutGrid, active: false },
    { label: "Programs", href: `${coachingBase}#programs`, icon: Layers, active: false },
    { label: "Coaches", href: "/coaching/coaches", icon: Users, active: false },
    { label: "How It Works", href: `${coachingBase}#how-it-works`, icon: Video, active: false },
    { label: "FAQ", href: `${coachingBase}#faq`, icon: CircleHelp, active: false },
    { label: "Free Practice", href: "/dashboard", icon: BookOpen, active: false },
    { label: "Guides", href: "/learn", icon: BookOpen, active: false },
  ] : [
    { label: "Lobby", href: "/", icon: LayoutGrid, active: view === "overview" },
    { label: "Problems", href: "/dashboard?view=problems", icon: BookOpen, active: view === "problems" && !topic },
    { label: "Contests", href: "/dashboard?view=contests", icon: Trophy, active: view === "contests" },
    { label: "Rankings", href: "/dashboard?view=rankings", icon: ChartNoAxesCombined, active: view === "rankings" },
    { label: "Problem Studio", href: "/dashboard/author", icon: FilePenLine, active: false },
    { label: "Coaching", href: "/coaching", icon: GraduationCap, active: false },
    { label: "Guides", href: "/learn", icon: BookOpen, active: false },
  ];
  return (
    <header style={{ background: "hsl(var(--background))" }} className={cn("isolate z-40 shrink-0 border-b px-5 sm:px-8 xl:px-10", sticky ? "sticky top-0" : "relative", !coaching && "pr-20 sm:pl-24 sm:pr-8 lg:sticky lg:top-0 lg:pl-6")}>
      <div className={cn("mx-auto flex w-full flex-wrap items-center gap-x-6 gap-y-2 py-3 sm:gap-x-10", coaching ? "max-w-7xl justify-center" : "justify-between lg:h-[72px] lg:flex-nowrap")}>
        <Link href={coaching ? "/coaching" : "/"} aria-label={coaching ? "Physcratic Coaching home" : "Physcratic home"} className="flex min-h-12 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BrandMark size={36} className="rounded-lg" />
          <span className="text-2xl font-semibold tracking-tight">{coaching ? "Physcratic Coaching" : "Physcratic"}</span>
        </Link>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <SiteSearch />
          {!coaching && <TourHelpButton tourId="welcome" />}
          <div className="hidden md:block"><FeedbackLink variant="nav" /></div>
          <AccountNav />
          <Button asChild variant="ghost" size="icon"><Link href="/settings" aria-label="Settings" title="Settings" data-tour="nav-settings"><Settings aria-hidden="true" /></Link></Button>
          {coaching && <Link href={`${coachingBase}#hero-cta`} className="coaching-button whitespace-nowrap">Get a consultation</Link>}
        </div>
      </div>
      {coaching && <nav aria-label="Main navigation" className="mx-auto flex w-full max-w-7xl flex-wrap justify-center gap-1 pb-3">
        {links.map(({ label, href, icon: Icon, active }) => (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} data-tour={label === "Problems" ? "nav-problems" : label === "Coaching" ? "nav-coaching" : undefined} {...(label === "Coaching" ? coachingEntryHandlers("topbar") : {})} className={cn("flex min-h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <Icon className="size-6 shrink-0" strokeWidth={1.7} aria-hidden="true" />{label}
          </Link>
        ))}
      </nav>}
    </header>
  );
}
