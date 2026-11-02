"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  authoredLibraryPageSchema,
  type AuthoredLibraryPage,
} from "@/lib/authored-library-contracts";

export function AuthoredLibraryCollection({ query }: { query: string }) {
  const [tag, setTag] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [provenance, setProvenance] = useState("");
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    page?: AuthoredLibraryPage;
    error?: boolean;
  }>();
  const heading = useRef<HTMLHeadingElement>(null);
  const moveFocus = useRef(false);
  const filters = JSON.stringify([
    query.trim(),
    tag.trim(),
    difficulty,
    provenance,
  ]);
  const [previousFilters, setPreviousFilters] = useState(filters);
  // Reset before rendering another filter's page/cursor, including rapid changes.
  if (previousFilters !== filters) {
    setPreviousFilters(filters);
    setCursors([undefined]);
  }
  const after = cursors.at(-1);
  const key = JSON.stringify([filters, after, refresh]);
  const current = result?.key === key ? result : undefined;
  useEffect(() => {
    const controller = new AbortController();
    let expired = false;
    let active = true;
    let deadline: ReturnType<typeof setTimeout>;
    const timer = setTimeout(async () => {
      deadline = setTimeout(() => {
        expired = true;
        controller.abort();
      }, 15000);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          tag: tag.trim(),
          difficulty,
          provenance,
        });
        if (after) params.set("after", after);
        const response = await fetch(
          `/api/authored-problems/library?${params}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) throw Error("Library unavailable");
        const page = authoredLibraryPageSchema.parse(await response.json());
        if (active && !controller.signal.aborted) {
          setResult({ key, page });
          if (moveFocus.current) {
            heading.current?.focus();
            moveFocus.current = false;
          }
        }
      } catch {
        if (active && (!controller.signal.aborted || expired))
          setResult({ key, error: true });
      } finally {
        clearTimeout(deadline);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(deadline);
      controller.abort();
    };
  }, [key, query, tag, difficulty, provenance, after]);
  function reset() {
    setTag("");
    setDifficulty("");
    setProvenance("");
    setCursors([undefined]);
    setRefresh((v) => v + 1);
  }
  return (
    <section
      aria-labelledby="authored-library-heading"
      className="min-w-0 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="authored-library-heading"
            ref={heading}
            tabIndex={-1}
            className="text-lg font-medium focus-visible:outline focus-visible:outline-ring"
          >
            Published authored problems
          </h2>
          <p className="text-sm text-muted-foreground">
            Search words in titles, tags, difficulty or source. Tag and
            difficulty filters match exact author labels.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setCursors([undefined]);
            setRefresh((v) => v + 1);
          }}
        >
          Refresh published problems
        </Button>
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-3">
        <Field className="min-w-0">
          <FieldLabel htmlFor="authored-tag">Authored tag</FieldLabel>
          <Input
            id="authored-tag"
            value={tag}
            maxLength={80}
            onChange={(e) => setTag(e.target.value)}
            placeholder="e.g. Mechanics"
          />
        </Field>
        <Field className="min-w-0">
          <FieldLabel htmlFor="authored-difficulty">
            Author-estimated difficulty
          </FieldLabel>
          <Input
            id="authored-difficulty"
            value={difficulty}
            maxLength={80}
            onChange={(e) => setDifficulty(e.target.value)}
            placeholder="e.g. Intermediate"
          />
        </Field>
        <Field className="min-w-0">
          <FieldLabel htmlFor="authored-provenance">Provenance</FieldLabel>
          <select
            id="authored-provenance"
            value={provenance}
            onChange={(e) => setProvenance(e.target.value)}
            className="min-h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline focus-visible:outline-ring"
          >
            <option value="">All provenance</option>
            <option value="original">Original</option>
            <option value="authorized">Authorized source</option>
          </select>
        </Field>
      </div>
      <p className="text-sm text-muted-foreground">
        Stable library order. Pages show current publications; refresh to
        include newly published entries earlier in the list. Worked solutions
        require separate authorization.
      </p>
      {!current && <p role="status">Loading published problems…</p>}
      {current?.error && (
        <div role="alert" className="space-y-3">
          <p>Published problems could not be loaded. Please try again.</p>
          <Button variant="outline" onClick={() => setRefresh((v) => v + 1)}>
            Retry library
          </Button>
        </div>
      )}
      {current?.page && (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            {current.page.problems.length} published problems on this page
          </p>
          {!current.page.problems.length ? (
            <div className="rounded-lg border p-6">
              <p>
                No published authored problems found. Try different search words
                or filters.
              </p>
              <Button variant="outline" className="mt-3" onClick={reset}>
                Clear authored filters
              </Button>
            </div>
          ) : (
            <ul className="min-w-0 divide-y rounded-lg border">
              {current.page.problems.map((problem) => (
                <li
                  key={problem.problemId}
                  className="min-w-0 space-y-2 p-4 [overflow-wrap:anywhere]"
                >
                  <h3 className="min-w-0 font-medium">
                    <a
                      href={`/dashboard/authored/${problem.problemId}`}
                      className="rounded underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-ring"
                    >
                      {problem.title}
                    </a>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {[...problem.topicTags, ...problem.methodTags].join(
                      " · ",
                    ) || "No tags"}
                  </p>
                  <p className="text-sm">
                    Author-estimated difficulty:{" "}
                    {problem.estimatedDifficulty || "Not specified"}
                  </p>
                  <p className="text-sm">
                    {problem.provenance.kind === "original"
                      ? "Original"
                      : "Authorized source"}
                    {problem.provenance.source &&
                      ` · ${problem.provenance.source}`}
                  </p>
                  <details className="text-sm text-muted-foreground">
                    <summary className="cursor-pointer rounded focus-visible:outline focus-visible:outline-ring">
                      Attribution and rights
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap">
                      {problem.provenance.rightsDeclaration}
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <nav aria-label="Authored problem pages" className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={cursors.length === 1}
          onClick={() => {
            moveFocus.current = true;
            setCursors((v) => v.slice(0, -1));
          }}
        >
          Previous page
        </Button>
        <Button
          variant="outline"
          disabled={!current?.page?.nextCursor}
          onClick={() => {
            moveFocus.current = true;
            setCursors((v) => [...v, current!.page!.nextCursor!]);
          }}
        >
          Next page
        </Button>
      </nav>
    </section>
  );
}
