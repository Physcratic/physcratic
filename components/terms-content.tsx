import { TERMS_SECTIONS } from "@/lib/terms";

// Both public page and signup dialog render the same active policy source.
export function TermsContent({ idPrefix = "" }: { idPrefix?: string }) {
  return <article className="flex flex-col gap-8">
    {TERMS_SECTIONS.map((section, index) => <section key={section.id} id={`${idPrefix}${section.id}`} aria-labelledby={`${idPrefix}${section.id}-heading`} className="flex scroll-mt-8 flex-col gap-3">
      <h2 id={`${idPrefix}${section.id}-heading`} className="text-balance text-xl font-semibold">{index + 1}. {section.title}</h2>
      {section.paragraphs.map((paragraph) => <p key={paragraph} className="text-left text-[15px] leading-7 text-muted-foreground">{paragraph}</p>)}
    </section>)}
  </article>;
}
