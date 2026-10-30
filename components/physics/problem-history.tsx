"use client";

import Link from "next/link";
import { CheckCircle2, RotateCcw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { useProblemHistory } from "@/hooks/use-problem-history";
import { useDashboard } from "@/hooks/use-dashboard";
import { problems, type Problem } from "@/lib/physics";
import { ProblemList } from "./problem-list";

export function ProblemHistory({
  onOpen,
}: {
  onOpen: (problem: Problem) => void;
}) {
  const { history, error, isLoading, signedIn, mutate } = useProblemHistory();
  const dashboard = useDashboard();
  return (
    <section aria-label="Your problem history" className="flex flex-col gap-4">
      {dashboard.data?.user && !dashboard.error && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>
              <h2 className="text-base font-medium">Your saved progress</h2>
            </CardTitle>
            <CardDescription>
              Private progress from your account, across devices.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {dashboard.data.savedAttempts} saved solution{" "}
              {dashboard.data.savedAttempts === 1 ? "attempt" : "attempts"} ·{" "}
              {dashboard.data.practiceAttempts} practice checks ·{" "}
              {dashboard.data.solvedProblems} practice problems solved ·{" "}
              {dashboard.data.archiveReviewed} archive subproblems reviewed
            </p>
            <Button variant="outline" asChild>
              <Link href="/dashboard/submissions">View my attempts</Link>
            </Button>
          </CardContent>
        </Card>
      )}
      {isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading your saved progress…
        </p>
      ) : error ? (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm text-destructive">
            Your progress could not be loaded.
          </p>
          <Button variant="outline" onClick={() => mutate()}>
            Retry progress
          </Button>
        </div>
      ) : !signedIn ? (
        <Card className="shadow-none">
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Keep your progress</EmptyTitle>
                <EmptyDescription>
                  Sign in to save checked answers, solutions and archive review
                  notes. Your history stays private.
                </EmptyDescription>
              </EmptyHeader>
              <Button asChild variant="outline">
                <Link href="/sign-in?returnTo=%2Fdashboard">
                  Sign in to save progress
                </Link>
              </Button>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-5 min-[1100px]:grid-cols-2">
          {[true, false].map((correct) => {
            const items = history
              .filter((entry) => entry.correct === correct)
              .map((entry) =>
                problems.find((problem) => problem.id === entry.problemId),
              )
              .filter((problem): problem is Problem => Boolean(problem));
            const Icon = correct ? CheckCircle2 : RotateCcw;
            const headingId = correct
              ? "correct-problems-heading"
              : "retry-problems-heading";
            return (
              <Card
                key={headingId}
                className="flex min-w-0 flex-col overflow-hidden shadow-none"
                aria-labelledby={headingId}
              >
                <CardHeader>
                  <CardTitle>
                    <h2
                      id={headingId}
                      className="flex items-center gap-2 text-base font-medium tracking-tight"
                    >
                      <Icon
                        aria-hidden="true"
                        className="size-4 text-primary"
                      />
                      {correct ? "Solved correctly" : "Not yet correct"}
                      <span className="text-sm font-normal text-muted-foreground">
                        {items.length}
                      </span>
                    </h2>
                  </CardTitle>
                  <CardDescription>
                    {correct
                      ? "Practice problems with a correct saved answer."
                      : "Practice problems to revisit. Correct answers move them to solved."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col px-0 pb-0">
                  {items.length ? (
                    <ProblemList items={items} onOpen={onOpen} />
                  ) : (
                    <Empty>
                      <EmptyHeader>
                        <EmptyTitle>
                          {correct
                            ? "No correct answers yet"
                            : "Nothing to retry"}
                        </EmptyTitle>
                        <EmptyDescription>
                          {correct
                            ? "Correct practice answers will appear here."
                            : "Incorrect practice attempts will appear here until solved."}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <p className="text-sm leading-relaxed text-muted-foreground">
        Practice results are checked numerically. Saved full solutions await
        rubric review; archive review marks are self-assessed. Neither awards
        Elo.
      </p>
    </section>
  );
}
