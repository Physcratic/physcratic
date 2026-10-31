import { TermsContent } from "@/components/terms-content";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TERMS_VERSION } from "@/lib/terms";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the Physcratic Terms of Service for physics practice, accounts, uploaded solutions, and contests.",
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10 font-sans md:py-16">
      <Button variant="ghost" className="w-fit" asChild>
        <Link href="/dashboard"><ArrowLeft data-icon="inline-start" /> Back to Physcratic</Link>
      </Button>
      <header id={`version-${TERMS_VERSION}`} className="flex flex-col gap-3">
        <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">October 2026</p>
      </header>
      <TermsContent />
      <footer className="flex flex-col gap-3 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
        <p>Accept these Terms using the unchecked agreement box when creating your account.</p>
        <Link href="/sign-up" className="w-fit text-foreground underline underline-offset-4">Create an account</Link>
      </footer>
    </main>
  );
}
