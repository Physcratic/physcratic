import "server-only";
import { pool } from "./db";
import { submissionUser, isSubmissionOrigin } from "./submission-server";
import { privateAuthorStorage } from "./author-media-storage";
import { createAuthoredSolutionApi } from "./authored-solution-api";
export const authoredSolutionApi = createAuthoredSolutionApi({
  pool,
  user: submissionUser,
  origin: isSubmissionOrigin,
  storage: privateAuthorStorage,
});
