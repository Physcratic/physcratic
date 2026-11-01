import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CoachingHeader } from "@/components/coaching/coaching-sections";
import { CoachingTrainingForm } from "@/components/coaching/coaching-training-form";
import styles from "../coaching.module.css";

export const metadata: Metadata = {
  title: "IB / A-Level / IGCSE Training",
  description: "Tell us about your grade, program and preferred language to get started with one-to-one IB, A-Level or IGCSE physics training at Physcratic.",
  alternates: { canonical: "/coaching/training" },
};

export default function CoachingTrainingPage() {
  return (
    <>
      <CoachingHeader />
      <main className={`${styles.training} coaching-container py-10 sm:py-12`} aria-labelledby="training-title">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <Link href="/coaching#hero-cta" className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to coaching
          </Link>
          <header className="flex flex-col gap-4">
            <h1 id="training-title" className="font-serif text-balance text-3xl uppercase leading-tight sm:text-4xl">IB / A-Level / IGCSE training</h1>
            <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">For students studying IB, A-Level or IGCSE physics who want one-to-one help with course concepts, problem-solving and exam preparation.</p>
            <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">Choose your program and tell us your grade, preferred language and WhatsApp number. Our team will use these details to discuss suitable physics tutoring options with you.</p>
          </header>
          <CoachingTrainingForm />
        </div>
      </main>
    </>
  );
}
