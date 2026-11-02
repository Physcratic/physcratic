"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  studentRequest,
  publicStudentRevision,
  type PublicRevision,
} from "@/lib/authored-student";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "./editor-fields";
const id = z.uuid();
const metadata = z.object({
  problemId: id,
  revisionId: id,
  partId: id,
  version: z.number().int().nonnegative(),
  enabled: z.boolean(),
  expiresAt: z.iso.datetime().nullable(),
  authorizationId: id.nullable(),
  mediaIds: z.array(id),
  solutionImageIds: z.array(id),
  solutionPdfIds: z.array(id),
});
export function SolutionPermissions({ problemId }: { problemId: string }) {
  const [revision, setRevision] = useState<PublicRevision | null>(null),
    [part, setPart] = useState(""),
    [data, setData] = useState<z.infer<typeof metadata> | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [expiry, setExpiry] = useState(""),
    [images, setImages] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const epoch = useRef(0),
    lock = useRef(false);
  useEffect(
    () => () => {
      epoch.current++;
    },
    [],
  );
  const base = `/api/authored-problems/drafts/${problemId}/solutions/${part}/permission`;
  async function loadPublication() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setData(null);
    const serial = ++epoch.current;
    try {
      const r = publicStudentRevision(
        await studentRequest(`/api/authored-problems/${problemId}`),
        problemId,
      );
      if (serial !== epoch.current) return;
      setRevision(r);
      setPart(r.content.sections.flatMap((s) => s.parts)[0]?.id ?? "");
      setMessage(
        "Published snapshot loaded. Select a part and reload its permission.",
      );
    } catch {
      if (serial === epoch.current)
        setMessage(
          "Publication unavailable. Previously loaded permission may still be revoked. Enabling requires current publication.",
        );
    } finally {
      if (serial === epoch.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  async function load() {
    if (!revision || !part || lock.current) return;
    lock.current = true;
    setBusy(true);
    setData(null);
    const serial = ++epoch.current;
    try {
      const d = metadata.parse(
        await studentRequest(`${base}?revision=${revision.id}`),
      );
      if (serial !== epoch.current) return;
      if (
        d.problemId !== problemId ||
        d.revisionId !== revision.id ||
        d.partId !== part
      )
        throw Error();
      setData(d);
      setSelected(d.mediaIds.filter((id) => d.solutionPdfIds.includes(id)));
      setExpiry(d.expiresAt ?? "");
      setImages(false);
      setMessage(
        "Permission metadata loaded. Enabling requires fresh explicit image approval.",
      );
    } catch {
      if (serial === epoch.current)
        setMessage(
          "Permission could not be loaded. Retry this read. No change was sent.",
        );
    } finally {
      if (serial === epoch.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  async function save(enabled: boolean) {
    if (!data || !revision || lock.current) return;
    if (enabled && !images) {
      setMessage(
        "Explicitly approve the complete worked-solution image set first.",
      );
      return;
    }
    if (
      enabled &&
      !window.confirm(
        "Make this immutable part’s complete worked solution, all its images and selected PDFs available to verified students? Previously downloaded content cannot be recalled.",
      )
    )
      return;
    const original = data;
    lock.current = true;
    setBusy(true);
    setData(null);
    const serial = ++epoch.current;
    try {
      const response = await fetch(base, {
        method: "PUT",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          revisionId: revision.id,
          version: original.version,
          enabled,
          mediaIds: enabled ? [...original.solutionImageIds, ...selected] : [],
          expiresAt: enabled ? expiry || null : null,
        }),
      });
      if (!response.ok) throw Error();
      await response.json();
      if (serial === epoch.current)
        setMessage(
          "Change acknowledged. Reload permission metadata to verify its current state.",
        );
    } catch {
      if (serial === epoch.current)
        setMessage(
          "Change uncertain or conflicted (possibly 409). Do not retry the PUT. Reload permission metadata before another deliberate change.",
        );
    } finally {
      if (serial === epoch.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <section
      aria-label="Student solution access"
      className="space-y-4 rounded-xl border p-5"
    >
      <h2 className="text-lg font-semibold">Student worked-solution access</h2>
      <p className="text-sm">
        Private by default. Controls target an immutable published revision,
        independently of draft autosave. Previously downloaded content cannot be
        recalled.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => void loadPublication()}
      >
        Load current published solution controls
      </Button>
      {revision && (
        <>
          <p className="break-words text-xs">
            Revision {revision.number} · {revision.id}
          </p>
          <Field label="Solution permission part">
            {(id) => (
              <select
                id={id}
                className={inputClass}
                value={part}
                disabled={busy}
                onChange={(e) => {
                  epoch.current++;
                  setPart(e.target.value);
                  setData(null);
                  setImages(false);
                }}
              >
                {revision.content.sections
                  .flatMap((s) => s.parts)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      Part {p.label || p.id}
                    </option>
                  ))}
              </select>
            )}
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void load()}
          >
            Reload permission metadata
          </Button>
        </>
      )}
      {data && (
        <>
          <p>
            {data.enabled
              ? data.expiresAt && Date.parse(data.expiresAt) <= Date.now()
                ? "Expired (private)"
                : "Configured for student access while published (subject to expiry)"
              : "Private"}{" "}
            · Permission version {data.version}
          </p>
          <p className="break-words text-xs">
            Approved media: {data.mediaIds.join(", ") || "None"}. Expiry:{" "}
            {data.expiresAt || "None"}
          </p>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={images}
              onChange={(e) => setImages(e.target.checked)}
            />
            I explicitly approve all {data.solutionImageIds.length}{" "}
            worked-solution images and the complete native solution.
          </label>
          {data.solutionImageIds.map((id) => (
            <p key={id} className="break-words text-xs">
              Solution image {id}
            </p>
          ))}
          {data.solutionPdfIds.map((id) => (
            <label
              key={id}
              className="flex min-h-11 items-center gap-3 break-all"
            >
              <input
                type="checkbox"
                checked={selected.includes(id)}
                onChange={(e) =>
                  setSelected((old) =>
                    e.target.checked
                      ? [...old, id]
                      : old.filter((x) => x !== id),
                  )
                }
              />
              Approve entire solution PDF {id} for this part
            </label>
          ))}
          <Field
            label="Solution expiry (UTC ISO 8601, optional)"
            help="Leave blank for no expiry, or use 2027-01-01T00:00:00.000Z."
          >
            {(id) => (
              <input
                id={id}
                className={inputClass}
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={busy}
              onClick={() => void save(true)}
            >
              Confirm student access
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void save(false)}
            >
              Revoke student access
            </Button>
          </div>
        </>
      )}
      <p role="status">{busy ? "Checking permission…" : message}</p>
    </section>
  );
}
