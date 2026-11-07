import type { ArchiveStatementView, ProblemPage } from "@/lib/seo/problem-pages";
import { ProblemSourceLine } from "./problem-links";

/**
 * The archive statement as plain HTML on the server, so it is there before any JavaScript runs: the text taken
 * from the official PDF, and the PDF pages as images with alt text (closed by default, and lazy). The
 * interactive reader above it stays as it is.
 */
export function ArchiveStatementText({ page, view }: { page: ProblemPage; view: ArchiveStatementView }) {
  return (
    <section aria-labelledby="statement-text-heading" lang="en" className="flex min-w-0 flex-col gap-4">
      <h2 id="statement-text-heading" className="text-lg font-medium tracking-tight">
        Statement as text
      </h2>
      <ProblemSourceLine page={page} />
      <p className="text-sm leading-relaxed text-muted-foreground">
        Text taken from the official PDF. Equations and figures read better in the PDF pages.
      </p>
      <div className="flex max-w-[70ch] flex-col gap-3 text-base leading-relaxed" data-statement="archive">
        {view.paragraphs.map((paragraph, index) => (
          <p key={index} className="text-pretty">
            {paragraph}
          </p>
        ))}
      </div>
      {view.pageImages.length > 0 && (
        <details className="rounded-lg border border-border px-4 py-3">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">
            PDF pages of {page.competition} {page.year} Problem {page.number}
          </summary>
          <div className="flex flex-col gap-4 pt-4">
            {view.pageImages.map((image) => (
              <figure key={image.src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt={image.alt} loading="lazy" decoding="async" className="h-auto w-full max-w-3xl rounded-md border border-border bg-white" />
              </figure>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
