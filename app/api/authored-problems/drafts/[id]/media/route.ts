import { authorMediaApi } from "@/lib/problem-authoring-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const p = await params;
  return authorMediaApi("list", request, p.id);
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const p = await params;
  return authorMediaApi("upload", request, p.id);
}
