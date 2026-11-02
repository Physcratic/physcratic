import type { Metadata } from "next";
import { CoachingFormPage } from "@/components/coaching/coaching-form-page";
import { content } from "@/lib/coaching/content";
import { coachingSocial } from "@/lib/coaching/social";

const { tutorPage } = content;

export const metadata: Metadata = {
  title: tutorPage.meta.title,
  description: tutorPage.meta.description,
  alternates: { canonical: "/coaching/become-a-tutor" },
  // The layout's openGraph and twitter would otherwise be inherited, with the main page's title and url.
  ...coachingSocial({ title: tutorPage.meta.title, description: tutorPage.meta.description, url: "/coaching/become-a-tutor", withImage: true }),
};

export default function CoachingBecomeATutorPage() {
  return <CoachingFormPage page={tutorPage} form="tutor" />;
}
