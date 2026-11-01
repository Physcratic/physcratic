import "server-only";
import { pool } from "./db";
import { submissionUser, isSubmissionOrigin } from "./submission-server";
import { createAuthoredAttemptApi } from "./authored-attempt-api";
export const authoredAttemptApi = createAuthoredAttemptApi({
  pool,
  user: submissionUser,
  origin: isSubmissionOrigin,
});
