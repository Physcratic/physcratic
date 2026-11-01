import { authoredAttemptApi } from "@/lib/authored-attempt-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return authoredAttemptApi("info", request, (await params).id);
}
