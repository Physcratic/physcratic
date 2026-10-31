import { CoachingHeader, CoachingFooter, CoachingSections } from "@/components/coaching/coaching-sections";
import { CoachingHero } from "@/components/coaching/coaching-hero";
export default async function CoachingPage({ searchParams }: { searchParams: Promise<{ goal?: string }> }) {
  const { goal } = await searchParams;
  return <>
    <a className="sr-only focus:not-sr-only focus:block focus:p-4" href="#coaching-main">Skip to coaching content</a>
    <CoachingHeader />
    <main id="coaching-main">
      <CoachingHero initialGoal={goal} />
      <CoachingSections />
    </main>
    <CoachingFooter />
    <a href="/coaching#hero-cta" className="coaching-mobile-cta">Start your inquiry</a>
  </>;
}
