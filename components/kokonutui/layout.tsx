import type { ReactNode } from "react";
import type { View } from "@/lib/physics";
import { SkipLink } from "@/components/skip-link";
import Sidebar from "./sidebar";
import TopNav from "./top-nav";
import { communityProfilesEnabled } from "@/lib/community/profile-route";
import { ProfileSetupPrompt } from "@/components/community/profile-setup-prompt";
import { GuidedTour } from "@/components/tour/guided-tour";

export default function Layout({
  children,
  view,
  topic,
  stickyHeader = false,
}: {
  children: ReactNode;
  view: View;
  topic?: string;
  /** Public browse pages keep the mobile menu inside a visible header while scrolling. */
  stickyHeader?: boolean;
}) {
  return (
    <div className="flex min-h-dvh font-sans">
      <SkipLink targetId="main-content">Skip to content</SkipLink>
      <GuidedTour tourId="welcome" />
      <Sidebar view={view} topic={topic} />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <TopNav view={view} topic={topic} sticky={stickyHeader} />
        <main id="main-content" tabIndex={-1} className={`flex-1 p-5 focus:outline-none sm:p-8 xl:p-10${stickyHeader ? " scroll-mt-[72px]" : ""}`}>
          <div className="mx-auto w-full max-w-7xl">{communityProfilesEnabled() && <ProfileSetupPrompt />}{children}</div>
        </main>
      </div>
    </div>
  );
}
