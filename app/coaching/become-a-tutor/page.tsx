import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CoachingHeader } from "@/components/coaching/coaching-sections";
import { CoachingInquiryForm } from "@/components/coaching/coaching-inquiry";
import styles from "../coaching.module.css";

export const metadata: Metadata = {
  title: "IPhO / APhO / EuPhO Paid Tutor Inquiry",
  description: "Apply to become a paid physics tutor at Physcratic. Share your Olympiad achievements, languages and contact details with our coaching team.",
  alternates: { canonical: "/coaching/become-a-tutor" },
};

export default function CoachingTutorApplicationPage() {
  return (
    <>
      <CoachingHeader />
      <main className={`${styles.training} coaching-container py-10 sm:py-12`} aria-labelledby="tutor-title">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <Link href="/coaching#hero-cta" className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to coaching
          </Link>
          <header className="flex flex-col gap-4">
            <h1 id="tutor-title" className="font-serif text-balance text-3xl uppercase leading-tight sm:text-4xl">IPhO / APhO / EuPhO paid tutor inquiry</h1>
            <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">For Olympiad medalists interested in becoming a paid physics tutor at Physcratic. Share your IPhO, APhO or EuPhO achievements and the languages you are comfortable speaking.</p>
            <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">This is a tutor application, rather than a request for lessons. Complete the form with your background and contact details; our team will review your experience before discussing next steps.</p>
          </header>
          <CoachingInquiryForm formType="tutor" />
        </div>
      </main>
    </>
  );
}
