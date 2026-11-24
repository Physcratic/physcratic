import "server-only";
import { pool } from "./db";
import { isSubmissionOrigin, submissionUser } from "./submission-server";
import { createPersonalCompletionsApi } from "./personal-completions-api";

export const personalCompletionsApi = createPersonalCompletionsApi({ pool, user: submissionUser, origin: isSubmissionOrigin });
