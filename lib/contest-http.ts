import "server-only";
import { z } from "zod";
import { ContestError } from "./contest-server";
import { isSubmissionOrigin, submissionUser } from "./submission-server";
import {
  readSubmissionJson,
  RequestBodyTimeoutError,
} from "./submission-request";

export function contestReply(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      ...(status === 429 ? { "Retry-After": "60" } : {}),
    },
  });
}
export async function contestHandler(
  action: () => Promise<unknown>,
  successStatus = 200,
) {
  try {
    return contestReply(await action(), successStatus);
  } catch (error) {
    if (error instanceof ContestError)
      return contestReply({ error: error.message }, error.status);
    if (
      error instanceof z.ZodError ||
      error instanceof SyntaxError ||
      error instanceof TypeError
    )
      return contestReply(
        { error: "Invalid contest request. Check the fields and retry." },
        400,
      );
    if (error instanceof RangeError)
      return contestReply({ error: "The contest request is too large." }, 413);
    if (error instanceof RequestBodyTimeoutError)
      return contestReply(
        { error: "The request timed out. Please retry." },
        408,
      );
    console.error(
      "Contest operation failed",
      error instanceof Error ? error.message : "Unknown database error",
    );
    return contestReply(
      { error: "Contests are temporarily unavailable. Please retry." },
      503,
    );
  }
}
export async function contestUser(request: Request, write = true) {
  if (write && !isSubmissionOrigin(request))
    throw new ContestError("Request origin rejected.", 403);
  const user = await submissionUser(request);
  if (!user) throw new ContestError("Sign in to take part in contests.", 401);
  if (!user.emailVerified)
    throw new ContestError(
      "Verify your email before managing or joining a contest.",
      403,
    );
  return user;
}
export function contestJson(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw new ContestError("Send an application/json request.", 415);
  return readSubmissionJson(request, 75000);
}
