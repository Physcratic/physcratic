"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Clock3, Flag, ListChecks } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  formatClock,
  getContestProblems,
  sampleStandings,
  sortStandings,
  summarizeSubmissions,
  type ContestSubmission,
  type DemoContest,
} from "@/lib/contest-demo";
import { ContestStandings } from "./contest-standings";
import { ContestProblemPanel, type ContestFeedback } from "./contest-problem";

export function ContestRoom({
  contest,
  onExit,
}: {
  contest: DemoContest;
  onExit: () => void;
}) {
  const items = getContestProblems(contest);
  const duration = contest.durationMinutes * 60;
  const [startedAt] = useState(() => Date.now());
  const deadline = startedAt + duration * 1000;
  const [seconds, setSeconds] = useState(duration);
  const [ended, setEnded] = useState(false);
  const [tab, setTab] = useState("problems");
  const [activeId, setActiveId] = useState(items[0].id);
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<
    Record<string, ContestFeedback | undefined>
  >({});
  const [submissions, setSubmissions] = useState<ContestSubmission[]>([]);
  const submissionLock = useRef(false);
  const finished = ended || seconds === 0;
  const active = items.find((problem) => problem.id === activeId) || items[0];
  const summary = summarizeSubmissions(items, submissions);
  const solvedIds = new Set(
    summary.results
      .filter((result) => result.status === "accepted")
      .map((result) => result.problemId),
  );
  const activeSolved = solvedIds.has(active.id);
  const score = summary.points;
  const standings = sortStandings([
    ...sampleStandings(contest),
    { handle: "You", isYou: true, ...summary },
  ]);
  const place = standings.findIndex((row) => row.isYou) + 1;
  const accuracy = submissions.length
    ? Math.round((solvedIds.size / submissions.length) * 100)
    : 0;
  const lowTime = !finished && seconds <= 300;

  useEffect(() => {
    if (finished) return;
    const syncClock = () =>
      setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    const interval = window.setInterval(syncClock, 1000);
    document.addEventListener("visibilitychange", syncClock);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", syncClock);
    };
  }, [deadline, finished]);

  function finishRound() {
    setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    setEnded(true);
  }

  function selectProblem(id: string) {
    setActiveId(id);
    setTab("problems");
  }

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (finished || activeSolved || submissionLock.current) return;
    if (Date.now() >= deadline) {
      setSeconds(0);
      return;
    }
    const answer = (answers[active.id] || "").trim();
    const numeric = Number(answer);
    if (!answer || !Number.isFinite(numeric)) {
      setFeedback((current) => ({
        ...current,
        [active.id]: {
          kind: "invalid",
          text: "Enter a valid numerical answer.",
        },
      }));
      return;
    }
    submissionLock.current = true;
    const isAccepted =
      Math.abs(numeric - active.answer) <=
      Math.max(0.005, Math.abs(active.answer) * 0.005);
    const elapsed = Math.min(
      duration,
      Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
    );
    setSubmissions((current) => [
      ...current,
      {
        id: current.length + 1,
        problemId: active.id,
        letter: active.letter,
        answer: numeric,
        accepted: isAccepted,
        elapsed,
      },
    ]);
    setFeedback((current) => ({
      ...current,
      [active.id]: {
        kind: isAccepted ? "accepted" : "wrong",
        text: isAccepted
          ? `Accepted. ${active.points} points added to your demo score.`
          : "Not quite. Check your calculation and units, then try again. 20 penalty minutes added.",
      },
    }));
    window.setTimeout(() => {
      submissionLock.current = false;
    }, 300);
  }

  return (
    <section
      className="flex min-w-0 flex-col gap-6"
      aria-label="Demo contest room"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-medium tracking-tight">
              {contest.name}
            </h2>
            <Badge variant="secondary">
              {finished ? "Demo finished" : "Demo in progress"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Your own clock. The same spirit of competition.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Clock3 className="size-5 text-primary" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-muted-foreground">
              {finished
                ? "Time remaining at finish"
                : lowTime
                  ? "Last five minutes"
                  : "Time remaining"}
            </span>
            <span
              role="timer"
              aria-label="Time remaining"
              className="text-2xl font-medium tabular-nums tracking-tight"
            >
              {formatClock(seconds)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Progress
          aria-label="Contest time remaining"
          value={(seconds / duration) * 100}
          className="h-1.5"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {contest.durationMinutes}-minute round ·{" "}
            {finished ? "Clock stopped" : "Clock keeps running between tabs"}
          </span>
          <span>{formatClock(duration - seconds)} elapsed</span>
        </div>
      </div>
      {lowTime && (
        <Alert>
          <Clock3 />
          <AlertTitle>Five minutes or less remaining.</AlertTitle>
          <AlertDescription>
            Check your bookmarked problems. The round closes automatically when
            the clock reaches zero.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 text-card-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>
            {solvedIds.size} / {items.length} problems solved
          </span>
          <span className="text-muted-foreground">
            {score.toLocaleString("en-US")} points · #{place} in sample field
          </span>
        </div>
        <Progress
          aria-label="Problems solved"
          value={(solvedIds.size / items.length) * 100}
          className="h-1.5"
        />
      </div>
      {finished && (
        <Alert>
          <Flag />
          <AlertTitle>That&apos;s a round.</AlertTitle>
          <AlertDescription>
            You solved {solvedIds.size} of {items.length} problems and earned{" "}
            {score} points. Your demo Elo is unchanged. Review your submissions
            below, or open any problem to see its worked solution.
          </AlertDescription>
        </Alert>
      )}
      {finished && (
        <dl className="grid grid-cols-2 gap-4 rounded-xl border bg-card p-5 text-card-foreground sm:grid-cols-4">
          {[
            { label: "Final score", value: `${score} pts` },
            {
              label: "Sample placement",
              value: `#${place} of ${standings.length}`,
            },
            {
              label: "Accepted / attempts",
              value: `${solvedIds.size} / ${submissions.length} · ${accuracy}%`,
            },
            { label: "Total penalty", value: `${summary.penalty} min` },
          ].map((metric) => (
            <div key={metric.label} className="flex flex-col gap-2">
              <dt className="text-sm text-muted-foreground">{metric.label}</dt>
              <dd className="text-xl font-medium tabular-nums tracking-tight">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <Tabs value={tab} onValueChange={setTab} className="min-w-0">
        <TabsList aria-label="Contest room views">
          <TabsTrigger value="problems">
            {finished ? "Review problems" : "Problems"}
          </TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
          <TabsTrigger value="submissions">
            Submissions ({submissions.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="problems" className="pt-4">
          <ContestProblemPanel
            key={active.id}
            items={items}
            activeId={active.id}
            results={summary.results}
            flaggedIds={flaggedIds}
            answer={answers[active.id] || ""}
            feedback={feedback[active.id]}
            finished={finished}
            onSelect={setActiveId}
            onToggleFlag={(id) =>
              setFlaggedIds((current) =>
                current.includes(id)
                  ? current.filter((value) => value !== id)
                  : [...current, id],
              )
            }
            onAnswerChange={(answer) => {
              setAnswers((current) => ({ ...current, [active.id]: answer }));
              setFeedback((current) => ({
                ...current,
                [active.id]: undefined,
              }));
            }}
            onSubmit={submitAnswer}
          />
        </TabsContent>
        <TabsContent value="standings" className="pt-4">
          <div className="overflow-hidden rounded-xl border bg-card text-card-foreground">
            <ContestStandings
              rows={standings}
              problems={items}
              onSelectProblem={selectProblem}
            />
          </div>
        </TabsContent>
        <TabsContent value="submissions" className="pt-4">
          <div className="overflow-hidden rounded-xl border bg-card text-card-foreground">
            {submissions.length ? (
              <Table>
                <TableCaption className="pb-4">
                  Local demo submissions. Times are elapsed since you entered.
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">#</TableHead>
                    <TableHead scope="col">Problem</TableHead>
                    <TableHead scope="col">Answer</TableHead>
                    <TableHead scope="col">Verdict</TableHead>
                    <TableHead scope="col" className="text-right">
                      Elapsed
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...submissions].reverse().map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>{submission.id}</TableCell>
                      <TableCell>
                        {submission.letter}.{" "}
                        {
                          items.find(
                            (problem) => problem.id === submission.problemId,
                          )?.title
                        }
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {submission.answer}{" "}
                        {
                          items.find(
                            (problem) => problem.id === submission.problemId,
                          )?.unit
                        }
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            submission.accepted ? "secondary" : "outline"
                          }
                        >
                          {submission.accepted ? "Accepted" : "Wrong answer"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatClock(submission.elapsed)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ListChecks />
                  </EmptyMedia>
                  <EmptyTitle>No submissions yet</EmptyTitle>
                  <EmptyDescription>
                    Your attempts and verdicts will appear here. Pick a problem
                    to get started.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Local preview · Sample opponents · No rating changes
        </p>
        {finished ? (
          <Button variant="outline" onClick={onExit}>
            <ArrowLeft data-icon="inline-start" />
            Back to contests
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <Flag data-icon="inline-start" />
                Finish demo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Finish this demo round?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your score will be finalized for this preview. You can still
                  review the problems, standings, and submissions. No Elo rating
                  will change.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep solving</AlertDialogCancel>
                <AlertDialogAction onClick={finishRound}>
                  Finish round
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </section>
  );
}
