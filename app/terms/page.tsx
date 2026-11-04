import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TERMS_EFFECTIVE_DATE, TERMS_SECTIONS, TERMS_VERSION } from "@/lib/terms";

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
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">Physcratic · Legal</p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">Terms of Service</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">Effective {TERMS_EFFECTIVE_DATE} · Version {TERMS_VERSION}</p>
      </header>
      <Alert>
        <AlertTitle role="heading" aria-level={2}>Starter terms, pending legal review</AlertTitle>
        <AlertDescription>This is a provisional agreement, not legal advice. Before a public launch, the operator must have it reviewed, add its legal identity and contact details, and publish a separate privacy notice.</AlertDescription>
      </Alert>
      <nav aria-label="Terms sections" className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5 text-card-foreground">
        <h2 className="font-semibold">On this page</h2>
        {TERMS_SECTIONS.map((section) => <Link key={section.id} href={`#${section.id}`} className="inline-flex min-h-11 w-fit items-center text-sm leading-relaxed text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">{section.title}</Link>)}
      </nav>
      <article className="flex flex-col gap-8">
        {TERMS_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="flex scroll-mt-8 flex-col gap-3">
            <h2 id={`${section.id}-heading`} className="text-balance text-xl font-semibold">{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph} className="text-pretty text-base leading-relaxed text-muted-foreground">{paragraph}</p>)}
          </section>
        ))}
      </article>
      <footer className="flex flex-col gap-3 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
        <p>Accept these Terms using the unchecked agreement box when creating your account.</p>
        <Link href="/sign-up" className="inline-flex min-h-11 w-fit items-center text-foreground underline underline-offset-4">Create an account</Link>
      </footer>
    </main>
  );
}
