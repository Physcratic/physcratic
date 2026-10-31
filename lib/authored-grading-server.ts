import "server-only";
import { pool } from "./db";
import { submissionUser } from "./submission-server";
import { createAuthoredGrader } from "./authored-grading";

// Internal adapter only. Phase 6 must add its own transport/rate/idempotency checks.
// No route or client calls this service in Phase 5A.
export function gradeAuthoredAnswer(request: Request, input: unknown) {
  return createAuthoredGrader({ pool, user: () => submissionUser(request) })(
    input,
  );
}
