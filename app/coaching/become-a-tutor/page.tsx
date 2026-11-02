import type { Metadata } from "next";
import { CoachingFormPage } from "@/components/coaching/coaching-form-page";
import { content } from "@/lib/coaching/content";

const { tutorPage } = content;

export const metadata: Metadata = {
  title: tutorPage.meta.title,
  description: tutorPage.meta.description,
  alternates: { canonical: "/coaching/become-a-tutor" },
};

export default function CoachingBecomeATutorPage() {
  return <CoachingFormPage page={tutorPage} form="tutor" />;
}
