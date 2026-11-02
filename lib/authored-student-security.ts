import "server-only";
import type { Pool } from "pg";
import { authoredAttemptPolicy as policy } from "./authored-attempt-contracts";
export class StudentAccessError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: string,
  ) {
    super(message);
  }
}
export async function chargeStudentRequest(
  pool: Pool,
  user: string,
  submit: boolean,
) {
  const { rows } = await pool.query(
    `INSERT INTO authored_student_rate(user_id,window_start,requests,submissions) VALUES($1,date_trunc('minute',clock_timestamp()),1,$2)
 ON CONFLICT(user_id) DO UPDATE SET requests=CASE WHEN authored_student_rate.window_start=EXCLUDED.window_start THEN least(authored_student_rate.requests+1,61) ELSE 1 END,
 submissions=CASE WHEN authored_student_rate.window_start=EXCLUDED.window_start THEN least(authored_student_rate.submissions+$2,21) ELSE $2 END,
 window_start=EXCLUDED.window_start RETURNING requests,submissions`,
    [user, submit ? 1 : 0],
  );
  if (
    rows[0].requests > policy.requestsPerMinute ||
    (submit && rows[0].submissions > policy.submissionsPerMinute)
  )
    throw new StudentAccessError(
      429,
      "Student request limit reached. Retry next minute.",
      "60",
    );
}
