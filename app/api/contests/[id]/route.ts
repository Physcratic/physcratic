import { contestIdSchema } from "@/lib/contest-contracts";
import { contestHandler } from "@/lib/contest-http";
import { getContestRoom } from "@/lib/contest-server";
import { submissionUser } from "@/lib/submission-server";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return contestHandler(async () =>
    getContestRoom(
      contestIdSchema.parse((await params).id),
      await submissionUser(request),
    ),
  );
}
