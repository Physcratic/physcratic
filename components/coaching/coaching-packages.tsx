import { Highlighted } from "./coaching-highlight";
import { CoachingMidCta } from "./coaching-mid-cta";
import { content } from "@/lib/coaching/content";

const { packages } = content;

export function CoachingPackages() {
  return <section id="packages" className="border-t border-border py-20">
    <div className="coaching-container mx-auto flex max-w-5xl flex-col gap-10">
      <h2 className="text-center text-balance font-serif text-3xl leading-tight sm:text-4xl">{packages.title}</h2>
      <ul className="grid w-full gap-6 md:grid-cols-2">{packages.items.map((item) => <li key={item.title} className="coaching-lift flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 text-foreground sm:p-8">
        <h3 className="text-lg font-semibold tracking-tight text-muted-foreground">{item.title}</h3>
        <div className="flex flex-col gap-1"><p className="font-serif text-4xl leading-none sm:text-5xl">{item.sessions}</p><p className="text-lg text-muted-foreground">{item.hours}</p></div>
        <p className="leading-relaxed text-muted-foreground">{item.text}</p>
        <p className="mt-auto leading-relaxed"><span className="font-bold">{packages.bestForLabel}:</span> <span className="text-muted-foreground">{item.bestFor}</span></p>
      </li>)}</ul>
      <div className="flex flex-col items-center gap-3 text-center">
        <a href="#hero-cta" className="coaching-button w-full">{packages.cta}</a>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground"><span className="font-semibold">{packages.pricingTitle}</span> <Highlighted text={packages.pricingText} phrase={packages.highlight} /></p>
      </div>
      <CoachingMidCta />
    </div>
  </section>;
}
