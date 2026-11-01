import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { FeedbackLink } from "@/components/feedback-link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-dvh items-center justify-center bg-background p-5 font-sans"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            Page not found
          </h1>
          <CardDescription>
            This page doesn&apos;t exist or has moved. Check the address, or head
            back to the problems.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard?view=problems">Browse problems</Link>
          </Button>
          <FeedbackLink variant="inline" />
        </CardContent>
      </Card>
    </main>
  );
}
