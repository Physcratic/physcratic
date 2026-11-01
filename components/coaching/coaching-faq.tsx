import Link from "next/link";
import { Plus } from "lucide-react";
import { content } from "@/lib/coaching/content";

const { faq } = content;

export function CoachingFaq() {
  return <section id="faq" className="border-b border-border py-20">
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-5">
      <h2 className="text-center text-balance font-serif text-3xl leading-tight sm:text-4xl">{faq.title}</h2>
      <div className="divide-y divide-border border-y border-border">{faq.items.map((item) => <details key={item.question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">{item.question}<Plus className="size-5 shrink-0 text-accent transition-transform group-open:rotate-45" aria-hidden="true" /></summary><p className="pt-3 leading-relaxed text-muted-foreground">{item.answer}{item.link && <> <Link href={item.link.href} className="coaching-link font-semibold text-foreground">{item.link.label}</Link></>}</p></details>)}</div>
    </div>
  </section>;
}
