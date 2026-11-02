import { CoachingHeader, CoachingFooter, CoachingSections } from "@/components/coaching/coaching-sections";
import { CoachingHero } from "@/components/coaching/coaching-hero";
import { CoachingReveal } from "@/components/coaching/coaching-reveal";
import { content } from "@/lib/coaching/content";
export default async function CoachingPage({ searchParams }: { searchParams: Promise<{ goal?: string }> }) {
  const { goal } = await searchParams;
  return <>
    <a className="sr-only focus:not-sr-only focus:block focus:p-4" href="#coaching-main">{content.ui.skipLink}</a>
    <CoachingHeader />
    <main id="coaching-main">
      <CoachingHero key={goal ?? ""} initialGoal={goal} />
      <CoachingSections />
    </main>
    <CoachingFooter />
    <CoachingReveal />
    <a href="#hero-cta" className="coaching-mobile-cta">{content.ui.consultationCta}</a>
  </>;
}
