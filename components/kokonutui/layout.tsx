import type { ReactNode } from "react";
import type { View } from "@/lib/physics";
import { SkipLink } from "@/components/skip-link";

import TopNav from "./top-nav";
import Sidebar from "./sidebar";
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
    <div className="workspace-shell flex min-h-dvh flex-col font-sans">
      <SkipLink targetId="main-content">Skip to content</SkipLink>
      <GuidedTour tourId="welcome" />

      <TopNav view={view} topic={topic} sticky={stickyHeader} />
      <Sidebar view={view} topic={topic} />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <main id="main-content" tabIndex={-1} className={`relative z-0 flex-1 p-5 focus:outline-none sm:p-6 xl:p-7${stickyHeader ? " scroll-mt-24" : ""}`}>
          <div className="mx-auto w-full max-w-7xl">{communityProfilesEnabled() && <ProfileSetupPrompt />}{children}</div>
        </main>
      </div>
    </div>
  );
}
