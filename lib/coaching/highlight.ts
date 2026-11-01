/** Split `text` around the first `phrase`, for the accent highlight treatment. Null when there is nothing to highlight. */
export function splitHighlight(text: string, phrase?: string): { before: string; match: string; after: string } | null {
  if (!phrase) return null;
  const at = text.indexOf(phrase);
  if (at < 0) return null;
  return { before: text.slice(0, at), match: phrase, after: text.slice(at + phrase.length) };
}

/** A highlight must be a short phrase, never a sentence: at most 5 words and no sentence punctuation. */
export function isShortPhrase(phrase: string) {
  return phrase.trim() === phrase && phrase.split(/\s+/).length <= 5 && !/[.!?]/.test(phrase);
}
