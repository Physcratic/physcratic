import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { content } from "@/lib/coaching/content";
import type { CoachingPathway } from "@/lib/coaching/consultation";
import { CoachingFooter, CoachingHeader } from "./coaching-sections";
import { CoachingFormLink } from "./coaching-form-link";

type Page = typeof content.consultationPage | typeof content.tutorPage;

/** Short intro plus one button to a Tally form, on the coaching header and footer. */
export function CoachingFormPage({ page, form, pathway }: { page: Page; form: "consultation" | "tutor"; pathway?: CoachingPathway }) {
  return <>
    <a className="sr-only focus:not-sr-only focus:block focus:p-4" href="#coaching-main">{content.ui.skipLink}</a>
    <CoachingHeader base="/coaching" />
    <main id="coaching-main" className="coaching-container py-16 sm:py-20" aria-labelledby="coaching-form-title">
      <div className="flex max-w-2xl flex-col items-start gap-6">
        <Link href="/coaching" className="coaching-link inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" />{page.back}</Link>
        <h1 id="coaching-form-title" className="font-serif text-balance text-4xl leading-[1.1] sm:text-5xl">{page.title}</h1>
        <p className="text-lg leading-relaxed text-foreground/85">{page.intro}</p>
        <div className="flex flex-col items-start gap-3">
          <CoachingFormLink form={form} pathway={pathway} label={page.button} />
          <p className="text-sm leading-relaxed text-muted-foreground">{page.note}</p>
        </div>
      </div>
    </main>
    <CoachingFooter />
  </>;
}
