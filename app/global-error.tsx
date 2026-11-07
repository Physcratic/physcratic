"use client";

import "./globals.css";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorReference, FeedbackLink } from "@/components/feedback-link";

// Runs when the root layout itself failed: no ThemeProvider, no next/font.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-background font-sans text-foreground antialiased">
        <main
          id="main-content"
          className="flex min-h-dvh items-center justify-center p-5"
        >
          <div
            role="alert"
            className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 text-card-foreground shadow-sm"
          >
            <h1 className="text-2xl font-semibold leading-none tracking-tight">
              This page could not be shown
            </h1>
            <p className="text-sm text-muted-foreground">
              Try again. If the error keeps happening, go back to the dashboard.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => reset()}>Try again</Button>
              <Button asChild variant="secondary">
                {/* Plain anchor: the router may be unavailable here. */}
                <a href="/dashboard">Go to dashboard</a>
              </Button>
              <FeedbackLink variant="inline" errorRef={error.digest} />
            </div>
            {error.digest ? <ErrorReference digest={error.digest} /> : null}
          </div>
        </main>
      </body>
    </html>
  );
}
