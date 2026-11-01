import Image from "next/image";
import Link from "next/link";
import { GraduationCap, Medal, Orbit, Plus } from "lucide-react";
import { CoachingTutors } from "./coaching-tutors";
import { coachingGoalPaths, coachingGoalLinkLabels } from "@/lib/coaching-pathways";

const headerLinks = [{ href: "/coaching#faq", label: "FAQ" }];

export function CoachingHeader() {
  return <header className="coaching-header">
    <div className="coaching-container flex h-16 items-center justify-between gap-3">
      <Link href="/coaching" className="flex shrink-0 items-center gap-2.5" aria-label="Physcratic Coaching home"><Image src="/coaching/physcratic-logo.png" alt="" width={44} height={44} priority className="size-10 object-contain" /><span className="text-xl font-semibold tracking-tight sm:text-2xl">Physcratic Coaching</span></Link>
      <div className="flex items-center gap-3 md:gap-7">
        <nav aria-label="Coaching navigation" className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">{headerLinks.map((link) => <Link key={link.href} href={link.href} className="hover:text-foreground">{link.label}</Link>)}<Link href="/dashboard" className="hover:text-foreground">Physics practice</Link></nav>
        <details className="relative md:hidden"><summary className="rounded-md border border-border px-3 py-2 text-sm">Menu</summary><nav aria-label="Mobile coaching navigation" className="absolute right-0 top-12 flex w-48 flex-col gap-2 rounded-lg border border-border bg-background p-4 text-foreground">{headerLinks.map((link) => <Link key={link.href} href={link.href} className="py-2">{link.label}</Link>)}<Link href="/dashboard" className="py-2">Physics practice</Link></nav></details>
        <span className="hidden sm:block"><Link href="/coaching#hero-cta" className="coaching-button">Find a physics tutor</Link></span>
      </div>
    </div>
  </header>;
}

const pathways = [
  {
    id: "training",
    icon: GraduationCap,
    goal: "IB / A-Level / IGCSE training",
    title: "IB, A-Level & IGCSE physics tutoring",
    audience: "For students following an IB, A-Level or IGCSE physics course.",
    support: "Discuss one-to-one help with course concepts, physics problem-solving and exam preparation.",
    gettingStarted: "Select your program, then share your grade, preferred language and WhatsApp details in the training form.",
  },
  {
    id: "consultation",
    icon: Orbit,
    goal: "General physics consultation",
    title: "General physics consultation",
    audience: "For students and parents exploring physics support, from beginners to Olympiad competitors.",
    support: "Discuss your current level and the support you need, including national Olympiad preparation or IPhO, APhO and EuPhO team selection.",
    gettingStarted: "Choose Student or Parent, then share the student’s grade, physics stage and preferred languages. Provide WhatsApp details or another way to reach you.",
  },
  {
    id: "tutor-application",
    icon: Medal,
    goal: "Tutor inquiry",
    title: "Become a paid physics tutor",
    audience: "For Olympiad medalists interested in teaching physics with Physcratic.",
    support: "Apply to share your IPhO, APhO or EuPhO experience with students. This pathway is for teaching, not requesting lessons.",
    gettingStarted: "Share your achievements, languages and WhatsApp contact. Our team will review your application before discussing next steps.",
  },
] as const;

