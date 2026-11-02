-- Better Auth 1.7.14 getAuthTables: rateLimit key string unique/required,
-- count number required, lastRequest number(bigint) required; adapter supplies text id.
-- Additive migration only. Apply manually BEFORE deploying database-backed limiter.
-- Deliberately no IF NOT EXISTS: incompatible existing tables must fail for review.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE TABLE "rateLimit" (
  "id" text PRIMARY KEY,
  "key" text NOT NULL UNIQUE,
  "count" integer NOT NULL,
  "lastRequest" bigint NOT NULL
);
CREATE INDEX "rateLimit_lastRequest_idx" ON "rateLimit" ("lastRequest");
COMMIT;
