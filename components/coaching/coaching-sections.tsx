import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CoachingTutors } from "./coaching-tutors";

const sectionLinks = [{ href: "/coaching#tutors", label: "Our tutors" }, { href: "/coaching#how-it-works", label: "How it works" }, { href: "/coaching#faq", label: "FAQ" }];

export function CoachingHeader() {
  return <header className="coaching-header">
    <div className="coaching-container flex h-16 items-center justify-between gap-3">
      <Link href="/coaching" className="flex shrink-0 items-center gap-2.5" aria-label="Physcratic coaching home"><Image src="/coaching/physcratic-logo.png" alt="" width={40} height={40} priority className="size-9 object-contain" /><span className="text-xl font-semibold tracking-tight sm:text-2xl">Physcratic</span></Link>
      <div className="flex items-center gap-3 md:gap-7">
        <nav aria-label="Coaching navigation" className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">{sectionLinks.map((link) => <Link key={link.href} href={link.href} className="hover:text-foreground">{link.label}</Link>)}<Link href="/dashboard" className="hover:text-foreground">Practice</Link></nav>
        <details className="relative md:hidden"><summary className="rounded-md border border-border px-3 py-2 text-sm">Menu</summary><nav aria-label="Mobile coaching navigation" className="absolute right-0 top-12 flex w-48 flex-col gap-2 rounded-lg border border-border bg-background p-4 text-foreground shadow-lg">{sectionLinks.map((link) => <Link key={link.href} href={link.href} className="py-2">{link.label}</Link>)}<Link href="/dashboard" className="py-2">Practice workspace</Link></nav></details>
        <span className="hidden sm:block"><Link href="/coaching#hero-cta" className="coaching-button">Start inquiry</Link></span>
      </div>
    </div>
  </header>;
}

const steps = [
  { title: "Choose your pathway", body: "Select general physics consultation, IB/A-Level/IGCSE training, or Tutor inquiry for Olympiad winners applying to teach." },
  { title: "Tell us about your goals", body: "Share your level, goals and preferred language so the team can understand the support you are looking for." },
  { title: "Hear from our team", body: "Once inquiries are connected, our team will follow up on WhatsApp to discuss tutoring options." },
];

const faqs = [
  { question: "What happens after I send an inquiry?", answer: "This page currently previews the coaching design. Inquiry submissions are not connected yet, so nothing entered here is sent or saved." },
  { question: "Which pathways can I choose?", answer: "General physics consultation, IB/A-Level/IGCSE training, or Tutor inquiry for IPhO winners interested in teaching with Physcratic." },
  { question: "Can I inquire on behalf of my child?", answer: "Yes. The inquiry design supports students, parents and tutor applicants. Choose the pathway that matches the support you are looking for." },
  { question: "Which language should I enter?", answer: "Tell us the student’s preferred language for lessons. This is a preference, not confirmation of tutor availability." },
  { question: "How is my information used?", answer: "The transferred design does not collect, submit or store inquiry information. The original project’s database, booking system and funnel tracking have not been imported." },
];

export function CoachingSections() {
  return <>
    <CoachingTutors />
    <section id="how-it-works" className="border-y border-border py-20">
      <div className="coaching-container flex flex-col gap-10">
        <h2 className="max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">A clear first step toward physics support.</h2>
        <ol className="grid gap-6 md:grid-cols-3">{steps.map((step, index) => <li key={step.title} className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-6 text-foreground"><p className="text-sm font-medium text-accent">Step {index + 1}</p><h3 className="text-xl font-semibold tracking-tight">{step.title}</h3><p className="leading-relaxed text-muted-foreground">{step.body}</p></li>)}</ol>
        <div><Link href="/coaching#hero-cta" className="coaching-button">Start step 1</Link></div>
      </div>
    </section>
    <section id="faq" className="border-b border-border py-20">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-5">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h2>
        <div className="divide-y divide-border border-y border-border">{faqs.map((item) => <details key={item.question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">{item.question}<Plus className="size-5 shrink-0 text-accent transition-transform group-open:rotate-45" aria-hidden="true" /></summary><p className="pt-3 leading-relaxed text-muted-foreground">{item.answer}</p></details>)}</div>
      </div>
    </section>
    <section className="py-20"><div className="coaching-container flex flex-col items-start justify-between gap-8 md:flex-row md:items-center"><div className="flex max-w-xl flex-col gap-3"><h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Tell us what you want to work on.</h2><p className="leading-relaxed text-muted-foreground">Explore the coaching pathways and preview your first step toward one-to-one physics support.</p></div><Link href="/coaching#hero-cta" className="coaching-button shrink-0">Start your inquiry</Link></div></section>
  </>;
}

export function CoachingFooter() {
  return <footer className="border-t border-border pb-24 md:pb-0"><div className="coaching-container flex flex-col justify-between gap-8 py-10 text-sm text-muted-foreground md:flex-row"><div className="flex max-w-sm flex-col gap-2"><p className="text-2xl font-semibold text-foreground">Physcratic</p><p className="leading-relaxed">Physics tutoring from International Physics Olympiad medalists.</p></div><nav aria-label="Coaching footer"><ul className="grid grid-cols-2 gap-x-10 gap-y-3">{sectionLinks.map((link) => <li key={link.href}><Link href={link.href} className="hover:text-foreground">{link.label}</Link></li>)}<li><Link href="/dashboard" className="hover:text-foreground">Practice workspace</Link></li><li><Link href="/terms" className="hover:text-foreground">Terms & privacy</Link></li><li><a href="https://www.instagram.com/physcratic" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Instagram</a></li></ul></nav></div></footer>;
}
