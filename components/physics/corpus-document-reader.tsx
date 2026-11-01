"use client";

import { useState } from "react";
import { ProblemImage } from "./problem-image";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { corpusDocument } from "@/lib/corpus-pilot";
import type { CorpusProblem } from "@/lib/corpus-schema";

export function CorpusDocumentReader({
  problem,
  kind = "questions",
  initialPage = 1,
}: {
  problem: CorpusProblem;
  kind?: "questions" | "solutions";
  initialPage?: number;
}) {
  const [page, setPage] = useState(
    corpusDocument(problem, kind, initialPage).page,
  );
  const document = corpusDocument(problem, kind, page);
  const label =
    kind === "questions" ? "Original statement" : "Official solution";

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label={`Previous ${label.toLowerCase()} page`}
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ArrowLeft />
          </Button>
          <Select
            value={String(page)}
            onValueChange={(value) => setPage(Number(value))}
          >
            <SelectTrigger className="w-36" aria-label={`${label} page`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Array.from({ length: document.pages }, (_, index) => (
                  <SelectItem key={index} value={String(index + 1)}>
                    Page {index + 1} of {document.pages}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Next ${label.toLowerCase()} page`}
            disabled={page === document.pages}
            onClick={() => setPage(page + 1)}
          >
            <ArrowRight />
          </Button>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <a href={document.pdf} target="_blank" rel="noopener noreferrer">
            Open PDF
            <ArrowUpRight data-icon="inline-end" />
          </a>
        </Button>
      </div>
      <figure className="min-w-0 overflow-hidden rounded-lg border">
        <ProblemImage
          src={document.image}
          enlargeHref={document.image}
          enlargeLabel={`Enlarge ${problem.year} ${problem.code} ${label.toLowerCase()}, page ${page}`}
          alt={`IPhO ${problem.year}, ${problem.title}, ${label.toLowerCase()}, page ${page}. Original text, equations, figures, and tables; the PDF provides selectable text.`}
          width={1191}
          height={1684}
          className="h-auto w-full"
        />
        <figcaption className="px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          IPhO {problem.year} · {problem.code} · Page {page} of {document.pages}
          . Original layout preserved. Select another page for shared setup;
          click to enlarge.
        </figcaption>
      </figure>
    </div>
  );
}
