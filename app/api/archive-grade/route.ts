import { handleArchiveGrade } from "@/lib/archive-grading-request";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleArchiveGrade(request);
}
