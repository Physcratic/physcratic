import Image from "next/image";
import Link from "next/link";
import { content } from "@/lib/coaching/content";
import { CoachingTutors } from "./coaching-tutors";
import { CoachingPrograms } from "./coaching-programs";
import { CoachingClassFormat } from "./coaching-class-format";
import { CoachingScheduling } from "./coaching-scheduling";
import { CoachingPackages } from "./coaching-packages";
import { CoachingReviews } from "./coaching-reviews";
import { CoachingGlance } from "./coaching-glance";
import { CoachingFaq } from "./coaching-faq";
import { CoachingFinalCta } from "./coaching-final-cta";
import { CoachingMobileMenu } from "./coaching-mobile-menu";
import { CoachingGuides } from "./coaching-guides";
import { Highlighted } from "./coaching-highlight";

const { ui, nav, path, footer } = content;

/** `base` is "/coaching" on pages other than the main one, so the in-page links still reach it. */
export function CoachingHeader({ base = "" }: { base?: string }) {
  const links = nav.map((link) => link.href.startsWith("#") ? { ...link, href: `${base}${link.href}` } : link);
  return <header className="coaching-header">
    <div className="coaching-container flex h-16 items-center justify-between gap-3">
      <Link href="/coaching" className="flex shrink-0 items-center gap-2.5" aria-label={ui.homeLabel}><Image src="/logo-mark-transparent.png" alt="" width={44} height={44} priority className="size-10 object-contain" /><span className="text-lg font-semibold">{ui.brand}</span></Link>
      <div className="flex items-center gap-3 lg:gap-5 xl:gap-7">
        <nav aria-label={ui.desktopNavLabel} className="hidden items-center gap-5 whitespace-nowrap text-sm font-medium text-muted-foreground lg:flex xl:gap-7">{links.map((link) => link.href.startsWith("#") ? <a key={link.href} href={link.href} className="coaching-link hover:text-foreground">{link.label}</a> : <Link key={link.href} href={link.href} className="coaching-link hover:text-foreground">{link.label}</Link>)}</nav>
        <CoachingMobileMenu menuLabel={ui.menu} navLabel={ui.mobileNavLabel} links={links} />
        <span className="hidden sm:block">{base ? <Link href={`${base}#hero-cta`} className="coaching-button whitespace-nowrap">{ui.consultationCta}</Link> : <a href="#hero-cta" className="coaching-button whitespace-nowrap">{ui.consultationCta}</a>}</span>
      </div>
    </div>
  </header>;
}

function CoachingPath() {
  return <section id="your-path" className="border-y border-border py-20">
    <div className="coaching-container flex flex-col gap-12">
      <h2 className="mx-auto max-w-2xl text-center text-balance font-serif text-3xl leading-tight sm:text-4xl">{path.title}</h2>
      <ol className="coaching-steps">
        {path.steps.map((step, index) => <li key={step.title} className="coaching-step">
          <span className="coaching-step-number" aria-hidden="true">{index + 1}</span>
          <p className="sr-only">{path.stepLabel} {index + 1}</p>
          <h3 className="text-xl font-semibold tracking-tight">{step.title}</h3>
          <p className="leading-relaxed text-muted-foreground"><Highlighted text={step.body} phrase={index === 1 ? path.highlight : undefined} /></p>
        </li>)}
        <li className="coaching-step-end"><a href="#hero-cta" className="coaching-button">{path.startLabel}</a></li>
      </ol>
      <p className="text-center"><a href="#tutors" className="coaching-link text-sm font-semibold text-muted-foreground hover:text-foreground">{path.coachesLabel}</a></p>
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
    <CoachingReviews />
    <CoachingGlance />
    <CoachingGuides />
    <CoachingFaq />
    <CoachingFinalCta />
  </>;
}

export function CoachingFooter() {
  return <footer className="border-t border-border pb-24 md:pb-0"><div className="coaching-container flex flex-col justify-between gap-8 py-10 text-sm text-muted-foreground md:flex-row"><div className="flex max-w-sm flex-col gap-2"><p className="text-2xl font-semibold text-foreground">Physcratic</p><p className="leading-relaxed">{footer.tagline}</p></div><nav aria-label={footer.navLabel}><ul className="flex flex-wrap items-center gap-x-10 gap-y-3">{footer.links.map((link) => <li key={link.href}><Link href={link.href} className="coaching-link hover:text-foreground">{link.label}</Link></li>)}<li><a href="https://www.instagram.com/physcratic" target="_blank" rel="noopener noreferrer" className="coaching-link inline-flex items-center gap-2 hover:text-foreground"><span className="coaching-instagram-icon" aria-hidden="true" />{footer.instagram}</a></li></ul></nav></div></footer>;
}
