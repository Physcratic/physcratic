"use client";
import * as React from "react";
import { Check, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FeedbackLink } from "@/components/feedback-link";
import { buildFeedbackHref, feedbackBase } from "@/lib/feedback";
import {
  physicsTagLabel,
  physicsTopics,
  resolvePhysicsTag,
  type PhysicsTag,
  type PhysicsTagKind,
} from "@/lib/physics-taxonomy";
import { MAX_TAGS, addTag, hasTag, orderMethodGroups, searchTags, type TagGroup } from "@/lib/studio-tags";
import { inputClass } from "./editor-fields";

/**
 * Topic or method picker. Options come only from the shared physics taxonomy, shown with the same
 * labels as the practice library. Tags already on a draft that are not in the taxonomy stay visible
 * and removable, and nothing that is stored is ever rewritten.
 */
export function TagPicker({
  kind,
  label,
  values,
  change,
  pickedTopics = [],
}: {
  kind: PhysicsTagKind;
  label: string;
  values: string[];
  change: (values: string[]) => void;
  /** Topics already chosen. Their methods are listed first. */
  pickedTopics?: string[];
}) {
  const [query, setQuery] = React.useState("");
  const id = React.useId();
  const groups: TagGroup[] =
    kind === "topic"
      ? [{ id: "topics", label: "Topics", tags: physicsTopics }]
      : orderMethodGroups(pickedTopics);
  const shown = groups
    .map((group) => ({ ...group, tags: searchTags(group.tags, query) }))
    .filter((group) => group.tags.length > 0);
  const full = values.length >= MAX_TAGS;
  const total = shown.reduce((n, g) => n + g.tags.length, 0);
  const noun = kind === "topic" ? "topics" : "methods";
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label htmlFor={`${id}-search`} className="block text-sm font-medium">
          {label}
        </label>
        <ul className="flex min-h-11 flex-wrap items-center gap-2" aria-label={`Selected ${noun}`}>
          {values.length === 0 && <li className="text-sm text-muted-foreground">None selected</li>}
          {values.map((value) => {
            const known = !!resolvePhysicsTag(value, kind);
            const text = physicsTagLabel(value, kind);
            return (
              <li key={value}>
                <Badge variant="concept" className="gap-1 py-0 pr-0">
                  {text}
                  {!known && <span className="sr-only"> (not in the tag list)</span>}
                  <button
                    type="button"
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Remove ${label} ${text}`}
                    onClick={() => change(values.filter((v) => v !== value))}
                  >
                    <X aria-hidden="true" className="size-3.5" />
                  </button>
                </Badge>
              </li>
            );
          })}
        </ul>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id={`${id}-search`}
            type="search"
            className={`${inputClass} pl-9`}
            placeholder={`Filter ${noun}`}
            value={query}
            aria-describedby={full ? `${id}-help` : undefined}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {full && (
          <p id={`${id}-help`} role="status" className="text-xs leading-relaxed text-muted-foreground">
            You have reached the limit of {MAX_TAGS} tags.
          </p>
        )}
      </div>
      <div
        role="group"
        aria-label={`Available ${noun}`}
        className="max-h-64 space-y-4 overflow-y-auto rounded-lg border bg-background p-3"
      >
        <p role="status" className="sr-only">{`${total} ${noun} shown`}</p>
        {total === 0 && <p className="text-sm text-muted-foreground">No {noun} match that search.</p>}
        {shown.map((group) => (
          <div key={group.id} className="space-y-2">
            {kind === "method" && (
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</h3>
            )}
            <div className="flex flex-wrap gap-2">
              {group.tags.map((tag: PhysicsTag) => {
                const selected = hasTag(values, tag, kind);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={!selected && full}
                    onClick={() => !selected && change(addTag(values, tag, kind))}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-xs aria-pressed:border-foreground aria-pressed:bg-accent aria-pressed:font-medium aria-pressed:text-accent-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  >
                    {selected && <Check aria-hidden="true" className="size-3.5" />}
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MissingTagNote() {
  // The feedback link is not configured everywhere. Without it there is nothing to point to.
  if (!buildFeedbackHref(feedbackBase, { page: "" })) return null;
  return (
    <p className="text-sm text-muted-foreground">
      Missing a tag? Tell us via <FeedbackLink variant="text" />.
    </p>
  );
}
