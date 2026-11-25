
import Link from "next/link";
import { content } from "@/lib/coaching/content";
import { CoachingPrograms } from "./coaching-programs";
import { CoachingClassFormat } from "./coaching-class-format";
import { CoachingScheduling } from "./coaching-scheduling";
import { CoachingPackages } from "./coaching-packages";
import { CoachingReviews } from "./coaching-reviews";
import { CoachingFaq } from "./coaching-faq";
import { CoachingFinalCta } from "./coaching-final-cta";
import TopNav from "@/components/kokonutui/top-nav";
import { CoachingGuides } from "./coaching-guides";
import { Highlighted } from "./coaching-highlight";

const { path, footer } = content;

/** `base` is "/coaching" on pages other than the main one, so the in-page links still reach it. */
export function CoachingHeader({ base = "" }: { base?: string }) {
  return <TopNav view="overview" sticky coaching coachingBase={base} />;
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
      <p className="text-center"><Link href="/coaching/coaches" className="coaching-link coaching-tap text-sm font-semibold text-muted-foreground hover:text-foreground">{path.coachesLabel}</Link></p>
    </div>
  </section>;
}

export function CoachingSections() {
  return <>
    <CoachingPrograms />
    <CoachingClassFormat />
    <CoachingScheduling />
    <CoachingPackages />
    <CoachingPath />
    <CoachingReviews />
    <CoachingGuides />
    <CoachingFaq />
    <CoachingFinalCta />
  </>;
}

export function CoachingFooter() {
  return <footer className="border-t border-border pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0"><div className="coaching-container flex flex-col justify-between gap-8 py-10 text-sm text-muted-foreground md:flex-row"><div className="flex max-w-sm flex-col gap-2"><p className="text-2xl font-semibold text-foreground">Physcratic</p><p className="leading-relaxed">{footer.tagline}</p></div><nav aria-label={footer.navLabel}><ul className="flex flex-wrap items-center gap-x-10 gap-y-3">{footer.links.map((link) => <li key={link.href}><Link href={link.href} className="coaching-link coaching-tap coaching-footer-link hover:text-foreground">{link.label}</Link></li>)}<li><a href="https://www.instagram.com/physcratic" target="_blank" rel="noopener noreferrer" className="coaching-link coaching-tap coaching-footer-link inline-flex items-center gap-2 hover:text-foreground"><span className="coaching-instagram-icon" aria-hidden="true" />{footer.instagram}</a></li></ul></nav></div></footer>;
}
