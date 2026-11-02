import { authoredSolutionApi } from "@/lib/authored-solution-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; partId: string }> },
) {
  const p = await params;
  return authoredSolutionApi("permission-read", request, p.id, p.partId);
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; partId: string }> },
) {
  const p = await params;
  return authoredSolutionApi("permission-write", request, p.id, p.partId);
}
