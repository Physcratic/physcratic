"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Flag,
  ListChecks,
} from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  type DemoContest,
} from "@/lib/contest-demo";
import { ContestStandings } from "./contest-standings";

type Submission = {
  id: number;
  problemId: string;
  letter: string;
  accepted: boolean;
  elapsed: number;
};
type Feedback = { kind: "accepted" | "wrong" | "invalid"; text: string };

export function ContestRoom({
  contest,
  onExit,
}: {
  contest: DemoContest;
  onExit: () => void;
}) {
  const items = getContestProblems(contest);
  const duration = contest.durationMinutes * 60;
  const [seconds, setSeconds] = useState(duration);
  const [ended, setEnded] = useState(false);
  const [activeId, setActiveId] = useState(items[0].id);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<
    Record<string, Feedback | undefined>
  >({});
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const deadline = useRef(0);
  const submissionLock = useRef(false);
  const finished = ended || seconds === 0;
  const active = items.find((problem) => problem.id === activeId) || items[0];
  const accepted = submissions.filter((submission) => submission.accepted);
  const solvedIds = new Set(accepted.map((submission) => submission.problemId));
  const activeSolved = solvedIds.has(active.id);
  const score = items
    .filter((problem) => solvedIds.has(problem.id))
    .reduce((total, problem) => total + problem.points, 0);
  const penalty =
    accepted.reduce(
      (total, submission) => total + Math.ceil(submission.elapsed / 60),
      0,
    ) +
    submissions.filter((submission) => !submission.accepted).length * 20;
  const standings = sortStandings([
    ...sampleStandings(contest),
    {
      handle: "You",
      isYou: true,
      solved: solvedIds.size,
      points: score,
      penalty,
    },
  ]);
  const place = standings.findIndex((row) => row.isYou) + 1;

  useEffect(() => {
    if (ended) return;
    const endAt = Date.now() + duration * 1000;
    deadline.current = endAt;
    const interval = window.setInterval(
      () => setSeconds(Math.max(0, Math.ceil((endAt - Date.now()) / 1000))),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [duration, ended]);

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (finished || activeSolved || submissionLock.current) return;
    if (Date.now() >= deadline.current) {
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
      Math.max(
        0,
        Math.floor((Date.now() - (deadline.current - duration * 1000)) / 1000),
      ),
    );
    setSubmissions((current) => [
      ...current,
      {
        id: current.length + 1,
        problemId: active.id,
        letter: active.letter,
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
              {finished ? "Time remaining at finish" : "Time remaining"}
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
            below, or return to try another round.
          </AlertDescription>
        </Alert>
      )}
      <Tabs defaultValue="problems" className="min-w-0">
        <TabsList aria-label="Contest room views">
          <TabsTrigger value="problems">Problems</TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
          <TabsTrigger value="submissions">
            Submissions ({submissions.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="problems" className="pt-4">
          <div className="grid min-w-0 grid-cols-1 items-start gap-5 min-[1150px]:grid-cols-[200px_1fr]">
            <ToggleGroup
              type="single"
              value={activeId}
              onValueChange={(value) => {
                if (value) setActiveId(value);
              }}
              aria-label="Choose a contest problem"
              className="flex-wrap items-stretch justify-start min-[1150px]:flex-col"
            >
              {items.map((problem) => (
                <ToggleGroupItem
                  key={problem.id}
                  value={problem.id}
                  aria-label={`Problem ${problem.letter}: ${problem.title}`}
                  className="h-auto min-w-12 flex-1 justify-between px-3 py-3 min-[1150px]:flex-none"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md border">
                      {problem.letter}
                    </span>
                    <span className="hidden text-left text-sm font-normal min-[1150px]:inline">
                      {problem.topic}
                      <br />
                      <span className="text-muted-foreground">
                        {problem.points} pts
                      </span>
                    </span>
                  </span>
                  {solvedIds.has(problem.id) && (
                    <Check className="size-4 shrink-0" />
                  )}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Card className="min-w-0 shadow-none">
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{active.topic}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {active.points} points
                  </span>
                  {activeSolved && <Badge variant="outline">Accepted</Badge>}
                </div>
                <CardTitle>
                  <h3 className="text-xl font-medium leading-snug tracking-tight">
                    {active.letter}. {active.title}
                  </h3>
                </CardTitle>
                <CardDescription>{active.concept}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <p className="text-pretty text-base leading-relaxed">
                  {active.prompt}
                </p>
                <form
                  onSubmit={submitAnswer}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      (event.nativeEvent.isComposing || event.keyCode === 229)
                    )
                      event.preventDefault();
                  }}
                >
                  <FieldGroup>
                    <Field
                      data-disabled={finished || activeSolved}
                      data-invalid={
                        feedback[active.id]?.kind === "wrong" ||
                        feedback[active.id]?.kind === "invalid"
                      }
                    >
                      <FieldLabel htmlFor="contest-answer">
                        Your answer ({active.unit})
                      </FieldLabel>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                          id="contest-answer"
                          autoComplete="off"
                          inputMode="decimal"
                          placeholder="Enter a numerical value"
                          value={answers[active.id] || ""}
                          disabled={finished || activeSolved}
                          aria-invalid={
                            feedback[active.id]?.kind === "wrong" ||
                            feedback[active.id]?.kind === "invalid"
                          }
                          aria-describedby={
                            feedback[active.id]
                              ? "contest-feedback"
                              : "contest-answer-help"
                          }
                          onChange={(event) => {
                            setAnswers((current) => ({
                              ...current,
                              [active.id]: event.target.value,
                            }));
                            setFeedback((current) => ({
                              ...current,
                              [active.id]: undefined,
                            }));
                          }}
                        />
                        <Button
                          type="submit"
                          disabled={finished || activeSolved}
                        >
                          {activeSolved ? "Accepted" : "Submit answer"}
                          {activeSolved ? (
                            <Check data-icon="inline-end" />
                          ) : (
                            <ArrowRight data-icon="inline-end" />
                          )}
                        </Button>
                      </div>
                      <FieldDescription id="contest-answer-help">
                        Numerical answers within 0.5% are accepted. No hints
                        during a round.
                      </FieldDescription>
                      {feedback[active.id] &&
                        feedback[active.id]?.kind !== "accepted" && (
                          <FieldError id="contest-feedback">
                            {feedback[active.id]?.text}
                          </FieldError>
                        )}
                    </Field>
                  </FieldGroup>
                </form>
                {feedback[active.id]?.kind === "accepted" && (
                  <Alert id="contest-feedback">
                    <CheckCircle2 />
                    <AlertTitle>Nicely done.</AlertTitle>
                    <AlertDescription>
                      {feedback[active.id]?.text}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="justify-between border-t pt-4">
                <span className="text-sm text-muted-foreground">
                  Problem{" "}
                  {items.findIndex((problem) => problem.id === active.id) + 1}{" "}
                  of {items.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setActiveId(
                      items[
                        (items.findIndex(
                          (problem) => problem.id === active.id,
                        ) +
                          1) %
                          items.length
                      ].id,
                    )
                  }
                >
                  Next problem
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="standings" className="pt-4">
          <div className="overflow-hidden rounded-xl border bg-card text-card-foreground">
            <ContestStandings rows={standings} problemCount={items.length} />
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
                <AlertDialogAction onClick={() => setEnded(true)}>
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
