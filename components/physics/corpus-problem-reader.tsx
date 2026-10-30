"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, FileText, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProblemTags } from "@/lib/problem-tags";
import { MathWorkingEditor } from "./math-working-editor";
import { corpusDocument, corpusPilot } from "@/lib/corpus-pilot";
import type { CorpusProblem } from "@/lib/corpus-schema";
import { CorpusDocumentReader } from "./corpus-document-reader";
import { MathFormula } from "./math-formula";

export function CorpusProblemReader({
  problem,
  notes,
  reviewed,
  onNotesChange,
  onReviewToggle,
  onSaveProgress,
  signedIn,
  savedTask,
  saving,
  onBack,
}: {
  problem: CorpusProblem;
  notes: Record<string, string>;
  reviewed: Set<string>;
  onNotesChange: (id: string, value: string) => void;
  onReviewToggle: (id: string) => void;
  onSaveProgress: (id: string) => Promise<void>;
  signedIn: boolean;
  savedTask: string | null;
  saving: boolean;
  onBack: () => void;
}) {
  const [partId, setPartId] = useState(problem.parts[0].id);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const part = problem.parts.find((item) => item.id === partId)!;
  const taskKey = `${problem.id}:${part.id}`;
  const isReviewed = reviewed.has(taskKey);
  const completeCount = problem.parts.filter((item) =>
    reviewed.has(`${problem.id}:${item.id}`),
  ).length;
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section
      className="flex min-w-0 flex-col gap-6"
      aria-labelledby="corpus-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" />
          Back to collection
        </Button>
        <Badge variant="outline">Unrated · self-review only</Badge>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {problem.competition} {problem.year} · {problem.code} ·{" "}
          {problem.totalPoints} points
        </p>
        <h2
          id="corpus-title"
          ref={heading}
          tabIndex={-1}
          className="text-balance text-2xl font-medium tracking-tight outline-none"
        >
          {problem.title}
        </h2>
        <div className="flex flex-wrap gap-2" aria-label="Problem tags">
          {getProblemTags(problem).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <nav
          className="flex shrink-0 flex-col gap-4 lg:sticky lg:top-6 lg:w-56"
          aria-label="Pilot problem subparts"
        >
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {completeCount} of {problem.parts.length} reviewed this session
          </p>
          {problem.sections.map((section) => (
            <div key={section.id} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium leading-relaxed">
                {section.id} · {section.title}
              </h3>
              <div className="flex flex-wrap gap-2 lg:flex-col">
                {problem.parts
                  .filter((item) => item.section === section.id)
                  .map((item) => (
                    <Button
                      key={item.id}
                      variant={item.id === partId ? "secondary" : "ghost"}
                      size="sm"
                      className="justify-start lg:h-auto lg:py-2"
                      aria-current={item.id === partId ? "step" : undefined}
                      aria-label={`${item.id}: ${item.title}`}
                      onClick={() => {
                        setPartId(item.id);
                        setSolutionOpen(false);
                      }}
                    >
                      {reviewed.has(`${problem.id}:${item.id}`) && (
                        <Check data-icon="inline-start" />
                      )}
                      <span className="flex min-w-0 gap-2">
                        <span>{item.id}</span>
                        <span className="hidden text-wrap text-left lg:inline">
                          {item.title}
                        </span>
                      </span>
                    </Button>
                  ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <Card className="min-w-0 shadow-none">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{part.id}</Badge>
                <Badge variant="outline">{part.points.toFixed(1)} points</Badge>
                {isReviewed && (
                  <Badge variant="outline">Reviewed · self-assessed</Badge>
                )}
              </div>
              <CardTitle>
                <h3 className="text-balance text-xl font-medium tracking-tight">
                  {part.title}
                </h3>
              </CardTitle>
              <CardDescription>
                Editorial reading guide · original statement on page {part.page}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-5">
              <p className="text-pretty text-base leading-relaxed">
                {part.prompt}
              </p>
              {part.items && (
                <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed">
                  {part.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {part.model && <MathFormula formula={part.model} />}
              <details className="min-w-0 rounded-lg border p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Reading notes & shared constants
                </summary>
                <div className="flex min-w-0 flex-col gap-4 pt-4">
                  {problem.context.map((block, index) =>
                    block.type === "math" ? (
                      <MathFormula key={index} formula={block.value} />
                    ) : (
                      <p
                        key={index}
                        className="text-sm leading-relaxed text-muted-foreground"
                      >
                        {block.value}
                      </p>
                    ),
                  )}
                </div>
              </details>
              <div className="flex flex-col gap-2">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="size-4" />
                  Complete original statement
                </h4>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The pages below preserve all shared assumptions, equations,
                  tables, and original figures. The text above is a restatement,
                  not a substitute for the complete paper.
                </p>
              </div>
              <CorpusDocumentReader
                key={`${taskKey}:questions`}
                problem={problem}
                initialPage={part.page}
              />
              <MathWorkingEditor
                key={`${taskKey}:working`}
                id="corpus-working"
                value={notes[taskKey] ?? ""}
                onChange={(value) => onNotesChange(taskKey, value)}
                description="Use Save subpart progress below to keep your notes and self-review mark in your private account. Unsaved edits are lost on leaving or refresh. No marks or Elo are awarded."
              />
              <details
                key={taskKey}
                className="min-w-0 rounded-lg border p-4"
                onToggle={(event) => setSolutionOpen(event.currentTarget.open)}
              >
                <summary className="cursor-pointer text-sm font-medium">
                  Reveal official solution · {part.id}
                </summary>
                {solutionOpen && (
                  <div className="flex min-w-0 flex-col gap-4 pt-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Compare the full derivation with your own. The starting
                      page can include neighbouring subparts. Continue through
                      the original solution as needed. Revealing it does not
                      mark your work as correct or reviewed.
                    </p>
                    <CorpusDocumentReader
                      key={`${taskKey}:solution`}
                      problem={problem}
                      kind="solutions"
                      initialPage={part.solutionPage}
                    />
                  </div>
                )}
              </details>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <Button
                variant={isReviewed ? "secondary" : "outline"}
                size="sm"
                aria-pressed={isReviewed}
                onClick={() => onReviewToggle(taskKey)}
              >
                {isReviewed && <Check data-icon="inline-start" />}
                {isReviewed ? "Reviewed · undo" : "Mark as reviewed"}
              </Button>
              {signedIn ? (
                <Button
                  size="sm"
                  onClick={() => onSaveProgress(taskKey)}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save subpart progress"}
                </Button>
              ) : (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/sign-in?returnTo=%2Fdashboard%3Fview%3Dproblems">
                    Sign in to save progress
                  </Link>
                </Button>
              )}
              {savedTask === taskKey && (
                <p role="status" className="text-sm text-muted-foreground">
                  Notes and review mark saved privately.
                </p>
              )}
              <a
                className="inline-flex items-center gap-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                href={
                  corpusDocument(problem, "solutions", part.solutionPage).pdf
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                Official solution PDF
                <ArrowUpRight className="size-4" />
              </a>
            </CardFooter>
          </Card>
          <details className="min-w-0 rounded-lg border p-5">
            <summary className="cursor-pointer text-sm font-medium">
              Source, attribution & import review
            </summary>
            <div className="flex flex-col gap-4 pt-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {problem.attribution}
              </p>
              <a
                href={problem.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
              >
                Official source archive
                <ArrowUpRight className="size-4" />
              </a>
              <dl className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Representation</dt>
                  <dd>Original pages + editorial subpart index</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Physics review</dt>
                  <dd>Independent review pending</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Reuse permission</dt>
                  <dd>Not verified</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Integrity</dt>
                  <dd>SHA-256 asset manifest</dd>
                </div>
              </dl>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {corpusPilot.reuse.notes}
              </p>
            </div>
          </details>
        </div>
      </div>
      <Alert>
        <Info />
        <AlertTitle>Learning, not a rating event</AlertTitle>
        <AlertDescription>
          Reviews are your own learning notes. This pilot has no contest
          submissions, automatic full-problem judging, or Elo changes.
        </AlertDescription>
      </Alert>
    </section>
  );
}
