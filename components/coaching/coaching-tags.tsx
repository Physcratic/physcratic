/** Small muted chips for topics and sources. Plain text in a list, so screen readers read it as a list. */
export function TagList({ items, label, className = "" }: { items: readonly string[]; label: string; className?: string }) {
  return <ul aria-label={label} className={`flex flex-wrap gap-1.5 ${className}`}>
    {items.map((item) => <li key={item} className="rounded-full border border-border px-2.5 py-0.5 text-xs leading-relaxed text-muted-foreground">{item}</li>)}
  </ul>;
}
