import {
  normalizePhysicsTag,
  physicsTagAliases,
  physicsTagWhitespace,
  resolvePhysicsTag,
} from "./physics-taxonomy";

/** Only fixed JSONB fields and bound values enter this SQL fragment. */
export function authoredLibraryTagPredicate(value: string, bind: (value: unknown) => string): string {
  const alternatives: string[] = [];
  for (const [field, kind] of [["topicTags", "topic"], ["methodTags", "method"]] as const) {
    const aliases = physicsTagAliases(value, kind);
    // Retain the existing jsonb_path_ops GIN-compatible containment predicates.
    alternatives.push(...aliases.map((alias) =>
      `r.content @> ${bind(JSON.stringify({ [field]: [alias] }))}::jsonb`,
    ));
    if (resolvePhysicsTag(value, kind)) {
      const normalized = [...new Set(aliases.map(normalizePhysicsTag))];
      // Published documents have at most 30 tags per field. This fallback also
      // recognizes mixed case, repeated/Unicode whitespace and curly punctuation.
      // It is not indexable: the planner may choose a scan instead of BitmapOr.
      // Filtering remains in PostgreSQL before keyset pagination and LIMIT.
      alternatives.push(`EXISTS (SELECT 1 FROM jsonb_array_elements_text(r.content->'${field}') AS t(value)
        WHERE lower(btrim(regexp_replace(translate(t.value, ${bind("‘’‐‑–—")}, ${bind("''----")}),
          ${bind(`[${physicsTagWhitespace}]+`)}, ' ', 'g'))) = ANY(${bind(normalized)}::text[]))`);
    }
  }
  return `(${alternatives.join(" OR ")})`;
}
