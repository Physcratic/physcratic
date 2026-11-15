"use client";

import { useId, useState } from "react";
import dynamic from "next/dynamic";
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
import { ProblemHeading } from "./problem-heading";
import { getEstimatedProblemElo } from "@/lib/problem-archive";
import { getProblemTags } from "@/lib/problem-tags";
import { AnswerWorkspace } from "./answer-workspace";
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
  type ImportedProblem,
} from "@/lib/imported-corpus-schema";
import type { CatalogProblem } from "@/lib/corpus-catalog";
import { translationSchema } from "@/lib/corpus-translation";
import translationIndex from "@/lib/corpus/translation-index.json";
import { assessSolutionSource } from "@/lib/corpus-readiness";
import { ImportedSourceContent } from "./imported-source-content";
import { ArchiveAnswerPanel } from "./archive-answer-panel";
import { hasOlympiadAnswerFields } from "@/lib/olympiad/catalog";
import { SolutionSubmissionForm } from "./solution-submission-form";
import { StepHeading, StepNumber, solveTokens } from "./solve-ui";

const PdfPageViewer = dynamic(() => import("./pdf-page-viewer"), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full" />,
});

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
    Math.min(document.initialPage, document.sourcePages.length),
  );
  function changePage(next: number) {
    setPage(next);
    window.document.getElementById(topId)?.scrollIntoView({ block: "start" });
  }
  return (
    <div className="flex min-w-0 flex-col gap-4" id={topId}>
      {document.textExtraction === "image-only" && <p className="text-sm leading-relaxed text-muted-foreground">This original PDF contains scanned pages. Search and screen-reader text may not be available.</p>}
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
            className="size-11"
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
            <SelectTrigger className="h-11 w-40" aria-label={`${label} page`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {document.sourcePages.map((_, index) => (
                  <SelectItem key={index} value={String(index + 1)}>
                    Page {index + 1} of {document.sourcePages.length}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="size-11"
            aria-label={`Next ${label} page`}
            disabled={page === document.sourcePages.length}
            onClick={() => changePage(page + 1)}
          >
            <ArrowRight />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="min-h-11" asChild>
            <a href={`${document.pdf}#page=${page}`} target="_blank" rel="noopener noreferrer">
              <ArrowUpRight data-icon="inline-start" /> Open PDF
            </a>
          </Button>
          <Button variant="outline" className="min-h-11" asChild>
            <a href={document.pdf} download>
              <Download data-icon="inline-start" /> Download PDF
            </a>
          </Button>
        </div>
      </nav>
      <PdfPageViewer file={document.pdf} page={page} label={`${label}, page ${page}`} />
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

function NativeReader({ document, language, kind }: {
  document: Extract<ImportedDocument, { format: "html" }>
  language: "en" | "ru"
  kind: "statement" | "solution"
}) {
  return (
    <>
      {document.referencePdf && (
        <a
          href={document.referencePdf}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
        >
          Open original {kind} PDF
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
      <ImportedSourceContent nodes={document.nodes} language={language} />
    </>
  )
}

export function ImportedProblemReader({
  problem,
  onBack,
  onOpenPilot,
  asPage = false,
  initialData,
}: {
  problem: CatalogProblem;
  onBack: () => void;
  onOpenPilot?: (id: string) => void;
  /** True on the problem's own page, where the title is the page's h1. Inside the library it stays an h2. */
  asPage?: boolean;
  initialData?: ImportedProblem
}) {
  const { data, error, isLoading, mutate } = useSWRImmutable(
    problem.importPath,
    loadProblem,
    { fallbackData: initialData },
  );
  const [tab, setTab] = useState("statement");
  const [language, setLanguage] = useState("en");
  const translationRecord = problem.importLanguage === "ru" ? translationIndex.records.find(
    (record) => record.id === problem.id,
  ) : undefined;
  const {
    data: english,
    error: translationError,
    isLoading: translationLoading,
    mutate: retryTranslation,
  } = useSWRImmutable(
    translationRecord && language === "en" ? translationRecord.path : null,
    loadTranslation,
  );
  const readingData =
    translationRecord && language === "en" ? english?.content : data;
  const readiness = data ? assessSolutionSource(data) : undefined;
  const missingSolution = readiness?.status === "missing-derivation";
  const checkedFields = hasOlympiadAnswerFields(problem.id);
  return (
    <section
      className={`flex min-w-0 flex-col gap-5 ${solveTokens}`}
      aria-labelledby="imported-problem-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" className="min-h-11" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" /> Back to all problems
        </Button>
        {problem.hasPilotGuide && onOpenPilot && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenPilot(problem.id)}
          >
            <BookOpen data-icon="inline-start" /> Structured subpart guide
          </Button>
        )}
      </div>
      <ProblemHeading id="imported-problem-title" as={asPage ? "h1" : "h2"} title={problem.title} lang={problem.titleLanguage} source={`${problem.competition} ${problem.year} · ${problem.code}`} estimate={String(getEstimatedProblemElo(problem.id))} tags={getProblemTags(problem)}>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Complete statement and original diagrams stored in this app.
          {checkedFields ? "Typed final answers can be checked below. Reasoning is for self-review." : "Solution content is checked separately before it can become a grading reference. Automatic grading is not enabled."}
        </p>
        <a
          href={problem.titleSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 w-fit items-center text-sm text-accent-foreground underline underline-offset-4"
        >
          Original title source{" "}
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </ProblemHeading>
      {translationRecord ? (
        <div className="flex flex-col gap-3">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="h-11 w-60" aria-label="Reading language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="en">English · translation draft</SelectItem>
                <SelectItem value="ru">Russian · original source</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Alert>
            <AlertTitle>English translation draft available</AlertTitle>
            <AlertDescription>
              The source prose is translated, not summarized. The Russian
              original, diagrams, and equations are preserved, including source
              notation and any Russian labels or units inside equations.
              Independent physics review is pending. The translation does not
              create missing solution content.
            </AlertDescription>
          </Alert>
        </div>
      ) : problem.importLanguage === "ru" ? (
        <Alert>
          <AlertTitle>English translation pending</AlertTitle>
          <AlertDescription>
            This imported statement is currently in Russian. The problem title
            is retained from the original source. An English title does not mean
            the statement has been translated. English drafts are being added
            separately, with equations, figures and original source text
            retained.
          </AlertDescription>
        </Alert>
      ) : null}
      {missingSolution && (
        <Alert>
          <AlertTitle>Worked solution not available in this import</AlertTitle>
          <AlertDescription>
            {readiness.reason} The original imported page is retained for
            transparency.
          </AlertDescription>
        </Alert>
      )}
      {translationError && language === "en" && (
        <Alert variant="destructive">
          <AlertTitle>Could not load the English draft</AlertTitle>
          <AlertDescription>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => retryTranslation()}
              >
                Retry English
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLanguage("ru")}
              >
                Read Russian original
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {((isLoading && !data) || translationLoading) && (
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
        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <Tabs
          value={tab}
          onValueChange={setTab}
          className="flex min-w-0 flex-col gap-4"
        >
          <TabsList className="h-auto w-fit max-w-full flex-wrap" aria-label="Problem steps">
            <TabsTrigger className="min-h-11" value="statement"><StepNumber>1</StepNumber>Problem statement</TabsTrigger>
            <TabsTrigger className="min-h-11" value="solution">
              <StepNumber>4</StepNumber>{missingSolution ? "Source solution page" : "Worked solution"}
            </TabsTrigger>
          </TabsList>
          {(["statement", "solution"] as const).map((kind) => (
            <TabsContent key={kind} value={kind} className="min-w-0">
              <Card className="min-w-0 shadow-none">
                <CardHeader>
                  <CardTitle>
                    {kind === "statement"
                      ? readingData.language === "en" &&
                        translationRecord &&
                        language === "en"
                        ? "English problem statement"
                        : "Original problem"
                      : missingSolution
                        ? "Imported page · no derivation supplied"
                        : "Worked solution"}
                  </CardTitle>
                  <CardDescription>
                    {kind === "statement"
                      ? "All source subparts, figures and tables are included."
                      : missingSolution
                        ? "This mirror page repeats the questions. It is not a worked solution or a marking rubric."
                        : "Contains spoilers. Compare with your own derivation before self-assessing. Reference review is still pending."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-w-0 overflow-x-auto">
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
                    <NativeReader
                      document={readingData[kind] as Extract<ImportedDocument, { format: "html" }>}
                      language={readingData.language}
                      kind={kind}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
        <AnswerWorkspace>
          <section aria-label="Your solution" className="min-w-0 rounded-xl border bg-card p-5">
            {checkedFields ? <><p className="pb-4 text-sm leading-relaxed text-muted-foreground">Check final answers using the displayed symbols and units. These checks are not saved to account progress and do not award marks or ELO.</p><ArchiveAnswerPanel key={problem.id} problemId={problem.id} saveProgress={false} /><details className="mt-5 rounded-lg border p-4"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">Save full working or attachments</summary><SolutionSubmissionForm key={problem.id} problemId={problem.id} /></details></> : <><StepHeading step={2} className="pb-2">Answer</StepHeading><p className="pb-4 text-sm leading-relaxed text-muted-foreground">Write your solution below. This problem has no automatic check. Compare your work with the worked solution in step 4.</p><SolutionSubmissionForm key={problem.id} problemId={problem.id} /></>}
          </section>
        </AnswerWorkspace>
        </div>
      )}
      <details className="rounded-lg border border-border px-4 py-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">
          Source credits & import details
        </summary>
        <div className="flex flex-col gap-3 pt-4 text-sm leading-relaxed text-muted-foreground">
          <p>{problem.attribution}</p>
          <p>
            Imported {data?.importedOn ?? "2026-10-31"}. Source credits are retained.{" "}
            {problem.rightsNote} Independent physics review is pending.
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
                  className="flex min-h-11 items-center gap-2 break-all underline underline-offset-4"
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
