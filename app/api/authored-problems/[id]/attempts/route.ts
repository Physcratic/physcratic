import { authoredAttemptApi } from "@/lib/authored-attempt-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return authoredAttemptApi("submit", request, (await params).id);
}
