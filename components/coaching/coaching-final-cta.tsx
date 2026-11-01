import Link from "next/link";
import { content } from "@/lib/coaching/content";

const { finalCta } = content;

export function CoachingFinalCta() {
  return <section aria-labelledby="final-cta-title" className="py-20">
    <div className="coaching-container flex max-w-2xl flex-col items-center gap-6 text-center">
      <h2 id="final-cta-title" className="text-balance font-serif text-3xl leading-tight sm:text-4xl">{finalCta.title}</h2>
      <p className="leading-relaxed text-muted-foreground">{finalCta.text}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/coaching#hero-cta" className="coaching-button">{finalCta.primary}</Link>
        <Link href="/dashboard?view=problems" className="coaching-button coaching-button-secondary">{finalCta.secondary}</Link>
      </div>
    </div>
  </section>;
}
