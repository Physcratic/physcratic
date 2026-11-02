"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { previewWorking, workingLimit } from "@/lib/latex-working";
import { PlainMathCheck } from "./plain-math-check";

export function MathWorkingEditor({ id, value, onChange, description, mode = "plain" }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  description: string;
  mode?: "plain" | "latex";
}) {
  const blocks = useMemo(() => previewWorking(value), [value]);
  return <Field>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <FieldLabel htmlFor={id}>Your working</FieldLabel>
      <Badge variant="outline">{mode === "latex" ? "Text + LaTeX" : "Plain text"}</Badge>
    </div>
    <p id={`${id}-syntax`} className="text-sm leading-relaxed text-muted-foreground">{mode === "latex" ? <>Explain your reasoning in words. Wrap equations in double dollar signs, for example <code className="font-mono">{"$$a = g\\sin\\theta$$"}</code>.</> : <>Explain your reasoning. Write equations like <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">a = g*sin(theta)</code>. No LaTeX needed.</>}</p>
    <div className="flex min-w-0 flex-col gap-4 xl:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-sm font-medium">Write</p>
        <Textarea id={id} rows={7} maxLength={workingLimit} value={value} onChange={(event) => onChange(event.target.value)} placeholder={mode === "latex" ? "Resolve the forces along the slope.\n$$a = g\\sin\\theta$$\nThe acceleration is in metres per second squared." : "Resolve the forces along the slope.\na = g*sin(theta) * 2^(½)\nThe acceleration is in m/s^2."} spellCheck={false} aria-describedby={`${id}-syntax ${id}-help`} />
      </div>
      <section className="flex min-w-0 flex-1 flex-col gap-2" aria-label="Live working preview">
        <p className="text-sm font-medium">Live preview</p>
        <div className="flex min-h-44 min-w-0 flex-1 flex-col gap-3 rounded-md border bg-muted/20 p-4">
          {value.trim() ? blocks.map((block, index) => block.type === "math" ? <div key={index} className="math-formula min-w-0 overflow-x-auto" dangerouslySetInnerHTML={{ __html: block.value }} /> : block.value ? <p key={index} className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{block.value}</p> : null) : <p className="text-sm leading-relaxed text-muted-foreground">Your words and equations appear here as you type.</p>}
        </div>
      </section>
    </div>
    {mode === "plain" && <PlainMathCheck />}
    <FieldDescription id={`${id}-help`}>{description}</FieldDescription>
  </Field>;
}
