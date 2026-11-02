import { authoredSolutionApi } from "@/lib/authored-solution-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; partId: string }> },
) {
  const p = await params;
  return authoredSolutionApi("view", request, p.id, p.partId);
}
