import { z } from "zod";
import type {
  ArchiveMetadata,
  ArchivePartResult,
} from "./archive-grading-contracts";

export const testContestDurationMinutes = 7 * 24 * 60;
export const contestIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);
export const contestDraftSchema = z
  .strictObject({
    name: z.string().trim().min(3).max(120),
    description: z.string().trim().min(10).max(2000),
    durationMinutes: z
      .number()
      .int()
      .min(5)
      .max(30 * 24 * 60),
    launchOnPublish: z.boolean(),
    startsAt: z.iso.datetime({ offset: true }).nullable(),
    problemIds: z.array(contestIdSchema).min(1).max(12),
  })
  .superRefine((value, context) => {
    if (!value.launchOnPublish && !value.startsAt)
      context.addIssue({
        code: "custom",
        path: ["startsAt"],
        message: "Choose a start time.",
      });
    if (new Set(value.problemIds).size !== value.problemIds.length)
      context.addIssue({
        code: "custom",
        path: ["problemIds"],
        message: "Choose each problem once.",
      });
  });
export const contestEditSchema = z.strictObject({
  version: z.number().int().positive(),
  draft: contestDraftSchema,
});
export const contestPublishSchema = z.strictObject({
  version: z.number().int().positive(),
  confirmed: z.literal(true),
});
export const contestSubmissionSchema = z.strictObject({
  problemId: contestIdSchema,
  version: z.string().regex(/^[a-f0-9]{64}$/),
  idempotencyKey: z.uuid(),
  answers: z
    .array(
      z.strictObject({
        partId: z.string().min(1).max(100),
        latex: z.string().max(1024),
      }),
    )
    .min(1)
    .max(64),
});
export type ContestDraftInput = z.infer<typeof contestDraftSchema>;
export type ContestSubmissionInput = z.infer<typeof contestSubmissionSchema>;
export type ContestPhase = "upcoming" | "live" | "ended";
export function contestPhase(
  startsAt: string | Date,
  durationMinutes: number,
  now: number,
): ContestPhase {
  const start = new Date(startsAt).getTime();
  return now < start
    ? "upcoming"
    : now < start + durationMinutes * 60_000
      ? "live"
      : "ended";
}
export function contestEnd(startsAt: string | Date, durationMinutes: number) {
  return new Date(
    new Date(startsAt).getTime() + durationMinutes * 60_000,
  ).toISOString();
}
export function contestScore(
  attempts: { problemId: string; results: ArchivePartResult[] }[],
) {
  const correct = new Set<string>();
  for (const attempt of attempts)
    for (const part of attempt.results)
      if (part.status === "correct")
        correct.add(`${attempt.problemId}:${part.partId}`);
  return correct;
}
export type ContestProblemOption = {
  id: string;
  title: string;
  topic: string;
  points: number;
};
export type ContestSummary = {
  id: string;
  name: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  launchOnPublish: boolean;
  published: boolean;
  version: number;
  problemIds: string[];
};
export type ContestProblemView = {
  id: string;
  title: string;
  topic: string;
  statement: string;
  metadata: ArchiveMetadata;
};
export type ContestAttemptView = {
  id: string;
  problemId: string;
  createdAt: string;
  answers: { partId: string; latex: string }[];
  results: ArchivePartResult[];
};
export type ContestRoomData = {
  contest: ContestSummary;
  serverNow: string;
  endsAt: string;
  phase: ContestPhase;
  signedIn: boolean;
  emailVerified: boolean;
  registered: boolean;
  canJoin: boolean;
  problems: ContestProblemView[];
  attempts: ContestAttemptView[];
  earnedParts: string[];
  submissionCount: number;
  score: number;
  maxScore: number;
};
export type ContestAdminData = {
  contests: ContestSummary[];
  problems: ContestProblemOption[];
};

export function formatContestDuration(minutes: number) {
  if (minutes % 1440 === 0) return `${minutes / 1440} days`;
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${minutes} minutes`;
}
export const testContestProblemIds = [
  "incline",
  "circuit",
  "string",
  "arena-mind-the-gap",
];
export const testContestDraft: ContestDraftInput = {
  name: "Physcratic Test Contest 1",
  description:
    "A seven-day unrated test of contest registration, answer submission and scoring using existing archive problems. Archive solutions are already public. No ELO changes.",
  durationMinutes: testContestDurationMinutes,
  launchOnPublish: true,
  startsAt: null,
  problemIds: testContestProblemIds,
};