function CoachingPathways() {
  return (
    <section id="pathways" aria-labelledby="pathways-title" className="border-b border-border py-16 sm:py-20">
      <div className="coaching-container flex flex-col gap-10 text-center">
        <header className="flex max-w-2xl flex-col items-center gap-4 self-center">
          <h2 id="pathways-title" className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Choose your physics tutoring pathway</h2>
          <p className="text-pretty text-base leading-relaxed text-muted-foreground">Find school-exam support, discuss your physics or Olympiad goals, or apply to teach. Each pathway starts with a short inquiry form.</p>
        </header>
        <div className="flex flex-col gap-6 lg:flex-row">
          {pathways.map(({ icon: Icon, ...pathway }) => (
            <article key={pathway.id} aria-labelledby={`pathway-${pathway.id}-title`} className="flex min-w-0 flex-1 flex-col items-center justify-between gap-6 rounded-3xl border border-border bg-transparent p-6 text-foreground xl:p-8">
              <div className="flex flex-col gap-5">
                <span aria-hidden="true" className="flex size-20 items-center justify-center self-center rounded-2xl border border-border bg-background text-accent"><Icon className="size-10" strokeWidth={1.5} /></span>
                <h3 id={`pathway-${pathway.id}-title`} className="text-balance text-2xl font-semibold tracking-tight lg:min-h-16">{pathway.title}</h3>
                <dl className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1"><dt className="font-semibold">Who it&apos;s for</dt><dd className="text-pretty leading-relaxed text-muted-foreground">{pathway.audience}</dd></div>
                  <div className="flex flex-col gap-1"><dt className="font-semibold">{pathway.id === "tutor-application" ? "What this pathway covers" : "What you can discuss"}</dt><dd className="text-pretty leading-relaxed text-muted-foreground">{pathway.support}</dd></div>
                  <div className="flex flex-col gap-1"><dt className="font-semibold">How to get started</dt><dd className="text-pretty leading-relaxed text-muted-foreground">{pathway.gettingStarted}</dd></div>
                </dl>
              </div>
              <Link href={coachingGoalPaths[pathway.goal]} className="coaching-button coaching-button-metallic w-full max-w-full"><span className="flex min-h-12 items-center justify-center">{coachingGoalLinkLabels[pathway.goal]}</span></Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const faqs = [
  { question: "What happens after I send an inquiry?", answer: "Your inquiry is saved securely so our team can review it. We will follow up on WhatsApp within two days." },
  { question: "Which pathways can I choose?", answer: "General physics consultation, IB/A-Level/IGCSE training, or “I want to become a tutor” for IPhO winners interested in teaching with Physcratic." },
  { question: "Can I inquire on behalf of my child?", answer: "Yes. The inquiry form supports students, parents and tutor applicants. Choose the pathway that matches the support you are looking for." },
  { question: "Which language should I enter?", answer: "Tell us the student’s preferred language for lessons. This is a preference, not confirmation of tutor availability." },
  { question: "How is my information used?", answer: "We use your inquiry details to understand your goals and contact you about coaching options. We do not use them for unrelated marketing." },
];

export function CoachingSections() {
  return <>
    <CoachingPathways />
    <CoachingTutors />
    <section aria-labelledby="reviews-title" className="border-b border-border py-20">
      <div className="coaching-container flex flex-col gap-8">
        <div className="flex max-w-2xl flex-col items-center gap-3 self-center text-center"><h2 id="reviews-title" className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">See what our students are saying.</h2></div>
        <div className="rounded-2xl border border-border bg-foreground/5 p-8 text-foreground md:p-10">
    <figure className="flex flex-col gap-8">
      <blockquote className="max-w-4xl text-pretty text-lg leading-relaxed text-foreground sm:text-xl">
        <p>{"Honestly, the best tutor ever! I genuinely don’t think I would’ve made it this far if I hadn’t met Kak Arrow. Your explanations are always so clear and easy to understand, and you always give me feedback that helps me improve. I’ve grown so much throughout my training with you. Thank you so much, Kak Arrow, for being my tutor! I’m really grateful I got the chance to learn from you. ❤️"}</p>
      </blockquote>
      <figcaption className="border-t border-border pt-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-md flex-col gap-1">
            <p className="text-lg font-semibold text-foreground">Raffa</p>
            <p className="text-sm leading-relaxed text-muted-foreground">Best Theory &amp; Gold Medal in Indonesian Physics Olympiad</p>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <p className="text-sm font-medium text-muted-foreground">Sessions taken</p>
            <ul className="flex flex-wrap gap-2 text-sm text-foreground lg:justify-end">
              <li className="rounded-full border border-border px-3 py-1">Beginner</li>
              <li className="rounded-full border border-border px-3 py-1">Intermediate</li>
              <li className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1">Advanced <span className="text-accent">(currently)</span></li>
            </ul>
          </div>
        </div>
      </figcaption>
    </figure>
  </div>
      </div>
    </section>
    <section id="faq" className="border-b border-border py-20">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-5">
        <h2 className="text-center text-balance text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h2>
        <div className="divide-y divide-border border-y border-border">{faqs.map((item) => <details key={item.question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">{item.question}<Plus className="size-5 shrink-0 text-accent transition-transform group-open:rotate-45" aria-hidden="true" /></summary><p className="pt-3 leading-relaxed text-muted-foreground">{item.answer}</p></details>)}</div>
      </div>
    </section>
  </>;
}

export function CoachingFooter() {
  return <footer className="border-t border-border pb-24 md:pb-0"><div className="coaching-container flex flex-col justify-between gap-8 py-10 text-sm text-muted-foreground md:flex-row"><div className="flex max-w-sm flex-col gap-2"><p className="text-2xl font-semibold text-foreground">Physcratic</p><p className="leading-relaxed">Physics tutoring from International Physics Olympiad medalists.</p></div><nav aria-label="Coaching footer" className="md:max-w-xl"><ul className="flex flex-wrap items-center gap-x-10 gap-y-3"><li><Link href={coachingGoalPaths["IB / A-Level / IGCSE training"]} className="hover:text-foreground">IB, A-Level &amp; IGCSE physics tutoring</Link></li><li><Link href={coachingGoalPaths["General physics consultation"]} className="hover:text-foreground">Physics consultation</Link></li><li><Link href={coachingGoalPaths["Tutor inquiry"]} className="hover:text-foreground">Become a physics tutor</Link></li><li><Link href="/terms" className="hover:text-foreground">Terms & privacy</Link></li><li><a href="https://www.instagram.com/physcratic" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-foreground"><span className="coaching-instagram-icon" aria-hidden="true" />Instagram</a></li></ul></nav></div></footer>;
}
