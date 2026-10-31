"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  solutionViewSchema,
  solutionMediaPath,
} from "@/lib/authored-solution-contracts";
import { studentRequest, StudentRequestError } from "@/lib/authored-student";
import { MathPreview } from "@/components/authoring/editor-fields";
import { Button } from "@/components/ui/button";
export function WorkedSolution({
  problemId,
  revisionId,
  partId,
  onStale,
  onAuth,
}: {
  problemId: string;
  revisionId: string;
  partId: string;
  onStale: () => void;
  onAuth: () => void;
}) {
  const [value, setValue] = useState<ReturnType<
      typeof solutionViewSchema.parse
    > | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const shown = useRef(false);
  const running = useRef(false),
    epoch = useRef(0),
    controller = useRef<AbortController | null>(null);
  const cancelRequest = useCallback(() => {
    epoch.current++;
    controller.current?.abort();
  }, []);
  const clear = () => {
    shown.current = false;
    epoch.current++;
    controller.current?.abort();
    running.current = false;
    setBusy(false);
    setValue(null);
  };
  useEffect(() => {
    const hide = () => {
      if (!shown.current && !running.current) return;
      clear();
      setMessage(
        "Solution hidden. Any request already sent may have recorded assistance. Request explicitly again to recheck access.",
      );
    };
    window.addEventListener("blur", hide);
    window.addEventListener("focus", hide);
    document.addEventListener("visibilitychange", hide);
    return () => {
      cancelRequest();
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", hide);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [cancelRequest]);
  useEffect(() => {
    if (!value) return;
    const timer = setTimeout(() => {
      clear();
      setMessage(
        "Solution hidden. Request again to recheck permission and expiry.",
      );
    }, 300000);
    return () => clearTimeout(timer);
  }, [value]);
  async function pdfDownload(url: string) {
    if (running.current) return;
    clear();
    const serial = epoch.current;
    controller.current = new AbortController();
    running.current = true;
    setBusy(true);
    setMessage("Checking PDF access. Previously displayed solution cleared.");
    try {
      const response = await fetch(url, {
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.any([
          controller.current.signal,
          AbortSignal.timeout(15000),
        ]),
      });
      if (!response.ok) throw new StudentRequestError(response.status);
      if (!response.headers.get("content-type")?.includes("application/pdf"))
        throw Error();
      const blob = await response.blob();
      if (serial !== epoch.current) return;
      if (blob.size > 3145728) throw Error();
      const local = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = local;
      link.download = "worked-solution.pdf";
      link.click();
      setTimeout(() => URL.revokeObjectURL(local), 1000);
      setMessage(
        "Authorized PDF downloaded. Previously downloaded content cannot be recalled.",
      );
    } catch (e) {
      if (serial !== epoch.current) return;
      if (e instanceof StudentRequestError) {
        if ([401, 403].includes(e.status)) onAuth();
        if (e.status === 409) onStale();
      }
      setMessage(
        "PDF access unavailable or uncertain. Solution hidden; explicitly recheck access.",
      );
    } finally {
      if (serial === epoch.current) {
        running.current = false;
        setBusy(false);
      }
    }
  }
  async function reveal() {
    if (running.current) return;
    if (
      !window.confirm(
        "View this worked solution? Revealing any part makes subsequent new attempts on this entire revision assisted, even before your first submission. Existing attempts stay unchanged.",
      )
    )
      return;
    running.current = true;
    const serial = ++epoch.current;
    controller.current = new AbortController();
    setBusy(true);
    setValue(null);
    setMessage("");
    try {
      const data = solutionViewSchema.parse(
        await studentRequest(
          `/api/authored-problems/${problemId}/solutions/${partId}/view`,
          { body: { revisionId }, signal: controller.current.signal },
        ),
      );
      if (serial !== epoch.current) return;
      if (
        data.problemId !== problemId ||
        data.revisionId !== revisionId ||
        data.partId !== partId ||
        data.media.some(
          (m) =>
            m.url !== solutionMediaPath(problemId, revisionId, partId, m.id),
        ) ||
        data.solution.some(
          (b) =>
            b.kind === "image" &&
            !data.media.some(
              (m) => m.id === b.mediaId && m.purpose === "solution-image",
            ),
        )
      )
        throw Error("Invalid solution selection");
      shown.current = true;
      setValue(data);
      setMessage(
        "Server-confirmed reveal. Subsequent new attempts on this revision are assisted; original attempts and retries retain their saved status.",
      );
    } catch (e) {
      if (serial !== epoch.current) return;
      setValue(null);
      if (e instanceof StudentRequestError) {
        if ([401, 403].includes(e.status)) onAuth();
        if (e.status === 409) onStale();
        setMessage(
          e.status === 404
            ? "Worked solution unavailable: private, revoked, expired or unpublished."
            : e.status === 429
              ? "Temporary request limit. Wait before explicitly requesting again."
              : "Access could not be confirmed. Solution hidden; reload the problem or explicitly request again.",
        );
      } else
        setMessage(
          "Reveal could not be confirmed. It may have been recorded as assistance. Solution hidden; explicitly request again.",
        );
    } finally {
      if (serial === epoch.current) {
        running.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <section
      aria-label="Worked solution"
      className="min-w-0 space-y-4 rounded-xl border p-5"
    >
      <h2 className="text-lg font-semibold">Worked solution</h2>
      <p className="text-sm text-muted-foreground">
        Optional, before or after any attempt. Viewing any part assists future
        attempts on this revision. No private marking key or hints are shown.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => void reveal()}
      >
        {busy ? "Checking solution access…" : "View worked solution"}
      </Button>
      <p role="status" className="text-sm">
        {message}
      </p>
      {value && (
        <div
          className="min-w-0 space-y-4"
          aria-label="Approved worked solution"
        >
          {value.solution.map((b) =>
            b.kind === "text" ? (
              <p key={b.id} className="whitespace-pre-wrap break-words">
                {b.spans.map((s, i) =>
                  s.kind === "text" ? (
                    <span key={i}>{s.text}</span>
                  ) : (
                    <MathPreview
                      key={i}
                      latex={s.latex}
                      inline
                      keyboardScrollable
                    />
                  ),
                )}
              </p>
            ) : b.kind === "math" ? (
              <MathPreview key={b.id} latex={b.latex} keyboardScrollable />
            ) : (
              <figure key={b.id}>
                {/* eslint-disable-next-line @next/next/no-img-element -- Private approved media must use its authenticated no-store proxy directly. */}
                <img
                  className="max-w-full"
                  alt={b.alt}
                  src={value.media.find((m) => m.id === b.mediaId)!.url}
                  onError={() => {
                    clear();
                    setMessage(
                      "Media access uncertain. Solution hidden; explicitly recheck access.",
                    );
                  }}
                />
                <figcaption>{b.caption}</figcaption>
              </figure>
            ),
          )}
          {value.media
            .filter((m) => m.purpose === "solution-pdf")
            .map((m, i) => (
              <a
                key={m.id}
                href={m.url}
                onClick={(e) => {
                  e.preventDefault();
                  void pdfDownload(m.url);
                }}
                target="_blank"
                rel="noopener noreferrer"
                className="block min-h-11 underline"
              >
                Download approved solution PDF {i + 1}
              </a>
            ))}
        </div>
      )}
    </section>
  );
}
