import { authoredAttemptApi } from "@/lib/authored-attempt-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  return authoredAttemptApi("read", request, (await params).attemptId);
}
