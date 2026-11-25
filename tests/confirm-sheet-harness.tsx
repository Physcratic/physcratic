// The shared Studio confirm sheet on its own, for tests/confirm-sheet.browser.mjs. Each button asks and counts what it ran.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ConfirmProvider, useConfirm } from "../components/authoring/confirm-sheet";

declare global { interface Window { __ran: Record<string, number> } }
window.__ran = { delete: 0, publish: 0 };

function Page() {
  const confirm = useConfirm();
  const [last, setLast] = useState("none");
  return (
    <main className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Confirm sheet test</h1>
      <button type="button" className="min-h-11 rounded-md border px-4" onClick={async () => {
        if (await confirm({ title: "Delete this draft?", message: "Saved working content is removed. Historical published revisions are retained.", confirmLabel: "Delete draft", danger: true })) { window.__ran.delete++; setLast("deleted"); }
        else setLast("kept");
      }}>Delete draft</button>
      <button type="button" className="min-h-11 rounded-md border px-4" onClick={async () => {
        if (await confirm({ title: "Publish this version?", message: "Its statement becomes public. Your grading keys stay private.", confirmLabel: "Publish" })) { window.__ran.publish++; setLast("published"); }
        else setLast("kept");
      }}>Publish version</button>
      <p role="status">Last answer: {last}</p>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><ConfirmProvider><Page /></ConfirmProvider></React.StrictMode>);
