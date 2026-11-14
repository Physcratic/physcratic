"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import useSWRImmutable from "swr/immutable";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { arenaProblemSchema, type ArenaCatalogEntry } from "@/lib/arena-schema";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ProblemHeading } from "./problem-heading";
import { getEstimatedProblemElo } from "@/lib/problem-archive";
import { ArenaDocument } from "./arena-document";
import { AnswerWorkspace } from "./answer-workspace";
import { ArchiveAnswerPanel } from "./archive-answer-panel";
import arenaIndex from "@/lib/arena/index.json";
import { SolveSteps, StepNumber, solveTokens } from "./solve-ui";

import {ProblemStatsPanel} from '@/components/community/problem-stats';
import {ReportControl} from '@/components/community/report-controls';
import {Discussions} from '@/components/community/discussions';
async function loadProblem(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("The Arena problem could not be loaded.");
  return arenaProblemSchema.parse(await response.json());
}

/** `statement` is the statement rendered on the server, so it is in the HTML before any script runs. */
type ArenaReaderProps = { problem: ArenaCatalogEntry; statement?: ReactNode; statsEnabled?: boolean; commentsEnabled?: boolean; moderationEnabled?: boolean };
export function ArenaProblemReader(props: ArenaReaderProps) {
  return <ArenaReader key={props.problem.id} {...props} />;
}
function ArenaReader({ problem,statement,statsEnabled=false,commentsEnabled=false,moderationEnabled=false }: ArenaReaderProps) {
  const [view, setView] = useState("statement");
  const { data, isLoading, error, mutate } = useSWRImmutable(problem.path, loadProblem);
  // Existing order only: the next entry in the Arena index. Left out for the last problem.
  const position = arenaIndex.problems.findIndex((item) => item.id === problem.id);
  const nextProblem = position >= 0 ? arenaIndex.problems[position + 1] : undefined;
  return <section className={`mx-auto flex w-full max-w-[1440px] min-w-0 flex-col gap-6 ${solveTokens}`} aria-labelledby="arena-problem-title">
    <div><Button variant="ghost" className="min-h-11" asChild><Link href="/dashboard?view=problems&collection=arena"><ArrowLeft data-icon="inline-start" />Back to Physcratic Arena</Link></Button></div>
    <ProblemHeading id="arena-problem-title" title={problem.title} source="Physcratic Arena" estimate={String(getEstimatedProblemElo(problem.id))} tags={[problem.topic, ...problem.tags]}>
      <p className="text-pretty leading-relaxed text-muted-foreground">{problem.summary}</p>
      <p className="text-sm text-muted-foreground">Published by Physcratic</p>
    </ProblemHeading>
    {moderationEnabled&&<ReportControl subject={{kind:'problem',key:`arena:${problem.id}`}}/>}
    {statsEnabled&&<ProblemStatsPanel problemKey={`arena:${problem.id}`}/>}
    <SolveSteps hrefs={{1:"#arena-document",2:"#step-answer",3:"#step-check",4:"#arena-document"}} onNavigate={step => { if (step === 1) setView("statement"); if (step === 4) setView("solution"); }} />
    {isLoading && !statement && <div role="status" className="flex flex-col gap-3"><span className="text-sm text-muted-foreground">Loading typeset problem…</span><Skeleton className="h-96 w-full" /></div>}
    {error && !statement && <Alert variant="destructive"><AlertTitle>Could not load this problem</AlertTitle><AlertDescription><Button variant="outline" className="min-h-11" onClick={() => mutate()}><RotateCcw data-icon="inline-start" />Retry</Button></AlertDescription></Alert>}
    {(data || statement) && <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]"><Tabs id="arena-document" tabIndex={-1} key={problem.id} value={view} onValueChange={setView} className="flex min-w-0 scroll-mt-24 flex-col gap-4">
      <TabsList className="h-auto w-fit max-w-full flex-wrap"><TabsTrigger className="min-h-11" value="statement"><StepNumber>1</StepNumber>Problem statement</TabsTrigger><TabsTrigger className="min-h-11" value="solution" data-tour="solution-tab"><StepNumber>4</StepNumber>Worked solution</TabsTrigger></TabsList>
      {(["statement", "solution"] as const).map((kind) => <TabsContent key={kind} value={kind} forceMount={kind === "statement" ? true : undefined} className="min-w-0 data-[state=inactive]:hidden">
        <div className="flex min-w-0 flex-col gap-6"><Card className="min-w-0 shadow-none"><CardHeader><CardTitle><h2>{kind === "statement" ? "Problem statement" : "Worked solution"}</h2></CardTitle><CardDescription>{kind === "statement" ? "Transcribed text and LaTeX, with original diagrams." : "Contains spoilers. Transcribed from the supplied worked solution, including its assumptions and qualifications."}</CardDescription></CardHeader><CardContent className="min-w-0">{kind === "statement" && statement ? statement : data ? <ArenaDocument content={data[kind]} /> : error ? <Alert variant="destructive"><AlertTitle>Could not load the worked solution</AlertTitle><AlertDescription><Button variant="outline" className="min-h-11" onClick={() => mutate()}><RotateCcw data-icon="inline-start" />Retry</Button></AlertDescription></Alert> : <div role="status" className="flex flex-col gap-3"><span className="text-sm text-muted-foreground">Loading typeset problem…</span><Skeleton className="h-96 w-full" /></div>}</CardContent></Card></div>
      </TabsContent>)}
    </Tabs><AnswerWorkspace><Card className="min-w-0 shadow-none"><CardContent className="pt-6"><ArchiveAnswerPanel key={problem.id} problemId={problem.id} nextHref={nextProblem ? `/dashboard/problems/${nextProblem.id}` : undefined} /></CardContent></Card><nav aria-label="Problem documents" className="flex flex-wrap gap-3"><Button asChild variant="outline" className="min-h-11"><a href="#arena-document" onClick={() => setView("statement")}>Back to statement</a></Button><Button asChild variant="outline" className="min-h-11"><a href="#arena-document" onClick={() => setView("solution")}>View worked solution</a></Button></nav></AnswerWorkspace></div>}
    {commentsEnabled&&<Discussions moderationEnabled={moderationEnabled} problemKey={`arena:${problem.id}`}/>}
  </section>;
}
