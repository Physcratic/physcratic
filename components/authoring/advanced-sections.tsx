"use client";
import { Button } from "@/components/ui/button";
import { moveItem, type EditorDraft } from "@/lib/problem-authoring-editor";
import { PartChip, partBorder, partStyle } from "@/components/physics/solve-ui";
import { BlocksEditor, Field, inputClass, OrderControls } from "./editor-fields";
import { PartOptions } from "./advanced-part-options";

/** Every section with its parts, and the add section button. `colours` maps a part id to its colour index. */
export function SectionsEditor({
  draft, edit, colours, notify,
}: {
  draft: EditorDraft;
  edit: (fn: (value: EditorDraft) => void) => void;
  colours: ReadonlyMap<string, number>;
  notify: (message: string) => void;
}) {
  function addSection() {
    edit((d) => {
      d.content.sections.push({
        id: crypto.randomUUID(),
        title: "",
        blocks: [],
        parts: [],
      });
    });
    notify("Section added. Use Tab or the outline to reach it.");
  }
  return (
    <>
          {draft.content.sections.map((section, si) => (
            <section
              key={section.id}
              data-order-item
              id={`section-${section.id}`}
              tabIndex={-1}
              className="scroll-mt-24 space-y-6 rounded-lg border bg-background p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">
                  Section {si + 1}
                </h3>
                <OrderControls
                  label={`section ${si + 1}`}
                  index={si}
                  count={draft.content.sections.length}
                  move={(delta) => {
                    edit((d) => {
                      d.content.sections = moveItem(
                        d.content.sections,
                        si,
                        delta,
                      );
                    });
                    notify(
                      `Section ${si + 1} moved to position ${si + delta + 1}.`,
                    );
                  }}
                  remove={() => {
                    if (
                      !window.confirm(
                        "Delete this section, its parts, and their private answer content?",
                      )
                    )
                      return false;
                    edit((d) => {
                      const ids = new Set(
                        d.content.sections[si].parts.map((p) => p.id),
                      );
                      d.content.sections.splice(si, 1);
                      d.privateParts = d.privateParts.filter(
                        (p) => !ids.has(p.partId),
                      );
                    });
                    notify("Section deleted.");
                  }}
                />
              </div>
              <Field label={`Section ${si + 1} title`}>
                {(id) => (
                  <input
                    id={id}
                    className={inputClass}
                    value={section.title}
                    maxLength={200}
                    onChange={(e) =>
                      edit((d) => {
                        d.content.sections[si].title = e.target.value;
                      })
                    }
                  />
                )}
              </Field>
              <BlocksEditor
                label={`Section ${si + 1} context`}
                blocks={section.blocks}
                onChange={(blocks) =>
                  edit((d) => {
                    d.content.sections[si].blocks = blocks;
                  })
                }
              />
              {section.parts.map((part, pi) => {
                const entry = draft.privateParts.find(
                  (p) => p.partId === part.id,
                ) ?? {
                  partId: part.id,
                  key: null,
                  hints: [],
                  solution: [],
                };
                return (
                  <section
                    key={part.id}
                    data-order-item
                    tabIndex={-1}
                    style={partStyle(colours.get(part.id) ?? 0)}
                    className={`space-y-5 rounded-lg border bg-muted/30 p-4 ${partBorder}`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">
                        <PartChip index={colours.get(part.id) ?? 0}>Part {part.label || pi + 1}</PartChip>
                      </h4>
                      <OrderControls
                        label={`section ${si + 1} part ${pi + 1}`}
                        index={pi}
                        count={section.parts.length}
                        move={(delta) => {
                          edit((d) => {
                            d.content.sections[si].parts = moveItem(
                              d.content.sections[si].parts,
                              pi,
                              delta,
                            );
                          });
                          notify(
                            `Part ${pi + 1} moved to position ${pi + delta + 1}.`,
                          );
                        }}
                        remove={() => {
                          if (
                            !window.confirm(
                              "Delete this part and its private answer content?",
                            )
                          )
                            return false;
                          edit((d) => {
                            d.content.sections[si].parts.splice(pi, 1);
                            d.privateParts = d.privateParts.filter(
                              (p) => p.partId !== part.id,
                            );
                          });
                          notify("Part deleted.");
                        }}
                      />
                    </div>
                    <Field
                      label={`Section ${si + 1} part ${pi + 1} label`}
                    >
                      {(id) => (
                        <input
                          id={id}
                          className={inputClass}
                          maxLength={80}
                          value={part.label}
                          onChange={(e) =>
                            edit((d) => {
                              d.content.sections[si].parts[pi].label =
                                e.target.value;
                            })
                          }
                        />
                      )}
                    </Field>
                    <BlocksEditor
                      label={`Part ${part.label || pi + 1} statement`}
                      blocks={part.blocks}
                      onChange={(blocks) =>
                        edit((d) => {
                          d.content.sections[si].parts[pi].blocks =
                            blocks;
                        })
                      }
                    />
                    <PartOptions
                      part={part}
                      si={si}
                      pi={pi}
                      entry={entry}
                      hasPrivate={draft.privateParts.some((p) => p.partId === part.id)}
                      colour={colours.get(part.id) ?? 0}
                      edit={edit}
                    />
                  </section>
                );
              })}
              <Button
                type="button"
                variant="outline"
                disabled={section.parts.length >= 50}
                onClick={() =>
                  edit((d) => {
                    const id = crypto.randomUUID();
                    d.content.sections[si].parts.push({
                      id,
                      label: String(
                        d.content.sections[si].parts.length + 1,
                      ),
                      blocks: [],
                      answerMode: "manual",
                    });
                    d.privateParts.push({
                      partId: id,
                      key: { kind: "manual" },
                      hints: [],
                      solution: [],
                    });
                  })
                }
              >
                + Add part to section {si + 1}
              </Button>
            </section>
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed py-6"
            disabled={draft.content.sections.length >= 30}
            onClick={addSection}
          >
            + Add section
          </Button>
    </>
  );
}

/** The side outline, shown on wide screens only. */
export function SectionsOutline({ sections }: { sections: EditorDraft["content"]["sections"] }) {
  return (
    <aside className="hidden lg:block">
      <nav
        aria-label="Document outline"
        className="sticky top-24 space-y-3 rounded-lg border bg-card p-5"
      >
        <h2 className="text-sm font-semibold text-muted-foreground">
          Steps
        </h2>
        <ol className="space-y-1 text-sm">
          <li>
            <a href="#step-statement" className="flex min-h-11 items-center rounded-sm hover:underline">
              1. Statement
            </a>
          </li>
          <li>
            <a href="#step-parts" className="flex min-h-11 items-center rounded-sm hover:underline">
              2. Parts and answers
            </a>
            <ul className="ml-4 space-y-1 border-l pl-3">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#section-${section.id}`}
                    className="flex min-h-11 items-center truncate rounded-sm text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {section.title || `Section ${i + 1}`}
                  </a>
                </li>
              ))}
            </ul>
          </li>
          <li>
            <a href="#step-tags" className="flex min-h-11 items-center rounded-sm hover:underline">
              3. Tags
            </a>
          </li>
          <li>
            <a href="#author-assets" className="flex min-h-11 items-center rounded-sm hover:underline">
              4. Images and PDFs
            </a>
          </li>
          <li>
            <a href="#publication" className="flex min-h-11 items-center rounded-sm hover:underline">
              5. Publish
            </a>
          </li>
        </ol>
      </nav>
    </aside>
  );
}
