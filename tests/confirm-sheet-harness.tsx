// The shared Studio confirm sheet on its own, for tests/confirm-sheet.browser.mjs. Each button asks and counts what it ran.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ConfirmProvider, useConfirm } from "../components/authoring/confirm-sheet";
import { BlocksEditor } from "../components/authoring/editor-fields";
import { AuthorMediaProvider } from "../components/authoring/media-controls";
import type { EditorBlock } from "../lib/problem-authoring-editor";

declare global { interface Window { __ran: Record<string, number>; __addPicture: () => void } }
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
// A block list with one block of text. __addPicture stands for an image upload that finishes while the sheet is open.
function Blocks() {
  const [blocks, setBlocks] = useState<EditorBlock[]>([{ id: "text-1", kind: "text", spans: [{ kind: "text", text: "Some words" }] }]);
  window.__addPicture = () => setBlocks((b) => [...b, { id: "picture-1", kind: "image", mediaId: "11111111-1111-4111-8111-111111111111", alt: "A cart", caption: "" }]);
  return (
    <AuthorMediaProvider problemId="22222222-2222-4222-8222-222222222222" disabled pending={() => {}}>
      <main className="mx-auto max-w-xl space-y-4 p-4">
        <h1 className="text-xl font-semibold">Blocks test</h1>
        <BlocksEditor label="Blocks" blocks={blocks} onChange={setBlocks} />
        <p data-testid="ids">{blocks.map((b) => b.id).join(",")}</p>
      </main>
    </AuthorMediaProvider>
  );
}
const blocksPage = new URLSearchParams(location.search).get("page") === "blocks";
createRoot(document.getElementById("root")!).render(<React.StrictMode><ConfirmProvider>{blocksPage ? <Blocks /> : <Page />}</ConfirmProvider></React.StrictMode>);
