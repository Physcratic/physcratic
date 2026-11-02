import type { Metadata } from "next";
import { CoachingFormPage } from "@/components/coaching/coaching-form-page";
import { content } from "@/lib/coaching/content";
import { coachingSocial } from "@/lib/coaching/social";

const { consultationPage } = content;

export const metadata: Metadata = {
  title: consultationPage.meta.title,
  description: consultationPage.meta.description,
  alternates: { canonical: "/coaching/consultation" },
  // The layout's openGraph and twitter would otherwise be inherited, with the main page's title and url.
  ...coachingSocial({ title: consultationPage.meta.title, description: consultationPage.meta.description, url: "/coaching/consultation", withImage: true }),
};

export default function CoachingConsultationPage() {
  return <CoachingFormPage page={consultationPage} form="consultation" pathway="Not sure yet" />;
}
