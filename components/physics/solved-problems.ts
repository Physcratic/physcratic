// Which problems this browser has solved. Arena results are not stored on the server, so each solved problem id is
// remembered in this browser's localStorage. Every read and write is wrapped, because storage can be missing, full or blocked.
const key = "physcratic.solved.v1";
const limit = 500;

export function readSolved(storage?: Pick<Storage, "getItem">): Set<string> {
  try {
    const raw = (storage ?? window.localStorage).getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string" && id.length <= 120).slice(0, limit) : []);
  } catch {
    return new Set();
  }
}

export function markSolved(problemId: string, storage?: Pick<Storage, "getItem" | "setItem">): void {
  try {
    const target = storage ?? window.localStorage;
    const solved = readSolved(target);
    if (solved.has(problemId)) return;
    solved.add(problemId);
    target.setItem(key, JSON.stringify([...solved].slice(-limit)));
  } catch {
    /* Storage is unavailable. The problem is simply not remembered. */
  }
}

/**
 * A random problem the reader has not solved, other than `exclude`. If every problem is solved, any other problem.
 * With only one problem, that problem.
 */
export function pickProblem(ids: readonly string[], solved: ReadonlySet<string>, exclude?: string, random: () => number = Math.random): string | undefined {
  const others = ids.filter((id) => id !== exclude);
  const pool = others.length ? others : [...ids];
  const unsolved = pool.filter((id) => !solved.has(id));
  const choices = unsolved.length ? unsolved : pool;
  return choices.length ? choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))] : undefined;
}
