"use client";
import { useEffect, useId, useMemo, useState } from "react";
import { CircleAlert, Eye, FilePenLine, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MathAnswerField } from "@/components/physics/math-answer-field";
import { PartChip, partBorder, partStyle } from "@/components/physics/solve-ui";
import { colorsByPartId } from "@/lib/part-colors";
import { authoredDocumentSchema, publicAuthoredContent } from "@/lib/problem-authoring";
import type { EditorDraft } from "@/lib/problem-authoring-editor";
import { displayName } from "@/lib/answer-reader";
import { ReaderBlocks, inputClass } from "./editor-fields";
import { TagPicker } from "./tag-picker";
import {
  RIGHTS_TEXT,
  UNITS,
  addEasyPart,
  advancedNote,
  allParts,
  answerText,
  applyAnswer,
  blocksText,
  easyIssues,
  privateFor,
  readAnswer,
  removeEasyPart,
  rightsState,
  setHint,
  setProblemText,
  setQuestion,
  setRights,
  setSolution,
  setUnits,
  testAnswer,
  verdictExplanation,
  verdictLabel,
  type Key,
} from "./easy-model";

export const TITLE_PLACEHOLDER = "2 to 5 words, such as Mind the Gap";

/** Where the cursor was when the draft was created, so typing carries on in the new editor. */
export type EasyFocus = { field: string; start: number | null; end: number | null };
let restoreFocus: EasyFocus | null = null;
export function rememberEasyFocus(): void {
  const el = document.activeElement;
  const host = el instanceof HTMLElement ? el.closest<HTMLElement>("[data-easy-field]") : null;
  const input = host instanceof HTMLInputElement || host instanceof HTMLTextAreaElement ? host : null;
  restoreFocus = host ? { field: host.dataset.easyField!, start: input?.selectionStart ?? null, end: input?.selectionEnd ?? null } : null;
}

