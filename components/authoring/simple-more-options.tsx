"use client";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { moveItem, type EditorDraft } from "@/lib/problem-authoring-editor";
import { BlocksEditor, Field, inputClass, OrderControls } from "./editor-fields";
import { ProvenanceFields } from "./advanced-provenance";
import { UnpublishZone } from "./advanced-unpublish";
import { SolutionPermissions } from "./solution-permissions";
import { MissingTagNote, TagPicker } from "./tag-picker";
import { addSection, allParts, removeSection, sharedSetupBlocks, withSharedSetupBlocks } from "./simple-model";

/** Simple text is 16px. This lifts the small sizes of the shared Advanced pieces inside More options and nowhere else. */
export const SIMPLE_TEXT_SCOPE = "[&_.text-sm]:text-base [&_.text-xs]:text-base";

/** The id of the error line for the whole problem. Publish moves focus to it. */
export const PROBLEM_OPTIONS_ERROR_ID = "simple-options-problem-error";

type Edit = (fn: (d: EditorDraft) => void) => void;
const heading = "text-lg font-semibold leading-snug";

/** A section Simple has something to show for: a title or shared text, or a second section. */
const sectionsWanted = (draft: EditorDraft) => draft.content.sections.length >= 2 || draft.content.sections.some((s) => s.title.trim() || s.blocks.length > 0);

/** The sections of a problem, each with its title and shared text. Parts stay in the part list above. */
function SectionsOptions({ draft, edit }: { draft: EditorDraft; edit: Edit }) {
  const sections = draft.content.sections;
  // Once the section fields have appeared they stay, so clearing a title never takes the field away while it is typed in.
  const wanted = sectionsWanted(draft);
  const [kept, setKept] = useState(false);
  useEffect(() => { if (wanted) setKept(true); }, [wanted]);
  const editable = wanted || kept;
  const atSections = sections.length >= 30;
  const atParts = allParts(draft).length >= 50;
  const why = atSections ? "A problem can have up to 30 sections." : atParts ? "A problem can have up to 50 parts, and a new section starts with one, so remove a part first." : "";
  return (
    <section aria-labelledby="simple-sections-h" className="space-y-4">
      <h3 id="simple-sections-h" className={heading}>Sections</h3>
      <p className="text-sm text-muted-foreground">Group parts under a title and some shared text. One section is enough for most problems.</p>
      {sections.length >= 2 && (
        <nav aria-label="Sections outline">
          <ol className="flex flex-wrap gap-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#simple-section-${s.id}`} className="inline-flex min-h-11 items-center rounded-md border-2 border-input px-3 text-base hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {s.title.trim() || `Section ${i + 1}`}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      {editable && sections.map((section, si) => (
        <div key={section.id} id={`simple-section-${section.id}`} tabIndex={-1} className="scroll-mt-24 space-y-4 rounded-lg border-2 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold">Section {si + 1}</h4>
            {sections.length >= 2 && (
              <OrderControls
                label={`section ${si + 1}`}
                index={si}
                count={sections.length}
                move={(delta) => edit((d) => void (d.content.sections = moveItem(d.content.sections, si, delta)))}
                remove={() => {
                  if (!window.confirm("Delete this section, its parts, and their private answer content?")) return false;
                  edit((d) => removeSection(d, section.id));
                }}
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground">Parts: {section.parts.map((p) => p.label || "?").join(", ")}</p>
          <Field label={`Section ${si + 1} title`}>
            {(id) => <input id={id} className={inputClass} maxLength={200} value={section.title} onChange={(e) => edit((d) => void (d.content.sections[si].title = e.target.value))} />}
          </Field>
          <BlocksEditor label={`Section ${si + 1} context`} blocks={section.blocks} onChange={(blocks) => edit((d) => void (d.content.sections[si].blocks = blocks))} />
        </div>
      ))}
      <Button type="button" variant="outline" className="min-h-11 border-2 text-base" disabled={atSections || atParts} aria-describedby={why ? "simple-add-section-why" : undefined} onClick={() => edit((d) => addSection(d))}>
        <Plus aria-hidden="true" className="mr-2 size-4" />
        Add a section
      </Button>
      {why && <p id="simple-add-section-why" className="text-base text-muted-foreground">{why}</p>}
    </section>
  );
}

/**
 * Everything Advanced offers for the whole problem that Simple does not show up front. Closed until it holds saved content or an error.
 * `pdf` is the "Upload PDFs instead" choice. `onUnpublish` is given only where the problem can be unpublished.
 */
export function ProblemMoreOptions({
  draft, edit, open, onOpenChange, issue, pdf, onUnpublish,
}: {
  draft: EditorDraft;
  edit: Edit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue?: string;
  pdf: ReactNode;
  onUnpublish?: () => void;
}) {
  const published = draft.state === "published";
  return (
    <details open={open} onToggle={(e) => onOpenChange(e.currentTarget.open)} data-simple-field="o:problem" className="rounded-lg border-2 p-4">
      <summary aria-label="More options for the whole problem" className="flex min-h-11 w-full cursor-pointer list-none items-center justify-between gap-2 text-base font-medium">
        More options
        <ChevronDown aria-hidden="true" className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </summary>
      <div className={`mt-5 space-y-10 text-base ${SIMPLE_TEXT_SCOPE}`}>
        {issue && <p id={PROBLEM_OPTIONS_ERROR_ID} role="alert" tabIndex={-1} className="rounded-md text-base text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{issue}</p>}
        {pdf}
        <section aria-labelledby="simple-setup-h" className="space-y-4">
          <h3 id="simple-setup-h" className={heading}>Shared setup</h3>
          <p className="text-sm text-muted-foreground">The text and picture of the main question are above, so they are not repeated here.</p>
          <BlocksEditor label="Shared setup blocks" blocks={sharedSetupBlocks(draft.content.context)} onChange={(blocks) => edit((d) => void (d.content.context = withSharedSetupBlocks(d.content.context, blocks)))} />
        </section>
        <SectionsOptions draft={draft} edit={edit} />
        <section aria-labelledby="simple-methods-h" className="space-y-4">
          <h3 id="simple-methods-h" className={heading}>Method tags</h3>
          <TagPicker kind="method" label="Methods" values={draft.content.methodTags} pickedTopics={draft.content.topicTags} change={(v) => edit((d) => void (d.content.methodTags = v))} />
          <MissingTagNote />
        </section>
        <section aria-labelledby="simple-source-h" className="space-y-4">
          <h3 id="simple-source-h" className={heading}>Source and rights in your own words</h3>
          <ProvenanceFields provenance={draft.content.provenance} edit={edit} />
        </section>
        {published && !draft.publishedSolutionPolicy && <SolutionPermissions key={draft.problemId} problemId={draft.problemId} />}
        {published && onUnpublish && <UnpublishZone disabled={false} onUnpublish={onUnpublish} />}
      </div>
    </details>
  );
}
