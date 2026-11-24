import "server-only";
import { createAuthorCreditApi } from "./author-credit-api";
import { pool } from "./db";
import { isSubmissionOrigin, submissionUser } from "./submission-server";

export const authorCreditApi = createAuthorCreditApi({ pool, user: submissionUser, origin: isSubmissionOrigin });
