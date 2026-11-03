"use client";

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

import {ProblemStatsPanel} from '@/components/community/problem-stats';
async function loadProblem(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("The Arena problem could not be loaded.");
  return arenaProblemSchema.parse(await response.json());
}

export function ArenaProblemReader({ problem,statsEnabled=false }: { problem: ArenaCatalogEntry;statsEnabled?:boolean }) {
  const { data, isLoading, error, mutate } = useSWRImmutable(problem.path, loadProblem);
  return <section className="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6" aria-labelledby="arena-problem-title">
    <div><Button variant="ghost" asChild><Link href="/dashboard?view=problems&collection=arena"><ArrowLeft data-icon="inline-start" />Back to Physcratic Arena</Link></Button></div>
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2"><Badge>Physcratic Arena</Badge><Badge variant="outline">{problem.topic}</Badge><Badge variant="outline">Unrated</Badge></div>
      <h1 id="arena-problem-title" className="text-balance text-2xl font-medium tracking-tight sm:text-3xl">{problem.title}</h1>
      <p className="text-pretty leading-relaxed text-muted-foreground">{problem.summary}</p>
      <div className="flex flex-wrap gap-2">{problem.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div>
    </header>
    {statsEnabled&&<ProblemStatsPanel problemKey={`arena:${problem.id}`}/>}
    {isLoading && <div role="status" className="flex flex-col gap-3"><span className="text-sm text-muted-foreground">Loading typeset problem…</span><Skeleton className="h-96 w-full" /></div>}
    {error && <Alert variant="destructive"><AlertTitle>Could not load this problem</AlertTitle><AlertDescription><Button variant="outline" onClick={() => mutate()}><RotateCcw data-icon="inline-start" />Retry</Button></AlertDescription></Alert>}
    {data && <Tabs key={problem.id} defaultValue="statement" className="flex min-w-0 flex-col gap-4">
      <TabsList className="w-fit"><TabsTrigger value="statement">Problem statement</TabsTrigger><TabsTrigger value="solution">Worked solution</TabsTrigger></TabsList>
      {(["statement", "solution"] as const).map((kind) => <TabsContent key={kind} value={kind} forceMount={kind === "statement" ? true : undefined} className="min-w-0 data-[state=inactive]:hidden">
        <div className="flex min-w-0 flex-col gap-6"><Card className="min-w-0 shadow-none"><CardHeader><CardTitle>{kind === "statement" ? "Problem statement" : "Worked solution"}</CardTitle><CardDescription>{kind === "statement" ? "Transcribed text and LaTeX, with original diagrams." : "Contains spoilers. Transcribed from the supplied worked solution, including its assumptions and qualifications."}</CardDescription></CardHeader><CardContent className="min-w-0"><ArenaDocument content={data[kind]} /></CardContent></Card>{kind === "statement" && <Card className="min-w-0 shadow-none"><CardContent className="pt-6"><ArchiveAnswerPanel key={problem.id} problemId={problem.id} /></CardContent></Card>}</div>
      </TabsContent>)}
    </Tabs>}
  </section>;
}
