import { z } from "zod";
import {
  authoredDraftSchema,
  authoredDocumentSchema,
  privatePartSchema,
  type AuthoredDocument,
} from "./problem-authoring";

// Incomplete numeric fields stay blank in the editor/recovery copy; server contracts
// remain authoritative and prevent saving/publishing until they are finite numbers.
const numericValue = z
  .union([z.number().finite(), z.string().max(80)])
  .nullable();
const numericInput = z.strictObject({
  kind: z.literal("numeric"),
  value: numericValue,
  units: z.string().max(80),
  absTol: numericValue,
  relTol: numericValue,
});
const expressionInput = z.strictObject({
  kind: z.literal("expression"),
  expected: z.string().max(180),
  variables: z
    .array(
      z.strictObject({
        name: z.string().max(32),
        domain: z.literal("real"),
        min: numericValue.optional(),
        max: numericValue.optional(),
        assumptions: z
          .array(z.enum(["positive", "nonnegative", "nonzero"]))
          .max(3),
      }),
    )
    .max(20),
  angleUnit: z.enum(["radians", "degrees"]),
  exclusions: z.array(z.string()),
});
export const editorDraftSchema = z.object({
  ...authoredDraftSchema.shape,
  content: z.strictObject({ ...authoredDocumentSchema.shape }),
  privateParts: z
    .array(
      privatePartSchema.extend({
        key: z
          .union([
            numericInput,
            expressionInput,
            z.strictObject({ kind: z.literal("manual") }),
          ])
          .nullable(),
      }),
    )
    .max(1500),
  state: z.enum(["draft", "published", "archived"]),
  slug: z.string(),
});
export type EditorDraft = z.infer<typeof editorDraftSchema>;
export type EditorBlock = AuthoredDocument["context"][number];
export const editorBase = "/api/authored-problems/drafts";
export class DraftRequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function draftRequest(
  path: string,
  method = "GET",
  body?: unknown,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok)
    throw new DraftRequestError(
      response.status,
      result?.error || "Request failed. Your local work is retained.",
    );
  return result;
}
export function newProblem() {
  return {
    content: {
      title: "",
      topicTags: [],
      methodTags: [],
      estimatedDifficulty: null,
      context: [],
      sections: [],
      provenance: {
        kind: "original" as const,
        source: "",
        rightsDeclaration: "",
      },
      attachments: [],
    },
    privateParts: [],
  };
}
export function newBlock(kind: "text" | "math"): EditorBlock {
  return kind === "text"
    ? { id: crypto.randomUUID(), kind, spans: [{ kind: "text", text: "" }] }
    : { id: crypto.randomUUID(), kind, latex: "" };
}
export function moveItem<T>(list: T[], index: number, delta: -1 | 1) {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}
export function draftPayload(draft: EditorDraft) {
  return { content: draft.content, privateParts: draft.privateParts };
}
const fingerprint = (draft: EditorDraft) => JSON.stringify(draftPayload(draft));
type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;
type Phase = "saved" | "editing" | "saving" | "error" | "conflict";
export type EditorSnapshot = {
  draft: EditorDraft;
  phase: Phase;
  dirty: boolean;
  busy: boolean;
  message: string;
  recovery: EditorDraft | null;
  recoveryRaw: string | null;
  storageWarning: boolean;
};
type Save = (draft: EditorDraft) => Promise<EditorDraft>;

