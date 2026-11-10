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
import { RatingBandsPopover } from "@/components/physics/rating-bands-popover";
import { parseRating, ratingBands } from "@/lib/rating-bands";
import type { EditorDraft } from "@/lib/problem-authoring-editor";
import { inputClass } from "./editor-fields";
import { MediaImage, useAuthorMediaUpload } from "./media-controls";
import { RichMathText } from "./rich-math-text";
import {
  ADAPTED_RIGHTS_TEXT,
  RIGHTS_TEXT,
  UNITS,
  addContextPicture,
  addPart,
  addPicture,
  advancedNote,
  allParts,
  answerText,
  applyAnswer,
  blocksSpans,
  contextPictureOf,
  deriveTitle,
  difficultyLabel,
  difficultyRating,
  ensureSimpleShape,
  mathSymbols,
  partLetter,
  pictureOf,
  privateFor,
  readAnswer,
  removeContextPicture,
  removePart,
  removePicture,
  rightsState,
  setContextPictureAlt,
  setDifficulty,
  setIntro,
  setPictureAlt,
  setQuestion,
  setRights,
  setSolution,
  setSourceChoice,
  setSourceText,
  setUnits,
  sourceState,
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
      const target = kind === "question" ? `q:${id}` : kind === "answer" ? `a:${id}` : kind === "units" ? `u:${id}` : kind === "picture" ? `p:${id}` : kind === "solution" ? `s:${id}` : kind;
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

      <MainQuestion draft={draft} edit={edit} provisional={provisional} touch={touch} issue={shown("picture:main")?.message} />

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
          solutionIssue={shown(`solution:${part.id}`)?.message}
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
        Add part {partLetter(parts.length)}
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

      <SourceField draft={draft} edit={edit} touch={touch} issue={shown("source")?.message} />

      <DifficultyField draft={draft} edit={edit} />

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
              <span>{sourceState(draft).choice === "adapted" ? ADAPTED_RIGHTS_TEXT : RIGHTS_TEXT}</span>
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

/**
 * The main question: the setup every part shares, with equations and an image. Optional.
 * It is stored as the problem's shared context, which the student page already shows above the parts.
 */
function MainQuestion({ draft, edit, provisional, touch, issue }: { draft: EditorDraft; edit: SimpleProps["edit"]; provisional: boolean; touch: (field: string) => void; issue?: string }) {
  const id = useId();
  const picture = contextPictureOf(draft);
  const upload = useImageUpload(provisional, (mediaId) =>
    edit((d) => {
      removeContextPicture(d);
      addContextPicture(d, mediaId);
    }),
  );
  return (
    <section aria-labelledby={`${id}-label`} className="space-y-6" data-tour="studio-main">
      <div className="space-y-3">
        <p id={`${id}-label`} className={labelClass}>Main question (optional)</p>
        <p className="text-base text-muted-foreground">The setup every part shares. Leave it empty if you only have one question.</p>
        <RichMathText
          id={id}
          labelId={`${id}-label`}
          spans={blocksSpans(draft.content.context)}
          onChange={(spans) => edit((d) => setIntro(d, spans))}
          placeholder="Two carts roll towards each other on a track."
          minRows={3}
          onPasteFile={(file) => void upload.addFile(file)}
        />
      </div>
      <ImageField
        base={`${id}-image`}
        fieldKey="p:main"
        picture={picture}
        provisional={provisional}
        issue={issue}
        ariaLabel="Image for the main question"
        upload={upload}
        onAlt={(alt) => edit((d) => setContextPictureAlt(d, alt))}
        onRemove={() => edit((d) => removeContextPicture(d))}
        touch={() => touch("picture:main")}
      />
    </section>
  );
}

/** Uploads one image and hands its id on. A question box can also pass a pasted or dropped file to `addFile`. */
function useImageUpload(provisional: boolean, onAdd: (mediaId: string) => void) {
  const media = useAuthorMediaUpload("statement-image");
  const [note, setNote] = useState("");
  async function addFile(file: File) {
    if (provisional) {
      setNote("Write your question first, then add the image.");
      return;
    }
    setNote("");
    const info = await media.upload(file);
    if (info) onAdd(info.id);
  }
  return { media, note, addFile };
}

/** One image with its description. Used for the main question and for each part. */
function ImageField({
  base,
  fieldKey,
  picture,
  provisional,
  issue,
  ariaLabel,
  tour,
  upload,
  onAlt,
  onRemove,
  touch,
}: {
  base: string;
  fieldKey: string;
  picture: ReturnType<typeof pictureOf>;
  provisional: boolean;
  issue?: string;
  ariaLabel: string;
  tour?: string;
  upload: ReturnType<typeof useImageUpload>;
  onAlt: (alt: string) => void;
  onRemove: () => void;
  touch: () => void;
}) {
  const { media, note, addFile } = upload;
  const input = useRef<HTMLInputElement>(null);
  const [dropping, setDropping] = useState(false);
  return (
    <div className="space-y-3" data-tour={tour} data-simple-field={fieldKey}>
      <p className={labelClass}>Add an image (optional)</p>
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
          <Button type="button" variant="outline" className="min-h-11 border-2" disabled={media.locked || provisional} onClick={() => input.current?.click()}>
            <ImagePlus aria-hidden="true" className="mr-2 size-4" />
            Choose an image
          </Button>
          <span className="text-base text-muted-foreground">or drop one here</span>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border-2 p-4">
          <MediaImage mediaId={picture.mediaId} alt={picture.alt} />
          <div className="space-y-2">
            <label htmlFor={`${base}-alt`} className={labelClass}>Describe the image</label>
            <input
              id={`${base}-alt`}
              className={fieldClass}
              placeholder="A ball thrown upwards from the ground"
              maxLength={1000}
              value={picture.alt}
              aria-invalid={issue ? true : undefined}
              aria-describedby={issue ? `${base}-alt-error` : undefined}
              onBlur={touch}
              onChange={(e) => onAlt(e.target.value)}
            />
            {issue && <ErrorLine id={`${base}-alt-error`}>{issue}</ErrorLine>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="min-h-11 border-2" disabled={media.locked} onClick={() => input.current?.click()}>
              Choose a different image
            </Button>
            <Button type="button" variant="ghost" className="min-h-11" onClick={onRemove}>
              Remove image
            </Button>
          </div>
        </div>
      )}
      <input
        ref={input}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp"
        aria-label={ariaLabel}
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) void addFile(file);
        }}
      />
      {provisional && !picture && <p className="text-base text-muted-foreground">Write your question first, then add an image.</p>}
      <p role={media.error ? "alert" : "status"} className={`text-base ${media.error ? "text-destructive" : "text-muted-foreground"}`}>
        {media.busy ? "Uploading…" : media.error || note}
      </p>
    </div>
  );
}

