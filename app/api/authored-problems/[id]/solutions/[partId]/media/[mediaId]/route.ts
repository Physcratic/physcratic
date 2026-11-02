import { authoredSolutionApi } from "@/lib/authored-solution-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; partId: string; mediaId: string }> },
) {
  const p = await params;
  return authoredSolutionApi("media", request, p.id, p.partId, p.mediaId);
}
