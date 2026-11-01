import Image from "next/image";
import Link from "next/link";
import { content } from "@/lib/coaching/content";
import { CoachingTutors } from "./coaching-tutors";
import { CoachingPrograms } from "./coaching-programs";
import { CoachingClassFormat } from "./coaching-class-format";
import { CoachingScheduling } from "./coaching-scheduling";
import { CoachingPackages } from "./coaching-packages";

const { ui, nav, path, footer } = content;

export function CoachingHeader() {
  return <header className="coaching-header">
    <div className="coaching-container flex h-16 items-center justify-between gap-3">
      <Link href="/coaching" className="flex shrink-0 items-center gap-2.5" aria-label={ui.homeLabel}><Image src="/coaching/physcratic-logo.png" alt="" width={44} height={44} priority className="size-10 object-contain" /><span className="text-xl font-semibold tracking-tight sm:text-2xl">{ui.brand}</span></Link>
      <div className="flex items-center gap-3 lg:gap-7">
        <nav aria-label={ui.desktopNavLabel} className="hidden items-center gap-7 text-sm font-medium text-muted-foreground lg:flex">{nav.map((link) => <Link key={link.href} href={link.href} className="hover:text-foreground">{link.label}</Link>)}</nav>
        <details className="relative lg:hidden"><summary className="rounded-md border border-border px-3 py-2 text-sm">{ui.menu}</summary><nav aria-label={ui.mobileNavLabel} className="absolute right-0 top-12 flex w-48 flex-col gap-2 rounded-lg border border-border bg-background p-4 text-foreground">{nav.map((link) => <Link key={link.href} href={link.href} className="py-2">{link.label}</Link>)}</nav></details>
        <span className="hidden sm:block"><Link href="/coaching#hero-cta" className="coaching-button">{ui.consultationCta}</Link></span>
      </div>
    </div>
  </header>;
}

function CoachingPath() {
  return <section id="your-path" className="border-y border-border py-20">
    <div className="coaching-container flex flex-col items-center gap-10">
      <h2 className="mx-auto max-w-2xl text-center text-balance text-3xl font-bold tracking-tight sm:text-4xl">{path.title}</h2>
      <ol className="grid w-full gap-6 md:grid-cols-2 lg:grid-cols-4">{path.steps.map((step, index) => <li key={step.title} className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-background p-6 text-center text-foreground"><p className="text-sm font-medium text-accent">{path.stepLabel} {index + 1}</p><h3 className="text-xl font-semibold tracking-tight">{step.title}</h3><p className="leading-relaxed text-muted-foreground">{step.body}</p></li>)}</ol>
      <div className="flex flex-wrap justify-center gap-3"><Link href="/coaching#hero-cta" className="coaching-button">{path.startLabel}</Link><Link href="/coaching#tutors" className="coaching-button coaching-button-secondary">{path.coachesLabel}</Link></div>
    </div>
  </section>;
}

export function CoachingSections() {
  return <>
    <CoachingTutors />
    <CoachingPrograms />
    <CoachingClassFormat />
    <CoachingScheduling />
    <CoachingPackages />
    <CoachingPath />
  </>;
}

export function CoachingFooter() {
  return <footer className="border-t border-border pb-24 md:pb-0"><div className="coaching-container flex flex-col justify-between gap-8 py-10 text-sm text-muted-foreground md:flex-row"><div className="flex max-w-sm flex-col gap-2"><p className="text-2xl font-semibold text-foreground">Physcratic</p><p className="leading-relaxed">{footer.tagline}</p></div><nav aria-label={footer.navLabel}><ul className="flex flex-wrap items-center gap-x-10 gap-y-3">{footer.links.map((link) => <li key={link.href}><Link href={link.href} className="hover:text-foreground">{link.label}</Link></li>)}<li><a href="https://www.instagram.com/physcratic" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-foreground"><span className="coaching-instagram-icon" aria-hidden="true" />{footer.instagram}</a></li></ul></nav></div></footer>;
}
