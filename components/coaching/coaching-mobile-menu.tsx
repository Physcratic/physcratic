"use client";

import Link from "next/link";
import { useRef } from "react";

type NavLink = { href: string; label: string };

export function CoachingMobileMenu({ menuLabel, navLabel, links }: { menuLabel: string; navLabel: string; links: readonly NavLink[] }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const close = () => detailsRef.current?.removeAttribute("open");
  return <details ref={detailsRef} className="relative lg:hidden"><summary className="rounded-md border border-border px-3 py-2 text-sm">{menuLabel}</summary><nav aria-label={navLabel} className="absolute right-0 top-12 flex w-48 flex-col gap-2 rounded-lg border border-border bg-background p-4 text-foreground">{links.map((link) => <Link key={link.href} href={link.href} className="py-2" onClick={close}>{link.label}</Link>)}</nav></details>;
}
