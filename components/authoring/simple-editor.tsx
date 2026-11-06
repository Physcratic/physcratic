"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, CircleAlert, ImagePlus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MathAnswerField } from "@/components/physics/math-answer-field";
import { PartChip, partBorder, partStyle } from "@/components/physics/solve-ui";
import { colorsByPartId } from "@/lib/part-colors";
import { displayName } from "@/lib/answer-reader";
import { physicsTopics, resolvePhysicsTag } from "@/lib/physics-taxonomy";
import { addTag, hasTag } from "@/lib/studio-tags";
import type { EditorDraft } from "@/lib/problem-authoring-editor";
import { inputClass } from "./editor-fields";
import { MediaImage, useAuthorMediaUpload } from "./media-controls";
import { RichMathText } from "./rich-math-text";
import {
  RIGHTS_TEXT,
  UNITS,
  addPart,
  addPicture,
  advancedNote,
  allParts,
  answerText,
  applyAnswer,
  blocksSpans,
  deriveTitle,
  ensureSimpleShape,
  mathSymbols,
  pictureOf,
  privateFor,
  readAnswer,
  removePart,
  removePicture,
  rightsState,
  setIntro,
  setPictureAlt,
  setQuestion,
  setRights,
  setSolution,
  setUnits,
  simpleIssues,
  testAnswer,
  verdictExplanation,
  verdictLabel,
  type Key,
} from "./simple-model";

export const TITLE_PLACEHOLDER = "2 to 5 words, such as Mind the Gap";

const labelClass = "block text-lg font-semibold leading-snug";
const fieldClass = `${inputClass} min-h-12 border-2 text-base focus-visible:border-ring`;

