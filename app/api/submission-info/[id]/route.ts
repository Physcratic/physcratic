import { getSubmissionSource } from "@/lib/submission-source";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const source = await getSubmissionSource((await params).id);
  return source ? Response.json(source, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "Unknown problem" }, { status: 404 });
}
