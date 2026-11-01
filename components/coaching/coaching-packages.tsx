import Link from "next/link";
import { content } from "@/lib/coaching/content";

const { packages } = content;

export function CoachingPackages() {
  return <section id="packages" className="border-t border-border py-20">
    <div className="coaching-container flex flex-col items-center gap-10">
      <h2 className="text-center text-balance text-3xl font-bold tracking-tight sm:text-4xl">{packages.title}</h2>
      <ul className="grid w-full gap-6 md:grid-cols-2">{packages.items.map((item) => <li key={item.title} className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-6 text-foreground">
        <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>
        <p className="text-sm font-medium text-accent">{item.size}</p>
        <p className="leading-relaxed text-muted-foreground">{item.text}</p>
        <p className="mt-auto leading-relaxed"><span className="font-semibold">{packages.bestForLabel}:</span> <span className="text-muted-foreground">{item.bestFor}</span></p>
      </li>)}</ul>
      <div className="flex max-w-2xl flex-col items-center gap-5 text-center">
        <p className="leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{packages.pricingTitle}</span> {packages.pricingText}</p>
        <Link href="/coaching#hero-cta" className="coaching-button">{packages.cta}</Link>
      </div>
    </div>
  </section>;
}
