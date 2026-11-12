/**
 * The specific problems each guide sends readers to at its end, by problem id. These are real problem pages, so the
 * guide links to the problems it is about and not only to the library. A test checks that every id is an indexable
 * problem page and that every guide has at least two.
 */
export const practiceProblemIds: Readonly<Record<string, readonly string[]>> = {
  "mechanics-olympiad-problem-solving": ["ipho-2016-t1", "ipho-2009-t1", "arena-the-invisible-brake"],
  "start-preparing-physics-olympiad": ["arena-the-invisible-brake", "arena-the-phantom-charge", "ipho-2025-t1"],
  "ipho-apho-eupho-differences": ["ipho-2025-t1", "apho-2025-t1", "eupho-2025-t1"],
  "how-olympiad-solutions-are-marked": ["arena-the-invisible-brake", "arena-the-gas-with-elbows", "ipho-2025-t3"],
  "physics-olympiad-books-and-resources": ["arena-the-string-that-answered-back", "arena-the-bubble-treaty", "ipho-2024-t1"],
  "how-to-use-physcratic": ["arena-the-invisible-brake", "arena-the-infinite-v", "arena-mind-the-gap"],
  "how-to-write-a-problem": ["arena-mind-the-gap", "arena-the-phantom-charge"],
};
