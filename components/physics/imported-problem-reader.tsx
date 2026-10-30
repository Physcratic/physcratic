"use client";

import { useId, useState } from "react";
import Image from "next/image";
import useSWRImmutable from "swr/immutable";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Download,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  importedProblemSchema,
  type ImportedDocument,
} from "@/lib/imported-corpus-schema";
import type { CatalogProblem } from "@/lib/corpus-catalog";
import { translationSchema } from "@/lib/corpus-translation";
import translationIndex from "@/lib/corpus/translation-index.json";
import { assessSolutionSource } from "@/lib/corpus-readiness";
import { ImportedSourceContent } from "./imported-source-content";
import { SolutionSubmissionForm } from "./solution-submission-form";

async function loadProblem(url: string) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error("The imported document could not be loaded.");
  return importedProblemSchema.parse(await response.json());
}

async function loadTranslation(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("The English draft could not be loaded.");
  return translationSchema.parse(await response.json());
}

function PdfReader({
  document,
  label,
}: {
  document: Extract<ImportedDocument, { format: "pdf" }>;
  label: string;
}) {
  const topId = useId();
  const [page, setPage] = useState(
    Math.min(document.initialPage, document.pages.length),
  );
  const image = document.pages[page - 1];
  const [failedImage, setFailedImage] = useState<string | null>(null);
  function changePage(next: number) {
    setPage(next);
    window.document.getElementById(topId)?.scrollIntoView({ block: "start" });
  }
  return (
    <div className="flex min-w-0 flex-col gap-4" id={topId}>
      {document.shared && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          This original document contains several problems. Locate the problem
          by its T-code. The complete shared setup and diagrams are preserved.
        </p>
      )}
      <nav
        className="flex flex-wrap items-center justify-between gap-3"
        aria-label={`${label} pages`}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label={`Previous ${label} page`}
            disabled={page === 1}
            onClick={() => changePage(page - 1)}
          >
            <ArrowLeft />
          </Button>
          <Select
            value={String(page)}
            onValueChange={(value) => changePage(Number(value))}
          >
            <SelectTrigger className="w-40" aria-label={`${label} page`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {document.pages.map((_, index) => (
                  <SelectItem key={index} value={String(index + 1)}>
                    Page {index + 1} of {document.pages.length}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Next ${label} page`}
            disabled={page === document.pages.length}
            onClick={() => changePage(page + 1)}
          >
            <ArrowRight />
          </Button>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={document.pdf} download>
            <Download data-icon="inline-start" /> Download local PDF
          </a>
        </Button>
      </nav>
      <figure className="min-w-0 overflow-hidden rounded-lg border border-border">
        {failedImage === image.src ? (
          <Alert>
            <AlertTitle>Page image could not load</AlertTitle>
            <AlertDescription>
              The complete imported PDF is still available using the download
              button above.
            </AlertDescription>
          </Alert>
        ) : (
          <a
            href={image.src}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Enlarge ${label}, page ${page}`}
          >
            <Image
              src={image.src}
              alt={`${label}, page ${page} of ${document.pages.length}. Original equations, diagrams and tables. Selectable text is available below.`}
              width={image.width}
              height={image.height}
              unoptimized
              className="h-auto w-full"
              onError={() => setFailedImage(image.src)}
            />
          </a>
        )}
        <figcaption className="px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          {label} · Page {page} of {document.pages.length} · Original layout ·
          Click to enlarge
        </figcaption>
      </figure>
      <details className="rounded-lg border border-border px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium">
          Selectable source text
        </summary>
        <p className="py-3 text-sm leading-relaxed text-muted-foreground">
          Extracted from the original PDF for searching and accessibility.
          Formula positioning may differ. Use the original page for
          authoritative notation.
        </p>
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
          {document.text}
        </pre>
      </details>
      {"appendix" in document && document.appendix && (
        <details className="rounded-lg border border-border px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">
            Shared constants and data sheet
          </summary>
          <div className="pt-4">
            <PdfReader document={document.appendix} label="Data sheet" />
          </div>
        </details>
      )}
    </div>
  );
}

