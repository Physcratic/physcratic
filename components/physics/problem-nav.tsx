"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { problemBackHref, problemBackLabel, showProblemCrumbs } from "@/lib/problem-back";

/**
 * The one way back from a problem page. The page is built once and has no session, so the server HTML links to the
 * public library. A signed-in person gets the dashboard list as soon as the session is known. An archive problem passes
 * its own archive list and keeps it for everyone.
 */
export function ProblemBackLink({ archiveHref }: { archiveHref?: string }) {
  const { data } = authClient.useSession();
  const href = problemBackHref({ signedIn: Boolean(data?.user), archiveHref });
  return (
    <Link href={href} className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-md text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <ArrowLeft aria-hidden="true" className="size-4" />
      {problemBackLabel}
    </Link>
  );
}

/**
 * Shows its children to guests and to crawlers, which get them in the server HTML. A signed-in person does not see them
 * once the session is known. The structured data is separate and is on the page for everyone.
 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { data } = authClient.useSession();
  return showProblemCrumbs(Boolean(data?.user)) ? <>{children}</> : null;
}