function ErrorLine({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-2 text-base text-destructive">
      <CircleAlert aria-hidden="true" className="mt-1 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export type SimpleProps = {
  draft: EditorDraft;
  edit: (fn: (d: EditorDraft) => void) => void;
  /** True while saving, uploading or recovering. */
  locked: boolean;
  /** True until the first draft is saved to the server. Pictures and Publish wait for it. */
  provisional: boolean;
  /** Messages from the publish rules that Simple has no field for. */
  otherIssues: string[];
  onPublish: () => void;
  publishing: boolean;
};

export function SimpleEditor(props: SimpleProps) {
  const { draft, edit, locked, provisional, otherIssues, onPublish, publishing } = props;
  /** What the author typed for each answer, which can be ahead of the saved key when it cannot be read yet. */
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  const parts = allParts(draft);
  const issues = simpleIssues(draft, typed);
  const colours = colorsByPartId(draft.content.sections);
  const shown = (field: string) => issues.find((i) => i.field === field && (attempted || touched[field]));
  const touch = (field: string) => setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  const note = advancedNote(draft);
  const rights = rightsState(draft);
  const blocked = issues.length > 0 || otherIssues.length > 0;
  const introSpans = blocksSpans(draft.content.context);
  const firstQuestion = parts[0] ? blocksSpans(parts[0].part.blocks) : [];
  const titleIsMade = draft.content.title !== "" && draft.content.title === deriveTitle(firstQuestion);

  // A draft made in Advanced can have no part yet. Simple starts it with part a.
  const noParts = parts.length === 0;
  useEffect(() => {
    if (noParts && !locked) edit((d) => ensureSimpleShape(d));
  }, [noParts, locked, edit]);

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
      const target = kind === "question" ? `q:${id}` : kind === "answer" ? `a:${id}` : kind === "units" ? `u:${id}` : kind === "picture" ? `p:${id}` : kind;
      requestAnimationFrame(() => {
        const host = document.querySelector<HTMLElement>(`[data-simple-field="${CSS.escape(target)}"]`);
        const control = host?.matches("input,textarea") ? host : host?.querySelector<HTMLElement>("input,textarea,[contenteditable=true],math-field");
        (control ?? host)?.focus();
        (control ?? host)?.scrollIntoView({ block: "center" });
      });
      return;
    }
    onPublish();
  }

  return (
    <fieldset disabled={locked} className="mx-auto min-w-0 max-w-2xl space-y-12 disabled:opacity-70">
      <legend className="sr-only">Problem</legend>
      {note && <p className="rounded-lg border-2 p-4 text-base">{note}</p>}

      {introSpans.length > 0 && <Intro draft={draft} edit={edit} />}

      {parts.map(({ part, position }) => (
        <PartEditor
          key={part.id}
          draft={draft}
          partId={part.id}
          first={position === 0}
          letter={part.label || String(position + 1)}
          colour={colours.get(part.id) ?? 0}
          typed={part.id in typed ? typed[part.id] : answerText(privateFor(draft, part.id).key)}
          canRemove={parts.length > 1}
          provisional={provisional}
          questionIssue={shown(`question:${part.id}`)?.message}
          answerIssue={shown(`answer:${part.id}`)?.message}
          unitIssue={shown(`units:${part.id}`)?.message}
          pictureIssue={shown(`picture:${part.id}`)?.message}
          touch={touch}
          edit={edit}
          onAnswer={(text) => answerChanged(part.id, text)}
          onRemove={() => {
            if (!window.confirm("Remove this part and its answer?")) return;
            edit((d) => removePart(d, part.id));
          }}
        />
      ))}
      <Button type="button" variant="outline" className="min-h-12 border-2 text-base" disabled={parts.length >= 50} onClick={() => edit((d) => addPart(d))}>
        <Plus aria-hidden="true" className="mr-2 size-5" />
        Add another part
      </Button>

      <div className="space-y-3">
        <label htmlFor="simple-title" className={labelClass}>Title</label>
        <input
          id="simple-title"
          data-simple-field="title"
          className={fieldClass}
          placeholder={TITLE_PLACEHOLDER}
          maxLength={200}
          value={draft.content.title}
          aria-invalid={shown("title") ? true : undefined}
          aria-describedby={shown("title") ? "simple-title-error" : titleIsMade ? "simple-title-help" : undefined}
          onBlur={() => touch("title")}
          onChange={(e) => edit((d) => void (d.content.title = e.target.value))}
        />
        {titleIsMade && !shown("title") && <p id="simple-title-help" className="text-base text-muted-foreground">We made this from your question. Change it if you like.</p>}
        {shown("title") && <ErrorLine id="simple-title-error">{shown("title")!.message}</ErrorLine>}
      </div>

      <TopicRow values={draft.content.topicTags} change={(v) => edit((d) => void (d.content.topicTags = v))} />

      <div className="space-y-5 border-t-2 pt-8">
        {rights === "advanced" ? (
          <p className="text-base text-muted-foreground">
            {draft.content.provenance.kind === "authorized"
              ? "This problem is marked as used with permission. You can change that in Advanced."
              : "Your rights declaration from Advanced is kept."}
          </p>
        ) : (
          <div className="space-y-2">
            <label className="flex min-h-11 items-start gap-3 text-base">
              <input
                id="simple-rights"
                data-simple-field="rights"
                type="checkbox"
                className="mt-1 size-6 shrink-0"
                checked={rights === "ticked"}
                aria-describedby={shown("rights") ? "simple-rights-error" : undefined}
                onChange={(e) => {
                  touch("rights");
                  edit((d) => setRights(d, e.target.checked));
                }}
              />
              <span>{RIGHTS_TEXT}</span>
            </label>
            {shown("rights") && <ErrorLine id="simple-rights-error">{shown("rights")!.message}</ErrorLine>}
          </div>
        )}
        {attempted && otherIssues.length > 0 && (
          <ul role="alert" className="space-y-1 text-base text-destructive">
            {otherIssues.slice(0, 4).map((m, i) => (
              <li key={i}>{m} Fix it in Advanced.</li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          size="lg"
          data-tour="studio-publish"
          className="min-h-12 w-full text-base sm:w-auto sm:px-10"
          disabled={locked || (provisional && !blocked)}
          onClick={publish}
        >
          {publishing ? "Working…" : provisional && !blocked ? "Saving your first draft…" : draft.state === "published" ? "Publish new version" : "Publish"}
        </Button>
        {draft.state === "published" && (
          <a
            href={`/dashboard/authored/${draft.problemId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-base font-medium underline underline-offset-4"
          >
            Open the problem as a student sees it
          </a>
        )}
      </div>
    </fieldset>
  );
}

function Intro({ draft, edit }: { draft: EditorDraft; edit: SimpleProps["edit"] }) {
  const id = useId();
  return (
    <div className="space-y-3">
      <p id={`${id}-label`} className={labelClass}>Intro for every part</p>
      <RichMathText
        id={id}
        labelId={`${id}-label`}
        spans={blocksSpans(draft.content.context)}
        onChange={(spans) => edit((d) => setIntro(d, spans))}
        placeholder="Something every part shares"
        minRows={3}
      />
    </div>
  );
}

function TopicRow({ values, change }: { values: string[]; change: (values: string[]) => void }) {
  const id = useId();
  return (
    <div className="space-y-3">
      <p id={id} className={labelClass}>Pick a topic so people can find it (optional)</p>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {physicsTopics.map((tag) => {
          const on = hasTag(values, tag, "topic");
          return (
            <button
              key={tag.id}
              type="button"
              aria-pressed={on}
              onClick={() => change(on ? values.filter((v) => resolvePhysicsTag(v, "topic")?.id !== tag.id) : addTag(values, tag, "topic"))}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-input px-4 text-base hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-foreground aria-pressed:bg-accent aria-pressed:font-medium aria-pressed:text-accent-foreground"
            >
              {on && <Check aria-hidden="true" className="size-4" />}
              {tag.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PartEditor({
  draft, partId, first, letter, colour, typed, canRemove, provisional, questionIssue, answerIssue, unitIssue, pictureIssue,
  touch, edit, onAnswer, onRemove,
}: {
  draft: EditorDraft;
  partId: string;
  first: boolean;
  letter: string;
  colour: number;
  typed: string;
  canRemove: boolean;
  provisional: boolean;
  questionIssue?: string;
  answerIssue?: string;
  unitIssue?: string;
  pictureIssue?: string;
  touch: (field: string) => void;
  edit: SimpleProps["edit"];
  onAnswer: (text: string) => void;
  onRemove: () => void;
}) {
  const base = useId();
  const part = allParts(draft).find((r) => r.part.id === partId)!.part;
  const entry = privateFor(draft, partId);
  const key = entry.key;
  const read = useMemo(() => readAnswer(typed), [typed]);
  const questionSpans = blocksSpans(part.blocks);
  const keySymbols = key?.kind === "expression" ? key.variables.map((v) => v.name) : [];
  const symbols = useMemo(() => [...new Set([...keySymbols, ...mathSymbols(questionSpans)])], [keySymbols.join(","), JSON.stringify(questionSpans)]); // eslint-disable-line react-hooks/exhaustive-deps
  const picture = pictureOf(part.blocks);
  const media = useAuthorMediaUpload("statement-image");
  const pictureInput = useRef<HTMLInputElement>(null);
  const [dropping, setDropping] = useState(false);
  const [pictureNote, setPictureNote] = useState("");

  async function addFile(file: File) {
    if (provisional) {
      setPictureNote("Write your question first, then add the picture.");
      return;
    }
    setPictureNote("");
    const info = await media.upload(file);
    if (info)
      edit((d) => {
        removePicture(d, partId);
        addPicture(d, partId, info.id);
      });
  }

  return (
    <section
      aria-label={`Part ${letter}`}
      style={partStyle(colour)}
      className={`space-y-10 rounded-xl border-2 bg-card p-5 sm:p-8 ${partBorder}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold"><PartChip index={colour}>Part {letter}</PartChip></h2>
        {canRemove && (
          <Button type="button" variant="ghost" className="min-h-11" onClick={onRemove}>
            <Trash2 aria-hidden="true" className="mr-2 size-4" />
            Remove part {letter}
          </Button>
        )}
      </div>

      <div className="space-y-3" data-tour={first ? "studio-question" : undefined}>
        <p id={`${base}-q-label`} className={labelClass}>What&apos;s the question?</p>
        <div data-simple-field={`q:${partId}`} onBlur={() => touch(`question:${partId}`)}>
          <RichMathText
            id={`${base}-q`}
            labelId={`${base}-q-label`}
            spans={questionSpans}
            onChange={(spans) => edit((d) => setQuestion(d, partId, spans))}
            placeholder="A ball is thrown up at 12 m/s. How high does it go?"
            invalid={!!questionIssue}
            describedBy={questionIssue ? `${base}-q-error` : undefined}
            symbols={symbols}
            onPasteFile={(file) => void addFile(file)}
            buttonTour={first ? "studio-equation" : undefined}
          />
        </div>
        {questionIssue && <ErrorLine id={`${base}-q-error`}>{questionIssue}</ErrorLine>}
      </div>

      <div className="space-y-3" data-tour={first ? "studio-image" : undefined} data-simple-field={`p:${partId}`}>
        <p className={labelClass}>Add a picture (optional)</p>
        {!picture ? (
          <div
            className={`flex flex-wrap items-center gap-3 rounded-lg border-2 border-dashed p-4 ${dropping ? "border-ring bg-accent" : "border-input"}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDropping(true);
            }}
            onDragLeave={() => setDropping(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDropping(false);
              const file = e.dataTransfer.files[0];
              if (file) void addFile(file);
            }}
          >
            <Button type="button" variant="outline" className="min-h-11 border-2" disabled={media.locked || provisional} onClick={() => pictureInput.current?.click()}>
              <ImagePlus aria-hidden="true" className="mr-2 size-4" />
              Choose a picture
            </Button>
            <span className="text-base text-muted-foreground">or drop one here</span>
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border-2 p-4">
            <MediaImage mediaId={picture.mediaId} alt={picture.alt} />
            <div className="space-y-2">
              <label htmlFor={`${base}-alt`} className={labelClass}>Describe the picture</label>
              <input
                id={`${base}-alt`}
                className={fieldClass}
                placeholder="A ball thrown upwards from the ground"
                maxLength={1000}
                value={picture.alt}
                aria-invalid={pictureIssue ? true : undefined}
                aria-describedby={pictureIssue ? `${base}-alt-error` : undefined}
                onBlur={() => touch(`picture:${partId}`)}
                onChange={(e) => edit((d) => setPictureAlt(d, partId, e.target.value))}
              />
              {pictureIssue && <ErrorLine id={`${base}-alt-error`}>{pictureIssue}</ErrorLine>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="min-h-11 border-2" disabled={media.locked} onClick={() => pictureInput.current?.click()}>
                Choose a different picture
              </Button>
              <Button type="button" variant="ghost" className="min-h-11" onClick={() => edit((d) => removePicture(d, partId))}>
                Remove picture
              </Button>
            </div>
          </div>
        )}
        <input
          ref={pictureInput}
          type="file"
          hidden
          accept="image/png,image/jpeg,image/webp"
          aria-label={`Picture for part ${letter}`}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            if (file) void addFile(file);
          }}
        />
        {provisional && !picture && <p className="text-base text-muted-foreground">Write your question first, then add a picture.</p>}
        <p role={media.error ? "alert" : "status"} className={`text-base ${media.error ? "text-destructive" : "text-muted-foreground"}`}>
          {media.busy ? "Uploading…" : media.error || pictureNote}
        </p>
      </div>

      <div className="space-y-3" data-tour={first ? "studio-answer" : undefined}>
        <label id={`${base}-a-label`} htmlFor={`${base}-a`} className={labelClass}>Final answer. We check students against this.</label>
        <div data-simple-field={`a:${partId}`}>
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
            describedBy={answerIssue ? `${base}-a-error` : undefined}
            placeholder="v^2/(2g) or 7.3"
            emptyHint="v^2/(2g) or 7.3"
            maxLength={180}
          />
        </div>
        {answerIssue && <ErrorLine id={`${base}-a-error`}>{answerIssue}</ErrorLine>}
        {read.kind === "number" && key?.kind === "numeric" && (
          <div className="space-y-2 pt-1">
            <label htmlFor={`${base}-u`} className={labelClass}>Unit (optional)</label>
            <input
              id={`${base}-u`}
              data-simple-field={`u:${partId}`}
              list={`${base}-units`}
              className={`${fieldClass} sm:max-w-56`}
              placeholder="m/s^2"
              maxLength={80}
              autoComplete="off"
              value={key.units}
              aria-invalid={unitIssue ? true : undefined}
              aria-describedby={unitIssue ? `${base}-u-error` : undefined}
              onBlur={() => touch(`units:${partId}`)}
              onChange={(e) => edit((d) => setUnits(d, partId, e.target.value))}
            />
            <datalist id={`${base}-units`}>{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
            {unitIssue && <ErrorLine id={`${base}-u-error`}>{unitIssue}</ErrorLine>}
          </div>
        )}
        {read.kind === "expression" && (
          <div className="flex flex-wrap items-center gap-2 text-base">
            <span className="text-muted-foreground">Symbols we found:</span>
            <ul aria-label="Symbols in this answer" className="flex flex-wrap gap-2">
              {read.symbols.map((s) => (
                <li key={s} className="inline-flex min-h-9 items-center rounded-full border-2 border-foreground/60 bg-accent px-3 font-medium">{displayName(s)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <TryAnswer draft={draft} partId={partId} label={letter} tour={first} />

      <div className="space-y-3">
        <p id={`${base}-s-label`} className={labelClass}>Worked solution (optional)</p>
        <RichMathText
          id={`${base}-s`}
          labelId={`${base}-s-label`}
          spans={blocksSpans(entry.solution)}
          onChange={(spans) => edit((d) => setSolution(d, partId, spans))}
          placeholder="Start with energy. At the top the ball stops."
          symbols={symbols}
          minRows={3}
        />
      </div>
    </section>
  );
}

/**
 * Type an answer and see what a student would see. It uses the same reader and checker as the student route,
 * against the key in this draft, so nothing here is saved.
 */
function TryAnswer({ draft, partId, label, tour }: { draft: EditorDraft; partId: string; label: string; tour: boolean }) {
  const base = useId();
  const [text, setText] = useState("");
  const [units, setUnitsText] = useState("");
  const key: Key = privateFor(draft, partId).key;
  const symbols = key?.kind === "expression" ? key.variables.map((v) => v.name) : [];
  const result = testAnswer({ key, seed: `${draft.problemId}:${partId}`, text, units });
  return (
    <div className="space-y-3 rounded-lg border-2 bg-background p-4" data-tour={tour ? "studio-try" : undefined}>
      <p id={`${base}-label`} className={labelClass}>Try an answer</p>
      {key?.kind === "numeric" ? (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <input
            aria-labelledby={`${base}-label`}
            className={fieldClass}
            inputMode="decimal"
            autoComplete="off"
            maxLength={80}
            placeholder="9.8"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input aria-label={`Unit for part ${label}`} className={fieldClass} autoComplete="off" maxLength={80} placeholder="m/s^2" value={units} onChange={(e) => setUnitsText(e.target.value)} />
        </div>
      ) : key?.kind === "expression" ? (
        <MathAnswerField id={`${base}-t`} labelId={`${base}-label`} value={text} onChange={setText} symbols={symbols} maxLength={180} emptyHint="What a student might write" />
      ) : (
        <p className="text-base text-muted-foreground">Add the final answer above, then try one.</p>
      )}
      <p role="status" aria-live="polite" data-test-result="" className="text-base">
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
