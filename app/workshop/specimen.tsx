"use client";
import { useEffect, useState, type ReactNode } from "react";
import { ProblemRoom } from "@/components/physics/problem-room";
import { ProblemHeading } from "@/components/physics/problem-heading";
import { AnswerWorkspace } from "@/components/physics/answer-workspace";
import { ArenaDocument } from "@/components/physics/arena-document";
import { ArenaHints } from "@/components/physics/arena-hints";
import { FeedbackBox, PartChip, SolveSteps, StepHeading } from "@/components/physics/solve-ui";
import { CrumbTrail } from "@/components/problems/problem-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const documentText = "This is demonstration content for reviewing the document renderer.\n\n## (a) A sample part\n\nWrite the displacement as $$x=vt$$.\n\n## (b) A longer part heading that can wrap on a narrow screen\n\nExplain your reasoning using the quantities introduced in part (a).";

function AnswerDemo() {
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState("editing");
  useEffect(() => {
    if (state !== "checking") return;
    const timer = window.setTimeout(() => setState(Number(answer) === 2 ? "correct" : "incorrect"), 600);
    return () => window.clearTimeout(timer);
  }, [state, answer]);
  return <div className="space-y-5">
    <p className="text-sm text-muted-foreground">Local demonstration: enter 2 for a correct result. No grading requests or progress changes.</p>
    <StepHeading step={2} as="h2">Answer</StepHeading>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); setState(answer.trim() ? "checking" : "empty"); }}>
      <label htmlFor="demo-answer" className="flex min-h-11 items-center gap-2"><PartChip index={0}>(a)</PartChip>Sample numeric answer</label>
      <Input id="demo-answer" className="min-h-11" inputMode="decimal" value={answer} disabled={state === "checking"} aria-invalid={state === "incorrect" || state === "empty"} aria-describedby="demo-feedback" onChange={event => { setAnswer(event.target.value); setState("editing"); }} />
      <div className="flex flex-wrap gap-3"><Button className="min-h-11" disabled={state === "checking"}>{state === "checking" ? "Checking…" : "Check answer"}</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => { setAnswer(""); setState("editing"); }}>Reset answer</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => setState("unavailable")}>Show service failure</Button></div>
    </form>
    <div id="demo-feedback" role="status" aria-live="polite">
      {state === "empty" && <FeedbackBox tone="error" title="Type an answer first" />}
      {state === "incorrect" && <FeedbackBox tone="error" title="Incorrect"><p>Try 2 for this demonstration.</p></FeedbackBox>}
      {state === "correct" && <FeedbackBox tone="success" title="Correct"><p>This demonstration has not saved any progress.</p></FeedbackBox>}
      {state === "unavailable" && <FeedbackBox tone="warning" title="Could not check the answer"><p>Your input is preserved. Select Check answer to retry the demonstration.</p></FeedbackBox>}
      {state === "checking" && <p>Checking demonstration answer…</p>}
    </div>
  </div>;
}

function DocumentDemo() {
  return <Tabs defaultValue="statement" className="space-y-4">
    <TabsList className="h-auto max-w-full flex-wrap"><TabsTrigger className="min-h-11" value="statement">Problem statement</TabsTrigger><TabsTrigger className="min-h-11" value="solution">Worked solution</TabsTrigger></TabsList>
    <TabsContent value="statement"><Card><CardHeader><CardTitle><h2>Problem statement</h2></CardTitle></CardHeader><CardContent><ArenaDocument content={documentText} /></CardContent></Card></TabsContent>
    <TabsContent value="solution"><Card><CardHeader><CardTitle><h2>Worked solution</h2></CardTitle></CardHeader><CardContent><ArenaDocument content="Demonstration solution: substitute the given quantities into $$x=vt$$." /></CardContent></Card></TabsContent>
  </Tabs>;
}

