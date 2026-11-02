"use client";
import { BlocksEditor, Field, inputClass, NumberInput } from "./editor-fields";
import { numericUnitsHelp } from "@/lib/authored-grading-contracts";
import type { EditorDraft } from "@/lib/problem-authoring-editor";
type Entry = EditorDraft["privateParts"][number];
export function AnswerPanel({
  entry,
  mode,
  onChange,
  onMode,
}: {
  entry: Entry;
  mode: "numeric" | "expression" | "manual";
  onChange: (entry: Entry) => void;
  onMode: (mode: "numeric" | "expression" | "manual") => void;
}) {
  const key = entry.key;
  return (
    <div className="space-y-6">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Private author content · never included in the student preview. These
        settings define a future checker. No mathematical grading runs here.
      </p>
      <Field label="Answer type">
        {(id) => (
          <select
            id={id}
            className={inputClass}
            value={mode}
            onChange={(e) => onMode(e.target.value as typeof mode)}
          >
            <option value="manual">Manual / ungraded</option>
            <option value="numeric">Numeric with units</option>
            <option value="expression">Expression</option>
          </select>
        )}
      </Field>
      {key?.kind === "numeric" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["value", "Expected value"],
              ["absTol", "Absolute tolerance"],
              ["relTol", "Relative tolerance"],
            ] as const
          ).map(([name, label]) => (
            <Field key={name} label={label}>
              {(id) => (
                <NumberInput
                  id={id}
                  value={key[name]}
                  nonnegative={name !== "value"}
                  onValue={(value) =>
                    onChange({ ...entry, key: { ...key, [name]: value } })
                  }
                />
              )}
            </Field>
          ))}
          <Field label="Units" help={numericUnitsHelp}>
            {(id) => (
              <input
                id={id}
                className={inputClass}
                maxLength={80}
                value={key.units}
                onChange={(e) =>
                  onChange({ ...entry, key: { ...key, units: e.target.value } })
                }
              />
            )}
          </Field>
        </div>
      )}
      {key?.kind === "expression" && (
        <div className="space-y-5">
          <Field
            label="Expected expression"
            help="Plain text: g*sin(3*theta)^(1/2). Use explicit * multiplication. Units are separate from expression input."
          >
            {(id) => (
              <input
                id={id}
                className={`${inputClass} font-mono`}
                value={key.expected}
                maxLength={180}
                onChange={(e) =>
                  onChange({
                    ...entry,
                    key: { ...key, expected: e.target.value },
                  })
                }
              />
            )}
          </Field>
          <Field label="Angle convention">
            {(id) => (
              <select
                id={id}
                className={inputClass}
                value={key.angleUnit}
                onChange={(e) =>
                  onChange({
                    ...entry,
                    key: {
                      ...key,
                      angleUnit: e.target.value as "radians" | "degrees",
                    },
                  })
                }
              >
                <option value="radians">Radians</option>
                <option value="degrees">Degrees</option>
              </select>
            )}
          </Field>
          {key.variables.map((variable, index) => (
            <fieldset key={index} className="space-y-3 rounded-md border p-3">
              <legend className="px-1 text-sm font-medium">
                Variable {index + 1} · real
              </legend>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Symbol">
                  {(id) => (
                    <input
                      id={id}
                      className={inputClass}
                      maxLength={32}
                      value={variable.name}
                      onChange={(e) =>
                        onChange({
                          ...entry,
                          key: {
                            ...key,
                            variables: key.variables.map((v, i) =>
                              i === index ? { ...v, name: e.target.value } : v,
                            ),
                          },
                        })
                      }
                    />
                  )}
                </Field>
                {(["min", "max"] as const).map((name) => (
                  <Field
                    key={name}
                    label={
                      name === "min"
                        ? "Minimum (optional)"
                        : "Maximum (optional)"
                    }
                  >
                    {(id) => (
                      <NumberInput
                        id={id}
                        value={variable[name]}
                        onValue={(value) =>
                          onChange({
                            ...entry,
                            key: {
                              ...key,
                              variables: key.variables.map((v, i) =>
                                i === index
                                  ? { ...v, [name]: value ?? undefined }
                                  : v,
                              ),
                            },
                          })
                        }
                      />
                    )}
                  </Field>
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                {(["positive", "nonnegative", "nonzero"] as const).map(
                  (assumption) => (
                    <label
                      key={assumption}
                      className="flex min-h-11 items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={variable.assumptions.includes(assumption)}
                        onChange={(e) =>
                          onChange({
                            ...entry,
                            key: {
                              ...key,
                              variables: key.variables.map((v, i) =>
                                i === index
                                  ? {
                                      ...v,
                                      assumptions: e.target.checked
                                        ? [...v.assumptions, assumption]
                                        : v.assumptions.filter(
                                            (a) => a !== assumption,
                                          ),
                                    }
                                  : v,
                              ),
                            },
                          })
                        }
                      />
                      {assumption}
                    </label>
                  ),
                )}
              </div>
              <button
                type="button"
                className="min-h-11 text-sm underline"
                onClick={() =>
                  onChange({
                    ...entry,
                    key: {
                      ...key,
                      variables: key.variables.filter((_, i) => i !== index),
                    },
                  })
                }
              >
                Remove variable {index + 1}
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            disabled={key.variables.length >= 20}
            className="min-h-11 text-sm underline"
            onClick={() =>
              onChange({
                ...entry,
                key: {
                  ...key,
                  variables: [
                    ...key.variables,
                    { name: "", domain: "real", assumptions: [] },
                  ],
                },
              })
            }
          >
            + Add variable
          </button>
          <Field
            label="Domain exclusions"
            help="One exclusion per line, for example x != 0. Mathematical validity is not checked by this editor."
          >
            {(id) => (
              <textarea
                id={id}
                className={inputClass}
                rows={2}
                value={key.exclusions.join("\n")}
                onChange={(e) =>
                  onChange({
                    ...entry,
                    key: {
                      ...key,
                      exclusions: e.target.value
                        ? e.target.value.split("\n")
                        : [],
                    },
                  })
                }
              />
            )}
          </Field>
        </div>
      )}
      <BlocksEditor
        scope="solution"
        label="Hints"
        blocks={entry.hints}
        onChange={(hints) => onChange({ ...entry, hints })}
      />
      <BlocksEditor
        scope="solution"
        label="Worked solution"
        blocks={entry.solution}
        onChange={(solution) => onChange({ ...entry, solution })}
      />
    </div>
  );
}
