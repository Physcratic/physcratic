BEGIN;
CREATE TABLE IF NOT EXISTS contest_admin (
  "userId" text PRIMARY KEY,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE contest
  ADD COLUMN IF NOT EXISTS "creatorUserId" text,
  ADD COLUMN IF NOT EXISTS "launchOnPublish" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  ADD COLUMN IF NOT EXISTS "publishedAt" timestamptz;
CREATE TABLE IF NOT EXISTS contest_problem (
  "contestId" text NOT NULL,
  "problemId" text NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  title text NOT NULL,
  topic text NOT NULL,
  statement text NOT NULL,
  version text NOT NULL,
  metadata jsonb NOT NULL,
  definition jsonb NOT NULL,
  PRIMARY KEY ("contestId", "problemId"),
  UNIQUE ("contestId", position)
);
CREATE TABLE IF NOT EXISTS contest_attempt (
  id uuid PRIMARY KEY,
  "userId" text NOT NULL,
  "contestId" text NOT NULL,
  "problemId" text NOT NULL,
  "idempotencyKey" uuid NOT NULL,
  version text NOT NULL,
  answers jsonb NOT NULL,
  results jsonb NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE ("userId", "contestId", "idempotencyKey")
);
CREATE INDEX IF NOT EXISTS contest_attempt_owner_time ON contest_attempt ("userId", "contestId", "createdAt");
COMMIT;
