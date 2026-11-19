"use client";
import type { EditorDraft } from "@/lib/problem-authoring-editor";
import { Field, inputClass } from "./editor-fields";

/** Where the problem comes from, who may share it, and the rights statement. */
export function ProvenanceFields({
  provenance, edit,
}: {
  provenance: EditorDraft["content"]["provenance"];
  edit: (fn: (value: EditorDraft) => void) => void;
}) {
  return (
    <>
      <Field label="Content provenance">
        {(id) => (
          <select
            id={id}
            className={inputClass}
            value={provenance.kind}
            onChange={(e) =>
              edit((d) => {
                d.content.provenance.kind = e.target.value as
                  | "original"
                  | "authorized";
              })
            }
          >
            <option value="original">My original work</option>
            <option value="authorized">Used with permission</option>
          </select>
        )}
      </Field>
      <Field
        label="Source / permission reference"
      >
        {(id) => (
          <input
            id={id}
            className={inputClass}
            maxLength={2000}
            value={provenance.source}
            onChange={(e) =>
              edit((d) => {
                d.content.provenance.source = e.target.value;
              })
            }
          />
        )}
      </Field>
      <Field
        label="Rights declaration"
      >
        {(id) => (
          <textarea
            id={id}
            className={inputClass}
            rows={2}
            maxLength={4000}
            value={provenance.rightsDeclaration}
            onChange={(e) =>
              edit((d) => {
                d.content.provenance.rightsDeclaration =
                  e.target.value;
              })
            }
          />
        )}
      </Field>
    </>
  );
}
