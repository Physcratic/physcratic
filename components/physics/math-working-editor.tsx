"use client";

import { useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  equationTemplates,
  insertEquation,
  previewWorking,
  workingLimit,
} from "@/lib/latex-working";

export function MathWorkingEditor({
  id,
  value,
  onChange,
  description,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  description: string;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const blocks = useMemo(() => previewWorking(value), [value]);

  function insert(latex: string) {
    const textarea = input.current;
    if (!textarea) return;
    const result = insertEquation(
      value,
      textarea.selectionStart,
      textarea.selectionEnd,
      latex,
    );
    if (!result) return;
    onChange(result.value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  return (
    <Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>Your working</FieldLabel>
        <Badge variant="outline">LaTeX supported</Badge>
      </div>
      <p
        id={`${id}-syntax`}
        className="text-sm leading-relaxed text-muted-foreground"
      >
        Explain in words, add equations with{" "}
        <code className="font-mono">{"$$…$$"}</code>, or use a shortcut below.
      </p>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Insert LaTeX equation"
      >
        {equationTemplates.map((template) => (
          <Button
            key={template.label}
            type="button"
            variant="outline"
            size="sm"
            title={`Insert ${template.latex}`}
            aria-label={`Insert ${template.label.toLowerCase()}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insert(template.latex)}
            disabled={value.length >= workingLimit}
          >
            {template.label}
          </Button>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-sm text-muted-foreground">Write · text & LaTeX</p>
          <Textarea
            ref={input}
            id={id}
            rows={7}
            maxLength={workingLimit}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={
              "Resolve the forces along the slope.\n\n$$a = g\\sin\\theta$$"
            }
            spellCheck={false}
            aria-describedby={`${id}-syntax ${id}-help`}
          />
        </div>
        <section
          className="flex min-w-0 flex-1 flex-col gap-2"
          aria-label="Live working preview"
        >
          <p className="text-sm text-muted-foreground">
            Live preview · not graded
          </p>
          <div className="flex min-h-44 min-w-0 flex-1 flex-col gap-3 rounded-md border bg-muted/20 p-4">
            {value.trim() ? (
              blocks.map((block, index) =>
                block.type === "math" ? (
                  <div
                    key={index}
                    className="math-formula min-w-0 overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: block.value }}
                  />
                ) : block.value ? (
                  <p
                    key={index}
                    className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground"
                  >
                    {block.value}
                  </p>
                ) : null,
              )
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your reasoning and typeset equations appear here as you write.
                Start with a shortcut; replace the selected expression with your
                own.
              </p>
            )}
          </div>
        </section>
      </div>
      <details className="rounded-md border p-3 text-sm">
        <summary className="cursor-pointer font-medium">
          LaTeX quick reference
        </summary>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 pt-4 leading-relaxed">
          <dt>
            <code className="font-mono">{"\\frac{a}{b}"}</code>
          </dt>
          <dd>Fraction</dd>
          <dt>
            <code className="font-mono">{"x^{2}, x_{0}"}</code>
          </dt>
          <dd>Power & subscript</dd>
          <dt>
            <code className="font-mono">{"\\sqrt{x}"}</code>
          </dt>
          <dd>Square root</dd>
          <dt>
            <code className="font-mono">{"\\theta, \\Delta, \\pi"}</code>
          </dt>
          <dd>Greek symbols</dd>
          <dt>
            <code className="font-mono">{"\\mathrm{m/s^2}"}</code>
          </dt>
          <dd>Units</dd>
        </dl>
      </details>
      <FieldDescription id={`${id}-help`}>{description}</FieldDescription>
    </Field>
  );
}
