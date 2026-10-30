import { problemAuthoringApi } from "@/lib/problem-authoring-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return problemAuthoringApi("public", request, (await params).id);
}
