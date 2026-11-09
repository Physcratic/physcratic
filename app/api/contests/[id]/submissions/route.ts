import {
  contestIdSchema,
  contestSubmissionSchema,
} from "@/lib/contest-contracts";
import { contestHandler, contestJson, contestUser } from "@/lib/contest-http";
import { submitContestAnswer } from "@/lib/contest-server";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return contestHandler(async () => {
    const user = await contestUser(request);
    const id = contestIdSchema.parse((await params).id);
    const input = contestSubmissionSchema.parse(await contestJson(request));
    return { attempt: await submitContestAnswer(user.id, id, input) };
  });
}
