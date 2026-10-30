import { pool } from "@/lib/db";
import { submissionUser, isSubmissionOrigin } from "@/lib/submission-server";
import { createProblemAuthoringApi } from "@/lib/problem-authoring-api";

export const problemAuthoringApi = createProblemAuthoringApi({ pool, user: submissionUser, origin: isSubmissionOrigin });
