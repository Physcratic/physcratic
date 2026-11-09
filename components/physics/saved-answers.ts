// Typed answers survive a reload, a tap on Back and a slip of the thumb. They are kept in this tab's sessionStorage,
// one entry per problem and part, so nothing is sent to the server and nothing outlives the tab. Every read and write is
// wrapped, because storage can be missing, full or blocked. If it fails, the answer is simply not remembered.
const prefix = "physcratic.answer.v1";
/** Longer than any answer box accepts, so a stored value can never be bigger than a typed one. */
const maxLength = 2000;

type Reader = Pick<Storage, "getItem">;
type Writer = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Scanner = Writer & Pick<Storage, "length" | "key">;

const session = (): Storage | undefined => {
  try { return typeof window === "undefined" ? undefined : window.sessionStorage; } catch { return undefined; }
};
/** The entry for one part of one problem. Both ids are encoded, so a colon in an id cannot make two keys collide. */
export const savedAnswerKey = (problemId: string, partId: string) => `${prefix}:${encodeURIComponent(problemId)}:${encodeURIComponent(partId)}`;

/** The saved answer for each of the given parts. Parts with nothing saved are left out. */
export function readSavedAnswers(problemId: string, partIds: readonly string[], storage?: Reader): Record<string, string> {
  const found: Record<string, string> = {};
  try {
    const source = storage ?? session();
    if (!source) return found;
    for (const partId of partIds) {
      const value = source.getItem(savedAnswerKey(problemId, partId));
      if (typeof value === "string" && value.trim() && value.length <= maxLength) found[partId] = value;
    }
  } catch { /* Storage is unavailable. Nothing was saved as far as this page can tell. */ }
  return found;
}

/** Saves one part's answer. An empty answer removes the entry, so a cleared box stays cleared after a reload. */
export function saveAnswer(problemId: string, partId: string, value: string, storage?: Writer): void {
  try {
    const target = storage ?? session();
    if (!target) return;
    if (!value.trim()) target.removeItem(savedAnswerKey(problemId, partId));
    else target.setItem(savedAnswerKey(problemId, partId), value.slice(0, maxLength));
  } catch { /* Storage is full or blocked. The answer is still on screen. */ }
}

/** Forgets one part's answer. Used when that part is checked and correct. */
export function clearSavedAnswer(problemId: string, partId: string, storage?: Writer): void {
  try { (storage ?? session())?.removeItem(savedAnswerKey(problemId, partId)); } catch { /* Nothing to clear. */ }
}

/** Forgets every part of one problem. Used by Start over and Clear answers. */
export function clearSavedAnswers(problemId: string, storage?: Scanner): void {
  try {
    const target = storage ?? session();
    if (!target) return;
    const start = `${prefix}:${encodeURIComponent(problemId)}:`;
    const doomed: string[] = [];
    for (let index = 0; index < target.length; index++) { const name = target.key(index); if (name?.startsWith(start)) doomed.push(name); }
    for (const name of doomed) target.removeItem(name);
  } catch { /* Nothing to clear. */ }
}
