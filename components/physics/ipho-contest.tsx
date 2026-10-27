"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { iphoTasks } from "@/lib/ipho-demo";
import { IphoProblem } from "./ipho-problem";

export function IphoContest({ onExit }: { onExit: () => void }) {
  const [activeId, setActiveId] = useState(iphoTasks[0].id);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState<string[]>([]);
  const index = iphoTasks.findIndex((task) => task.id === activeId);
  const task = iphoTasks[index];
  return (
    <section className="flex min-w-0 flex-col gap-6" aria-labelledby="ipho-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">Archive practice</Badge><Badge variant="outline">Unrated · front-end preview</Badge></div>
          <h2 id="ipho-title" className="text-2xl font-medium tracking-tight">The IPhO 2025 collection</h2>
          <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">Three selected subparts from the 2025 International Physics Olympiad in France — one from each theory paper. Original English papers, adapted tasks, and worked answers, at your own pace.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onExit}><ArrowLeft data-icon="inline-start" />Back to contests</Button>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{accepted.length} / {iphoTasks.length} expressions matched</span><span className="text-muted-foreground">No timer. No rating changes.</span></div>
        <Progress value={accepted.length / iphoTasks.length * 100} aria-label="IPhO expressions matched" className="h-1.5" />
      </div>
      <div className="grid min-w-0 grid-cols-1 items-start gap-5 min-[1150px]:grid-cols-[210px_minmax(0,1fr)]">
        <nav aria-label="IPhO practice questions" className="flex min-w-0 flex-col gap-4">
          <h3 className="text-sm font-medium">Selected archive tasks</h3>
          <ToggleGroup type="single" value={activeId} onValueChange={(value) => { if (value) setActiveId(value); }} className="flex-wrap items-stretch justify-start min-[1150px]:flex-col">
            {iphoTasks.map((item) => <ToggleGroupItem key={item.id} value={item.id} aria-label={`Question ${item.letter}: ${item.title}${accepted.includes(item.id) ? ", matched" : ""}`} className="h-auto flex-1 justify-start px-3 py-3 min-[1150px]:flex-none"><span className="flex size-7 shrink-0 items-center justify-center rounded-md border">{accepted.includes(item.id) ? <Check aria-label="Matched" /> : item.letter}</span><span className="hidden text-left text-sm font-normal sm:inline"><span className="block">{item.topic}</span><span className="text-muted-foreground">IPhO {item.year}</span></span></ToggleGroupItem>)}
          </ToggleGroup>
          <p className="hidden text-sm leading-relaxed text-muted-foreground min-[1150px]:block">Keep your focus on the physics. Type your answer as you would on a calculator.</p>
        </nav>
        <div className="flex min-w-0 flex-col gap-4">
          <IphoProblem key={task.id} task={task} answer={answers[task.id] || ""} accepted={accepted.includes(task.id)} onAnswerChange={(value) => setAnswers((current) => ({ ...current, [task.id]: value }))} onAccepted={() => setAccepted((current) => current.includes(task.id) ? current : [...current, task.id])} />
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => setActiveId(iphoTasks[index - 1].id)}><ArrowLeft data-icon="inline-start" />Previous</Button>
            <span className="text-sm text-muted-foreground">{index + 1} of {iphoTasks.length}</span>
            <Button variant="ghost" size="sm" disabled={index === iphoTasks.length - 1} onClick={() => setActiveId(iphoTasks[index + 1].id)}>Next<ArrowRight data-icon="inline-end" /></Button>
          </div>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">Independent, unofficial practice preview; not an IPhO event or a full past paper. Answer keys and checks run in your browser, not a secure grading server. This prototype checks final expressions only, not derivations or units. Answers reset when you leave or refresh.</p>
    </section>
  );
}
