"use client";

import { useState } from "react";
import Image from "next/image";
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
import { iphoPdf, type IphoPaper } from "@/lib/ipho-archive";

export function IphoPageReader({
  paper,
  initialPage,
  kind = "questions",
}: {
  paper: IphoPaper;
  initialPage: number;
  kind?: "questions" | "solutions";
}) {
  const [page, setPage] = useState(initialPage);
  const total = kind === "questions" ? paper.pages : paper.solutionPages;
  const label = kind === "questions" ? "Original paper" : "Official solution";
  const imagePath = `/ipho/2025-${paper.id}-${kind === "solutions" ? "solution-" : ""}page-${page}.webp`;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label={`Previous ${kind} page`}
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
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
                {Array.from({ length: total }, (_, index) => (
                  <SelectItem key={index} value={String(index + 1)}>
                    Page {index + 1} of {total}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Next ${kind} page`}
            disabled={page === total}
            onClick={() => setPage((value) => value + 1)}
          >
            <ArrowRight />
          </Button>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <a
            href={iphoPdf(paper.id, kind, page)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open PDF
            <ArrowUpRight data-icon="inline-end" />
          </a>
        </Button>
      </div>
      <figure className="min-w-0 overflow-hidden rounded-lg border">
        <a
          href={imagePath}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Enlarge ${paper.code} ${label.toLowerCase()}, page ${page}`}
        >
          <Image
            key={imagePath}
            src={imagePath}
            width={1191}
            height={1684}
            unoptimized
            className="h-auto w-full"
            alt={`${paper.title}: ${label.toLowerCase()}, page ${page}. Includes the original equations, diagrams, and text. Open the PDF for selectable text.`}
          />
        </a>
        <figcaption className="px-3 py-2 text-sm leading-relaxed text-muted-foreground">
          {paper.code} · {label}, page {page} of {total}. Select another page
          for shared setup or continuing derivations. Click the page to enlarge
          it.
        </figcaption>
      </figure>
    </div>
  );
}
