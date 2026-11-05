"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProblemTags } from "@/lib/problem-tags";
import { MathWorkingEditor } from "./math-working-editor";
import { PlainMathCheck } from "./plain-math-check";
import { corpusDocument, corpusPilot } from "@/lib/corpus-pilot";
import type { CorpusProblem } from "@/lib/corpus-schema";
import { CorpusDocumentReader } from "./corpus-document-reader";
import { MathFormula } from "./math-formula";
import { assignPartColors } from "@/lib/part-colors";
import { PartChip, SolveSteps, StepHeading, partBorder, partStyle, proseWidth, solveTokens } from "./solve-ui";

export function CorpusProblemReader({
  problem,
  notes,
  reviewed,
  onNotesChange,
  onReviewToggle,
  onSaveProgress,
  signedIn,
  sessionPending = false,
  disabled = false,
  savedTask,
  saving,
  onBack,
  titleAs: Title = "h2",
}: {
  problem: CorpusProblem;
  notes: Record<string, string>;
  reviewed: Set<string>;
  onNotesChange: (id: string, value: string) => void;
  onReviewToggle: (id: string) => void;
  onSaveProgress: (id: string) => Promise<void>;
  signedIn: boolean;
  /** True while it is still unknown whether the visitor is signed in. */
  sessionPending?: boolean;
  /** True while saved notes are loading or saving, or could not be loaded. Only the notes and the buttons are locked. */
  disabled?: boolean;
  savedTask: string | null;
  saving: boolean;
  onBack: () => void;
  /** h1 when this problem is the whole page, h2 otherwise. */
  titleAs?: "h1" | "h2";
}) {
  const [partId, setPartId] = useState(problem.parts[0].id);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const part = problem.parts.find((item) => item.id === partId)!;
  // Colour by position, so A.1 and A.2 share A's colour. The label text is always shown too.
  const colours = assignPartColors(problem.parts.map((item) => item.id));
  const colour = colours[problem.parts.findIndex((item) => item.id === partId)] ?? 0;
  const box = `min-w-0 rounded-lg border p-4 ${partBorder}`;
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
      className={`flex min-w-0 flex-col gap-6 ${solveTokens}`}
      aria-labelledby="corpus-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="min-h-11" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" />
          Back to collection
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {problem.competition} {problem.year} · {problem.code} ·{" "}
          {problem.totalPoints} points
        </p>
        <Title
          id="corpus-title"
          ref={heading}
          tabIndex={-1}
          className="text-balance text-2xl font-medium tracking-tight outline-none"
        >
          {problem.title}
        </Title>
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
                      style={partStyle(colours[problem.parts.indexOf(item)] ?? 0)}
                      variant={item.id === partId ? "secondary" : "ghost"}
                      size="sm"
                      className={`min-h-11 justify-start rounded-l-none border lg:h-auto lg:py-2 ${partBorder}`}
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
          <Card style={partStyle(colour)} className={`min-w-0 shadow-none ${partBorder}`}>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <PartChip index={colour}>{part.id}</PartChip>
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
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-5">
              <SolveSteps />
              <StepHeading step={1}>Read the problem</StepHeading>
              <p className={`text-pretty text-base leading-relaxed ${proseWidth}`}>
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
              <details style={partStyle(colour)} className={box}>
                <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-2 text-sm font-medium">
                  <PartChip index={colour}>{part.id}</PartChip>
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
              <CorpusDocumentReader
                key={`${taskKey}:questions`}
                problem={problem}
                initialPage={part.page}
              />
              <StepHeading step={2}>Answer</StepHeading>
              {signedIn ? (
                <fieldset disabled={disabled} className="min-w-0">
                  <MathWorkingEditor
                    key={`${taskKey}:working`}
                    id="corpus-working"
                    value={notes[taskKey] ?? ""}
                    onChange={(value) => onNotesChange(taskKey, value)}
                    description="Use Save subpart progress below to keep your notes and self-review mark in your private account. Unsaved edits are lost on leaving or refresh. No marks or ELO are awarded."
                  />
                </fieldset>
              ) : sessionPending ? (
                <p role="status" className="text-sm text-muted-foreground">Checking whether you are signed in…</p>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-muted-foreground">Sign in to keep working notes. You can read the problem and open the official solution without an account.</p>
                  <PlainMathCheck />
                </>
              )}
              <StepHeading step={3}>Check</StepHeading>
              <p className="text-sm leading-relaxed text-muted-foreground">This part has no automatic check. Compare your working with the official solution in step 4, then mark it as reviewed.</p>
              <StepHeading step={4}>Solution</StepHeading>
              <details
                key={taskKey}
                style={partStyle(colour)}
                className={box}
                onToggle={(event) => setSolutionOpen(event.currentTarget.open)}
              >
                <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-2 text-sm font-medium">
                  <PartChip index={colour}>{part.id}</PartChip>
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
                className="min-h-11"
                aria-pressed={isReviewed}
                disabled={disabled}
                onClick={() => onReviewToggle(taskKey)}
              >
                {isReviewed && <Check data-icon="inline-start" />}
                {isReviewed ? "Reviewed · undo" : "Mark as reviewed"}
              </Button>
              {signedIn ? (
                <Button
                  className="min-h-11"
                  onClick={() => onSaveProgress(taskKey)}
                  disabled={saving || disabled}
                >
                  {saving ? "Saving…" : "Save subpart progress"}
                </Button>
              ) : (
                <Button className="min-h-11" variant="outline" asChild>
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
                className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
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
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">
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
                className="inline-flex min-h-11 items-center gap-1 text-sm underline underline-offset-4"
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
        <AlertTitle role="heading" aria-level={3}>Learning, not a rating event</AlertTitle>
        <AlertDescription>
          Reviews are your own learning notes. This pilot has no contest
          submissions, automatic full-problem judging, or ELO changes.
        </AlertDescription>
      </Alert>
    </section>
  );
}
