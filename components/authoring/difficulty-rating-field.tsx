"use client";
import { useEffect, useId, useState } from "react";
import { CircleAlert } from "lucide-react";
import { RatingBandsPopover } from "@/components/physics/rating-bands-popover";
import { maxRating, parseRating, ratingBand, ratingBands } from "@/lib/rating-bands";
import { inputClass } from "./editor-fields";

export const difficultyMessage = `Add a difficulty rating from 0 to ${maxRating.toLocaleString("en-US")}.`;

/**
 * The difficulty rating in Problem Studio, Simple and Advanced. A required whole number from 0 to 4,000, with the band
 * it falls in shown beside it. The band buttons only fill in a number. `stored` is the saved rating text (or null) and
 * `save` stores what was typed, returning false when it is not a rating.
 */
export function DifficultyRatingField({ stored, save, tour }: { stored: string | null | undefined; save: (text: string) => boolean; tour?: boolean }) {
  const id = useId();
  const rating = parseRating(stored ?? "");
  const [text, setText] = useState(rating === null ? "" : String(rating));
  const [touched, setTouched] = useState(false);
  // A band pressed, or a rating changed from outside, updates the box. The box keeps what is being typed while it is not a rating yet.
  useEffect(() => {
    setText((current) => (rating !== null && parseRating(current) === rating ? current : rating === null ? current : String(rating)));
  }, [rating]);
  const typed = parseRating(text);
  const band = typed === null ? null : ratingBand(typed);
  const invalid = typed === null;
  const showError = invalid && (touched || text.trim() !== "");
  function type(value: string) {
    setText(value);
    setTouched(true);
    save(value);
  }
  return (
    <div className="space-y-3" data-tour={tour ? "studio-difficulty" : undefined}>
      <label htmlFor={`${id}-rating`} className="block text-lg font-semibold leading-snug">Difficulty rating</label>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <input
          id={`${id}-rating`}
          className={`${inputClass} min-h-12 border-2 text-base focus-visible:border-ring sm:max-w-40`}
          type="text"
          inputMode="numeric"
          pattern="[0-9,]*"
          autoComplete="off"
          maxLength={6}
          placeholder="2100"
          required
          value={text}
          aria-invalid={showError ? true : undefined}
          aria-describedby={`${id}-rating-help`}
          onBlur={() => setTouched(true)}
          onChange={(e) => type(e.target.value)}
        />
        <p aria-live="polite" className="min-w-0 text-base font-medium tabular-nums" data-testid="difficulty-band">
          {typed !== null && band ? `${typed.toLocaleString("en-US")} · ${band.name}` : ""}
        </p>
        <RatingBandsPopover />
      </div>
      {showError ? (
        <p id={`${id}-rating-help`} role="alert" className="flex items-start gap-2 text-base text-destructive">
          <CircleAlert aria-hidden="true" className="mt-1 size-4 shrink-0" />
          <span>{difficultyMessage}</span>
        </p>
      ) : (
        <p id={`${id}-rating-help`} className="text-base text-muted-foreground">{invalid ? difficultyMessage : "Whole number. Pick a band to fill one in."}</p>
      )}
      <div role="radiogroup" aria-label="Quick pick a band" className="grid gap-2 sm:grid-cols-2">
        {ratingBands.map((b) => {
          const on = band?.id === b.id;
          return (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setText(String(b.middle));
                setTouched(true);
                save(String(b.middle));
              }}
              className={`min-h-11 rounded-lg border-2 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${on ? "border-foreground bg-accent" : "border-input hover:bg-muted"}`}
            >
              <span className="block text-base font-semibold">{b.name}</span>
              <span className="block text-sm tabular-nums text-muted-foreground">{b.range}</span>
              <span className="block text-sm">{b.example}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
