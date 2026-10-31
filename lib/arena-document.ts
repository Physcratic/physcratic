export type ArenaBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; kind: "letter" | "roman" | "number"; items: string[][] };

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
    const marker = /^(?:\(([a-z]+|\d+)\)|(\d+)[.)])\s+/i.exec(paragraph);
    if (marker) {
      const label = (marker[1] ?? marker[2]).toLowerCase();
      const continuesLetters = previous?.type === "list" && previous.kind === "letter" && label.length === 1
        && previous.items.at(-1)?.[0].startsWith(`(${String.fromCharCode(label.charCodeAt(0) - 1)}) `);
      const kind = /^\d+$/.test(label)
        ? "number"
        : !continuesLetters && /^(?:i|ii|iii|iv|vi{0,3}|ix|xi{0,3}|xiv|xvi{0,3}|xix|xx)$/.test(label)
          && (label.length > 1 || label === "i" || (previous?.type === "list" && previous.kind === "roman"))
          ? "roman"
          : "letter";
      if (previous?.type === "list" && previous.kind === kind) previous.items.push([paragraph]);
      else section.blocks.push({ type: "list", kind, items: [[paragraph]] });
    } else if (previous?.type === "list") {
      previous.items.at(-1)!.push(paragraph);
    } else {
      section.blocks.push({ type: "paragraph", text: paragraph });
    }
  }

  if (section.heading || section.blocks.length) sections.push(section);
  return sections;
}
