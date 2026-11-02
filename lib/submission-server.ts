import { auth } from "@/lib/auth";
import { isAllowedSubmissionOrigin } from "@/lib/submission-security";
import { authoringStagingAuth } from "@/lib/authoring-staging";

export async function submissionUser(request: Request) {
  return (await auth.api.getSession({ headers: request.headers }))?.user;
}
export function isSubmissionOrigin(request: Request) {
  try {
    const staging = authoringStagingAuth();
    if (staging) return isAllowedSubmissionOrigin(request, staging.trustedOrigins);
  } catch { return false; }
  const configured = [process.env.BETTER_AUTH_URL, ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000", process.env.V0_RUNTIME_URL, process.env.V0_DEV_APP_URL, process.env.V0_BUILD_URL, process.env.V0_SANDBOX_URL] : []), ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []), ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : [])];
  return isAllowedSubmissionOrigin(request, configured);
}
export function submissionError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
