import { problemAuthoringApi } from "@/lib/problem-authoring-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return problemAuthoringApi("read", request, (await params).id);
}
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return problemAuthoringApi("update", request, (await params).id);
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return problemAuthoringApi("delete", request, (await params).id);
}
