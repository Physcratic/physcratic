"use client";

import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import {
  contestDraftSchema,
  testContestDraft,
  type ContestDraftInput,
  type ContestProblemOption,
  type ContestSummary,
} from "@/lib/contest-contracts";
import { fetchJson } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

export function ContestDraftForm({
  contest,
  problems,
  onSaved,
  onCancel,
}: {
  contest?: ContestSummary;
  problems: ContestProblemOption[];
  onSaved: () => Promise<unknown>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ContestDraftInput>(
    contest
      ? {
          name: contest.name,
          description: contest.description,
          durationMinutes: contest.durationMinutes,
          launchOnPublish: contest.launchOnPublish,
          startsAt: contest.startsAt,
          problemIds: contest.problemIds,
        }
      : { ...testContestDraft },
  );
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    const parsed = contestDraftSchema.safeParse(draft);
    if (!parsed.success) {
      setInvalidFields(
        parsed.error.issues.map((issue) => String(issue.path[0])),
      );
      setError(parsed.error.issues.map((issue) => issue.message).join(" "));
      return;
    }
    setInvalidFields([]);
    setBusy(true);
    try {
      await fetchJson(
        contest ? `/api/contests/admin/${contest.id}` : "/api/contests/admin",
        {
          method: contest ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            contest
              ? { version: contest.version, draft: parsed.data }
              : parsed.data,
          ),
        },
      );
      setNotice("Draft saved. It is not public until you publish it below.");
      await onSaved();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The draft could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  const selected = draft.problemIds
    .map((id) => problems.find((problem) => problem.id === id))
    .filter((problem) => problem !== undefined);
  const filtered = problems.filter((problem) =>
    `${problem.title} ${problem.topic}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const fieldInvalid = (field: string) => invalidFields.includes(field);
  return (
    <form
      onSubmit={save}
      aria-label={contest ? "Edit contest draft" : "Create contest draft"}
      className="flex flex-col gap-6"
    >
      <FieldGroup>
        <Field data-invalid={fieldInvalid("name")}>
          <FieldLabel htmlFor="contest-name">Contest name</FieldLabel>
          <Input
            id="contest-name"
            value={draft.name}
            maxLength={120}
            required
            minLength={3}
            disabled={busy}
            aria-invalid={fieldInvalid("name")}
            onChange={(event) =>
              setDraft({ ...draft, name: event.target.value })
            }
          />
        </Field>
        <Field data-invalid={fieldInvalid("description")}>
          <FieldLabel htmlFor="contest-description">Description</FieldLabel>
          <Textarea
            id="contest-description"
            value={draft.description}
            required
            minLength={10}
            maxLength={2000}
            rows={3}
            disabled={busy}
            aria-invalid={fieldInvalid("description")}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
          />
        </Field>
        <Field data-invalid={fieldInvalid("durationMinutes")}>
          <FieldLabel htmlFor="contest-duration">
            Duration in minutes
          </FieldLabel>
          <Input
            id="contest-duration"
            type="number"
            min={5}
            max={43200}
            step={1}
            required
            value={draft.durationMinutes || ""}
            disabled={busy}
            aria-invalid={fieldInvalid("durationMinutes")}
            onChange={(event) =>
              setDraft({
                ...draft,
                durationMinutes: Number(event.target.value),
              })
            }
          />
          <FieldDescription>
            10080 minutes is exactly 7 days. Everyone shares the same closing
            time.
          </FieldDescription>
        </Field>
        <Field orientation="horizontal">
          <Checkbox
            id="contest-launch"
            checked={draft.launchOnPublish}
            disabled={busy}
            onCheckedChange={(checked) =>
              setDraft({ ...draft, launchOnPublish: checked === true })
            }
          />
          <FieldContent>
            <FieldLabel htmlFor="contest-launch">
              Start when published
            </FieldLabel>
            <FieldDescription>
              The timer starts only after the publication confirmation.
            </FieldDescription>
          </FieldContent>
        </Field>
        {!draft.launchOnPublish && (
          <Field data-invalid={fieldInvalid("startsAt")}>
            <FieldLabel htmlFor="contest-start">
              Start date and time in UTC
            </FieldLabel>
            <Input
              id="contest-start"
              type="datetime-local"
              required
              disabled={busy}
              aria-invalid={fieldInvalid("startsAt")}
              value={draft.startsAt?.slice(0, 16) ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  startsAt: event.target.value
                    ? `${event.target.value}:00.000Z`
                    : null,
                })
              }
            />
          </Field>
        )}
        <FieldSet>
          <FieldLegend>Archive problems</FieldLegend>
          <FieldDescription>
            Choose up to 12. Selection order is the contest order. Each checked
            answer part is 1 point.
          </FieldDescription>
          <Field>
            <FieldLabel htmlFor="contest-problem-search">
              Search the archive
            </FieldLabel>
            <Input
              id="contest-problem-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </Field>
          <FieldGroup className="max-h-72 overflow-y-auto rounded-lg border border-border p-4">
            {filtered.map((problem) => (
              <Field key={problem.id} orientation="horizontal">
                <Checkbox
                  id={`pick-${problem.id}`}
                  checked={draft.problemIds.includes(problem.id)}
                  disabled={
                    busy ||
                    (draft.problemIds.length >= 12 &&
                      !draft.problemIds.includes(problem.id))
                  }
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      problemIds:
                        checked === true
                          ? [...draft.problemIds, problem.id]
                          : draft.problemIds.filter((id) => id !== problem.id),
                    })
                  }
                />
                <FieldContent>
                  <FieldLabel htmlFor={`pick-${problem.id}`}>
                    {problem.title}
                  </FieldLabel>
                  <FieldDescription>
                    {problem.topic}, {problem.points}{" "}
                    {problem.points === 1 ? "point" : "points"}
                  </FieldDescription>
                </FieldContent>
              </Field>
            ))}
            {!filtered.length && (
              <p className="text-sm text-muted-foreground">
                No matching problems.
              </p>
            )}
          </FieldGroup>
          <p className="text-sm text-muted-foreground">
            {selected.length} selected,{" "}
            {selected.reduce((total, problem) => total + problem.points, 0)}{" "}
            points
          </p>
          <ol className="flex list-inside list-decimal flex-col gap-2 text-sm">
            {selected.map((problem) => (
              <li key={problem.id}>{problem.title}</li>
            ))}
          </ol>
        </FieldSet>
      </FieldGroup>
      {error && <FieldError>{error}</FieldError>}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy || !draft.problemIds.length}>
          <Save aria-hidden="true" data-icon="inline-start" />
          {busy ? "Saving draft…" : "Save draft"}
        </Button>
        {contest && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={busy}
          >
            New draft
          </Button>
        )}
      </div>
    </form>
  );
}
