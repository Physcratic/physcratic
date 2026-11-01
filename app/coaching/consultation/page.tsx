import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CoachingHeader } from "@/components/coaching/coaching-sections";
import { CoachingInquiryForm } from "@/components/coaching/coaching-inquiry";
import styles from "../coaching.module.css";

export const metadata: Metadata = {
  title: "General Physics Consultation",
  description: "Book a Physcratic physics consultation as a student or parent. Tell us about the student’s level, physics experience and preferred languages.",
  alternates: { canonical: "/coaching/consultation" },
};

export default function CoachingConsultationPage() {
  return (
    <>
      <CoachingHeader />
      <main className={`${styles.training} coaching-container py-10 sm:py-12`} aria-labelledby="consultation-title">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <Link href="/coaching#hero-cta" className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to coaching
          </Link>
          <header className="flex flex-col gap-4">
            <h1 id="consultation-title" className="font-serif text-balance text-3xl uppercase leading-tight sm:text-4xl">Physcratic consultation</h1>
            <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">Tell us a little about the student so we can help you find the right physics support.</p>
          </header>
          <CoachingInquiryForm formType="consultation" />
        </div>
      </main>
    </>
  );
}
