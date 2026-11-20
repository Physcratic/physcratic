// The real Simple editor with its draft kept in memory, for tests/simple-options.browser.mjs. No API, no database.
import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AuthorMediaProvider } from "../components/authoring/media-controls";
import { SimpleEditor } from "../components/authoring/simple-editor";
import { ensureSimpleShape } from "../components/authoring/simple-model";
import { newProblem, type EditorDraft } from "../lib/problem-authoring-editor";

const params = new URLSearchParams(location.search);
function start(): EditorDraft {
  const d: EditorDraft = { problemId: "00000000-0000-4000-8000-000000000001", version: 1, state: (params.get("state") as EditorDraft["state"]) ?? "draft", slug: "", ...structuredClone(newProblem()) };
  ensureSimpleShape(d);
  return d;
}
function Harness() {
  const [draft, setDraft] = useState(start);
  const edit = useCallback((fn: (d: EditorDraft) => void) => setDraft((d) => { const next = structuredClone(d); fn(next); return next; }), []);
  useEffect(() => { (window as unknown as { __draft: EditorDraft }).__draft = draft; }, [draft]);
  return (
    <AuthorMediaProvider problemId={draft.problemId} disabled={false} pending={() => {}}>
      <main className="mx-auto max-w-3xl p-4">
        <h1 className="sr-only">Simple editor test</h1>
        <SimpleEditor draft={draft} userId="browser-author" edit={edit} locked={false} provisional={false} otherIssues={[]} onPublish={() => {}} publishing={false} />
      </main>
    </AuthorMediaProvider>
  );
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><Harness /></React.StrictMode>);
