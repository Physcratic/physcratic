"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import useSWRImmutable from "swr/immutable";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { arenaProblemSchema, type ArenaCatalogEntry } from "@/lib/arena-schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArenaDocument } from "./arena-document";
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
export function ArenaProblemReader({ problem,statement,statsEnabled=false,commentsEnabled=false,moderationEnabled=false }: { problem: ArenaCatalogEntry;statement?:ReactNode;statsEnabled?:boolean;commentsEnabled?:boolean;moderationEnabled?:boolean }) {
  const { data, isLoading, error, mutate } = useSWRImmutable(problem.path, loadProblem);
  // Existing order only: the next entry in the Arena index. Left out for the last problem.
  const position = arenaIndex.problems.findIndex((item) => item.id === problem.id);
  const nextProblem = position >= 0 ? arenaIndex.problems[position + 1] : undefined;
  return <section className={`mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 ${solveTokens}`} aria-labelledby="arena-problem-title">
    <div><Button variant="ghost" className="min-h-11" asChild><Link href="/dashboard?view=problems&collection=arena"><ArrowLeft data-icon="inline-start" />Back to Physcratic Arena</Link></Button></div>
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2"><Badge>Physcratic Arena</Badge><Badge variant="outline">{problem.topic}</Badge><Badge variant="outline">Unrated</Badge></div>
      <h1 id="arena-problem-title" className="text-balance text-2xl font-medium tracking-tight sm:text-3xl">{problem.title}</h1>
      <p className="text-pretty leading-relaxed text-muted-foreground">{problem.summary}</p>
      <div className="flex flex-wrap gap-2">{problem.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div>
    </header>
    {moderationEnabled&&<ReportControl subject={{kind:'problem',key:`arena:${problem.id}`}}/>}
    {statsEnabled&&<ProblemStatsPanel problemKey={`arena:${problem.id}`}/>}
    <SolveSteps />
    {isLoading && !statement && <div role="status" className="flex flex-col gap-3"><span className="text-sm text-muted-foreground">Loading typeset problem…</span><Skeleton className="h-96 w-full" /></div>}
    {error && !statement && <Alert variant="destructive"><AlertTitle>Could not load this problem</AlertTitle><AlertDescription><Button variant="outline" className="min-h-11" onClick={() => mutate()}><RotateCcw data-icon="inline-start" />Retry</Button></AlertDescription></Alert>}
    {(data || statement) && <Tabs key={problem.id} defaultValue="statement" className="flex min-w-0 flex-col gap-4">
      <TabsList className="h-auto w-fit max-w-full flex-wrap"><TabsTrigger className="min-h-11" value="statement"><StepNumber>1</StepNumber>Problem statement</TabsTrigger><TabsTrigger className="min-h-11" value="solution" data-tour="solution-tab"><StepNumber>4</StepNumber>Worked solution</TabsTrigger></TabsList>
      {(["statement", "solution"] as const).map((kind) => <TabsContent key={kind} value={kind} forceMount={kind === "statement" ? true : undefined} className="min-w-0 data-[state=inactive]:hidden">
        <div className="flex min-w-0 flex-col gap-6"><Card className="min-w-0 shadow-none"><CardHeader><CardTitle><h2>{kind === "statement" ? "Problem statement" : "Worked solution"}</h2></CardTitle><CardDescription>{kind === "statement" ? "Transcribed text and LaTeX, with original diagrams." : "Contains spoilers. Transcribed from the supplied worked solution, including its assumptions and qualifications."}</CardDescription></CardHeader><CardContent className="min-w-0">{kind === "statement" && statement ? statement : data ? <ArenaDocument content={data[kind]} /> : error ? <Alert variant="destructive"><AlertTitle>Could not load the worked solution</AlertTitle><AlertDescription><Button variant="outline" className="min-h-11" onClick={() => mutate()}><RotateCcw data-icon="inline-start" />Retry</Button></AlertDescription></Alert> : <div role="status" className="flex flex-col gap-3"><span className="text-sm text-muted-foreground">Loading typeset problem…</span><Skeleton className="h-96 w-full" /></div>}</CardContent></Card>{kind === "statement" && <Card className="min-w-0 shadow-none"><CardContent className="pt-6"><ArchiveAnswerPanel key={problem.id} problemId={problem.id} nextHref={nextProblem ? `/dashboard/problems/${nextProblem.id}` : undefined} /></CardContent></Card>}</div>
      </TabsContent>)}
    </Tabs>}
    {commentsEnabled&&<Discussions moderationEnabled={moderationEnabled} problemKey={`arena:${problem.id}`}/>}
  </section>;
}
