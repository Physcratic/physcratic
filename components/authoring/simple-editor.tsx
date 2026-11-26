"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, CircleAlert, ImagePlus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MathAnswerField } from "@/components/physics/math-answer-field";
import { PartChip } from "@/components/physics/solve-ui";
import { displayName } from "@/lib/answer-reader";
import { physicsTopics, resolvePhysicsTag } from "@/lib/physics-taxonomy";
import { addTag, hasTag } from "@/lib/studio-tags";
import type { EditorDraft } from "@/lib/problem-authoring-editor";
import { Field, inputClass } from "./editor-fields";
import { PartOptions } from "./advanced-part-options";
import { CaptionField, ExtraBlocksGroup, moreBlocksText } from "./simple-blocks";
import { DifficultyRatingField } from "./difficulty-rating-field";
import { MediaImage, useAuthorMediaUpload } from "./media-controls";
import { RichMathText } from "./rich-math-text";
import { MediaAttachments } from "./media-controls";
import { PROBLEM_OPTIONS_ERROR_ID, ProblemMoreOptions, SIMPLE_TEXT_SCOPE } from "./simple-more-options";
import { AnswerPanel } from "./answer-panel";
import { BlocksEditor } from "./editor-fields";
import { useConfirm } from "./confirm-sheet";
import { setPartAnswerMode } from "@/lib/problem-authoring-editor";
import {
  ADAPTED_RIGHTS_TEXT,
  RIGHTS_TEXT,
  UNITS,
  setQuestionBlocks,
  setSolutionBlocks,
  withFirstCaption,
  extraBlocks,
  issueTarget,
  addPart,
  allParts,
  answerText,
  applyAnswer,
  blocksSpans,
  captionOf,
  boxOwnsAnswer,
  isHandGraded,
  contextPictureOf,
  ensureSimpleShape,
  mathSymbols,
  movePart,
  partLetter,
  partNeedsOptions,
  problemOptionsHaveContent,
  pictureOf,
  setSimpleAnswerMode,
  privateFor,
  readAnswer,
  removeContextPicture,
  removePart,
  replacePartImages,
  removePicture,
  replaceContextPicture,
  replacePicture,
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
  unitHint,
  verdictExplanation,
  verdictLabel,
  type Key,
} from "./simple-model";

export const TITLE_PLACEHOLDER = "Bending Beams";

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
  userId: string;
  edit: (fn: (d: EditorDraft) => void) => void;
  /** True while saving, uploading or recovering. */
  locked: boolean;
  /** True until the first draft is saved to the server. Pictures and Publish wait for it. */
  provisional: boolean;
  /** Messages from the publish rules that Simple has no field for. */
  otherIssues: string[];
  onPublish: () => void;
  publishing: boolean;
  /** Unpublishes the problem after asking. Given by the editor, which owns saving. */
  onUnpublish?: () => void;
};

