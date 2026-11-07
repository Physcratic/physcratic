"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { ErrorReference, FeedbackLink } from "@/components/feedback-link";

export default function Error({
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
    <main
      id="main-content"
      className="flex min-h-dvh items-center justify-center bg-background p-5 font-sans"
    >
      <Card className="w-full max-w-md" role="alert">
        <CardHeader>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            This page could not be shown
          </h1>
          <CardDescription>
            Try again. If the error keeps happening, go back to the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => reset()}>Try again</Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
            <FeedbackLink variant="inline" errorRef={error.digest} />
          </div>
          {error.digest ? <ErrorReference digest={error.digest} /> : null}
        </CardContent>
      </Card>
    </main>
  );
}
