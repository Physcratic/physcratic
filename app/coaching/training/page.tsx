import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CoachingTrainingForm } from "@/components/coaching/coaching-training-form";
import styles from "../coaching.module.css";

export const metadata: Metadata = {
  title: "IB / A-Level / IGCSE Training",
  description: "Tell us about your grade, program and preferred language to get started with one-to-one IB, A-Level or IGCSE physics training at Physcratic.",
  alternates: { canonical: "/coaching/training" },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function CoachingTrainingPage() {
  return (
    <main className={`${styles.training} px-6 py-12 font-sans sm:py-20`} aria-labelledby="training-title">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
        <Link href="/coaching#hero-cta" className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to coaching
        </Link>
        <h1 id="training-title" className="text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">IB/A-Level/IGCSE Training</h1>
        <CoachingTrainingForm />
      </div>
    </main>
  );
}
