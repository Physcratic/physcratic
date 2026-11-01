/** One cited source. The number shown on the page is its position in `sources`. */
export interface Source {
  /** Stable id used by `cite` arrays in the body, for example "s1". */
  id: string;
  title: string;
  url: string;
  publisher: string;
  /** ISO date (YYYY-MM-DD) the source was accessed. */
  accessed: string;
  /** true for archives that are not run by an olympiad. Shown as "Unofficial". */
  unofficial?: boolean;
}

export interface TableCell {
  text: string;
  /** Source ids. Required unless the text is CHECK_HOST_SITE. */
  cite?: string[];
}

export type Block =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string; cite?: string[] }
  | { type: "list"; items: string[]; ordered?: boolean; cite?: string[] }
  | {
      type: "callout";
      tone: "note" | "tip" | "warning";
      title?: string;
      text: string;
      cite?: string[];
    }
  /** Links to /dashboard/problems/<problemId>. The id must exist in lib/physics. */
  | { type: "problemLink"; problemId: string; label: string; note?: string }
  /** Links to another guide, optionally to a heading id inside it. */
  | { type: "guideLink"; slug: string; hash?: string; label: string; note?: string }
  /** Display maths. TeX is rendered on the server with KaTeX. */
  | { type: "math"; tex: string; caption?: string }
  | {
      type: "table";
      caption: string;
      head: string[];
      rows: { header: string; cells: TableCell[] }[];
    };

export interface Reviewer {
  name: string;
  /** Shown after the name, for example "IPhO 2026 bronze medallist". */
  credential: string;
}

export interface ArticleDraft {
  slug: string;
  /** Under 60 characters. */
  title: string;
  /** Under 155 characters. */
  description: string;
  /** ISO date (YYYY-MM-DD). */
  updated: string;
  reviewedBy: Reviewer;
  sources: Source[];
  body: Block[];
  /** false keeps the guide out of the hub, registry, sitemap and llms.txt, and makes its URL 404. */
  published: boolean;
}

export interface Article extends ArticleDraft {
  /** Computed from the body word count at about 220 words a minute. */
  readingMinutes: number;
}

/** Text used in a table cell when a fact could not be confirmed. */
export const CHECK_HOST_SITE = "Check the current host site";
