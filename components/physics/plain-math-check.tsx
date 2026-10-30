"use client";

import { useId, useState } from "react";
import { Calculator, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { runPlainMath } from "@/lib/plain-math";
import { MathFormula } from "./math-formula";

export function PlainMathCheck() {
  const id = useId();
  const [expression, setExpression] = useState("");
  const [bindings, setBindings] = useState("");
  const [feedback, setFeedback] = useState<{ error?: string; value?: ReturnType<typeof runPlainMath> } | null>(null);
  return (
    <details className="group/calculator min-w-0 rounded-lg border bg-muted/30 text-foreground">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Calculator className="size-5" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-base font-semibold">Equation calculator</span>
            <span className="text-sm leading-relaxed text-muted-foreground">Try an equation with your own values.</span>
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open/calculator:rotate-180" aria-hidden="true" />
      </summary>
      <Separator />
      <div className="flex min-w-0 flex-col gap-5 p-4">
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor={`${id}-expression`}>Equation</FieldLabel>
            <Input id={`${id}-expression`} value={expression} onChange={(event) => { setExpression(event.target.value); setFeedback(null); }} maxLength={350} placeholder="a = g*sin(theta)" autoCapitalize="off" autoComplete="off" spellCheck={false} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-values`}>Variable values</FieldLabel>
            <Textarea id={`${id}-values`} rows={3} maxLength={2000} value={bindings} onChange={(event) => { setBindings(event.target.value); setFeedback(null); }} placeholder={"g = 9.81\ntheta = pi/6"} spellCheck={false} aria-describedby={`${id}-values-help`} />
            <FieldDescription id={`${id}-values-help`}>Optional, one value per line. Leave blank to preview the notation.</FieldDescription>
          </Field>
        </FieldGroup>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Button type="button" disabled={!expression.trim()} onClick={() => { try { setFeedback({ value: runPlainMath(expression, bindings) }); } catch (error) { setFeedback({ error: error instanceof Error ? error.message : "Could not read this expression." }); } }}>
            <Calculator data-icon="inline-start" />Calculate
          </Button>
          <p className="text-sm leading-relaxed text-muted-foreground">Angles in <strong className="font-medium text-foreground">radians</strong>. Keep units separate.</p>
        </div>
        <div aria-live="polite" role="status">
          {feedback?.error && <Alert variant="destructive"><AlertTitle>Check the expression</AlertTitle><AlertDescription>{feedback.error}</AlertDescription></Alert>}
          {feedback?.value && <Alert><AlertTitle>{feedback.value.result === null ? "Notation understood" : "Calculated result"}</AlertTitle><AlertDescription><MathFormula formula={`$$${feedback.value.symbol ? `${feedback.value.symbol} = ` : ""}${feedback.value.tex}$$`} /><p className="font-mono text-lg font-semibold text-foreground">{feedback.value.result === null ? `Add values for: ${feedback.value.missing.join(", ")}` : `${feedback.value.symbol ?? "result"} = ${Number(feedback.value.result.toPrecision(12))}`}</p></AlertDescription></Alert>}
        </div>
        <Separator />
        <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
          <p><strong className="font-medium text-foreground">Calculator only.</strong> Results do not check your physics or units and are not graded.</p>
          <details>
            <summary className="cursor-pointer rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Supported notation</summary>
            <p className="pt-2">Use <code className="font-mono text-foreground">+ - * / ^</code>, sqrt, sin, cos, tan, log / ln, exp, abs, pi and Greek letter names. Parentheses control grouping.</p>
          </details>
        </div>
      </div>
    </details>
  );
}