export function Specimen({ id }: { id: string }) {
  if (id === "frame") return <ProblemRoom status={<span>Sample status</span>} footer="Sample footer"><h1 className="text-xl font-semibold">Problem frame</h1><p>The header, skip link, spacing and optional footer use the existing frame.</p></ProblemRoom>;
  if (id === "breadcrumbs") return <CrumbTrail crumbs={[{ name: "Problems", path: "/problems" }, { name: "Waves", path: "/problems/topics/waves" }, { name: "Walking Past Two Speakers", path: "/dashboard/problems/arena-walking-past-two-speakers" }]} />;
  if (id === "heading") return <div className="space-y-10"><ProblemHeading as="h2" title="Walking Past Two Speakers" source="Physcratic Arena" estimate="1200" tags={["Waves", "Interference", "Sound propagation"]}><p className="text-muted-foreground">Demonstration rating. The title and tags come from the sample problem.</p></ProblemHeading><ProblemHeading as="h2" title="A Long Sample Title That Tests Wrapping on Narrow Screens" source="Sample source" /></div>;
  if (id === "steps") return <SolveSteps hrefs={{ 1: "/workshop/document", 2: "/workshop/answer", 3: "/workshop/feedback", 4: "/workshop/document" }} />;
  if (id === "document") return <DocumentDemo />;
  if (id === "answer") return <AnswerDemo />;
  if (id === "workspace") return <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]"><div className="space-y-6"><h2 className="text-xl font-semibold">Statement column</h2><DocumentDemo /><div className="min-h-[900px] rounded-xl border p-5">Extra statement height to test sticky scrolling.</div></div><AnswerWorkspace><Card><CardContent className="pt-6"><AnswerDemo /></CardContent></Card><HintDemo /></AnswerWorkspace></div>;
  if (id === "hints") return <HintDemo />;
  if (id === "feedback") return <div className="space-y-4"><FeedbackBox tone="success" title="Correct">Your answer matches the expected result.</FeedbackBox><FeedbackBox tone="error" title="Could not check the answer">Keep your input and retry.</FeedbackBox><FeedbackBox tone="warning" title="Review this part yourself">Compare your reasoning with the worked solution.</FeedbackBox><FeedbackBox tone="neutral" title="Not checked">Type an answer before checking.</FeedbackBox><div role="status" className="space-y-3"><p>Loading answer fields…</p><Skeleton className="h-11 w-full" /></div><Button className="min-h-11" variant="outline" onClick={() => window.location.reload()}>Retry preview</Button></div>;
  if (id === "foundations") return <div className="space-y-6"><h2 className="text-2xl font-semibold">Existing visual foundations</h2><p className="text-base">Body text with <span className="text-muted-foreground">secondary text</span>.</p><div className="grid gap-4 sm:grid-cols-2">{["Background", "Card", "Muted", "Primary"].map((name, index) => <div key={name} className={`rounded-xl border p-6 ${["bg-background text-foreground", "bg-card text-card-foreground", "bg-muted text-muted-foreground", "bg-primary text-primary-foreground"][index]}`}>{name}</div>)}</div><div className="flex flex-wrap gap-3"><Button className="min-h-11">Primary button</Button><Button className="min-h-11" variant="outline">Outline button</Button><Button className="min-h-11" disabled>Disabled button</Button></div><p className="font-mono text-sm">Spacing examples: 4px, 8px, 16px, 24px, 32px.</p></div>;
  return null;
}

function HintDemo() { return <ArenaHints hints={{ a: ["Identify the known quantities.", "Write the equation before substituting.", "Check the units of the result."] }} />; }

export function PreviewSurface({ theme, children }: { theme: string; children: ReactNode }) {
  // This iframe changes only its own document. Do not write next-themes storage,
  // which would change the theme in the parent workshop and other open tabs.
  useEffect(() => {
    // Apply after the inherited theme provider's initial effect has completed.
    const timer = window.setTimeout(() => {
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
    }, 0);
    return () => window.clearTimeout(timer);
  }, [theme]);
  return <div className="min-h-dvh bg-background text-foreground">{children}</div>;
}
