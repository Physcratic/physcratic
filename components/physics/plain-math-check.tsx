"use client";

import { useId, useState } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
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
  return <details className="rounded-md border p-4 text-sm">
    <summary className="cursor-pointer font-medium">Try an equation · plain-text calculator</summary>
    <div className="flex flex-col gap-4 pt-4">
      <p className="leading-relaxed text-muted-foreground">Check how an equation is read and run it with your own values. This is a calculator, not a correctness check or a grade. Trigonometric angles are in radians; units are written separately.</p>
      <Field><FieldLabel htmlFor={`${id}-expression`}>Equation to check</FieldLabel><Input id={`${id}-expression`} value={expression} onChange={(event) => { setExpression(event.target.value); setFeedback(null); }} maxLength={350} placeholder="a = g*sin(theta) * 2^(½)" autoCapitalize="off" autoComplete="off" spellCheck={false} /></Field>
      <Field><FieldLabel htmlFor={`${id}-values`}>Variable values <span className="text-muted-foreground">(optional, one per line)</span></FieldLabel><Textarea id={`${id}-values`} rows={3} maxLength={2000} value={bindings} onChange={(event) => { setBindings(event.target.value); setFeedback(null); }} placeholder={"g = 9.81\ntheta = pi/6"} spellCheck={false} /><FieldDescription>Leave blank for a notation check. Use + - * / ^, sqrt, sin, cos, tan, log / ln, exp, abs, pi and Greek letter names. Parentheses control grouping.</FieldDescription></Field>
      <Button type="button" variant="outline" className="self-start" disabled={!expression.trim()} onClick={() => { try { setFeedback({ value: runPlainMath(expression, bindings) }); } catch (error) { setFeedback({ error: error instanceof Error ? error.message : "Could not read this expression." }); } }}><Calculator data-icon="inline-start" />Check and run equation</Button>
      <div aria-live="polite" role="status">
        {feedback?.error && <Alert variant="destructive"><AlertTitle>Check the expression</AlertTitle><AlertDescription>{feedback.error}</AlertDescription></Alert>}
        {feedback?.value && <Alert><AlertTitle>{feedback.value.result === null ? "Notation understood" : "Calculated result"}</AlertTitle><AlertDescription><MathFormula formula={`$$${feedback.value.symbol ? `${feedback.value.symbol} = ` : ""}${feedback.value.tex}$$`} /><p className="font-mono">{feedback.value.result === null ? `Add values for: ${feedback.value.missing.join(", ")}` : `${feedback.value.symbol ?? "result"} = ${Number(feedback.value.result.toPrecision(12))}`}</p><p>This does not establish that the physics or units are correct.</p></AlertDescription></Alert>}
      </div>
    </div>
  </details>;
}