export class DraftEditorSession {
  private value: EditorSnapshot;
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setTimeout>;
  private flight?: Promise<boolean>;
  private generation = 0;
  private closed = false;
  private saved: string;
  private uncertainSave = false;
  constructor(
    draft: EditorDraft,
    private save: Save,
    private storage?: Storage,
    private key = "",
    private delay = 1800,
  ) {
    this.saved = fingerprint(draft);
    this.value = {
      draft,
      phase: "saved",
      dirty: false,
      busy: false,
      message: "All changes saved",
      recovery: null,
      recoveryRaw: null,
      storageWarning: !storage,
    };
    try {
      const raw = storage?.getItem(key);
      if (raw) {
        const decoded = JSON.parse(raw);
        const parsed = editorDraftSchema.safeParse(decoded.draft ?? decoded);
        if (
          parsed.success &&
          parsed.data.problemId === draft.problemId &&
          (decoded.pendingSave === true ||
            fingerprint(parsed.data) !== this.saved)
        ) {
          this.value.recovery = parsed.data;
          this.uncertainSave = decoded.pendingSave === true;
        } else if (parsed.success) storage?.removeItem(key);
        else this.value.recoveryRaw = raw;
      }
    } catch {
      this.value.storageWarning = true;
      try {
        this.value.recoveryRaw = storage?.getItem(key) ?? null;
      } catch {}
    }
  }
  snapshot = () => this.value;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit(patch: Partial<EditorSnapshot>) {
    if (this.closed) return;
    this.value = { ...this.value, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  private backup() {
    try {
      if (this.value.dirty)
        this.storage?.setItem(
          this.key,
          JSON.stringify({
            draft: this.value.draft,
            pendingSave: this.uncertainSave,
          }),
        );
      else this.storage?.removeItem(this.key);
    } catch {
      this.emit({ storageWarning: true });
    }
  }
  edit(recipe: (draft: EditorDraft) => void) {
    if (this.value.busy || this.value.recovery || this.value.recoveryRaw)
      return;
    const draft = structuredClone(this.value.draft);
    recipe(draft);
    this.generation++;
    const paused =
      this.value.phase === "conflict" || this.value.phase === "error";
    this.emit({
      draft,
      dirty: this.uncertainSave || fingerprint(draft) !== this.saved,
      ...(paused
        ? {}
        : { phase: "editing" as const, message: "Unsaved changes" }),
    });
    this.backup();
    clearTimeout(this.timer);
    if (!paused)
      this.timer = setTimeout(() => {
        void this.flush();
      }, this.delay);
  }
  flush(): Promise<boolean> {
    clearTimeout(this.timer);
    if (this.flight) return this.flight;
    if (
      this.value.phase === "conflict" ||
      this.value.recovery ||
      this.value.recoveryRaw
    )
      return Promise.resolve(false);
    this.flight = this.performSave().finally(() => {
      this.flight = undefined;
    });
    return this.flight;
  }
  private async performSave() {
    while (this.value.dirty && !this.closed) {
      const parsed = authoredDraftSchema.safeParse({
        problemId: this.value.draft.problemId,
        version: this.value.draft.version,
        ...draftPayload(this.value.draft),
      });
      if (!parsed.success) {
        this.emit({
          phase: "error",
          message:
            "Complete the highlighted validation fields before saving. Your work stays in this tab.",
        });
        return false;
      }
      const generation = this.generation;
      const submitted = structuredClone(this.value.draft);
      this.uncertainSave = true;
      this.emit({ phase: "saving", message: "Saving…" });
      this.backup();
      try {
        const server = editorDraftSchema.parse(await this.save(submitted));
        if (this.closed) return false;
        this.uncertainSave = false;
        this.saved = fingerprint(server);
        const draft =
          generation === this.generation
            ? server
            : {
                ...this.value.draft,
                version: server.version,
                state: server.state,
                slug: server.slug,
              };
        const dirty = fingerprint(draft) !== this.saved;
        this.emit({
          draft,
          dirty,
          phase: dirty ? "editing" : "saved",
          message: dirty ? "Saving newer edits…" : "All changes saved",
        });
        this.backup();
      } catch (error) {
        this.fail(error);
        return false;
      }
    }
    if (!this.closed)
      this.emit({ phase: "saved", message: "All changes saved" });
    return !this.closed;
  }
  fail(error: unknown) {
    const conflict = error instanceof DraftRequestError && error.status === 409;
    this.emit({
      phase: conflict ? "conflict" : "error",
      message: conflict
        ? "A newer version exists. Autosave is paused; your local work is retained."
        : error instanceof Error
          ? error.message
          : "Could not save. Your local work is retained.",
    });
    this.backup();
  }
  restoreRecovery() {
    const recovery = this.value.recovery;
    if (!recovery) return;
    const current = this.value.draft;
    const conflict = recovery.version !== current.version;
    this.generation++;
    this.emit({
      draft: { ...recovery, state: current.state, slug: current.slug },
      recovery: null,
      dirty: true,
      phase: conflict ? "conflict" : "editing",
      message: conflict
        ? "Recovered work uses an older version. Compare before replacing server content."
        : "Local work restored; review and save.",
    });
    this.backup();
    // Restoration is explicit, but saving is a second deliberate action.
  }
  discardRecovery() {
    this.uncertainSave = false;
    this.emit({ recovery: null, recoveryRaw: null });
    this.backup();
  }
  // Explicit conflict decisions only. No automatic merge or silent replacement.
  useServer(server: EditorDraft) {
    this.uncertainSave = false;
    this.generation++;
    this.saved = fingerprint(server);
    this.emit({
      draft: server,
      dirty: false,
      phase: "saved",
      message: "Loaded server version",
      recovery: null,
      recoveryRaw: null,
    });
    this.backup();
  }
  keepLocal(server: EditorDraft) {
    this.generation++;
    this.saved = fingerprint(server);
    this.emit({
      draft: {
        ...this.value.draft,
        version: server.version,
        state: server.state,
        slug: server.slug,
      },
      dirty: true,
      phase: "editing",
      message:
        "Local work kept over the loaded server version. Save when ready.",
    });
    this.backup();
  }
  async publish(
    action: "publish" | "unpublish",
    request: (draft: EditorDraft) => Promise<{ version: number }>,
  ) {
    if (
      this.value.busy ||
      this.value.recovery ||
      this.value.phase === "conflict"
    )
      return false;
    this.emit({ busy: true });
    try {
      if (!(await this.flush())) return false;
      const result = await request(this.value.draft);
      this.emit({
        draft: {
          ...this.value.draft,
          version: result.version,
          state: action === "publish" ? "published" : "archived",
        },
        phase: "saved",
        message:
          action === "publish"
            ? "Published successfully"
            : "Unpublished; earlier revisions retained",
      });
      this.backup();
      return true;
    } catch (error) {
      this.fail(error);
      return false;
    } finally {
      this.emit({ busy: false });
    }
  }
  activate() {
    this.closed = false;
  }
  dispose() {
    this.closed = true;
    clearTimeout(this.timer);
    this.listeners.clear();
  }
}
