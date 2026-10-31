import { z } from "zod";
import { db } from "@/lib/db";
import { coachingInquiries } from "@/lib/db/schema";
import { readSubmissionJson } from "@/lib/submission-request";
import { isSubmissionOrigin, submissionError } from "@/lib/submission-server";

const inquirySchema = z.object({
  pathway: z.enum(["General physics consultation", "IB / A-Level / IGCSE training", "Tutor inquiry"]),
  audience: z.enum(["Student", "Parent", "Tutor applicant"]),
  currentLevel: z.string().trim().min(1).max(100),
  goals: z.string().trim().min(1).max(1000),
  contact: z.string().trim().min(3).max(200),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!isSubmissionOrigin(request)) return submissionError("Request origin rejected.", 403);

    const input = inquirySchema.safeParse(await readSubmissionJson(request, 12000));
    if (!input.success) return submissionError("Please complete every inquiry field.", 400);

    await db.insert(coachingInquiries).values(input.data);

    return Response.json(
      { ok: true },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return submissionError("Your inquiry could not be saved. Please retry.", 503);
  }
}
