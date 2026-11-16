"use client";
import { Button } from "@/components/ui/button";
import { setPartAnswerMode, type EditorDraft } from "@/lib/problem-authoring-editor";
import { AnswerPanel } from "./answer-panel";
import { BlocksEditor, Field, inputClass } from "./editor-fields";
import { allParts, privateFor, removePart } from "./simple-model";

/** A compact view of the existing parts and private keys, not a separate draft model. */
export function FileParts({ draft, edit, provisional }: { draft: EditorDraft; edit: (fn: (d: EditorDraft) => void) => void; provisional: boolean }) {
  const parts = allParts(draft);
  return <>{parts.map(({ part, sectionIndex, partIndex }, i) => {
    const entry = privateFor(draft, part.id);
    return <section key={part.id} aria-label={`Part ${i + 1}`} className="min-w-0 space-y-5 rounded-xl border bg-card p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Part {part.label || i + 1}</h2>
        {parts.length > 1 && <Button type="button" variant="outline" onClick={() => { if (window.confirm("Remove this part and its private answer key?")) edit(d => removePart(d, part.id)); }}>Remove part {i + 1}</Button>}
      </div>
      <Field label={`Part ${i + 1} label`} help="Match the part label in your PDF or images.">
        {id => <input id={id} className={inputClass} maxLength={80} value={part.label} onChange={e => edit(d => { d.content.sections[sectionIndex].parts[partIndex].label = e.target.value; })} />}
      </Field>
      <p className="text-sm text-muted-foreground">Add statement images or optional native instructions below. Describe each image for students who cannot see it.</p>
      <fieldset disabled={provisional} className="min-w-0">
        <legend className="sr-only">Part {i + 1} statement</legend>
        <BlocksEditor label={`Part ${i + 1} statement`} blocks={part.blocks} onChange={blocks => edit(d => { d.content.sections[sectionIndex].parts[partIndex].blocks = blocks; })} />
      </fieldset>
      <h3 className="font-semibold">Private answer key</h3>
      <div data-simple-field={`a:${part.id}`}><AnswerPanel compact entry={entry} mode={part.answerMode} onChange={value => edit(d => { d.privateParts = [...d.privateParts.filter(p => p.partId !== part.id), value]; })} onMode={mode => {
        if (mode === part.answerMode && entry.key) return;
        if (entry.key && !window.confirm("Change answer type? This replaces the current private grading configuration. Hints and solution remain.")) return;
        edit(d => setPartAnswerMode(d, part.id, mode));
      }} /></div>
      {!entry.key && <Button type="button" variant="outline" onClick={() => edit(d => setPartAnswerMode(d, part.id, part.answerMode))}>Set answer configuration</Button>}
    </section>;
  })}</>;
}
