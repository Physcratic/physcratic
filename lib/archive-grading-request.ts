import "server-only";
import { gradeArchiveAnswers, ArchiveGradeRequestError } from "./archive-grading";
import { isAllowedSubmissionOrigin } from "./submission-security";
import { readSubmissionJson, RequestBodyTimeoutError } from "./submission-request";

export function archiveTrustedOrigins() {
  return [process.env.NEXT_PUBLIC_SITE_URL, process.env.BETTER_AUTH_URL,
    ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000", process.env.V0_RUNTIME_URL, process.env.V0_DEV_APP_URL, process.env.V0_BUILD_URL, process.env.V0_SANDBOX_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : []),
  ];
}
function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "Vary": "Origin" } });
}
export async function handleArchiveGrade(request: Request, trustedOrigins = archiveTrustedOrigins()) {
  if (!isAllowedSubmissionOrigin(request, trustedOrigins)) return json({ error: "Untrusted request origin." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ error: "Use application/json." }, 415);
  if (Number(request.headers.get("content-length")) > 65536) return json({ error: "Request body is too large." }, 413);
  try {
    return json(gradeArchiveAnswers(await readSubmissionJson(request, 65536)));
  } catch (reason) {
    if (reason instanceof ArchiveGradeRequestError) return json({ error: reason.message }, reason.status);
    if (reason instanceof RangeError) return json({ error: "Request body is too large." }, 413);
    if (reason instanceof RequestBodyTimeoutError) return json({ error: "Request body timed out. Keep your input and retry." }, 408);
    if (reason instanceof SyntaxError || reason instanceof TypeError) return json({ error: "Invalid JSON request body." }, 400);
    return json({ error: "The checker is temporarily unavailable. Your input has not been saved; please retry." }, 503);
  }
}
