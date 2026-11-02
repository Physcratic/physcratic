"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildFeedbackHref, feedbackBase } from "@/lib/feedback";

type Props = {
  variant: "nav" | "inline" | "text";
  /** Error digest, passed to the form as the `ref` hidden field. */
  errorRef?: string;
};

function currentPage(): string {
  return window.location.pathname + window.location.search;
}

export function FeedbackLink({ variant, errorRef }: Props) {
  const pathname = usePathname() ?? "";
  const [href, setHref] = React.useState(() =>
    buildFeedbackHref(feedbackBase, { page: pathname, ref: errorRef }),
  );

  // Set on mount and whenever the route changes.
  React.useEffect(() => {
    setHref(
      buildFeedbackHref(feedbackBase, { page: currentPage(), ref: errorRef }),
    );
  }, [pathname, errorRef]);

  if (!href) return null;

  // Refresh just before navigation so query changes made without a route
  // change (and middle-click / copy-link) still carry the current URL.
  function refresh(event: React.SyntheticEvent<HTMLAnchorElement>) {
    const fresh = buildFeedbackHref(feedbackBase, {
      page: currentPage(),
      ref: errorRef,
    });
    if (fresh) event.currentTarget.href = fresh;
  }

  const external = href.startsWith("https:");
  const linkProps = {
    href,
    onClick: refresh,
    onAuxClick: refresh,
    onPointerDown: refresh,
    onFocus: refresh,
    ...(external ? { target: "_blank", rel: "noopener noreferrer" } : {}),
  };

  if (variant === "nav") {
    return (
      <Button asChild variant="ghost" size="sm">
        <a {...linkProps} aria-label="Send beta feedback">
          <MessageSquare aria-hidden="true" />
          <span className="hidden font-normal md:inline">Feedback</span>
        </a>
      </Button>
    );
  }

  if (variant === "text") {
    return (
      <a
        {...linkProps}
        className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Feedback
        {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </a>
    );
  }

  return (
    <Button asChild variant="outline">
      <a {...linkProps}>
        <MessageSquare aria-hidden="true" />
        Send feedback
        {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </a>
    </Button>
  );
}

/** "Reference: <digest>" with a copy button that survives a missing clipboard. */
export function ErrorReference({ digest }: { digest: string }) {
  const [status, setStatus] = React.useState("");

  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(digest);
      setStatus("Copied");
    } catch {
      setStatus("Could not copy. Select the reference and copy it manually.");
    }
  }

  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted-foreground">
        Reference:{" "}
        <code className="select-all rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
          {digest}
        </code>
      </p>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        Copy reference
      </Button>
      <p role="status" className="min-h-5 text-muted-foreground">
        {status}
      </p>
    </div>
  );
}
