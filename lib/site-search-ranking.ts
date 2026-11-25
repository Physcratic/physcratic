export type SiteSearchResult = { title: string; href: string; kind: string; description: string };
export type SearchEntry = SiteSearchResult & { keywords?: string };
const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** All terms must match. Exact titles, then title prefixes, outrank body matches. */
export function searchSite(entries: readonly SearchEntry[], query: string): SiteSearchResult[] {
  const q = normalize(query.slice(0, 160));
  const terms = q.split(/\s+/).filter(Boolean).slice(0, 12);
  return entries.map((entry, order) => {
    const title = normalize(entry.title);
    const text = normalize(`${entry.title} ${entry.description} ${entry.keywords ?? ""}`);
    const score = terms.every(term => text.includes(term))
      ? (title === q ? 100 : title.startsWith(q) ? 60 : 0) + terms.reduce((sum, term) => sum + (title.includes(term) ? 10 : 1), 0)
      : -1;
    return { entry, score, order };
  }).filter(item => item.score >= 0 && (q || item.entry.kind === "Page"))
    .sort((a, b) => b.score - a.score || a.order - b.order).slice(0, 30)
    .map(({ entry }) => ({ title: entry.title, href: entry.href, kind: entry.kind, description: entry.description }));
}
