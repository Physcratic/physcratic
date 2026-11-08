"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";

type NavLink = { href: string; label: string };

export function CoachingMobileMenu({ menuLabel, navLabel, links }: { menuLabel: string; navLabel: string; links: readonly NavLink[] }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const close = () => detailsRef.current?.removeAttribute("open");
  const onKeyDown = (event: KeyboardEvent<HTMLDetailsElement>) => {
    const details = detailsRef.current;
    if (event.key !== "Escape" || !details?.open) return;
    close();
    details.querySelector("summary")?.focus();
  };
  return <details ref={detailsRef} onKeyDown={onKeyDown} className="group relative lg:hidden">
    <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-foreground/10 [&::-webkit-details-marker]:hidden">
      <Menu className="size-5 group-open:hidden" aria-hidden="true" />
      <X className="hidden size-5 group-open:block" aria-hidden="true" />
      <span className="sr-only">{menuLabel}</span>
    </summary>
    <nav aria-label={navLabel} className="absolute right-0 top-full mt-2 flex w-48 flex-col gap-2 rounded-lg border border-border bg-background p-4 text-foreground">{links.map((link) => link.href.startsWith("#") ? <a key={link.href} href={link.href} className="flex min-h-11 items-center" onClick={close}>{link.label}</a> : <Link key={link.href} href={link.href} className="flex min-h-11 items-center" onClick={close}>{link.label}</Link>)}</nav></details>;
}
