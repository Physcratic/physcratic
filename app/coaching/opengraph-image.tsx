import { brandPreview } from "@/lib/og/link-preview";
import { content } from "@/lib/coaching/content";

export const alt = content.og.tagline;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return brandPreview({ name: content.ui.brand, tagline: content.og.tagline, note: content.og.stats, palette: "coaching" });
}
