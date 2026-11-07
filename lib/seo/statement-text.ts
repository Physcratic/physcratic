/**
 * Turns the text extracted from an official statement PDF into paragraphs a page can show to a reader with no
 * JavaScript. The extraction keeps the PDF's hard line breaks, running headers and page numbers, so this joins
 * wrapped lines, drops the header block above the first prose line and drops page furniture. It never invents
 * text: every word in the output was in the input.
 */

const HEADER_LINE =
  /olympiad|theoretical (?:problem|question|competition)|^please read the general instructions|^fig(?:ure)?\.?\s*\d+\s*[.:]|^data sheet|^theory$|^english|^problem\s*\d+|^question\s*\d+|^[a-z]{0,2}\d{1,2}\s*[-.]\s*\d{1,2}$|^page\s*\d+|^\d+\s*\/\s*\d+$|\(\s*\d+(?:\.\d+)?\s*(?:points?|marks?|pts?)\s*\)|^(?:i{1,3}|iv|v)\.?$/i;
const FURNITURE_LINE = /^\s*(?:page\s*\d+\s*(?:\/|of)\s*\d+|[a-z]{1,2}\d{1,2}\s*[-–]\s*\d{1,2}|\d{1,3}\s*\/\s*\d{1,3}|\d{1,3})\s*$/i;

function words(line: string): number {
  return line.split(/\s+/).filter(Boolean).length;
}

const LIGATURES: Record<string, string> = { "ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi", "ﬄ": "ffl", "ﬅ": "st", "ﬆ": "st" };

function normalise(text: string): string[] {
  return text
    .replace(/[ﬀ-ﬆ]/g, (mark) => LIGATURES[mark] ?? mark)
    .replace(/\r/g, "")
    .replace(/\f/g, "\n\n")
    .replace(/[ \t ]+/g, " ")
    .split("\n")
    .map((line) => line.trim());
}

/**
 * True when a line looks like the first line of running prose, not a heading. A narrow two-column PDF wraps after
 * four or five words, so the next two lines count too: three lines together must hold twelve words.
 */
function isProse(line: string, following: string[] = []): boolean {
  if (!/^(?:[A-Z0-9(“"']|[a-z]\))/.test(line) || !/[a-z]/.test(line) || HEADER_LINE.test(line.replace(/\s+/g, " "))) return false;
  if (words(line) >= 7) return true;
  const window = [line, ...following.slice(0, 2)].join(" ");
  return words(window) >= 12 && following.slice(0, 2).every((next) => next && !HEADER_LINE.test(next));
}

export function statementParagraphs(text: string, title?: string): string[] {
  const lines = normalise(text);
  const titleKey = title?.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  // Lines that repeat three or more times are running headers or footers.
  const counts = new Map<string, number>();
  for (const line of lines) if (line) counts.set(line, (counts.get(line) ?? 0) + 1);
  const repeated = (line: string) => (counts.get(line) ?? 0) >= 3 && words(line) <= 14;

  let start = 0;
  // Some shared PDFs open with the data sheet. Skip to the first problem heading after it.
  if (/^data sheet/i.test(lines.find(Boolean) ?? "")) {
    const heading = lines.findIndex((line) => /^(?:theoretical )?(?:problem|question)\s*\d/i.test(line) || /^\d+\.\s+\p{L}/u.test(line));
    if (heading > 0) start = heading;
  }
  while (start < lines.length) {
    const line = lines[start];
    if (!line) { start += 1; continue; }
    const key = line.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const isTitle = Boolean(titleKey) && key.length > 3 && key.length <= titleKey!.length + 12 && (titleKey!.includes(key) || key.includes(titleKey!));
    if (isProse(line, lines.slice(start + 1, start + 3)) && !isTitle) break;
    start += 1;
  }

  const paragraphs: string[] = [];
  let current: string[] = [];
  const flush = () => {
    const joined = current.join(" ").replace(/\s+/g, " ").replace(/([a-z])- ([a-z])/g, "$1$2")
      .replace(/([\u{1D400}-\u{1D7FF}])(?=[A-Za-z])/gu, "$1 ")
      .replace(/([a-z])(?=[\u{1D400}-\u{1D7FF}])/gu, "$1 ").trim();
    if (joined) paragraphs.push(joined);
    current = [];
  };
  for (const line of lines.slice(start)) {
    if (!line) { flush(); continue; }
    if (FURNITURE_LINE.test(line) || repeated(line)) continue;
    current.push(line);
    // A line that ends a sentence and is clearly shorter than a full wrapped line ends the paragraph.
    if (/[.:?!]$/.test(line) && words(line) <= 6) flush();
  }
  flush();
  return paragraphs;
}

/** Sentences of a paragraph, split after . ? or ! followed by a space and a capital letter or digit. */
export function sentences(paragraph: string): string[] {
  const parts = paragraph.split(/(?<=[a-z)\]][.?!])(?<!\b(?:Fig|Figs|Eq|Eqs|cf|vs|approx|ca|e\.g|i\.e)[.])\s+(?=[A-Z0-9(])/);
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** The first sentence of the statement, as shown on the page. */
export function firstSentence(text: string, title?: string): string {
  const paragraph = statementParagraphs(text, title)[0] ?? "";
  return sentences(paragraph)[0] ?? paragraph;
}

/** A 70 to 160 character description built from the opening of the statement. */
export function statementDescription(text: string, fallbackPrefix: string, title?: string): string {
  const paragraph = statementParagraphs(text, title)[0] ?? "";
  const parts = sentences(paragraph);
  let lead = "";
  for (const part of parts) {
    const next = lead ? `${lead} ${part}` : part;
    if (next.length > 160) { lead ||= part; break; }
    lead = next;
    if (lead.length >= 70) break;
  }
  if (lead.length < 70) lead = `${fallbackPrefix} ${lead}`.trim();
  if (lead.length > 160) {
    const cut = lead.slice(0, 158);
    const clause = Math.max(cut.lastIndexOf(", "), cut.lastIndexOf("; "), cut.lastIndexOf(" - "));
    if (clause >= 70) return `${cut.slice(0, clause).replace(/[\s,;:(-]+$/, "")}.`;
    const space = cut.lastIndexOf(" ");
    lead = `${cut.slice(0, space > 100 ? space : 158).replace(/[\s,;:(-]+$/, "")}…`;
  }
  return lead;
}

/**
 * Some PDFs hold a whole day's problems on shared pages (EuPhO papers), so every problem of the year carries the same
 * extracted text. The problems start at lines that hold only their number, followed by a short title line. This
 * returns the part of the text for problem `number`, or undefined when the markers are not 1, 2, 3 in order.
 */
export function sharedSection(text: string, number: number): string | undefined {
  // Two layouts: a line holding only the number then a title line, or a line "T2: Title (10 pts)".
  const layouts = [/(?:^|\n)([1-9])\n(?=[^\n]{2,70}\n)/g, /(?:^|\n)T([1-9])[:.][^\n]{2,80}\n/g];
  for (const layout of layouts) {
    const marks = [...text.matchAll(layout)].map((match) => ({ value: Number(match[1]), start: match.index! + match[0].length, from: match.index! }));
    const ordered: typeof marks = [];
    let expected = 1;
    for (const mark of marks) {
      if (mark.value === expected) {
        ordered.push(mark);
        expected += 1;
      }
    }
    if (ordered.length < 2) continue;
    const index = ordered.findIndex((mark) => mark.value === number);
    if (index < 0) continue;
    return text.slice(ordered[index].start, ordered[index + 1]?.from ?? text.length);
  }
  return undefined;
}
