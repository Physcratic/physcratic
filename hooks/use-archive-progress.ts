"use client";

import { useState } from "react";
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
  const { mutate: mutateAll } = useSWRConfig();
  const progress = useSWR<{ progress: ArchiveTaskProgress[] }>(
    session.data?.user ? ["/api/archive-progress", session.data.user.id] : null,
    ([url]: [string, string]) =>
      fetchJson<{ progress: ArchiveTaskProgress[] }>(url),
    apiReadSWRConfig,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedTask, setSavedTask] = useState<string | null>(null);
  const stored = Object.fromEntries(
    (progress.data?.progress ?? []).map((entry) => [entry.taskId, entry]),
  );
  async function saveTask(input: ArchiveTaskProgress) {
    if (
      saving ||
      !session.data?.user ||
      session.isPending ||
      session.error ||
      progress.error ||
      progress.isLoading
    )
      return;
    setSaving(true);
    setSaveError("");
    setSavedTask(null);
    try {
      await fetchJson("/api/archive-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
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
          key[1] === session.data?.user.id,
      );
      setSavedTask(input.taskId);
    } catch (reason) {
      setSaveError(
        reason instanceof Error
          ? reason.message
          : "Could not save progress. Please retry.",
      );
    } finally {
      setSaving(false);
    }
  }
  return {
    session,
    progress,
    stored,
    saving,
    saveError,
    savedTask,
    setSavedTask,
    saveTask,
  };
}
