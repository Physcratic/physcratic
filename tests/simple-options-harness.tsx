// The real Simple editor with its draft kept in memory, for tests/simple-options.browser.mjs. No API, no database.
import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AuthorMediaProvider } from "../components/authoring/media-controls";
import { SimpleEditor } from "../components/authoring/simple-editor";
import { addPart, allParts, applyAnswer, ensureSimpleShape, otherIssueMessages, readAnswer, setDifficulty, setQuestion, setSolution } from "../components/authoring/simple-model";
import { publishableDraftSchema } from "../lib/problem-authoring";
import { draftPayload, newProblem, type EditorDraft } from "../lib/problem-authoring-editor";

const params = new URLSearchParams(location.search);
function start(): EditorDraft {
  const d: EditorDraft = { problemId: "00000000-0000-4000-8000-000000000001", version: 1, state: (params.get("state") as EditorDraft["state"]) ?? "draft", slug: "", ...structuredClone(newProblem()) };
  ensureSimpleShape(d);
  // ?fixture=saved: an older draft with a second section, a method tag and rights in the author's own words.
  if (params.get("fixture") === "saved") {
    const text = (t: string) => ({ id: crypto.randomUUID(), kind: "text" as const, spans: [{ kind: "text" as const, text: t }] });
    d.content.title = "Older problem";
    d.content.sections[0].title = "Setup";
    d.content.sections.push({ id: crypto.randomUUID(), title: "Second", blocks: [text("Shared text")], parts: [{ id: crypto.randomUUID(), label: "b", blocks: [text("Next")], answerMode: "manual" }] });
    // &image=undescribed adds an image with no description to the second section.
    if (params.get("image") === "undescribed") {
      const mediaId = crypto.randomUUID();
      d.content.attachments = [{ id: mediaId, purpose: "statement-image" }];
      d.content.sections[1].blocks.push({ id: crypto.randomUUID(), kind: "image", mediaId, alt: "", caption: "" });
    }
    d.content.methodTags = ["energy-methods"];
    d.content.provenance = { kind: "authorized", source: "Email, 2 November", rightsDeclaration: "The school gave written permission." };
  }
  // &ready=1: everything Simple asks for outside More options is filled in, so only the problem-level issue under test is left.
  if (params.get("ready")) {
    d.content.title = "Older problem";
    setDifficulty(d, "2100");
    for (const { part } of allParts(d)) {
      setQuestion(d, part.id, [{ kind: "text", text: "Find the acceleration." }]);
      applyAnswer(d, part.id, readAnswer("9.8"), "9.8");
      setSolution(d, part.id, [{ kind: "text", text: "Use gravity along the slope." }]);
    }
  }
  // &provenance=nosource: rights in the author's own words and a permission with no source, which only the server notices.
  if (params.get("provenance") === "nosource") d.content.provenance = { kind: "authorized", source: "", rightsDeclaration: "The school gave written permission." };
  // &tags=repeat or many: a method tag listed twice, or thirty-one of them. &topics=repeat: a topic listed twice.
  if (params.get("tags") === "repeat") d.content.methodTags = ["energy-methods", "energy-methods"];
  if (params.get("tags") === "many") d.content.methodTags = Array.from({ length: 31 }, (_, i) => `method ${i}`);
  if (params.get("topics") === "repeat") d.content.topicTags = ["mechanics", "mechanics"];
  // &image=single: one section holding an image with no description, the way an Advanced draft can.
  if (params.get("image") === "single") {
    const mediaId = crypto.randomUUID();
    d.content.attachments = [{ id: mediaId, purpose: "statement-image" }];
    d.content.sections[0].blocks = [{ id: crypto.randomUUID(), kind: "image", mediaId, alt: "", caption: "" }];
  }
  // &context=1: a main question, then an equation and a second text block of shared setup.
  if (params.get("context") === "1") {
    const text = (t: string) => ({ id: crypto.randomUUID(), kind: "text" as const, spans: [{ kind: "text" as const, text: t }] });
    d.content.context = [text("Main question"), { id: crypto.randomUUID(), kind: "math" as const, latex: "E=mc^2" }, text("Shared two")];
  }
  // &blocks=1: every block type at the problem level, in a part's question and in a part's worked solution, for the extras groups.
  if (params.get("blocks") === "1") {
    const tx = (t: string) => ({ id: crypto.randomUUID(), kind: "text" as const, spans: [{ kind: "text" as const, text: t }] });
    const mx = (latex: string) => ({ id: crypto.randomUUID(), kind: "math" as const, latex });
    const im = (alt: string, caption: string) => ({ id: crypto.randomUUID(), kind: "image" as const, mediaId: crypto.randomUUID(), alt, caption });
    addPart(d);
    const [a, b] = allParts(d).map((r) => r.part);
    d.content.title = "Every block";
    d.content.context = [tx("Main question"), im("A ramp", "Figure 1"), mx("E=mc^2")];
    a.blocks = [tx("Question a"), im("Diagram a", "Diagram"), mx("x=1"), tx("Extra a"), im("Extra picture a", "")];
    b.blocks = [tx("Question b")];
    d.privateParts = d.privateParts.map((p) => (p.partId === a.id ? { ...p, solution: [tx("Solution a"), mx("s=1"), im("Solution picture", "Solution"), tx("Solution end")] } : p));
    const images = [...d.content.context, ...a.blocks, ...b.blocks].flatMap((x) => (x.kind === "image" ? [{ id: x.mediaId, purpose: "statement-image" as const }] : []));
    d.content.attachments = images;
  }
  return d;
}
function Harness() {
  const [draft, setDraft] = useState(start);
  const edit = useCallback((fn: (d: EditorDraft) => void) => setDraft((d) => { const next = structuredClone(d); fn(next); return next; }), []);
  useEffect(() => { (window as unknown as { __draft: EditorDraft }).__draft = draft; }, [draft]);
  // The same list the real editor passes: the server's publish rules that Simple does not word itself.
  const publishable = publishableDraftSchema.safeParse({ problemId: draft.problemId, version: draft.version, ...draftPayload(draft) });
  const otherIssues = publishable.success ? [] : otherIssueMessages(publishable.error.issues);
  return (
    <AuthorMediaProvider problemId={draft.problemId} disabled={false} pending={() => {}}>
      <main className="mx-auto max-w-3xl p-4">
        <h1 className="sr-only">Simple editor test</h1>
        <SimpleEditor draft={draft} userId="browser-author" edit={edit} locked={false} provisional={false} otherIssues={otherIssues} onPublish={() => {}} publishing={false} onUnpublish={() => ((window as unknown as { __unpublished: number }).__unpublished = ((window as unknown as { __unpublished?: number }).__unpublished ?? 0) + 1)} />
      </main>
    </AuthorMediaProvider>
  );
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><Harness /></React.StrictMode>);
