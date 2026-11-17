import { publicSolutionRoute } from "@/lib/authored-public-solution-route";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  const { id, mediaId } = await params;
  return publicSolutionRoute(request, id, mediaId);
}
