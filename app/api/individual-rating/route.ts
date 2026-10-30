import { getIndividualRating } from "@/lib/individual-rating-server";
import { submissionError, submissionUser } from "@/lib/submission-server";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await submissionUser(request);
    if (!user) return submissionError("Sign in to view your individual rating.", 401);
    return Response.json(await getIndividualRating(user.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return submissionError("Your individual rating could not be loaded. Please retry.", 503);
  }
}
