import { z } from "zod";

// The date input of "Student access ends on" and the stored value. The stored value is unchanged: a UTC ISO 8601
// date and time such as 2026-12-31T23:59:59.000Z, the same shape the permission API reads and returns. The input
// only shows and sets the day. A chosen day ends at the last second of that day in UTC, so access lasts through it.
const stored = z.iso.datetime();

/** The day of a stored value for a date input ("2026-12-31"), or "" for none or a value that is not a stored expiry. */
export function expiryToDateInput(value: string | null | undefined): string {
  return value && stored.safeParse(value).success ? value.slice(0, 10) : "";
}

/**
 * The value to store for a day chosen in the date input. An empty input stores none. If the day is the day of the
 * value already stored, that exact value is kept, so opening and saving never moves a time that was set before.
 */
export function dateInputToExpiry(date: string, original?: string | null): string | null {
  if (!date) return null;
  if (original && expiryToDateInput(original) === date) return original;
  return `${date}T23:59:59.000Z`;
}

/** Today in UTC as a date input value, the earliest day that can be chosen. */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** A plain message when the day cannot be used, or null. */
export function expiryDateProblem(date: string, now: Date = new Date()): string | null {
  if (!date) return null;
  const real = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().startsWith(date);
  if (!real) return "Enter a real date.";
  return date < todayUtc(now) ? "Choose today or a later date. Dates are in UTC." : null;
}
