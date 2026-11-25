import type { Metadata } from "next";
import { SkipLink } from "@/components/skip-link";
import { CoachingHeader, CoachingFooter } from "@/components/coaching/coaching-sections";
import { CoachingTutors } from "@/components/coaching/coaching-tutors";
import { content } from "@/lib/coaching/content";
import { coachingSocial } from "@/lib/coaching/social";
import { coachDirectoryDescription } from "@/lib/coaching/coach-profile";

export const metadata: Metadata = {
  title: "Physics Olympiad Coaches",
  description: coachDirectoryDescription,
  alternates: { canonical: "/coaching/coaches" },
  ...coachingSocial({ title: "Physics Olympiad Coaches", description: coachDirectoryDescription, url: "/coaching/coaches", withImage: true }),
};

export default function CoachesPage() {
  return <>
    <SkipLink targetId="coaching-main">{content.ui.skipLink}</SkipLink>
    <CoachingHeader base="/coaching" />
    <main id="coaching-main" tabIndex={-1} className="focus:outline-none">
      <CoachingTutors standalone />
    </main>
    <CoachingFooter />
  </>;
}
