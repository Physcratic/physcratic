import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { CoachingHeader, CoachingFooter } from "@/components/coaching/coaching-sections";
import { CoachingAvatar } from "@/components/coaching/coaching-avatar";
import { SkipLink } from "@/components/skip-link";
import { medallists, medalLabel } from "@/lib/coaching/medallists";
import { coachImageAlt } from "@/lib/coaching/content";
import { coachProfileDescription, coachProfileHref, findCoach } from "@/lib/coaching/coach-profile";
import { coachingSocial } from "@/lib/coaching/social";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return medallists.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const coach = findCoach((await params).slug);
  if (!coach) notFound();
  const title = `${coach.name}, Physics Coach`;
  const description = coachProfileDescription(coach);
  const url = coachProfileHref(coach.slug);
  return { title, description, alternates: { canonical: url }, ...coachingSocial({ title, description, url, withImage: true }) };
}

export default async function CoachProfilePage({ params }: Props) {
  const coach = findCoach((await params).slug);
  if (!coach) notFound();
  return <>
    <SkipLink targetId="coach-profile-main">Skip to coach profile</SkipLink>
    <CoachingHeader base="/coaching" />
    <main id="coach-profile-main" tabIndex={-1} className="coaching-container py-8 outline-none sm:py-12">
      <Link href="/coaching#tutors" className="coaching-link mb-8 inline-flex min-h-11 items-center gap-2 text-sm"><ArrowLeft className="size-4" aria-hidden="true" />All coaches</Link>
      <article className="grid items-start gap-8 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:gap-12">
        <div className="relative mx-auto aspect-[4/5] w-full max-w-80 overflow-hidden rounded-2xl border bg-muted">
          {coach.photo === false ? <CoachingAvatar variant="portrait" className="h-full w-full" /> : <Image src={`/coaching/medallists/${coach.slug}.${coach.photo ?? "webp"}`} alt={coach.alt ?? coachImageAlt(coach.name, coach.country)} fill priority sizes="(min-width: 768px) 320px, 90vw" className="object-cover" />}
        </div>
        <div className="min-w-0 space-y-8">
          <header className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{coach.name}</h1>
            <p className="text-lg text-muted-foreground">Physics coach from {coach.country}</p>
          </header>
          <section aria-labelledby="coach-achievements" className="space-y-4">
            <h2 id="coach-achievements" className="text-xl font-semibold">Competition Achievements</h2>
            <ul className="divide-y rounded-xl border px-5">
              {coach.achievements.map(item => <li key={`${item.contest}-${item.year}`} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <span className="font-medium">{item.contest} {item.year}</span>
                <span className="text-muted-foreground">{medalLabel[item.medal]}{item.medal === "hm" ? "" : " medal"}</span>
              </li>)}
            </ul>
          </section>
          <section aria-labelledby="coach-enquiry" className="space-y-4 border-t pt-6">
            <h2 id="coach-enquiry" className="text-xl font-semibold">Coaching Options</h2>
            <p className="max-w-prose leading-relaxed text-muted-foreground">Discuss your goals, level and schedule with the Physcratic team. You can mention {coach.name} when asking about coach availability.</p>
            <Link href="/coaching/consultation" className="coaching-button">Discuss coaching options<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
          </section>
        </div>
      </article>
      <nav aria-label="Other coaches" className="mt-12 space-y-4 border-t pt-8">
        <h2 className="text-xl font-semibold">Other Coaches</h2>
        <div className="flex flex-wrap gap-2">{medallists.filter(item => item.slug !== coach.slug).map(item => <Link key={item.slug} href={coachProfileHref(item.slug)} className="coaching-link inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm">{item.name}</Link>)}</div>
      </nav>
    </main>
    <CoachingFooter />
  </>;
}
