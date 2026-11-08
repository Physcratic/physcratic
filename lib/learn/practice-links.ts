/**
 * The specific problems each guide sends readers to at its end, by problem id. These are real problem pages, so the
 * guide links to the problems it is about and not only to the library. A test checks that every id is an indexable
 * problem page and that every guide has at least two.
 */
export const practiceProblemIds: Readonly<Record<string, readonly string[]>> = {
  "start-preparing-physics-olympiad": ["incline", "projectile", "ipho-2025-t1"],
  "ipho-apho-eupho-differences": ["ipho-2025-t1", "apho-2025-t1", "eupho-2025-t1"],
  "how-olympiad-solutions-are-marked": ["incline", "first-law", "ipho-2025-t3"],
  "physics-olympiad-books-and-resources": ["spring", "heat", "ipho-2024-t1"],
  "how-to-use-physcratic": ["incline", "circuit", "arena-mind-the-gap"],
  "how-to-write-a-problem": ["arena-mind-the-gap", "projectile"],
};
