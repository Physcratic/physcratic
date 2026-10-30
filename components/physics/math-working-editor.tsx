"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { previewWorking, workingLimit } from "@/lib/latex-working";
import { PlainMathCheck } from "./plain-math-check";

export function MathWorkingEditor({ id, value, onChange, description }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  description: string;
}) {
  const blocks = useMemo(() => previewWorking(value), [value]);
  return <Field>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <FieldLabel htmlFor={id}>Your working</FieldLabel>
      <Badge variant="outline">Plain text · no LaTeX needed</Badge>
    </div>
    <p id={`${id}-syntax`} className="text-sm leading-relaxed text-muted-foreground">Explain your reasoning in words. Write equations just as on a calculator, for example <code className="font-mono">a = g*sin(theta) * 2^(½)</code>. Existing LaTeX still renders if you prefer it.</p>
    <div className="flex min-w-0 flex-col gap-4 xl:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-sm text-muted-foreground">Write · words and calculator-style maths</p>
        <Textarea id={id} rows={7} maxLength={workingLimit} value={value} onChange={(event) => onChange(event.target.value)} placeholder={"Resolve the forces along the slope.\na = g*sin(theta) * 2^(½)\nThe acceleration is in m/s^2."} spellCheck={false} aria-describedby={`${id}-syntax ${id}-help`} />
      </div>
      <section className="flex min-w-0 flex-1 flex-col gap-2" aria-label="Live working preview">
        <p className="text-sm text-muted-foreground">Your saved working · not graded</p>
        <div className="flex min-h-44 min-w-0 flex-1 flex-col gap-3 rounded-md border bg-muted/20 p-4">
          {value.trim() ? blocks.map((block, index) => block.type === "math" ? <div key={index} className="math-formula min-w-0 overflow-x-auto" dangerouslySetInnerHTML={{ __html: block.value }} /> : block.value ? <p key={index} className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{block.value}</p> : null) : <p className="text-sm leading-relaxed text-muted-foreground">Your reasoning is saved exactly as typed. No special markup is required. Use the calculator below to test individual equations.</p>}
        </div>
      </section>
    </div>
    <PlainMathCheck />
    <FieldDescription id={`${id}-help`}>{description}</FieldDescription>
  </Field>;
}
