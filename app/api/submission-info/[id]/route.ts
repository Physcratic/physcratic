import { getSubmissionSource } from "@/lib/submission-source";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const source = await getSubmissionSource((await params).id);
    return source ? Response.json(source, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "Unknown problem" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Source information is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