export function SimpleEditor(props: SimpleProps) {
  const { draft, userId, edit, locked, provisional, otherIssues, onPublish, publishing, onUnpublish } = props;
  const confirm = useConfirm();
  const workflowKey = `physcratic.studio.files.v1:${userId}:${draft.problemId}`;
  /** What the author typed for each answer, which can be ahead of the saved key when it cannot be read yet. */
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  const [fileFirst, setFileFirst] = useState(() => {
    try { const value = sessionStorage.getItem(workflowKey); if (value === "files" || value === "text") return value === "files"; } catch { /* View choice is optional. */ }
    return draft.content.attachments.some(a => a.purpose === "statement-pdf") || [...draft.content.context, ...draft.content.sections.flatMap(s => [...s.blocks, ...s.parts.flatMap(p => p.blocks)])].some(b => b.kind === "image");
  });
  useEffect(() => { try { sessionStorage.setItem(workflowKey, fileFirst ? "files" : "text"); } catch { /* Saved content and recovery remain authoritative. */ } }, [workflowKey, fileFirst]);
  const [workflowError, setWorkflowError] = useState("");
  const parts = allParts(draft);
  // Parts the author chose to hand-grade, kept in this browser only. It is a view choice, like the PDF choice above.
  const gradedKey = `physcratic.studio.explain.v1:${userId}:${draft.problemId}`;
  const [handGraded, setHandGraded] = useState<ReadonlySet<string>>(() => {
    try { return new Set<string>(JSON.parse(localStorage.getItem(gradedKey) ?? "[]")); } catch { return new Set<string>(); }
  });
  function markHandGraded(partId: string, on: boolean) {
    const next = new Set(handGraded);
    if (on) next.add(partId); else next.delete(partId);
    setHandGraded(next);
    try { localStorage.setItem(gradedKey, JSON.stringify([...next])); } catch { /* The choice only lasts for this visit. */ }
  }
  const issues = simpleIssues(draft, typed, fileFirst, handGraded);
  const shown = (field: string) => issues.find((i) => i.field === field && (attempted || touched[field]));
  const touch = (field: string) => setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  const rights = rightsState(draft);
  const blocked = issues.length > 0 || otherIssues.length > 0;
  // More options for the whole problem opens when the problem loads with saved content in it, and when Publish reports an error inside it.
  // Nothing else opens it, so once the author closes it, typing elsewhere never brings it back. Only the next Publish does.
  const optionsIssue = shown("options:problem")?.message;
  const [moreOpen, setMoreOpen] = useState(() => problemOptionsHaveContent(draft) || fileFirst);

  // A draft can have no part yet. Simple starts it with part a.
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
      // An error that belongs in More options opens it again, even after the author closed it.
      if (issues.some((issue) => issue.field === "options:problem")) setMoreOpen(true);
      // Every missing item shows its message at once. Focus goes to the one highest on the page.
      const targets = issues.map((issue) => issueTarget(issue.field));
      requestAnimationFrame(() => {
        const hosts = targets
          .map((target) => document.querySelector<HTMLElement>(`[data-simple-field="${CSS.escape(target)}"]`))
          .filter((host): host is HTMLElement => Boolean(host))
          .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
        const host = hosts[0];
        // For the whole problem's More options the error line takes focus, so it is read out, not the first field inside.
        const alert = host?.dataset.simpleField === "o:problem" ? document.getElementById(PROBLEM_OPTIONS_ERROR_ID) : null;
        const control = alert ?? (host?.matches("input,textarea") ? host : (host?.querySelector<HTMLElement>("input,textarea,[contenteditable=true],math-field") ?? host?.querySelector<HTMLElement>("button,select")));
        (control ?? host)?.focus();
        (control ?? host)?.scrollIntoView({ block: "center" });
      });
      return;
    }
    onPublish();
  }

  const titleField = <>
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
          aria-describedby={shown("title") ? "simple-title-error" : undefined}
          onBlur={() => touch("title")}
          onChange={(e) => edit((d) => void (d.content.title = e.target.value))}
        />
        {shown("title") && <ErrorLine id="simple-title-error">{shown("title")!.message}</ErrorLine>}
      </div>

  </>;
  const metadata = <>
      <SourceField draft={draft} edit={edit} touch={touch} issue={shown("source")?.message} />

      <DifficultyRatingField stored={draft.content.estimatedDifficulty} save={(text) => { let saved = false; edit((d) => void (saved = setDifficulty(d, text))); return saved; }} tour attempted={attempted} />

      <TopicRow values={draft.content.topicTags} change={(v) => edit((d) => void (d.content.topicTags = v))} issue={shown("topics")?.message} />

  </>;
  const pdfChoice = <div className="space-y-2">
      <label className="flex min-h-11 items-center gap-3 text-base">
        <input type="checkbox" className="size-5" checked={fileFirst} onChange={e => {
          if (Object.values(typed).some(value => readAnswer(value).kind === "error")) { setWorkflowError("Correct the current final answer before changing workflows. Your input is retained."); return; }
          setTyped({}); setWorkflowError(""); setFileFirst(e.target.checked);
        }} />
        Upload PDFs instead
      </label>
      {workflowError && <p role="alert" className="text-sm text-destructive">{workflowError}</p>}
  </div>;
  return (
    <fieldset disabled={locked} className="mx-auto min-w-0 max-w-2xl space-y-12 disabled:opacity-70">
      <legend className="sr-only">Problem</legend>

      <div className="space-y-4">
      {titleField}
      {fileFirst && <>
        <p className="text-sm text-muted-foreground">Upload a statement PDF or add images to the parts. Files must be at most 3 MiB. The solution PDF is private until you approve access after publication.</p>
        <fieldset disabled={provisional} className="min-w-0" data-simple-field="statement"><legend className="sr-only">PDF attachments</legend><MediaAttachments draft={draft} edit={edit} /></fieldset>
      </>}
      </div>
      {fileFirst && metadata}

      <details open={!fileFirst || undefined} className={fileFirst ? "rounded-lg border p-4" : undefined}><summary hidden={!fileFirst} className="min-h-11 cursor-pointer text-sm font-medium">Optional typed statement and setup image</summary><div className={fileFirst ? "pt-4" : undefined}><MainQuestion draft={draft} edit={edit} provisional={provisional} touch={touch} issue={shown("picture:main")?.message} /></div></details>

      {parts.map(({ part, position }) => (
        <PartEditor
          key={part.id}
          draft={draft}
          partId={part.id}
          first={position === 0}
          fileFirst={fileFirst}
          multipart={parts.length > 1}
          letter={part.label || String(position + 1)}
          typed={part.id in typed ? typed[part.id] : answerText(privateFor(draft, part.id).key)}
          canRemove={parts.length > 1}
          provisional={provisional}
          questionIssue={shown(`question:${part.id}`)?.message}
          solutionIssue={shown(`solution:${part.id}`)?.message}
          answerIssue={shown(`answer:${part.id}`)?.message}
          unitIssue={shown(`units:${part.id}`)?.message}
          pictureIssue={shown(`picture:${part.id}`)?.message}
          optionsIssue={shown(`options:${part.id}`)?.message}
          touch={touch}
          edit={edit}
          onAnswer={(text) => answerChanged(part.id, text)}
          handGraded={isHandGraded(draft, part.id, handGraded)}
          onHandGraded={(on) => markHandGraded(part.id, on)}
          onForgetTyped={() => setTyped((t) => Object.fromEntries(Object.entries(t).filter(([id]) => id !== part.id)))}
          onRemove={async () => {
            if (!(await confirm({ title: "Remove this part and its answer?", confirmLabel: "Remove part", danger: true }))) return;
            edit((d) => removePart(d, part.id));
          }}
        />
      ))}
      <Button type="button" variant="outline" className="min-h-12 border-2 text-base" disabled={parts.length >= 50} onClick={() => edit((d) => addPart(d))}>
        <Plus aria-hidden="true" className="mr-2 size-5" />
        Add part {partLetter(parts.length)}
      </Button>

      {!fileFirst && metadata}

      <ProblemMoreOptions draft={draft} edit={edit} open={moreOpen} onOpenChange={setMoreOpen} issue={optionsIssue} pdf={pdfChoice} onUnpublish={draft.state === "published" ? onUnpublish : undefined} />

      <div className="space-y-5 border-t-2 pt-8">
        {rights === "advanced" ? null : (
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
        {attempted && fileFirst && issues.length > 0 && <ul role="alert" className="space-y-1 text-sm text-destructive">{issues.map(issue => <li key={issue.field}>{issue.message}</li>)}</ul>}
        {attempted && otherIssues.length > 0 && (
          <ul role="alert" className="space-y-1 text-base text-destructive">
            {otherIssues.slice(0, 4).map((m, i) => (
              <li key={i}>{m} {fileFirst ? "Review the fields above." : "Check More options."}</li>
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
    edit((d) => replaceContextPicture(d, mediaId)),
  );
  return (
    <section aria-labelledby={`${id}-label`} className="space-y-6" data-tour="studio-main">
      <div className="space-y-3">
        <p id={`${id}-label`} className={labelClass}>Main question (optional)</p>
        <RichMathText
          id={id}
          labelId={`${id}-label`}
          spans={blocksSpans(draft.content.context)}
          onChange={(spans) => edit((d) => setIntro(d, spans))}
          placeholder=""
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
        caption={captionOf(draft.content.context)}
        captionName="Caption for the main question"
        onCaption={(caption) => edit((d) => void (d.content.context = withFirstCaption(d.content.context, caption)))}
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
  caption,
  onCaption,
  captionName,
  onRemove,
  touch,
}: {
  captionName?: string;
  base: string;
  fieldKey: string;
  caption?: string;
  onCaption?: (caption: string) => void;
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
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border-2 p-4">
          <MediaImage mediaId={picture.mediaId} alt={picture.alt} />
          <div className="space-y-2">
            <label htmlFor={`${base}-alt`} className={labelClass}>Describe the image</label>
            <input
              id={`${base}-alt`}
              className={fieldClass}
              maxLength={1000}
              value={picture.alt}
              aria-invalid={issue ? true : undefined}
              aria-describedby={issue ? `${base}-alt-error` : undefined}
              onBlur={touch}
              onChange={(e) => onAlt(e.target.value)}
            />
            {issue && <ErrorLine id={`${base}-alt-error`}>{issue}</ErrorLine>}
          </div>
          {onCaption && <CaptionField id={`${base}-caption`} name={captionName} caption={caption ?? ""} onChange={onCaption} />}
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
        {draft.content.provenance.kind === "authorized" && <p className="text-base">Adapted from {draft.content.provenance.source || "another source"}</p>}
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

function TopicRow({ values, change, issue }: { values: string[]; change: (values: string[]) => void; issue?: string }) {
  const id = useId();
  return (
    <div className="space-y-3" data-simple-field="topics">
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
      {issue && <ErrorLine id={`${id}-error`}>{issue}</ErrorLine>}
    </div>
  );
}

function PartEditor({
  draft, partId, first, fileFirst, multipart, letter, typed, canRemove, provisional, questionIssue, solutionIssue, answerIssue, unitIssue, pictureIssue, optionsIssue,
  touch, edit, onAnswer, handGraded, onHandGraded, onForgetTyped, onRemove,
}: {
  draft: EditorDraft;
  partId: string;
  first: boolean;
  fileFirst: boolean;
  multipart: boolean;
  letter: string;
  typed: string;
  canRemove: boolean;
  provisional: boolean;
  questionIssue?: string;
  solutionIssue?: string;
  answerIssue?: string;
  unitIssue?: string;
  pictureIssue?: string;
  /** Something in More options stops Publish, such as an image in the hints without a description. */
  optionsIssue?: string;
  touch: (field: string) => void;
  edit: SimpleProps["edit"];
  onAnswer: (text: string) => void;
  /** The author chose hand-grading for this part, so the answer box is replaced by a note. */
  handGraded: boolean;
  onHandGraded: (on: boolean) => void;
  /** Drops the text typed in the answer box, so the box shows the saved answer again. */
  onForgetTyped: () => void;
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
  // The answer box owns the answer text and the units. More options owns the rest. A part the box cannot show has no box.
  // Only the author's hand-graded choice hides the box. A manual key nobody chose, such as a new part or a cleared box, keeps it.
  // Who owns the answer is decided when the answer type changes, never by the text, so a field never unmounts while it is typed in.
  const ownsSaved = boxOwnsAnswer(entry);
  const [ownership, setOwnership] = useState({ kind: key?.kind, owns: ownsSaved });
  if (ownership.kind !== key?.kind) setOwnership({ kind: key?.kind, owns: ownsSaved });
  const owns = (ownership.kind === key?.kind ? ownership.owns : ownsSaved) && !handGraded;
  const needsOptions = partNeedsOptions(draft, partId) || handGraded || (!owns && !!answerIssue) || !!optionsIssue;
  const [optionsOpen, setOptionsOpen] = useState(needsOptions);
  useEffect(() => { if (needsOptions) setOptionsOpen(true); }, [needsOptions]);
  const section = draft.content.sections.find((s) => s.parts.some((p) => p.id === partId))!;
  const position = section.parts.findIndex((p) => p.id === partId);
  const optionsRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const confirm = useConfirm();
  const [focusBox, setFocusBox] = useState(false);
  function chooseExplain() {
    if (key?.kind !== "manual") edit((d) => setSimpleAnswerMode(d, partId, "manual"));
    onForgetTyped();
    onHandGraded(true);
    requestAnimationFrame(() => noteRef.current?.querySelector<HTMLElement>("button")?.focus());
  }
  const upload = useImageUpload(provisional, (mediaId) =>
    edit((d) => replacePicture(d, partId, mediaId)),
  );

  // The blocks Simple's own fields do not show. They are named in the More options summary, so an author who saved some earlier can find them.
  const moreBlocks = extraBlocks(part.blocks, true).length + extraBlocks(entry.solution, false).length;
  const optionsName = `${multipart ? `More options for part ${letter}` : "More options"}${moreBlocksText(moreBlocks)}`;
  const statementExtras = (
    <ExtraBlocksGroup
      summary={multipart ? `More question blocks for part ${letter}` : "More question blocks"}
      label={multipart ? `Part ${letter} question` : "Question"}
      scope="statement"
      picture
      hidePictures={fileFirst}
      uploadsDisabled={provisional}
      blocks={part.blocks}
      update={(change) => edit((d) => setQuestionBlocks(d, partId, change(allParts(d).find((r) => r.part.id === partId)?.part.blocks ?? [])))}
    />
  );
  return (
    <section
      aria-label={multipart ? `Part ${letter}` : "Question and answer"}
      className={`space-y-10 rounded-xl border-2 bg-card p-5 sm:p-8`}
    >
      {!multipart && <h2 className="sr-only">Question and answer</h2>}
      {multipart && <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold"><PartChip>Part {letter}</PartChip></h2>
        {canRemove && (
          <Button type="button" variant="ghost" className="min-h-11" onClick={onRemove}>
            <Trash2 aria-hidden="true" className="mr-2 size-4" />
            Remove part {letter}
          </Button>
        )}
      </div>}

      <div className="space-y-3" data-tour={first ? "studio-question" : undefined}>
        <p id={`${base}-q-label`} className={labelClass}>{fileFirst ? "Question instructions (optional)" : <>What&apos;s the question?</>}</p>
        <div data-simple-field={`q:${partId}`} onBlur={() => touch(`question:${partId}`)}>
          <RichMathText
            id={`${base}-q`}
            labelId={`${base}-q-label`}
            spans={questionSpans}
            onChange={(spans) => edit((d) => setQuestion(d, partId, spans))}
            placeholder=""
            invalid={!!questionIssue}
            describedBy={questionIssue ? `${base}-q-error` : undefined}
            symbols={symbols}
            onPasteFile={(file) => void upload.addFile(file)}
            buttonTour={first ? "studio-equation" : undefined}
          />
        </div>
        {questionIssue && <ErrorLine id={`${base}-q-error`}>{questionIssue}</ErrorLine>}
      </div>

      {fileFirst ? <fieldset disabled={provisional} className="min-w-0">
        <legend className="sr-only">Statement images</legend>
        <BlocksEditor imagesOnly label={multipart ? `Part ${letter} statement` : "Question statement"} blocks={part.blocks.filter(b => b.kind === "image")} onChange={images => edit(d => replacePartImages(d, partId, images))} />
        <div className={`mt-4 ${SIMPLE_TEXT_SCOPE}`}>{statementExtras}</div>
      </fieldset> : <ImageField
        base={`${base}-image`}
        fieldKey={`p:${partId}`}
        picture={picture}
        provisional={provisional}
        issue={pictureIssue}
        ariaLabel={`Image for part ${letter}`}
        tour={first ? "studio-image" : undefined}
        upload={upload}
        onAlt={(alt) => edit((d) => setPictureAlt(d, partId, alt))}
        caption={captionOf(part.blocks)}
        captionName={multipart ? `Caption for part ${letter}` : "Caption"}
        onCaption={(caption) => edit((d) => void setQuestionBlocks(d, partId, withFirstCaption(allParts(d).find((r) => r.part.id === partId)?.part.blocks ?? [], caption)))}
        onRemove={() => edit((d) => removePicture(d, partId))}
        touch={() => touch(`picture:${partId}`)}
      />}

      {fileFirst ? <div className="space-y-3" data-simple-field={`a:${partId}`}>
        <h3 className={labelClass}>Answer key</h3>
        <AnswerPanel compact entry={entry} mode={part.answerMode} onChange={value => edit(d => { d.privateParts = [...d.privateParts.filter(p => p.partId !== partId), value]; })} onMode={async mode => {
          if (mode === part.answerMode && entry.key) return;
          if (entry.key && !(await confirm({ title: "Change answer type?", message: "This replaces the current answer configuration. Hints and solution remain.", confirmLabel: "Change answer type", danger: true }))) return;
          edit(d => setPartAnswerMode(d, partId, mode));
        }} />
        {!entry.key && <Button type="button" variant="outline" onClick={() => edit(d => setPartAnswerMode(d, partId, part.answerMode))}>Set answer configuration</Button>}
        {answerIssue && <ErrorLine id={`${base}-key-error`}>{answerIssue}</ErrorLine>}
      </div> : <>
      <div className="space-y-3" data-tour={first ? "studio-solution" : undefined}>
        <p id={`${base}-s-label`} className={labelClass}>{draft.state === "draft" ? "Worked solution (required)" : "Worked solution"}</p>
        <div data-simple-field={`s:${partId}`} onBlur={() => touch(`solution:${partId}`)}>
          <RichMathText
            id={`${base}-s`}
            labelId={`${base}-s-label`}
            spans={blocksSpans(entry.solution)}
            onChange={(spans) => edit((d) => setSolution(d, partId, spans))}
            placeholder=""
            invalid={!!solutionIssue}
            describedBy={solutionIssue ? `${base}-s-error` : undefined}
            symbols={symbols}
            minRows={3}
          />
        </div>
        {solutionIssue && <ErrorLine id={`${base}-s-error`}>{solutionIssue}</ErrorLine>}
      </div>

      <div className="space-y-3" data-tour={first ? "studio-answer" : undefined}>
        {!owns ? <div ref={noteRef} className="space-y-3" data-simple-field={`a:${partId}`}>
          <p className={labelClass}>Final Answer (Solution)</p>
          <p className="text-base">{key?.kind === "manual" ? "Students explain this part and nothing is checked automatically." : "This part uses answer settings in More options."}</p>
          <div className="flex flex-wrap gap-2">
            {key?.kind === "manual" && <Button type="button" variant="outline" className="min-h-11 border-2" onClick={() => { setFocusBox(true); onHandGraded(false); }}>Type a final answer instead</Button>}
            <Button type="button" variant="outline" className="min-h-11 border-2" onClick={() => { setOptionsOpen(true); requestAnimationFrame(() => optionsRef.current?.querySelector<HTMLElement>("select")?.focus()); }}>Show answer settings</Button>
          </div>
          {answerIssue && <ErrorLine id={`${base}-a-error`}>{answerIssue}</ErrorLine>}
        </div> : <>
        <label id={`${base}-a-label`} htmlFor={`${base}-a`} className={labelClass}>Final Answer (Solution)</label>
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
            placeholder=""
            maxLength={180}
            autoFocus={focusBox}
          />
        </div>
        {answerIssue && <ErrorLine id={`${base}-a-error`}>{answerIssue}</ErrorLine>}
        {read.kind === "empty" && <div className="space-y-2">
          <p className="text-base text-muted-foreground">Publish needs a final answer here. If students should explain instead, with nothing checked automatically, choose the button below.</p>
          <Button type="button" variant="outline" className="min-h-11 border-2" onClick={chooseExplain}>Students explain, no automatic check</Button>
        </div>}
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
            {!unitIssue && unitHint(key) && <p className="text-base text-muted-foreground">{unitHint(key)}</p>}
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
        </>}
      </div>

      </>}
      <TryAnswer draft={draft} partId={partId} label={letter} tour={first} />
      {!fileFirst && <div ref={optionsRef} data-simple-field={`o:${partId}`}><PartOptions
        part={part}
        si={draft.content.sections.indexOf(section)}
        pi={position}
        entry={entry}
        hasPrivate={draft.privateParts.some((p) => p.partId === partId)}
        edit={(fn) => edit((d) => { fn(d); if (privateFor(d, partId).key?.kind !== key?.kind) queueMicrotask(onForgetTyped); })}
        open={optionsOpen}
        onOpenChange={setOptionsOpen}
        heading={<summary aria-label={optionsName} className="flex min-h-11 w-full cursor-pointer list-none items-center justify-between gap-2 text-base font-medium">
          {optionsName}
          <ChevronDown aria-hidden="true" className={`size-5 shrink-0 transition-transform ${optionsOpen ? "rotate-180" : ""}`} />
        </summary>}
        lead={<div className="mb-6 space-y-4">
          <Field label="Part label shown to students">
            {(id) => <input id={id} className={fieldClass} maxLength={80} value={part.label} onChange={(e) => edit((d) => { const ref = allParts(d).find((r) => r.part.id === partId); if (ref) ref.part.label = e.target.value; })} />}
          </Field>
          {multipart && <div className="flex flex-wrap gap-2" role="group" aria-label={`Order of part ${letter}`}>
            <Button type="button" variant="outline" className="min-h-11" disabled={position === 0} onClick={() => edit((d) => movePart(d, partId, -1))}><ArrowUp aria-hidden="true" className="mr-2 size-4" />Move part {letter} up</Button>
            <Button type="button" variant="outline" className="min-h-11" disabled={position === section.parts.length - 1} onClick={() => edit((d) => movePart(d, partId, 1))}><ArrowDown aria-hidden="true" className="mr-2 size-4" />Move part {letter} down</Button>
          </div>}
          {statementExtras}
          <ExtraBlocksGroup
            summary={multipart ? `More worked solution blocks for part ${letter}` : "More worked solution blocks"}
            label={multipart ? `Part ${letter} more solution` : "More solution"}
            scope="solution"
            picture={false}
            uploadsDisabled={provisional}
            blocks={entry.solution}
            update={(change) => edit((d) => setSolutionBlocks(d, partId, change(privateFor(d, partId).solution)))}
          />
        </div>}
        answer={{
          boxOwns: owns,
          solutionElsewhere: true,
          manualLabel: "Students explain, no automatic check",
          placeholder: (!key || key.kind === "manual") && !handGraded ? "Set by the final answer above" : undefined,
          hideManualButton: true,
          onChosen: (mode) => onHandGraded(mode === "manual"),
          setMode: setSimpleAnswerMode,
          // Simple text is 16px.
          bodyClass: SIMPLE_TEXT_SCOPE,
        }}
      />{optionsIssue && <ErrorLine id={`${base}-o-error`}>{optionsIssue}</ErrorLine>}</div>}
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
        <MathAnswerField id={`${base}-t`} labelId={`${base}-label`} value={text} onChange={setText} symbols={symbols} maxLength={180} placeholder="" />
      ) : null}
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
