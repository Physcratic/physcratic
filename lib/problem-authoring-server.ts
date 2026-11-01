import { pool } from "@/lib/db";
import { submissionUser, isSubmissionOrigin } from "@/lib/submission-server";
import { createProblemAuthoringApi } from "@/lib/problem-authoring-api";
import { createAuthorMediaApi } from "./author-media-api";
import { privateAuthorStorage } from "./author-media-storage";

export const problemAuthoringApi = createProblemAuthoringApi({
  pool,
  user: submissionUser,
  origin: isSubmissionOrigin,
});

export const authorMediaApi = createAuthorMediaApi({
  pool,
  user: submissionUser,
  origin: isSubmissionOrigin,
  storage: privateAuthorStorage,
});
