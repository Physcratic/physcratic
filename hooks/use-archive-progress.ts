"use client";

import { useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { authClient } from "@/lib/auth-client";
import { apiReadSWRConfig, fetchJson } from "@/lib/api-client";

export interface ArchiveTaskProgress {
  taskId: string;
  notes: string;
  answer: string;
  reviewed: boolean;
}
export function useArchiveProgress() {
  const session = authClient.useSession();
  const account = !session.isPending && !session.error ? session.data?.user.id : undefined;
  const boundary = useRef({ account, epoch: 0 });
  if (boundary.current.account !== account) boundary.current = { account, epoch: boundary.current.epoch + 1 };
  const { mutate: mutateAll } = useSWRConfig();
  const progress = useSWR<{ progress: ArchiveTaskProgress[] }>(
    account ? ["/api/archive-progress", account] : null,
    ([url, actor]: [string, string]) =>
      fetchJson<{ progress: ArchiveTaskProgress[] }>(url, { headers: { "X-Practice-Account": actor } }),
    { ...apiReadSWRConfig, keepPreviousData: false },
  );
  const [saveEpoch, setSaveEpoch] = useState(-1);
  const activeSave = saveEpoch === boundary.current.epoch;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedTask, setSavedTask] = useState<string | null>(null);
  const stored = Object.fromEntries(
    (account && !progress.error ? progress.data?.progress ?? [] : []).map((entry) => [entry.taskId, entry]),
  );
  async function saveTask(input: ArchiveTaskProgress) {
    if (
      (saving && activeSave) ||
      !account ||
      session.isPending ||
      session.error ||
      progress.error ||
      progress.isLoading
    )
      return;
    const actor = account, epoch = boundary.current.epoch;
    const current = () => boundary.current.account === actor && boundary.current.epoch === epoch;
    setSaveEpoch(epoch);
    setSaving(true);
    setSaveError("");
    setSavedTask(null);
    try {
      await fetchJson("/api/archive-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Practice-Account": actor },
        body: JSON.stringify(input),
      });
      if (!current()) return;
      await progress.mutate(
        (current) => ({
          progress: [
            ...(current?.progress ?? []).filter(
              (entry) => entry.taskId !== input.taskId,
            ),
            input,
          ],
        }),
        { revalidate: true },
      );
      void mutateAll(
        (key) =>
          Array.isArray(key) &&
          key[0] === "/api/dashboard" &&
          key[1] === actor,
      );
      if (current()) setSavedTask(input.taskId);
    } catch (reason) {
      if (!current()) return;
      setSaveError(
        reason instanceof Error
          ? reason.message
          : "Could not save progress. Please retry.",
      );
    } finally {
      if (current()) setSaving(false);
    }
  }
  return {
    session,
    progress: { ...progress, data: account && !progress.error ? progress.data : undefined },
    stored,
    saving: activeSave && saving,
    saveError: activeSave ? saveError : "",
    savedTask: activeSave ? savedTask : null,
    setSavedTask,
    saveTask,
  };
}
