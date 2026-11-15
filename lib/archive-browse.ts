import type { ProblemPage } from "./seo/problem-pages";

export const archiveCompetitions = [
  ["IPhO", "International Physics Olympiad"],
  ["APhO", "Asian Physics Olympiad"],
  ["EuPhO", "European Physics Olympiad"],
] as const;

/** Only registry-backed choices are accepted. Repeated or obsolete query values show the full archive. */
export function browseArchive(pages: readonly ProblemPage[], edition?: string | string[]) {
  const archive = pages.filter(page => page.kind === "archive");
  const groups = archiveCompetitions.map(([competition, name]) => {
    const own = archive.filter(page => page.competition === competition);
    const years = [...new Set(own.map(page => page.year!))].sort((a, b) => b - a);
    return {
      competition,
      name,
      choices: [
        { value: competition, label: `All ${competition} years`, problems: own },
        ...years.map(year => ({ value: `${competition}-${year}`, label: `${competition} ${year}`, problems: own.filter(page => page.year === year) })),
      ],
    };
  });
  const selected = typeof edition === "string" ? groups.flatMap(group => group.choices).find(choice => choice.value === edition) : undefined;
  return { groups, value: selected?.value ?? "", label: selected?.label ?? "All olympiads and years", problems: selected?.problems ?? archive };
}