export function ImportedProblemReader({
  problem,
  onBack,
  onOpenPilot,
}: {
  problem: CatalogProblem;
  onBack: () => void;
  onOpenPilot: (id: string) => void;
}) {
  const { data, error, isLoading, mutate } = useSWRImmutable(
    `/corpus/problems/${problem.id}.json`,
    loadProblem,
  );
  const [tab, setTab] = useState("statement");
  const [language, setLanguage] = useState("en");
  const translationRecord = translationIndex.records.find((record) => record.id === problem.id);
  const { data: english, error: translationError, isLoading: translationLoading, mutate: retryTranslation } = useSWRImmutable(
    translationRecord && language === "en" ? translationRecord.path : null,
    loadTranslation,
  );
  const readingData = translationRecord && language === "en" ? english?.content : data;
  const readiness = data ? assessSolutionSource(data) : undefined;
  const missingSolution = readiness?.status === "missing-derivation";
  return (
    <section
      className="flex min-w-0 flex-col gap-5"
      aria-labelledby="imported-problem-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" /> Back to all 100 problems
        </Button>
        {problem.hasPilotGuide && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenPilot(problem.id)}
          >
            <BookOpen data-icon="inline-start" /> Structured subpart guide
          </Button>
        )}
      </div>
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {problem.competition} {problem.year} · {problem.code}
          </Badge>
          <Badge variant="outline">Imported · Unrated</Badge>
          <Badge variant="outline">
            {problem.importLanguage === "ru"
              ? "Russian source"
              : "English source"}
          </Badge>
        </div>
        <h2
          id="imported-problem-title"
          className="text-balance text-2xl font-medium tracking-tight"
        >
          {problem.title}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Complete statement and original diagrams stored in this app. Solution
          content is checked separately before it can become a grading reference.
          Unrated. Automatic grading is not enabled.
        </p>
      </header>
      {translationRecord ? (
        <div className="flex flex-col gap-3">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-60" aria-label="Reading language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="en">English · translation draft</SelectItem>
              <SelectItem value="ru">Russian · original source</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
          <Alert>
            <AlertTitle>English translation draft available</AlertTitle>
            <AlertDescription>
              The source prose is translated, not summarized. The Russian original,
              diagrams, and equations are preserved, including source notation and
              any Russian labels or units inside equations. Independent physics
              review is pending. The translation does not create missing solution content.
            </AlertDescription>
          </Alert>
        </div>
      ) : problem.importLanguage === "ru" ? (
        <Alert>
          <AlertTitle>English translation pending</AlertTitle>
          <AlertDescription>
            This complete source is currently in Russian. Its English catalog
            title is not a translated statement. English drafts are being added
            separately, with equations, figures and original source text retained.
          </AlertDescription>
        </Alert>
      ) : null}
      {missingSolution && (
        <Alert>
          <AlertTitle>Worked solution not available in this import</AlertTitle>
          <AlertDescription>{readiness.reason} The original imported page is retained for transparency.</AlertDescription>
        </Alert>
      )}
      {translationError && language === "en" && (
        <Alert variant="destructive">
          <AlertTitle>Could not load the English draft</AlertTitle>
          <AlertDescription>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={() => retryTranslation()}>Retry English</Button>
              <Button variant="outline" size="sm" onClick={() => setLanguage("ru")}>Read Russian original</Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {(isLoading || translationLoading) && (
        <div role="status" className="flex flex-col gap-4">
          <span className="text-sm text-muted-foreground">
            Loading imported statement and solution…
          </span>
          <Skeleton className="h-96 w-full" />
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not open the imported problem</AlertTitle>
          <AlertDescription>
            <p>The local document failed to load. Please retry.</p>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RotateCcw data-icon="inline-start" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {readingData && (
        <Tabs
          value={tab}
          onValueChange={setTab}
          className="flex min-w-0 flex-col gap-4"
        >
          <TabsList className="h-auto w-fit max-w-full flex-wrap">
            <TabsTrigger value="statement">Problem statement</TabsTrigger>
            <TabsTrigger value="solution">{missingSolution ? "Source solution page" : "Worked solution"}</TabsTrigger>
            <TabsTrigger value="submission">Your solution</TabsTrigger>
          </TabsList>
          {(["statement", "solution"] as const).map((kind) => (
            <TabsContent key={kind} value={kind} className="min-w-0">
              <Card className="min-w-0 shadow-none">
                <CardHeader>
                  <CardTitle>
                    {kind === "statement"
                      ? readingData.language === "en" && translationRecord && language === "en" ? "English problem statement" : "Original problem"
                      : missingSolution ? "Imported page · no derivation supplied" : "Worked solution"}
                  </CardTitle>
                  <CardDescription>
                    {kind === "statement"
                      ? "All source subparts, figures and tables are included."
                      : missingSolution ? "This mirror page repeats the questions. It is not a worked solution or a marking rubric." : "Contains spoilers. Compare with your own derivation before self-assessing. Reference review is still pending."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-w-0">
                  {readingData[kind].format === "pdf" ? (
                    <PdfReader
                      key={kind}
                      document={
                        readingData[kind] as Extract<
                          ImportedDocument,
                          { format: "pdf" }
                        >
                      }
                      label={`${problem.competition} ${problem.year} ${problem.code} ${kind}`}
                    />
                  ) : (
                    <ImportedSourceContent
                      nodes={
                        (
                          readingData[kind] as Extract<
                            ImportedDocument,
                            { format: "html" }
                          >
                        ).nodes
                      }
                      language={readingData.language}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
          <TabsContent value="submission" className="min-w-0">
            <SolutionSubmissionForm key={problem.id} problemId={problem.id} />
          </TabsContent>
        </Tabs>
      )}
      <details className="rounded-lg border border-border px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium">
          Source credits & import details
        </summary>
        <div className="flex flex-col gap-3 pt-4 text-sm leading-relaxed text-muted-foreground">
          <p>{problem.attribution}</p>
          <p>
            Imported 28 October 2026. Source credits are retained. Importing
            does not establish republication permission. Rights review and
            independent physics review are pending.
          </p>
          {data?.sources.map((source) => (
            <div key={source.kind} className="flex flex-col gap-2">
              <span className="font-medium capitalize text-foreground">
                {source.kind}
                {source.archiveMember ? ` · ${source.archiveMember}` : ""}
              </span>
              {source.note && <p>{source.note}</p>}
              {(source.urls ?? [source.url]).map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 break-all underline underline-offset-4"
                >
                  Original source <ArrowUpRight className="size-4 shrink-0" />
                  <span className="sr-only">{url}</span>
                </a>
              ))}
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
