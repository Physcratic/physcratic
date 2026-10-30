export type ArenaBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[][] };

export type ArenaSection = { heading?: string; blocks: ArenaBlock[] };

export function parseArenaDocument(content: string): ArenaSection[] {
  const sections: ArenaSection[] = [];
  let section: ArenaSection = { blocks: [] };

  for (const paragraph of content
    .split(/\n\s*\n/)
    .map((text) => text.trim())
    .filter(Boolean)) {
    if (paragraph.startsWith("## ")) {
      if (section.heading || section.blocks.length) sections.push(section);
      section = { heading: paragraph.slice(3), blocks: [] };
      continue;
    }

    const previous = section.blocks.at(-1);
    if (/^\([ivxlcdm]+\)\s+/i.test(paragraph)) {
      if (previous?.type === "list") previous.items.push([paragraph]);
      else section.blocks.push({ type: "list", items: [[paragraph]] });
    } else if (previous?.type === "list") {
      previous.items.at(-1)!.push(paragraph);
    } else {
      section.blocks.push({ type: "paragraph", text: paragraph });
    }
  }

  if (section.heading || section.blocks.length) sections.push(section);
  return sections;
}
