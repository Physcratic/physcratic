import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ArchiveAnswerPanel } from "../components/physics/archive-answer-panel";
import { ProblemHistory } from "../components/physics/problem-history";
import { ProblemReader } from "../components/physics/problem-reader";
import { problems } from "../lib/physics";
import { useDashboard } from "../hooks/use-dashboard";
function Harness() {
  const [problem, setProblem] = useState("incline");
  const [reset, setReset] = useState(0);
  const dashboard = useDashboard();
  if (new URLSearchParams(location.search).has("reader")) return <main className="p-4"><ProblemReader problem={problems.find(p => p.id === "incline")!} /></main>;
  return <main className="mx-auto flex max-w-5xl flex-col gap-6 p-4"><h1 className="text-2xl">Progress test</h1>
    <label htmlFor="fixture-problem">Problem</label><select id="fixture-problem" className="min-h-11 rounded-md border bg-background text-foreground" value={problem} onChange={e => setProblem(e.target.value)}><option value="incline">Incline</option><option value="arena-mind-the-gap">Mind the Gap</option></select>
    <button className="min-h-11" onClick={() => setReset(n => n + 1)}>Start over fixture</button>
    <p data-testid="dashboard">{dashboard.data?.practiceProgressAvailable ? `Dashboard: ${dashboard.data.solvedProblems} solved, ${dashboard.data.practiceAttempts} saved` : "Dashboard: progress unavailable"}</p>
    <ArchiveAnswerPanel problemId={problem} resetToken={reset} />
    <ProblemHistory onOpen={() => {}} />
  </main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><Harness /></React.StrictMode>);
