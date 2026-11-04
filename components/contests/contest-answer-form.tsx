"use client";

import { useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { fetchJson } from "@/lib/api-client";
import type {
  ContestAttemptView,
  ContestProblemView,
} from "@/lib/contest-contracts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { LatexAnswerPreview } from "@/components/physics/latex-answer-preview";

export function ContestAnswerForm({
  contestId,
  problem,
  latest,
  disabled,
  earned,
  onSaved,
}: {
  contestId: string;
  problem: ContestProblemView;
  latest?: ContestAttemptView;
  disabled: boolean;
  earned: Set<string>;
  onSaved: () => Promise<unknown>;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      latest?.answers.map((answer) => [answer.partId, answer.latex]) ?? [],
    ),
  );
  const [saved, setSaved] = useState<ContestAttemptView | undefined>(latest);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef<{ payload: string; key: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || disabled) return;
    const input = {
      problemId: problem.id,
      version: problem.metadata.version,
      answers: problem.metadata.parts.flatMap((part) =>
        answers[part.id]?.trim()
          ? [{ partId: part.id, latex: answers[part.id] }]
          : [],
      ),
    };
    if (!input.answers.length) {
      setError("Enter at least one answer before submitting.");
      return;
    }
    const payload = JSON.stringify(input);
    if (!pending.current || pending.current.payload !== payload)
      pending.current = { payload, key: crypto.randomUUID() };
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetchJson<{ attempt: ContestAttemptView }>(
        `/api/contests/${contestId}/submissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...input,
            idempotencyKey: pending.current.key,
          }),
        },
      );
      setSaved(response.attempt);
      pending.current = null;
      setNotice(
        "Answers saved. Your best correct result for each part counts towards your score.",
      );
      await onSaved();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Answers could not be saved. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5"
      aria-label={`Answers for ${problem.title}`}
    >
      <FieldSet disabled={disabled || busy}>
        <FieldLegend>Final answers</FieldLegend>
        <FieldDescription>
          Use LaTeX or a number in the displayed unit. Your derivation is not
          graded. An inconclusive check earns no point but is not marked
          incorrect.
        </FieldDescription>
        <FieldGroup>
          {problem.metadata.parts.map((part) => {
            const result = saved?.results.find(
              (item) => item.partId === part.id,
            );
            const hasPoint =
              earned.has(`${problem.id}:${part.id}`) ||
              result?.status === "correct";
            return (
              <Field key={part.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <FieldLabel htmlFor={`${problem.id}-${part.id}`}>
                    {part.label}
                    {part.unit ? ` (${part.unit})` : ""}
                  </FieldLabel>
                  {hasPoint && (
                    <Badge variant="secondary">1 point earned</Badge>
                  )}
                </div>
                <FieldDescription id={`${problem.id}-${part.id}-help`}>
                  {part.help}
                  {part.symbols.length
                    ? ` Symbols: ${part.symbols.join(", ")}.`
                    : ""}
                </FieldDescription>
                <Input
                  id={`${problem.id}-${part.id}`}
                  aria-describedby={`${problem.id}-${part.id}-help`}
                  value={answers[part.id] ?? ""}
                  maxLength={1024}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) =>
                    setAnswers({ ...answers, [part.id]: event.target.value })
                  }
                />
                <LatexAnswerPreview value={answers[part.id] ?? ""} />
                {result && (
                  <p role="status" className="text-sm text-muted-foreground">
                    {result.message}
                  </p>
                )}
              </Field>
            );
          })}
        </FieldGroup>
      </FieldSet>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={disabled || busy}>
          <Send aria-hidden="true" data-icon="inline-start" />
          {busy
            ? "Checking and saving…"
            : disabled
              ? "Submissions closed"
              : "Submit answers"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Answers are saved only when submitted.
        </p>
      </div>
    </form>
  );
}