function ErrorLine({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-2 text-sm text-destructive">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
const areaClass = `${inputClass} min-h-24 leading-relaxed`;

export type EasyProps = {
  draft: EditorDraft;
  edit: (fn: (d: EditorDraft) => void) => void;
  /** True while saving, uploading or recovering. */
  locked: boolean;
  /** True until the first draft is saved to the server. Publish waits. */
  provisional: boolean;
  /** Messages from the publish rules that Easy has no field for, such as an image without alternative text. */
  otherIssues: string[];
  onPublish: () => void;
  publishing: boolean;
};

export function EasyEditor(props: EasyProps) {
  const { draft, edit, locked, provisional, otherIssues, onPublish, publishing } = props;
  const [tab, setTab] = useState<"write" | "preview">("write");
  /** What the author typed for each answer, which can be ahead of the saved key when it cannot be read yet. */
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  const parts = allParts(draft);
  const issues = easyIssues(draft, typed);
  const colours = colorsByPartId(draft.content.sections);
  const shown = (field: string) => issues.find((i) => i.field === field && (attempted || touched[field]));
  const touch = (field: string) => setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  const note = advancedNote(draft);
  const rights = rightsState(draft);
  const blocked = issues.length > 0 || otherIssues.length > 0;

  // Carry the cursor over when the first save replaces this editor with the saved one.
  useEffect(() => {
    const target = restoreFocus;
    restoreFocus = null;
    if (!target) return;
    const el = document.querySelector<HTMLElement>(`[data-easy-field="${CSS.escape(target.field)}"]`);
    if (!el) return;
    el.focus({ preventScroll: true });
    if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && target.start !== null)
      el.setSelectionRange(target.start, target.end ?? target.start);
  }, []);

  function answerChanged(partId: string, text: string) {
    setTyped((t) => ({ ...t, [partId]: text }));
    const read = readAnswer(text);
    edit((d) => applyAnswer(d, partId, read, text));
  }
  function publish() {
    setAttempted(true);
    if (blocked) {
      const first = issues[0]?.field ?? "";
      const [kind, id] = first.split(":");
      const target = kind === "question" ? `q:${id}` : kind === "answer" ? `a:${id}` : kind === "units" ? `u:${id}` : kind;
      requestAnimationFrame(() => {
        const host = document.querySelector<HTMLElement>(`[data-easy-field="${CSS.escape(target)}"]`) ?? document.getElementById("easy-rights");
        const control = host?.matches("input,textarea,math-field") ? host : host?.querySelector<HTMLElement>("input,textarea,math-field");
        (control ?? host)?.focus();
        (control ?? host)?.scrollIntoView({ block: "center" });
      });
      return;
    }
    onPublish();
  }

  const safe = useMemo(() => {
    const check = authoredDocumentSchema.safeParse(draft.content);
    return check.success ? publicAuthoredContent(check.data) : null;
  }, [draft.content]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 lg:hidden" role="group" aria-label="Easy view">
        <Button type="button" aria-pressed={tab === "write"} variant={tab === "write" ? "secondary" : "ghost"} onClick={() => setTab("write")}>
          <FilePenLine className="mr-2 size-4" aria-hidden="true" />
          Write
        </Button>
        <Button type="button" aria-pressed={tab === "preview"} variant={tab === "preview" ? "secondary" : "ghost"} onClick={() => setTab("preview")}>
          <Eye className="mr-2 size-4" aria-hidden="true" />
          Preview
        </Button>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
        <fieldset disabled={locked} className={`min-w-0 space-y-8 disabled:opacity-70 ${tab === "write" ? "" : "hidden lg:block"}`}>
          <legend className="sr-only">Problem</legend>
          {note && <p className="rounded-lg border p-3 text-sm text-muted-foreground">{note}</p>}

          <div className="space-y-2">
            <label htmlFor="easy-title" className="block text-sm font-medium">Title</label>
            <input
              id="easy-title"
              data-easy-field="title"
              className={`${inputClass} py-3 text-xl font-medium`}
              placeholder={TITLE_PLACEHOLDER}
              maxLength={200}
              value={draft.content.title}
              aria-invalid={shown("title") ? true : undefined}
              aria-describedby={shown("title") ? "easy-title-error" : undefined}
              onBlur={() => touch("title")}
              onChange={(e) => edit((d) => void (d.content.title = e.target.value))}
            />
            {shown("title") && <div data-easy-error="true"><ErrorLine id="easy-title-error">{shown("title")!.message}</ErrorLine></div>}
          </div>

          <div className="space-y-2">
            <label htmlFor="easy-problem" className="block text-sm font-medium">Problem text</label>
            <textarea
              id="easy-problem"
              data-easy-field="problem"
              className={areaClass}
              rows={5}
              value={blocksText(draft.content.context)}
              aria-describedby="easy-problem-help"
              onChange={(e) => edit((d) => setProblemText(d, e.target.value))}
            />
            <p id="easy-problem-help" className="text-xs leading-relaxed text-muted-foreground">
              Put maths between dollar signs, such as $F = ma$.
            </p>
          </div>

          <div className="space-y-6">
            {parts.map(({ part, position }) => (
              <PartEditor
                key={part.id}
                draft={draft}
                partId={part.id}
                letter={part.label || String(position + 1)}
                colour={colours.get(part.id) ?? 0}
                typed={part.id in typed ? typed[part.id] : answerText(privateFor(draft, part.id).key)}
                canRemove={parts.length > 1}
                questionIssue={shown(`question:${part.id}`)?.message}
                answerIssue={shown(`answer:${part.id}`)?.message}
                unitIssue={shown(`units:${part.id}`)?.message}
                touch={touch}
                edit={edit}
                onAnswer={(text) => answerChanged(part.id, text)}
                onRemove={() => {
                  if (!window.confirm("Remove this part and its answer?")) return;
                  edit((d) => removeEasyPart(d, part.id));
                }}
              />
            ))}
            <Button type="button" variant="outline" disabled={parts.length >= 50} onClick={() => edit((d) => addEasyPart(d))}>
              <Plus className="mr-2 size-4" aria-hidden="true" />
              Add a part
            </Button>
            {parts.length === 0 && shown("parts") && <ErrorLine id="easy-parts-error">{shown("parts")!.message}</ErrorLine>}
          </div>

          <TagPicker
            kind="topic"
            label="Topics"
            values={draft.content.topicTags}
            change={(v) => edit((d) => void (d.content.topicTags = v))}
          />

          <div className="space-y-4 border-t pt-6">
            {rights === "advanced" ? (
              <p className="text-sm text-muted-foreground">
                {draft.content.provenance.kind === "authorized"
                  ? "This problem is marked as used with permission. Change that in Advanced."
                  : "Your rights declaration from Advanced is kept."}
              </p>
            ) : (
              <div className="space-y-2">
                <label className="flex min-h-11 items-start gap-3 text-sm">
                  <input
                    id="easy-rights"
                    data-easy-field="rights"
                    type="checkbox"
                    className="mt-1 size-5 shrink-0"
                    checked={rights === "ticked"}
                    aria-describedby={shown("rights") ? "easy-rights-error" : undefined}
                    onChange={(e) => {
                      touch("rights");
                      edit((d) => setRights(d, e.target.checked));
                    }}
                  />
                  <span>{RIGHTS_TEXT}</span>
                </label>
                {shown("rights") && <div data-easy-error="true"><ErrorLine id="easy-rights-error">{shown("rights")!.message}</ErrorLine></div>}
              </div>
            )}
            {attempted && otherIssues.length > 0 && (
              <ul role="alert" className="space-y-1 text-sm text-destructive">
                {otherIssues.slice(0, 4).map((m, i) => (
                  <li key={i} data-easy-error="true">{m} Fix it in Advanced.</li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">Publishing makes the problem public. Answers, hints and solutions stay private until a student asks.</p>
            <Button type="button" size="lg" className="min-h-11 w-full sm:w-auto" disabled={locked || (provisional && !blocked)} onClick={publish}>
              {publishing ? "Working…" : provisional && !blocked ? "Saving your first draft…" : draft.state === "published" ? "Publish new revision" : "Publish problem"}
            </Button>
            {draft.state === "published" && (
              <a
                href={`/dashboard/authored/${draft.problemId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
              >
                Open student problem room
              </a>
            )}
          </div>
        </fieldset>

        <aside aria-label="Student preview" className={`min-w-0 lg:sticky lg:top-24 lg:self-start ${tab === "preview" ? "" : "hidden lg:block"}`}>
          <Preview draft={draft} safe={safe} colours={colours} />
        </aside>
      </div>
    </div>
  );
}

function PartEditor({
  draft, partId, letter, colour, typed, canRemove, questionIssue, answerIssue, unitIssue, touch, edit, onAnswer, onRemove,
}: {
  draft: EditorDraft;
  partId: string;
  letter: string;
  colour: number;
  typed: string;
  canRemove: boolean;
  questionIssue?: string;
  answerIssue?: string;
  unitIssue?: string;
  touch: (field: string) => void;
  edit: EasyProps["edit"];
  onAnswer: (text: string) => void;
  onRemove: () => void;
}) {
  const base = useId();
  const part = allParts(draft).find((r) => r.part.id === partId)!.part;
  const entry = privateFor(draft, partId);
  const key = entry.key;
  const read = useMemo(() => readAnswer(typed), [typed]);
  const symbols = key?.kind === "expression" ? key.variables.map((v) => v.name) : [];
  return (
    <section
      aria-label={`Part ${letter}`}
      style={partStyle(colour)}
      className={`space-y-5 rounded-lg border bg-card p-4 ${partBorder}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold"><PartChip index={colour}>Part {letter}</PartChip></h2>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove part ${letter}`} onClick={onRemove}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor={`${base}-q`} className="block text-sm font-medium">Question</label>
        <textarea
          id={`${base}-q`}
          data-easy-field={`q:${partId}`}
          className={areaClass}
          rows={3}
          value={blocksText(part.blocks)}
          aria-invalid={questionIssue ? true : undefined}
          aria-describedby={questionIssue ? `${base}-q-error` : undefined}
          onBlur={() => touch(`question:${partId}`)}
          onChange={(e) => edit((d) => setQuestion(d, partId, e.target.value))}
        />
        {questionIssue && <div data-easy-error="true"><ErrorLine id={`${base}-q-error`}>{questionIssue}</ErrorLine></div>}
      </div>

      <div className="space-y-2">
        <label id={`${base}-a-label`} htmlFor={`${base}-a`} className="block text-sm font-medium">Answer</label>
        <div data-easy-field={`a:${partId}`}>
          <MathAnswerField
            id={`${base}-a`}
            labelId={`${base}-a-label`}
            value={typed}
            onChange={(latex) => {
              touch(`answer:${partId}`);
              onAnswer(latex);
            }}
            symbols={symbols}
            invalid={!!answerIssue}
            describedBy={answerIssue ? `${base}-a-error` : `${base}-a-help`}
            placeholder="Type the answer, such as \frac{1}{2}mv^2 or 9.8"
            maxLength={180}
          />
        </div>
        {answerIssue ? (
          <div data-easy-error="true"><ErrorLine id={`${base}-a-error`}>{answerIssue}</ErrorLine></div>
        ) : (
          <p id={`${base}-a-help`} className="text-xs leading-relaxed text-muted-foreground">
            A number, or an expression. Type / for a fraction and ^ for a power.
          </p>
        )}
        {read.kind === "number" && key?.kind === "numeric" && (
          <div className="space-y-2 pt-1">
            <label htmlFor={`${base}-u`} className="block text-sm font-medium">Unit</label>
            <input
              id={`${base}-u`}
              data-easy-field={`u:${partId}`}
              list={`${base}-units`}
              className={`${inputClass} sm:max-w-48`}
              maxLength={80}
              autoComplete="off"
              value={key.units}
              aria-invalid={unitIssue ? true : undefined}
              aria-describedby={unitIssue ? `${base}-u-error` : undefined}
              onBlur={() => touch(`units:${partId}`)}
              onChange={(e) => edit((d) => setUnits(d, partId, e.target.value))}
            />
            <datalist id={`${base}-units`}>{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
            {unitIssue && <div data-easy-error="true"><ErrorLine id={`${base}-u-error`}>{unitIssue}</ErrorLine></div>}
            <p className="text-xs text-muted-foreground">Optional. Answers within 1% are accepted.</p>
          </div>
        )}
        {read.kind === "expression" && (
          <div className="space-y-1">
            <ul aria-label="Symbols in this answer" className="flex flex-wrap items-center gap-2">
              {read.symbols.map((s) => (
                <li key={s} className="inline-flex min-h-8 items-center rounded-full border border-foreground/60 bg-accent px-3 text-sm font-medium">{displayName(s)}</li>
              ))}
            </ul>
            <p className="text-xs leading-relaxed text-muted-foreground">
              These are the symbols students can use. Wrong? Change the answer. Write m g h as m g h, and a subscript as m_0.
            </p>
          </div>
        )}
      </div>

      <details className="rounded-lg border">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">Hint (optional)</summary>
        <div className="space-y-2 p-3 pt-0">
          <label htmlFor={`${base}-h`} className="block text-sm font-medium">Hint</label>
          <textarea id={`${base}-h`} className={areaClass} rows={3} value={blocksText(entry.hints)} onChange={(e) => edit((d) => setHint(d, partId, e.target.value))} />
        </div>
      </details>
      <details className="rounded-lg border">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">Solution (optional)</summary>
        <div className="space-y-2 p-3 pt-0">
          <label htmlFor={`${base}-s`} className="block text-sm font-medium">Solution</label>
          <textarea id={`${base}-s`} className={areaClass} rows={4} value={blocksText(entry.solution)} onChange={(e) => edit((d) => setSolution(d, partId, e.target.value))} />
        </div>
      </details>
    </section>
  );
}

function Preview({
  draft, safe, colours,
}: {
  draft: EditorDraft;
  safe: ReturnType<typeof publicAuthoredContent> | null;
  colours: Map<string, number>;
}) {
  if (!safe)
    return (
      <p role="alert" className="rounded-xl border p-4 text-sm">
        The preview needs the problem to be complete enough to show. Your work is kept.
      </p>
    );
  return (
    <article aria-label="Student-facing preview" className="space-y-6 rounded-xl border bg-card px-4 py-6 sm:px-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Student preview</h2>
      <p className="text-2xl font-semibold tracking-tight">{safe.title || "Untitled problem"}</p>
      {safe.topicTags.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Topics">
          {safe.topicTags.map((tag, i) => <li key={`${tag}-${i}`} className="rounded-full bg-muted px-3 py-1 text-xs">{tag}</li>)}
        </ul>
      )}
      <ReaderBlocks blocks={safe.context} />
      {safe.sections.flatMap((section) => [
        <ReaderBlocks key={`${section.id}-s`} blocks={section.blocks} />,
        ...section.parts.map((part, pi) => (
          <section
            key={part.id}
            aria-label={`Part ${part.label || pi + 1} preview`}
            style={partStyle(colours.get(part.id) ?? 0)}
            className={`space-y-3 rounded-r-lg py-1 pl-4 ${partBorder}`}
          >
            <p className="font-medium"><PartChip index={colours.get(part.id) ?? 0}>Part {part.label || pi + 1}</PartChip></p>
            <ReaderBlocks blocks={part.blocks} />
            <TestAnswer draft={draft} partId={part.id} label={part.label || String(pi + 1)} />
          </section>
        )),
      ])}
    </article>
  );
}

/**
 * Type an answer and see what a student would see. It uses the same reader and checker as the student route,
 * against the key in this draft, so nothing here is saved and no private value leaves the page.
 */
function TestAnswer({ draft, partId, label }: { draft: EditorDraft; partId: string; label: string }) {
  const base = useId();
  const [text, setText] = useState("");
  const [units, setUnitsText] = useState("");
  const key: Key = privateFor(draft, partId).key;
  const symbols = key?.kind === "expression" ? key.variables.map((v) => v.name) : [];
  const result = testAnswer({ key, seed: `${draft.problemId}:${partId}`, text, units });
  return (
    <div className="space-y-2 rounded-lg border bg-background p-3">
      <p id={`${base}-label`} className="text-sm font-medium">Test an answer for part {label}</p>
      {key?.kind === "numeric" ? (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <input
            aria-labelledby={`${base}-label`}
            className={inputClass}
            inputMode="decimal"
            autoComplete="off"
            maxLength={80}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input aria-label={`Unit for part ${label}`} className={inputClass} autoComplete="off" maxLength={80} value={units} onChange={(e) => setUnitsText(e.target.value)} />
        </div>
      ) : key?.kind === "expression" ? (
        <MathAnswerField id={`${base}-t`} labelId={`${base}-label`} value={text} onChange={setText} symbols={symbols} maxLength={180} />
      ) : (
        <p className="text-sm text-muted-foreground">Add the answer to test it.</p>
      )}
      <p role="status" aria-live="polite" data-test-result="" className="text-sm">
        {result.kind === "checked" ? (
          <>
            <strong>{verdictLabel[result.verdict]}.</strong> {verdictExplanation(result.verdict, result.reason)}
          </>
        ) : text.trim() ? (
          result.message
        ) : null}
      </p>
    </div>
  );
}
