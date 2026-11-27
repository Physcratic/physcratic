import React from "react";
import { createRoot } from "react-dom/client";
import { SWRConfig } from "swr";
import { ReaderCompletion } from "../components/personal-completions/reader-completion";
import { CompletionHistory } from "../components/personal-completions/completion-history";
import { SolvedBanner } from "../components/physics/part-progress";
import { ProgressCardHeader, SolvedSummary } from "../components/physics/progress-summary";
import { Card } from "../components/ui/card";
import { FeedbackBox } from "../components/physics/solve-ui";
import { summariseCheck, type FeedbackStatus } from "../lib/solve-feedback";

const cases: FeedbackStatus[][] = [["invalid"], ["inconclusive"], ["self-review"], ["correct", "self-review"], ["incorrect", "invalid", "inconclusive"]];
createRoot(document.getElementById("root")!).render(<React.StrictMode><SWRConfig value={{ provider: () => new Map(), revalidateOnFocus: false }}>
  <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
    <h1 className="text-2xl">Feedback test</h1>
    <section aria-label="Personal completion"><h2 className="text-lg">Personal completion</h2><ReaderCompletion account="synthetic" problemKey="arena:arena-mind-the-gap" /><CompletionHistory account="synthetic" active /></section>
    <SolvedSummary solved={1} recent={1} /><SolvedBanner />
    {(["solved", "in-progress", "not-graded"] as const).map(status => <Card key={status}><ProgressCardHeader status={status} count={1} /></Card>)}
    {cases.map((statuses, i) => {
      const summary = summariseCheck(statuses.map((status, part) => ({ status, partId: String(part), message: "" })));
      return <section key={i} aria-label={`Result ${i}`}><FeedbackBox tone={summary.tone} title={summary.headline}><p>{summary.detail}</p></FeedbackBox></section>;
    })}
  </main>
</SWRConfig></React.StrictMode>);
