"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { content } from "@/lib/coaching/content";

const { faq } = content;

export function CoachingFaq() {
  const [opened, setOpened] = useState<number[]>([0]);
  const allOpen = opened.length === faq.items.length;
  return <section id="faq" className="border-b border-border py-20">
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h2 className="text-balance font-serif text-3xl leading-tight sm:text-4xl">{faq.title}</h2>
      <button type="button" aria-controls="coaching-faq-items" aria-expanded={allOpen} onClick={() => setOpened(allOpen ? [] : faq.items.map((_, index) => index))} className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{allOpen ? "Collapse all" : "Show all"}</button>
      </div>
      <div id="coaching-faq-items" className="divide-y divide-border border-y border-border">{faq.items.map((item, index) => <details key={item.question} open={opened.includes(index)} className="group"><summary onClick={event => { event.preventDefault(); setOpened(current => current.includes(index) ? current.filter(value => value !== index) : [...current, index]); }} className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold [&::-webkit-details-marker]:hidden">{item.question}<Plus className="size-5 shrink-0 text-accent transition-transform group-open:rotate-45" aria-hidden="true" /></summary><p className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.answer}{item.link && <> <Link href={item.link.href} className="coaching-link font-semibold text-foreground">{item.link.label}</Link></>}</p></details>)}</div>
    </div>
  </section>;
}
