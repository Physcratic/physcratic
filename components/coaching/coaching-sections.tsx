import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CoachingTutors } from "./coaching-tutors";

const headerLinks = [{ href: "/coaching#faq", label: "FAQ" }];

export function CoachingHeader() {
  return <header className="coaching-header">
    <div className="coaching-container flex h-16 items-center justify-between gap-3">
      <Link href="/coaching" className="flex shrink-0 items-center gap-2.5" aria-label="Physcratic Coaching home"><Image src="/coaching/physcratic-logo.png" alt="" width={44} height={44} priority className="size-10 object-contain" /><span className="text-xl font-semibold tracking-tight sm:text-2xl">Physcratic Coaching</span></Link>
      <div className="flex items-center gap-3 md:gap-7">
        <nav aria-label="Coaching navigation" className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">{headerLinks.map((link) => <Link key={link.href} href={link.href} className="hover:text-foreground">{link.label}</Link>)}<Link href="/dashboard" className="hover:text-foreground">Practice</Link></nav>
        <details className="relative md:hidden"><summary className="rounded-md border border-border px-3 py-2 text-sm">Menu</summary><nav aria-label="Mobile coaching navigation" className="absolute right-0 top-12 flex w-48 flex-col gap-2 rounded-lg border border-border bg-background p-4 text-foreground">{headerLinks.map((link) => <Link key={link.href} href={link.href} className="py-2">{link.label}</Link>)}<Link href="/dashboard" className="py-2">Practice workspace</Link></nav></details>
        <span className="hidden sm:block"><Link href="/coaching#hero-cta" className="coaching-button">Start inquiry</Link></span>
      </div>
    </div>
  </header>;
}

const steps = [
  { title: "Choose your pathway", body: "Select general physics consultation, IB/A-Level/IGCSE training, or Tutor inquiry for Olympiad winners applying to teach." },
  { title: "Tell us about your goals", body: "Share your level, goals and preferred language so the team can understand the support you are looking for." },
  { title: "Hear from our team", body: "Once your inquiry is connected, our team will follow up on WhatsApp within two days to discuss tutoring options." },
];

const faqs = [
  { question: "What happens after I send an inquiry?", answer: "Your inquiry is saved securely so our team can review it. We will follow up on WhatsApp within two days." },
  { question: "Which pathways can I choose?", answer: "General physics consultation, IB/A-Level/IGCSE training, or Tutor inquiry for IPhO winners interested in teaching with Physcratic." },
  { question: "Can I inquire on behalf of my child?", answer: "Yes. The inquiry form supports students, parents and tutor applicants. Choose the pathway that matches the support you are looking for." },
  { question: "Which language should I enter?", answer: "Tell us the student’s preferred language for lessons. This is a preference, not confirmation of tutor availability." },
  { question: "How is my information used?", answer: "We use your inquiry details to understand your goals and contact you about coaching options. We do not use them for unrelated marketing." },
];

export function CoachingSections() {
  return <>
    <CoachingTutors />
    <section id="how-it-works" className="border-y border-border py-20">
      <div className="coaching-container flex flex-col items-center gap-10">
        <h2 className="mx-auto max-w-2xl text-center text-balance text-3xl font-bold tracking-tight sm:text-4xl">Start your journey today.</h2>
        <ol className="grid w-full gap-6 md:grid-cols-3">{steps.map((step, index) => <li key={step.title} className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-background p-6 text-center text-foreground"><p className="text-sm font-medium text-accent">Step {index + 1}</p><h3 className="text-xl font-semibold tracking-tight">{step.title}</h3><p className="leading-relaxed text-muted-foreground">{step.body}</p></li>)}</ol>
        <div className="flex flex-wrap justify-center gap-3"><Link href="/coaching#hero-cta" className="coaching-button">Start step 1</Link><Link href="/coaching#tutors" className="coaching-button coaching-button-secondary">Explore our tutors</Link></div>
      </div>
    </section>
    <section aria-labelledby="reviews-title" className="border-b border-border py-20">
      <div className="coaching-container flex flex-col gap-8">
        <div className="flex max-w-2xl flex-col items-center gap-3 self-center text-center"><p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Student reviews</p><h2 id="reviews-title" className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">See what our students are saying.</h2></div>
        <div className="rounded-2xl border border-border bg-foreground/5 p-8 md:p-10"><p className="max-w-3xl text-xl leading-relaxed text-foreground sm:text-2xl">We are collecting reflections from our first coaching sessions now. Student and family feedback will appear here as those sessions are completed.</p><p className="mt-6 text-sm font-medium uppercase tracking-wide text-muted-foreground">Reviews coming soon</p></div>
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
  return <footer className="border-t border-border pb-24 md:pb-0"><div className="coaching-container flex flex-col justify-between gap-8 py-10 text-sm text-muted-foreground md:flex-row"><div className="flex max-w-sm flex-col gap-2"><p className="text-2xl font-semibold text-foreground">Physcratic</p><p className="leading-relaxed">Physics tutoring from International Physics Olympiad medalists.</p></div><nav aria-label="Coaching footer"><ul className="flex flex-wrap items-center gap-x-10 gap-y-3"><li><Link href="/terms" className="hover:text-foreground">Terms & privacy</Link></li><li><a href="https://www.instagram.com/physcratic" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-foreground"><span className="coaching-instagram-icon" aria-hidden="true" />Instagram</a></li></ul></nav></div></footer>;
}
