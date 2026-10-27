"use client";

import { CheckCircle2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { useProblemHistory } from "@/hooks/use-problem-history";
import { problems, type Problem } from "@/lib/physics";
import { ProblemList } from "./problem-list";

export function ProblemHistory({ onOpen }: { onOpen: (problem: Problem) => void }) {
  const { history } = useProblemHistory();

  return (
    <section aria-label="Your problem history" className="flex flex-col gap-4">
      <div className="grid min-w-0 grid-cols-1 gap-5 min-[1100px]:grid-cols-2">
        {[true, false].map((correct) => {
          const items = history
            .filter((entry) => entry.correct === correct)
            .map((entry) => problems.find((problem) => problem.id === entry.problemId))
            .filter((problem): problem is Problem => Boolean(problem));
          const Icon = correct ? CheckCircle2 : RotateCcw;
          const headingId = correct ? "correct-problems-heading" : "retry-problems-heading";

          return (
            <Card key={headingId} className="flex min-w-0 flex-col overflow-hidden shadow-none" aria-labelledby={headingId}>
              <CardHeader>
                <CardTitle>
                  <h2 id={headingId} className="flex items-center gap-2 text-base font-medium tracking-tight">
                    <Icon aria-hidden="true" className="size-4 text-primary" />
                    {correct ? "Solved correctly" : "Not yet correct"}
                    <span className="text-sm font-normal text-muted-foreground">{items.length}</span>
                  </h2>
                </CardTitle>
                <CardDescription>
                  {correct ? "Problems you have answered correctly." : "Incorrect attempts you have not yet solved correctly."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col px-0 pb-0">
                {items.length > 0 ? (
                  <ProblemList items={items} onOpen={onOpen} />
                ) : (
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>{correct ? "No correct answers yet" : "Nothing to retry"}</EmptyTitle>
                      <EmptyDescription>
                        {correct ? "Correct practice and contest answers will appear here." : "Problems you answer incorrectly will appear here until you get them right."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Checked practice and contest answers from this session only. History resets on reload; self-reviewed IPhO questions are not graded.
      </p>
    </section>
  );
}