/** Where's it from: I wrote it, or Adapted from with a source. The rights tick sits at the end, next to Publish. */
function SourceField({ draft, edit, touch, issue }: { draft: EditorDraft; edit: SimpleProps["edit"]; touch: (field: string) => void; issue?: string }) {
  const id = useId();
  const state = sourceState(draft);
  if (state.choice === "advanced")
    return (
      <div className="space-y-2" data-tour="studio-source">
        <p className={labelClass}>Where&apos;s it from?</p>
        <p className="text-base text-muted-foreground">
          {draft.content.provenance.kind === "authorized"
            ? `Adapted from ${draft.content.provenance.source || "another source"}. You can change that in Advanced.`
            : "Your rights declaration from Advanced is kept."}
        </p>
      </div>
    );
  const options = [
    { value: "wrote" as const, label: "I wrote it" },
    { value: "adapted" as const, label: "Adapted from" },
  ];
  return (
    <div className="space-y-3" data-tour="studio-source">
      <p id={`${id}-label`} className={labelClass}>Where&apos;s it from?</p>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-3">
        {options.map((option) => {
          const on = state.choice === option.value;
          return (
            <label
              key={option.value}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border-2 px-4 text-base font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${on ? "border-foreground bg-accent" : "border-input"}`}
            >
              <input type="radio" name={`${id}-from`} className="size-5" checked={on} onChange={() => edit((d) => setSourceChoice(d, option.value))} />
              {option.label}
            </label>
          );
        })}
      </div>
      {state.choice === "adapted" && (
        <div className="space-y-2">
          <label htmlFor={`${id}-source`} className="block text-base font-medium">Source</label>
          <input
            id={`${id}-source`}
            data-simple-field="source"
            className={fieldClass}
            placeholder="IPhO 2019, Problem 2"
            maxLength={2000}
            autoComplete="off"
            value={state.source}
            aria-invalid={issue ? true : undefined}
            aria-describedby={issue ? `${id}-source-error` : undefined}
            onBlur={() => touch("source")}
            onChange={(e) => edit((d) => setSourceText(d, e.target.value))}
          />
          {issue && <ErrorLine id={`${id}-source-error`}>{issue}</ErrorLine>}
        </div>
      )}
    </div>
  );
}

/** Estimated difficulty from the shared bands or an exact rating, saved in the existing difficulty field. */
function DifficultyField({ draft, edit }: { draft: EditorDraft; edit: SimpleProps["edit"] }) {
  const id = useId();
  const rating = difficultyRating(draft);
  const label = difficultyLabel(draft);
  const [text, setText] = useState(rating === null ? "" : String(rating));
  const [error, setError] = useState("");
  // A band pressed, or a rating changed from outside, updates the box.
  useEffect(() => {
    setText((current) => (rating !== null && parseRating(current) === rating ? current : rating === null ? (error ? current : "") : String(rating)));
    // The box keeps what the author is typing while it is not a rating yet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rating]);
  const band = rating === null ? null : ratingBands.find((b) => rating >= b.min && rating < b.max) ?? null;
  function typeRating(value: string) {
    setText(value);
    let saved = false;
    edit((d) => void (saved = setDifficulty(d, value)));
    setError(saved ? "" : "Type a whole number from 0 to 4000, or pick a band.");
  }
  return (
    <div className="space-y-3" data-tour="studio-difficulty">
      <p id={`${id}-label`} className={labelClass}>Estimated difficulty (optional)</p>
      <p className="text-base text-muted-foreground">Your best guess. It shows as an estimate and never changes anyone&apos;s rating.</p>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="grid gap-2 sm:grid-cols-2">
        {ratingBands.map((b) => {
          const on = band?.id === b.id;
          return (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                edit((d) => void setDifficulty(d, String(b.middle)));
                setText(String(b.middle));
                setError("");
              }}
              className={`min-h-11 rounded-lg border-2 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${on ? "border-foreground bg-accent" : "border-input hover:bg-muted"}`}
            >
              <span className="block text-base font-semibold">{b.name}</span>
              <span className="block text-sm tabular-nums text-muted-foreground">{b.range}</span>
              <span className="block text-sm">{b.example}</span>
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        <label htmlFor={`${id}-rating`} className="block text-base font-medium">Exact rating (optional)</label>
        <input
          id={`${id}-rating`}
          className={`${fieldClass} sm:max-w-56`}
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          placeholder="1850"
          value={text}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-rating-error` : undefined}
          onChange={(e) => typeRating(e.target.value)}
        />
        {error && <ErrorLine id={`${id}-rating-error`}>{error}</ErrorLine>}
        {label && !error && <p className="text-base text-muted-foreground">Your Advanced label &ldquo;{label}&rdquo; is kept until you pick a band or type a rating.</p>}
      </div>
      <RatingBandsPopover />
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
  draft, partId, first, letter, colour, typed, canRemove, provisional, questionIssue, solutionIssue, answerIssue, unitIssue, pictureIssue,
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
  solutionIssue?: string;
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
  const upload = useImageUpload(provisional, (mediaId) =>
    edit((d) => {
      removePicture(d, partId);
      addPicture(d, partId, mediaId);
    }),
  );

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
            onPasteFile={(file) => void upload.addFile(file)}
            buttonTour={first ? "studio-equation" : undefined}
          />
        </div>
        {questionIssue && <ErrorLine id={`${base}-q-error`}>{questionIssue}</ErrorLine>}
      </div>

      <ImageField
        base={`${base}-image`}
        fieldKey={`p:${partId}`}
        picture={picture}
        provisional={provisional}
        issue={pictureIssue}
        ariaLabel={`Image for part ${letter}`}
        tour={first ? "studio-image" : undefined}
        upload={upload}
        onAlt={(alt) => edit((d) => setPictureAlt(d, partId, alt))}
        onRemove={() => edit((d) => removePicture(d, partId))}
        touch={() => touch(`picture:${partId}`)}
      />

      <div className="space-y-3" data-tour={first ? "studio-solution" : undefined}>
        <p id={`${base}-s-label`} className={labelClass}>Worked solution (required)</p>
        <div data-simple-field={`s:${partId}`} onBlur={() => touch(`solution:${partId}`)}>
          <RichMathText
            id={`${base}-s`}
            labelId={`${base}-s-label`}
            spans={blocksSpans(entry.solution)}
            onChange={(spans) => edit((d) => setSolution(d, partId, spans))}
            placeholder="Start with energy. At the top the ball stops."
            invalid={!!solutionIssue}
            describedBy={solutionIssue ? `${base}-s-error` : undefined}
            symbols={symbols}
            minRows={3}
          />
        </div>
        {solutionIssue && <ErrorLine id={`${base}-s-error`}>{solutionIssue}</ErrorLine>}
      </div>

      <div className="space-y-3" data-tour={first ? "studio-answer" : undefined}>
        <label id={`${base}-a-label`} htmlFor={`${base}-a`} className={labelClass}>Final Answer (Solution)</label>
        <p className="text-base text-muted-foreground">We check students against this.</p>
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
    <div className="space-y-3 rounded-lg border-2 border-dashed border-muted-foreground/70 bg-muted/60 p-4" data-tour={tour ? "studio-try" : undefined} data-answer-preview="">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`${base}-label`} className={labelClass}>Answer preview</p>
        <span className="inline-flex min-h-7 items-center rounded-full border border-muted-foreground/70 bg-background px-3 text-sm font-medium">Only you see this</span>
      </div>
      <p className="text-base text-muted-foreground">Type an answer to see what a student would get. It is not saved.</p>
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
