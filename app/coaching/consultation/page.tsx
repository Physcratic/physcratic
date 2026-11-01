import type { Metadata } from "next";
import { CoachingFormPage } from "@/components/coaching/coaching-form-page";
import { content } from "@/lib/coaching/content";

const { consultationPage } = content;

export const metadata: Metadata = {
  title: consultationPage.meta.title,
  description: consultationPage.meta.description,
  alternates: { canonical: "/coaching/consultation" },
};

export default function CoachingConsultationPage() {
  return <CoachingFormPage page={consultationPage} form="consultation" pathway="Not sure yet" />;
}
