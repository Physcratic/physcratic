import { authorMediaApi } from "@/lib/problem-authoring-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; mediaId: string }> },
) {
  const p = await params;
  return authorMediaApi("read", request, p.id, p.mediaId);
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; mediaId: string }> },
) {
  const p = await params;
  return authorMediaApi("delete", request, p.id, p.mediaId);
}
