"use client";

import { Check, CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  iphoPapers,
  iphoSubproblems,
  type IphoPaper,
  type IphoPaperId,
  type IphoSubproblem,
} from "@/lib/ipho-archive";
import { cn } from "@/lib/utils";

export function IphoPaperPicker({
  activePaper,
  onSelect,
}: {
  activePaper: IphoPaperId;
  onSelect: (id: IphoPaperId) => void;
}) {
  return (
    <>
      <div className="min-w-0 sm:hidden">
        <Select
          value={activePaper}
          onValueChange={(value) => onSelect(value as IphoPaperId)}
        >
          <SelectTrigger aria-label="Choose an IPhO paper">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["Theory", "Experiment"] as const).map((kind) => (
              <SelectGroup key={kind}>
                <SelectLabel>{kind} papers</SelectLabel>
                {iphoPapers
                  .filter((paper) => paper.kind === kind)
                  .map((paper) => (
                    <SelectItem key={paper.id} value={paper.id}>
                      {paper.code} · {paper.title}
                    </SelectItem>
                  ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ToggleGroup
        type="single"
        value={activePaper}
        onValueChange={(value) => {
          if (value) onSelect(value as IphoPaperId);
        }}
        aria-label="Choose an IPhO paper"
        className="hidden items-stretch gap-2 sm:grid sm:grid-cols-3 xl:grid-cols-5"
      >
        {iphoPapers.map((paper) => (
          <ToggleGroupItem
            key={paper.id}
            value={paper.id}
            aria-label={`${paper.code}: ${paper.title}`}
            className="h-auto min-w-0 flex-col items-start justify-start gap-2 rounded-lg border px-4 py-4 text-left"
          >
            <span className="flex w-full items-center justify-between gap-2 text-sm">
              <span className="font-semibold">{paper.code}</span>
              <span className="font-normal text-muted-foreground">
                {paper.kind}
              </span>
            </span>
            <span className="text-pretty text-sm font-medium leading-snug">
              {paper.title}
            </span>
            <span className="mt-auto text-sm font-normal text-muted-foreground">
              {
                iphoSubproblems.filter((task) => task.paperId === paper.id)
                  .length
              }{" "}
              subproblems
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </>
  );
}

export function IphoSubproblemNavigation({
  paper,
  activeId,
  reviewed,
  onSelect,
}: {
  paper: IphoPaper;
  activeId: string;
  reviewed: string[];
  onSelect: (id: string) => void;
}) {
  const tasks = iphoSubproblems.filter((task) => task.paperId === paper.id);
  const groups = paper.sections.map((section) => ({
    ...section,
    tasks: tasks.filter((task) => task.part.startsWith(section.letter)),
  }));

  function optionLabel(task: IphoSubproblem) {
    return `${task.part} · ${task.title}${reviewed.includes(task.id) ? " · reviewed" : ""}`;
  }

  return (
    <>
      <div className="min-w-0 min-[1150px]:hidden">
        <Select value={activeId} onValueChange={onSelect}>
          <SelectTrigger aria-label="Jump to subproblem">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectGroup key={group.letter}>
                <SelectLabel>
                  Part {group.letter} · {group.title}
                </SelectLabel>
                {group.tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {optionLabel(task)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
      <nav
        aria-label={`${paper.code} subproblems`}
        className="hidden min-w-0 flex-col gap-5 min-[1150px]:flex"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Subproblems</h3>
          <span className="text-sm text-muted-foreground">
            {tasks.length} total
          </span>
        </div>
        <div className="flex max-h-[36rem] flex-col gap-5 overflow-y-auto overscroll-contain pr-1">
          {groups.map((group) => (
            <section
              key={group.letter}
              aria-labelledby={`ipho-part-${group.letter}`}
              className="flex flex-col gap-2"
            >
              <h4
                id={`ipho-part-${group.letter}`}
                className="px-2 text-sm font-medium leading-relaxed text-muted-foreground"
              >
                {group.letter} · {group.title}
              </h4>
              <ul className="flex flex-col gap-1">
                {group.tasks.map((task) => {
                  const isReviewed = reviewed.includes(task.id);
                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(task.id)}
                        aria-current={task.id === activeId ? "step" : undefined}
                        aria-label={`${paper.code} ${optionLabel(task)}`}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-lg px-2 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          task.id === activeId
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <span className="w-7 shrink-0 font-medium tabular-nums">
                          {task.part}
                        </span>
                        <span className="flex-1 leading-snug">
                          {task.title}
                        </span>
                        {isReviewed ? (
                          <CheckCircle2
                            className="size-4 shrink-0"
                            aria-label="Reviewed"
                          />
                        ) : (
                          <span className="text-muted-foreground tabular-nums">
                            {task.points.toFixed(1)}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
        {reviewed.some((id) => tasks.some((task) => task.id === id)) && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="size-4" />
            Checks indicate self-review, not a grade.
          </p>
        )}
      </nav>
    </>
  );
}
