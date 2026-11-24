"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";
import { authClient } from "@/lib/auth-client";
import {
  CompletionRequestError, completionChangedEvent, completionStatusKey, completionsPath, readCompletionStatus, saveCompletion,
} from "@/lib/personal-completions-client";
import type { ProblemKey } from "@/lib/unified-arena";
import { Button } from "@/components/ui/button";

// A reader can unmount and remount while its write is still in flight.
const pendingWrites = new Set<string>();

export function SignedInReaderCompletion({ problemKey }: { problemKey: ProblemKey }) {
  const { data, error, isPending, isRefetching } = authClient.useSession();
  const user = data?.user;
  if (isPending || isRefetching || error || !user?.emailVerified) return null;
  return <ReaderCompletion key={user.id} account={user.id} problemKey={problemKey} />;
}

export function ReaderCompletion({ account, problemKey }: { account: string; problemKey: ProblemKey }) {
  const view = useId();
  const key = completionStatusKey(account, problemKey, view);
  const { data, error } = useSWR(key, readCompletionStatus, { shouldRetryOnError: false, revalidateOnMount: true });
  const { trigger, isMutating } = useSWRMutation(key, saveCompletion);
  const { mutate } = useSWRConfig();
  const [writeFailed, setWriteFailed] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  if (unavailable || error || !data) return null;

  async function update(completed: boolean) {
    const requestKey = JSON.stringify([account, problemKey]);
    if (pendingWrites.has(requestKey)) return;
    pendingWrites.add(requestKey);
    setWriteFailed(false);
    try {
      // Let SWR discard reads started before this write. Populate only from a confirmed response.
      await trigger(completed, { populateCache: true, revalidate: false });
      window.dispatchEvent(new CustomEvent(completionChangedEvent, { detail: account }));
      // Older writes can finish after navigation. Revalidate other views instead of giving them an older receipt.
      void mutate(candidate => Array.isArray(candidate) && candidate[0] === completionsPath &&
        candidate[1] === account && (candidate[2] === "history" ||
          (candidate[2] === "status" && candidate[3] === problemKey && candidate[4] !== view)), undefined);
    } catch (error) {
      if (error instanceof CompletionRequestError && [401, 403, 404, 409].includes(error.status)) {
        setUnavailable(true);
      } else {
        setWriteFailed(true);
      }
    } finally {
      pendingWrites.delete(requestKey);
    }
  }

  return <div className="space-y-2">
    <Button type="button" variant="outline" aria-pressed={data.completed} aria-disabled={isMutating || undefined}
      className={data.completed ? "border-success bg-success-tint text-success-ink hover:bg-success-tint hover:text-success-ink" : undefined}
      onClick={() => void update(!data.completed)}>
      {data.completed && <Check aria-hidden="true" />}
      {data.completed ? "Completed" : "Mark completed"}
    </Button>
    {writeFailed && <p role="alert" className="text-sm text-destructive">Could not save completion.</p>}
  </div>;
}
